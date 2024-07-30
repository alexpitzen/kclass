// ==UserScript==
// @name         kclass
// @namespace    http://tampermonkey.net/
// @version      2024-01-08
// @description  improvements to class-navi grading layout when zoomed in
// @author       You
// @match        https://class-navi.digital.kumon.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

function makebtn(className, innerText, fn) {
    let btn = document.createElement("button");
    btn.className = className;
    btn.innerText = innerText;
    btn.style.display = "none";
    document.body.appendChild(btn);
    btn.onclick = fn;
}

// Your code here...
makebtn("headerZindexBtn", "H", () => {
    let header = document.getElementsByClassName("grading-header")[0];
    if (header.classList.contains("z300")) {
        header.classList.remove("z300");
    } else {
        header.classList.add("z300");
    }
});

makebtn("shiftbtn", "↕", () => {
    let container = document.getElementsByClassName("worksheet-container")[0];
    if (container.classList.contains("shiftup")) {
        container.classList.remove("shiftup");
    } else {
        container.classList.add("shiftup");
    }
});

makebtn("xallbtn", "x all", () => {
    document.querySelectorAll(".worksheet-container .worksheet-container.selected .mark-box-target").forEach((box) => box.click());
});
// TODO up/down "scroll" buttons on 200+% or slightly reduce height
let z = document.createElement("style");
z.innerHTML = `
* {
  touch-action: auto !important;
}

app-scroll-to-top-button {
  display: none;
}

.dashboard-progress-chart .container.plan.isFloating {
  width: 100% !important;
  height: 100% !important;
  max-width: unset !important;
  max-height: unset !important;
}

body:has(.dashboard-progress-chart .container.plan.isFloating) {
  scrollbar-width: none;
}

/*# sourceMappingURL=all.css.map */
@media screen and (orientation: landscape) and (max-height: 733px) {
  .container {
    min-width: unset !important;
  }
  .content-bg {
    padding: 0px !important;
  }
  .scroll-content {
    overflow-x: auto !important;
  }
  .grading-header-icon {
    display: none;
  }
  .grading-header-title {
    display: none;
  }
  .grading-header {
    min-height: unset !important;
    padding: 0px !important;
  }
  .grading-header .backBtnWrap {
    height: unset !important;
  }
  .grading-header .btn-subject {
    border: none !important;
    height: unset !important;
    line-height: 20px !important;
    min-width: unset !important;
    padding: 0px 10px !important;
  }
  .grading-header .full-name {
    line-height: 20px !important;
  }
  .grading-header .header-left {
    line-height: 10px;
  }
  .grading-header .name-kana {
    display: none;
  }
  .grading-header .student-info-btn::before {
    top: 8px !important;
  }
  .grading-header .student-info-right .num {
    height: 20px !important;
    line-height: 20px !important;
    min-width: 20px !important;
  }
  .grading-header .student-pulldown-root {
    min-height: unset !important;
    margin-left: 0px !important;
  }
  .grading-header #studentInfoPullDown {
    min-height: unset;
    border: 0px !important;
  }
  .worksheet-tool {
    margin-left: 0px !important;
  }
  /* Grading */
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-tool):has(.content-answer-content) .xallbtn {
    /* account for dynamic width answer content */
    left: calc((100vw - 410px) * 2 / 3 + 385px + 6px) !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .content-answer-content {
    /* dynamic width answer content so our xallbtn can have "fixed" position relative to the other buttons */
    width: calc((100vw - 410px) * 2 / 3) !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-tool):not(:has(.content-answer-content)):has(.worksheet-group.single) .xallbtn {
    left: 391px;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-group.single) .xallbtn {
    /* for this size, only show if in single page mode */
    display: unset !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-tool) .xallbtn {
    position: fixed;
    top: 180px;
    height: 30px;
    width: 30px;
    z-index: 252;
    padding: 0;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(div.worksheet-container.landscape.selected,
  div.worksheet-group.landscape.selected) .xallbtn {
    left: 676px;
  }
}

/*# sourceMappingURL=horizontal_dynamic_big.css.map */
@media screen and (orientation: landscape) and (max-height: 633px) {
  /* Less space on grade column */
  .studentRowHeader .gradeColumn {
    width: unset !important;
    min-width: unset !important;
    padding-left: 0px !important;
  }
  .studentRow .gradeColumn {
    flex: none !important;
  }
  /* login page */
  div.root {
    min-width: unset !important;
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
  /* Grading */
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .answersheetToolbarContener {
    top: 23px !important;
    /* left: 386px !important; */
    left: calc((100vw - 410px) * 2 / 3 - 9px) !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .content-bg {
    overflow-x: auto !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .content-answer-content {
    /* TODO */
    /* page width 370
     * toolbar 40
     * 2:1 */
    /* width: 395px !important; */
    width: calc((100vw - 410px) * 2 / 3) !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .content-detail {
    position: fixed;
    top: -1px;
    z-index: 251;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-tool):has(.content-answer-content) .content-menu {
    width: calc((100vw - 410px) / 3 + 16px) !important;
    /*width: 170px !important;*/
    padding-left: 14px !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-tool):has(.content-answer-content) .content-menu-scroll:not(.close) {
    /*width: 162px !important;*/
    width: calc((100vw - 410px) / 3 + 8px) !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-tool):has(.content-answer-content) .headerZindexBtn, body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-tool):has(.content-answer-content) .xallbtn {
    left: calc((100vw - 410px) * 2 / 3 + 370px + 6px) !important;
    /*left: 771px;*/
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-tool):not(:has(.content-answer-content)) .content-menu {
    width: 170px !important;
    padding-left: 14px !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-tool):not(:has(.content-answer-content)) .content-menu-scroll:not(.close) {
    width: 162px !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-tool):not(:has(.content-answer-content)) .headerZindexBtn, body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-tool):not(:has(.content-answer-content)) .xallbtn {
    left: 376px !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-tool):not(:has(.content-answer-content)) .z300 {
    z-index: 300 !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .content-menu-scroll {
    bottom: 0 !important;
    top: 20px !important;
    z-index: 250 !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .content-scroll-container {
    margin-right: 0px !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .grading-toolbar-container {
    top: 0px !important;
    z-index: 252 !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-tool) .xallbtn {
    display: unset !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-tool) .headerZindexBtn {
    display: unset !important;
    position: fixed;
    top: 80px;
    height: 30px;
    width: 30px;
    z-index: 252;
    padding: 0;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(div.worksheet-container.landscape.selected,
  div.worksheet-group.landscape.selected) .headerZindexBtn, body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(div.worksheet-container.landscape.selected,
  div.worksheet-group.landscape.selected) .xallbtn {
    left: 676px;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(div.worksheet-container.landscape.selected,
  div.worksheet-group.landscape.selected) .worksheet-tool {
    margin-left: 671px !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .navigator-header-top button {
    padding: 10px 0px !important;
    word-break: break-word !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):not(:has(.content-answer-content)) #studentInfoPullDown {
    min-width: 372px !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .worksheet-container {
    margin: 1px 0px !important;
    outline-width: 1px !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .worksheet-container > .worksheet-group.single:last-child .worksheet-group-page:last-child .worksheet-container > div {
    margin-top: -1px;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .worksheet-group {
    margin: 0px -19px !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .worksheet-navigator-page {
    width: 40px !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .worksheet-tool {
    margin-left: 371px !important;
    z-index: 252 !important;
  }
}

/*# sourceMappingURL=horizontal_dynamic_medium.css.map */
@media screen and (orientation: landscape) and (max-height: 613px) {
  /* Grading */
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-tool):not(:has(.content-answer-content)) .shiftbtn {
    left: 376px;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-tool):not(:has(.content-answer-content)):has(div.worksheet-group.landscape.selected,
  div.worksheet-container.landscape.selected) .shiftbtn {
    left: 676px;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-tool):has(.content-answer-content) .shiftbtn {
    left: calc((100vw - 410px) * 2 / 3 + 370px + 6px) !important;
    /*left: 771px;*/
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-tool) .shiftbtn {
    display: unset !important;
    position: fixed;
    top: 130px;
    height: 30px;
    width: 30px;
    z-index: 252;
    padding: 0;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .worksheet-container.shiftup > .worksheet-group .worksheet-container > div {
    margin-top: calc(100vh - 615px);
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .worksheet-container.shiftup > .worksheet-group.single:last-child .worksheet-group-page:last-child .worksheet-container > div {
    margin-top: calc(100vh - 617px);
  }
}

/*# sourceMappingURL=horizontal_dynamic_small.css.map */
@media screen and (orientation: portrait) and (max-width: 977px) {
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) {
    /* Show worksheet tool */
    /* Show H button */
    /* Show x all button */
    /* Move worksheet above header */
    /* Answers */
    /* Grading header */
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .container {
    min-width: unset !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .content-bg {
    padding: 0px !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .scroll-content {
    overflow-x: auto !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .worksheet-tool {
    margin-left: 371px !important;
    z-index: 252 !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .worksheet-container {
    outline-width: 1px !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .headerZindexBtn {
    left: 376px;
    display: unset !important;
    position: fixed;
    top: 80px;
    height: 30px;
    width: 30px;
    z-index: 252;
    padding: 0;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .xallbtn {
    left: 376px;
    display: unset !important;
    position: fixed;
    top: 130px;
    height: 30px;
    width: 30px;
    z-index: 252;
    padding: 0;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .z300 {
    z-index: 300 !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .content-detail {
    position: fixed;
    top: -1px;
    left: -1px;
    z-index: 251;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .content-answer-content {
    position: fixed !important;
    left: 0;
    bottom: 0;
    height: calc(100% - 614px);
    width: 100% !important;
    z-index: 1;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .answersheetToolbarContener {
    right: 14px;
    bottom: calc(100% - 614px - 40px);
    left: unset !important;
    top: unset !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .grading-header-icon {
    display: none;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .grading-header-title {
    display: none;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .grading-header {
    min-height: unset !important;
    padding: 0px !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .grading-header .backBtnWrap {
    height: unset !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .grading-header .btn-subject {
    border: none !important;
    height: unset !important;
    line-height: 20px !important;
    min-width: unset !important;
    padding: 0px 10px !important;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .grading-header .full-name {
    line-height: 20px !important;
    width: unset !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .grading-header .header-left {
    line-height: 10px;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .grading-header .name-kana {
    display: none;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .grading-header .student-info-btn::before {
    top: 8px !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .grading-header .student-info-right .num {
    height: 20px !important;
    line-height: 20px !important;
    min-width: 20px !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .grading-header .student-pulldown-root {
    min-height: unset !important;
    min-width: unset !important;
    margin-left: 0px !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .grading-header #studentInfoPullDown {
    min-height: unset;
    min-width: unset !important;
    border: 0px !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .grading-header .student-info-left {
    min-width: unset !important;
  }
}

/*# sourceMappingURL=vertical_big.css.map */
`; //`

document.body.appendChild(z);

})();
