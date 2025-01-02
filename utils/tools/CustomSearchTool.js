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
        description: '搜索关键词',
      },
      length: {
        type: 'integer',
        description: '期望的摘要长度（句子数），默认为3',
      },
    },
    required: ['query'],
  };

  description = '使用 Gemini API 进行智能搜索，提供全面的搜索结果和摘要。支持自定义摘要长度。';

  /**
   * 工具执行函数
   * @param {Object} opt - 工具参数
   * @param {string} opt.query - 搜索关键词
   * @param {number} [opt.length=3] - 摘要长度
   * @returns {Promise<Object>} - 包含答案和来源的对象
   */
  func = async function (opt) {
    const { query, length = 3 } = opt;

    if (!query?.trim()) {
      throw new Error('搜索关键词不能为空');
    }

    try {
      const result = await this.searchWithGemini(query, length);
      console.log(`搜索结果: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      console.error('搜索失败:', error);
      throw new Error(`搜索失败: ${error.message}`);
    }
  };

  /**
   * 使用 Gemini API 进行搜索
   * @param {string} query - 搜索关键词
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

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: this.constructPrompt(query, length)
          }]
        }],
        tools: [{
          googleSearch: {}
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`API 请求失败: ${data.error?.message || '未知错误'}`);
    }

    return this.processGeminiResponse(data);
  }

  /**
   * 构建提示词
   * @param {string} query - 搜索关键词
   * @param {number} length - 摘要长度
   * @returns {string} - 格式化的提示词
   * @private
   */
  constructPrompt(query, length) {
    return `Please provide a comprehensive ${length} sentence summary for the following query. 
    Include relevant facts and information.
    Query: ${query}`;
  }

  /**
   * 处理 Gemini API 响应
   * @param {Object} data - API 响应数据
   * @returns {Object} - 处理后的结果对象
   * @private
   */
  processGeminiResponse(data) {
    if (!data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('无效的 API 响应');
    }

    const answer = data.candidates[0].content.parts[0].text;
    
    // 提取来源信息
    const sources = data.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter(chunk => chunk.web)
      ?.map(chunk => ({
        title: chunk.web.title,
        url: chunk.web.uri
      }))
      ?.filter((v, i, a) => 
        a.findIndex(t => (t.title === v.title && t.url === v.url)) === i
      ) || [];

    return {
      answer,
      sources,
    };
  }
}