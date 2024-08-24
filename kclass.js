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

const sizeslider = document.createElement("input");
sizeslider.className = "sizeslider";
sizeslider.type = "range";
sizeslider.value = 35;
sizeslider.min = 10;
sizeslider.max = 100;
drawtab.appendChild(sizeslider);
sizeslider.addEventListener("input", (e) => {
    drawtab.style.setProperty("--sizeslider", `${e.target.value} / 100`);
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

makebtn("undoLast squarebtn", "&#11148;", drawtab, () => {
    StampLib.undoLastWriteAll();
});

makebtn("textprintbtn", "text", drawtab, (e) => {
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

function makeStamp(stamp, name) {
    let btn = document.createElement("button");
    btn.className = "stampbtn";
    btn.appendChild(stamp.svg);
    stamp.svg.addEventListener("mouseover", (e) => {
        // Prevent a bunch of errors being sent because of some code looking at .className and assuming it's a string
        e.stopPropagation();
    })
    drawtab.appendChild(btn);
    let stampDimensions = StampLib.getWriteStampDimensions(stamp, 1);
    let maxScaleFactor = 370 / Math.max(stampDimensions.width, stampDimensions.height);
    btn.style.setProperty("--height-limiter", stampDimensions.height <= stampDimensions.width ? 1 : stampDimensions.width / stampDimensions.height);
    btn.onclick = (e) => {
        drawtab.style.display = "none";
        let scale = getScale() * maxScaleFactor;
        let writeDimensions = {width: stampDimensions.width * scale, height: stampDimensions.height * scale};
        let printPreviewDiv = document.createElement("div");
        printPreviewDiv.className = "printPreviewDiv";
        printPreviewDiv.style.height = `${writeDimensions.height}px`;
        printPreviewDiv.style.width = `${writeDimensions.width}px`;
        printPreviewDiv.style.left = `${e.clientX}px`;
        printPreviewDiv.style.top = `${e.clientY}px`;
        printPreviewDiv.style["border-color"] = pencolorbtn.value;
        printPreviewDiv.innerHTML = stamp.svg.outerHTML;
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

                StampLib.writeStampAt(stamp, position, scale, {color: pencolorbtn.value});
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
drawtab.appendChild(textarea);
textarea.style.color = "#ff2200";
function updateTextAreaSize() {
    textarea.style.height = "";
    textarea.style.height = `${textarea.scrollHeight}px`;
}
textarea.addEventListener("input", updateTextAreaSize);


for (let stampName in StampLib.stamps) {
    makeStamp(StampLib.stamps[stampName], stampName);
}

const printoverlay = document.createElement("div");
printoverlay.className = "printoverlay";
document.body.appendChild(printoverlay);


;
