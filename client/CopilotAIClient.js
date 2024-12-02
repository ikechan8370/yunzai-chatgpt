import WebSocket from 'ws';

export class BingAIClient {
  constructor(baseUrl = 'wss://copilot.microsoft.com/c/api/chat') {
    this.baseUrl = baseUrl;
    this.ws = null;
    this.conversationId = null;
    this.currentMessageId = null;
    this.partialMessages = new Map();
  }

  async sendMessage(text, options = {}) {
    // If conversationId is provided, use it, otherwise create a new one
    if (options.conversationId) {
      this.conversationId = options.conversationId;
    } else {
      this.conversationId = this._generateConversationId();
    }

    // Connect WebSocket
    await this.connectWebSocket();

    // Send the initial message or challenge response
    await this.sendInitialMessage();

    // Send the text message
    const messagePayload = {
      event: 'send',
      conversationId: this.conversationId,
      content: [{ type: 'text', text }],
      mode: 'chat',
      context: { edge: 'NonContextual' },
    };

    this.ws.send(JSON.stringify(messagePayload));

    // Wait for the response and collect the full message
    const responseText = await this.collectResponse();
    return responseText;
  }

  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.baseUrl);

      this.ws.on('open', () => {
        console.log('WebSocket connection established.');
        resolve();
      });

      this.ws.on('message', (data) => this.handleServerMessage(data));

      this.ws.on('close', () => {
        console.log('WebSocket connection closed.');
      });

      this.ws.on('error', (err) => {
        reject(err);
      });
    });
  }

  async sendInitialMessage() {
    return new Promise((resolve, reject) => {
      this.ws.once('message', (data) => {
        const message = JSON.parse(data);
        if (message.event === 'challenge') {
          // Handle challenge by sending the challenge response
          this.handleChallenge(message)
            .then(resolve)
            .catch(reject);
        } else {
          resolve(); // Proceed if no challenge event
        }
      });
    });
  }

  async handleChallenge(challenge) {
    // Get the token by calling getTurnstile function (you need to define this function)
    const token = await this.getTurnstile(challenge.conversationId);

    const challengeResponse = {
      event: 'challengeResponse',
      token: token,
      method: 'cloudflare',
    };

    this.ws.send(JSON.stringify(challengeResponse));
  }

  async collectResponse() {
    return new Promise((resolve, reject) => {
      let fullResponse = '';

      const checkMessageComplete = (messageId) => {
        // Wait for the complete message
        if (this.partialMessages.has(messageId) && this.partialMessages.get(messageId).done) {
          const completeMessage = this.partialMessages.get(messageId).text;
          resolve(completeMessage);
        }
      };

      this.ws.on('message', (data) => {
        const message = JSON.parse(data);

        switch (message.event) {
          case 'received':
            break;

          case 'startMessage':
            this.currentMessageId = message.messageId;
            break;

          case 'appendText':
            if (!this.partialMessages.has(message.messageId)) {
              this.partialMessages.set(message.messageId, { text: '', done: false });
            }

            this.partialMessages.get(message.messageId).text += message.text;

            // Check if this part is the last one
            if (message.partId === '0') {
              this.partialMessages.get(message.messageId).done = true;
            }

            checkMessageComplete(message.messageId);
            break;

          case 'partCompleted':
            break;

          case 'done':
            checkMessageComplete(message.messageId);
            break;

          default:
            console.warn('Unexpected event:', message.event);
            break;
        }
      });
    });
  }

  async getTurnstile(conversationId) {
    // This is a mock implementation, you should replace this with the actual logic
    // to interact with the turnstile system to get the token.
    // In a real-world scenario, this would involve making a request to some endpoint.
    return '0.EHn0JUxxxx';
  }

  _generateConversationId() {
    return 'conversation-' + Math.random().toString(36).substring(2, 15);
  }
}

