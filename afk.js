const user = "TIMMY JOE"; // Replace with your username
const command = ".bot afk"; // Replace with a command of your choice.
const defaultMessage = "afk"; // Message that'll be sent every 30 seconds

(function() {
    'use strict';

    const chatBox = document.getElementById("chat");
    const chatInp = document.getElementById("chat-input");
    const chatBtn = document.getElementById("chat-send");
    const chatContent = document.querySelector("#chat-content");
    let afkActive = false;
    let afkTimeout = null;

    function sendChat(message) {
        if (chatBox.classList.contains('closed')) chatBtn.click();
        chatInp.value = message;
        chatBtn.click();
    }

    function startAFK(message) {
        stopAFK();
        const afkMessage = message || defaultMessage;
        let nextTime = Date.now();

        const schedule = () => {
            nextTime += 30000; // 30 seconds in ms
            const now = Date.now();
            const delay = Math.max(nextTime - now, 0);
            afkTimeout = setTimeout(() => {
                sendChat(afkMessage);
                schedule();
            }, delay);
        };

        sendChat(afkMessage);
        schedule();
        afkActive = true;
    }

    function stopAFK() {
        if (afkTimeout) {
            clearTimeout(afkTimeout);
            afkTimeout = null;
        }
        afkActive = false;
    }

    function observeNode(node, callback) {
        new MutationObserver(callback).observe(node, { childList: true });
    }

    observeNode(chatContent, () => {
        const mess = document.querySelector("#chat-content > p:last-of-type");

        if (!mess) return;

        mess.querySelectorAll(".user-badge-small").forEach(badge => badge.remove());

        const rankElement = mess.querySelector("span");
        const userelement = mess.querySelector("bdi");
        const messageText = mess.childNodes[mess.childNodes.length - 1].textContent.trim();

        const username = userelement ? userelement.textContent : "asdfa";
        const message = messageText || "";
        const messageLower = message.toLowerCase();

        if (username === user) {
            if (messageLower.startsWith(command)) {
                if (afkActive) {
                    stopAFK();
                    sendChat("I'm back!");
                } else {
                    const customMessage = messageText.substring(5).trim();
                    startAFK(customMessage);
                }
            }
        }
    });
})();
