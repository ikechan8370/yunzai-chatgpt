import { AbstractTool } from './AbstractTool.js';
import fetch from 'node-fetch';
import { Config } from '../config.js';

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
        description: 'Search keyword or URL',
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
      // 使用OpenAI API进行搜索或摘要
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
  description = 'Use OpenAI API for custom search or summarize URL content, providing comprehensive search results or summaries.';
}

/**
 * 使用OpenAI API进行搜索或摘要
 * @param {string} query - 搜索关键词或URL
 * @param {number} length - 期望的摘要长度（以句子为单位）
 * @returns {Promise<string>} - 搜索结果或摘要
 */
async function searchOrSummarize(query, length) {
  const apiKey = Config.apiKey;
  const apiBaseUrl = Config.openAiBaseUrl;
  const apiUrl = `${apiBaseUrl}/chat/completions`; // 将/chat/completions连接到基本URL
  const model = Config.model;

  // 判断是URL还是关键词
  const isUrl = /^(https?:\/\/)/i.test(query);

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
          content: `You are a search and summarization assistant. ${isUrl ? `Please summarize the content of the following URL in English, with a length of ${length} sentences.` : `Please use English to search based on the following keywords and return a summary of ${length} sentences.`}`,
        },
        {
          role: 'user',
          content: `${isUrl ? `Summarize this article: ${query}` : `Search: ${query}`}`, // 根据是URL还是关键词发送不同的内容
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