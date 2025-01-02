import { AbstractTool } from './AbstractTool.js';
import fetch from 'node-fetch';
import { Config } from '../config.js';

/**
 * 邮件发送工具类
 * @class MailSenderTool
 * @extends {AbstractTool}
 */
export class MailSenderTool extends AbstractTool {
  // 工具名称
  name = 'MailSenderTool';

  // 工具参数
  parameters = {
    properties: {
      aiTask: {
        type: 'string',
        description: '描述 AI 需要发送邮件的任务，例如：给用户发送一封问候邮件',
      },
      targetUserQQ: {
        type: 'string',
        description: '目标用户的 QQ 号码，用于拼接成 @qq.com 的邮箱地址',
      },
      to: {
        type: 'string',
        description: '收件人邮箱地址，如果提供了 targetUserQQ，则此参数可省略',
      },
    },
    required: ['aiTask'],
  };

  /**
   * 工具执行函数
   * @param {Object} opt - 工具参数
   * @param {Object} ai - AI对象（这里不再需要，但为了兼容性保留）
   * @returns {Promise<string>} - 邮件发送结果
   */
  func = async function (opt, ai) {
    const { aiTask, targetUserQQ, to } = opt;

    // 检查必填参数
    if (!aiTask) {
      return '缺少必要的参数 aiTask。';
    }

    // 从 Config 中读取配置信息
    const smtpAuthCode = Config.smtpAuthCode;
    const apiKey = Config.apiKey;
    const apiBaseUrl = Config.openAiBaseUrl;
    const apiUrl = `${apiBaseUrl}/chat/completions`;
    const model = Config.model;
    const aiQQNumber = '12345'; // 随便写一个，发送到qq邮箱，因为已经不使用这个字段了
    const aiName = '助手'; // 随便写一个，发送到qq邮箱，因为已经不使用这个字段了

    // 检查配置信息
    if (!smtpAuthCode || !apiKey || !apiBaseUrl || !model) {
      return 'Config 配置中缺少必要的参数 smtpAuthCode, apiKey, apiBaseUrl 或 model。';
    }

    // 确定收件人邮箱地址
    const recipientEmail = targetUserQQ ? `${targetUserQQ}@qq.com` : to;
    if (!recipientEmail) {
      return '缺少收件人邮箱地址，请提供 targetUserQQ 或 to 参数。';
    }

    // 使用 OpenAI API 生成邮件标题和内容
    let title, text;
    try {
      const prompt = `你的任务是：根据“${aiTask}”这个主题，以“你”的视角，给邮箱为“${recipientEmail}”的用户写一封邮件。你需要自己决定邮件的标题、正文内容。请返回一个 JSON 对象，包含以下字段：title（邮件标题）、text（邮件正文）。`;

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
              content: '你是一个邮件助手，请按要求生成邮件内容。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 1000,
        }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(`OpenAI API Error: ${data.error.message}`);
      }
      const aiResponse = JSON.parse(data.choices[0].message.content);
      title = aiResponse.title;
      text = aiResponse.text;
    } catch (error) {
      console.error('AI 生成邮件内容失败:', error);
      return `AI 生成邮件内容失败: ${error.message}`;
    }

    // 构建发件人邮箱地址
    const from = `${aiQQNumber}@qq.com`;

    // 构建请求 URL，将 AI 生成的内容传递给 zdy.php
    const mailApiUrl = 'http://wswzh.ccccocccc.cc/api/mail/zdy.php';
    const queryParams = new URLSearchParams({
      api_key: 'free',
      from: from,
      code: smtpAuthCode,
      host: 'smtp.qq.com',
      to: recipientEmail,
      title: title,
      text: text,
      sb: aiName,
    });
    const fullApiUrl = `${mailApiUrl}?${queryParams.toString()}`;

    try {
      // 发送邮件请求
      const response = await fetch(fullApiUrl);

      // 检查响应状态
      if (response.ok) {
        // 解析响应数据
        const data = await response.json();

        // 根据 API 返回的数据判断邮件是否发送成功
        if (data.success) {
          console.log('邮件发送成功:', data.message);
          return '邮件发送成功';
        } else {
          console.error('邮件发送失败:', data.error);
          return `邮件发送失败: ${data.error}`;
        }
      } else {
        console.error('邮件发送请求失败:', response.status, response.statusText);
        return `邮件发送请求失败: ${response.status} ${response.statusText}`;
      }
    } catch (error) {
      console.error('邮件发送出错:', error);
      return `邮件发送出错: ${error.message}`;
    }
  };

  // 工具描述
  description = '用于发送自定义邮件的工具，使用 OpenAI API 生成邮件标题和内容，并通过第三方邮件 API 发送，支持配置目标用户的 QQ 邮箱。';
}