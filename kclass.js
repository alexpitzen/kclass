const customToolbar = document.createElement("div");
customToolbar.className = "customToolbar";
customToolbar.style.display = "none";
document.body.appendChild(customToolbar);

function makebtn(className, innerText, title, container, fn) {
    let btn = document.createElement("button");
    btn.className = className;
    btn.innerHTML = innerText;
    btn.title = title;
    container.appendChild(btn);
    btn.onclick = fn;
    btn.addEventListener("mouseover", (e) => {
        // Prevent a bunch of errors being sent because of some code looking at .className and assuming it's a string
        e.stopPropagation();
    });
    return btn;
}

function showHeader(show) {
    let header = document.getElementsByClassName("grading-header")[0];
    if (!show && header.classList.contains("z300")) {
        header.classList.remove("z300");
    } else if (show && !header.classList.contains("z300")) {
        header.classList.add("z300");
    }
}

function toggleHeader() {
    let header = document.getElementsByClassName("grading-header")[0];
    if (header.classList.contains("z300")) {
        header.classList.remove("z300");
    } else {
        header.classList.add("z300");
    }
}

makebtn(
    "hoverToolbarBtn",
    `<svg width="15px" height="15px" viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg" color="#000000"><path d="M21 12L3 12L8 7M3 12L8 17" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    "Toggle pen toolbar visibility",
    customToolbar,
    () => {
        let gradingToolbarBox = document.querySelector(".grading-toolbar-box");
        if (gradingToolbarBox.classList.contains("close")) {
            gradingToolbarBox.querySelector(".toolbar-item")?.click();
        } else {
            StampLib.collapseToolbar();
        }
    }
);

makebtn("headerZindexBtn", "H", "Toggle header bar visibility", customToolbar, () => {
    toggleHeader();
});

makebtn(
    "shiftbtn",
    `<svg width="15px" height="15px" viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg" color="#000000"><path d="M12 21L12 3L17 8M12 3L7 8M12 21L7 16M12 21L17 16" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    "Toggle shifting the page up/down",
    customToolbar,
    () => {
        let container = document.getElementsByClassName("worksheet-container")[0];
        if (container.classList.contains("shiftup")) {
            container.classList.remove("shiftup");
        } else {
            container.classList.add("shiftup");
        }
    }
);

const xallbtn = makebtn("xallbtn", "x all", "Click every grading box on the page", customToolbar, () => {
    document.querySelectorAll(".worksheet-container .worksheet-container.selected .mark-box-target").forEach((box) => box.click());
    xallbtn.blur();
});

const drawtab = document.createElement("div");
drawtab.className = "drawtab hidden";
document.body.appendChild(drawtab);

drawtab.addEventListener("mouseleave", (e) => {
    let rect = drawtab.getBoundingClientRect();
    if (
        e.x <= rect.left
        || e.x >= rect.right - 2
        || e.y <= rect.top
        || e.y >= rect.bottom - 2
    ) {
        hideDrawTab(true);
    }
});

function hideDrawTab(hide) {
    if (hide) {
        drawtab.classList.add("hidden");
    } else {
        drawtab.classList.remove("hidden");
    }
    return true;
}

const penSettings = {
    "pen": {
        width: 2,
        alpha: 255,
    },
    "thick-highlighter": {
        width: 25,
        alpha: 50
    },
    "thin-highlighter": {
        width: 5,
        alpha: 50
    }
};
const penIcons = {
    "pen": `<svg width="20" height="20" viewBox="0 0 18.24 18.24" color="#000000" xmlns="http://www.w3.org/2000/svg" ><g id="g1" transform="translate(-3.173,-2.84)"><path id="path3" style="fill-rule:evenodd" d="m 3.486,16.01 -0.327,3.57 c 0.08,0.89 1.231,1.58 1.737,1.53 L 8.418,20.73 C 9.147,20.53 9.644,19.95 9.964,19.61 13.42,16.11 17.12,12.25 20.9,8.609 21.76,7.588 21.38,5.886 20.79,5.28 L 18.85,3.379 C 17.75,2.318 16.09,2.838 15.36,3.523 L 4.084,14.88 C 3.652,15.31 3.501,15.75 3.486,16.01 Z M 15.42,5.627 18.67,8.915 19.79,7.628 C 20.05,7.242 20.03,6.654 19.73,6.339 L 17.9,4.552 C 17.42,4.173 16.97,4.165 16.65,4.452 Z M 5.547,15.5 c -0.371,0.41 2.855,3.58 3.137,3.28 L 17.56,9.902 14.34,6.715 Z m -0.636,0.83 c -0.07,0.65 -0.502,3.03 -0.181,3.23 0.216,0.2 2.03,0 3.119,-0.19 C 5.543,17.58 4.926,16.2 4.911,16.33 Z" /></g></svg>`,
    "thick-highlighter": `<svg viewBox="0 0 497.4 542" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><g id="g6" transform="translate(0,18.69)"><path d="M 186.6,453.4 447.1,183.6 C 463.8,166.3 484,143 494.9,120.9 l 2.5,-5.1 -135,-134.49 -5.1,2.63 C 335.7,-4.899 316.1,9.353 299.1,26.72 L 39.36,293.8 l -0.38,2.5 c -5.54,36.5 -0.96,78.4 -9.62,114.2 l -6.84,28.2 2.17,2.2 L 0,465.6 v 39.3 h 43.31 l 22.46,-20.4 2.17,2.2 8.98,-3.9 C 110.7,468.2 142.5,446 178.8,452.1 Z M 36.69,484.9 H 16 v -12.7 l 20,-20 18.46,18.3 z M 69.68,466.7 41.49,435.1 C 51.71,405 51.47,353.8 52.12,319.2 L 159.5,431.7 c -32.2,5.7 -59.77,22.2 -89.82,35 z M 94.47,337.4 185.7,246.7 c 7.1,-6.9 16.4,-10.9 26.3,-10.9 20.6,0 44,25.8 44,46.3 0,10 -3.9,19.3 -10.9,26.4 L 152,401.6 Z m 68.83,75.5 93.1,-93.1 c 10.1,-10.1 15.6,-23.4 15.6,-37.7 0,-29.3 -30.6,-62.3 -60,-62.3 -14.2,0 -27.4,5.6 -37.6,15.6 L 83.16,326.1 58.14,297.4 310.6,37.9 C 324.9,23.16 341.4,10.73 359.4,0.9131 L 478,119.1 c -9.4,18.3 -22.8,34.6 -37.2,49.3 L 182.2,434 Z" id="path1" /><rect x="-406" y="37.07" transform="rotate(-135)" width="16" height="135.8" id="rect1" style="stroke-width:0.99999" /><rect x="72" y="476.9" width="392" height="46.36" id="rect3" /></g></svg>`,
    "thin-highlighter": `<svg viewBox="0 0 496 496" width="20" height="20" xmlns="http://www.w3.org/2000/svg" ><g id="g4"><path d="M179.832,444.412l266.024-272.904c16.816-17.216,30.656-36.96,41.376-59.184l2.424-5.104L385.544,3.116l-5.176,2.632     c-21.624,11.016-41.192,25.408-58.16,42.784L56.456,321.164l-0.376,2.584c-5.208,36.48-15.208,72.136-29.712,105.968     l-3.848,8.992l2.168,2.176L0,465.572v27.312h43.312L60,476.196l2.168,2.168l8.984-3.848     c33.84-14.504,69.504-24.504,105.976-29.712L179.832,444.412z M36.688,476.884H16v-4.688l20-20l12.688,12.688L36.688,476.884z      M65.832,459.396l-24.344-24.344c12.792-30.048,21.952-61.512,27.728-93.648l90.264,90.264     C127.336,437.444,95.88,446.604,65.832,459.396z M99.312,348.884l93.088-93.088c7.04-7.04,16.392-10.912,26.344-10.912     c20.544,0,37.256,16.712,37.256,37.256c0,9.952-3.872,19.304-10.912,26.344L152,401.572L99.312,348.884z M163.312,412.884     l93.088-93.088c10.064-10.064,15.6-23.432,15.6-37.656c0-29.368-23.888-53.256-53.256-53.256c-14.224,0-27.592,5.536-37.656,15.6     L88,337.572l-12.76-12.76L333.664,59.708c14.384-14.736,30.8-27.168,48.84-36.992l87.776,87.768     c-9.416,18.344-21.472,35.096-35.88,49.856L175.928,425.5L163.312,412.884z" id="path1" /><rect x="327.996" y="153.003" transform="matrix(-0.7071 -0.7071 0.7071 -0.7071 417.3918 614.6613)" width="16" height="135.767" id="rect1" /><rect x="72" y="476.884" width="392" height="16" id="rect3" /></g></svg>`,
    "eraser": `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg"><g><path d="m 5.505,11.41 0.53,0.53 z M 3,14.95 H 2.25 Z m 9.59,3.54 -0.53,-0.53 z M 9.048,21 v 0.75 z M 11.41,5.505 10.88,4.975 Z m 1.83,12.335 c 0.58,0.59 1.6,-0.52 1.06,-1.06 z M 7.216,9.698 C 6.519,9.001 5.463,10.07 6.156,10.76 Z M 6.035,11.94 11.94,6.035 10.88,4.975 4.975,10.88 Z m 0,6.02 C 5.185,17.11 4.602,16.53 4.223,16.03 3.856,15.55 3.75,15.24 3.75,14.95 h -1.5 c 0,0.75 0.312,1.38 0.78,1.99 0.455,0.6 1.125,1.27 1.945,2.09 z M 4.975,10.88 C 4.155,11.7 3.485,12.37 3.03,12.96 2.562,13.58 2.25,14.2 2.25,14.95 h 1.5 c 0,-0.29 0.106,-0.6 0.473,-1.08 0.379,-0.49 0.962,-1.08 1.812,-1.93 z m 7.085,7.08 c -0.85,0.85 -1.44,1.44 -1.93,1.82 -0.483,0.36 -0.793,0.47 -1.082,0.47 v 1.5 c 0.748,0 1.372,-0.31 1.992,-0.78 0.59,-0.46 1.26,-1.12 2.08,-1.94 z m -7.085,1.07 c 0.82,0.82 1.487,1.48 2.084,1.94 0.614,0.47 1.24,0.78 1.989,0.78 v -1.5 C 8.759,20.25 8.449,20.14 7.968,19.78 7.471,19.4 6.885,18.81 6.035,17.96 Z M 17.96,6.035 c 0.85,0.85 1.44,1.436 1.82,1.933 0.36,0.481 0.47,0.791 0.47,1.08 h 1.5 C 21.75,8.299 21.44,7.673 20.97,7.059 20.51,6.462 19.85,5.795 19.03,4.975 Z m 1.07,-1.06 C 18.21,4.155 17.54,3.485 16.94,3.03 16.33,2.562 15.7,2.25 14.95,2.25 v 1.5 c 0.29,0 0.6,0.106 1.08,0.473 0.5,0.379 1.08,0.962 1.93,1.812 z m -7.09,1.06 C 12.79,5.185 13.38,4.602 13.87,4.223 14.35,3.856 14.66,3.75 14.95,3.75 v -1.5 c -0.75,0 -1.37,0.312 -1.99,0.78 -0.59,0.455 -1.26,1.125 -2.08,1.945 z M 14.3,16.78 7.216,9.698 6.156,10.76 13.24,17.84 Z m 5.23,-4.17 c 0.66,-0.66 1.21,-1.23 1.58,-1.77 0.39,-0.55 0.64,-1.125 0.64,-1.792 h -1.5 c 0,0.26 -0.1,0.534 -0.36,0.931 -0.3,0.411 -0.75,0.901 -1.42,1.581 l -2.5,2.52 -3.91,3.88 1.06,1.07 2.95,-2.96 z" fill="#1c274c" id="path1" /></g></svg>`,
};

