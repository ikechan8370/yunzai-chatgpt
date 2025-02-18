import fs from "fs";
import pathModule from 'path';
import { fileTypeFromBuffer } from 'file-type';
import moment from 'moment';

// 配置
const ROOT_PATH = process.cwd();
const PICTURES_DIR = pathModule.join(ROOT_PATH, "temp/tp-bq", "pictures");

// 工具函数
const createDirIfNotExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const sanitizeFilename = (name) => {
  return name
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\[\]]/g, '')
    .trim()
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5-_.]/g, '-');
};

const findMatchingFiles = (fileList, tag) => {
  const sanitizedTag = sanitizeFilename(tag);
  let matches = fileList.filter(file => file === sanitizedTag);
  if (matches.length === 0) {
    matches = fileList.filter(file => file.startsWith(sanitizedTag));
  }
  if (matches.length === 0) {
    matches = fileList.filter(file => file.includes(sanitizedTag));
  }
  return matches;
};

// 初始化目录
createDirIfNotExists(PICTURES_DIR);

/**
 * 获取并发送表情包
 * @param {Object} e - 消息对象
 * @param {string} tag - 表情包标签
 * @returns {Promise<boolean|undefined>}
 */
export async function getToimg(e, tag) {
  try {
    // 读取文件列表
    const fileList = await fs.promises.readdir(PICTURES_DIR);
    const matchedFiles = findMatchingFiles(fileList, tag);

    if (matchedFiles.length === 0) {
      logger.warn(`未找到匹配的表情包: ${tag}`);
      return;
    }

    // 随机选择文件
    const selectedFile = matchedFiles[Math.floor(Math.random() * matchedFiles.length)];
    const picPath = pathModule.join(PICTURES_DIR, selectedFile);

    try {
      await fs.promises.access(picPath);
      await e.reply(segment.image('file:///' + picPath));
      logger.info(`发送表情包: ${picPath}`);
      return false;
    } catch {
      logger.warn(`找不到指定的表情包文件: ${picPath}`);
      return;
    }
  } catch (error) {
    logger.error('获取表情包失败:', error);
    return;
  }
}

/**
 * 保存表情包
 * @param {Object} e - 消息对象
 * @param {string} image - Base64图片数据
 * @param {string} text - 命令文本
 * @returns {Promise<boolean|undefined>}
 */
export async function downImg(e, image, t) {
  try {
      if (!e.img && !image) {
          return false;
      }
      let kWordReg = /^#?(DOWNIMG:)\s*(.*)/i;
      t = t.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
      const match = kWordReg.exec(t);
      if (!match) {
          logger.error('DOWNIMG command format invalid:', t);
          return;
      }
      let rawmsg = match[2] || "defaultTag";
      let kWord = rawmsg.replace(/，|,|、| |。/g, "-")
          .replace(/--+/g, "-")
          .replace(/^-|-$|--/g, "")
          .trim() || "defaultTag";
          
      if (image) {
          const imageBuffer = Buffer.from(image, 'base64');
          const type = await fileTypeFromBuffer(imageBuffer);
          let picType = 'png';
          if (type && type.ext) {
              picType = type.ext;
          }
          const currentTime = moment().format("YYMMDDHHmmss");
          const safeTag = kWord.replace(/[^a-zA-Z0-9\u4e00-\u9fa5-_]/g, '-');
          const picPath = pathModule.join(PICTURES_DIR, `${currentTime}-${safeTag.substring(0, 200)}.${picType}`);
          logger.mark("DOWNIMG：", picPath);
          
          if (!fs.existsSync(pathModule.join(PICTURES_DIR))) {
              fs.mkdirSync(pathModule.join(PICTURES_DIR), { recursive: true });
          }
          fs.writeFileSync(picPath, imageBuffer);
          logger.info(`图片已保存，标签为：${kWord}`);
          return true; // 返回成功标志
      }
  } catch (error) {
      logger.error('Error in downImg:', error);
      logger.error("保存图片时发生错误");
      return false; // 返回失败标志
  }
}

/**
 * 获取表情包列表
 * @returns {Promise<string[]>}
 */
export async function fileImgList() {
  try {
    const files = await fs.promises.readdir(PICTURES_DIR);
    return files
      .map(filename => {
        const match = filename.match(/\d{12}-(.+)$/);
        return match ? match[1] : filename;
      })
      .filter(Boolean);
  } catch (error) {
    logger.error('读取表情包列表失败:', error);
    return [];
  }
}