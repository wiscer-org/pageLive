// This file contains subset and simplified HTML hierarchy of grok page to help understand how to parse chat content.


// Hierarchy subset on the chat container:
//  main.@container
//      .@container/nav
//      .@container/chat
//          div
//          div
//              div.w-full.h-full.items-center
//                  div[id^="response-"].items-end  // prompt container
//                      div.message-bubble
//                          div.relative
//                              div.response-content-markdown
//                  div[id^="response-"].items-start // response container
//                      div.message-bubble
//                          div.relative
//                              div.response-content-markdown