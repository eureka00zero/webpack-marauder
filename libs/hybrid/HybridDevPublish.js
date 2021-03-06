'use strict'

const fs = require('fs')
const md5 = require('md5')
const path = require('path')
const uploadftp = require('uploadftp/uploadftp')
const Ftp = require('uploadftp/ftp')
const execAsync = require('../../libs/execAsync')
const { rootPath } = require('../../libs/utils')
const ftpOption = require('../../config').ftp
const cwd = process.cwd()

function logResult({ configUrl, module }) {
  console.log('\nHybrid config: ' + configUrl)
  for (let key in module) {
    console.log(`${key}:`, module[key])
  }
}

class HybridDevPublish {
  constructor({ entry, ftpBranch, remotePath }) {
    this.ftp = new Ftp()
    this.entry = entry
    this.ftpBranch = ftpBranch
    this.remotePath = remotePath
  }

  async changeHybridConfig() {
    await this.getOption({ entry: this.entry, ftpBranch: this.ftpBranch })

    if (!this.name) {
      return console.log('获取git工程名失败，请检查是否设置远程git仓库')
    }

    let config = {}
    await this.ftp.connect(ftpOption)
    let configPath = `/wap_front/hybrid/config/${this.zip_config_name}.json`
    try {
      config = await this.ftp.get(configPath)
      config = JSON.parse(config)
    } catch (e) {
      console.log(
        `测试服务器上没有${configPath},或者当前网络问题以及config被人工修改不能被识别，请联系管理员或者重新尝试！`
      )
      // 这里强制处理，如果parse失败，则不重新创建该文件，终止请管理员排查或者重新执行自查。
      return
    }
    let moduleName = `${this.name}/${this.viewname}`
    let local_pkg_path = rootPath(`dist/${this.viewname}/${this.viewname}.php`)
    let pkgmd5 = md5(fs.readFileSync(local_pkg_path))
    // let pkg_url = `http://wap_front.dev.sina.cn/marauder/${this.name}/${
    //   this.isPathVersion ? this.version + "/" : ""
    // }${this.branch ? "branch_" + this.branch + "/" : ""}${this.viewname}/${
    //   this.viewname
    // }.php`;
    let pkg_url = this.remotePath + this.viewname + '.php'

    if (!config) {
      config = {
        status: 0,
        reqTime: 1514865810972,
        data: {
          modules: []
        }
      }
    }

    const moduleIdx = config.data.modules.findIndex(
      item => item.name == moduleName
    )

    const module = {
      name: moduleName,
      version: this.version,
      pkg_url: pkg_url,
      hybrid: this.maraConf.hybrid,
      md5: pkgmd5
    }

    if (moduleIdx > -1) {
      config.data.modules[moduleIdx] = module
    } else {
      config.data.modules.push(module)
    }

    let localConfigPath = rootPath(
      `dist/${this.viewname}/${this.zip_config_name}.json`
    )

    try {
      fs.writeFileSync(localConfigPath, JSON.stringify(config))
      ftpOption.src = localConfigPath
      ftpOption.dest = '/wap_front/hybrid/config/'
      await uploadftp(ftpOption)

      let configUrl = `http://wap_front.dev.sina.cn/hybrid/config/${
        this.zip_config_name
      }.json`

      logResult({ configUrl, module })
    } catch (e) {
      console.error('Hybrid config 上传失败', e)
    }
    this.ftp.end()
  }

  async getOption({ entry, ftpBranch }) {
    this.viewname = entry
    this.branch = ftpBranch
    let maraConf = require(path.resolve(cwd, 'marauder.config.js'))
    this.maraConf = maraConf
    if (
      maraConf.ftp &&
      maraConf.ftp &&
      maraConf.ftp.remotePath &&
      maraConf.ftp.remotePath.version
    ) {
      this.isPathVersion = true
    }
    let ciConfig = maraConf.ciConfig
    if (ciConfig) {
      this.zip_config_name = ciConfig.zip_config_name
    } else {
      this.zip_config_name = 'default'
    }

    try {
      let { stdout, stderr } = await execAsync('git remote -v')
      if (stdout && !stderr) {
        // @FIXME 对 http 协议地址不可用
        let [fullname, name] = stdout.match(/([\w-]*)\.git/)
        name = name.toLowerCase()
        this.name = name
      }
    } catch (e) {
      console.error(e)
    }

    this.version = process.env.npm_package_version
  }
}

module.exports = HybridDevPublish
