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
@media screen and (max-width:1098px) and (max-height:686px) and (min-width:1097px) and (min-height:685px)  {
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

.studentRow .gradeColumn {
    flex: none !important;
}
* {
    touch-action: auto !important;
}
@media screen and (width:960px) and (height:600px) {
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





    .answersheetToolbarContener {
        top: 23px !important;
        left: 386px !important;
    }
    .content-bg {
        overflow-x: auto !important;
    }
    .content-answer-content {
        width: 395px !important;
    }
    .content-detail {
        position: fixed;
        top: -1px;
        z-index: 251;
    }
    .content-menu {
        width: 170px !important;
        padding-left: 14px !important;
    }
    .content-menu-scroll {
        bottom: 0 !important;
        top: 20px !important;
        z-index: 250 !important;
    }
    .content-menu-scroll:not(.close) {
        width: 162px !important;
    }
    .content-scroll-container {
        margin-right: 150px !important;
    }
    .grading-toolbar-container {
        top: 0px !important;
        z-index: 252 !important;
    }
    body:has(.worksheet-tool):not(:has(.content-answer-content)) .headerZindexBtn {
        display: unset !important;
        position: fixed;
        top: 80px;
        height: 30px;
        width: 30px;
        left: 376px;
        z-index: 252;
        padding: 0;
    }
    body:has(.worksheet-tool):not(:has(.content-answer-content)):has(div.worksheet-group.landscape) .headerZindexBtn {
        left: 676px;
    }
    .navigator-header-top button {
        padding: 10px 0px !important;
        word-break: break-word !important;
    }
    body:has(.worksheet-tool):not(:has(.content-answer-content)) .shiftbtn {
        display: unset !important;
        position: fixed;
        top: 140px;
        height: 30px;
        width: 30px;
        left: 376px;
        z-index: 252;
        padding: 0;
    }
    body:has(.worksheet-tool):not(:has(.content-answer-content)):has(div.worksheet-group.landscape) .shiftbtn {
        left: 676px;
    }
    body:has(.worksheet-tool):has(.content-answer-content) .shiftbtn {
        display: unset !important;
        position: fixed;
        top: 140px;
        height: 30px;
        width: 30px;
        left: 771px;
        z-index: 252;
        padding: 0;
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
    .worksheet-container.shiftup > .worksheet-group .worksheet-container > div {
        margin-top: -15px;
    }
    .worksheet-container.shiftup > .worksheet-group.single:last-child .worksheet-group-page:last-child .worksheet-container > div {
        margin-top: -17px;
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
    body:has(div.worksheet-group.landscape) .worksheet-tool {
        margin-left: 671px !important;
    }
    body:not(:has(.content-answer-content)) .z300 {
        z-index: 300 !important;
    }
}
@media screen and (max-width:1242px) and (max-height:699px) and (min-width:1241px) and (min-height:698px)  {
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
@media screen and (max-width:1093px) and (max-height:615px) and (min-width:1092px) and (min-height:614px)  {
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





    .answersheetToolbarContener {
        top: 23px !important;
        left: 366px !important;
    }
    .content-bg {
        overflow-x: auto !important;
    }
    .content-answer-content {
        width: 375px !important;
    }
    .content-detail {
        position: fixed;
        top: -1px;
        z-index: 251;
    }
    .content-menu {
        width: 170px !important;
        padding-left: 14px !important;
    }
    .content-menu-scroll {
        bottom: 0 !important;
        top: 20px !important;
        z-index: 250 !important;
    }
    .content-menu-scroll:not(.close) {
        width: 162px !important;
    }
    .content-scroll-container {
        margin-right: 150px !important;
    }
    .grading-toolbar-container {
        top: 0px !important;
        z-index: 252 !important;
    }
    body:has(.worksheet-tool):not(:has(.content-answer-content)) .headerZindexBtn {
        display: unset !important;
        position: fixed;
        top: 80px;
        height: 30px;
        width: 30px;
        left: 376px;
        z-index: 252;
        padding: 0;
    }
    body:has(.worksheet-tool):not(:has(.content-answer-content)):has(div.worksheet-group.landscape) .headerZindexBtn {
        left: 656px;
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
    body:has(div.worksheet-group.landscape) .worksheet-tool {
        margin-left: 671px !important;
    }
    body:not(:has(.content-answer-content)) .z300 {
        z-index: 300 !important;
    }
}

`; //`

    document.body.appendChild(z);

})();
