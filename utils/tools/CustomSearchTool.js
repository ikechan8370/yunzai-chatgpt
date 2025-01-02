import { AbstractTool } from './AbstractTool.js';
import fetch from 'node-fetch';
import { Config } from '../config.js';
// import { UrlExtractionTool } from './UrlExtractionTool.js'; // 不再需要引入 UrlExtractionTool

/**
 * 自定义搜索工具类
 * @class CustomSearchTool
 * @extends {AbstractTool}
 */
export class CustomSearchTool extends AbstractTool {
  // 工具名称
  name = 'CustomSearchTool';

  // 工具参数
  parameters = {
    properties: {
      query: {
        type: 'string',
        description: 'Search keyword', // 修改描述，不再支持 URL
      },
      length: {
        type: 'integer',
        description: 'The desired length of the summary in sentences. Defaults to 3.',
      },
    },
    required: ['query'],
  };

  /**
   * 工具执行函数
   * @param {Object} opt - 工具参数
   * @param {Object} ai - AI对象（未使用）
   * @returns {Promise<string>} - 搜索结果或摘要
   */
  func = async function (opt, ai) {
    let { query, length = 3 } = opt;
    if (!query) {
      return 'The query parameter is required.';
    }

    try {
      // 直接使用OpenAI API进行搜索或摘要
      const result = await searchOrSummarize(query, length);

      console.log(`Search or summarization result: ${result}`);

      // 返回搜索结果或摘要给AI
      return result;
    } catch (error) {
      console.error('Search or summarization failed:', error);
      return `Search or summarization failed, please check the logs. ${error.message}`;
    }
  };

  // 工具描述
  description = 'Use OpenAI API for custom search, providing comprehensive search results or summaries. This tool does not handle URLs.'; // 修改描述，明确不再处理 URL
}

/**
 * 使用OpenAI API进行搜索或摘要
 * @param {string} query - 搜索关键词
 * @param {number} length - 期望的摘要长度（以句子为单位）
 * @returns {Promise<string>} - 搜索结果或摘要
 */
async function searchOrSummarize(query, length) {
  const apiKey = Config.apiKey;
  const apiBaseUrl = Config.openAiBaseUrl;
  const apiUrl = `${apiBaseUrl}/chat/completions`;
  const model = Config.model;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: `You are a search and summarization assistant. Please use English to search based on the following keywords and return a summary of ${length} sentences.`, // 简化提示词
        },
        {
          role: 'user',
          content: `Search: ${query}`, // 简化提示词
        },
      ],
      max_tokens: 1000 * length,
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`OpenAI API Error: ${data.error.message}`);
  }
  return data.choices[0].message.content;
}