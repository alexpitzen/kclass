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

makebtn("headerZindexBtn", "H", "Toggle header bar visibility", customToolbar, () => {
    let header = document.getElementsByClassName("grading-header")[0];
    if (header.classList.contains("z300")) {
        header.classList.remove("z300");
    } else {
        header.classList.add("z300");
    }
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
        drawtab.style.display = "none";
    }
});

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
    drawtab.style.display = "unset";
    textarea.focus();
    textarea.select();
    updatePenSettings();
});

var _mo;
var _mo2;

function enableHD() {
    if (typeof(_mo2) === "undefined") {
        _mo2 = new MutationObserver((mutationList, _) => {
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
    _mo2.observe(document.querySelector("app-root"), {childList: true, subtree: true});
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

    if (typeof(_mo) === "undefined") {
        _mo = new MutationObserver((mutationList, _) => {
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
    _mo.disconnect();
    document.querySelectorAll(".ATD0020P-worksheet-container").forEach(page => {
        // console.log("Observing page");
        // console.log(page);
        _mo.observe(page, {attributeFilter:["class"]});
    });
    StampLib.makeHD(document.querySelector(".ATD0020P-worksheet-container.selected"));
}

function disableHD() {
    if (typeof(_mo) !== "undefined") {
        _mo.disconnect();
    }
    if (typeof(_mo2) !== "undefined") {
        _mo2.disconnect();
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
sizeslider.addEventListener("input", (e) => {
    let scrollPercent = 0;
    try {
        scrollPercent = drawtab.scrollTop / (drawtab.scrollHeight - drawtab.clientHeight);
    } catch {}
    drawtab.style.setProperty("--sizeslider", `${e.target.value} / 100`);
    drawtab.scrollTop = scrollPercent * (drawtab.scrollHeight - drawtab.clientHeight);
    updateTextAreaSize();
});

const unlockbtn = makebtn("unlockbtn", "&#128275;", "Unlock the page for writing", buttonsleft, () => {
    stamp.unlockPage();
    drawtab.style.display = "none";
});

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

buttonsleft.appendChild(hdbtn);
buttonsleft.appendChild(hdbtnlabel);

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
        drawtab.style.display = "none";
        let scale = getScale() * maxScaleFactor;
        let writeDimensions = {width: stampDimensions.width * scale, height: stampDimensions.height * scale};
        let printPreviewDiv = document.createElement("div");
        printPreviewDiv.className = "stampPrintPreviewDiv";
        printPreviewDiv.style.height = `${writeDimensions.height}px`;
        printPreviewDiv.style.width = `${writeDimensions.width}px`;
        printPreviewDiv.style.left = `${e.clientX}px`;
        printPreviewDiv.style.top = `${e.clientY}px`;
        printPreviewDiv.style["border-color"] = pencolorbtn.value;
        printPreviewDiv.innerHTML = svg.outerHTML;
        printoverlay.appendChild(printPreviewDiv);
        printoverlay.addEventListener("mouseover", (e) => {
            // Prevent a bunch of errors being sent because of some code looking at .className and assuming it's a string
            e.stopPropagation();
        });
        let mousemovehandler = (e) => {
            printPreviewDiv.animate({
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
                console.log("scale");
                console.log(scale);
                console.log("options");
                console.log(options);
                StampLib.writeStampAt(stamp, position, scale, options);
            } finally {
                printoverlay.style.display = "none";
                printoverlay.removeEventListener("click", printclickhandler);
                printoverlay.removeChild(printPreviewDiv);
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

makebtn("textprintbtn squarebtn", "T", "Stamp the contents of the textbox", textareadiv, (e) => {
    drawtab.style.display = "none";
    // TODO these dimensions are wrong in HD mode for some reason
    let writeDimensions = StampLib.getWriteAllDimensions(textarea.value, getScale());
    let printPreviewDiv = document.createElement("div");
    printPreviewDiv.className = "printPreviewDiv";
    printPreviewDiv.style.height = `${writeDimensions.height}px`;
    printPreviewDiv.style.width = `${writeDimensions.width}px`;
    printPreviewDiv.style.left = `${e.clientX}px`;
    printPreviewDiv.style.top = `${e.clientY}px`;
    printPreviewDiv.style["border-color"] = pencolorbtn.value;
    printoverlay.appendChild(printPreviewDiv);
    let mousemovehandler = (e) => {
        printPreviewDiv.animate({
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
            printoverlay.removeChild(printPreviewDiv);
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

;
