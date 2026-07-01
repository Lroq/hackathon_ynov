// Application State
let state = {
  isConnected: false,
  models: [],
  selectedModel: '',
  messages: [],
  chats: [],
  currentChatId: null
};

const connectionStatus = document.getElementById('connection-status');
const statusText = connectionStatus.querySelector('.status-text');
const modelSelect = document.getElementById('model-select');
const activeModelDisplay = document.getElementById('active-model-display');
const chatHistory = document.getElementById('chat-history');
const welcomeScreen = document.getElementById('welcome-screen');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-btn');
const mobileClearBtn = document.getElementById('mobile-clear-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const savedChatsList = document.getElementById('saved-chats-list');

if (typeof marked !== 'undefined') {
  marked.setOptions({
    gfm: true,
    breaks: true,
    headerIds: false,
    mangle: false
  });
}

// MARK: Initial Load & Setup
document.addEventListener('DOMContentLoaded', () => {
  // Load saved chats from localStorage
  const savedChats = localStorage.getItem('ollama_saved_chats');
  if (savedChats) {
    try {
      state.chats = JSON.parse(savedChats);
    } catch (e) {
      console.error('Error parsing saved chats', e);
      state.chats = [];
    }
  }

  // Load saved model selection preference
  state.selectedModel = localStorage.getItem('ollama_selected_model') || '';

  // Load last active chat session
  const lastActiveId = localStorage.getItem('ollama_active_chat_id');
  if (lastActiveId && state.chats.some(c => c.id === lastActiveId)) {
    loadChat(lastActiveId);
  } else if (state.chats.length > 0) {
    loadChat(state.chats[0].id);
  } else {
    startNewChat();
  }

  // Setup Event Listeners
  chatForm.addEventListener('submit', handleFormSubmit);
  messageInput.addEventListener('keydown', handleKeyDown);
  messageInput.addEventListener('input', autoResizeTextarea);
  clearBtn.addEventListener('click', clearChatHistory);
  mobileClearBtn.addEventListener('click', clearChatHistory);
  modelSelect.addEventListener('change', handleModelChange);
  newChatBtn.addEventListener('click', startNewChat);

  // Start periodic status checking
  checkServerStatus();
  setInterval(checkServerStatus, 5000);
});

// MARK: Network status and models check
async function checkServerStatus() {
  try {
    const response = await fetch('/api/status');
    if (!response.ok) throw new Error('Proxy server error');
    
    const data = await response.json();
    
    if (data.connected) {
      updateConnectionStatus(true);
      updateModelsList(data.models);
    } else {
      updateConnectionStatus(false);
    }
  } catch (error) {
    console.error('Failed to check server status:', error);
    updateConnectionStatus(false);
  }
}

function updateConnectionStatus(connected) {
  state.isConnected = connected;
  
  if (connected) {
    connectionStatus.className = 'status-indicator online';
    statusText.textContent = 'Connecté';
    messageInput.removeAttribute('disabled');
    sendBtn.removeAttribute('disabled');
    modelSelect.removeAttribute('disabled');
  } else {
    connectionStatus.className = 'status-indicator offline';
    statusText.textContent = 'Déconnecté';
    messageInput.setAttribute('disabled', 'true');
    sendBtn.setAttribute('disabled', 'true');
    modelSelect.setAttribute('disabled', 'true');
    
    // Reset dropdown
    modelSelect.innerHTML = '<option value="">Ollama Déconnecté</option>';
    state.models = [];
    state.selectedModel = '';
    activeModelDisplay.textContent = 'Serveur Hors Ligne';
    activeModelDisplay.style.color = 'var(--status-offline)';
  }
}

function updateModelsList(models) {
  state.models = models;
  
  if (models.length === 0) {
    modelSelect.innerHTML = '<option value="">Aucun modèle installé</option>';
    modelSelect.setAttribute('disabled', 'true');
    activeModelDisplay.textContent = 'Aucun modèle trouvé';
    return;
  }

  // Check if current selected model still exists
  let stillExists = models.some(m => m.name === state.selectedModel);
  if (!stillExists) {
    // Default to first model
    state.selectedModel = models[0].name;
    localStorage.setItem('ollama_selected_model', state.selectedModel);
  }

  // Render list
  modelSelect.innerHTML = models.map(m => {
    const sizeGB = (m.size / (1024 * 1024 * 1024)).toFixed(2);
    const selectedAttr = m.name === state.selectedModel ? 'selected' : '';
    return `<option value="${m.name}" ${selectedAttr}>${m.name} (${sizeGB} GB)</option>`;
  }).join('');

  activeModelDisplay.textContent = state.selectedModel;
  activeModelDisplay.style.color = 'var(--text-white)';
}

function handleModelChange(e) {
  state.selectedModel = e.target.value;
  localStorage.setItem('ollama_selected_model', state.selectedModel);
  activeModelDisplay.textContent = state.selectedModel;
}

// MARK: User Input and Textarea actions

function handleKeyDown(e) {
  // If Enter pressed without Shift, submit form
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    chatForm.requestSubmit();
  }
}

