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
    chrome.storage.sync.set({ accessibilityProfile: request.profile }, () => sendResponse({ success: true }));
    return true;
  } else if (request.action === 'toggleFeature') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs.length) return;
      const tabId = tabs[0].id;
      const tabUrl = tabs[0].url || '';
      // Prevent messaging on chrome:// and edge:// URLs
      if (tabUrl.startsWith('chrome://') || tabUrl.startsWith('edge://')) {
        sendResponse({ success: false, error: 'Restricted URL' });
        return;
      }
      chrome.tabs.sendMessage(tabId, {
        action: 'toggleFeature',
        feature: request.feature,
        enabled: request.enabled
      }, (response) => {
        if (chrome.runtime.lastError) {
          // Only inject if not restricted URL
          if (!tabUrl.startsWith('chrome://') && !tabUrl.startsWith('edge://')) {
            chrome.scripting.executeScript({
              target: { tabId: tabId },
              files: ['content.js']
            }, () => {
              chrome.tabs.sendMessage(tabId, {
                action: 'toggleFeature',
                feature: request.feature,
                enabled: request.enabled
              });
            });
          }
        }
      });
    });
    sendResponse({ success: true });
    return true;
  }
});

// Inject content script on tab updates, skip restricted URLs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === 'complete' &&
    tab.url &&
    !tab.url.startsWith('chrome://') &&
    !tab.url.startsWith('edge://')
  ) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
  }
});