// import { remark } from 'remark'
// import stripMarkdown from 'strip-markdown'
import { exec } from 'child_process'
import lodash from 'lodash'
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from '../../../lib/puppeteer/puppeteer.js'
import { Config } from './config.js'
// export function markdownToText (markdown) {
//  return remark()
//    .use(stripMarkdown)
//    .processSync(markdown ?? '')
//    .toString()
// }
export function escapeHtml (str) {
  const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;'
  }
  return str.replace(/[&<>"'/]/g, (match) => htmlEntities[match])
}

export function randomString (length = 5) {
  let str = ''
  for (let i = 0; i < length; i++) {
    str += lodash.random(36).toString(36)
  }
  return str.substr(0, length)
}

export async function upsertMessage (message) {
  await redis.set(`CHATGPT:MESSAGE:${message.id}`, JSON.stringify(message))
}

export async function getMessageById (id) {
  let messageStr = await redis.get(`CHATGPT:MESSAGE:${id}`)
  return JSON.parse(messageStr)
}

export async function tryTimes (promiseFn, maxTries = 10) {
  try {
    return await promiseFn()
  } catch (e) {
    if (maxTries > 0) {
      logger.warn('Failed, retry ' + maxTries)
      return tryTimes(promiseFn, maxTries - 1)
    }
    throw e
  }
}

export async function makeForwardMsg (e, msg = [], dec = '') {
  let nickname = Bot.nickname
  if (e.isGroup) {
    let info = await Bot.getGroupMemberInfo(e.group_id, Bot.uin)
    nickname = info.card || info.nickname
  }
  let userInfo = {
    user_id: Bot.uin,
    nickname
  }

  let forwardMsg = []
  msg.forEach(v => {
    forwardMsg.push({
      ...userInfo,
      message: v
    })
  })

  /** 制作转发内容 */
  if (e.isGroup) {
    forwardMsg = await e.group.makeForwardMsg(forwardMsg)
  } else if (e.friend) {
    forwardMsg = await e.friend.makeForwardMsg(forwardMsg)
  } else {
    return false
  }

  if (dec) {
    /** 处理描述 */
    forwardMsg.data = forwardMsg.data
      .replace(/\n/g, '')
      .replace(/<title color="#777777" size="26">(.+?)<\/title>/g, '___')
      .replace(/___+/, `<title color="#777777" size="26">${dec}</title>`)
  }

  return forwardMsg
}

// @see https://github.com/sindresorhus/p-timeout
export async function pTimeout (
  promise,
  options
) {
  const {
    milliseconds,
    fallback,
    message,
    customTimers = { setTimeout, clearTimeout }
  } = options

  let timer

  const cancelablePromise = new Promise((resolve, reject) => {
    if (typeof milliseconds !== 'number' || Math.sign(milliseconds) !== 1) {
      throw new TypeError(
              `Expected \`milliseconds\` to be a positive number, got \`${milliseconds}\``
      )
    }

    if (milliseconds === Number.POSITIVE_INFINITY) {
      resolve(promise)
      return
    }

    if (options.signal) {
      const { signal } = options
      if (signal.aborted) {
        reject(getAbortedReason(signal))
      }

      signal.addEventListener('abort', () => {
        reject(getAbortedReason(signal))
      })
    }

    timer = customTimers.setTimeout.call(
      undefined,
      () => {
        if (fallback) {
          try {
            resolve(fallback())
          } catch (error) {
            reject(error)
          }

          return
        }

        const errorMessage =
                        typeof message === 'string'
                          ? message
                          : `Promise timed out after ${milliseconds} milliseconds`
        const timeoutError =
                        message instanceof Error ? message : new Error(errorMessage)

        if (typeof promise.cancel === 'function') {
          promise.cancel()
        }

        reject(timeoutError)
      },
      milliseconds
    )
    ;(async () => {
      try {
        resolve(await promise)
      } catch (error) {
        reject(error)
      } finally {
        customTimers.clearTimeout.call(undefined, timer)
      }
    })()
  })

  cancelablePromise.clear = () => {
    customTimers.clearTimeout.call(undefined, timer)
    timer = undefined
  }

  return cancelablePromise
}
/**
     TODO: Remove below function and just 'reject(signal.reason)' when targeting Node 18.
     */
function getAbortedReason (signal) {
  const reason =
            signal.reason === undefined
              ? getDOMException('This operation was aborted.')
              : signal.reason

  return reason instanceof Error ? reason : getDOMException(reason)
}
/**
     TODO: Remove AbortError and just throw DOMException when targeting Node 18.
     */
function getDOMException (errorMessage) {
  return globalThis.DOMException === undefined
    ? new Error(errorMessage)
    : new DOMException(errorMessage)
}

export async function checkPnpm () {
  let npm = 'npm'
  let ret = await execSync('pnpm -v')
  if (ret.stdout) npm = 'pnpm'
  return npm
}

async function execSync (cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { windowsHide: true }, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr })
    })
  })
}

