// This file constains reusable code for e2e utils
import puppeteer, { Browser } from "puppeteer";

export function getBrowserConfig() {
    // For now keep non-headless
    // const headless = process.env.HEADLESS !== undefined ? process.env.HEADLESS === 'true' : true;
    const headless = false;

    const userDataDir = process.env.USER_DATA_DIR || "./user-data";

    const cfg: any = {
        headless,
        args: [] as string[],
    };

    if (!headless) {
        // when running non-headless, start maximized for visibility
        cfg.args.push('--start-maximized');
    }

    if (userDataDir) {
        cfg.userDataDir = userDataDir;
    }

    return cfg;
}

export async function launchBrowser() {
    const browserConfig = getBrowserConfig();
    const browser = await puppeteer.launch(browserConfig);
    return browser;
}
