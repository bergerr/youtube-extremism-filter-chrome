chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'saveBlacklist') {
        return chrome.storage.local.set({ 'blacklist': message.content });
    } else if (message.action === 'saveWhitelist') {
        return chrome.storage.local.set({ 'whitelist': message.content });
    } else if (message.action === 'saveCustomList') {
        return chrome.storage.local.set({ 'customList': message.content });
    }
});


chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        chrome.tabs.create({
            url: chrome.runtime.getURL('options/index.html')
        });
    }
});