function updatePenSettings() {
    let penType = document.querySelector("input[name=penType]:checked")?.value || "pen";
    if (penType !== "eraser") {
        StampLib.setPenSettings({
            color: pencolorbtn.value,
            ...penSettings[penType]
        });
    }
    drawbtn.innerHTML = penIcons[penType];
    drawbtn.style.fill = pencolorbtn.value;
}

const drawbtn = makebtn(
    "drawbtn",
    penIcons.pen,
    "Show the draw tab",
    customToolbar,
    () => {
        if (drawtab.classList.contains("hidden")) {
            hideDrawTab(false);
            clearBtn.focus();
            clearBtn.blur();
            updateTextAreaSize();
            updatePenSettings();
        } else {
            hideDrawTab(true);
        }
    }
);
drawbtn.accessKey = "d";

const mobileUpBtn = makebtn(
    "mobileUpBtn",
    `<svg width="15px" height="15px" viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg" color="#000000"><path d="M12 21L12 3L17 8M12 3L7 8" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    "Previous marking page",
    customToolbar,
    goPrevCorrectionPage,
);

const mobileDownBtn = makebtn(
    "mobileDownBtn",
    `<svg width="15px" height="15px" viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg" color="#000000"><path d="M12 3L12 21L7 16M12 21L17 16" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    "Next marking page",
    customToolbar,
    goNextCorrectionPage,
);

function onPageChange(onEnable, onPageEnter=()=>{}, onPageLeave=()=>{}, onDisable=()=>{}, onStartLoading=()=>{}) {
    let loadObserver = new MutationObserver((mutationList, _) => {
        for (const mutation of mutationList) {
            if (mutation.target.nodeName == "LOADING-SPINNER") {
                if (mutation.removedNodes.length) {
                    pageLoad();
                    break;
                } else {
                    onStartLoading();
                    break;
                }
            }
        }
    });
    loadObserver.observe(document.querySelector("app-root"), {childList: true, subtree: true});
    let pageChangeObserver;

    function pageLoad() {
        if (!document.querySelector("app-atd0020p")) {
            return;
        }
        onEnable();
        if (typeof(pageChangeObserver) === "undefined") {
            pageChangeObserver = new MutationObserver((mutationList, _) => {
                for (const mutation of mutationList) {
                    if (mutation.target.classList.contains("selected")) {
                        onPageEnter(mutation.target);
                    } else {
                        onPageLeave(mutation.target);
                    }
                }
            });
        }
        pageChangeObserver.disconnect();
        document.querySelectorAll(".ATD0020P-worksheet-container").forEach(page => {
            pageChangeObserver.observe(page, {attributeFilter:["class"]});
        });
        onPageEnter(document.querySelector(".ATD0020P-worksheet-container.selected"));
    }
    pageLoad();
    return {
        disable: () => {
            loadObserver.disconnect();
            pageChangeObserver?.disconnect();
            onDisable(document.querySelector(".ATD0020P-worksheet-container.selected"));
        },
    };
}

let hdMode;

var _hdmo;
var _hdmo2;

function enableHD() {
    hdMode = onPageChange(
        initHD,
        StampLib.makeHD,
        StampLib.makeSD,
        StampLib.makeSD,
    );
}

function initHD() {
    updatePenSettings();
    document.querySelectorAll(".content-scroll-container .content-bg .content-detail").forEach(detail => {
        detail.style.minWidth = "372px";
        detail.style.width = "372px";
    });

    document.querySelectorAll(".worksheet-group").forEach(i => {
        i.style.width = "410px";
    });

    document.querySelectorAll(".worksheet-group-page").forEach(i => {
        i.style.maxWidth = "410px";
    });

    document.querySelectorAll(".ATD0020P-worksheet-container img.worksheet-img").forEach(i => {
        i.style.height = "612px";
        i.style.width = "370px";
    });

    document.querySelectorAll(".ATD0020P-worksheet-container canvas").forEach(i => {
        i.style.height = "612px";
        i.style.width = "370px";
    });
}

function disableHD() {
    hdMode.disable();
}

// makebtn("textbtn squarebtn", "abc", "", drawtab, () => {
//     texttab.style.display = "unset";
//     textarea.focus();
//     textarea.select();
// });

// TODO move texttab contents into drawtab

// const texttab = document.createElement("div");
// texttab.className = "texttab";
// texttab.style.display = "none";
// drawtab.appendChild(texttab);

// texttab.addEventListener("mouseleave", () => {
//     texttab.style.display = "none";
// });

const drawheader = document.createElement("div");
drawheader.className = "header";
drawtab.appendChild(drawheader);

const buttonsleft = document.createElement("div");
buttonsleft.className = "buttonsleft";
drawheader.appendChild(buttonsleft);

const sizeslider = document.createElement("input");
sizeslider.className = "sizeslider";
sizeslider.type = "range";
sizeslider.value = 25;
sizeslider.min = 10;
sizeslider.max = 100;
sizeslider.title = "Adjust stamp size";
buttonsleft.appendChild(sizeslider);

function changeSizeSlider() {
    let scrollPercent = 0;
    try {
        scrollPercent = drawtab.scrollTop / (drawtab.scrollHeight - drawtab.clientHeight);
    } catch {}
    drawtab.style.setProperty("--sizeslider", `${sizeslider.value} / 100`);
    drawtab.scrollTop = scrollPercent * (drawtab.scrollHeight - drawtab.clientHeight);
    updateTextAreaSize();

    if (stampPrintPreviewDiv?.checkVisibility()) {
        let scale = getScale() * stampPrintPreviewDiv.maxScaleFactor;
        stampPrintPreviewDiv.style.height = `${stampPrintPreviewDiv.stampDimensions.height * scale}px`;
        stampPrintPreviewDiv.style.width = `${stampPrintPreviewDiv.stampDimensions.width * scale}px`;
    }
    if (textPrintPreviewDiv?.checkVisibility()) {
        let writeDimensions = StampLib.getWriteAllDimensions(textarea.value, getScale());
        textPrintPreviewDiv.style.height = `${writeDimensions.height}px`;
        textPrintPreviewDiv.style.width = `${writeDimensions.width}px`;
    }
}

