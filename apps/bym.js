import { CustomGoogleGeminiClient } from '../client/CustomGoogleGeminiClient.js'
import { Config } from '../utils/config.js'
import { getImg } from '../utils/common.js'
import { getChatHistoryGroup } from '../utils/chat.js'
import { SearchVideoTool } from '../utils/tools/SearchBilibiliTool.js'
import { SerpImageTool } from '../utils/tools/SearchImageTool.js'
import { SearchMusicTool } from '../utils/tools/SearchMusicTool.js'
import { SendAvatarTool } from '../utils/tools/SendAvatarTool.js'
import { SendVideoTool } from '../utils/tools/SendBilibiliTool.js'
import { SendMusicTool } from '../utils/tools/SendMusicTool.js'
import { SendPictureTool } from '../utils/tools/SendPictureTool.js'
import { WebsiteTool } from '../utils/tools/WebsiteTool.js'
import { convertFaces } from '../utils/face.js'
import { WeatherTool } from '../utils/tools/WeatherTool.js'
import { EditCardTool } from '../utils/tools/EditCardTool.js'
import { JinyanTool } from '../utils/tools/JinyanTool.js'
import { KickOutTool } from '../utils/tools/KickOutTool.js'
import { SetTitleTool } from '../utils/tools/SetTitleTool.js'
import { SerpTool } from '../utils/tools/SerpTool.js'
import { SendMessageToSpecificGroupOrUserTool } from '../utils/tools/SendMessageToSpecificGroupOrUserTool.js'

export class bym extends plugin {
  constructor () {
    super({
      name: 'ChatGPT-Plugin 伪人bym',
      dsc: 'bym',
      /** https://oicqjs.github.io/oicq/#events */
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^[^#][sS]*',
          fnc: 'bym',
          priority: '-1000000',
          log: false
        }
      ]
    })
  }

  /** 复读 */
  async bym (e) {
    if (!Config.enableBYM) {
      return false
    }
    let opt = {
      maxOutputTokens: 500,
      temperature: 1,
      replyPureTextCallback: e.reply
    }
    let imgs = await getImg(e)
    if (!e.msg) {
      if (imgs && imgs.length > 0) {
        let image = imgs[0]
        const response = await fetch(image)
        const base64Image = Buffer.from(await response.arrayBuffer())
        opt.image = base64Image.toString('base64')
        e.msg = '[图片]'
      } else {
        return
      }
    }
    if (!opt.image && imgs && imgs.length > 0) {
      let image = imgs[0]
      const response = await fetch(image)
      const base64Image = Buffer.from(await response.arrayBuffer())
      opt.image = base64Image.toString('base64')
    }
    let sender = e.sender.user_id
    let card = e.sender.card || e.sender.nickname
    let group = e.group_id
    let prop = Math.floor(Math.random() * 100)
    if (Config.assistantLabel && e.msg?.includes(Config.assistantLabel)) {
      prop = -1
    }
    // 去掉吧 频率有点逆天
    // if (e.msg?.endsWith('？')) {
    //   prop = prop / 10
    // }

    let fuck = false
    let candidate = Config.bymPreset
    if (Config.bymFuckList?.find(i => e.msg.includes(i))) {
      fuck = true
      candidate = candidate + Config.bymFuckPrompt
    }
    if (prop < Config.bymRate) {
      logger.info('random chat hit')
      let chats = await getChatHistoryGroup(e, 20)
      opt.system = `你的名字是“${Config.assistantLabel}”，你在一个qq群里，群号是${group},当前和你说话的人群名片是${card}, qq号是${sender}, 请你结合用户的发言和聊天记录作出回应，要求表现得随性一点，最好参与讨论，混入其中。不要过分插科打诨，不知道说什么可以复读群友的话。要求你做搜索、发图、发视频和音乐等操作时要使用工具。不可以直接发[图片]这样蒙混过关。要求优先使用中文进行对话。如果此时不需要自己说话，可以只回复<EMPTY>` +
        candidate +
        '以下是聊天记录:' + chats
          .map(chat => {
            let sender = chat.sender || chat || {}
            return `${sender.card || sender.nickname}(${sender.user_id}) ：${chat.raw_message}`
          })
          .join('\n') +
        `\n你的回复应该尽可能简练，像人类一样随意，不要附加任何奇怪的东西，如聊天记录的格式（比如${Config.assistantLabel}：），禁止重复聊天记录。`

      let client = new CustomGoogleGeminiClient({
        e,
        userId: e.sender.user_id,
        key: Config.getGeminiKey(),
        model: Config.geminiModel,
        baseUrl: Config.geminiBaseUrl,
        debug: Config.debug
      })
      /**
       * tools
       * @type {(AbstractTool)[]}
       */
      const tools = [
        new SearchVideoTool(),
        new SerpImageTool(),
        new SearchMusicTool(),
        new SendAvatarTool(),
        new SendVideoTool(),
        new SendMusicTool(),
        new SendPictureTool(),
        new WebsiteTool(),
        new WeatherTool(),
        new SendMessageToSpecificGroupOrUserTool()
      ]
      if (Config.azSerpKey) {
        tools.push(new SerpTool())
      }
      if (e.group.is_admin || e.group.is_owner) {
        tools.push(new EditCardTool())
        tools.push(new JinyanTool())
        tools.push(new KickOutTool())
      }
      if (e.group.is_owner) {
        tools.push(new SetTitleTool())
      }
      client.addTools(tools)
      // console.log(JSON.stringify(opt))
      let rsp = await client.sendMessage(e.msg, opt)
      let text = rsp.text
      let texts = customSplitRegex(text, /(?<!\?)[。？\n](?!\?)/, 3)
      // let texts = text.split(/(?<!\?)[。？\n](?!\?)/, 3)
      for (let t of texts) {
        if (!t) {
          continue
        }
        t = t.trim()
        if (text[text.indexOf(t) + t.length] === '？') {
          t += '？'
        }
        let finalMsg = await convertFaces(t, true, e)
        logger.info(JSON.stringify(finalMsg))
        finalMsg = finalMsg.map(filterResponseChunk).filter(i => !!i)
        if (finalMsg && finalMsg.length > 0) {
          if (Math.floor(Math.random() * 100) < 10) {
            await this.reply(finalMsg, true, {
              recallMsg: fuck ? 10 : 0
            })
          } else {
            await this.reply(finalMsg, false, {
              recallMsg: fuck ? 10 : 0
            })
          }
          await new Promise((resolve, reject) => {
            setTimeout(() => {
              resolve()
            }, Math.min(t.length * 200, 3000))
          })
        }
      }
    }
    return false
  }
}

/**
 * 过滤
 * @param msg
 */
function filterResponseChunk (msg) {
  if (!msg || typeof msg !== 'string') {
    return false
  }
  if (!msg.trim()) {
    return false
  }
  if (msg.trim() === '```') {
    return false
  }
  if (msg.trim() === '<EMPTY>') {
    return false
  }
  return msg
}

function customSplitRegex (text, regex, limit) {
  const result = []
  let match
  let lastIndex = 0
  const globalRegex = new RegExp(regex, 'g')

  while ((match = globalRegex.exec(text)) !== null) {
    if (result.length < limit - 1) {
      result.push(text.slice(lastIndex, match.index))
      lastIndex = match.index + match[0].length
    } else {
      break
    }
  }

  // 添加剩余部分
  result.push(text.slice(lastIndex))
  return result
}
