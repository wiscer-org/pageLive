#!/usr/bin/env node
'use strict';

// Simple watcher that watches for changes in dist/*.js and prepends/appends wrapper code.
// Safe guards:
//  - skips files that already contain the marker
//  - debounces rapid events
//  - preserves sourceMappingURL comment

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const MARKER = '__WRAPPED_BY_WATCH_DIST_WRAP__';
const DEBOUNCE_MS = 150;

const prefix = `/* ${MARKER} START */\n(function(){\n`;
const suffix = `\n})();\n/* ${MARKER} END */\n`;

const pending = new Map();

function isJsFile(filename) {
    return filename.endsWith('.js');
}

function readFileSafe(file) {
    try {
        return fs.readFileSync(file, 'utf8');
    } catch (e) {
        return null;
    }
}

function writeFileSafe(file, content) {
    try {
        fs.writeFileSync(file, content, 'utf8');
        return true;
    } catch (e) {
        console.error('Error writing', file, e);
        return false;
    }
}

function wrapFile(file) {
    const content = readFileSafe(file);
    if (content === null) return;

    if (content.includes(MARKER)) {
        // already wrapped
        return;
    }

    // preserve sourceMappingURL if present
    const smMatch = content.match(/\n\/\/# sourceMappingURL=.*$/m);
    let sm = '';
    let body = content;
    if (smMatch) {
        sm = smMatch[0] + '\n';
        body = content.replace(smMatch[0], '');
    }

    const newContent = prefix + body + suffix + sm;
    writeFileSafe(file, newContent);
    console.log('Wrapped', path.relative(process.cwd(), file));
}

function scheduleWrap(file) {
    if (!isJsFile(file)) return;
    if (pending.has(file)) clearTimeout(pending.get(file));
    const t = setTimeout(() => {
        pending.delete(file);
        wrapFile(file);
    }, DEBOUNCE_MS);
    pending.set(file, t);
}

function walkAndWrap(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walkAndWrap(full);
        else if (e.isFile() && isJsFile(e.name)) scheduleWrap(full);
    }
}

function startWatcher() {
    console.log('Watching', DIST_DIR, 'for JS changes...');
    // initial wrap of existing files
    walkAndWrap(DIST_DIR);

    // watch recursively
    fs.watch(DIST_DIR, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        const full = path.join(DIST_DIR, filename);
        // some editors emit temp files; check existence
        if (!fs.existsSync(full)) return;
        scheduleWrap(full);
    });
}

startWatcher();

// keep the process alive
process.on('SIGINT', () => {
    console.log('\nStopping watcher');
    process.exit(0);
});
