'use strict';
(function() {

    // html reference
    const chatBox     = document.getElementById("chat");
    const chatInp     = document.getElementById("chat-input");
    const chatBtn     = document.getElementById("chat-send");
    const chatContent = document.querySelector("#chat-content");

    const motdEdit     = document.getElementById("motd-edit-button");
    const motdText     = document.getElementById("motd-edit-text");
    const motdSavedText= document.getElementById("motd-text");
    const motdSave     = document.querySelector("#motd-edit .btn-green");

    // chat queue stuff
    const chatQueue = [];
    let queueActive = false;
    let lastImmediate = Date.now();
    const COOLDOWN   = 1010; // ms

    // force send a message
    function _immediateSend(message) {
        setTimeout(() => {
            if (chatBox && chatBox.classList.contains('closed')) chatBtn.click();
            if (chatInp) chatInp.value = message;
            if (chatBtn) chatBtn.click();
        }, COOLDOWN);
    }

    function processQueue() {
        queueActive = true;
        const msg = chatQueue.shift();
        _immediateSend(msg);
        setTimeout(processQueue, COOLDOWN);
    }

    // put a message in the queue
    function sendChat(message) {
        chatQueue.push(message);
        if (!queueActive) _immediateSend(message) //processQueue();
    }

    // set the motd
    function setMOTD(text) {
        if (!motdSavedText) return;
        if (motdSavedText.innerText === text) return;
        if (motdEdit) motdEdit.click();
        if (motdText) motdText.value = text;
        if (motdSave) motdSave.click();
    }

    // message observer
    function observeNode(node, callback) {
        new MutationObserver(callback).observe(node, { childList: true });
    }

    if (chatContent) {
        observeNode(chatContent, () => {
            const mess = document.querySelector("#chat-content > p:last-of-type");
            if (!mess) return;

            // extract different variables
            const usernameElement = mess.querySelector("bdi");
            const messageText     = mess.childNodes[mess.childNodes.length - 1].textContent.trim();
            const username        = usernameElement ? usernameElement.textContent : "unknown";

            // replace with your usernames
            const cap = ["TIMMY JOE"];
            // only if cap
            if (cap.includes(username)) {
                if (messageText === ".bot clear motd") {
                    setMOTD(" ")
                    sendChat("MOTD cleared!")
                }
                if (messageText === ".bot save") {
                    sendChat("Saving in 30 seconds.")
                    setTimeout(() => {
                            // This code runs strictly after 30 seconds
                            sendChat("/save")
                        }, 30000); 
                }
                if (messageText === ".bot lock") {
                    sendChat("/lock 30000000")
                }
                // put more stuff here
            }
            // allows anybody to run
            if (true) {
                if (messageText === ".bot test") {
                    sendChat("Bot is online")
                }
                if (messageText.toLowerCase().includes("do the roar")) {
                    sendChat("Roar!")            
                }
                if (messageText.includes("joined the ship.")) {
                    sendChat(`Hello, ${messageText.split("joined")[0]}!`)
                }
                // runs when you join the ship, must be in this section because username cannot detect it's you
                if (messageText.includes("Joined ship")) {
                    sendChat("Hai!")
                }

                // dice roll command: responds with a random number from 1 to 20 (default) or 1..N if specified
                if (messageText.toLowerCase().startsWith(".bot dice roll")) {
                    const parts = messageText.trim().split(/\s+/);
                    // parts: [".bot", "dice", "roll", "<optional-sides>"]
                    let sides = 20;
                    if (parts.length >= 4) {
                        const n = parseInt(parts[3], 10);
                        if (isNaN(n) || n < 1) {
                            sendChat("Please provide a positive integer number of sides, e.g. '.bot dice roll 6'.");
                            return;
                        }
                        sides = n;
                    }
                    const roll = Math.floor(Math.random() * sides) + 1;
                    sendChat(`Rolled: ${roll} (1-${sides})`);
                }

                // help command: list available commands
                if (messageText === ".bot help") {
                    const helpLines = [
                        "Available bot commands:",
                        ".bot help - Show this help message",
                        ".bot test - Check if the bot is online",
                        ".bot dice roll [sides] - Roll a die (default d20). Example: '.bot dice roll' or '.bot dice roll 6'",
                        ".bot clear motd - (admin) Clear the MOTD",
                        ".bot save - (admin) Save after 30s",
                        ".bot lock - (admin) Lock the chat",
                        "(also responds to phrases: 'do the roar', 'joined the ship.', 'Joined ship')",
                    ];
                    // send as a single message joined by ' | ' to avoid spamming
                    sendChat(helpLines.join(' | '));
                }
            }
        });
    }
})();
