chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'saveBlacklist') {
        console.log('saving bl');
        return chrome.storage.local.set({ 'blacklist': message.content });
    } else if (message.action === 'saveWhitelist') {
        console.log('saving wl');
        return chrome.storage.local.set({ 'whitelist': message.content });
    } else if (message.action === 'saveCustomList') {
        console.log('saving cl');
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
