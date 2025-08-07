let recommendationsObserver = null;

// const recommendationTag = 'ytd-compact-video-renderer';
// const channelTag = 'ytd-channel-name';
const buttonTag = 'button';
// const menuBoxTag = 'ytd-menu-service-item-renderer';
const signInTag = 'ytd-masthead button#avatar-btn';

// new changes
// const recommendationTag = 'yt-lockup-view-model';
// const channelInfoTag = 'yt-content-metadata-view-model';
// loop over the children divs for ^^^ and check for matching channel names
// loop over the children divs for ^^^ and check for button sub-children
// const menuBoxTag = 'yt-list-view-model';

let blacklist = [];
let fullList = [];
let hideBlocked = false;

const observeOptions = { childList: true, attributes: false, subtree: true };

// Function to check if the user is signed in
function isUserSignedIn(tag, maxRetries = 10, delay = 300) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const check = () => {
            const avatarBtn = document.querySelector(tag);
            if (avatarBtn) {
                return resolve(true);
            }
            attempts++;
            if (attempts < maxRetries) {
                setTimeout(check, delay);
            }
            else {
                console.debug('User not signed in after maximum attempts.');
                reject(false);
            }
        };
        check();
    });
}

// Wait for menu item
function waitForMenuItem(labelText, maxRetries = 10, delay = 300) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const check = () => {
            // const items = Array.from(document.getElementsByTagName(menuBoxTag));
            const items = document.querySelectorAll('[role="menuitem"]');
            const match = items.find(item => item.innerText.trim().toLowerCase() === labelText.toLowerCase());
            if (match) {
                return resolve(match);
            }
            attempts++;
            if (attempts < maxRetries) {
                setTimeout(check, delay);
            }
            else {
                reject('Menu item not found: ' + labelText);
            }
        };
        check();
    });
}

// Click menu and block
function blockChannel(node) {
    if (node.nodeType === 1 && node.tagName.toLowerCase() === buttonTag) {
        return node;
    }
    for (const child of node.childNodes) {
        const found = blockChannel(child);
        if (found) {
            child.click();

            waitForMenuItem("Don't recommend channel")
                .then(item => {
                    item.click();
                })
                .catch(err => {
                    console.warn(err);
                });

            return node;
        }
    }
    return null;
}

// Check if channel is in blacklist
function checkChannelName(channelName) {
    console.log('checking channel name')
    if (channelName == null) {
        return false;
    }
    const cleaned = channelName.trim().toLowerCase().replace(/\s+/g, '');
    return fullList.includes(cleaned);
}

// Get the channel name without using tags
function getChannelNameText(element) {
    console.log('in getChannelName')
    // Loop over all text underneath the recommendation
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                // Reject any text node that has an <a> ancestor
                let curr = node.parentElement;
                while (curr) {
                    if (curr.tagName === "A") return NodeFilter.FILTER_REJECT;
                    curr = curr.parentElement;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        },
        false
    );

    while (walker.nextNode()) {
        const text = walker.currentNode.textContent.trim();
        if (text.length > 0) {
            console.log(text)
            return text; // Return the first non-empty, non-<a> text
        }
    }

    return null; // No channel name found
}

// Common logic for both recommendation functions
function doRecommendationLogic(node) {
    console.log('recommendation section');
    node.style.outline = '2px solid limegreen';
    // const found = node.getElementsByTagName(channelTag);
    const channelName = getChannelNameText(node)
    if (checkChannelName(channelName)) {
        console.log('Blocking channel:', channelName);
        // blockChannel(node);
        // // Hide the blocked channel
        // if (hideBlocked) {
        //     node.style.display = 'none';
        // }
    }
}

// MutationObserver for new items
function handleRecommendationMutations(mutationsList) {
    console.log('in handle recs')
    for (const mutation of mutationsList) {
        console.log('in handle rec loop')
        for (const node of mutation.addedNodes) {
            console.log('in handle rec added node loop')
            if (node.nodeType === 1) {
                doRecommendationLogic(node);
            }
        }
    }
}

// Scan visible recommendations immediately
function processExistingRecommendations(recommendations) {
    // const nodes = document.getElementsByTagName(recommendationTag);
    for (const recommendation of recommendations) {
        doRecommendationLogic(recommendation);
    }
}

