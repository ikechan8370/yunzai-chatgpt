import _ from 'lodash';
import { segment } from 'oicq';

/**
 * 更新说明：
 * 1. 更新了 faceMap，添加了新的表情，并修正了部分表情的名称。
 * 2. 更新了 faceMapReverse，与 faceMap 保持一致。
 * 3. 优化了 convertFaces 函数：
 *    - 修复了获取群成员列表的逻辑错误。
 *    - 优化了 at 成员的逻辑，避免了重复的 at 信息。
 *    - 简化了表情查找的逻辑。
 * 4. 移除了不必要的注释和测试代码。
 */

// 定义表情映射，将表情 ID 映射到表情名称
export const faceMap = {
  0: '惊讶',
  1: '撇嘴',
  2: '色',
  3: '发呆',
  4: '得意',
  5: '流泪',
  6: '害羞',
  7: '闭嘴',
  8: '睡',
  9: '大哭',
  10: '尴尬',
  11: '发怒',
  12: '调皮',
  13: '呲牙',
  14: '微笑',
  15: '难过',
  16: '酷',
  18: '抓狂',
  19: '吐',
  20: '偷笑',
  21: '可爱',
  22: '白眼',
  23: '傲慢',
  24: '饥饿',
  25: '困',
  26: '惊恐',
  27: '流汗',
  28: '憨笑',
  29: '悠闲',
  30: '奋斗',
  31: '咒骂',
  32: '疑问',
  33: '嘘',
  34: '晕',
  35: '折磨',
  36: '衰',
  37: '骷髅',
  38: '敲打',
  39: '再见',
  41: '发抖',
  42: '爱情',
  43: '跳跳',
  46: '猪头',
  49: '拥抱',
  53: '蛋糕',
  55: '++',
  56: '刀',
  59: '便便',
  60: '咖啡',
  63: '玫瑰',
  64: '凋谢',
  66: '爱心',
  67: '心碎',
  74: '太阳',
  75: '月亮',
  76: '赞',
  77: '踩',
  78: '握手',
  79: '胜利',
  85: '飞吻',
  86: '怄火',
  89: '西瓜',
  96: '冷汗',
  97: '擦汗',
  98: '抠鼻',
  99: '鼓掌',
  100: '糗大了',
  101: '坏笑',
  102: '左哼哼',
  103: '右哼哼',
  104: '哈欠',
  105: '鄙视',
  106: '委屈',
  107: '快哭了',
  108: '阴险',
  109: '左亲亲',
  110: '吓',
  111: '可怜',
  112: '菜刀',
  114: '篮球',
  116: '示爱',
  118: '抱拳',
  119: '勾引',
  120: '拳头',
  121: '差劲',
  122: '爱你',
  123: 'NO',
  124: 'OK',
  125: '转圈',
  129: '挥手',
  137: '鞭炮',
  144: '喝彩',
  146: '爆筋',
  147: '棒棒糖',
  148: '喝奶',
  169: '手枪',
  171: '茶',
  172: '眨眼睛',
  173: '泪奔',
  174: '无奈',
  175: '卖萌',
  176: '小纠结',
  177: '喷血',
  178: '斜眼笑',
  179: 'doge',
  180: '惊喜',
  181: '戳一戳',
  182: '笑哭',
  183: '我最美',
  185: '羊驼',
  187: '幽灵',
  193: '大笑',
  194: '不开心',
  198: '呃',
  200: '求求',
  201: '点赞',
  202: '无聊',
  203: '托脸',
  204: '吃',
  206: '害怕',
  210: '飙泪',
  211: '我不看',
  212: '托腮',
  214: '啵啵',
  215: '糊脸',
  216: '拍头',
  217: '扯一扯',
  218: '舔一舔',
  219: '蹭一蹭',
  221: '顶呱呱',
  222: '抱抱',
  223: '暴击',
  224: '开枪',
  225: '撩一撩',
  226: '拍桌',
  227: '拍手',
  229: '干杯',
  230: '嘲讽',
  231: '哼',
  232: '佛系',
  233: '掐一掐',
  235: '颤抖',
  237: '偷看',
  238: '扇脸',
  239: '原谅',
  240: '喷脸',
  241: '生日快乐',
  243: '甩头',
  244: '扔狗',
  262: '脑阔疼',
  263: '沧桑',
  264: '捂脸',
  265: '辣眼睛',
  266: '哦哟',
  267: '头秃',
  268: '问号脸',
  269: '暗中观察',
  270: 'emm',
  271: '吃瓜',
  272: '呵呵哒',
  273: '我酸了',
  277: '汪汪',
  278: '汗',
  281: '无眼笑',
  282: '敬礼',
  283: '狂笑',
  284: '面无表情',
  285: '摸鱼',
  286: '魔鬼笑',
  287: '哦',
  288: '请',
  289: '睁眼',
  290: '敲开心',
  292: '让我康康',
  293: '摸锦鲤',
  294: '期待',
  295: '拿到红包',
  297: '拜谢',
  298: '元宝',
  299: '牛啊',
  300: '胖三斤',
  301: '好闪',
  302: '左拜年',
  303: '右拜年',
  305: '右亲亲',
  306: '牛气冲天',
  307: '喵喵',
  311: '打call',
  312: '变形',
  314: '仔细分析',
  317: '菜汪',
  318: '崇拜',
  319: '比心',
  320: '庆祝',
  322: '拒绝',
  323: '嫌弃',
  324: '吃糖',
  325: '惊吓',
  326: '生气',
  332: '举牌牌',
  333: '烟花',
  334: '虎虎生威',
  336: '豹富',
  337: '花朵脸',
  338: '我想开了',
  339: '舔屏',
  341: '打招呼',
  342: '酸Q',
  343: '我方了',
  344: '大怨种',
  345: '红包多多',
  346: '你真棒棒',
  347: '大展宏兔',
  348: '福萝卜',
  349: '坚强',
  350: '贴贴',
  351: '敲敲',
  352: '咦',
  353: '拜托',
  354: '尊嘟假嘟',
  355: '耶',
  356: '666',
  357: '裂开',
  358: '骰子',
  359: '包剪锤',
  392: '龙年快乐',
  393: '新年中龙',
  394: '新年大龙',
  395: '略略略'
};

