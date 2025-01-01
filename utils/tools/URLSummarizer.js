import { AbstractTool } from './AbstractTool.js';
import fetch from 'node-fetch';
import { Config } from '../config.js';

export class URLSummarizerTool extends AbstractTool {
  name = 'URLSummarizer';

  parameters = {
    properties: {
      url: {
        type: 'string',
        description: 'The URL to be summarized. Cannot be empty.',
      },
      length: {
        type: 'integer',
        description: 'The desired length of the summary in sentences. Defaults to 3.',
      },
    },
    required: ['url'],
  };

  func = async function (opt, ai) {
    let { url, length = 3 } = opt;
    if (!url) {
      return 'URL parameter is required.';
    }

    try {
      // 使用 OpenAI API 进行文本摘要
      const summarizedText = await summarizeURL(url, length);
      console.log(`Summarized text: ${summarizedText}`);

      // 将摘要结果返回给 AI
      return summarizedText;
    } catch (error) {
      console.error('Summarization failed:', error);
      return `Summarization failed, please check the logs. ${error.message}`;
    }
  };

  description = 'Summarizes the content of a URL using OpenAI API, providing a concise summary.';
}

// 使用 OpenAI API 进行 URL 摘要
const summarizeURL = async (url, length) => {
  const apiKey = Config.apiKey;
  const apiUrl = Config.openAiBaseUrl;
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
          content: `You are a helpful assistant that summarizes web pages. Please summarize the content of this URL in ${length} sentences. Provide a concise and clear summary.`,
        },
        { role: 'user', content: `Summarize this URL: ${url}` },
      ],
      max_tokens: 150 * length, // 粗略估计每个句子 150 个 token
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`OpenAI API Error: ${data.error.message}`);
  }
  return data.choices[0].message.content;
};