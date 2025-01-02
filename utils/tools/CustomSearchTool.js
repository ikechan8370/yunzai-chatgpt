import { AbstractTool } from './AbstractTool.js';
import fetch from 'node-fetch';
import { Config } from '../config.js';

/**
 * 自定义搜索工具类 - 使用 Gemini API
 * @class CustomSearchTool
 * @extends {AbstractTool}
 */
export class CustomSearchTool extends AbstractTool {
  name = 'CustomSearchTool';

  parameters = {
    properties: {
      query: {
        type: 'string',
        description: '要搜索的内容或关键词',
      },
      length: {
        type: 'integer',
        description: '期望的摘要长度（句子数），默认为3',
      },
      sender: {
        type: 'object',
        description: '发送者信息',
      }
    },
    required: ['query', 'sender'],
  };

  description = '使用 Gemini API 进行智能搜索，根据输入的内容或关键词提供全面的搜索结果和摘要。支持自定义摘要长度。';

  /**
   * 工具执行函数
   * @param {Object} opt - 工具参数
   * @param {string} opt.query - 搜索内容或关键词
   * @param {number} [opt.length=3] - 摘要长度
   * @param {Object} opt.sender - 发送者信息
   * @returns {Promise<Object>} - 包含答案和来源的对象
   */
  func = async function (opt) {
    const { query, length = 3, sender } = opt;

    if (!query?.trim()) {
      throw new Error('搜索内容或关键词不能为空');
    }

    try {
      const result = await this.searchWithGemini(query, length);
      console.debug(`[CustomSearchTool] 搜索结果:`, result);
      // 添加发送者信息
      result.senderInfo = {
        title: `${sender.card || sender.nickname || sender.user_id}的搜索结果`,
        sender
      };
      
      return result;
    } catch (error) {
      console.error('[CustomSearchTool] 搜索失败:', error);
      throw new Error(`搜索失败: ${error.message}`);
    }
  };

  /**
   * 使用 Gemini API 进行搜索
   * @param {string} query - 搜索内容或关键词
   * @param {number} length - 摘要长度
   * @returns {Promise<Object>} - 包含答案和来源的对象
   * @private
   */
  async searchWithGemini(query, length) {
    const apiKey = Config.geminiKey;
    const apiBaseUrl = Config.geminiBaseUrl;
    const apiUrl = `${apiBaseUrl}/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

    if (!apiKey || !apiBaseUrl) {
      throw new Error('Gemini API 配置缺失');
    }

    const requestBody = {
      "systemInstruction": {
        "parts": [{
          "text": "你是一个有用的助手，你更喜欢说中文。你会根据用户的问题，通过搜索引擎获取最新的信息来回答问题。你的回答会尽可能准确、客观。"
        }]
      },
      "contents": [{
        "parts": [{
          "text": this.constructPrompt(query, length)
        }],
        "role": "user"
      }],
      "tools": [{
        "googleSearch": {}
      }]
    };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`API 请求失败: ${data.error?.message || '未知错误'}`);
      }

      return this.processGeminiResponse(data);
    } catch (error) {
      console.error('[CustomSearchTool] API调用失败:', error);
      throw error;
    }
  }

  /**
   * 构建提示词
   * @param {string} query - 搜索内容或关键词
   * @param {number} length - 摘要长度
   * @returns {string} - 格式化的提示词
   * @private
   */
  constructPrompt(query, length) {
    return `请对以下内容进行搜索并提供${length}句话的详细总结。
    需要搜索的内容: ${query}
    请确保回答准确、客观，并包含相关事实和信息。`;
  }

  /**
   * 处理 Gemini API 响应
   * @param {Object} data - API 响应数据
   * @returns {Object} - 处理后的结果对象
   * @private
   */
  processGeminiResponse(data) {
    if (!data?.candidates?.[0]?.content?.parts) {
      throw new Error('无效的 API 响应');
    }

    // 合并所有文本部分作为答案
    const answer = data.candidates[0].content.parts
      .map(part => part.text)
      .filter(Boolean)
      .join('\n');

    // 处理来源信息
    let sources = [];
    if (data.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      sources = data.candidates[0].groundingMetadata.groundingChunks
        .filter(chunk => chunk.web)
        .map(chunk => {
          let url = chunk.web.uri;
          // 替换特定的URL前缀
          if (url.includes('https://vertexaisearch.cloud.google.com/grounding-api-redirect')) {
            url = url.replace(
              'https://vertexaisearch.cloud.google.com/grounding-api-redirect',
              'https://miao.news'
            );
          }
          return {
            title: chunk.web.title || '未知标题',
            url: url
          };
        })
        .filter((v, i, a) => 
          a.findIndex(t => (t.title === v.title && t.url === v.url)) === i
        );
    }

    console.debug('[CustomSearchTool] 处理后的来源信息:', sources);

    // 构建转发消息数组
    const forwardMsg = [answer];
    if (sources && sources.length > 0) {
      forwardMsg.push('\n信息来源：');
      sources.forEach((source, index) => {
        forwardMsg.push(`${index + 1}. ${source.title}\n${source.url}`);
      });
    }

    return {
      answer,
      sources,
      forwardMsg
    };
  }
}