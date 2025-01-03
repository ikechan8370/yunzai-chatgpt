import { AbstractTool } from './AbstractTool.js';
import fetch from 'node-fetch';
import { Config } from '../config.js';
import common from '../../../../lib/common/common.js';

/**
 * CodeExecutionTool - Gemini API代码执行工具类
 * 支持多种编程语言的代码执行，提供代码生成、执行结果和分析
 * @extends {AbstractTool}
 */
export class CodeExecutionTool extends AbstractTool {
  // 工具标识名称
  name = 'CodeExecutionTool';

  // 工具参数定义
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

  // 工具功能描述
  description = '使用 Gemini API 执行代码，支持多种编程语言，提供代码生成、执行结果和分析。';

  // API请求超时设置（30秒）
  static TIMEOUT = 30000;

  /**
   * 工具主执行函数
   * @param {Object} opt - 执行参数对象
   * @param {string} opt.code - 需要执行的代码
   * @param {string} opt.language - 代码语言
   * @param {string} [opt.description] - 代码功能描述
   * @param {Object} e - 事件对象
   * @returns {Promise<Object>} 执行结果对象
   */
  func = async function (opt, e) {
    const { code, language, description } = opt;

    // 代码内容验证
    if (!code?.trim()) {
      throw new Error('代码内容不能为空');
    }

    try {
      // 执行代码并获取结果
      const result = await this.executeCode(code, language, description);
      console.debug(`[CodeExecutionTool] 执行结果:`, result);
      
      // 解构结果对象
      const { output, executionOutput, programCode, explanation, error } = result;
      const forwardMsg = [];
      
      // 根据执行结果构建消息
      if (error) {
        forwardMsg.push(`执行出错：\n${error}`);
      } else {
        // 添加生成的程序代码（如果有）
        if (programCode) {
          forwardMsg.push(`生成的程序代码：\n${programCode}`);
        }
        // 添加程序输出（如果有）
        if (executionOutput) {
          forwardMsg.push(`程序输出：\n${executionOutput}`);
        }
        forwardMsg.push(`执行结果：\n${output}`);
        if (explanation) {
          forwardMsg.push(`\n代码分析：\n${explanation}`);
        }
      }
      
      // 发送转发消息
      e.reply(await common.makeForwardMsg(e, forwardMsg, `${e.sender.card || e.sender.nickname || e.user_id}的代码执行结果`));
      
      return result;
    } catch (error) {
      console.error('[CodeExecutionTool] 执行失败:', error);
      throw new Error(`代码执行失败: ${error.message}`);
    }
  };

  /**
   * 通过Gemini API执行代码
   * @param {string} code - 代码内容
   * @param {string} language - 编程语言
   * @param {string} [description] - 代码描述
   * @returns {Promise<Object>} API执行结果
   * @private
   */
  async executeCode(code, language, description) {
    // 获取API配置信息
    const apiKey = Config.geminiKey;
    const apiBaseUrl = Config.geminiBaseUrl;
    const apiUrl = `${apiBaseUrl}/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

    // API配置验证
    if (!apiKey || !apiBaseUrl) {
      throw new Error('Gemini API 配置缺失');
    }

    // 构建API请求体
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
      // 设置请求超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CodeExecutionTool.TIMEOUT);

      // 发送API请求
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

      // 响应状态检查
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
   * 构建API提示词
   * @param {string} code - 代码内容
   * @param {string} language - 编程语言
   * @param {string} [description] - 代码描述
   * @returns {string} 格式化的提示词
   * @private
   */
  constructPrompt(code, language, description) {
    let prompt = `请执行以下${language}代码`;
    if (description) {
      prompt += `（功能：${description}）`;
    }
    prompt += `\n执行代码：\n\`\`\`${language}\n${code}\n\`\`\`\n`;
    prompt += '请按照以下格式返回结果：\n';
    prompt += '生成的程序代码：\n```\n<生成或修改后的程序代码>\n```\n';
    prompt += '执行输出：\n```\n<程序实际输出内容>\n```\n';
    prompt += '执行结果(OUTCOME_OK)：\n```\n<执行状态和结果说明>\n```\n';
    prompt += '如果执行出错，请使用：\n';
    prompt += '执行结果(OUTCOME_ERROR)：\n```\n<错误信息>\n```\n';
    prompt += '代码分析：\n<分析和建议>';
    return prompt;
  }

  /**
   * 处理Gemini API响应数据
   * @param {Object} data - API响应数据
   * @returns {Object} 处理后的结果对象
   * @private
   */
  processGeminiResponse(data) {
    // 响应数据结构验证
    if (!data?.candidates?.[0]?.content?.parts) {
      throw new Error('无效的 API 响应');
    }

    // 合并响应文本
    const response = data.candidates[0].content.parts
      .map(part => part.text)
      .filter(Boolean)
      .join('\n');

    let output = '';
    let explanation = '';
    let error = null;
    let executionOutput = '';
    let programCode = '';

    try {
      // 提取程序代码
      const codeMatch = response.match(/生成的程序代码：\s*```(?:\w*\n)?([\s\S]*?)```/);
      if (codeMatch) {
        programCode = codeMatch[1].trim();
      }

      // 提取执行输出
      const outputMatch = response.match(/执行输出：\s*```(?:\w*\n)?([\s\S]*?)```/);
      if (outputMatch) {
        executionOutput = outputMatch[1].trim();
      }

      // 提取执行结果
      const outcomeMatch = response.match(/执行结果\(OUTCOME_OK\)：\s*```(?:\w*\n)?([\s\S]*?)```/);
      if (outcomeMatch) {
        output = outcomeMatch[1].trim();
      } else {
        // 提取错误信息
        const errorMatch = response.match(/执行结果\(OUTCOME_ERROR\)：\s*```(?:\w*\n)?([\s\S]*?)```/);
        if (errorMatch) {
          error = errorMatch[1].trim();
        } else {
          output = response;
        }
      }

      // 提取代码分析
      const analysisMatch = response.match(/代码分析：([\s\S]*?)(?=\n\n|$)/);
      if (analysisMatch) {
        explanation = analysisMatch[1].trim();
      }
    } catch (err) {
      console.error('[CodeExecutionTool] 响应解析失败:', err);
      output = response;
    }

    // 返回处理结果
    return {
      output,           // 执行结果说明
      executionOutput,  // 程序实际输出
      programCode,      // 生成的程序代码
      explanation,      // 代码分析
      error            // 错误信息
    };
  }
}