import { before, after, describe, it } from "node:test";
import assert from "node:assert";
import { Browser, Page } from "puppeteer";
import { launchBrowser } from "./e2e.utils";

// This file is general e2e test file for claude.
// Tests in this file will focus on elements in claude, to detect if there is any changes on claude web page that may effect PageLive
describe("Claude general tests", async () => {
    let page!: Page;
    let browser!: Browser;

    // Test group to check claude page elements & behaviour after ready (maximum 5 seconds)
    describe("Checking claude after ready (< 5 seconds)", () => {
        before(async () => {
            browser = await launchBrowser();
            page = await browser.newPage();
            await page.goto("https://claude.ai", { waitUntil: "networkidle2" });

            // Wait to let claude finish rendering
            await new Promise(r => setTimeout(r, 1e3));
        });

        after(async () => {
            // Ensure the browser is closed so the process can exit
            if (browser) {
                await browser.close();
            }
        });

        it.skip("Has chat container element in desktop layout", async (t) => {
            await page.setViewport({ width: 1600, height: 700 });
            const chatContainerSelector = ".ChatMessageList__StyledChatMessageList-sc-1h8tq0c-0";
            let chatContainer = await page.$(chatContainerSelector);
            console.log(chatContainer);
            assert.notEqual(chatContainer, null);
        });

        it("Simple test", async () => {
            assert.strictEqual(1, 1);
        });

        it.todo("Should find toggle sidebar button", async () => {

        });

        it.todo("Should find the recent chat list heading element");

    });
});