export function mkdirs (dirname) {
  if (fs.existsSync(dirname)) {
    return true
  } else {
    if (mkdirs(path.dirname(dirname))) {
      fs.mkdirSync(dirname)
      return true
    }
  }
}

export function formatDate (date) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1 // Note that getMonth() returns a zero-based index
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()

  const formattedDate = `${year}年${month}月${day}日 ${hour}:${minute}`
  return formattedDate
}
export async function getMasterQQ () {
  return (await import('../../../lib/config/config.js')).default.masterQQ
}

/**
   *
   * @param pluginKey plugin key
   * @param htmlPath html文件路径，相对于plugin resources目录
   * @param data 渲染数据
   * @param renderCfg 渲染配置
   * @param renderCfg.retType 返回值类型
   * * default/空：自动发送图片，返回true
   * * msgId：自动发送图片，返回msg id
   * * base64: 不自动发送图像，返回图像base64数据
   * @param renderCfg.beforeRender({data}) 可改写渲染的data数据
   * @returns {Promise<boolean>}
   */
export async function render (e, pluginKey, htmlPath, data = {}, renderCfg = {}) {
  // 处理传入的path
  htmlPath = htmlPath.replace(/.html$/, '')
  let paths = lodash.filter(htmlPath.split('/'), (p) => !!p)
  htmlPath = paths.join('/')
  // 创建目录
  const mkdir = (check) => {
    let currDir = `${process.cwd()}/data`
    for (let p of check.split('/')) {
      currDir = `${currDir}/${p}`
      if (!fs.existsSync(currDir)) {
        fs.mkdirSync(currDir)
      }
    }
    return currDir
  }
  mkdir(`html/${pluginKey}/${htmlPath}`)
  // 自动计算pluResPath
  let pluResPath = `../../../${lodash.repeat('../', paths.length)}plugins/${pluginKey}/resources/`
  // 渲染data
  data = {
    ...data,
    _plugin: pluginKey,
    _htmlPath: htmlPath,
    pluResPath,
    tplFile: `./plugins/${pluginKey}/resources/${htmlPath}.html`,
    saveId: data.saveId || data.save_id || paths[paths.length - 1],
    pageGotoParams: {
      waitUntil: 'networkidle0'
    }
  }
  // 处理beforeRender
  if (renderCfg.beforeRender) {
    data = renderCfg.beforeRender({ data }) || data
  }
  // 保存模板数据
  if (process.argv.includes('web-debug')) {
    // debug下保存当前页面的渲染数据，方便模板编写与调试
    // 由于只用于调试，开发者只关注自己当时开发的文件即可，暂不考虑app及plugin的命名冲突
    let saveDir = mkdir(`ViewData/${pluginKey}`)
    let file = `${saveDir}/${data._htmlPath.split('/').join('_')}.json`
    fs.writeFileSync(file, JSON.stringify(data))
  }
  // 截图
  let base64 = await puppeteer.screenshot(`${pluginKey}/${htmlPath}`, data)
  if (renderCfg.retType === 'base64') {
    return base64
  }
  let ret = true
  if (base64) {
    ret = await e.reply(base64)
  }
  return renderCfg.retType === 'msgId' ? ret : true
}

