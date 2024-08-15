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
    StampLib.setPenColorHex(textcolorbtn.value);
    StampLib.setHighlighter(highlighter.checked);
}

const drawbtn = makebtn("drawbtn", "&#128393;", customToolbar, () => {
    drawtab.style.display = "unset";
    drawtab.focus();
    updatePenSettings();
});

makebtn("textbtn squarebtn", "abc", drawtab, () => {
    texttab.style.display = "unset";
    textarea.focus();
    textarea.select();
});

const texttab = document.createElement("div");
texttab.className = "texttab";
texttab.style.display = "none";
drawtab.appendChild(texttab);

texttab.addEventListener("mouseleave", () => {
    texttab.style.display = "none";
});

/* scale = font size / 57 */
const FONTSCALECONVERSION = 57;

const sizeslider = document.createElement("input");
sizeslider.className = "sizeslider";
sizeslider.type = "range";
sizeslider.value = 20;
sizeslider.min = FONTSCALECONVERSION * 0.2; // 0.2 scale
sizeslider.max = FONTSCALECONVERSION * 1.0; // 1.0 scale
texttab.appendChild(sizeslider);
sizeslider.addEventListener("input", (e) => {
    textarea.style["font-size"] = `${e.target.value}px`;
    updateTextAreaSize();
});

function getScale() {
    return sizeslider.value / FONTSCALECONVERSION;
}

makebtn("undoLast squarebtn", "&#11148;", texttab, () => {
    StampLib.undoLastWriteAll();
});

makebtn("axolotlbtn", "axolotl", drawtab, (e) => {
    let scale = getScale() / 5;
    let writeDimensions = StampLib.getWriteStampDimensions(StampLib.stamps.axolotl, scale);
    let printPreviewDiv = document.createElement("div");
    printPreviewDiv.className = "printPreviewDiv";
    printPreviewDiv.style.height = `${writeDimensions.height}px`;
    printPreviewDiv.style.width = `${writeDimensions.width}px`;
    printPreviewDiv.style.left = `${e.clientX}px`;
    printPreviewDiv.style.top = `${e.clientY}px`;
    printPreviewDiv.style["border-color"] = textcolorbtn.value;
    printoverlay.appendChild(printPreviewDiv);
    let mousemovehandler = (e) => {
        printPreviewDiv.animate({
            left: `${e.clientX}px`,
            top: `${e.clientY}px`,
        }, {duration: 500, fill: "forwards"});
    };
    printoverlay.addEventListener("pointermove", mousemovehandler);
    let printclickhandler = (e) => {
        try {
            drawtab.style.display = "none";
            let atd = StampLib.getAtd();
            let canvasRect = atd.bcanvas.getBoundingClientRect();
            let zoomRatio = atd.drawingContext.zoomRatio;

            if (
                e.clientX < canvasRect.left
                || e.clientY < canvasRect.top
                || e.clientX > canvasRect.right
                || e.clientY > canvasRect.bottom
            ) {
                console.log("Outside bounds");
                return;
            }

            let position = {
                x: (e.clientX - canvasRect.left) / zoomRatio,
                y: (e.clientY - canvasRect.top) / zoomRatio,
            }

            StampLib.writeStampAt(StampLib.stamps.axolotl, position, scale, {color: textcolorbtn.value});
        } finally {
            printoverlay.style.display = "none";
            printoverlay.removeEventListener("click", printclickhandler);
            printoverlay.removeChild(printPreviewDiv);
            printoverlay.removeEventListener("pointermove", mousemovehandler);
        }
    };
    printoverlay.addEventListener("click", printclickhandler);
    printoverlay.style.display = "unset";
})

makebtn("textprintbtn", "print", texttab, (e) => {
    let writeDimensions = StampLib.getWriteAllDimensions(textarea.value, getScale());
    let printPreviewDiv = document.createElement("div");
    printPreviewDiv.className = "printPreviewDiv";
    printPreviewDiv.style.height = `${writeDimensions.height}px`;
    printPreviewDiv.style.width = `${writeDimensions.width}px`;
    printPreviewDiv.style.left = `${e.clientX}px`;
    printPreviewDiv.style.top = `${e.clientY}px`;
    printPreviewDiv.style["border-color"] = textcolorbtn.value;
    printoverlay.appendChild(printPreviewDiv);
    let mousemovehandler = (e) => {
        printPreviewDiv.animate({
            left: `${e.clientX}px`,
            top: `${e.clientY}px`,
        }, {duration: 500, fill: "forwards"});
    };
    printoverlay.addEventListener("pointermove", mousemovehandler);
    let printclickhandler = (e) => {
        try {
            drawtab.style.display = "none";
            let atd = StampLib.getAtd();
            let canvasRect = atd.bcanvas.getBoundingClientRect();
            let zoomRatio = atd.drawingContext.zoomRatio;

            if (
                e.clientX < canvasRect.left
                || e.clientY < canvasRect.top
                || e.clientX > canvasRect.right
                || e.clientY > canvasRect.bottom
            ) {
                console.log("Outside bounds");
                return;
            }

            let position = {
                x: (e.clientX - canvasRect.left) / zoomRatio,
                y: (e.clientY - canvasRect.top) / zoomRatio,
            }

            StampLib.writeAllAt(textarea.value, position, getScale(), {color: textcolorbtn.value});
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

const textcolorbtn = document.createElement("input");
textcolorbtn.type = "color";
textcolorbtn.value = "#ff2200";
textcolorbtn.className = "textcolorbtn";
function updateTextColor() {
    textarea.style.color = this.value;
    pencolorbtn.value = this.value;
    updatePenSettings();
}
textcolorbtn.addEventListener("input", updateTextColor);
textcolorbtn.addEventListener("change", updateTextColor);
textcolorbtn.addEventListener("blur", updateTextColor);
texttab.appendChild(textcolorbtn);

const pencolorbtn = document.createElement("input");
pencolorbtn.type = "color";
pencolorbtn.value = "#ff2200";
pencolorbtn.className = "pencolorbtn";
function updatePenColor() {
    textarea.style.color = this.value;
    textcolorbtn.value = this.value;
    updatePenSettings();
}
pencolorbtn.addEventListener("input", updatePenColor);
pencolorbtn.addEventListener("change", updatePenColor);
pencolorbtn.addEventListener("blur", updatePenColor);
drawtab.appendChild(pencolorbtn);

const highlighter = document.createElement("input");
highlighter.type = "checkbox";
highlighter.id = "highlighter";
drawtab.appendChild(highlighter);
highlighter.addEventListener("change", function() {
    updatePenSettings();
})
const highlighterlabel = document.createElement("label");
highlighterlabel.setAttribute("for", highlighter.id);
highlighterlabel.innerText = "Highlighter";
drawtab.appendChild(highlighterlabel);

const textarea = document.createElement("textarea");
texttab.appendChild(textarea);
textarea.style["font-size"] = "20px";
textarea.style.color = "#ff2200";
function updateTextAreaSize() {
    textarea.style.height = "";
    textarea.style.height = `${textarea.scrollHeight}px`;
}
textarea.addEventListener("input", updateTextAreaSize);


const printoverlay = document.createElement("div");
printoverlay.className = "printoverlay";
document.body.appendChild(printoverlay);


;
