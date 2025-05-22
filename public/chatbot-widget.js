/**
 * Chatbot Widget for Website Integration
 * This script creates a floating chatbot button and dialog for websites
 */

(function() {
  // Main widget object
  window.ChatbotWidget = {
    config: {
      id: '',
      name: 'Chatbot',
      color: '#3b82f6',
      position: 'bottom-right',
      apiUrl: window.location.origin
    },

    // Initialize the widget
    init: function(options) {
      // Merge options with defaults
      this.config = { ...this.config, ...options };
      
      // Create widget elements
      this.createWidgetElements();
      
      // Add event listeners
      this.addEventListeners();
      
      console.log(`Chatbot Widget initialized: ${this.config.name} (ID: ${this.config.id})`);
    },

    // Create the widget button and dialog
    createWidgetElements: function() {
      const { color, name, position } = this.config;
      
      // Create button
      const button = document.createElement('div');
      button.className = 'chatbot-widget-button';
      button.id = 'chatbot-widget-button';
      button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      `;
      
      // Create dialog
      const dialog = document.createElement('div');
      dialog.className = 'chatbot-widget-dialog';
      dialog.id = 'chatbot-widget-dialog';
      dialog.style.display = 'none';
      
      // Set position
      if (position === 'bottom-right') {
        dialog.style.bottom = '90px';
        dialog.style.right = '20px';
      } else if (position === 'bottom-left') {
        dialog.style.bottom = '90px';
        dialog.style.left = '20px';
      }
      
      // Create dialog header
      const header = document.createElement('div');
      header.className = 'chatbot-widget-header';
      header.style.backgroundColor = color;
      header.innerHTML = `
        <div class="chatbot-widget-title">${name}</div>
        <div class="chatbot-widget-close" id="chatbot-widget-close">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
      `;
      
      // Create dialog content
      const content = document.createElement('div');
      content.className = 'chatbot-widget-content';
      content.id = 'chatbot-widget-content';
      
      // Create messages container
      const messages = document.createElement('div');
      messages.className = 'chatbot-widget-messages';
      messages.id = 'chatbot-widget-messages';
      
      // Add welcome message
      messages.innerHTML = `
        <div class="chatbot-widget-message chatbot-widget-message-bot">
          <div class="chatbot-widget-message-content">
            👋 Hi there! I'm ${name}. How can I help you today?
          </div>
        </div>
      `;
      
      // Create input area
      const inputArea = document.createElement('div');
      inputArea.className = 'chatbot-widget-input-area';
      inputArea.innerHTML = `
        <input type="text" id="chatbot-widget-input" placeholder="Type your message..." />
        <button id="chatbot-widget-send" style="background-color: ${color};">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      `;
      
      // Assemble the dialog
      content.appendChild(messages);
      content.appendChild(inputArea);
      dialog.appendChild(header);
      dialog.appendChild(content);
      
      // Add styles
      this.addStyles();
      
      // Add elements to the DOM
      document.body.appendChild(button);
      document.body.appendChild(dialog);
    },

    // Add event listeners
    addEventListeners: function() {
      // Toggle dialog when button is clicked
      document.getElementById('chatbot-widget-button').addEventListener('click', () => {
        const dialog = document.getElementById('chatbot-widget-dialog');
        dialog.style.display = dialog.style.display === 'none' ? 'flex' : 'none';
        
        if (dialog.style.display === 'flex') {
          document.getElementById('chatbot-widget-input').focus();
        }
      });
      
      // Close dialog when close button is clicked
      document.getElementById('chatbot-widget-close').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('chatbot-widget-dialog').style.display = 'none';
      });
      
      // Send message when send button is clicked
      document.getElementById('chatbot-widget-send').addEventListener('click', () => {
        this.sendMessage();
      });
      
      // Send message when Enter key is pressed
      document.getElementById('chatbot-widget-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.sendMessage();
        }
      });
    },

    // Send message to the chatbot
    sendMessage: function() {
      const input = document.getElementById('chatbot-widget-input');
      const message = input.value.trim();
      
      if (!message) return;
      
      // Clear input
      input.value = '';
      
      // Add user message to the chat
      this.addMessage(message, 'user');
      
      // Show typing indicator
      this.showTypingIndicator();
      
      // Send message to the API
      this.callChatbotAPI(message);
    },

    // Add a message to the chat
    addMessage: function(message, sender) {
      const messages = document.getElementById('chatbot-widget-messages');
      const messageElement = document.createElement('div');
      messageElement.className = `chatbot-widget-message chatbot-widget-message-${sender}`;
      messageElement.innerHTML = `
        <div class="chatbot-widget-message-content">
          ${message}
        </div>
      `;
      
      messages.appendChild(messageElement);
      messages.scrollTop = messages.scrollHeight;
    },

    // Show typing indicator
    showTypingIndicator: function() {
      const messages = document.getElementById('chatbot-widget-messages');
      const indicator = document.createElement('div');
      indicator.className = 'chatbot-widget-typing-indicator';
      indicator.id = 'chatbot-widget-typing-indicator';
      indicator.innerHTML = `
        <div class="chatbot-widget-message chatbot-widget-message-bot">
          <div class="chatbot-widget-message-content">
            <div class="chatbot-widget-typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      `;
      
      messages.appendChild(indicator);
      messages.scrollTop = messages.scrollHeight;
    },

    // Hide typing indicator
    hideTypingIndicator: function() {
      const indicator = document.getElementById('chatbot-widget-typing-indicator');
      if (indicator) {
        indicator.remove();
      }
    },

    // Call the chatbot API
    callChatbotAPI: function(_message) {
      const { _id, _apiUrl } = this.config;
      
      // Simulate API call with a timeout
      // In a real implementation, you would make an actual API call
      setTimeout(() => {
        this.hideTypingIndicator();
        
        // Simulate response
        const responses = [
          "I'm here to help! What would you like to know?",
          "That's an interesting question. Let me think about that.",
          "I understand what you're asking. Here's what I can tell you...",
          "Thanks for your message! Is there anything specific you're looking for?",
          "I'm processing your request. Is there anything else you'd like to know?"
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        this.addMessage(randomResponse, 'bot');
        
        // In a real implementation, you would use fetch:
        /*
        fetch(`${apiUrl}/api/chat/${id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message }),
        })
        .then(response => response.json())
        .then(data => {
          this.hideTypingIndicator();
          this.addMessage(data.response, 'bot');
        })
        .catch(error => {
          console.error('Error calling chatbot API:', error);
          this.hideTypingIndicator();
          this.addMessage('Sorry, I encountered an error. Please try again later.', 'bot');
        });
        */
      }, 1000);
    },

    // Add styles to the widget
    addStyles: function() {
      const styles = `
        .chatbot-widget-button {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background-color: ${this.config.color};
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          z-index: 1000;
          transition: all 0.3s ease;
        }
        
        .chatbot-widget-button:hover {
          transform: scale(1.05);
        }
        
        .chatbot-widget-dialog {
          position: fixed;
          width: 350px;
          height: 500px;
          background-color: white;
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .chatbot-widget-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          color: white;
        }
        
        .chatbot-widget-title {
          font-weight: bold;
        }
        
        .chatbot-widget-close {
          cursor: pointer;
          opacity: 0.8;
          transition: opacity 0.2s;
        }
        
        .chatbot-widget-close:hover {
          opacity: 1;
        }
        
        .chatbot-widget-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .chatbot-widget-messages {
          flex: 1;
          padding: 15px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .chatbot-widget-message {
          display: flex;
          margin-bottom: 10px;
        }
        
        .chatbot-widget-message-bot {
          justify-content: flex-start;
        }
        
        .chatbot-widget-message-user {
          justify-content: flex-end;
        }
        
        .chatbot-widget-message-content {
          padding: 10px 15px;
          border-radius: 18px;
          max-width: 80%;
          word-wrap: break-word;
        }
        
        .chatbot-widget-message-bot .chatbot-widget-message-content {
          background-color: #f0f0f0;
          color: #333;
        }
        
        .chatbot-widget-message-user .chatbot-widget-message-content {
          background-color: ${this.config.color};
          color: white;
        }
        
        .chatbot-widget-input-area {
          display: flex;
          padding: 15px;
          border-top: 1px solid #eee;
        }
        
        #chatbot-widget-input {
          flex: 1;
          padding: 10px 15px;
          border: 1px solid #ddd;
          border-radius: 20px;
          outline: none;
          font-size: 14px;
        }
        
        #chatbot-widget-send {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          margin-left: 10px;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        
        .chatbot-widget-typing-dots {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }
        
        .chatbot-widget-typing-dots span {
          width: 8px;
          height: 8px;
          background-color: #aaa;
          border-radius: 50%;
          display: inline-block;
          animation: chatbot-widget-typing 1.4s infinite ease-in-out both;
        }
        
        .chatbot-widget-typing-dots span:nth-child(1) {
          animation-delay: -0.32s;
        }
        
        .chatbot-widget-typing-dots span:nth-child(2) {
          animation-delay: -0.16s;
        }
        
        @keyframes chatbot-widget-typing {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `;
      
      const styleElement = document.createElement('style');
      styleElement.innerHTML = styles;
      document.head.appendChild(styleElement);
    }
  };
})();