export function getDefaultUserSetting () {
  return {
    usePicture: Config.defaultUsePicture,
    useTTS: Config.defaultUseTTS,
    ttsRole: Config.defaultTTSRole
  }
}

export function parseDuration (duration) {
  const timeMap = {
    秒: 1,
    分: 60,
    小时: 60 * 60
  }

  // 去掉多余的空格并将单位转化为小写字母
  duration = duration.trim().toLowerCase()

  // 去掉末尾的 "钟" 字符
  if (duration.endsWith('钟')) {
    duration = duration.slice(0, -1)
  }

  // 提取数字和单位
  const match = duration.match(/^(\d+)\s*([\u4e00-\u9fa5]+)$/)

  if (!match) {
    throw new Error('Invalid duration string: ' + duration)
  }

  const num = parseInt(match[1], 10)
  const unit = match[2]

  if (!(unit in timeMap)) {
    throw new Error('Unknown time unit: ' + unit)
  }

  return num * timeMap[unit]
}

export function formatDuration (duration) {
  const timeMap = {
    小时: 60 * 60,
    分钟: 60,
    秒钟: 1
  }

  const units = Object.keys(timeMap)
  let result = ''

  for (let i = 0; i < units.length; i++) {
    const unit = units[i]
    const value = Math.floor(duration / timeMap[unit])

    if (value > 0) {
      result += value + unit
      duration -= value * timeMap[unit]
    }
  }

  return result || '0秒钟'
}

/**
 * 判断服务器所在地是否为中国
 * @returns {Promise<boolean>}
 */
export async function isCN () {
  if (await redis.get('CHATGPT:COUNTRY_CODE')) {
    return await redis.get('CHATGPT:COUNTRY_CODE') === 'CN'
  } else {
    try {
      let response = await fetch('https://ipinfo.io/country')
      let countryCode = (await response.text()).trim()
      await redis.set('CHATGPT:COUNTRY_CODE', countryCode, { EX: 3600 })
      return countryCode === 'CN'
    } catch (err) {
      console.warn(err)
      // 没拿到归属地默认CN
      return true
    }
  }
}

export function limitString (str, maxLength) {
  if (str.length <= maxLength) {
    return str
  } else {
    return str.slice(0, maxLength) + '...'
  }
}

/**
 * ```
 * var text = '你好，こんにちは，Hello！';
 * var wrappedText = wrapTextByLanguage(text);
 * console.log(wrappedText);
 * ```
 * @param text
 * @returns {string}
 */
export function wrapTextByLanguage (text) {
  // 根据标点符号分割句子
  const symbols = /([。！？，])/
  let sentences = text.split(symbols)
  sentences = sentences.reduce((acc, cur, index) => {
    if (symbols.test(cur)) {
      // 如果当前字符串是标点符号，则将其添加到前一个字符串的末尾
      acc[acc.length - 1] += cur
    } else {
      // 否则，将当前字符串添加到结果数组中
      acc.push(cur)
    }

    return acc
  }, [])
  let wrappedSentences = []
  for (let i = 0; i < sentences.length; i++) {
    let sentence = sentences[i]

    // 如果是标点符号，则跳过
    if (sentence === '。' || sentence === '！' || sentence === '？' || sentence === '，') {
      continue
    }
    const pattern = /[a-zA-Z]/g
    sentence = sentence.replace(pattern, '')
    // 判断这一句话是中文还是日语
    let isChinese = true
    let isJapanese = false
    for (let j = 0; j < sentence.length; j++) {
      let char = sentence.charAt(j)
      if (char.match(/[\u3040-\u309F\u30A0-\u30FF]/)) {
        isJapanese = true
        isChinese = false
        break
      }
    }

    // 包裹句子
    if (isChinese) {
      sentence = `[ZH]${sentence}[ZH]`
    } else if (isJapanese) {
      sentence = `[JA]${sentence}[JA]`
    }

    wrappedSentences.push(sentence)
  }

  const mergedSentences = wrappedSentences.reduce((acc, cur) => {
    if (cur === '') {
      // 如果当前字符串为空或者是标点符号，则直接将其添加到结果数组中
      acc.push(cur)
    } else {
      // 否则，判断前一个字符串和当前字符串是否为同种语言
      const prev = acc[acc.length - 1]
      let curPrefix = `${cur.slice(0, 4)}`
      if (prev && prev.startsWith(curPrefix)) {
        // 如果前一个字符串和当前字符串为同种语言，则将它们合并
        let a = (acc[acc.length - 1] + cur)
        a = lodash.replace(a, curPrefix + curPrefix, '')
        acc[acc.length - 1] = a
      } else {
        // 否则，将当前字符串添加到结果数组中
        acc.push(cur)
      }
    }

    return acc
  }, [])

  return mergedSentences.join('')
}

