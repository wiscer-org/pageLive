// This file contains subset and simplified HTML hierarchy of grok page to help understand how to parse chat content.


// Hierarchy subset on the chat container:
//  main.@...
//     ...
//          div[id^="response-"].items-end  // prompt container
//              div.message-buble
//                  div.relative
//                      div.response-content-markdown
//          div[id^="response-"].items-start // response container
//              div.message-buble
//                  div.relative
//                      div.response-content-markdown