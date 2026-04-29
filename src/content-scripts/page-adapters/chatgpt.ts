import PageLive from "../pagelive";

const chatgptAdapter = async () => {
    const pl = new PageLive();
    
    const construct = async () => {
        console.log("ChatGPT page adapter is active!");
    }
    await construct();
}

// Note: The callback is guaranteed to run because we set "document_start" in manifest.json
document.addEventListener('DOMContentLoaded', () => {
    chatgptAdapter().catch((err) => {
        console.error("Error initializing ChatGPT page adapter:", err);
    });
});