sizeslider.addEventListener("input", changeSizeSlider);

const unlockbtn = makebtn("unlockbtn", "&#128275;", "Unlock the page for writing", buttonsleft, () => {
    stamp.unlockPage();
    hideDrawTab(true);
});

const togglesleft = document.createElement("div");
buttonsleft.appendChild(togglesleft);

const toggleleft1 = document.createElement("div");
toggleleft1.className = "toggle";
togglesleft.appendChild(toggleleft1);

const hdbtn = document.createElement("input");
hdbtn.type = "checkbox";
hdbtn.id = "hdbtn";
hdbtn.className = "hdbtn";
hdbtn.title = "HD mode! Disable this when using pen/eraser";
hdbtn.addEventListener("change", function() {
    if (hdbtn.checked) {
        enableHD();
    } else {
        disableHD();
    }
});
hdbtn.accessKey = "h";

let hdbtnlabel = document.createElement("label");
hdbtnlabel.setAttribute("for", hdbtn.id);
hdbtnlabel.innerText = "HD mode";
hdbtnlabel.title = "HD mode! Disable this when using pen/eraser";

toggleleft1.appendChild(hdbtn);
toggleleft1.appendChild(hdbtnlabel);

function getScale() {
    return sizeslider.value / 100;
}

const buttonsleft2 = document.createElement("span");
buttonsleft2.className = "stackedButtons";
drawheader.appendChild(buttonsleft2);

const pencolorbtn = document.createElement("input");
pencolorbtn.type = "color";
pencolorbtn.value = "#ff2200";
drawbtn.style.fill = pencolorbtn.value;
pencolorbtn.className = "pencolorbtn";
pencolorbtn.accessKey = "c";
function updatePenColor() {
    textarea.style.color = this.value;
    updatePenSettings();
}
pencolorbtn.addEventListener("input", updatePenColor);
pencolorbtn.addEventListener("change", updatePenColor);
pencolorbtn.addEventListener("blur", updatePenColor);
buttonsleft2.appendChild(pencolorbtn);

const penTypeContainer = document.createElement("fieldset");
const penTypeLegend = document.createElement("legend");
penTypeLegend.innerHTML = "Pen type:";
penTypeContainer.appendChild(penTypeLegend);

function createPenType(type, text, checked=false) {
    let div = document.createElement("div");
    let input = document.createElement("input");
    input.type = "radio";
    input.name = "penType";
    input.id = type;
    input.value = type;
    input.checked = checked;
    input.addEventListener("change", function() {
        updatePenSettings();
    })
    let label = document.createElement("label");
    label.setAttribute("for", input.id);
    label.innerText = text;
    div.appendChild(input);
    div.appendChild(label);
    return div;
}

penTypeContainer.appendChild(createPenType("pen", "Pen", true));
penTypeContainer.appendChild(createPenType("thick-highlighter", "Highlighter"));
penTypeContainer.appendChild(createPenType("thin-highlighter", "Thin highlighter"));
let eraserPenType = createPenType("eraser", "Eraser");
eraserPenType.style.display = "none";
penTypeContainer.appendChild(eraserPenType);

drawheader.appendChild(penTypeContainer);

makebtn("undoLast", "Undo stamp", "Undo last stamp", buttonsleft2, () => {
    StampLib.undoLastWriteAll();
});

const buttonsright = document.createElement("span");
buttonsright.className = "stackedButtons right";
drawheader.appendChild(buttonsright);

makebtn("closeDrawTab squarebtn", "x", "Close the draw tab", buttonsright, () => {
    hideDrawTab(true);
});

const clearBtn = makebtn("clearAll", "Clear all drawings", "Clear the entire page (can't be undone)", buttonsright, () => {
    StampLib.clearPage();
});

const drawstamps = document.createElement("div");
drawstamps.className = "stamps";
drawtab.appendChild(drawstamps);

var stampPrintPreviewDiv;

function makeStamp(stamp) {
    let btn = document.createElement("button");
    btn.className = "stampbtn";
    let svg = stamp.svg.cloneNode(true);
    btn.appendChild(svg);
    svg.addEventListener("mouseover", (e) => {
        // Prevent a bunch of errors being sent because of some code looking at .className and assuming it's a string
        e.stopPropagation();
    });
    let stampDimensions = StampLib.getWriteStampDimensions(stamp, 1);
    let maxScaleFactor = 370 / Math.max(stampDimensions.width, stampDimensions.height);
    btn.style.setProperty("--height-limiter", stampDimensions.height <= stampDimensions.width ? 1 : stampDimensions.width / stampDimensions.height);
    btn.onclick = (e) => {
        hideDrawTab(true);
        let scale = getScale() * maxScaleFactor;
        let writeDimensions = {width: stampDimensions.width * scale, height: stampDimensions.height * scale};
        stampPrintPreviewDiv = document.createElement("div");
        stampPrintPreviewDiv.className = "stampPrintPreviewDiv";
        stampPrintPreviewDiv.style.height = `${writeDimensions.height}px`;
        stampPrintPreviewDiv.style.width = `${writeDimensions.width}px`;
        stampPrintPreviewDiv.style.left = `${e.clientX}px`;
        stampPrintPreviewDiv.style.top = `${e.clientY}px`;
        stampPrintPreviewDiv.style["border-color"] = pencolorbtn.value;
        stampPrintPreviewDiv.innerHTML = svg.outerHTML;
        stampPrintPreviewDiv.stampDimensions = stampDimensions;
        stampPrintPreviewDiv.maxScaleFactor = maxScaleFactor;
        printoverlay.appendChild(stampPrintPreviewDiv);
        printoverlay.addEventListener("mouseover", (e) => {
            // Prevent a bunch of errors being sent because of some code looking at .className and assuming it's a string
            e.stopPropagation();
        });
        let mousemovehandler = (e) => {
            stampPrintPreviewDiv.animate({
                left: `${e.clientX}px`,
                top: `${e.clientY}px`,
            }, {duration: 100, fill: "forwards"});
        };
        printoverlay.addEventListener("pointermove", mousemovehandler);
        let printclickhandler = (e) => {
            try {
                let atd = StampLib.getAtd();
                let canvasRect = atd.bcanvas.getBoundingClientRect();
                // let zoomRatio = atd.drawingContext.zoomRatio;
                let zoomRatio = atd.bcanvas.clientHeight / atd.inkHeight;

                let [x, y] = [e.clientX, e.clientY];
                // if it's outside but close to the edge, just set it to the edge
                if (e.clientX < canvasRect.left && e.clientX > canvasRect.left - 10) {
                    x = canvasRect.left;
                }
                if (e.clientY < canvasRect.top && e.clientY > canvasRect.top - 10) {
                    y = canvasRect.top;
                }

                if (
                    x < canvasRect.left
                    || y < canvasRect.top
                    || x > canvasRect.right
                    || y > canvasRect.bottom
                ) {
                    console.log("Outside bounds");
                    return;
                }

                let position = {
                    x: (x - canvasRect.left) / zoomRatio,
                    y: (y - canvasRect.top) / zoomRatio,
                }

                let options = {
                    color: pencolorbtn.value,
                    rainbow: (stampColorType.value == "Rainbow" || stampColorType.value == "Rainbow Fill"),
                    rainbowSpeed: parseFloat(rainbowspeed.value),
                    usePredefinedColor: stampColorType.value == "Unchanged",
                    rainbowFill: stampColorType.value == "Rainbow Fill",
                };

                console.log("position");
                console.log(position);
                console.log("options");
                console.log(options);
                StampLib.writeStampAt(stamp, position, getScale() * maxScaleFactor, options);
            } finally {
                printoverlay.style.display = "none";
                printoverlay.removeEventListener("click", printclickhandler);
                printoverlay.removeChild(stampPrintPreviewDiv);
                printoverlay.removeEventListener("pointermove", mousemovehandler);
            }
        };
        printoverlay.addEventListener("click", printclickhandler);
        printoverlay.style.display = "unset";
    };
    return btn;
}

const textareadiv = document.createElement("div");
drawheader.appendChild(textareadiv);

const textarea = document.createElement("textarea");
textarea.value = "";
textarea.name = "stampTextArea";
textareadiv.appendChild(textarea);
textarea.style.color = "#ff2200";
function updateTextAreaSize() {
    textarea.style.height = "";
    textarea.style.height = `${textarea.scrollHeight}px`;
}
textarea.addEventListener("input", updateTextAreaSize);

var textPrintPreviewDiv;

