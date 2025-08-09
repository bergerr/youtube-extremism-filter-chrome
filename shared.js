const BLOCKLIST_URL = "https://raw.githubusercontent.com/bergerr/youtube-extremism-filter-blacklist/refs/heads/main/blacklist.txt";
const UPDATE_INTERVAL = 14 * 24 * 60 * 60 * 1000; // 14 days in ms

// Get a value from local storage, or a default if it doesn't exist
export function getFromStorage(key, defaultValue) {
    return new Promise((resolve) => {
        chrome.storage.local.get(key, (result) => {
            if (result.hasOwnProperty(key)) {
                resolve(result[key]);
            } else {
                resolve(defaultValue);
            }
        });
    });
}

// Load the full blocklist from storage into a single array
export async function loadBlacklistFromStorage(includeWhitelist=false) {
    const storedBlacklist = await getFromStorage('blacklist');
    const storedCustomList = await getFromStorage('customlist');

    const blacklist = storedBlacklist ? storedBlacklist
        .split('\n')
        .map(line => line.trim().toLowerCase().replace(/\s+/g, ''))
        .filter(Boolean)
        : [];
    console.log('blacklist from storage in SHARE');
    console.log(blacklist);
    const customList = storedCustomList ? storedCustomList
        .split('\n')
        .map(line => line.trim().toLowerCase().replace(/\s+/g, ''))
        .filter(Boolean)
        : [];

    // Optionally append the whitelist
    if (includeWhitelist) {
        const storedWhiteList = await getFromStorage('whitelist');
        const whiteList = storedWhiteList ? storedWhiteList
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

// Download the blacklist from github
export async function fetchBlacklist() {
    const response = await fetch(BLOCKLIST_URL);
    if (!response.ok) {
        // Do nothing if the file is unavailable
        console.log("fetch failed");
        console.log(response)
        return
    }
    console.log("fetch was good");

    const text = await response.text();
    const parsed_text = text.trim().split('\n').filter(Boolean);
    return parsed_text;
}

// Pull the blacklist from github if it's been 14 days
export async function updateBlacklistIfNeeded(force=false) {
    console.log("updating");
    const now = Date.now();

    // Get saved blocklist and timestamp
    const lastUpdated = await getFromStorage("lastUpdated");

    // Check if update needed
    if (force || !lastUpdated || (now - lastUpdated) > UPDATE_INTERVAL) {
        console.log("fetching");
        try {
            const lines = await fetchBlacklist();

            const storedBlacklist = await getFromStorage('blacklist', []);
            const fullList = await loadBlacklistFromStorage(true);
            console.log('got fullList')
            console.log(typeof(fullList));
            console.log(fullList)

            // Get any new items from the fetched blacklist
            const missingEntries = lines.filter(entry => !fullList.includes(entry));

            // Add the new entries to the blacklist if any were found, and save to localstorage
            if (missingEntries) {
                chrome.storage.local.set({ 'blacklist': storedBlacklist.concat(missingEntries).sort() });
            }
            chrome.storage.local.set({ 'lastUpdated': now });

            console.log(`Blocklist updated with ${missingEntries.length} entries`);

            // return the update blacklist
            return await getFromStorage('blacklist');
        } catch (err) {
            console.error("Failed to fetch blocklist:", err);
        }
    } else {
        console.log("Blocklist is up to date.");
    }
}