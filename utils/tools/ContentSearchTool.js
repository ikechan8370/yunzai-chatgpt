import { AbstractTool } from './AbstractTool.js';
import fetch from 'node-fetch';
import { Config } from '../config.js';

/**
 * 内容搜索和分析工具类 - 使用 Gemini API
 * @class ContentSearchTool
 * @extends {AbstractTool}
 */
export class ContentSearchTool extends AbstractTool {
  name = 'ContentSearchTool';

  parameters = {
    properties: {
      content: {  // 改为 content 参数
        type: 'string',
        description: '需要分析的文本内容',
      },
      task: {     // 新增 task 参数
        type: 'string',
        description: '分析任务类型（如：总结、分析、问答等）',
        default: 'summarize'
      },
      length: {
        type: 'integer',
        description: '期望的输出长度（句子数），默认为3',
      },
    },
    required: ['content'],
  };

  description = '使用 Gemini API 进行内容分析，支持文本总结、深度分析、问答等功能。';

  /**
   * 工具执行函数
   * @param {Object} opt - 工具参数
   * @param {string} opt.content - 需要分析的内容
   * @param {string} [opt.task='summarize'] - 分析任务类型
   * @param {number} [opt.length=3] - 输出长度
   * @returns {Promise<Object>} - 包含答案和分析的对象
   */
  func = async function (opt) {
    const { content, task = 'summarize', length = 3 } = opt;

    if (!content?.trim()) {
      throw new Error('分析内容不能为空');
    }

    try {
      const result = await this.analyzeWithGemini(content, task, length);
      console.log(`分析结果: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      console.error('内容分析失败:', error);
      throw new Error(`内容分析失败: ${error.message}`);
    }
  };

  /**
   * 使用 Gemini API 进行内容分析
   * @param {string} content - 需要分析的内容
   * @param {string} task - 分析任务类型
   * @param {number} length - 输出长度
   * @returns {Promise<Object>} - 分析结果
   * @private
   */
  async analyzeWithGemini(content, task, length) {
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
            text: this.constructPrompt(content, task, length)
          }]
        }],
        tools: [{
          googleSearch: {}
        }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`API 请求失败: ${data.error?.message || '未知错误'}`);
    }

    return this.processGeminiResponse(data);
  }

  /**
   * 构建分析提示词
   * @param {string} content - 需要分析的内容
   * @param {string} task - 分析任务类型
   * @param {number} length - 输出长度
   * @returns {string} - 格式化的提示词
   * @private
   */
  constructPrompt(content, task, length) {
    const taskPrompts = {
      summarize: `Please provide a ${length} sentence summary of the following content:`,
      analyze: `Please provide a ${length} point analysis of the following content:`,
      qa: 'Please answer questions based on the following content:',
      extract: 'Please extract key information from the following content:',
    };

    const prompt = taskPrompts[task] || taskPrompts.summarize;
    return `${prompt}\n\nContent: ${content}`;
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

    const analysis = data.candidates[0].content.parts[0].text;
    
    // 提取参考信息（如果有）
    const references = data.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter(chunk => chunk.web)
      ?.map(chunk => ({
        title: chunk.web.title,
        url: chunk.web.uri
      }))
      ?.filter((v, i, a) => 
        a.findIndex(t => (t.title === v.title && t.url === v.url)) === i
      ) || [];

    return {
      analysis,
      references,
      metadata: {
        timestamp: new Date().toISOString(),
        model: 'gemini-2.0-flash-exp'
      }
    };
  }
}