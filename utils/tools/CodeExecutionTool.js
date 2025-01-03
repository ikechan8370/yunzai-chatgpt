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
      
      // 优化消息构建逻辑
      const messages = [];
      
      // 添加代码信息
      messages.push(`执行代码：\n\`\`\`${language}\n${code}\n\`\`\``);
      
      // 添加执行结果
      if (result.error) {
        messages.push(`执行错误：\n\`\`\`\n${result.error}\n\`\`\``);
      } else {
        messages.push(`执行结果：\n\`\`\`\n${result.output}\n\`\`\``);
      }
      
      // 添加代码分析
      if (result.explanation) {
        messages.push(`代码分析：\n${result.explanation}`);
      }
      
      // 添加执行时间
      messages.push(`执行时间：${new Date(result.executionTime).toLocaleString()}`);
      
      // 发送转发消息
      e.reply(await common.makeForwardMsg(e, messages, `${e.sender.card || e.sender.nickname || e.user_id}的代码执行结果`));
      
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
    prompt += `\n执行代码：\n\`\`\`${language}\n${code}\n\`\`\`\n`;
    prompt += '请按照以下格式返回结果：\n';
    prompt += '执行结果(OUTCOME_OK)：\n```\n<执行输出>\n```\n';
    prompt += '如果执行出错，请使用：\n';
    prompt += '执行结果(OUTCOME_ERROR)：\n```\n<错误信息>\n```\n';
    prompt += '如果需要，可以在最后添加代码分析。';
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

    let output = '';
    let explanation = '';
    let error = null;

    try {
      // 查找执行结果部分
      const outcomeMatch = response.match(/执行结果\(OUTCOME_OK\)：\s*```(?:\w*\n)?([\s\S]*?)```/);
      if (outcomeMatch) {
        output = outcomeMatch[1].trim();
      } else {
        // 检查是否有错误结果
        const errorMatch = response.match(/执行结果\(OUTCOME_ERROR\)：\s*```(?:\w*\n)?([\s\S]*?)```/);
        if (errorMatch) {
          error = errorMatch[1].trim();
        } else {
          output = response; // 如果没有匹配到预期格式，返回原始响应
        }
      }

      // 提取代码分析部分（如果有）
      const analysisMatch = response.match(/代码分析：([\s\S]*?)(?=\n\n|$)/);
      if (analysisMatch) {
        explanation = analysisMatch[1].trim();
      }
    } catch (err) {
      console.error('[CodeExecutionTool] 响应解析失败:', err);
      output = response; // 解析失败时返回原始响应
    }

    return {
      output,
      explanation,
      error,
      executionTime: Date.now()
    };
  }
}