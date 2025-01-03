import { AbstractTool } from './AbstractTool.js';
import fetch from 'node-fetch';
import { Config } from '../config.js';
import common from '../../../../lib/common/common.js';

/**
 * 多功能工具类 - 支持搜索和代码执行
 * @class MultiTool
 * @extends {AbstractTool}
 */
export class MultiTool extends AbstractTool {
  name = 'MultiTool';

  parameters = {
    properties: {
      query: {
        type: 'string',
        description: '要处理的内容（可以是搜索查询或代码）',
      },
      type: {
        type: 'string',
        description: '操作类型：search（搜索）或 code（代码执行）',
        enum: ['search', 'code']
      },
      language: {
        type: 'string',
        description: '当type为code时的编程语言',
      },
      length: {
        type: 'integer',
        description: '当type为search时的摘要长度（句子数），默认为3',
      }
    },
    required: ['query', 'type'],
  };

  description = '多功能工具：支持使用 Gemini API 进行智能搜索和代码执行。';

  /**
   * 工具执行函数
   * @param {Object} opt - 工具参数
   * @param {string} opt.query - 处理内容
   * @param {string} opt.type - 操作类型
   * @param {string} [opt.language] - 编程语言
   * @param {number} [opt.length] - 摘要长度
   * @param {Object} e - 事件对象
   */
  func = async function (opt, e) {
    const { query, type, language, length = 3 } = opt;

    if (!query?.trim()) {
      throw new Error('处理内容不能为空');
    }

    try {
      const result = await this.processRequest(query, type, language, length);
      console.debug(`[MultiTool] 处理结果:`, result);
      
      // 构建转发消息
      const forwardMsg = this.constructForwardMessage(result, type);
      e.reply(await common.makeForwardMsg(e, forwardMsg, `${e.sender.card || e.sender.nickname || e.user_id}的${type === 'search' ? '搜索' : '代码执行'}结果`));
      
      return result;
    } catch (error) {
      console.error('[MultiTool] 处理失败:', error);
      throw new Error(`操作失败: ${error.message}`);
    }
  };

  /**
   * 处理请求
   * @param {string} query - 处理内容
   * @param {string} type - 操作类型
   * @param {string} language - 编程语言
   * @param {number} length - 摘要长度
   */
  async processRequest(query, type, language, length) {
    const apiKey = Config.geminiKey;
    const apiBaseUrl = Config.geminiBaseUrl;
    const apiUrl = `${apiBaseUrl}/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

    if (!apiKey || !apiBaseUrl) {
      throw new Error('Gemini API 配置缺失');
    }

    const requestBody = {
      "systemInstruction": {
        "parts": [{
          "text": this.getSystemInstruction(type)
        }]
      },
      "contents": [{
        "parts": [{
          "text": this.constructPrompt(query, type, language, length)
        }],
        "role": "user"
      }],
      "tools": [{
        "googleSearch": {}
      }, {
        "code_execution": {}
      }],
      "generationConfig": {
        "temperature": 0.1,
        "topK": 1,
        "topP": 1,
        "maxOutputTokens": 2048,
      }
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

      return this.processGeminiResponse(data, type);
    } catch (error) {
      console.error('[MultiTool] API调用失败:', error);
      throw error;
    }
  }

  /**
   * 获取系统指令
   * @param {string} type - 操作类型
   */
  getSystemInstruction(type) {
    if (type === 'search') {
      return "你是一个有用的助手，你更喜欢说中文。你会根据用户的问题，通过搜索引擎获取最新的信息来回答问题。你的回答会尽可能准确、客观。";
    } else {
      return "你是一个代码执行助手。请执行用户提供的代码并返回结果。同时提供代码分析和改进建议。如果有错误，请提供详细的错误信息和修复方案。";
    }
  }

  /**
   * 构建提示词
   * @param {string} query - 处理内容
   * @param {string} type - 操作类型
   * @param {string} language - 编程语言
   * @param {number} length - 摘要长度
   */
  constructPrompt(query, type, language, length) {
    if (type === 'search') {
      return `请对以下内容进行搜索并提供${length}句话的详细总结。
      需要搜索的内容: ${query}
      请确保回答准确、客观，并包含相关事实和信息。`;
    } else {
      return `请执行以下${language}代码并提供执行结果和分析：\n\`\`\`${language}\n${query}\n\`\`\`\n请提供：\n1. 代码执行结果\n2. 代码分析和可能的改进建议`;
    }
  }

  /**
   * 处理 Gemini API 响应
   * @param {Object} data - API 响应数据
   * @param {string} type - 操作类型
   */
  processGeminiResponse(data, type) {
    if (!data?.candidates?.[0]?.content?.parts) {
      throw new Error('无效的 API 响应');
    }

    const response = data.candidates[0].content.parts
      .map(part => part.text)
      .filter(Boolean)
      .join('\n');

    if (type === 'search') {
      let sources = [];
      if (data.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        sources = data.candidates[0].groundingMetadata.groundingChunks
          .filter(chunk => chunk.web)
          .map(chunk => ({
            title: chunk.web.title || '未知标题',
            url: this.processUrl(chunk.web.uri)
          }))
          .filter((v, i, a) => 
            a.findIndex(t => (t.title === v.title && t.url === v.url)) === i
          );
      }
      return { answer: response, sources };
    } else {
      let output = '';
      let explanation = '';
      let error = null;

      if (response.includes('执行结果：')) {
        const parts = response.split(/(?=执行结果：|代码分析：)/);
        parts.forEach(part => {
          if (part.startsWith('执行结果：')) {
            output = part.replace('执行结果：', '').trim();
          } else if (part.startsWith('代码分析：')) {
            explanation = part.replace('代码分析：', '').trim();
          }
        });
      } else if (response.includes('错误：')) {
        error = response;
      } else {
        output = response;
      }

      return { output, explanation, error, executionTime: Date.now() };
    }
  }

  /**
   * 处理URL
   * @param {string} url - 原始URL
   */
  processUrl(url) {
    if (url.includes('https://vertexaisearch.cloud.google.com/grounding-api-redirect')) {
      return url.replace(
        'https://vertexaisearch.cloud.google.com/grounding-api-redirect',
        'https://miao.news'
      );
    }
    return url;
  }

  /**
   * 构建转发消息
   * @param {Object} result - 处理结果
   * @param {string} type - 操作类型
   */
  constructForwardMessage(result, type) {
    const forwardMsg = [];
    
    if (type === 'search') {
      const { answer, sources } = result;
      forwardMsg.push(answer);
      if (sources && sources.length > 0) {
        forwardMsg.push('信息来源：');
        sources.forEach((source, index) => {
          forwardMsg.push(`${index + 1}. ${source.title}\n${source.url}`);
        });
      }
    } else {
      const { output, explanation, error } = result;
      if (error) {
        forwardMsg.push(`执行出错：\n${error}`);
      } else {
        forwardMsg.push(`执行结果：\n${output}`);
        if (explanation) {
          forwardMsg.push(`\n代码分析：\n${explanation}`);
        }
      }
    }
    
    return forwardMsg;
  }
}