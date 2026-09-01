// ==UserScript==
// @name         Drednot AutoBan
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Auto-ban specified users when they join the ship; manage list with chat commands.
// @match        *://*.drednot.io/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ============================================================================
    // CONFIGURATION
    // ============================================================================
    const CONFIG = {
        STORAGE_KEY: 'autoBan.bannedUsers',
        MESSAGE_COOLDOWN: 1010, // ms between outgoing messages
        AUTHORIZED_USERS: ['TIMMY JOE'], // who can run management commands
    };

    // ============================================================================
    // DOM CACHE & STATE
    // ============================================================================
    const DOM = {
        chatBox: document.getElementById('chat'),
        chatInput: document.getElementById('chat-input'),
        chatButton: document.getElementById('chat-send'),
        chatContent: document.querySelector('#chat-content'),
    };

    let messageQueue = [];
    let isQueueActive = false;
    let bannedUsers = [];

    // ============================================================================
    // STORAGE OPERATIONS
    // ============================================================================
    const Storage = {
        load() {
            try {
                const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
                return raw ? JSON.parse(raw) : [];
            } catch (error) {
                console.error('AutoBan: Failed to load banned list', error);
                return [];
            }
        },

        save(list) {
            try {
                localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(list));
            } catch (error) {
                console.error('AutoBan: Failed to save banned list', error);
            }
        },
    };

    // ============================================================================
    // BANNED USER MANAGEMENT
    // ============================================================================
    const BanList = {
        normalize(name) {
            return (name || '').trim();
        },

        isBanned(name) {
            if (!name) return false;
            const normalized = name.toLowerCase();
            return bannedUsers.some(b => this.normalize(b).toLowerCase() === normalized);
        },

        add(name) {
            const normalized = this.normalize(name);
            if (!normalized) return false;

            if (this.isBanned(normalized)) {
                return false; // already banned
            }

            bannedUsers.push(normalized);
            Storage.save(bannedUsers);
            return true;
        },

        remove(name) {
            const normalized = this.normalize(name).toLowerCase();
            const initialLength = bannedUsers.length;

            bannedUsers = bannedUsers.filter(
                b => this.normalize(b).toLowerCase() !== normalized
            );

            if (bannedUsers.length !== initialLength) {
                Storage.save(bannedUsers);
                return true;
            }

            return false;
        },

        list() {
            return bannedUsers.slice();
        },

        clear() {
            bannedUsers = [];
            Storage.save(bannedUsers);
        },
    };

    // ============================================================================
    // CHAT MESSAGE QUEUE & SENDING
    // ============================================================================
    const Chat = {
        isReady() {
            return DOM.chatInput && DOM.chatButton && DOM.chatContent;
        },

        openIfClosed() {
            if (DOM.chatBox && DOM.chatBox.classList.contains('closed')) {
                DOM.chatButton.click();
            }
        },

        sendImmediate(message) {
            setTimeout(() => {
                if (!this.isReady()) return;
                this.openIfClosed();
                DOM.chatInput.value = message;
                DOM.chatButton.click();
            }, CONFIG.MESSAGE_COOLDOWN);
        },

        processQueue() {
            if (messageQueue.length === 0) {
                isQueueActive = false;
                return;
            }

            isQueueActive = true;
            const message = messageQueue.shift();
            this.sendImmediate(message);
            setTimeout(() => this.processQueue(), CONFIG.MESSAGE_COOLDOWN);
        },

        send(message) {
            messageQueue.push(message);
            if (!isQueueActive) {
                this.processQueue();
            }
        },
    };

    // ============================================================================
    // MESSAGE PARSING & REGEX PATTERNS
    // ============================================================================
    const Patterns = {
        JOIN_MESSAGE: /^(.+?)\s+joined the ship\.?$/i,
        JOINED_SHIP: /joined the ship/i,
        SPOKEN_MESSAGE: /^(.+?):\s*(.*)$/,
    };

    const Parser = {
        extractUsername(messageElement) {
            const usernameEl = messageElement.querySelector('bdi');
            return usernameEl ? usernameEl.textContent : null;
        },

        extractMessageText(messageElement) {
            // Get the last text node (typically the message content)
            const lastNode = messageElement.childNodes[messageElement.childNodes.length - 1];
            return lastNode ? lastNode.textContent.trim() : '';
        },

        parseJoin(messageText) {
            const match = messageText.match(Patterns.JOIN_MESSAGE);
            return match ? match[1].trim() : null;
        },

        parseSpeaker(messageText) {
            const match = messageText.match(Patterns.SPOKEN_MESSAGE);
            if (match && match[1]) {
                return {
                    speaker: match[1].trim(),
                    message: match[2] ? match[2].trim() : '',
                };
            }
            return null;
        },
    };

    // ============================================================================
    // COMMAND HANDLERS
    // ============================================================================
    const Commands = {
        isAuthorized(username) {
            return CONFIG.AUTHORIZED_USERS.includes(username);
        },

        handle(username, messageText) {
            const lowerText = messageText.toLowerCase();

            // .ab add <username>
            if (lowerText.startsWith('.ab add ')) {
                const name = messageText.substring(8).trim();
                if (!name) {
                    Chat.send('Usage: .ab add <username>');
                    return;
                }
                if (BanList.add(name)) {
                    Chat.send(`✓ Added ${name} to auto-ban list.`);
                } else {
                    Chat.send(`✗ ${name} is already on the auto-ban list.`);
                }
                return;
            }

            // .ab remove <username>
            if (lowerText.startsWith('.ab remove ')) {
                const name = messageText.substring(11).trim();
                if (!name) {
                    Chat.send('Usage: .ab remove <username>');
                    return;
                }
                if (BanList.remove(name)) {
                    Chat.send(`✓ Removed ${name} from auto-ban list.`);
                } else {
                    Chat.send(`✗ ${name} was not on the auto-ban list.`);
                }
                return;
            }

            // .ab list
            if (lowerText === '.ab list') {
                const list = BanList.list();
                if (list.length === 0) {
                    Chat.send('Auto-ban list is empty.');
                } else {
                    Chat.send(`Auto-ban list (${list.length}): ${list.join(', ')}`);
                }
                return;
            }

            // .ab clear
            if (lowerText === '.ab clear') {
                BanList.clear();
                Chat.send('✓ Auto-ban list cleared.');
                return;
            }
        },
    };

    // ============================================================================
    // MESSAGE HANDLERS
    // ============================================================================
    function handleMessage(messageElement) {
        if (!messageElement) return;

        try {
            // Clean up small badges
            messageElement.querySelectorAll('.user-badge-small').forEach(badge => badge.remove());

            const username = Parser.extractUsername(messageElement);
            const messageText = Parser.extractMessageText(messageElement);

            if (!messageText) return;

            // Handle management commands
            if (username && Commands.isAuthorized(username)) {
                Commands.handle(username, messageText);
                return;
            }

            // Check for join message
            if (Patterns.JOINED_SHIP.test(messageText)) {
                const joinedName = Parser.parseJoin(messageText);
                if (joinedName && BanList.isBanned(joinedName)) {
                    Chat.send(`/kick ${joinedName.toLowerCase()}`);
                    console.log('AutoBan: Kicked banned user on join:', joinedName);
                    return;
                }
            }

            // Check for spoken message
            const spoken = Parser.parseSpeaker(messageText);
            if (spoken && spoken.speaker && BanList.isBanned(spoken.speaker)) {
                Chat.send(`/kick ${spoken.speaker.toLowerCase()}`);
                console.log('AutoBan: Kicked banned user on speak:', spoken.speaker);
                return;
            }
        } catch (error) {
            console.error('AutoBan: Error handling message', error);
        }
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    function init() {
        // Load banned users from storage
        bannedUsers = Storage.load();
        console.log('AutoBan: Loaded banned users:', bannedUsers);

        // Check DOM availability
        if (!DOM.chatContent) {
            console.warn('AutoBan: Chat content element not found. Script inactive.');
            return;
        }

        if (!Chat.isReady()) {
            console.warn('AutoBan: Chat UI elements not fully loaded.');
        }

        // Observe new messages
        const observer = new MutationObserver(() => {
            const lastMessage = document.querySelector('#chat-content > p:last-of-type');
            if (lastMessage) {
                handleMessage(lastMessage);
            }
        });

        observer.observe(DOM.chatContent, { childList: true });
        console.log('AutoBan: Initialized and listening for messages.');
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
