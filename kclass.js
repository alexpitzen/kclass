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

    let xallbtn = document.createElement("button");
    xallbtn.className = "xallbtn";
    xallbtn.innerText = "x all";
    xallbtn.style.display = "none";
    document.body.appendChild(xallbtn);
    xallbtn.onclick = () => {
        document.querySelectorAll(".worksheet-container .worksheet-container.selected .mark-box-target").forEach((box) => box.click());
    }

    // TODO up/down "scroll" buttons on 200+% or slightly reduce height
    let z = document.createElement("style");
    z.innerHTML = `
