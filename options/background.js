import { fetchBlacklist, updateBlacklistIfNeeded } from '../shared.js';

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'saveBlacklist') {
        return chrome.storage.local.set({ 'blacklist': message.content });
    } else if (message.action === 'saveWhitelist') {
        return chrome.storage.local.set({ 'whitelist': message.content });
    } else if (message.action === 'saveCustomList') {
        return chrome.storage.local.set({ 'customlist': message.content });
    } else if (message.action === 'fetchBlacklist') {
        updateBlacklistIfNeeded();
    }
});

chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
        // Pull the list on the first run
        const blacklist = await fetchBlacklist();
        // Set a lastUpdated value so we can fetch updates silently
        chrome.storage.local.set({ 'blacklist': blacklist });
        chrome.storage.local.set({ 'lastUpdated': Date.now() });
        // Open the options page in a new tab
        chrome.tabs.create({
            url: chrome.runtime.getURL('options/index.html')
        });
    }
});
