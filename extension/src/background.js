/**
 * Background Service Worker for Forge Studio Extension
 * Handles message passing and API communication
 */

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'sendChat') {
        handleChatRequest(request.data)
            .then((response) => sendResponse({ success: true, data: response }))
            .catch((error) => sendResponse({ success: false, error: error.message }));
        return true; // Keep the message channel open for async response
    }
});

/**
 * Handle chat completion request
 */
async function handleChatRequest(data) {
    const { apiKey, apiEndpoint, teamId, messages, taskType } = data;

    if (!apiKey || !apiEndpoint) {
        throw new Error('API key and endpoint are required');
    }

    const response = await fetch(`${apiEndpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
        },
        body: JSON.stringify({
            messages,
            task_type: taskType,
            max_tokens: 1024,
            temperature: 0.7,
            team_id: teamId,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    return await response.json();
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Open welcome page on first install
        chrome.tabs.create({
            url: 'chrome://extensions/?id=' + chrome.runtime.id,
        });
    }
});

// Set badge
chrome.runtime.onInstalled.addListener(() => {
    chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
});
