// ==UserScript==
// @name         Drednot AutoBan
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Auto-ban specified users when they join the ship; manage list with chat commands.
// @match        *://*.drednot.io/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // CONFIG
    const STORAGE_KEY = 'autoBan.bannedUsers';
    const COOLDOWN = 1010; // ms between outgoing messages
    const captains = ['TIMMY JOE']; // who can run management commands

    // DOM refs
    const chatBox     = document.getElementById('chat');
    const chatInp     = document.getElementById('chat-input');
    const chatBtn     = document.getElementById('chat-send');
    const chatContent = document.querySelector('#chat-content');

    // send queue (prevents spamming)
    const chatQueue = [];
    let queueActive = false;

    function _immediateSend(msg) {
        setTimeout(() => {
            if (!chatInp || !chatBtn) return;
            if (chatBox && chatBox.classList.contains('closed')) chatBtn.click();
            chatInp.value = msg;
            chatBtn.click();
        }, COOLDOWN);
    }

    function processQueue() {
        if (chatQueue.length === 0) {
            queueActive = false;
            return;
        }
        queueActive = true;
        const m = chatQueue.shift();
        _immediateSend(m);
        setTimeout(processQueue, COOLDOWN);
    }

    function sendChat(message) {
        chatQueue.push(message);
        if (!queueActive) processQueue();
    }

    // banned users persistence
    function loadBanned() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            return JSON.parse(raw);
        } catch (e) {
            console.error('autoBan: failed to load banned list', e);
            return [];
        }
    }
    function saveBanned(list) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        } catch (e) {
            console.error('autoBan: failed to save banned list', e);
        }
    }

    let bannedUsers = loadBanned(); // array of canonical names (strings)

    // helper utils
    function canonical(name) {
        return (name || '').trim();
    }
    function isBanned(name) {
        if (!name) return false;
        const n = name.toLowerCase();
        return bannedUsers.some(b => canonical(b).toLowerCase() === n);
    }
    function addBanned(name) {
        const c = canonical(name);
        if (!c) return false;
        if (!isBanned(c)) {
            bannedUsers.push(c);
            saveBanned(bannedUsers);
            return true;
        }
        return false;
    }
    function removeBanned(name) {
        const c = canonical(name).toLowerCase();
        const before = bannedUsers.length;
        bannedUsers = bannedUsers.filter(b => b.toLowerCase() !== c);
        if (bannedUsers.length !== before) {
            saveBanned(bannedUsers);
            return true;
        }
        return false;
    }
    function listBanned() {
        return bannedUsers.slice();
    }
    function clearBanned() {
        bannedUsers = [];
        saveBanned(bannedUsers);
    }

    // observe chat messages
    function observeNode(node, callback) {
        new MutationObserver(callback).observe(node, { childList: true });
    }

    // parse messages like "Cmoney joined the ship." (robust)
    const joinRegex = /^(.+?)\s+joined the ship\.?$/i; // captures name
    // also catch "Joined ship" variations (for you joining)
    const joinedShipCaseInsensitive = /joined the ship/i;

    function handleMessage(mess) {
        if (!mess) return;
        // remove small badges if present
        mess.querySelectorAll('.user-badge-small').forEach(b => b.remove());

        const usernameElement = mess.querySelector('bdi');
        const messageText = mess.childNodes[mess.childNodes.length - 1].textContent.trim();
        const username = usernameElement ? usernameElement.textContent : 'unknown';

        // management commands: only captains can use them
        try {
            if (captains.includes(username)) {
                // .autoban add Name
                if (messageText.toLowerCase().startsWith('.autoban add ')) {
                    const name = messageText.substring(12).trim();
                    if (!name) { sendChat('Usage: .autoban add <username>'); return; }
                    if (addBanned(name)) sendChat(`Added ${name} to auto-ban list.`);
                    else sendChat(`${name} is already on the auto-ban list.`);
                    return;
                }
                // .autoban remove Name
                if (messageText.toLowerCase().startsWith('.autoban remove ')) {
                    const name = messageText.substring(15).trim();
                    if (!name) { sendChat('Usage: .autoban remove <username>'); return; }
                    if (removeBanned(name)) sendChat(`Removed ${name} from auto-ban list.`);
                    else sendChat(`${name} was not on the auto-ban list.`);
                    return;
                }
                // .autoban list
                if (messageText.toLowerCase() === '.autoban list') {
                    const list = listBanned();
                    if (list.length === 0) sendChat('Auto-ban list is empty.');
                    else sendChat('Auto-ban: ' + list.join(', '));
                    return;
                }
                // .autoban clear
                if (messageText.toLowerCase() === '.autoban clear') {
                    clearBanned();
                    sendChat('Auto-ban list cleared.');
                    return;
                }
            }
        } catch (e) {
            console.error('autoBan management handling error', e);
        }

        // Auto-ban detection: look for join messages
        try {
            if (joinedShipCaseInsensitive.test(messageText)) {
                const m = messageText.match(joinRegex);
                if (m && m[1]) {
                    const joinedName = m[1].trim();
                    // If the joined user is banned, issue /ban <lowercase>
                    if (isBanned(joinedName)) {
                        // Optionally greet (comment out if undesired):
                        // sendChat(`Hello, ${joinedName}!`);
                        sendChat(`/ban ${joinedName.toLowerCase()}`);
                        console.log('autoBan: banned', joinedName);
                    }
                }
            }
        } catch (e) {
            console.error('autoBan join handling error', e);
        }
    }

    if (chatContent) {
        observeNode(chatContent, () => {
            const mess = document.querySelector('#chat-content > p:last-of-type');
            if (!mess) return;
            handleMessage(mess);
        });
    } else {
        console.warn('autoBan: chatContent element not found - script inactive.');
    }

})();
