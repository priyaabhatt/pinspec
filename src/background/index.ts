// Clicking the toolbar icon toggles pinspec on the current tab. activeTab gives
// us scripting and captureVisibleTab for that tab without any host permissions.

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id === undefined) return
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'pinspec:toggle' })
  } catch {
    // No content script yet on this page: inject it. It mounts on load.
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] })
    } catch (err) {
      console.warn('pinspec: cannot run on this page', err)
    }
  }
})

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== 'pinspec:capture') return
  const windowId = sender.tab?.windowId
  if (windowId === undefined) {
    sendResponse({ error: 'No tab' })
    return
  }
  chrome.tabs
    .captureVisibleTab(windowId, { format: 'png' })
    .then((dataUrl) => sendResponse({ dataUrl }))
    .catch((err) => sendResponse({ error: String(err?.message ?? err) }))
  return true
})
