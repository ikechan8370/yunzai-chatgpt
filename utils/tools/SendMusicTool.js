import { AbstractTool } from './AbstractTool.js'

export class SendMusicTool extends AbstractTool {
  name = 'sendMusic'

  parameters = {
    properties: {
      id: {
        type: 'string',
        description: '音乐的id'
      },
      targetGroupIdOrQQNumber: {
        type: 'string',
        description: 'Fill in the target user_id or groupId when you need to send music to specific group or user, otherwise leave blank'
      }
    },
    required: ['id']
  }

  func = async function (opts, e) {
    let { id, targetGroupIdOrQQNumber } = opts
    // 非法值则发送到当前群聊
    const defaultTarget = e.isGroup ? e.group_id : e.sender.user_id
    const target = isNaN(targetGroupIdOrQQNumber) || !targetGroupIdOrQQNumber
      ? defaultTarget
      : parseInt(targetGroupIdOrQQNumber) === e.bot.uin ? defaultTarget : parseInt(targetGroupIdOrQQNumber)

    try {
      let group = await e.bot.pickGroup(target)
      
      // 检查是否支持 shareMusic 方法
      if (typeof group.shareMusic === 'function') {
        await group.shareMusic('163', id)
      } else {
        // 构建音乐分享消息
        const musicMsg = {
          type: 'music',
          data: {
            type: '163',
            id: id,
            jumpUrl: `https://music.163.com/#/song?id=${id}`
          }
        }
        await e.reply(musicMsg)
      }
      return `the music has been shared to ${target}`
    } catch (e) {
      return `music share failed: ${e}`
    }
  }

  description = 'Useful when you want to share music. You must use searchMusic first to get the music id.  If no extra description needed, just reply <EMPTY> at the next turn'
}
