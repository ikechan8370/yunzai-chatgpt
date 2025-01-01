import { AbstractTool } from './AbstractTool.js';
import fetch from 'node-fetch';
import { Config } from '../config.js';

export class URLSummarizerTool extends AbstractTool {
  name = 'URLSummarizer';

  parameters = {
    properties: {
      url: {
        type: 'string',
        description: 'The URL to be summarized, cannot be empty.',
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
      // Directly use OpenAI API to summarize the URL
      const summarizedText = await summarizeURL(url, length);
      console.log(`Summarized text: ${summarizedText}`);

      // Return the summarized text to the AI
      return summarizedText;
    } catch (error) {
      console.error('Summarization failed:', error);
      return `Summarization failed, please check the logs. ${error.message}`;
    }
  };

  description = 'Summarizes the content of a URL using OpenAI API, providing a comprehensiveness summary.';
}

// Use OpenAI API to summarize the URL directly
async function summarizeURL(url, length) {
  const apiKey = Config.apiKey;
  const apiBaseUrl = Config.openAiBaseUrl;
  const apiUrl = `${apiBaseUrl}/chat/completions`; // Concatenate /chat/completions to the base URL
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
          content: `You are a summarization assistant. Summarize the content of the following URL in ${length} sentences in Chinese.`,
        },
        {
          role: 'user',
          content: `Summarize this article: ${url}`, // Directly send the URL
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