const textbtn = makebtn("textprintbtn squarebtn", "T", "Stamp the contents of the textbox", textareadiv, (e) => {
    hideDrawTab(true);
    // TODO these dimensions are wrong in HD mode for some reason
    let writeDimensions = StampLib.getWriteAllDimensions(textarea.value, getScale());
    textPrintPreviewDiv = document.createElement("div");
    textPrintPreviewDiv.className = "printPreviewDiv";
    textPrintPreviewDiv.style.height = `${writeDimensions.height}px`;
    textPrintPreviewDiv.style.width = `${writeDimensions.width}px`;
    textPrintPreviewDiv.style.left = `${e.clientX}px`;
    textPrintPreviewDiv.style.top = `${e.clientY}px`;
    textPrintPreviewDiv.style["border-color"] = pencolorbtn.value;
    printoverlay.appendChild(textPrintPreviewDiv);
    let mousemovehandler = (e) => {
        textPrintPreviewDiv.animate({
            left: `${e.clientX}px`,
            top: `${e.clientY}px`,
        }, {duration: 100, fill: "forwards"});
    };
    printoverlay.addEventListener("pointermove", mousemovehandler);
    let printclickhandler = (e) => {
        try {
            let atd = StampLib.getAtd();
            let canvasRect = atd.bcanvas.getBoundingClientRect();
            // let zoomRatio = atd.drawingContext.zoomRatio;
            let zoomRatio = atd.bcanvas.clientHeight / atd.inkHeight;

            let [x, y] = [e.clientX, e.clientY];

            // if it's close to the edge, just set it to the edge
            if (e.clientX < canvasRect.left && e.clientX > canvasRect.left - 10) {
                x = canvasRect.left;
            }
            if (e.clientY < canvasRect.top && e.clientY > canvasRect.top - 10) {
                y = canvasRect.top;
            }

            if (
                x < canvasRect.left
                || y < canvasRect.top
                || x > canvasRect.right
                || y > canvasRect.bottom
            ) {
                console.log("Outside bounds");
                return;
            }

            let position = {
                x: (x - canvasRect.left) / zoomRatio,
                y: (y - canvasRect.top) / zoomRatio,
            }

            StampLib.writeAllAt(textarea.value, position, getScale(), {color: pencolorbtn.value});
        } finally {
            printoverlay.style.display = "none";
            printoverlay.removeEventListener("click", printclickhandler);
            printoverlay.removeChild(textPrintPreviewDiv);
            printoverlay.removeEventListener("pointermove", mousemovehandler);
        }
    };
    printoverlay.addEventListener("click", printclickhandler);
    printoverlay.style.display = "unset";
});

const stampColorTypeLabel = document.createElement("label");
stampColorTypeLabel.setAttribute("for", "stampColorType");
stampColorTypeLabel.innerText = "Stamp Color: ";
drawheader.appendChild(stampColorTypeLabel);

const stampColorType = document.createElement("select");
stampColorType.id = "stampColorType";
drawheader.appendChild(stampColorType);

for (let i = 0; i < 4; i++) {
    let stampColorTypeOption = document.createElement("option");
    stampColorTypeOption.innerText = ["Color Picker", "Rainbow", "Rainbow Fill", "Unchanged"][i];
    stampColorType.appendChild(stampColorTypeOption);
}
stampColorType.value = "Unchanged";

stampColorType.addEventListener("change", function() {
    if (this.value == "Rainbow" || this.value == "Rainbow Fill") {
        rainbowspeed.removeAttribute("disabled");
    } else {
        rainbowspeed.setAttribute("disabled", "");
    }
});

/* TODO - options
 * unchanged outline
 * remove fill outline
 * no fill
 * background
 *
 * clear button
 * single line fill
 */

const rainbowspeed = document.createElement("input");
rainbowspeed.className = "rainbowspeed";
rainbowspeed.type = "range";
rainbowspeed.value = 1;
rainbowspeed.min = 1;
rainbowspeed.max = 130;
rainbowspeed.setAttribute("disabled", "");
rainbowspeed.title = "Adjust speed of rainbow progression";
drawheader.appendChild(rainbowspeed);

for (let stampCategory in StampLib.stamps) {
    const stampSection = document.createElement("details");
    stampSection.innerHTML = `<summary>${stampCategory}</summary>`;
    for (let stamp of StampLib.stamps[stampCategory]) {
        let btn = makeStamp(stamp);
        stampSection.appendChild(btn);
    }
    drawstamps.appendChild(stampSection);
}
drawstamps.children[0].setAttribute("open", "");

const printoverlay = document.createElement("div");
printoverlay.className = "printoverlay";
document.body.appendChild(printoverlay);

function findPinchDisabler() {
    for (let listener of document.eventListeners("touchstart")) {
        if (listener.toString().indexOf("disable pinch zoom") > -1) {
            return listener;
        }
    }
    return null;
}

/* remove the event listener that disable pinch zoom */

let pinchDisablerDisabler = setInterval(() => {
    let pinchDisabler = findPinchDisabler();
    if (pinchDisabler) {
        document.removeEventListener("touchstart", pinchDisabler);
        clearInterval(pinchDisablerDisabler);
        // document.querySelector("meta[content*='user-scalable']").content = "width=device-width, initial-scale=1";
        document.querySelector("meta[content*='user-scalable']").content = "width=410px, initial-scale=1";
    }
}, 1000);

const pointerScroll = (parent, draggable) => {
    let dragging = false;
    let startY = 0;
    let scrollStart = 0;
    let dragged = 0;
    const dragStart = (ev) => {
        dragging = true;
        startY = ev.clientY;
        scrollStart = parent.scrollTop;
        dragged = 0;
    };
    const dragEnd = (ev) => {
        dragging = false;
        if (draggable.hasPointerCapture(ev.pointerId)) {
            draggable.releasePointerCapture(ev.pointerId);
        }
    };
    const drag = (ev) => {
        if (dragging) {
            dragged++;
            parent.scrollTop = scrollStart - (ev.clientY - startY);
            if (dragged == 40) {
                draggable.setPointerCapture(ev.pointerId);
            }
        }
    }

    draggable.addEventListener("pointerdown", dragStart);
    draggable.addEventListener("pointerup", dragEnd);
    draggable.addEventListener("pointermove", drag);
};

pointerScroll(drawtab, drawstamps);

var kclassKeyboardMode = false;
function keyboardMode(enable) {
    if (enable == kclassKeyboardMode) {
        return;
    }
    kclassKeyboardMode = enable;
    enable ? enableKeyboardMode() : disableKeyboardMode();
}

function goLastPage() {
    let pages = document.querySelectorAll(".worksheet-navigator-page");
    pages[pages.length - 1]?.click();
}

function goNextCorrectionPage() {
    let cur = document.querySelector(".worksheet-navigator-page.active");
    let pages = Array.from(document.querySelectorAll(".worksheet-navigator-page"));
    let i = pages.indexOf(cur);
    for (let j = i+1; j < pages.length; j++) {
        if (pages[j].querySelector("span:not(.disabled)")) {
            pages[j].click();
            return;
        }
    }
    if (i == pages.length - 1) {
        doDown();
        return;
    }
    goLastPage();
}

function goPrevCorrectionPage() {
    let cur = document.querySelector(".worksheet-navigator-page.active");
    let pages = Array.from(document.querySelectorAll(".worksheet-navigator-page"));
    let i = pages.indexOf(cur);
    for (let j = i-1; j >= 0; j--) {
        if (pages[j].querySelector("span:not(.disabled)")) {
            pages[j].click();
            break;
        }
    }
}

const kbbtn = document.createElement("input");
kbbtn.type = "checkbox";
kbbtn.id = "kbbtn";
kbbtn.className = "kbbtn";
kbbtn.title = `Navigation:
j: down
k: up
g: top
G: bottom
n: next active page
N: previous active page
D: go to next set
R: switch to reading
M: switch to math
H: header dropdown or show/hide header
p: pause marking (when bottom pause button is visible)
J (hold): scroll answer key down
K (hold): scroll answer key up

Marking (⇧ means shift):
x: match previous markings or x all
X: x all
c: clear x's
A: toggle answers
alt+t: show timestamp of when the page was last changed. *TIMEZONE IS ASSUMED*. Red means the page hasn't been changed since it was last graded (this can be wrong if the student's timezone is different or their clock is wrong)
P: start replay / pause replay
(during replay):
s: stop replay
p: pause / resume replay
2/⇧2: replay 2x speed
8/⇧8: replay 8x speed

Drawing:
d: open the draw tab
p: select pen
h: select highlighter / cycle highlighter type
e: select eraser
u: undo
r: redo
U: undo stamp
-: decrease stamp size
+/=: increase stamp size

With draw tab open:
t: focus the text area
u: set Stamp Color to "Unchanged"
r: set Stamp Color to "Rainbow" / "Rainbow Fill"
c: set Stamp Color to "Color Picker"
p: select pen
h: select highlighter / cycle highlighter type
-: decrease stamp size
+/=: increase stamp size
J (hold): scroll stamps down
K (hold): scroll stamps up
escape: close draw tab

General:
escape: close dialog
backspace: exit/cancel
enter: submit/accept dialog
`;
kbbtn.addEventListener("change", function() {
    keyboardMode(kbbtn.checked);
});
kbbtn.accessKey = "k";

