const BLOCKLIST_URL = "https://raw.githubusercontent.com/bergerr/youtube-extremism-filter-blacklist/refs/heads/main/blacklist.txt";
const UPDATE_INTERVAL = 14 * 24 * 60 * 60 * 1000; // 14 days in ms

// Load the full blocklist from storage into a single array
export async function loadBlacklistFromStorage(include_whitelist=false){
    const storedBlacklist = await chrome.storage.local.get('blacklist');
    const storedCustomList = await chrome.storage.local.get('customlist');
    blacklist = storedBlacklist.blacklist ? storedBlacklist.blacklist
        .split('\n')
        .map(line => line.trim().toLowerCase().replace(/\s+/g, ''))
        .filter(Boolean)
        : [];
    customList = storedCustomList.customList ? storedCustomList.customList
        .split('\n')
        .map(line => line.trim().toLowerCase().replace(/\s+/g, ''))
        .filter(Boolean)
        : [];
    
    // Optionally append the whitelist
    if (include_whitelist) {
        const storedWhiteList = await chrome.storage.local.get('whitelist');
        whiteList = storedWhiteList.whiteList ? storedWhiteList.whiteList
        .split('\n')
        .map(line => line.trim().toLowerCase().replace(/\s+/g, ''))
        .filter(Boolean)
        : [];
        return [...blacklist, ...customList, ...whiteList];
    }
    else {
        return [...blacklist, ...customList];
    }
}

// Pull the blacklist from github if it's been 14 days
export async function updateBlacklistIfNeeded(force=false) {
    const now = Date.now();

    // Get saved blocklist and timestamp
    const lastUpdated = await chrome.storage.local.get("lastUpdated");

    // Check if update needed
    if (force || !lastUpdated || (now - lastUpdated) > UPDATE_INTERVAL) {
        try {
            const response = await fetch(BLOCKLIST_URL);
            if (!response.ok) {
                // Do nothing if the file is unavailable
                return
            }
            
            const text = await response.text();
            const lines = text.trim().split('\n').filter(Boolean);

            const storedBlacklist = await chrome.storage.local.get('blacklist');
            const fullList = loadBlacklistFromStorage(true);

            // Get any new items from the fetched blacklist
            const missingEntries = lines.filter(entry => !fullList.includes(entry));

            // Add the new entries to the blacklist if any were found, and save to localstorage
            if (missingEntries) {
                chrome.storage.local.set({ 'blacklist': storedBlacklist.concat(missingEntries).sort() });
            }
            chrome.storage.local.set({ 'lastUpdated': now });

            console.log(`Blocklist updated with ${missingEntries.length} entries`);

            // return the update blacklist
            return await chrome.storage.local.get('blacklist');
        } catch (err) {
            console.error("Failed to fetch blocklist:", err);
        }
    } else {
        console.log("Blocklist is up to date.");
    }
}