// MARK: Form submission & API request
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const text = messageInput.value.trim();
  if (!text || !state.isConnected || !state.selectedModel) return;

  // Initialize new chat session if none is active
  if (state.currentChatId === null) {
    const newId = Date.now().toString();
    state.currentChatId = newId;
    
    // Generate title (first 24 chars of user message)
    const title = text.length > 24 ? text.substring(0, 24) + '...' : text;
    
    const newChat = {
      id: newId,
      title: title,
      messages: [],
      model: state.selectedModel
    };
    state.chats.unshift(newChat);
    localStorage.setItem('ollama_active_chat_id', newId);
  } else {
    // Bubble current chat to the top of list
    const index = state.chats.findIndex(c => c.id === state.currentChatId);
    if (index > -1) {
      const chat = state.chats.splice(index, 1)[0];
      state.chats.unshift(chat);
    }
  }

  // Add user message to active state
  const userMessage = { role: 'user', content: text };
  state.messages.push(userMessage);

  // Sync to active chat object and save
  const activeChat = state.chats.find(c => c.id === state.currentChatId);
  if (activeChat) {
    activeChat.messages = [...state.messages];
    activeChat.model = state.selectedModel;
  }
  saveChats();
  renderChatsList();
  
  // Clear input
  messageInput.value = '';
  messageInput.style.height = 'auto';
  
  // Update UI
  hideWelcomeScreen();
  appendMessageBubble(userMessage);
  scrollToBottom();
  
  // Show Typing Indicator
  const typingIndicator = appendTypingIndicator();
  scrollToBottom();
  
  // Lock interface during generation
  messageInput.setAttribute('disabled', 'true');
  sendBtn.setAttribute('disabled', 'true');

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: state.selectedModel,
        messages: state.messages,
        stream: false
      })
    });

    // Remove typing dots
    removeTypingIndicator(typingIndicator);

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.message && data.message.content) {
      const assistantMessage = { role: 'assistant', content: data.message.content };
      state.messages.push(assistantMessage);
      
      // Sync assistant response to active chat
      const activeChat = state.chats.find(c => c.id === state.currentChatId);
      if (activeChat) {
        activeChat.messages = [...state.messages];
      }
      saveChats();
      renderChatsList();
      
      appendMessageBubble(assistantMessage);
    } else {
      throw new Error('Réponse invalide reçue d\'Ollama.');
    }

  } catch (error) {
    console.error('Error generating chat response:', error);
    removeTypingIndicator(typingIndicator);
    
    // Append system error bubble
    appendErrorBubble(`Erreur : ${error.message || 'Impossible de communiquer avec le modèle.'}`);
  } finally {
    // Re-enable interface if still connected
    if (state.isConnected) {
      messageInput.removeAttribute('disabled');
      sendBtn.removeAttribute('disabled');
      messageInput.focus();
    }
  }
}

function saveChats() {
  localStorage.setItem('ollama_saved_chats', JSON.stringify(state.chats));
}

function loadChat(id) {
  const chat = state.chats.find(c => c.id === id);
  if (!chat) return;

  state.currentChatId = id;
  state.messages = [...chat.messages];
  localStorage.setItem('ollama_active_chat_id', id);

  // Load chat's saved model if possible
  if (chat.model && state.models.some(m => m.name === chat.model)) {
    state.selectedModel = chat.model;
    modelSelect.value = chat.model;
    activeModelDisplay.textContent = chat.model;
  }

  renderAllMessages();
  renderChatsList();
}

function deleteChat(id) {
  if (confirm('Voulez-vous supprimer cette conversation ?')) {
    state.chats = state.chats.filter(c => c.id !== id);
    saveChats();

    if (state.currentChatId === id) {
      state.currentChatId = null;
      state.messages = [];
      localStorage.removeItem('ollama_active_chat_id');
      renderAllMessages();
    }
    
    renderChatsList();
  }
}

function clearChatHistory() {
  if (state.messages.length === 0 && !state.currentChatId) return;
  
  if (confirm('Voulez-vous vraiment effacer TOUTES les conversations de l\'historique ?')) {
    state.chats = [];
    state.messages = [];
    state.currentChatId = null;
    localStorage.removeItem('ollama_active_chat_id');
    saveChats();
    renderAllMessages();
    renderChatsList();
  }
}

function startNewChat() {
  state.currentChatId = null;
  state.messages = [];
  localStorage.removeItem('ollama_active_chat_id');
  renderAllMessages();
  renderChatsList();
  messageInput.focus();
}