let kbbtnlabel = document.createElement("label");
kbbtnlabel.setAttribute("for", kbbtn.id);
kbbtnlabel.innerText = "Keyboard mode";
kbbtnlabel.title = kbbtn.title;

const toggleleft2 = document.createElement("div");
toggleleft2.className = "toggle";
togglesleft.appendChild(toggleleft2);

toggleleft2.appendChild(kbbtn);
toggleleft2.appendChild(kbbtnlabel);

let autoPenSetter = onPageChange(
    () => {},
    () => {
        let atd = StampLib.getAtd();
        if (atd?.drawingMode) {
            updatePenSettings();
        }
    },
);

var markboxMap = {};

let keyindexmap = [
    "0",
    "!",
    "@",
    "#",
    "$",
    "%",
    "^",
    "&",
    "*",
    "(",
    ")",
    "-",
    "=",
    "_",
    "+",
];
let keyindexdisplay = {
    "!": "⇧1",
    "@": "⇧2",
    "#": "⇧3",
    "$": "⇧4",
    "%": "⇧5",
    "^": "⇧6",
    "&": "⇧7",
    "*": "⇧8",
    "(": "⇧9",
    ")": "⇧0",
    "_": "⇧-",
    "+": "⇧=",
}

function addMarkboxKeys(page) {
    if (!page) return;
    markboxMap = {};
    let boxparent = page.querySelector(".mark-boxs");
    let parentWidth = boxparent?.offsetWidth;
    page.querySelectorAll(".mark-box").forEach((box, index) => {
        let key = index + 1;
        if (key > 9) {
            key = keyindexmap[key - 10];
        } else {
            key = String(key);
        }
        let markboxkey = document.createElement("div");
        if (box.offsetLeft >= 3) {
            markboxkey.style.right = `${parentWidth - box.offsetLeft - 4}px`;
            markboxkey.style.top = `${box.offsetTop + 4}px`;
        } else {
            markboxkey.style.left = "0px";
            markboxkey.style.top = `${box.offsetTop - 7}px`;
        }
        markboxkey.classList.add("markboxkey");
        markboxkey.innerText = keyindexdisplay[key] ?? key;
        markboxMap[key] = index;
        boxparent.appendChild(markboxkey);
    });
}

function removeMarkboxKeys(page) {
    if (!page) return;
    let markboxs = page.querySelector(".mark-boxs");
    markboxs?.querySelectorAll(".markboxkey").forEach(markboxkey => {
        markboxs.removeChild(markboxkey);
    });
}

let markboxKeys;

function keyboardModeHandler(e) {
    if (e.repeat && ["j", "J", "k", "K", "l", "L", "h", "H"].includes(e.key)) return;
    if (e.target.nodeName == "INPUT" || e.target.nodeName == "TEXTAREA") {
        switch (e.key) {
            case "Escape":
                doEscape(e);
                break;
            case "Enter":
                if (e.target.classList.contains("search-input")) {
                    let searchBtn = e.target.parentElement.querySelector(".search-btn");
                    if (searchBtn) {
                        e.preventDefault();
                        searchBtn.click();
                        e.target.blur();
                        if (document.querySelector(".markingList.tabActive")) {
                            if (!document.querySelector(".studentList .kbfocus")) {
                                doMarkingListJK(DOWN);
                            }
                        }
                    }
                }
                break;
        }
        return;
    }
    if (e.altKey && !e.ctrlKey && !e.metaKey) {
        switch (e.key) {
            case "d":
                drawbtn.click();
                break;
            case "t":
                if (timestampUpdater) {
                    disableTimestampDisplay();
                } else {
                    enableTimestampDisplay();
                }
                break;
        }
        return;
    }
    if (e.altKey || e.ctrlKey || e.metaKey) {
        return;
    }
    if (!drawtab.classList.contains("hidden")) {
        // drawtab is open, disable most buttons
        switch (e.key) {
            case "d":
            case "Escape":
                hideDrawTab(true);
                break;
            case "-":
                sizeslider.value--;
                changeSizeSlider();
                break;
            case "+":
            case "=":
                sizeslider.value++;
                changeSizeSlider();
                break;
            case "J":
                startScrolling(1, ".drawtab");
                break;
            case "K":
                startScrolling(-1, ".drawtab");
                break;
            case "h":
                cycleHighlighter();
                break;
            case "p":
                document.querySelector("input[name=penType][value=pen]")?.click();
                break;
            case "r":
                if (stampColorType.value == "Rainbow") {
                    stampColorType.value = "Rainbow Fill";
                } else {
                    stampColorType.value = "Rainbow";
                }
                stampColorType.dispatchEvent(new Event("change"));
                break;
            case "u":
                stampColorType.value = "Unchanged";
                stampColorType.dispatchEvent(new Event("change"));
                break;
            case "c":
                stampColorType.value = "Color Picker";
                stampColorType.dispatchEvent(new Event("change"));
                break;
            case "t":
                textarea.focus();
                textarea.select();
                e.preventDefault();
                break;
        }
    }
    else if (document.querySelector(".markingList.tabActive")) {
        // marking list
        switch (e.key) {
            case "f":
            case "/":
            {
                let searchInput = document.querySelector("input.search-input");
                searchInput.focus();
                searchInput.value = "";
                searchInput.setAttribute("value", "");
                searchInput.dispatchEvent(new Event("input"), {});
                e.preventDefault();
            }
                break;
            case "c":
                clearSearch();
                break;
            case "C":
                document.querySelectorAll(".studentRow .checkbox.checked").forEach((checkbox) => {
                    checkbox.click();
                });
                document.querySelector(".studentList .kbfocus")?.classList.remove("kbfocus");
                break;
            case "g":
                document.querySelector(".studentList:not(.tabItem)").scrollTo(0, 0);
                break;
            case "G":
            {
                let studentList = document.querySelector(".studentList:not(.tabItem)");
                studentList.scrollTo(0, studentList.scrollHeight - studentList.clientHeight);
            }
                break;
            case "J":
                scrollStudents(DOWN);
                break;
            case "K":
                scrollStudents(UP);
                break;
            case "j":
                doMarkingListJK(DOWN);
                break;
            case "k":
                doMarkingListJK(UP);
                break;
            case "h":
                doMarkingListHL(LEFT);
                break;
            case "l":
                doMarkingListHL(RIGHT);
                break;
            case " ":
            {
                let kbfocus = document.querySelector(".studentList .checkbox.kbfocus");
                kbfocus?.click();
                e.preventDefault();
            }
                break;
            case "S":
                document.querySelector(".studentList.tabItem").click();
                break;
            case "r":
                document.querySelector(".studentListUpdateButton").click();
                break;
            case "A":
                document.querySelector("app-student-list-filter-capsule .all")?.click();
                break;
            case "M":
                document.querySelector("app-student-list-filter-capsule .math")?.click();
                break;
            case "R":
                document.querySelector("app-student-list-filter-capsule .KNA")?.click();
                break;
            case "Enter":
            {
                let btn = document.querySelector(".bottomSheet.open .scoreBtn");
                if (btn) {
                    btn.click();
                    break;
                }
                let focusedSet = document.querySelector(".studyBarWrap.kbfocus");
                if (focusedSet) {
                    focusedSet.querySelector(".barWrap")?.click();
                    break;
                }
                doEnter();
            }
                break;
            case "Escape":
                doEscape(e);
                break;
        }
    } else if (document.querySelector(".studentList.tabActive")) {
        // student list
        switch (e.key) {
            case "f":
            case "/":
            {
                let searchInput = document.querySelector("input.search-input");
                searchInput.focus();
                searchInput.value = "";
                searchInput.setAttribute("value", "");
                searchInput.dispatchEvent(new Event("input"), {});
                e.preventDefault();
            }
                break;
            case "c":
                clearSearch();
                break;
            case "M":
                document.querySelector(".markingList.tabItem").click();
                break;
            case "J":
                scrollStudents(DOWN);
                break;
            case "K":
                scrollStudents(UP);
                break;
            case "r":
                document.querySelector(".studentListUpdateButton").click();
                break;
        }
    } else if (document.querySelector(".ATD0020P-worksheet-container.selected")) {
        // grading
        switch(e.key) {
            case "j":
                doDown();
                break;
            case "k":
                doUp();
                break;
            case "g":
                document.querySelectorAll(".worksheet-navigator-page span:not(.disabled)")[0]?.click();
                break;
            case "G":
                goLastPage();
                break;
            case "X":
                xallbtn?.click();
                break;
            case "x":
                matchPreviousMarkings();
                break;
            case "c":
                clearMarkboxs();
                break;
            case "Backspace":
                doBackspace();
                break;
            case "n":
                goNextCorrectionPage();
                break;
            case "N":
                goPrevCorrectionPage();
                break;
            case "p":
                doP();
                break;
            case "P":
            {
                let playbackControl = getPlaybackControl();
                if (playbackControl) {
                    playbackControl.querySelector(".play,.pause").click();
                    return;
                }
                StampLib.expandToolbar();
                document.querySelector(".grading-toolbar-box .grading-toolbar .play").click();
                StampLib.collapseToolbar();
            }
                break;
            case "s":
                doS();
                break;
            case "u":
            {
                let atd = StampLib.getAtd();
                atd.undoInk();
                atd.penUpFunc(atd); // updates the models in angular
            }
                break;
            case "U":
                StampLib.undoLastWriteAll();
                break;
            case "r":
            {
                let atd = StampLib.getAtd();
                atd.redoInk();
                atd.penUpFunc(atd); // updates the models in angular
            }
                break;
            case "2":
            case "@":
                do2(e.key);
                break;
            case "8":
            case "*":
                do8(e.key);
                break;
            case "A":
                document.querySelector("#AnswerDisplayButton")?.click();
                break;
            case "Enter":
                doEnter();
                break;
            case "Escape":
                doEscape(e);
                break;
            case "d":
                e.preventDefault();
                drawbtn.click();
                break;
            case "D":
                document.querySelector(".other-worksheet-button")?.click();
                break;
            case "h":
                cycleHighlighter();
                break;
            case "e":
                selectEraser();
                break;
            case "R":
                clickReading();
                break;
            case "M":
                clickMath();
                break;
            case "H":
                let wasPulldownOpen = isPulldownOpen();
                let pulldownExists = document.querySelector("#studentInfoPullDown.student-info-btn");
                document.querySelector("#studentInfoPullDown")?.click();
                document.querySelector("#studentInfoPullDown")?.blur();
                document.querySelectorAll("#customPulldown > .kbfocus").forEach((p) => {
                    p.classList.remove("kbfocus");
                });
                if (pulldownExists) {
                    if (!wasPulldownOpen) {
                        document.querySelector("#customPulldown > .option-select")?.classList.add("kbfocus");
                        showHeader(true);
                    } else {
                        showHeader(false);
                    }
                } else {
                    toggleHeader();
                }
                break;
            case "J":
                scrollAnswer(DOWN);
                break;
            case "K":
                scrollAnswer(UP);
                break;
            case "-":
                if (drawtab.checkVisibility() || printoverlay.checkVisibility()) {
                    sizeslider.value--;
                    changeSizeSlider();
                } else {
                    doKeyboardDefault("-");
                }
                break;
            case "+":
            case "=":
                if (drawtab.checkVisibility() || printoverlay.checkVisibility()) {
                    sizeslider.value++;
                    changeSizeSlider();
                } else {
                    doKeyboardDefault(e.key);
                }
                break;
            default:
                doKeyboardDefault(e.key);
                break;
        }
    } else if (document.querySelector(".student-profile")) {
        // student profile
        switch(e.key) {
            case "R":
                if (document.querySelector("loading-spinner div")) return;
                document.querySelector(".btn-close")?.click();
                clickReading();
                break;
            case "M":
                if (document.querySelector("loading-spinner div")) return;
                document.querySelector(".btn-close")?.click();
                clickMath();
                break;
            case "S":
                document.querySelector(".dashboard-set-left .btn-primary")?.click();
                break;
            case "J":
                if (document.querySelector(".dashboard-progress-chart.isFloating")) {
                    scrollProgressChart(DOWN);
                } else {
                    scrollDashboard(DOWN);
                }
                break;
            case "K":
                if (document.querySelector(".dashboard-progress-chart.isFloating")) {
                    scrollProgressChart(UP);
                } else {
                    scrollDashboard(UP);
                }
                break;
            case "H":
                if (document.querySelector(".dashboard-progress-chart.isFloating")) {
                    sideScrollProgressChart(LEFT);
                }
                break;
            case "L":
                if (document.querySelector(".dashboard-progress-chart.isFloating")) {
                    sideScrollProgressChart(RIGHT);
                }
                break;
            case "p":
                document.querySelector(".dashboard-progress-chart .finally > .icon")?.click();
                document.body.scroll(0, document.body.offsetHeight);
                break;
            case "e":
                Array.from(document.querySelectorAll(".dashboard-menu-right .options-btn .options-btn")).find((btn) => btn.innerHTML?.trim() == "Edit")?.click();
                break;
            case "Backspace":
                doBackspace();
                break;
            case "Escape":
                doEscape(e);
                break;
            case "Enter":
                doEnter();
                break;
        }
    } else if (document.querySelector(".ATD0010P-root")) {
        // study records
        switch(e.key) {
            case "R":
                clickReading();
                break;
            case "M":
                clickMath();
                break;
            case "Backspace":
                doBackspace();
                break;
            case "J":
                scrollScore(DOWN);
                break;
            case "K":
                scrollScore(UP);
                break;
            case "G":
                {
                    let scoreGrid = document.querySelector(".score-grid-all");
                    if (scoreGrid) {
                        scoreGrid.scrollIntoView();
                        scoreGrid.scroll(0, scoreGrid.scrollHeight);
                    }
                }
                break;
        }
    }
}

