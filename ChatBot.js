    'use strict';

    // html reference bs
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
            if (chatBox.classList.contains('closed')) chatBtn.click();
            chatInp.value = message;
            chatBtn.click();
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
        if (motdSavedText.innerText === text) return;
        motdEdit.click();
        motdText.value = text;
        motdSave.click();
    }

    // message observer
    function observeNode(node, callback) {
        new MutationObserver(callback).observe(node, { childList: true });
    }

    observeNode(chatContent, () => {
        const mess = document.querySelector("#chat-content > p:last-of-type");
        if (!mess) return;

        // mess.querySelectorAll(".user-badge-small").forEach(badge => badge.remove());

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
        // runs even if it isn't cap
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
            if (messageText.includes("Joined ship")) {
                sendChat("Hai!")
            }
        }
    });
})();
