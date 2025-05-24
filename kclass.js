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

makebtn("headerZindexBtn", "H", "Toggle header bar visibility", customToolbar, () => {
    toggleHeader();
});

makebtn("shiftbtn", "↕", "Toggle shifting the page up/down", customToolbar, () => {
    let container = document.getElementsByClassName("worksheet-container")[0];
    if (container.classList.contains("shiftup")) {
        container.classList.remove("shiftup");
    } else {
        container.classList.add("shiftup");
    }
});

const xallbtn = makebtn("xallbtn", "x all", "Click every grading box on the page", customToolbar, () => {
    document.querySelectorAll(".worksheet-container .worksheet-container.selected .mark-box-target").forEach((box) => box.click());
    xallbtn.blur();
});

const drawtab = document.createElement("div");
drawtab.className = "drawtab";
drawtab.style.display = "none";
customToolbar.appendChild(drawtab);

drawtab.addEventListener("mouseleave", (e) => {
    let rect = drawtab.getBoundingClientRect();
    if (
        e.x <= rect.left
        || e.x >= rect.right
        || e.y <= rect.top
        || e.y >= e.bottom
    ) {
        hideDrawTab(true);
    }
});

function hideDrawTab(hide) {
    console.log(`hideDrawTab ${hide}`);
    if (hide) {
        drawtab.style.display = "none";
    } else {
        drawtab.style.display = "unset";
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
}

function updatePenSettings() {
    let penType = document.querySelector("input[name=penType]:checked")?.value || "pen";
    StampLib.setPenSettings({
        color: pencolorbtn.value,
        ...penSettings[penType]
    });
}

const drawbtn = makebtn("drawbtn", "&#128393;", "Show the draw tab", customToolbar, () => {
    hideDrawTab(false);
    textarea.focus();
    textarea.select();
    updateTextAreaSize();
    updatePenSettings();
});
drawbtn.accessKey = "d";

var _hdmo;
var _hdmo2;

function enableHD() {
    if (typeof(_hdmo2) === "undefined") {
        _hdmo2 = new MutationObserver((mutationList, _) => {
            for (const mutation of mutationList) {
                // if (mutation.addedNodes.entries().find(i => i[1].classList?.contains("ATD0020P-worksheet-container") || i[1].classList?.contains("ATD0020P-worksheet-page") || i[1].classList?.contains("worksheet-group-page"))) {
                if (mutation.target.nodeName == "LOADING-SPINNER" && mutation.removedNodes.length) {
                    console.log("SPINNER DONE");
                    console.log(mutation);
                    initHD();
                    break;
                }
            }
        });
    }
    _hdmo2.observe(document.querySelector("app-root"), {childList: true, subtree: true});
    initHD();
}

function initHD() {
    if (!document.querySelector("app-atd0020p")) {
        console.log("No grading app");
        return;
    }
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

    if (typeof(_hdmo) === "undefined") {
        _hdmo = new MutationObserver((mutationList, _) => {
            // console.log("Mutation");
            // console.log(mutationList);
            for (const mutation of mutationList) {
                if (mutation.target.classList.contains("selected")) {
                    StampLib.makeHD(mutation.target);
                } else {
                    // reset non-selected page to SD
                    // because selecting an already HD page with the pen tool selected
                    // makes things really messed up
                    StampLib.makeSD(mutation.target);
                }
            }
        });
    }
    _hdmo.disconnect();
    document.querySelectorAll(".ATD0020P-worksheet-container").forEach(page => {
        // console.log("Observing page");
        // console.log(page);
        _hdmo.observe(page, {attributeFilter:["class"]});
    });
    StampLib.makeHD(document.querySelector(".ATD0020P-worksheet-container.selected"));
}

function disableHD() {
    if (typeof(_hdmo) !== "undefined") {
        _hdmo.disconnect();
    }
    if (typeof(_hdmo2) !== "undefined") {
        _hdmo2.disconnect();
    }
    StampLib.makeSD(document.querySelector(".ATD0020P-worksheet-container.selected"));
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

const pencolorbtn = document.createElement("input");
pencolorbtn.type = "color";
pencolorbtn.value = "#ff2200";
pencolorbtn.className = "pencolorbtn";
function updatePenColor() {
    textarea.style.color = this.value;
    updatePenSettings();
}
pencolorbtn.addEventListener("input", updatePenColor);
pencolorbtn.addEventListener("change", updatePenColor);
pencolorbtn.addEventListener("blur", updatePenColor);
drawheader.appendChild(pencolorbtn);

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

drawheader.appendChild(penTypeContainer);

makebtn("undoLast squarebtn", "&#11148;", "Undo last stamp", drawheader, () => {
    StampLib.undoLastWriteAll();
});

makebtn("clearAll", "clear", "Clear the entire page (can't be undone)", drawheader, () => {
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
textarea.value = "Text";
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
textbtn.accessKey = "t";

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
        document.querySelector("meta[content*='user-scalable']").content = "width=490px, initial-scale=1";
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
            break;
        }
    }
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
kbbtn.title = `Keyboard mode:
j: down
k: up
g: top
G: bottom
x: match previous markings or x all
X: x all
n: next active page
N: previous active page
d: go to next set
R: switch to reading
M: switch to math
H: header dropdown
p: pause marking (when bottom pause button is visible)
p: start replay / pause replay
s: stop replay
2: replay 2x speed
8: replay 8x speed
J: scroll answer key down
K: scroll answer key up
-: decrease stamp size
+: increase stamp size
=: increase stamp size
escape: close dialog
backspace: exit/cancel
enter: submit/accept dialog
⇧1: shift 1
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

var _kbmo;
var _kbmo2;
function enableMarkboxKeys() {
    if (typeof(_kbmo2) === "undefined") {
        _kbmo2 = new MutationObserver((mutationList, _) => {
            for (const mutation of mutationList) {
                if (mutation.target.nodeName == "LOADING-SPINNER" && mutation.removedNodes.length) {
                    console.log("SPINNER DONE");
                    console.log(mutation);
                    initMarkboxKeys();
                    break;
                }
            }
        });
    }
    _kbmo2.observe(document.querySelector("app-root"), {childList: true, subtree: true});
    initMarkboxKeys();
}

function initMarkboxKeys() {
    if (!document.querySelector("app-atd0020p")) {
        console.log("No grading app");
        return;
    }

    if (typeof(_kbmo) === "undefined") {
        _kbmo = new MutationObserver((mutationList, _) => {
            // console.log("Mutation");
            // console.log(mutationList);
            for (const mutation of mutationList) {
                if (mutation.target.classList.contains("selected")) {
                    addMarkboxKeys(mutation.target);
                } else {
                    removeMarkboxKeys(mutation.target);
                }
            }
        });
    }
    _kbmo.disconnect();
    document.querySelectorAll(".ATD0020P-worksheet-container").forEach(page => {
        // console.log("Observing page");
        // console.log(page);
        _kbmo.observe(page, {attributeFilter:["class"]});
    });
    addMarkboxKeys(document.querySelector(".ATD0020P-worksheet-container.selected"));
}

function disableMarkboxKeys() {
    if (typeof(_kbmo) !== "undefined") {
        _kbmo.disconnect();
    }
    if (typeof(_kbmo2) !== "undefined") {
        _kbmo2.disconnect();
    }
    removeMarkboxKeys(document.querySelector(".ATD0020P-worksheet-container.selected"));
}

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
    let markboxs = page.querySelector(".mark-boxs");
    markboxs?.querySelectorAll(".markboxkey").forEach(markboxkey => {
        markboxs.removeChild(markboxkey);
    });
}

function keyboardModeHandler(e) {
    console.log(e);
    if (e.target.nodeName == "INPUT" || e.target.nodeName == "TEXTAREA") {
        return;
    }
    if (e.altKey || e.ctrlKey || e.metaKey) {
        return;
    }
    if (!document.querySelector(".ATD0020P-worksheet-container.selected")) {
        return;
    }
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
        case "Backspace":
            (
                document.querySelector(".btn-dialog-cancel")
                || document.querySelector("app-page-back-button")
            )?.click();
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
        case "s":
            doS();
            break;
        case "2":
            do2();
            break;
        case "8":
            do8();
            break;
        case "Enter":
            doEnter();
            break;
        case "Escape":
            doEscape();
            break;
        case "d":
            document.querySelector(".other-worksheet-button")?.click();
            break;
        case "R":
            document.querySelector(".btn-subject.border-radius-right:not(.btn-subject-disabled)")?.click();
            break;
        case "M":
            document.querySelector(".btn-subject.border-radius-left:not(.btn-subject-disabled)")?.click();
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
            scrollAnswerDown();
            break;
        case "K":
            scrollAnswerUp();
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
}

function enableKeyboardMode() {
    document.addEventListener("keydown", keyboardModeHandler);
    enableMarkboxKeys();
}
function disableKeyboardMode() {
    document.removeEventListener("keydown", keyboardModeHandler);
    disableMarkboxKeys();
}
function isPulldownOpen() {
    return document.querySelector("#customPulldown").checkVisibility();
}
function doEscape() {
    let escapable = (
        document.querySelector(".btn-dialog-cancel")
        || document.querySelector(".end-scoring-area")
        || document.querySelector(".playback-control .close")
    );
    if (escapable) {
        escapable.click();
        return;
    }
    if (isPulldownOpen()) {
        document.querySelector("#studentInfoPullDown").click();
        let header = document.getElementsByClassName("grading-header")[0];
        if (header.classList.contains("z300")) {
            header.classList.remove("z300");
        }
        return;
    }
    if (drawtab.checkVisibility()) {
        hideDrawTab(true);
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
    StampLib.expandToolbar();
    document.querySelector(".grading-toolbar-box .grading-toolbar .play").click();
    StampLib.collapseToolbar();
}

function doS() {
    let playbackControl = getPlaybackControl();
    if (playbackControl) {
        playbackControl.querySelector(".stop").click();
        return;
    }
}

function do2() {
    let playbackControl = getPlaybackControl();
    if (playbackControl) {
        playbackControl.querySelector(".speed-2").click();
        return;
    }
    doKeyboardDefault("2");
}

function do8() {
    let playbackControl = getPlaybackControl();
    if (playbackControl) {
        playbackControl.querySelector(".speed-8").click();
        return;
    }
    doKeyboardDefault("8");
}

function doEnter() {
    let mainBtn = (
        document.querySelector("#EndScoringButton")
        || document.querySelector(".btn-dialog-navy")
        || document.querySelector(".bottomSheet .scoreBtn")
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

function scrollAnswerUp() {
    scrollAnswer(-1);
}
function scrollAnswerDown() {
    scrollAnswer(1);
}
function scrollAnswer(direction) {
    let answerKey = document.querySelector(".content-answer-content.image");
    answerKey.scrollTo({
        top: answerKey.scrollTop + direction * answerKey.offsetHeight / 2,
        behavior: "smooth"
    });
}

;