function keyboardModeKeyUp(e) {
    switch(e.key) {
        case "J":
        case "j":
            if (!pageSideScrolling && pageScrollingDirection == DOWN) {
                stopScrolling();
            }
            break;
        case "K":
        case "k":
            if (!pageSideScrolling && pageScrollingDirection == UP) {
                stopScrolling();
            }
            break;
        case "H":
        case "h":
            if (pageSideScrolling && pageScrollingDirection == LEFT) {
                stopScrolling();
            }
            break;
        case "L":
        case "l":
            if (pageSideScrolling && pageScrollingDirection == RIGHT) {
                stopScrolling();
            }
            break;
    }
}

function enableKeyboardMode() {
    document.addEventListener("keydown", keyboardModeHandler);
    document.addEventListener("keyup", keyboardModeKeyUp);
    markboxKeys = onPageChange(
        () => {},
        addMarkboxKeys,
        removeMarkboxKeys,
        removeMarkboxKeys,
    );
}
function disableKeyboardMode() {
    document.removeEventListener("keydown", keyboardModeHandler);
    document.removeEventListener("keyup", keyboardModeKeyUp);
    stopScrolling();
    markboxKeys?.disable();
    markboxKeys = null;
}

const timestampBox = document.createElement("div");
timestampBox.className = "timestampBox";
customToolbar.appendChild(timestampBox);
let timestampUpdater;
function timestampBoxNeutral(page) {
    timestampBox.className = "timestampBox";
    timestampPageNeutral(page);
}
function timestampBoxGreen(page) {
    timestampBox.className = "timestampBox green";
    if (page) {
        page.style.outlineColor = "lightgreen";
    }
}
function timestampBoxRed(page) {
    timestampBox.className = "timestampBox red";
    if (page) {
        page.style.outlineColor = "red";
    }
}
function timestampPageNeutral(page) {
    if (page) {
        page.style.outlineColor = "";
    }
}

function enableTimestampDisplay() {
    function updateTimestamp(activePage) {
        let is = stamp.getStudentDrawing();
        if (is) {
            if (is.length == 0) {
                timestampBox.innerHTML = "None";
                timestampBoxRed(activePage);
                return;
            }
            try {
                let lastStroke = new Date(is[is.length-1].cs[0].t);
                timestampBox.innerHTML = `Last change:<br>${lastStroke.toString()}`;

                if (document.querySelector(".worksheet-navigator-page.active .text.disabled")) {
                    // We're not on a page we need to grade
                    timestampBoxNeutral(activePage);
                } else {
                    let page = kclass.ng.context._contentsManagerService.paging._currentPage.gradingWaitingSet;
                    if (page.GradingStartTime && page.StudyFinishTime) {
                        let lastGraded = new Date(page.GradingStartTime + "Z");
                        let submitted = new Date(page.StudyFinishTime + "Z");
                        if (lastGraded > submitted) {
                            // This was paused, so we don't know
                            timestampBoxNeutral(activePage);
                        } else {
                            if (lastStroke > lastGraded) {
                                // They did something on the page since the last grading
                                timestampBoxGreen(activePage);
                            } else {
                                // They haven't touched the page since we last graded it
                                timestampBoxRed(activePage);
                            }
                        }
                    } else {
                        timestampBoxNeutral(activePage);
                    }
                }
            } catch {
                timestampBox.innerHTML = "";
                timestampBoxNeutral(activePage);
            }
        } else {
            timestampBox.innerHTML = "";
            timestampBoxNeutral(activePage);
        }
    }

    timestampUpdater = onPageChange(
        () => {
            // updateTimestamp();
            timestampBox.style.display = "unset";
        },
        updateTimestamp,
        timestampPageNeutral,
        (activePage) => {
            timestampBoxNeutral(activePage);
            timestampBox.innerHTML = "";
            timestampBox.style.display = "";
        },
        () => {
            timestampBox.innerHTML = "";
            timestampBox.style.display = "";
        }
    );
}

