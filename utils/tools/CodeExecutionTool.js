import { AbstractTool } from './AbstractTool.js';
import fetch from 'node-fetch';
import { Config } from '../config.js';
import common from '../../../../lib/common/common.js';

/**
 * 代码执行工具类 - 使用 Gemini API
 * @class CodeExecutionTool
 * @extends {AbstractTool}
 */
export class CodeExecutionTool extends AbstractTool {
  name = 'CodeExecutionTool';

  parameters = {
    properties: {
      code: {
        type: 'string',
        description: '要执行的代码内容',
      },
      language: {
        type: 'string',
        description: '代码语言(如python, javascript等)',
      },
      description: {
        type: 'string',
        description: '代码功能描述（可选）',
      }
    },
    required: ['code', 'language'],
  };

  description = '使用 Gemini API 执行代码，支持多种编程语言，并返回执行结果和相关解释。';

  // 配置常量
  static TIMEOUT = 30000; // 请求超时时间：30秒

  /**
   * 工具执行函数
   * @param {Object} opt - 工具参数
   * @param {string} opt.code - 代码内容
   * @param {string} opt.language - 编程语言
   * @param {string} [opt.description] - 代码功能描述
   * @param {Object} e - 事件对象
   * @returns {Promise<Object>} - 包含执行结果的对象
   */
  func = async function (opt, e) {
    const { code, language, description } = opt;

    if (!code?.trim()) {
      throw new Error('代码内容不能为空');
    }

    try {
      const result = await this.executeCode(code, language, description);
      console.debug(`[CodeExecutionTool] 执行结果:`, result);
      
      // 构建转发消息
      const { output, explanation, error } = result;
      const forwardMsg = [];
      
      if (error) {
        forwardMsg.push(`执行出错：\n${error}`);
      } else {
        forwardMsg.push(`执行结果：\n${output}`);
        if (explanation) {
          forwardMsg.push(`\n代码分析：\n${explanation}`);
        }
      }
      
      e.reply(await common.makeForwardMsg(e, forwardMsg, `${e.sender.card || e.sender.nickname || e.user_id}的代码执行结果`));
      
      return result;
    } catch (error) {
      console.error('[CodeExecutionTool] 执行失败:', error);
      throw new Error(`代码执行失败: ${error.message}`);
    }
  };

  /**
   * 使用 Gemini API 执行代码
   * @param {string} code - 代码内容
   * @param {string} language - 编程语言
   * @param {string} [description] - 代码功能描述
   * @returns {Promise<Object>} - 包含执行结果的对象
   * @private
   */
  async executeCode(code, language, description) {
    const apiKey = Config.geminiKey;
    const apiBaseUrl = Config.geminiBaseUrl;
    const apiUrl = `${apiBaseUrl}/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

    if (!apiKey || !apiBaseUrl) {
      throw new Error('Gemini API 配置缺失');
    }

    const requestBody = {
      "systemInstruction": {
        "parts": [{
          "text": "你是一个代码执行助手。请执行用户提供的代码并返回结果。同时提供代码分析和改进建议。如果有错误，请提供详细的错误信息和修复方案。"
        }]
      },
      "contents": [{
        "parts": [{
          "text": this.constructPrompt(code, language, description)
        }],
        "role": "user"
      }],
      "tools": [{
        "code_execution": {}
      }],
      "generationConfig": {
        "temperature": 0.7,
        "topK": 1,
        "topP": 1,
        "maxOutputTokens": 2048,
      }
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CodeExecutionTool.TIMEOUT);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`API 请求失败: ${data.error?.message || '未知错误'}`);
      }

      return this.processGeminiResponse(data);
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('请求超时');
      }
      throw error;
    }
  }

  /**
   * 构建提示词
   * @param {string} code - 代码内容
   * @param {string} language - 编程语言
   * @param {string} [description] - 代码功能描述
   * @returns {string} - 格式化的提示词
   * @private
   */
  constructPrompt(code, language, description) {
    let prompt = `请执行以下${language}代码`;
    if (description) {
      prompt += `（功能：${description}）`;
    }
    prompt += `并提供执行结果和分析：\n\`\`\`${language}\n${code}\n\`\`\`\n`;
    prompt += '请提供：\n1. 代码执行结果\n2. 代码分析和可能的改进建议';
    return prompt;
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

    const response = data.candidates[0].content.parts
      .map(part => part.text)
      .filter(Boolean)
      .join('\n');

    // 解析执行结果和解释
    let output = '';
    let explanation = '';
    let error = null;

    try {
      const parts = response.split(/(?=执行结果：|代码分析：|错误：)/);
      parts.forEach(part => {
        const trimmedPart = part.trim();
        if (trimmedPart.startsWith('执行结果：')) {
          output = trimmedPart.replace('执行结果：', '').trim();
        } else if (trimmedPart.startsWith('代码分析：')) {
          explanation = trimmedPart.replace('代码分析：', '').trim();
        } else if (trimmedPart.startsWith('错误：')) {
          error = trimmedPart;
        }
      });
    } catch (err) {
      console.error('[CodeExecutionTool] 响应解析失败:', err);
      output = response; // 如果解析失败，返回原始响应
    }

    return {
      output,
      explanation,
      error,
      executionTime: Date.now()
    };
  }
}