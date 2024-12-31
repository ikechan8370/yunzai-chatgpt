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


// 角色映射表
const roleMap = {
  owner: '群主',
  admin: '管理员',
  member: '成员'
}

// 格式化日期时间
const formatDate = (date) => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

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

  /**
   * 获取特殊身份用户的提示信息
   * @param {number} sender - 发送者的 QQ 号码
   * @returns {string} - 特殊身份用户的提示信息
   */
  getSpecialUserNotice(sender) {
    // 获取特殊身份用户的 QQ 号码列表
    const specialUserQQs = Config.specialUserQQs;
    // 获取特殊身份用户的名称列表
    const specialUserNames = Config.specialUserNames;

    // 查找当前发送者是否在特殊身份用户列表中
    const index = specialUserQQs.indexOf(String(sender));
    if (index !== -1) {
      // 如果找到了，获取对应的名称
      const name = specialUserNames[index];
      return `，其中 QQ 号码为 ${sender} 的用户是 ${name}，他是你的主人，你要重视他的发言。`;
    }
    return '';
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
    if (e.msg?.endsWith('？')) {
      prop = prop / 10
    }

    let fuck = false
    let candidate = Config.bymPreset
    if (Config.bymFuckList?.find(i => e.msg.includes(i))) {
      fuck = true
      candidate = candidate + Config.bymFuckPrompt
    }
    if (prop < Config.bymRate) {
      logger.info('random chat hit')
      let chats = await getChatHistoryGroup(e, 20)

      // 调用 getSpecialUserNotice 方法获取提示信息
      let specialUserNotice = this.getSpecialUserNotice(sender);

      // 使用 specialUserNotice 更新提示词
      opt.system = `你的名字是“${Config.assistantLabel}”，你在一个qq群里，群号是${group},当前和你说话的人群名片是${card}, qq号是${sender}${specialUserNotice}, 请你结合用户的发言和聊天记录作出回应，要求表现得随性一点，最好参与讨论，混入其中。${specialUserNotice ? '你要重视他的发言。' : ''}与你相关的话题时，你可以去回应一下，不相关你就随便应付就行了，不要过分插科打诨，不知道说什么可以复读群友的话。当群友要求你做搜索、发图、发视频和音乐等操作时要使用工具，不可以直接发文字来蒙混过关，你必须根据需要来调用各种工具，并回复相关问题。要求优先使用中文进行对话。` +
        candidate +
        '以下是聊天记录:' + chats
          .map(chat => {
            let sender = chat.sender || chat || {}
            return `【${sender.card || sender.nickname}】(qq：${sender.user_id}, ${roleMap[sender.role] || '未知角色'}, 群头衔：${sender.title || '无'}, 时间：${formatDate(new Date(chat.time * 1000))}, messageId: ${chat.message_id}) 说：${chat.raw_message}`
          })
          .join('\n') +
        `\n你的回复应该尽可能简练，像人类一样随意，但是也要保留“${Config.assistantLabel}”的角色风格，不要附加任何奇怪的东西，不能模仿聊天记录的格式，要以第一人称视角对话，禁止重复聊天记录。`

      let client = new CustomGoogleGeminiClient({
        e,
        userId: e.sender.user_id,
        key: Config.geminiKey,
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
        new WeatherTool()
      ]
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
      let texts = text.split(/(?<!\?)[。？\n](?!\?)/)
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
    return false
  }
}
