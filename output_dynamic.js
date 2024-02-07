// ==UserScript==
// @name         kclass
// @namespace    http://tampermonkey.net/
// @version      2024-01-08
// @description  try to take over the world!
// @author       You
// @match        https://class-navi.digital.kumon.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Your code here...
    let headerbtn = document.createElement("button");
    headerbtn.className = "headerZindexBtn";
    headerbtn.innerText = "H";
    headerbtn.style.display = "none";
    document.body.appendChild(headerbtn);
    headerbtn.onclick = () => {
        let header = document.getElementsByClassName("grading-header")[0];
        if (header.classList.contains("z300")) {
            header.classList.remove("z300");
        } else {
            header.classList.add("z300");
        }
    };

    let shiftbtn = document.createElement("button");
    shiftbtn.className = "shiftbtn";
    shiftbtn.innerText = "↕";
    shiftbtn.style.display = "none";
    document.body.appendChild(shiftbtn);
    shiftbtn.onclick = () => {
        let container = document.getElementsByClassName("worksheet-container")[0];
        if (container.classList.contains("shiftup")) {
            container.classList.remove("shiftup");
        } else {
            container.classList.add("shiftup");
        }
    };

    // TODO up/down "scroll" buttons on 200+% or slightly reduce height
    let z = document.createElement("style");
    z.innerHTML = `
.studentRow .gradeColumn {
    flex: none !important;
}
* {
    touch-action: auto !important;
}
div.root > div.logo {
    margin-top: 0 !important;
}
div.root > div.sub-logo {
    margin: 0 !important;
}
button.login-btn {
    margin-top: 0 !important;
}
button.btn-pulldown-language {
    margin-top: 0 !important;
}
@media screen and (orientation:landscape) {
    .btn-subject {
        border: none !important;
        height: unset !important;
        line-height: 20px !important;
        min-width: unset !important;
        padding: 0px 10px !important;
    }
    .grading-header {
        min-height: unset !important;
    }
    .backBtnWrap {
        height: unset !important;
    }
    .container {
        min-width: unset !important;
    }
    .content-bg {
        padding: 0px !important;
    }
    .full-name {
        line-height: 20px !important;
    }
    .grading-header {
        padding: 0px !important;
    }
    .grading-header-icon {
        display: none;
    }
    .grading-header-title {
        display: none;
    }
    .header-left {
        line-height: 10px;
    }
    .name-kana {
        display: none;
    }
    .scroll-content {
        overflow-x: auto !important;
    }
    .student-info-btn::before {
        top: 8px !important;
    }
    .student-info-right .num {
        height: 20px !important;
        line-height: 20px !important;
        min-width: 20px !important;
    }
    .student-pulldown-root {
        min-height: unset !important;
        margin-left: 0px !important;
    }
    #studentInfoPullDown {
        min-height: unset;
        border: 0px !important;
    }
    .worksheet-tool {
        margin-left: 0px !important;
    }
}
@media screen and (orientation:landscape) and (max-height:633px) {
    .answersheetToolbarContener {
        top: 23px !important;
        /* left: 386px !important; */
        left: calc((100vw - 410px) * 2 / 3 - 9px) !important;
    }
    .content-bg {
        overflow-x: auto !important;
    }
    .content-answer-content {
        /* TODO */
        /* page width 370
         * toolbar 40
         * 2:1 */
        /* width: 395px !important; */
        width: calc((100vw - 410px) * 2 / 3) !important;
    }
    .content-detail {
        position: fixed;
        top: -1px;
        z-index: 251;
    }
    body:has(.worksheet-tool):has(.content-answer-content) .content-menu {
        width: calc((100vw - 410px) / 3 + 16px) !important;
        /*width: 170px !important;*/
        padding-left: 14px !important;
    }
    body:has(.worksheet-tool):not(:has(.content-answer-content)) .content-menu {
        width: 170px !important;
        padding-left: 14px !important;
    }
    .content-menu-scroll {
        bottom: 0 !important;
        top: 20px !important;
        z-index: 250 !important;
    }
    body:has(.worksheet-tool):has(.content-answer-content) .content-menu-scroll:not(.close) {
        /*width: 162px !important;*/
        width: calc((100vw - 410px) / 3 + 8px) !important;
    }
    body:has(.worksheet-tool):not(:has(.content-answer-content)) .content-menu-scroll:not(.close) {
        width: 162px !important;
    }
    .content-scroll-container {
        margin-right: 0px !important;
    }
    .grading-toolbar-container {
        top: 0px !important;
        z-index: 252 !important;
    }
    body:has(.worksheet-tool) .headerZindexBtn {
        display: unset !important;
        position: fixed;
        top: 80px;
        height: 30px;
        width: 30px;
        z-index: 252;
        padding: 0;
    }
    body:has(.worksheet-tool):not(:has(.content-answer-content)) .headerZindexBtn {
        left: 376px;
    }
    body:has(.worksheet-tool):has(.content-answer-content) .headerZindexBtn {
        left: calc((100vw - 410px) * 2 / 3 + 370px + 6px) !important;
        /*left: 771px;*/
    }
    body:has(.worksheet-tool):has(div.worksheet-container.landscape.selected) .headerZindexBtn {
        left: 676px;
    }
    body:has(.worksheet-tool):has(div.worksheet-group.landscape.selected) .headerZindexBtn {
        left: 676px;
    }
    .navigator-header-top button {
        padding: 10px 0px !important;
        word-break: break-word !important;
    }
    body:not(:has(.content-answer-content)) #studentInfoPullDown {
        min-width: 372px !important;
    }
    .worksheet-container {
        margin: 1px 0px !important;
        outline-width: 1px !important;
    }
    .worksheet-container > .worksheet-group.single:last-child .worksheet-group-page:last-child .worksheet-container > div {
        margin-top: -1px;
    }
    .worksheet-group {
        margin: 0px -19px !important;
    }
    .worksheet-navigator-page {
        width: 40px !important;
    }
    .worksheet-tool {
        margin-left: 371px !important;
        z-index: 252 !important;
    }
    body:has(div.worksheet-group.landscape.selected) .worksheet-tool {
        margin-left: 671px !important;
    }
    body:has(div.worksheet-container.landscape.selected) .worksheet-tool {
        margin-left: 671px !important;
    }
    body:not(:has(.content-answer-content)) .z300 {
        z-index: 300 !important;
    }
}
@media screen and (orientation:landscape) and (max-height:613px) {
    body:has(.worksheet-tool) .shiftbtn {
        display: unset !important;
        position: fixed;
        top: 140px;
        height: 30px;
        width: 30px;
        z-index: 252;
        padding: 0;
    }
    body:has(.worksheet-tool):not(:has(.content-answer-content)) .shiftbtn {
        left: 376px;
    }
    body:has(.worksheet-tool):has(.content-answer-content) .shiftbtn {
        left: calc((100vw - 410px) * 2 / 3 + 370px + 6px) !important;
        /*left: 771px;*/
    }
    body:has(.worksheet-tool):not(:has(.content-answer-content)):has(div.worksheet-group.landscape.selected) .shiftbtn {
        left: 676px;
    }
    body:has(.worksheet-tool):not(:has(.content-answer-content)):has(div.worksheet-container.landscape.selected) .shiftbtn {
        left: 676px;
    }
    .worksheet-container.shiftup > .worksheet-group .worksheet-container > div {
        margin-top: calc(100vh - 615px);
    }
    .worksheet-container.shiftup > .worksheet-group.single:last-child .worksheet-group-page:last-child .worksheet-container > div {
        margin-top: calc(100vh - 617px);
    }
}
`; //`

    document.body.appendChild(z);

})();