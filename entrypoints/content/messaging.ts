function isContextValid(): boolean {
  try {
    return (
      typeof chrome !== 'undefined' &&
      chrome.runtime &&
      chrome.runtime.id !== undefined
    );
  } catch {
    return false;
  }
}

export function setupMessaging(): void {
  if (!isContextValid()) {
    console.log('[Phantom Trail] Skipping messaging setup, context invalid');
    return;
  }

  console.log('[Phantom Trail] Messaging initialized');

  chrome.runtime.onMessage.addListener((_message, _sender, sendResponse) => {
    handleMessage(sendResponse);
    return false;
  });
}

function handleMessage(sendResponse: (response?: unknown) => void): void {
  try {
    if (!isContextValid()) {
      sendResponse({ error: 'Extension context invalid' });
      return;
    }

    sendResponse({
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname,
    });
  } catch (error) {
    console.warn('[Phantom Trail] Message handling error:', error);
    sendResponse({ error: 'Message handling failed' });
  }
}