// Watch for recommendations parent
function handleMutations(mutationsList, observer) {
    let recommendations = findRecommendationLinks();
    if (recommendations.length > 0) {
        // Disconnect the main observer to avoid duplicate processing
        console.log('disconnecting observer 1')
        observer.disconnect();

        // observe the recommendations parent to watch for new videos
        // const recommendationsParent = recommendations.item(0).parentNode;
        const recommendationsParent = getCommonAncestor(recommendations);
        console.log('starting observer 2')
        // recommendationsObserver = new MutationObserver(handleRecommendationMutations);
        // recommendationsObserver.observe(recommendationsParent, observeOptions);

        // Process already-visible recommendations
        console.log(recommendationsParent)
        processExistingRecommendations(recommendationsParent.children);
    }
}

// Start top-level observer
function startMainObserver() {
    // Observe the document because the recommendations load after the observer starts
    // This way we can wait for the recommendations to appear and then start observing only that
    const targetNode = document.documentElement;
    const observer = new MutationObserver(handleMutations);
    observer.observe(targetNode, observeOptions);
    console.log('observer 1 started')
}

// Get the depth of an element
function getElementDepth(el) {
    let depth = 0;
    while (el.parentElement) {
        el = el.parentElement;
        depth++;
    }
    return depth;
}

// Build a unique key from a tag, class, and depth
function getGroupKey(el) {
    const classes = [...el.classList].sort().join(' ');
    const tag = el.tagName;
    const depth = getElementDepth(el);
    return `${tag}__${classes}__depth${depth}`;
}

// Find a list of video links from the recommendation section
// Recommendations is an array with an anchor and an image, so we use that to filter
function findRecommendationLinks() {
    // Step 1: collect all candidate containers (like video tiles)
    const allContainers = Array.from(document.querySelectorAll('*'))
        .filter(el => el.children.length > 0 && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE');

    // Step 2: group them by tag + class
    const groups = {};
    allContainers.forEach(el => {
        const key = getGroupKey(el);
        if (!groups[key]) groups[key] = [];
        groups[key].push(el);
    });

    // Step 3: filter all <a> elements
    const videoLinks = Array.from(document.querySelectorAll('a'))
        .filter(a => {
            if (!a.href.includes('watch') || !a.querySelector('img')) return false;

            // Step 4: find the closest ancestor (up to 3 levels) that's in a large enough group
            let current = a;
            for (let i = 0; i < 3; i++) {
                current = current.parentElement;
                if (!current) break;

                // The group needs at least 5 identical members
                const key = getGroupKey(current);
                if (groups[key] && groups[key].length >= 5) {
                    console.log('key is ' + key);
                    return true;
                }
            }
            return false;
        });

    console.log(videoLinks[0]);
    return videoLinks;
}

// // Find the recommendations section without using tags
// // The last update changed all the tags, so this should avoid breaking changes
// function findRecommendationSection() {
//     let videoLinks = findRecommendationLinks()
//     const recommendationContainer = getCommonAncestor(videoLinks);
//     return recommendationContainer;
// }

// Find the common ancestor of all the recommendation links
function getCommonAncestor(nodes) {
    if (!nodes.length) return null;

    function getAncestors(node) {
        const ancestors = [];
        while (node) {
            ancestors.unshift(node);
            node = node.parentElement;
        }
        return ancestors;
    }

    let commonAncestors = getAncestors(nodes[0]);

    for (let i = 1; i < nodes.length; i++) {
        const ancestors = getAncestors(nodes[i]);
        let j = 0;
        while (j < commonAncestors.length && j < ancestors.length && commonAncestors[j] === ancestors[j]) {
            j++;
        }
        commonAncestors = commonAncestors.slice(0, j);
    }

    return commonAncestors.pop(); // last shared ancestor
}

// Load the hidden state from storage
async function loadHiddenState() {
    // load checkbox state
    const storedHideBlocked = await chrome.storage.local.get('hideBlocked');
    if (!storedHideBlocked || typeof storedHideBlocked.hideBlocked !== 'boolean') {
        // Default to false if not set
        hideBlocked = false;
    } else {
        // Ensure the value is a boolean
        hideBlocked = Boolean(storedHideBlocked.hideBlocked);
    }
}

// Load the blacklist and start observing
async function loadBlacklistFromStorage() {
    const storedBlacklist = await chrome.storage.local.get('blacklist');
    const storedCustomList = await chrome.storage.local.get('customList');
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
    fullList = [...blacklist, ...customList];

    // Load the state of the hidden checkbox
    loadHiddenState();

    // Check if the user is signed in
    (async () => {
        try {
            const signedIn = await isUserSignedIn(signInTag);
            if (signedIn) {
                console.log('starting observer 1')
                startMainObserver();
            }
        } catch (e) {
            console.debug('User is not signed in. Observer not started.');
        }
    })();
}


// ----------------------------------------------------------------
// Main block
// ----------------------------------------------------------------
console.debug('YouTube Blocker content script loaded.');
loadBlacklistFromStorage();