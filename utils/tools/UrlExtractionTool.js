import { AbstractTool } from './AbstractTool.js'
import fetch from 'node-fetch'

// 假设的日志记录器，实际应用中应替换为专业的日志库
const logger = {
  mark: console.log,
  error: console.error,
};

/**
 * URL提取工具类
 * @class UrlExtractionTool
 * @extends {AbstractTool}
 */
export class UrlExtractionTool extends AbstractTool {
  // 工具名称
  name = 'UrlExtractionTool';

  // 工具参数
  parameters = {
    properties: {
      message: {
        type: 'string',
        description: 'The message containing URLs to be extracted.',
      },
      appendContent: {
        type: 'boolean',
        description: 'Whether to append the extracted content to the original message. Defaults to true.',
      },
    },
    required: ['message'],
  };

  // 工具描述
  description = 'Extracts URLs from a given message and optionally retrieves the content of those URLs, appending it to the original message.';

  /**
   * 工具执行函数
   * @param {Object} opt - 工具参数
   * @param {Object} ai - AI对象 (未使用)
   * @returns {Promise<{message: string, extractedContent: string}>} - 包含处理后的消息和提取内容的JSON对象
   */
  func = async function (opt, ai) {
    let { message, appendContent = true } = opt;
    if (!message) {
      return 'The message parameter is required.';
    }

    try {
      const result = await processMessageWithUrls(message, appendContent);
      logger.mark(`[URL Extraction] Processed message: ${result.message}, Extracted content: ${result.extractedContent}`);
      return result;
    } catch (error) {
      logger.error(`[URL Extraction] URL extraction failed: ${error.message}`);
      return `URL extraction failed, please check the logs. ${error.message}`;
    }
  };
}

/**
 * 检查URL是否为不需要提取内容的文件类型
 * @param {string} url URL地址
 * @returns {boolean} 是否为不需要提取的文件类型
 */
function isSkippedUrl(url) {
  // 使用 Set 存储扩展名以提高查找效率
  const skippedExtensions = new Set([
    // 图片
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'tif', 'raw', 'cr2', 'nef', 'arw', 'dng', 'heif', 'heic', 'avif', 'jfif', 'psd', 'ai',
    // 视频
    'mp4', 'webm', 'mkv', 'flv', 'avi', 'mov', 'wmv', 'rmvb', 'm4v', '3gp', 'mpeg', 'mpg', 'ts', 'mts',
    // 可执行文件和二进制文件
    'exe', 'msi', 'dll', 'sys', 'bin', 'dat', 'iso', 'img', 'dmg', 'pkg', 'deb', 'rpm', 'apk', 'ipa', 'jar', 'class', 'pyc', 'o', 'so', 'dylib',
    // 压缩文件
    'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'tgz', 'tbz', 'cab', 'ace', 'arc',
  ]);

  // 优化关键词匹配
  const skipKeywords = /\/(images?|photos?|pics?|videos?|medias?|downloads?|uploads?|binaries|assets)\//i;

  // 从URL中提取扩展名
  const extension = url.split('.').pop().toLowerCase();

  return skippedExtensions.has(extension) || skipKeywords.test(url);
}

/**
 * 从文本中提取URL
 * @param {string} text 需要提取URL的文本
 * @returns {string[]} URL数组
 */
function extractUrls(text) {
  // 更精确的正则表达式来匹配 URL
  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
  const matches = text.match(urlRegex) || [];

  // 简化 URL 清理逻辑
  return matches.map(url => {
    try {
      // 解码URL
      return decodeURIComponent(url);
    } catch (e) {
      // 解码失败则返回原URL
      return url;
    }
  });
}

/**
 * 从URL提取内容
 * @param {string} url 需要提取内容的URL
 * @returns {Promise<Object>} 提取的内容
 */
async function extractUrlContent(url) {
  if (isSkippedUrl(url)) {
    logger.mark(`[URL提取]跳过不需要处理的URL类型: ${url}`);
    return null;
  }

  try {
    logger.mark(`[URL提取]开始从URL获取内容: ${url}`);
    const response = await fetch(`https://lbl.news/api/extract?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      // 更详细的错误处理
      const errorMsg = await response.text();
      throw new Error(`提取内容失败: ${response.status} ${response.statusText} - ${errorMsg}`);
    }
    const data = await response.json();
    logger.mark(`[URL提取]成功获取URL内容: ${url}`);
    return data;
  } catch (error) {
    logger.error(`[URL提取]提取内容失败: ${error.message}, URL: ${url}`);
    return null;
  }
}

/**
 * 处理消息中的URL并提取内容
 * @param {string} message 用户消息
 * @param {boolean} appendContent 是否将提取的内容附加到消息中，默认为true
 * @returns {Promise<{message: string, extractedContent: string}>} 处理后的消息和提取的内容
 */
async function processMessageWithUrls(message, appendContent = true) {
  const urls = extractUrls(message);
  if (urls.length === 0) {
    return { message, extractedContent: '' };
  }

  logger.mark(`[URL处理]从消息中提取到${urls.length}个URL`);
  let processedMessage = message;
  let extractedContent = '';

  // 使用 Promise.all 并发处理多个 URL
  const contents = await Promise.all(
    urls.map(async url => {
      if (isSkippedUrl(url)) {
        logger.mark(`[URL处理]跳过URL: ${url}`);
        return null;
      }

      logger.mark(`[URL处理]开始处理URL: ${url}`);
      const content = await extractUrlContent(url);
      if (content) {
        logger.mark(`[URL处理]成功提取URL内容: ${url}`);
        // 格式化提取的内容
        return { url, content: content.content };
      }
      return null;
    })
  );

  // 组合提取的内容
  contents.forEach(item => {
    if (item) {
      const urlContent = `\n\n提取的URL内容(${item.url}):\n内容: ${item.content}`;
      extractedContent += urlContent;
      if (appendContent) {
        processedMessage += urlContent;
      }
    }
  });

  return { message: processedMessage, extractedContent };
}