// console.log(wrapTextByLanguage('你好，这里是哈哈，こんにちは，Hello！'))

export function maskQQ (qq) {
  if (!qq) {
    return '未知'
  }
  let len = qq.length // QQ号长度
  let newqq = qq.slice(0, 3) + '*'.repeat(len - 7) + qq.slice(len - 3) // 替换中间3位为*
  return newqq
}

export function completeJSON(input) {
  // 定义一个变量，用来存储结果
  let result = ""
  // 定义一个变量，用来记录当前是否在引号内
  let inQuote = false
  let countColon = 0
  // 遍历输入字符串的每个字符
  for (let i = 0; i < input.length; i++) {
    // 获取当前字符
    let char = input[i];
    // 如果当前字符是引号
    if (char === '"') {
      // 切换引号内的状态
      inQuote = !inQuote
      // 将当前字符添加到结果中
      result += char
    }
    // 如果当前字符是冒号
    else if (char === ':') {
      // 如果不在引号内
      if (!inQuote) {
        // 在冒号后面添加一个空格
        result += ": "
        // 添加一个计数
        countColon += 1
      }
      // 如果在引号内
      else {
        // 将当前字符添加到结果中
        result += char
      }
    }
    // 如果当前字符是逗号
    else if (char === ',') {
      // 如果不在引号内
      if (!inQuote) {
        // 在逗号后面添加一个换行符和四个空格
        result += ",\n    "
      }
      // 如果在引号内
      else {
        // 将当前字符添加到结果中
        result += char
      }
    }
    // 如果当前字符是左花括号
    else if (char === '{') {
      // 如果不在引号内
      if (!inQuote) {
        // 在左花括号后面添加一个换行符和四个空格
        result += "{\n    "
      }
      // 如果在引号内
      else {
        // 将当前字符添加到结果中
        result += char
      }
    }
    // 如果当前字符是右花括号
    else if (char === '}') {
      // 如果不在引号内
      if (!inQuote) {
        // 在右花括号前面添加一个换行符
        result += "\n}"
      }
      // 如果在引号内
      else {
        // 将当前字符添加到结果中
        result += char
      }
    }
    // 其他情况
    else {
      // 将当前字符添加到结果中
      result += char
    }
  }
  // 如果字符串结束但格式仍未结束，则进行补全
  // 仍然在引号内
  if (inQuote) {
      // 补全截断的引号
      result += '"'
      // json完整封口
      if (countColon == 2) result += '}'
      // 补全参数封口
      else result += ': ""}'
  }
  // 如果仍未封口，检查当前格式并封口
  if (result.at(-1) != '}') {
      // 如果参数仍未写完，抛弃后面的参数封口
      if (result.trim().at(-1) === ",") {
          result = result.replace(/,(?=[^,]*$)/, "") + '}'
          return result
      }
      // 补全缺失的参数
      if (result.trim().at(-1) === ":") result += '""'
      // json完整封口
      if (countColon == 2) {
          result += '}'
      }
      // 补全参数封口
      else {
          // 如果key已经写完，补全value,否则直接封口
          if (result.trim().slice(-6) === '"mood"')
          result += ': ""}'
          else
          result += '}'

      }
  }
  // 返回结果
  return result
}