// 反向映射，将表情名称映射到表情 ID
export const faceMapReverse = _.invert(faceMap);

// 将“思考”重定向到 212（托腮）
faceMapReverse['思考'] = '212';

// 将消息中的表情占位符转换为 oicq 的表情代码
export async function convertFaces(msg, handleAt = false, e) {
  // 如果 e?.isGroup 为 true 且 handleAt 为 true，则设置 handleAt 为 true
  handleAt = e?.isGroup && handleAt;
  // 群成员列表
  let groupMembers;
  // 群名片到 QQ 号的映射
  const groupCardQQMap = new Map(); // 更新：使用 Map 优化查找效率
  // 如果需要处理 @ 消息
  if (handleAt) {
    try {
      // 获取群成员列表
      groupMembers = e.bot.gml.get(e.group_id); // 更新：修复获取群成员列表的逻辑错误
    } catch (err) {
      // 如果获取失败，打印错误信息
      console.error(`Failed to get group members: ${err}`);
    }
    // 如果成功获取群成员列表
    if (groupMembers) {
      // 遍历群成员列表
      for (const [key, userInfo] of groupMembers) { // 更新：使用 for...of 遍历 Map
        // 将群名片或昵称映射到 QQ 号
        if (userInfo.card) {
          groupCardQQMap.set(userInfo.card, userInfo.user_id); // 更新：使用 Map.set() 方法
        }
        if (userInfo.nickname) {
          groupCardQQMap.set(userInfo.nickname, userInfo.user_id); // 更新：使用 Map.set() 方法
        }
      }
    }
  }
  // 临时消息字符串
  let tmpMsg = '';
  // 临时表情字符串
  let tmpFace = '';
  // 临时 @ 字符串
  let tmpAt = '';
  // 是否找到表情
  let foundFace = false;
  // 是否找到 @
  let foundAt = false;
  // 转换后的消息段数组
  const msgs = [];
  // 遍历消息字符串
  for (let i = 0; i < msg.length; i++) {
    // 如果找到 '['
    if (msg[i] === '[') {
      // 设置 foundFace 为 true
      foundFace = true;
      continue;
    }
    // 如果没有找到表情
    if (!foundFace) {
      // 如果需要处理 @ 消息且找到 '@'
      if (handleAt && msg[i] === '@') {
        // 设置 foundAt 为 true
        foundAt = true;
        // 如果 tmpMsg 不为空，将其添加到 msgs 数组中
        if (tmpMsg) {
          msgs.push(tmpMsg);
          tmpMsg = '';
        }
        continue;
      }
      // 如果需要处理 @ 消息且 foundAt 为 true
      if (handleAt && foundAt) {
        // 将当前字符添加到 tmpAt 中
        tmpAt += msg[i];
        // 如果在 groupCardQQMap 中找到 tmpAt
        if (groupCardQQMap.has(tmpAt)) { // 更新：使用 Map.has() 方法
          // 设置 foundAt 为 false
          foundAt = false;
          // 将 @ 消息段添加到 msgs 数组中
          msgs.push(segment.at(groupCardQQMap.get(tmpAt))); // 更新：at 信息不再需要群名片参数
          // 清空 tmpAt
          tmpAt = '';
          continue;
        }
      } else {
        // 将当前字符添加到 tmpMsg 中
        tmpMsg += msg[i];
      }
    } else {
      // 如果当前字符不是 ']'
      if (msg[i] !== ']') {
        // 将当前字符添加到 tmpFace 中
        tmpFace += msg[i];
      } else {
        // 设置 foundFace 为 false
        foundFace = false;
        // 从 faceMapReverse 中查找表情 ID
        const faceId = faceMapReverse[tmpFace] || faceMapReverse['/' + tmpFace] || faceMapReverse[_.trimStart(tmpFace, '/')]; // 更新：简化表情查找逻辑
        // 如果找到表情 ID
        if (faceId) {
          // 如果 tmpMsg 不为空，将其添加到 msgs 数组中
          if (tmpMsg) {
            msgs.push(tmpMsg);
            tmpMsg = '';
          }
          // 添加表情消息段到 msgs 数组中
          msgs.push(segment.face(parseInt(faceId)));
          // 清空 tmpMsg
          tmpMsg = '';
        } else {
          // 将 '[' 和 tmpFace 拼接到 tmpMsg 中
          tmpMsg += `[${tmpFace}]`;
        }
        // 清空 tmpFace
        tmpFace = '';
      }
    }
  }
  // 如果 tmpMsg 不为空，将其添加到 msgs 数组中
  if (tmpMsg) {
    msgs.push(tmpMsg);
  }
  // 如果 tmpFace 不为空，将其添加到 msgs 数组中
  if (tmpFace) {
    msgs.push(`[${tmpFace}`);
  }
  // 如果需要处理 @ 消息且 tmpAt 不为空，将其添加到 msgs 数组中
  if (handleAt && tmpAt) {
    msgs.push(`@${tmpAt}`);
  }
  // 返回转换后的消息段数组
  return msgs;
}