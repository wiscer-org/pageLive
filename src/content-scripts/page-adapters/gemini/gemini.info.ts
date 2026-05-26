/**
 * Note about how the process after gemini page is loaded.
 * - Need for the chat container to be rendered
 * - If any, the page will rendered the previous prompts and responses. Funtion below will set observer to wait for the whole previous chat being rendered in the chat container.
 * - After observing for the previous chat, function below will start new observer for new Gemini responses.
 * - The new incoming response will not be a whole complete text. It will streamlined in part of the text. Function below will set new observer to wait for the whole response being rendered..
 * - Everytime a chunk of response is added to the response element, it will be announced, but with a delay, and cancel the previous announce timeout.
 * - After reaching the timeout, the content of the response element will be announced.
 */


/**
 * Hierarchy subset on the side nav:
 *
 * infinite-scroller
 *      .loading-content-spinner-container
 *      .explore-gems-container
 *      .chat-history
 *          .chat-history-list
 *              conversations-list [data-test-id="all-conversations"]'
 *                  .title-container
 *                  .conversations-container
 *                      .conversation-items-container
 *                      .conversation-items-container
 *              .loading-history-spinner-container
 */

// ---

// Below is note about how to announce an incoming new response:
//
// Problem:
// An incoming new response is not fully rendered, but in streams.
// The previous solution is to wait until not more mutations happened in the 'chat container', which will make the user's wait time is longer before each new response is read.
//
// Objective:
// Announce each response segment right away once it fully rendered. For the last segment, it will be announced with a delay after no more mutations happened.
//
// Condition:
// A 'response segment' is all first children element of a response element, e.g.: <p>, <ul>, etc.
// A 'response element' is the direct parent of `responseSegments` of a response. Basically it only contains the whole text received as a response.
// A 'response element' could be queried with selector 'message-content'.
// A 'response container' is an HTML element that wraps all elements related to a response, including `responseElement`, buttons, etc.
// A 'response container' could be 'catch' when the element is added to the `chatContainer` element.
//
// Strategy:
// - Observe the `chatContainer` element to catch if a new `responseContainer` is added by mutation.
//  `responseContainer` does not have to be a specific element. It just has to contain the new 'response element'.
// - After `responseContainer` is caught, query for `responseElement` on every mutations.
// The reason for querying instead of 'catching' the node, is that the `respone element` does not have unique tag name, id, or classes to be used to catch the element.
// - After `responseElement` is exits. Start observing the `responseElement` and stop observing `chatContainer`.
// The reason to start another observer, the one that focused on `responseElement`, is for performance reason.
// So we do not need to count whether a segment has beend added or not on every mutations. Consider there will be a lot of element mutations happenning during receiving new response.
// - Every time a segment 'n' is added, announce right away the segments before the last one, schedule to announce the segment 'n' after some delay, and cancel the previously set timeout.
// We can set the delay a bit long, like 4 seconds. It will not increase user's wait time since screen reader need to read the earlier segments first.
// It will only effect response that has only 1 segment.


// Below is a part of the hierarchy of chat container to used to parse a response in this file :
//div#chat-history
//	infinite-scroller [data-test-id="chat-history-container"]
//		div.conversation-container
//	    div.conversation-container
//			user-query
//			model-response
//				div
//					response-container
//						div.response-container
//							div.response-container-header
//								div.response-container-header-controls
//								div.response-container-header-status
//							div.presented-response-container
//								div.avatar-gutter
//								div.response-container-content
//									div.response-content
//										message-content#message-content-id-r_d1657b4a1ad3e5b2.model-response-text

