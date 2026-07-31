// ==UserScript==
// @name         dredark script boilerplate
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  make your own stuff idk
// @author       dutchman
// @match        *://*.drednot.io/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

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
            if (chatBox.classList.contains('closed')) chatBtn.click();
            chatInp.value = message;
            chatBtn.click();
        }, COOLDOWN);
    }

    function processQueue() {
        if (chatQueue.length === 0) {
            queueActive = false;
            return;
        }
        queueActive = true;
        const msg = chatQueue.shift();
        _immediateSend(msg);
        setTimeout(processQueue, COOLDOWN);
    }

    // put a message in the queue
    function sendChat(message) {
        chatQueue.push(message);
        if (!queueActive) processQueue();
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

        // badges might be bad
        // mess.querySelectorAll(".user-badge-small").forEach(badge => badge.remove());

        // extract different variables
        const usernameElement = mess.querySelector("bdi");
        const messageText     = mess.childNodes[mess.childNodes.length - 1].textContent.trim();
        const username        = usernameElement ? usernameElement.textContent : "unknown";

        // replace with your usernames
        const captains = ["TIMMY JOE"];
        if (captains.includes(username)) {
            if (messageText === "!test") {
                sendChat("pong");
                setMOTD("test test anjgf adhajanhja\ngjnfkamjnd");
                sendChat("ping");
                sendChat("pong");

            }
            // put more stuff here
        }
    });

})();