function disableTimestampDisplay() {
    timestampUpdater?.disable();
    timestampUpdater = null;
}

function isPulldownOpen() {
    return document.querySelector("#customPulldown")?.checkVisibility() ?? false;
}

function clickReading() {
    document.querySelector(".btn-subject.border-radius-right:not(.btn-subject-disabled)")?.click();
}
function clickMath() {
    document.querySelector(".btn-subject.border-radius-left:not(.btn-subject-disabled)")?.click();
}

function doBackspace() {
    (
        document.querySelector(".btn-dialog-cancel")
        || document.querySelector(".close-btn")
        || document.querySelector(".btn-close")
        || document.querySelector("app-page-back-button")
    )?.click();
}


function doEscape(e) {
    let escapable = (
        document.querySelector(".btn-dialog-cancel")
        || document.querySelector(".end-scoring-area")
        || document.querySelector(".playback-control .close")
        || document.querySelector(".btn-close")
        || document.querySelector(".close-btn")
    );
    if (escapable) {
        escapable.click();
        return;
    }
    if (isPulldownOpen()) {
        document.querySelector("#studentInfoPullDown").click();
        document.querySelector("#studentInfoPullDown").blur();
        document.querySelectorAll("#customPulldown > .kbfocus").forEach((p) => {
            p.classList.remove("kbfocus");
        });
        showHeader(false);
        return;
    }
    if (drawtab.checkVisibility()) {
        hideDrawTab(true);
        return;
    }
    if (e.target.classList.contains("search-input")) {
        clearSearch();
        e.target.parentElement.querySelector(".search-btn")?.focus();
    }

    document.querySelector(".studentList .kbfocus")?.classList.remove("kbfocus");
}
function clearSearch() {
    let searchInput = document.querySelector("input.search-input");
    searchInput.value = "";
    searchInput.setAttribute("value", "");
    searchInput.dispatchEvent(new Event("input"), {});
    document.querySelector(".search-bar .search-btn").click();
    document.querySelector(".studentList .kbfocus")?.classList.remove("kbfocus");
}

function doMarkingListHL(direction) {
    let studentList = document.querySelector(".studentList:not(.tabItem)");
    // current student checkbox focus
    let focusedStudent = studentList.querySelector("app-score-list-item .checkbox.kbfocus");
    if (focusedStudent) {
        if (direction == LEFT) return;
        doMarkingListFocusAndScroll(studentList, studentList.querySelector("app-score-list-item:has(.kbfocus) .studyBarWrap"));
        return;
    }

    let focusedSet = studentList.querySelector(".studyBarWrap.kbfocus");
    if (focusedSet) {
        let subject = getFocusedSetSubject(focusedSet);
        if (direction == RIGHT) {
            if (subject == "KNA") return;
            moveMarkingListSetFocusLeftRight(studentList, focusedSet, subject);
        } else if (direction == LEFT) {
            if (subject == "math") {
                selectStudentCheckboxFromSet(studentList, focusedSet);
            } else {
                if (!moveMarkingListSetFocusLeftRight(studentList, focusedSet, subject)) {
                    selectStudentCheckboxFromSet(studentList, focusedSet);
                }
            }
        }
        return;
    }

    // If header checkbox is focused, do nothing
    if (studentList.querySelector("app-score-list-header .checkbox.kbfocus")) return;

    // Nothing selected
    if (direction == LEFT) {
        // select first student checkbox
        doMarkingListFocusAndScroll(studentList, studentList.querySelector("app-score-list-item .checkbox"));
    } else {
        // select first set
        doMarkingListFocusAndScroll(studentList, studentList.querySelector("app-score-list-item .studyBarWrap"));
    }
}

function selectStudentCheckboxFromSet(studentList, focusedSet) {
    doMarkingListFocusAndScroll(studentList, studentList.querySelector("app-score-list-item:has(.kbfocus) i.checkbox"));
}

function moveMarkingListSetFocusLeftRight(studentList, focusedSet, subject) {
    let otherSubjectSets = studentList.querySelectorAll(`app-score-list-item:has(.kbfocus) .subjectCellWrapColumn:has(.studyBarWrap.${subject == "math" ? "KNA" : "math"}) .studyBarWrap`);
    if (!otherSubjectSets.length) return false;

    let sameSubjectSets = studentList.querySelectorAll(`app-score-list-item:has(.kbfocus) .subjectCellWrapColumn:has(.studyBarWrap.${subject}) .studyBarWrap`);

    let i = Array.from(sameSubjectSets).indexOf(focusedSet);

    doMarkingListFocusAndScroll(studentList, otherSubjectSets[Math.min(i, otherSubjectSets.length - 1)]);
    return true;
}

function doMarkingListJK(direction) {
    let studentList = document.querySelector(".studentList:not(.tabItem)");
    // current student checkbox focus
    let focusedStudent = studentList.querySelector("app-score-list-item .checkbox.kbfocus");
    if (focusedStudent) {
        moveMarkingListCheckboxFocus(studentList, focusedStudent, direction);
        return;
    }

    let focusedSet = studentList.querySelector(".studyBarWrap.kbfocus");
    if (focusedSet) {
        moveMarkingListSetFocusUpDown(studentList, focusedSet, direction);
        return;
    }

    let headerCheckbox = studentList.querySelector("app-score-list-header .checkbox");
    if (headerCheckbox.classList.contains("kbfocus")) {
        if (direction == DOWN) {
            // select the first student
            doMarkingListFocusAndScroll(studentList, studentList.querySelector("app-score-list-item .checkbox"));
        } else {
            // select the last student
            let items = studentList.querySelectorAll("app-score-list-item .checkbox");
            doMarkingListFocusAndScroll(studentList, items[items.length - 1]);
        }
        return;
    }

    // nothing selected
    if (direction == DOWN) {
        // select the first student
        doMarkingListFocusAndScroll(studentList, studentList.querySelector("app-score-list-item .checkbox"));
    } else {
        // select the header checkbox
        markingListSelectHeaderCheckbox(studentList);
    }
}

function getFocusedSetSubject(focusedSet) {
    return focusedSet.classList.entries().find((a) => a[1] == "math" || a[1] == "KNA")[1];
}

function moveMarkingListSetFocusUpDown(studentList, focusedSet, direction) {
    let currentStudentSets = Array.from(studentList.querySelectorAll(".subjectCellWrapColumn:has(.kbfocus) .studyBarWrap"));
    let i = currentStudentSets.indexOf(focusedSet);
    let subject = getFocusedSetSubject(focusedSet);
    if (direction == UP && i == 0) {
        // Select previous student's last set
        let student = getMarkingListStudent(studentList, direction);
        let subjectColumn = getMarkingListStudentSubjectColumn(student, subject);
        let sets = subjectColumn.querySelectorAll(".studyBarWrap");
        doMarkingListFocusAndScroll(studentList, sets[sets.length - 1]);
    } else if (direction == DOWN && i == currentStudentSets.length - 1) {
        // Select next student's first set
        let student = getMarkingListStudent(studentList, direction);
        let subjectColumn = getMarkingListStudentSubjectColumn(student, subject);
        doMarkingListFocusAndScroll(studentList, subjectColumn.querySelector(".studyBarWrap"));
    } else {
        doMarkingListFocusAndScroll(studentList, currentStudentSets[i + direction]);
    }

}

function getMarkingListStudent(studentList, direction) {
    let students = Array.from(studentList.querySelectorAll("app-score-list-item"))
    let i = students.indexOf(studentList.querySelector("app-score-list-item:has(.kbfocus)"));
    if (direction == UP && i == 0) {
        return students[students.length - 1];
    } else if (direction == DOWN && i == students.length - 1) {
        return students[0];
    }
    return students[i + direction];
}

function getMarkingListStudentSubjectColumn(student, subject) {
    return (
        student.querySelector(`.subjectCellWrapColumn:has(.studyBarWrap.${subject})`)
        || student.querySelector(".subjectCellWrapColumn:has(.studyBarWrap)")
    );
}

function moveMarkingListCheckboxFocus(studentList, focusedStudent, direction) {
    let items = Array.from(studentList.querySelectorAll("app-score-list-item .checkbox"));
    let i = items.indexOf(focusedStudent);
    if (direction == UP && i == 0 || direction == DOWN && i == items.length - 1) {
        // select the header checkbox
        focusedStudent.classList.remove("kbfocus");
        markingListSelectHeaderCheckbox(studentList);
    } else {
        doMarkingListFocusAndScroll(studentList, items[i + direction]);
    }
}
function markingListSelectHeaderCheckbox(studentList) {
    studentList.querySelector("app-score-list-header .checkbox").classList.add("kbfocus");
    studentList.scrollTop = 0;
}

