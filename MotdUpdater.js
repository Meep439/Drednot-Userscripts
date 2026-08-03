'use strict';
(function() {
    // MOTD updater: updates the MOTD every second with a customizable template showing uptime.

    // Config: customize by setting window.MOTD_UPDATER_TEMPLATE or localStorage.motdUpdaterTemplate
    // Template must include the token {uptime} where the formatted uptime will be inserted.
    const DEFAULT_TEMPLATE = 'Server uptime: {uptime}';

    // DOM references (looked up on each update in case DOM is replaced)
    function getDomRefs() {
        return {
            motdEdit: document.getElementById('motd-edit-button'),
            motdText: document.getElementById('motd-edit-text'),
            motdSavedText: document.getElementById('motd-text'),
            motdSave: document.querySelector('#motd-edit .btn-green')
        };
    }

    // set the motd (clicks edit/save UI similar to ChatBot.js)
    function setMOTD(text) {
        try {
            const { motdEdit, motdText, motdSavedText, motdSave } = getDomRefs();
            if (!motdSavedText) return;
            // Avoid unnecessary UI actions if text already matches
            if (motdSavedText.innerText.trim() === text.trim()) return;
            if (motdEdit) motdEdit.click();
            if (motdText) motdText.value = text;
            if (motdSave) motdSave.click();
        } catch (e) {
            // DOM might be unavailable; ignore and retry next tick
            // console.debug('setMOTD error', e);
        }
    }

    // format milliseconds into human readable time
    function formatUptime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

        return parts.join(' ');
    }

    const botStartTime = Date.now();

    // get template: priority - window.MOTD_UPDATER_TEMPLATE, localStorage, default
    function getTemplate() {
        if (typeof window !== 'undefined' && window.MOTD_UPDATER_TEMPLATE) return window.MOTD_UPDATER_TEMPLATE;
        try {
            const fromStorage = localStorage.getItem('motdUpdaterTemplate');
            if (fromStorage) return fromStorage;
        } catch (e) {
            // ignore localStorage access errors
        }
        return DEFAULT_TEMPLATE;
    }

    // update once: compute text and set MOTD
    function updateOnce() {
        const template = getTemplate();
        const uptime = formatUptime(Date.now() - botStartTime);
        const text = template.replace('{uptime}', uptime);
        setMOTD(text);
    }

    // run every second
    const INTERVAL_MS = 1000;
    let intervalId = null;

    function start() {
        if (intervalId) return;
        updateOnce();
        intervalId = setInterval(updateOnce, INTERVAL_MS);
    }

    // expose a small API for runtime customization
    window.MotdUpdater = {
        start,
        stop() { if (intervalId) { clearInterval(intervalId); intervalId = null; } },
        setTemplate(t) { try { window.MOTD_UPDATER_TEMPLATE = t; localStorage.setItem('motdUpdaterTemplate', t); } catch(e){} },
        getTemplate
    };

    // auto-start
    start();
})();
