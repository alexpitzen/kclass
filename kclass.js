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

makebtn("xallbtn", "x all", customToolbar, () => {
    document.querySelectorAll(".worksheet-container .worksheet-container.selected .mark-box-target").forEach((box) => box.click());
});

const drawtab = document.createElement("div");
drawtab.className = "drawtab";
customToolbar.appendChild(drawtab);

drawtab.addEventListener("mouseleave", () => {
    drawtab.style.display = "none";
});

const drawbtn = makebtn("drawbtn", "&#128393;", customToolbar, () => {
    drawtab.style.display = "unset !important";
    drawtab.focus();
});

makebtn("textbtn squarebtn", "abc", drawtab, () => {
    texttab.style.display = "unset !important";
    texttab.focus();
});

makebtn("undoLast squarebtn", "&#11148;", drawtab, () => {
    CustomDrawLib.undoLastWriteAll();
});

const texttab = document.createElement("div");
texttab.className = "texttab";
drawtab.appendChild(texttab);

texttab.addEventListener("mouseleave", () => {
    texttab.style.display = "none";
});

/* scale = font size / 57 */
const fontScaleConversion = 57;

const sizeslider = document.createElement("input");
sizeslider.className = "sizeslider";
sizeslider.type = "range";
sizeslider.value = 20;
sizeslider.min = fontScaleConversion * 0.2; // 0.2 scale
sizeslider.max = fontScaleConversion * 1.0; // 1.0 scale
texttab.appendChild(sizeslider);
sizeslider.addEventListener("input", (e) => {
    textarea.style["font-size"] = `${e.target.value}px`;
    updateTextAreaSize();
});

makebtn("textprintbtn", "print", texttab, () => {
    let printclickhandler = (e) => {
        try {
            drawtab.style.display = "none";
            let atd = CustomDrawLib.getAtd();
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
            let scale = sizeslider.value / fontScaleConversion;

            CustomDrawLib.writeAllAt(textarea.value, position, scale);
        } finally {
            printoverlay.style.display = "none";
            printoverlay.removeEventListener("click", printclickhandler);
        }
    };
    printoverlay.addEventListener("click", printclickhandler);
    printoverlay.style.display = "unset";
});

makebtn("textclearbtn", "clear", texttab, () => {
    textarea.value = "";
    updateTextAreaSize();
});

const textarea = document.createElement("textarea");
texttab.appendChild(textarea);
textarea.style["font-size"] = "20px";
function updateTextAreaSize() {
    textarea.style.height = "";
    textarea.style.height = `${textarea.scrollHeight}px`;
}
textarea.addEventListener("input", updateTextAreaSize);


const printoverlay = document.createElement("div");
printoverlay.className = "printoverlay";
document.body.appendChild(printoverlay);


;
