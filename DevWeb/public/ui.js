// MARK: UI & DOM Rendering Helpers

function scrollToBottom() {
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function showWelcomeScreen() {
  welcomeScreen.style.display = 'flex';
}

function hideWelcomeScreen() {
  welcomeScreen.style.display = 'none';
}

function autoResizeTextarea() {
  messageInput.style.height = 'auto';
  messageInput.style.height = (messageInput.scrollHeight) + 'px';
}

function renderAllMessages() {
  const bubbles = chatHistory.querySelectorAll('.message-wrapper, .error-wrapper');
  bubbles.forEach(b => b.remove());

  if (state.messages.length > 0) {
    hideWelcomeScreen();
    state.messages.forEach(msg => appendMessageBubble(msg));
    scrollToBottom();
  } else {
    showWelcomeScreen();
  }
}

function appendMessageBubble(msg) {
  const wrapper = document.createElement('div');
  wrapper.className = `message-wrapper ${msg.role}`;

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.innerHTML = msg.role === 'user' 
    ? '<i class="fa-solid fa-user"></i>' 
    : '<i class="fa-solid fa-robot"></i>';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';

  if (msg.role === 'assistant') {
    bubble.innerHTML = formatMarkdown(msg.content);
  } else {
    bubble.textContent = msg.content;
  }

  if (msg.role === 'assistant') {
    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
  } else {
    wrapper.appendChild(bubble);
  }

  chatHistory.appendChild(wrapper);
  
  if (msg.role === 'assistant' && typeof Prism !== 'undefined') {
    Prism.highlightAllUnder(bubble);
  }
}

function appendTypingIndicator() {
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper assistant typing-wrapper';

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.innerHTML = '<i class="fa-solid fa-robot"></i>';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  
  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.innerHTML = `
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
  `;

  bubble.appendChild(indicator);
  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  chatHistory.appendChild(wrapper);
  
  return wrapper;
}

function removeTypingIndicator(element) {
  if (element && element.parentNode) {
    element.remove();
  }
}

function appendErrorBubble(errorMessage) {
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper assistant error-wrapper';

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.style.backgroundColor = 'var(--status-offline)';
  avatar.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.style.border = '1px solid var(--status-offline)';
  bubble.style.color = '#fca5a5';
  bubble.textContent = errorMessage;

  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  chatHistory.appendChild(wrapper);
}

function renderChatsList() {
  if (!savedChatsList) return;
  
  if (state.chats.length === 0) {
    savedChatsList.innerHTML = '<div class="empty-history-text">Aucune discussion</div>';
    return;
  }

  savedChatsList.innerHTML = state.chats.map(chat => {
    const isActive = chat.id === state.currentChatId ? 'active' : '';
    const title = chat.title || 'Discussion sans titre';
    return `
      <div class="chat-history-item ${isActive}" data-id="${chat.id}">
        <div class="chat-item-link">
          <i class="fa-regular fa-message chat-item-icon"></i>
          <span class="chat-item-title">${title}</span>
        </div>
        <button class="chat-item-delete-btn" title="Supprimer la discussion">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </div>
    `;
  }).join('');

  // Add click listeners to items
  savedChatsList.querySelectorAll('.chat-history-item').forEach(item => {
    const id = item.dataset.id;
    // Load chat on click
    item.querySelector('.chat-item-link').addEventListener('click', (e) => {
      e.stopPropagation();
      loadChat(id);
    });
    // Delete chat on click
    item.querySelector('.chat-item-delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteChat(id);
    });
  });
}