function doMarkingListFocusAndScroll(studentList, toFocus) {
    studentList.querySelector(".kbfocus")?.classList.remove("kbfocus");
    toFocus.classList.add("kbfocus");
    let firstCheckbox = studentList.querySelector("app-score-list-item .checkbox");
    if (toFocus.classList.contains("checkbox")) {
        // Keep checkboxes at the top when focusing
        studentList.scrollTop = toFocus.offsetTop - firstCheckbox.offsetTop;
    } else {
        toFocus.scrollIntoViewIfNeeded();
        if (studentList.scrollTop > toFocus.offsetTop - firstCheckbox.offsetTop) {
            studentList.scrollTop = toFocus.offsetTop - firstCheckbox.offsetTop;
        }
    }
}

function doDown() {
    if (isPulldownOpen()) {
        let kbfocus = (
            document.querySelector("#customPulldown .option.kbfocus")
            || document.querySelector("#customPulldown > .option-select")
        );
        let options = Array.from(document.querySelectorAll("#customPulldown > .option"));
        let i = options.indexOf(kbfocus);
        if (options[i+1]) {
            kbfocus.classList.remove("kbfocus");
            options[i+1].classList.add("kbfocus");
            options[i+1].scrollIntoViewIfNeeded();
        }
        return;
    }
    document.querySelector("button.pager-button.down")?.click();
}

function doUp() {
    if (isPulldownOpen()) {
        let kbfocus = (
            document.querySelector("#customPulldown .option.kbfocus")
            || document.querySelector("#customPulldown > .option-select")
        );
        let options = Array.from(document.querySelectorAll("#customPulldown > .option"));
        let i = options.indexOf(kbfocus);
        if (options[i-1]) {
            kbfocus.classList.remove("kbfocus");
            options[i-1].classList.add("kbfocus");
            options[i-1].scrollIntoViewIfNeeded();
        }
        return;
    }
    document.querySelector("button.pager-button.up")?.click();
}

function cycleHighlighter() {
    if (document.querySelector("input[name=penType]:checked")?.value == "thick-highlighter") {
        document.querySelector("input[name=penType][value=thin-highlighter]")?.click();
    } else {
        document.querySelector("input[name=penType][value=thick-highlighter]")?.click();
    }
}


function selectEraser() {
    StampLib.expandToolbar();
    document.querySelector(".grading-toolbar-box .grading-toolbar .eraser").click();
    StampLib.collapseToolbar();
    document.querySelector("input[name=penType][value=eraser]")?.click();
}

function getPlaybackControl() {
    return document.querySelector(".playback-control");
}

function doP() {
    let breakScoringButton = document.querySelector("#BreakScoringButton")
    if (breakScoringButton) {
        breakScoringButton.click();
        return;
    }
    let playbackControl = getPlaybackControl();
    if (playbackControl) {
        playbackControl.querySelector(".play,.pause").click();
        return;
    }
    document.querySelector("input[name=penType][value=pen]")?.click();
    updatePenSettings();
}

function doS() {
    let playbackControl = getPlaybackControl();
    if (playbackControl) {
        playbackControl.querySelector(".stop").click();
        return;
    }
}

function do2(key) {
    let playbackControl = getPlaybackControl();
    if (playbackControl) {
        playbackControl.querySelector(".speed-2").click();
        return;
    }
    doKeyboardDefault(key);
}

function do8(key) {
    let playbackControl = getPlaybackControl();
    if (playbackControl) {
        playbackControl.querySelector(".speed-8").click();
        return;
    }
    doKeyboardDefault(key);
}

function doEnter() {
    let mainBtn = (
        document.querySelector("#EndScoringButton")
        || document.querySelector(".btn-dialog-navy")
        || document.querySelector(".bottomSheet.open .scoreBtn")
    );
    if (mainBtn) {
        mainBtn.click();
        return;
    }
    let studentPulldownKbfocus = document.querySelector("#customPulldown:not([hidden]) > .kbfocus");
    if (studentPulldownKbfocus) {
        studentPulldownKbfocus.dispatchEvent(
            new MouseEvent("mousedown"),
            {
                button: 0,
                bubbles: true,
            },
        );
        return;
    }
}

function doKeyboardDefault(key) {
    document.querySelector(
        ".ATD0020P-worksheet-container.selected"
    ).querySelectorAll(".mark-box")[markboxMap[key]]?.click();
}

function clearMarkboxs() {
    for (let i = 0; i < 2; i++) {
        document.querySelectorAll(
            ".worksheet-container .worksheet-container.selected .mark-boxs .mark-box"
        ).forEach((markbox) => {
            if (!markbox.querySelector(`.default`)) {
                markbox.click();
            }
        });
    }
}

function matchPreviousMarkings() {
    let resultMapping = {
        "check": "check",
        "check-double": "check",
        "check-triangle": "check",
        "triangle": "triangle",
        "triangle-double": "triangle",
        "triangle-check": "triangle",
    };
    let resultBoxes = document.querySelectorAll(".worksheet-container .worksheet-container.selected .mark-result-boxs .result-box:not(.right) .result-box-type");
    if (!resultBoxes.length) {
        xallbtn?.click();
        return;
    }
    for (let i = 0; i < 2; i++) {
        let markboxes = document.querySelectorAll(".worksheet-container .worksheet-container.selected .mark-boxs .mark-box");

        resultBoxes.forEach((resultBox, index) => {
            let required = resultMapping[resultBox.classList[1]];
            let markbox = markboxes[index];
            if (!markbox.querySelector(`.${required}`)) {
                markbox.click();
            }
        });
    }
}

let pageScrolling = false;
let pageScrollingDirection;
let pageScrollingItem;
let pageScrollingStartTime;
let pageScrollingStartPos;
let pageSideScrolling = false;

const DOWN = 1;
const UP = -1;
const RIGHT = 1;
const LEFT = -1;
function scrollStudents(direction) {
    startScrolling(direction, ".studentList:not(.tabItem)");
}
function scrollAnswer(direction) {
    startScrolling(direction, ".content-answer-content.image");
}
function scrollDashboard(direction) {
    startScrolling(direction, ".dashboard");
}
function scrollProgressChart(direction) {
    startScrolling(direction, ".dashboard-progress-chart .chart");
}
function sideScrollProgressChart(direction) {
    startSideScrolling(direction, ".dashboard-progress-chart .plan-footer");
}
function scrollScore(direction) {
    startScrolling(direction, ".score-grid-all");
}
function startScrolling(direction, item) {
    pageScrolling = true;
    pageSideScrolling = false;
    pageScrollingDirection = direction;
    pageScrollingItem = document.querySelector(item);
    pageScrollingStartPos = pageScrollingItem.scrollTop;
    pageScrollingStartTime = undefined;
    requestAnimationFrame(scrollPage);
}
function startSideScrolling(direction, item) {
    pageScrolling = true;
    pageSideScrolling = true;
    pageScrollingDirection = direction;
    pageScrollingItem = document.querySelector(item);
    pageScrollingStartPos = pageScrollingItem.scrollLeft;
    pageScrollingStartTime = undefined;
    requestAnimationFrame(scrollPage);
}
function scrollPage(timestamp) {
    if (!pageScrolling) return;
    if (pageScrollingStartTime === undefined) {
        pageScrollingStartTime = timestamp;
    }
    if (pageSideScrolling) {
        pageScrollingItem.scrollTo({
            left: pageScrollingStartPos + 1.5 * pageScrollingDirection * (timestamp - pageScrollingStartTime),
            behavior: "instant"
        });
    } else {
        pageScrollingItem.scrollTo({
            top: pageScrollingStartPos + 1.5 * pageScrollingDirection * (timestamp - pageScrollingStartTime),
            behavior: "instant"
        });
    }
    requestAnimationFrame(scrollPage);
}

function stopScrolling() {
    pageScrolling = false;
}

makebtn(
    "loginRefreshBtn",
    "refresh",
    "refresh",
    document.body,
    () => {
        window.location.href = window.location.href
    }
);

function isAndroid() {
    return /[Aa]ndroid/.test(navigator.userAgent);
}

const loginAssistantsList = document.createElement("details");
loginAssistantsList.className = "loginAssistantsList";
if (!isAndroid()) {
    loginAssistantsList.setAttribute("open", "");
}
loginAssistantsList.innerHTML = `<summary>Logins</summary>
<ul>
    <li>1: Dhanya</li>
    <li>2: Gowri</li>
    <li>3: Gautham</li>
    <li>4: Alex</li>
    <li>5: Ibrahim</li>
    <li>6: Neethi</li>
    <li>7: Ridhima</li>
    <li>8: Samarth</li>
    <li>9: Shennie</li>
    <li>10: Vaishnavi</li>
    <li>12: Nainika</li>
    <li>13: Arsheen</li>
    <li>14: Parthini</li>
    <li>15: Parvathy</li>
</ul>`;
document.body.appendChild(loginAssistantsList);


window.kclass = {};

let ngc = document.querySelector("app-root").__ngContext__
for (let i = ngc.length; i >= 0; i--) {
    if (ngc[i]?.context) {
        kclass.ng = ngc[i];
        break;
    }
}

;
