const customToolbar = document.createElement("div");
customToolbar.className = "customToolbar";
customToolbar.style.display = "none";
document.body.appendChild(customToolbar);

function makebtn(className, innerText, container, fn) {
    let btn = document.createElement("button");
    btn.className = className;
    btn.innerHTML = innerText;
    container.appendChild(btn);
    btn.onclick = fn;
    return btn;
}

makebtn("headerZindexBtn", "H", customToolbar, () => {
    let header = document.getElementsByClassName("grading-header")[0];
    if (header.classList.contains("z300")) {
        header.classList.remove("z300");
    } else {
        header.classList.add("z300");
    }
});

makebtn("shiftbtn", "↕", customToolbar, () => {
    let container = document.getElementsByClassName("worksheet-container")[0];
    if (container.classList.contains("shiftup")) {
        container.classList.remove("shiftup");
    } else {
        container.classList.add("shiftup");
    }
});

const xallbtn = makebtn("xallbtn", "x all", customToolbar, () => {
    document.querySelectorAll(".worksheet-container .worksheet-container.selected .mark-box-target").forEach((box) => box.click());
    xallbtn.blur();
});

const drawtab = document.createElement("div");
drawtab.className = "drawtab";
drawtab.style.display = "none";
customToolbar.appendChild(drawtab);

drawtab.addEventListener("mouseleave", () => {
    drawtab.style.display = "none";
});

function updatePenSettings() {
    StampLib.setPenColorHex(pencolorbtn.value);
    StampLib.setHighlighter(highlighter.checked);
}

const drawbtn = makebtn("drawbtn", "&#128393;", customToolbar, () => {
    drawtab.style.display = "unset";
    textarea.focus();
    textarea.select();
    updatePenSettings();
});

// makebtn("textbtn squarebtn", "abc", drawtab, () => {
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

const sizeslider = document.createElement("input");
sizeslider.className = "sizeslider";
sizeslider.type = "range";
sizeslider.value = 25;
sizeslider.min = 10;
sizeslider.max = 100;
drawheader.appendChild(sizeslider);
sizeslider.addEventListener("input", (e) => {
    let scrollPercent = 0;
    try {
        scrollPercent = drawtab.scrollTop / (drawtab.scrollHeight - drawtab.clientHeight);
    } catch {}
    drawtab.style.setProperty("--sizeslider", `${e.target.value} / 100`);
    drawtab.scrollTop = scrollPercent * (drawtab.scrollHeight - drawtab.clientHeight);
    updateTextAreaSize();
});

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

const highlighter = document.createElement("input");
highlighter.type = "checkbox";
highlighter.id = "highlighter";
drawheader.appendChild(highlighter);
highlighter.addEventListener("change", function() {
    updatePenSettings();
})
const highlighterlabel = document.createElement("label");
highlighterlabel.setAttribute("for", highlighter.id);
highlighterlabel.innerText = "Highlighter";
drawheader.appendChild(highlighterlabel);

makebtn("undoLast squarebtn", "&#11148;", drawheader, () => {
    StampLib.undoLastWriteAll();
});

makebtn("textprintbtn", "text", drawheader, (e) => {
    drawtab.style.display = "none";
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
            let zoomRatio = atd.drawingContext.zoomRatio;

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
                let zoomRatio = atd.drawingContext.zoomRatio;

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

const textarea = document.createElement("textarea");
textarea.value = "Text";
drawheader.appendChild(textarea);
textarea.style.color = "#ff2200";
function updateTextAreaSize() {
    textarea.style.height = "";
    textarea.style.height = `${textarea.scrollHeight}px`;
}
textarea.addEventListener("input", updateTextAreaSize);

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
 */

const rainbowspeed = document.createElement("input");
rainbowspeed.className = "rainbowspeed";
rainbowspeed.type = "range";
rainbowspeed.value = 1;
rainbowspeed.min = 1;
rainbowspeed.max = 130;
rainbowspeed.setAttribute("disabled", "");
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


;
