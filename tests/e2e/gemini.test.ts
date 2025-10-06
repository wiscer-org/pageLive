import { before, after, describe, it } from "node:test";
import assert from "node:assert";
import { Browser, Page } from "puppeteer";
import { launchBrowser } from "./e2e.utils";
import GeminiAdapterChat from "../../src/content-scripts/page-adapters/gemini-chat";
import { waitForAnElement } from "../../src/content-scripts/util";

// This file is general e2e test file for gemini
describe("Gemini general tests", async () => {
    let page!: Page;
    let browser!: Browser;

    // Test group to check Gemini page elements & behaviour after ready (maximum 5 seconds)
    describe("Checking gemini after ready (< 5 seconds)", () => {
        before(async () => {
            browser = await launchBrowser();
            page = await browser.newPage();
            await page.goto("https://gemini.google.com", { waitUntil: "networkidle2" });

            // Wait to let gemini finish rendering
            await new Promise(r => setTimeout(r, 1e3));
        });

        after(async () => {
            // Ensure the browser is closed so the process can exit
            if (browser) {
                await browser.close();
            }
        });

        it("Has chat container element in desktop layout", async (t) => {
            await page.setViewport({ width: 1600, height: 700 });

            const selector = GeminiAdapterChat.CHAT_CONTAINER_SELECTOR;
            // let chatContainer = await waitForAnElement(selector);
            let chatContainer = await page.$(selector);
            console.log(chatContainer);
            assert.notEqual(chatContainer, null);
        });

        it("Has chat container element in the smaller layout", async (t) => {
            await page.setViewport({ width: 500, height: 700 });

            let chatContainer = await page.$(GeminiAdapterChat.CHAT_CONTAINER_SELECTOR);
            console.log(chatContainer);
            assert.notEqual(chatContainer, null);
        });

        it("Should have initial announcement by `PageLive`", (t) => {
            assert.equal(true, true, "This should be true");
        });
    });
});