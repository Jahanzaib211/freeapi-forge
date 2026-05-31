/**
 * Content Script for Forge Studio Extension
 * Runs on web pages to provide context and integration
 */

// Inject a global object for page communication
window.freeAPIForge = {
    version: '1.0.0',
    ready: true,
};

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getPageInfo') {
        sendResponse({
            url: window.location.href,
            title: document.title,
            selectedText: window.getSelection().toString(),
        });
    }
});

// Notify popup that content script is ready
chrome.runtime.sendMessage({
    action: 'contentScriptReady',
    url: window.location.href,
});
