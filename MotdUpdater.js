'use strict';
(function() {
    // MOTD updater: updates the MOTD every second with a customizable template showing uptime.

    // Config: customize by setting window.MOTD_UPDATER_TEMPLATE or localStorage.motdUpdaterTemplate
    // Template must include the token {uptime} where the formatted uptime will be inserted.
    const DEFAULT_TEMPLATE = 'AFK here 24 hours for cap\n3 hours for crew\nBot uptime: {uptime}';

    // localStorage key for persisting accumulated uptime (milliseconds)
    const ACCUM_KEY = 'motdUpdaterAccumulated';

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

    // read persisted accumulated ms from localStorage (safe)
    function readAccumulated() {
        try {
            const v = localStorage.getItem(ACCUM_KEY);
            const n = Number(v);
            return Number.isFinite(n) && n > 0 ? n : 0;
        } catch (e) {
            return 0;
        }
    }

    // write accumulated ms to localStorage (safe)
    function writeAccumulated(ms) {
        try {
            localStorage.setItem(ACCUM_KEY, String(ms));
        } catch (e) {
            // ignore
        }
    }

    // accumulated time from previous runs (ms)
    let accumulatedMs = readAccumulated();

    // start time of the current run
    let botStartTime = Date.now();

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
        const elapsedThisRun = Date.now() - botStartTime;
        const totalElapsed = accumulatedMs + elapsedThisRun;
        const uptime = formatUptime(totalElapsed);
        const text = template.replace('{uptime}', uptime);
        setMOTD(text);

        // persist accumulated so future runs pick up where we left off
        // save the total elapsed so far
        writeAccumulated(totalElapsed);
    }

    // run every second
    const INTERVAL_MS = 1000;
    let intervalId = null;

    function start() {
        if (intervalId) return;
        // if there was an accumulated value saved previously, continue from there
        accumulatedMs = readAccumulated();
        botStartTime = Date.now();
        updateOnce();
        intervalId = setInterval(updateOnce, INTERVAL_MS);
    }

    // expose a small API for runtime customization
    window.MotdUpdater = {
        start,
        stop() {
            if (intervalId) {
                // persist current accumulated before stopping
                const elapsedThisRun = Date.now() - botStartTime;
                accumulatedMs = accumulatedMs + elapsedThisRun;
                writeAccumulated(accumulatedMs);
                clearInterval(intervalId);
                intervalId = null;
                // reset botStartTime so a subsequent start uses a fresh start timestamp
                botStartTime = Date.now();
            }
        },
        // set the template and persist it
        setTemplate(t) { try { window.MOTD_UPDATER_TEMPLATE = t; localStorage.setItem('motdUpdaterTemplate', t); } catch(e){} },
        getTemplate,
        // reset accumulated uptime back to zero
        resetAccumulated() { accumulatedMs = 0; writeAccumulated(0); botStartTime = Date.now(); },
        // read raw accumulated ms (for debugging)
        _getAccumulatedMs() { return readAccumulated(); }
    };

    // try to persist once more on page unload
    try {
        window.addEventListener('beforeunload', function() {
            try {
                const elapsedThisRun = Date.now() - botStartTime;
                const totalElapsed = accumulatedMs + elapsedThisRun;
                writeAccumulated(totalElapsed);
            } catch (e) {}
        });
    } catch (e) {}

    // auto-start
    start();
})();
