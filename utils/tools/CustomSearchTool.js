import { AbstractTool } from './AbstractTool.js'
import fetch from 'node-fetch'
import { Config } from '../config.js'
import { UrlExtractionTool } from './UrlExtractionTool.js' // 1. 引入 UrlExtractionTool

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
      // 尝试使用OpenAI API进行搜索或摘要
      let result = await searchOrSummarize(query, length);

      // 2. 修改 func 方法: 判断是否为 URL 且 searchOrSummarize 结果不理想
      const isUrl = /^(https?:\/\/)/i.test(query);
      if (isUrl && (!result || result.includes("failed") || result.trim() === '')) { // 假设不理想的结果包括空字符串或包含"failed"
        console.log(`[CustomSearchTool] searchOrSummarize failed or returned empty for URL, trying UrlExtractionTool...`);

        // 创建 UrlExtractionTool 实例
        const urlTool = new UrlExtractionTool();

        // 调用 UrlExtractionTool 的 func 方法提取 URL 内容
        const extractionResult = await urlTool.func({ message: query, appendContent: false });

        // 3. 整合提取的内容: 如果提取成功，则将提取的内容作为 searchOrSummarize 的输入
        if (extractionResult && extractionResult.extractedContent) {
          console.log(`[CustomSearchTool] Successfully extracted content using UrlExtractionTool, summarizing...`);
          result = await searchOrSummarize(extractionResult.extractedContent, length);
        } else {
          // 如果 UrlExtractionTool 也失败了，则返回错误信息
          return `Failed to extract content from URL and summarize. ${extractionResult.message}`;
        }
      }

      console.log(`Search or summarization result: ${result}`);

      // 返回搜索结果或摘要给AI
      return result;
    } catch (error) {
      // 4. 优化错误处理: 捕获 UrlExtractionTool 可能抛出的错误
      console.error('Search or summarization failed:', error);
      return `Search or summarization failed, please check the logs. ${error.message}`;
    }
  };

  // 工具描述
  description = 'Use OpenAI API for custom search or summarize URL content, providing comprehensive search results or summaries. If a URL is provided and summarization fails, it will attempt to extract the content first and then summarize.';
}

/**
 * 使用OpenAI API进行搜索或摘要
 * @param {string} query - 搜索关键词或URL提取的内容
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
          content: `You are a search and summarization assistant. Please use English to search based on the following keywords or summarize the provided text, and return a summary of ${length} sentences.`,
        },
        {
          role: 'user',
          content: `Search or summarize: ${query}`,
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