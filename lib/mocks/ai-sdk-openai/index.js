"use strict";

// Mock implementation of the OpenAI SDK
function createOpenAI() {
  return {
    chat: {
      completions: {
        create: async function(options) {
          return {
            id: `mock-${Date.now()}`,
            choices: [
              {
                message: {
                  content: `This is a mock AI response to the prompt: "${options.messages[options.messages.length - 1].content}"`,
                  role: 'assistant'
                },
                finish_reason: 'stop',
                index: 0
              }
            ],
            created: Date.now(),
            model: options.model || 'gpt-3.5-turbo'
          };
        }
      }
    }
  };
}

module.exports = {
  createOpenAI
};
