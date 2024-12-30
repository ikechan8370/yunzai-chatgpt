import _ from 'lodash'
// import {segment} from "oicq";

// 更新后的 faceMap，使用 exports.facemap 的数据
export const faceMap = {
  0: { text: "/惊讶" },
  1: { text: "/撇嘴" },
  2: { text: "/色" },
  3: { text: "/发呆" },
  4: { text: "/得意" },
  5: { text: "/流泪", stickerId: "16", stickerType: 1 },
  6: { text: "/害羞" },
  7: { text: "/闭嘴" },
  8: { text: "/睡" },
  9: { text: "/大哭" },
  10: { text: "/尴尬" },
  11: { text: "/发怒" },
  12: { text: "/调皮" },
  13: { text: "/呲牙" },
  14: { text: "/微笑" },
  15: { text: "/难过" },
  16: { text: "/酷" },
  18: { text: "/抓狂" },
  19: { text: "/吐" },
  20: { text: "/偷笑" },
  21: { text: "/可爱" },
  22: { text: "/白眼" },
  23: { text: "/傲慢" },
  24: { text: "/饥饿" },
  25: { text: "/困" },
  26: { text: "/惊恐" },
  27: { text: "/流汗" },
  28: { text: "/憨笑" },
  29: { text: "/悠闲" },
  30: { text: "/奋斗" },
  31: { text: "/咒骂" },
  32: { text: "/疑问" },
  33: { text: "/嘘" },
  34: { text: "/晕" },
  35: { text: "/折磨" },
  36: { text: "/衰" },
  37: { text: "/骷髅" },
  38: { text: "/敲打" },
  39: { text: "/再见" },
  41: { text: "/发抖" },
  42: { text: "/爱情" },
  43: { text: "/跳跳" },
  46: { text: "/猪头" },
  49: { text: "/拥抱" },
  53: { text: "/蛋糕", stickerId: "17", stickerType: 1 },
  55: { text: "/**" },
  56: { text: "/刀" },
  59: { text: "/便便" },
  60: { text: "/咖啡" },
  63: { text: "/玫瑰" },
  64: { text: "/凋谢" },
  66: { text: "/爱心" },
  67: { text: "/心碎" },
  74: { text: "/太阳", stickerId: "35", stickerType: 1 },
  75: { text: "/月亮", stickerId: "36", stickerType: 1 },
  76: { text: "/赞" },
  77: { text: "/踩" },
  78: { text: "/握手" },
  79: { text: "/胜利" },
  85: { text: "/飞吻" },
  86: { text: "/怄火" },
  89: { text: "/西瓜" },
  96: { text: "/冷汗" },
  97: { text: "/擦汗" },
  98: { text: "/抠鼻" },
  99: { text: "/鼓掌" },
  100: { text: "/糗大了" },
  101: { text: "/坏笑" },
  102: { text: "/左哼哼" },
  103: { text: "/右哼哼" },
  104: { text: "/哈欠" },
  105: { text: "/鄙视" },
  106: { text: "/委屈" },
  107: { text: "/快哭了" },
  108: { text: "/阴险" },
  109: { text: "/左亲亲" },
  110: { text: "/吓" },
  111: { text: "/可怜" },
  112: { text: "/菜刀" },
  114: { text: "/篮球", stickerId: "13", stickerType: 2 },
  116: { text: "/示爱" },
  118: { text: "/抱拳" },
  119: { text: "/勾引" },
  120: { text: "/拳头" },
  121: { text: "/差劲" },
  122: { text: "/爱你" },
  123: { text: "/NO" },
  124: { text: "/OK" },
  125: { text: "/转圈" },
  129: { text: "/挥手" },
  137: { text: "/鞭炮", stickerId: "18", stickerType: 1 },
  144: { text: "/喝彩" },
  146: { text: "/爆筋" },
  147: { text: "/棒棒糖" },
  148: { text: "/喝奶" },
  169: { text: "/手枪" },
  171: { text: "/茶" },
  172: { text: "/眨眼睛" },
  173: { text: "/泪奔" },
  174: { text: "/无奈" },
  175: { text: "/卖萌" },
  176: { text: "/小纠结" },
  177: { text: "/喷血" },
  178: { text: "/斜眼笑" },
  179: { text: "/doge" },
  180: { text: "/惊喜" },
  181: { text: "/戳一戳", stickerId: "37", stickerType: 1 },
  182: { text: "/笑哭" },
  183: { text: "/我最美" },
  185: { text: "/羊驼" },
  187: { text: "/幽灵" },
  193: { text: "/大笑" },
  194: { text: "/不开心" },
  198: { text: "/呃" },
  200: { text: "/求求" },
  201: { text: "/点赞" },
  202: { text: "/无聊" },
  203: { text: "/托脸" },
  204: { text: "/吃" },
  206: { text: "/害怕" },
  210: { text: "/飙泪" },
  211: { text: "/我不看" },
  212: { text: "/托腮" },
  214: { text: "/啵啵" },
  215: { text: "/糊脸" },
  216: { text: "/拍头" },
  217: { text: "/扯一扯" },
  218: { text: "/舔一舔" },
  219: { text: "/蹭一蹭" },
  221: { text: "/顶呱呱" },
  222: { text: "/抱抱" },
  223: { text: "/暴击" },
  224: { text: "/开枪" },
  225: { text: "/撩一撩" },
  226: { text: "/拍桌" },
  227: { text: "/拍手" },
  229: { text: "/干杯" },
  230: { text: "/嘲讽" },
  231: { text: "/哼" },
  232: { text: "/佛系" },
  233: { text: "/掐一掐" },
  235: { text: "/颤抖" },
  237: { text: "/偷看" },
  238: { text: "/扇脸" },
  239: { text: "/原谅" },
  240: { text: "/喷脸" },
  241: { text: "/生日快乐" },
  243: { text: "/甩头" },
  244: { text: "/扔狗" },
  262: { text: "/脑阔疼" },
  263: { text: "/沧桑" },
  264: { text: "/捂脸" },
  265: { text: "/辣眼睛" },
  266: { text: "/哦哟" },
  267: { text: "/头秃" },
  268: { text: "/问号脸" },
  269: { text: "/暗中观察" },
  270: { text: "/emm" },
  271: { text: "/吃瓜" },
  272: { text: "/呵呵哒" },
  273: { text: "/我酸了" },
  277: { text: "/汪汪" },
  278: { text: "/汗" },
  281: { text: "/无眼笑" },
  282: { text: "/敬礼" },
  283: { text: "/狂笑" },
  284: { text: "/面无表情" },
  285: { text: "/摸鱼" },
  286: { text: "/魔鬼笑" },
  287: { text: "/哦" },
  288: { text: "/请" },
  289: { text: "/睁眼" },
  290: { text: "/敲开心" },
  292: { text: "/让我康康" },
  293: { text: "/摸锦鲤" },
  294: { text: "/期待" },
  295: { text: "/拿到红包" },
  297: { text: "/拜谢" },
  298: { text: "/元宝" },
  299: { text: "/牛啊" },
  300: { text: "/胖三斤" },
  301: { text: "/好闪" },
  302: { text: "/左拜年" },
  303: { text: "/右拜年" },
  305: { text: "/右亲亲" },
  306: { text: "/牛气冲天" },
  307: { text: "/喵喵" },
  311: { text: "/打call", stickerId: "1", stickerType: 1 },
  312: { text: "/变形", stickerId: "2", stickerType: 1 },
  314: { text: "/仔细分析", stickerId: "4", stickerType: 1 },
  317: { text: "/菜汪", stickerId: "7", stickerType: 1 },
  318: { text: "/崇拜", stickerId: "8", stickerType: 1 },
  319: { text: "/比心", stickerId: "9", stickerType: 1 },
  320: { text: "/庆祝", stickerId: "10", stickerType: 1 },
  322: { text: "/拒绝" },
  323: { text: "/嫌弃" },
  324: { text: "/吃糖", stickerId: "12", stickerType: 1 },
  325: { text: "/惊吓", stickerId: "14", stickerType: 1 },
  326: { text: "/生气", stickerId: "15", stickerType: 1 },
  332: { text: "/举牌牌" },
  333: { text: "/烟花", stickerId: "19", stickerType: 1 },
  334: { text: "/虎虎生威" },
  336: { text: "/豹富" },
  337: { text: "/花朵脸", stickerId: "22", stickerType: 1 },
  338: { text: "/我想开了", stickerId: "20", stickerType: 1 },
  339: { text: "/舔屏", stickerId: "21", stickerType: 1 },
  341: { text: "/打招呼", stickerId: "24", stickerType: 1 },
  342: { text: "/酸Q", stickerId: "26", stickerType: 1 },
  343: { text: "/我方了", stickerId: "27", stickerType: 1 },
  344: { text: "/大怨种", stickerId: "28", stickerType: 1 },
  345: { text: "/红包多多", stickerId: "29", stickerType: 1 },
  346: { text: "/你真棒棒", stickerId: "25", stickerType: 1 },
  347: { text: "/大展宏兔" },
  348: { text: "/福萝卜" },
  349: { text: "/坚强", stickerId: "32", stickerType: 1 },
  350: { text: "/贴贴", stickerId: "31", stickerType: 1 },
  351: { text: "/敲敲", stickerId: "30", stickerType: 1 },
  352: { text: "/咦" },
  353: { text: "/拜托" },
  354: { text: "/尊嘟假嘟" },
  355: { text: "/耶" },
  356: { text: "/666" },
  357: { text: "/裂开" },
  358: { text: "/骰子", stickerId: "33", stickerType: 2 },
  359: { text: "/包剪锤", stickerId: "34", stickerType: 2 },
  392: { text: "/龙年快乐", stickerId: "38", stickerType: 3 },
  393: { text: "/新年中龙", stickerId: "39", stickerType: 3 },
  394: { text: "/新年大龙", stickerId: "40", stickerType: 3 },
  395: { text: "/略略略", stickerId: "41", stickerType: 1 }
};

