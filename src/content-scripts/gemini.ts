// gemini.ts - Injected only on gemini.google.com

export { }; // Make this file a module to allow global augmentation.Used to declare global types, like `window.pageLiveAnnounce`;

console.log('PageLive gemini.ts loaded on gemini.google.com');

// Observe the chat-history container for new Gemini responses
// FIXME: Ensure the chat-history container exists before observing
let chatHistoryAttempts = 0;
const MAX_CHAT_HISTORY_ATTEMPTS = 20;

function observeGeminiChatHistory() {
    console.log('attempting to observe #chat-history for Gemini responses : ' + chatHistoryAttempts);
    const chatHistory = document.getElementById('chat-history');
    if (chatHistory) {
        const geminiObserver = new MutationObserver((mutations) => {
            // Log the start of the mutation observation
            console.log('[PageLive][Gemini] Observing mutations in #chat-history');

            // Iterate through each mutation
            for (const mutation of mutations) {
                // Log the mutation for debugging
                // console.log('[PageLive][Gemini] Mutation observed:', mutation);

                mutation.addedNodes.forEach((node) => {
                    // Log the added node for debugging
                    console.log('[PageLive][Gemini] Added node:', node);

                    if (node instanceof HTMLElement && node.nodeName === 'MODEL-RESPONSE') {
                        const responseText = node.textContent || '';
                        console.log('[PageLive][Gemini] New Gemini response:', responseText);
                        // Announce the new Gemini response using the global pageLiveAnnounce function
                        if (window.pageLive2a2b && typeof window.pageLive2a2b.announce === 'function') {
                            window.pageLive2a2b.announce({ msg: responseText });
                        } else {
                            console.warn('[PageLive][Gemini] pageLive2a2b.announce function not found on window.');
                        }
                    }
                });
            }
        });
        geminiObserver.observe(chatHistory, {
            childList: true,
            subtree: true
        });
    } else if (chatHistoryAttempts < MAX_CHAT_HISTORY_ATTEMPTS) {
        chatHistoryAttempts++;
        // Try again in 200ms
        setTimeout(observeGeminiChatHistory, 200);
    } else {
        console.warn('[PageLive][Gemini] #chat-history container not found after 20 attempts. Stopping observer setup.');
    }
}

observeGeminiChatHistory();

// (global type moved to src/types/global.d.ts)
