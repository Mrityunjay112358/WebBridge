// Background service worker for WebBridge
chrome.runtime.onInstalled.addListener(async () => {
  // Check if user has completed onboarding
  const result = await chrome.storage.sync.get(['accessibilityProfile']);
  if (!result.accessibilityProfile) {
    // Open onboarding popup
    chrome.action.openPopup();
  }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateProfile') {
    chrome.storage.sync.set({ accessibilityProfile: request.profile });
  } else if (request.action === 'toggleFeature') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'toggleFeature',
        feature: request.feature,
        enabled: request.enabled
      });
    });
  }
});

// Inject content script on tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
  }
});