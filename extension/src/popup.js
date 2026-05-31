// DOM Elements
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const closeSettingsBtn = document.getElementById('close-settings');
const saveSettingsBtn = document.getElementById('save-settings');
const apiKeyInput = document.getElementById('api-key');
const apiEndpointInput = document.getElementById('api-endpoint');
const teamIdInput = document.getElementById('team-id');
const taskTypeSelect = document.getElementById('task-type');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messagesDiv = document.getElementById('messages');
const statusDiv = document.getElementById('status');

// Configuration
let config = {
    apiKey: '',
    apiEndpoint: 'http://localhost:5051',
    teamId: 'default',
};

// Load configuration from storage
chrome.storage.local.get(['config'], (result) => {
    if (result.config) {
        config = result.config;
        apiKeyInput.value = config.apiKey;
        apiEndpointInput.value = config.apiEndpoint;
        teamIdInput.value = config.teamId;
    }
});

// Settings Panel
settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.remove('hidden');
});

closeSettingsBtn.addEventListener('click', () => {
    settingsPanel.classList.add('hidden');
});

saveSettingsBtn.addEventListener('click', () => {
    config = {
        apiKey: apiKeyInput.value,
        apiEndpoint: apiEndpointInput.value,
        teamId: teamIdInput.value,
    };
    chrome.storage.local.set({ config }, () => {
        showStatus('Settings saved!', 'success');
        settingsPanel.classList.add('hidden');
    });
});

// Chat Functions
function addMessage(content, role) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${role}`;
    messageEl.textContent = content;
    messagesDiv.appendChild(messageEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function showStatus(message, type = 'info') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    if (type !== 'loading') {
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = 'status';
        }, 3000);
    }
}

async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    if (!config.apiKey) {
        showStatus('Please configure your API key in settings', 'error');
        return;
    }

    // Add user message to UI
    addMessage(message, 'user');
    messageInput.value = '';
    sendBtn.disabled = true;
    showStatus('Sending...', 'loading');

    try {
        const response = await fetch(`${config.apiEndpoint}/api/trpc/chat.complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': config.apiKey,
            },
            body: JSON.stringify({
                messages: [{ role: 'user', content: message }],
                taskType: taskTypeSelect.value,
                maxTokens: 1024,
                temperature: 0.7,
                teamId: config.teamId,
            }),
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Invalid API key');
            } else if (response.status === 402) {
                throw new Error('Monthly budget exceeded');
            } else if (response.status === 422) {
                throw new Error('Invalid request format');
            } else {
                throw new Error(`API error: ${response.status}`);
            }
        }

        const data = await response.json();
        const assistantMessage = data.result?.data?.choices?.[0]?.message?.content || 'No response';
        const provider = data.result?.data?.provider || 'unknown';

        addMessage(`[${provider}] ${assistantMessage}`, 'assistant');
        showStatus('Message received', 'success');
    } catch (error) {
        addMessage(`Error: ${error.message}`, 'error');
        showStatus(`Error: ${error.message}`, 'error');
    } finally {
        sendBtn.disabled = false;
    }
}

// Event Listeners
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
        sendMessage();
    }
});

// Initial message
addMessage('Welcome to Forge Studio! Configure your API key in settings to get started.', 'assistant');