// 根据新的 faceMap 生成 faceMapReverse
export const faceMapReverse = {}
for (const id in faceMap) {
  faceMapReverse[faceMap[id].text] = id
}

export async function convertFaces(msg, handleAt = false, e) {
  handleAt = e?.isGroup && handleAt
  let groupMembers
  let groupCardQQMap = {}
  if (handleAt) {
    try {
      groupMembers = e.bot.gml.get(e.group_id)
    } catch (err) {
      console.error(`Failed to get group members: ${err}`)
    }
    if (groupMembers) {
      for (let key of groupMembers.keys()) {
        let userInfo = groupMembers.get(key)
        if (userInfo.card) {
          groupCardQQMap[userInfo.card] = userInfo.user_id
        }
        if (userInfo.nickname) {
          groupCardQQMap[userInfo.nickname] = userInfo.user_id
        }
      }
    }
  }
  let tmpMsg = ''
  let tmpFace = ''
  let tmpAt = ''
  let foundFace = false
  let foundAt = false
  let msgs = []
  for (let i = 0; i < msg.length; i++) {
    // console.log(msg[i])
    if (msg[i] === '[') {
      foundFace = true
      continue
    }
    if (!foundFace) {
      if (handleAt && msg[i] === '@') {
        foundAt = true
        if (tmpMsg) {
          msgs.push(tmpMsg)
          tmpMsg = ''
        }
        continue
      }
      if (handleAt && foundAt) {
        tmpAt += msg[i]
        if (groupCardQQMap[tmpAt]) {
          foundAt = false
          msgs.push(segment.at(groupCardQQMap[tmpAt], groupMembers.get(groupCardQQMap[tmpAt]).card, false))
          tmpAt = ''
          continue
        }
      } else {
        tmpMsg += msg[i]
      }
    } else {
      if (msg[i] !== ']') {
        tmpFace += msg[i]
      } else {
        foundFace = false
        // 使用新的 faceMapReverse 进行查找
        if (faceMapReverse[tmpFace] || faceMapReverse['/' + tmpFace] || faceMapReverse[_.trimStart(tmpFace, '/')]) {
          if (tmpMsg) {
            msgs.push(tmpMsg)
          }
          msgs.push(segment.face(parseInt(faceMapReverse[tmpFace] || faceMapReverse['/' + tmpFace] || faceMapReverse[_.trimStart(tmpFace, '/')])))
          tmpMsg = ''
        } else {
          tmpMsg += `[${tmpFace}]`
        }
        tmpFace = ''
      }
    }
  }
  if (tmpMsg) {
    msgs.push(tmpMsg)
  }
  if (tmpFace) {
    msgs.push(`[${tmpFace}`)
  }
  if (handleAt && tmpAt) {
    msgs.push(`@${tmpAt}`)
  }
  return msgs
}

export function testConvertFaces() {
  const toTest = [
    '你好啊[/微笑][惊讶]哈哈[/拜谢]'
  ]
  toTest.forEach(t => {
    console.log(convertFaces(t))
  })
}

// testConvertFaces()