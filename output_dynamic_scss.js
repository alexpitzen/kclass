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
    textarea.focus();
    textarea.select();
});

makebtn("undoLast squarebtn", "&#11148;", drawtab, () => {
    StampLib.undoLastWriteAll();
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
            let scale = sizeslider.value / fontScaleConversion;

            StampLib.writeAllAt(textarea.value, position, scale, textcolorbtn.value);
        } finally {
            printoverlay.style.display = "none";
            printoverlay.removeEventListener("click", printclickhandler);
        }
    };
    printoverlay.addEventListener("click", printclickhandler);
    printoverlay.style.display = "unset";
});

const textcolorbtn = document.createElement("input");
textcolorbtn.type = "color";
textcolorbtn.value = "#ff2200";
textcolorbtn.className = "textcolorbtn";
function updateColor() {
    StampLib.setPenColorHex(this.value);
    textarea.style.color = this.value;
}
textcolorbtn.addEventListener("input", updateColor);
textcolorbtn.addEventListener("change", updateColor);
textcolorbtn.addEventListener("blur", updateColor);
texttab.appendChild(textcolorbtn);

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
(function(global) {
    function expandToolbar() {
        if (document.querySelector(".grading-toolbar-box.close")) {
            document.querySelector(".grading-toolbar .toolbar-item").click();
        }
    }

    function selectPen() {
        if (document.querySelector(".grading-toolbar .active.pen")) {
            return;
        }
        expandToolbar();
        document.querySelector(".grading-toolbar-box .grading-toolbar .pen").click();
        document.querySelector(".grading-toolbar-box").classList.add("close");
    }

    class DrawLetter {
        constructor(character, strokes, width) {
            this.character = character;
            this.strokes = strokes;
            this.width = width;
        }
    }

    class Stroke {
        constructor(lines) {
            this.lines = lines;
        }
    }
    class Line {
        getPoints(scale){}
    }

    class Linear extends Line {
        constructor(start, end) {
            super();
            this.start = start;
            this.end = end;
        }
        getPoints(scale) {
            return [
                [this.start.x*scale, this.start.y*scale],
                [(this.start.x + this.end.x)/2*scale, (this.start.y + this.end.y)/2*scale],
                [this.end.x*scale, this.end.y*scale],
            ];
        }
    }

    class Circular extends Line {
        constructor(startPos, endPos, radius, clockwise, overHalf) {
            super();
            this.startPos = startPos;
            this.endPos = endPos;
            this.radius = radius;
            this.clockwise = clockwise;
            this.overHalf = overHalf;
            this.center = {};

            let x1 = this.startPos.x;
            let x2 = this.endPos.x;
            let y1 = this.startPos.y;
            let y2 = this.endPos.y;
            let r = this.radius;
            let xa = (x2 - x1)/2;
            let ya = (y2 - y1)/2;
            let x0 = (x1 + xa);
            let y0 = (y1 + ya);
            let a = Math.sqrt(xa*xa + ya*ya);
            let b = Math.sqrt(r*r - a*a);
            // console.log(a, b, xa, ya);
            if(this.clockwise ^ this.overHalf) {
                this.center = {
                    x: x0 - b*ya/a,
                    y: y0 + b*xa/a
                };
            } else {
                this.center = {
                    x: x0 + b*ya/a,
                    y: y0 - b*xa/a
                };
            }

            // -pi/2 to 3pi/2
            this.angle1 = Math.atan((y1-this.center.y)/(x1-this.center.x)) + (x1 < this.center.x ? Math.PI : 0);
            this.angle2 = Math.atan((y2-this.center.y)/(x2-this.center.x)) + (x2 < this.center.x ? Math.PI : 0);
            this.arclength = Math.abs(this.radius * (this.angle2 - this.angle1));
            // DOWN IS UP AND UP IS DOWN AHHHHHHHH
            // so clockwise & counterclockwise are reversed
            if (this.clockwise && this.angle2 < this.angle1) {
                this.angle2 += 2 * Math.PI;
            } else if (!this.clockwise && this.angle1 < this.angle2) {
                this.angle1 += 2 * Math.PI;
            }
            /*
             * (x1 - h)^2 + (y1 - k)^2 = r^2
             * (x2 - h)^2 + (y2 - k)^2 = r^2
            * h^2 - 2hx1 + x1^2 + k^2 + 2ky1 + y1^2 = r^2
            * h^2 - 2hx2 + x2^2 + k^2 + 2ky2 + y2^2 = r^2
            * 2h(x2 - x1) + 2k(y2 - y1) = x2^2 + y2^2 - x1^2 - y1^2
            * h = (x2^2 + y2^2 - x1^2 - y1^2 - 2k(y2 - y1))/(2(x2 - x1))
            * h = -k(y2 - y1)/(x2 - x1) + (x2^2 + y2^2 - x1^2 - y1^2)/(2(x2 - x1))
            * h^2 - 2hx1 + x1^2 + k^2 + 2ky1 + y1^2 = r^2
            *
            *
            * xa = (x2 - x1)/2
            * ya = (y2 - y1)/2
            * x0 = (x1 + xa)
            * y0 = (y1 + ya)
            * a = Math.sqrt(xa*xa + ya*ya)
            * b = Math.sqrt(r*r - a*a)
            * if(clockwise) {
            *   h = x0 + b*ya/a
            *   k = y0 - b*xa/a
            * } else {
            *   h = x0 - b*ya/a
            *   k = y0 + b*xa/a
            * }
        */

            // console.log(this);
        }
        getPoints(scale) {
            let strokes = [];
            // we'll say the number of points will be equal to the arclength
            let numpts = this.arclength * scale;
            let angle = this.angle1;
            let anglestep = (this.angle2 - this.angle1) / numpts;
            strokes.push([this.startPos.x * scale, this.startPos.y * scale])
            for (let i = 1; i < numpts - 1; i++) {
                angle += anglestep;
                strokes.push([
                    (this.center.x + this.radius * Math.cos(angle)) * scale,
                    (this.center.y + this.radius * Math.sin(angle)) * scale,
                ])
            }
            strokes.push([this.endPos.x * scale, this.endPos.y * scale])
            return strokes;
        }
    }

    const LETTERS = {
        A: new DrawLetter("A", [
            new Stroke([
                new Linear({x:0, y:100}, {x:35, y:0}),
            ]),
            new Stroke([
                new Linear({x:35, y:0}, {x:70, y:100}),
            ]),
            new Stroke([
                new Linear({x:15, y:60}, {x:50, y:60}),
            ])
        ], 70),
        B: new DrawLetter("B", [
            new Stroke([
                new Linear({x:0, y:100}, {x:0, y:0}),
            ]),
            new Stroke([
                // center at 15, 25?
                new Circular({x:0, y:5}, {x:0, y:45}, 25, true, true),
            ]),
            new Stroke([
                // center at 15, 75?
                new Circular({x:0, y:55}, {x:0, y:95}, 25, true, true),
            ]),
        ], 35),
        C: new DrawLetter("C", [
            new Stroke([
                new Circular({x:70, y:50-Math.sqrt(50**2 - 20**2)}, {x:70, y:50+Math.sqrt(50**2 - 20**2)}, 50, false, true),
            ]),
        ], 70),
        D: new DrawLetter("D", [
            new Stroke([
                new Linear({x:0, y:100}, {x:0, y:0}),
            ]),
            new Stroke([
                new Circular({x:0, y:50-Math.sqrt(50**2 - 20**2)}, {x:0, y:50+Math.sqrt(50**2 - 20**2)}, 50, true, true),
            ]),
        ], 70),
        E: new DrawLetter("E", [
            new Stroke([
                new Linear({x:50, y:0}, {x:0, y:0}),
            ]),
            new Stroke([
                new Linear({x:0, y:0}, {x:0, y:100}),
            ]),
            new Stroke([
                new Linear({x:0, y:100}, {x:50, y:100}),
            ]),
            new Stroke([
                new Linear({x:0, y:50}, {x:40, y:50}),
            ]),
        ], 50),
        F: new DrawLetter("F", [
            new Stroke([
                new Linear({x:50, y:0}, {x:0, y:0}),
            ]),
            new Stroke([
                new Linear({x:0, y:0}, {x:0, y:100}),
            ]),
            new Stroke([
                new Linear({x:0, y:50}, {x:40, y:50}),
            ]),
        ], 50),
        G: new DrawLetter("G", [
            new Stroke([
                new Circular({x:70, y:50-Math.sqrt(2100)}, {x:70, y:50+Math.sqrt(2100)}, 50, false, true),
                new Linear({x:70, y:50+Math.sqrt(2100)}, {x:70, y:60}),
                new Linear({x:70, y:60}, {x:40, y:60}),
            ])
        ], 70),
        H: new DrawLetter("H", [
            new Stroke([
                new Linear({x:0, y:0}, {x:0, y:100}),
            ]),
            new Stroke([
                new Linear({x:0, y:50}, {x:60, y:50}),
            ]),
            new Stroke([
                new Linear({x:60, y:0}, {x:60, y:100}),
            ]),
        ], 60),
        I: new DrawLetter("I", [
            new Stroke([
                new Linear({x:0, y:0}, {x:50, y:0}),
            ]),
            new Stroke([
                new Linear({x:25, y:0}, {x:25, y:100}),
            ]),
            new Stroke([
                new Linear({x:0, y:100}, {x:50, y:100}),
            ]),
        ], 50),
        J: new DrawLetter("J", [
            new Stroke([
                new Linear({x:50, y:0}, {x:50, y:75}),
                new Circular({x:50, y:75}, {x:0, y:75}, 25, true, true),
            ]),
        ], 50),
        K: new DrawLetter("K", [
            new Stroke([
                new Linear({x:0, y:0}, {x:0, y:100}),
            ]),
            new Stroke([
                new Linear({x:50, y:0}, {x:0, y:50}),
            ]),
            new Stroke([
                new Linear({x:0, y:50}, {x:50, y:100}),
            ]),
        ], 50),
        L: new DrawLetter("L", [
            new Stroke([
                new Linear({x:0, y:0}, {x:0, y:100}),
            ]),
            new Stroke([
                new Linear({x:0, y:100}, {x:40, y:100}),
            ]),
        ], 40),
        M: new DrawLetter("M", [
            new Stroke([
                new Linear({x:0, y:100}, {x:0, y:0}),
            ]),
            new Stroke([
                new Linear({x:0, y:0}, {x:30, y:60}),
                new Linear({x:30, y:60}, {x:60, y:0}),
            ]),
            new Stroke([
                new Linear({x:60, y:0}, {x:60, y:100}),
            ]),
        ], 60),
        N: new DrawLetter("N", [
            new Stroke([
                new Linear({x:0, y:100}, {x:0, y:0}),
            ]),
            new Stroke([
                new Linear({x:0, y:0}, {x:50, y:100}),
            ]),
            new Stroke([
                new Linear({x:50, y:100}, {x:50, y:0}),
            ]),
        ], 50),
        O: new DrawLetter("O", [
            new Stroke([
                new Circular({x:50, y:0}, {x:50, y:100}, 50, false, true),
                new Circular({x:50, y:100}, {x:50, y:0}, 50, false, true),
            ]),
        ], 100),
        P: new DrawLetter("P", [
            new Stroke([
                new Linear({x:0, y:100}, {x:0, y:0}),
            ]),
            new Stroke([
                // center at 15, 25?
                new Circular({x:0, y:5}, {x:0, y:45}, 25, true, true),
            ]),
        ], 40),
        Q: new DrawLetter("Q", [
            new Stroke([
                new Circular({x:50, y:0}, {x:50, y:100}, 50, false, true),
                new Circular({x:50, y:100}, {x:50, y:0}, 50, false, true),
            ]),
            new Stroke([
                new Linear({x:62, y:70}, {x:100, y:100}),
            ])
        ], 100),
        R: new DrawLetter("R", [
            new Stroke([
                new Linear({x:0, y:100}, {x:0, y:0}),
            ]),
            new Stroke([
                // center at 15, 25?
                new Circular({x:0, y:5}, {x:0, y:45}, 25, true, true),
                new Linear({x:0, y:45}, {x:40, y:100}),
            ]),
        ], 40),
        S: new DrawLetter("S", [
            new Stroke([
                new Circular({x:50, y:25}, {x:25, y:50}, 25, false, true),
                new Circular({x:25, y:50}, {x:0, y:75}, 25, true, true),
            ]),
        ], 50),
        T: new DrawLetter("T", [
            new Stroke([
                new Linear({x:0, y:0}, {x:60, y:0}),
            ]),
            new Stroke([
                new Linear({x:30, y:0}, {x:30, y:100}),
            ]),
        ], 60),
        U: new DrawLetter("U", [
            new Stroke([
                new Linear({x:0, y:0}, {x:0, y:70}),
                new Circular({x:0, y:70}, {x:60, y:70}, 30, false, true),
                new Linear({x:60, y:70}, {x:60, y:0}),
            ]),
        ], 60),
        V: new DrawLetter("V", [
            new Stroke([
                new Linear({x:0, y:0}, {x:30, y:100}),
            ]),
            new Stroke([
                new Linear({x:30, y:100}, {x:60, y:0}),
            ]),
        ], 60),
        W: new DrawLetter("W", [
            new Stroke([
                new Linear({x:0, y:0}, {x:20, y:100}),
            ]),
            new Stroke([
                new Linear({x:20, y:100}, {x:40, y:50}),
            ]),
            new Stroke([
                new Linear({x:40, y:50}, {x:60, y:100}),
            ]),
            new Stroke([
                new Linear({x:60, y:100}, {x:80, y:0}),
            ]),
        ], 80),
        X: new DrawLetter("X", [
            new Stroke([
                new Linear({x:0, y:0}, {x:60, y:100}),
            ]),
            new Stroke([
                new Linear({x:60, y:0}, {x:0, y:100}),
            ]),
        ], 60),
        Y: new DrawLetter("Y", [
            new Stroke([
                new Linear({x:0, y:0}, {x:30, y:50}),
            ]),
            new Stroke([
                new Linear({x:60, y:0}, {x:0, y:100}),
            ]),
        ], 60),
        Z: new DrawLetter("Z", [
            new Stroke([
                new Linear({x:0, y:0}, {x:60, y:0}),
            ]),
            new Stroke([
                new Linear({x:60, y:0}, {x:0, y:100}),
            ]),
            new Stroke([
                new Linear({x:0, y:100}, {x:60, y:100}),
            ]),
        ], 60),
        " ": new DrawLetter(" ", [], 20),
        a: new DrawLetter("a", [
            new Stroke([
                new Linear({x:45, y:50}, {x:45, y:100}),
            ]),
            new Stroke([
                // center at 25, 75
                new Circular({x:45, y:60}, {x:45, y:90}, 25, false, true),
            ]),
        ], 45),
        b: new DrawLetter("b", [
            new Stroke([
                new Linear({x:0, y:0}, {x:0, y:100}),
            ]),
            new Stroke([
                // center at 15, 75
                new Circular({x:0, y:55}, {x:0, y:95}, 25, true, true),
            ]),
        ], 40),
        c: new DrawLetter("c", [
            new Stroke([
                // center at 25, 75
                new Circular({x:40, y:55}, {x:40, y:95}, 25, false, true),
            ]),
        ], 40),
        d: new DrawLetter("d", [
            new Stroke([
                new Linear({x:40, y:0}, {x:40, y:100}),
            ]),
            new Stroke([
                // center at 25, 75
                new Circular({x:40, y:55}, {x:40, y:95}, 25, false, true),
            ]),
        ], 40),
        e: new DrawLetter("e", [
            new Stroke([
                new Linear({x:0, y:75}, {x:50, y:75}),
                // center at 25, 75
                new Circular({x:50, y:75}, {x:25, y:100}, 25, false, true),
                new Linear({x:25, y:100}, {x:37.5, y:100}),
            ]),
        ], 50),
        f: new DrawLetter("f", [
            new Stroke([
                // center at 25, 75
                new Circular({x:40, y:0}, {x:20, y:20}, 20, false, false),
                new Linear({x:20, y:20}, {x:20, y:100}),
            ]),
            new Stroke([
                new Linear({x:0, y:50}, {x:40, y:50}),
            ]),
        ], 40),
        g: new DrawLetter("g", [
            new Stroke([
                // center at 25, 75
                new Circular({x:40, y:55}, {x:40, y:95}, 25, false, true),
            ]),
            new Stroke([
                new Linear({x:40, y:50}, {x:40, y:120}),
                new Circular({x:40, y:120}, {x:0, y:120}, 20, true, true),
            ]),
        ], 40),
        h: new DrawLetter("h", [
            new Stroke([
                new Linear({x:0, y:0}, {x:0, y:100}),
            ]),
            new Stroke([
                // center at 15, 75
                new Circular({x:0, y:70}, {x:40, y:70}, 20, true, true),
                new Linear({x:40, y:70}, {x:40, y:100}),
            ]),
        ], 40),
        i: new DrawLetter("i", [
            new Stroke([
                new Linear({x:10, y:50}, {x:10, y:100}),
            ]),
            new Stroke([
                new Circular({x:10, y:20}, {x:10, y:30}, 5, true, true),
                new Circular({x:10, y:30}, {x:10, y:20}, 5, true, true),
            ]),
        ], 20),
        j: new DrawLetter("j", [
            new Stroke([
                new Linear({x:30, y:60}, {x:30, y:120}),
                new Circular({x:30, y:120}, {x:0, y:120}, 15, true, true),
            ]),
            new Stroke([
                new Circular({x:30, y:20}, {x:30, y:30}, 5, true, true),
                new Circular({x:30, y:30}, {x:30, y:20}, 5, true, true),
            ]),
        ], 45),
        k: new DrawLetter("k", [
            new Stroke([
                new Linear({x:0, y:20}, {x:0, y:100}),
            ]),
            new Stroke([
                new Linear({x:30, y:50}, {x:0, y:75}),
                new Linear({x:0, y:75}, {x:30, y:100}),
            ]),
        ], 30),
        l: new DrawLetter("l", [
            new Stroke([
                new Linear({x:0, y:0}, {x:0, y:90}),
                new Circular({x:0, y:90}, {x:10, y:100}, 10, false, false),
            ]),
        ], 10),
        m: new DrawLetter("m", [
            new Stroke([
                new Linear({x:0, y:50}, {x:0, y:100}),
            ]),
            new Stroke([
                // center at 15, 65
                new Circular({x:0, y:65}, {x:30, y:65}, 15, true, true),
                new Linear({x:30, y:65}, {x:30, y:100}),
            ]),
            new Stroke([
                // center at 45, 65
                new Circular({x:30, y:65}, {x:60, y:65}, 15, true, true),
                new Linear({x:60, y:65}, {x:60, y:100}),
            ]),
        ], 60),
        n: new DrawLetter("n", [
            new Stroke([
                new Linear({x:0, y:50}, {x:0, y:100}),
            ]),
            new Stroke([
                // center at 20, 70
                new Circular({x:0, y:70}, {x:40, y:70}, 20, true, true),
                new Linear({x:40, y:70}, {x:40, y:100}),
            ]),
        ], 40),
        o: new DrawLetter("o", [
            new Stroke([
                new Circular({x:50, y:75}, {x:0, y:75}, 25, false, true),
                new Circular({x:0, y:75}, {x:50, y:75}, 25, false, true),
            ]),
        ], 50),
        p: new DrawLetter("p", [
            new Stroke([
                new Linear({x:0, y:50}, {x:0, y:140}),
            ]),
            new Stroke([
                // center at 15, 75
                new Circular({x:0, y:55}, {x:0, y:95}, 25, true, true),
            ]),
        ], 40),
        q: new DrawLetter("q", [
            new Stroke([
                new Linear({x:40, y:50}, {x:40, y:140}),
            ]),
            new Stroke([
                // center at 25, 75
                new Circular({x:40, y:55}, {x:40, y:95}, 25, false, true),
            ]),
        ], 40),
        r: new DrawLetter("r", [
            new Stroke([
                new Linear({x:0, y:50}, {x:0, y:100}),
            ]),
            new Stroke([
                // center at 15, 65
                new Circular({x:0, y:65}, {x:30, y:65}, 15, true, true),
            ]),
        ], 30),
        s: new DrawLetter("s", [
            new Stroke([
                new Circular({x:25, y:62.5}, {x:12.5, y:75}, 12.5, false, true),
                new Circular({x:12.5, y:75}, {x:0, y:87.5}, 12.5, true, true),
            ]),
        ], 25),
        t: new DrawLetter("t", [
            new Stroke([
                new Linear({x:20, y:0}, {x:20, y:100}),
            ]),
            new Stroke([
                new Linear({x:0, y:50}, {x:40, y:50}),
            ])
        ], 40),
        u: new DrawLetter("u", [
            new Stroke([
                new Linear({x:0, y:50}, {x:0, y:80}),
                // center at 20, 80
                new Circular({x:0, y:80}, {x:40, y:80}, 20, false, true),
            ]),
            new Stroke([
                new Linear({x:40, y:50}, {x:40, y:100}),
            ]),
        ], 40),
        v: new DrawLetter("v", [
            new Stroke([
                new Linear({x:0, y:50}, {x:20, y:100}),
            ]),
            new Stroke([
                new Linear({x:20, y:100}, {x:40, y:50}),
            ]),
        ], 40),
        w: new DrawLetter("w", [
            new Stroke([
                new Linear({x:0, y:50}, {x:15, y:100}),
            ]),
            new Stroke([
                new Linear({x:15, y:100}, {x:30, y:70}),
            ]),
            new Stroke([
                new Linear({x:30, y:70}, {x:45, y:100}),
            ]),
            new Stroke([
                new Linear({x:45, y:100}, {x:60, y:50}),
            ]),
        ], 60),
        x: new DrawLetter("x", [
            new Stroke([
                new Linear({x:0, y:50}, {x:40, y:100}),
            ]),
            new Stroke([
                new Linear({x:40, y:50}, {x:0, y:100}),
            ]),
        ], 40),
        y: new DrawLetter("y", [
            new Stroke([
                new Linear({x:0, y:50}, {x:0, y:80}),
                // center at 20, 80
                new Circular({x:0, y:80}, {x:40, y:80}, 20, false, true),
            ]),
            new Stroke([
                new Linear({x:40, y:50}, {x:40, y:120}),
                new Circular({x:40, y:120}, {x:0, y:120}, 20, true, true),
            ]),
        ], 40),
        z: new DrawLetter("z", [
            new Stroke([
                new Linear({x:0, y:50}, {x:40, y:50}),
            ]),
            new Stroke([
                new Linear({x:40, y:50}, {x:0, y:100}),
            ]),
            new Stroke([
                new Linear({x:0, y:100}, {x:40, y:100}),
            ]),
        ], 40),
        "=": new DrawLetter("=",[
            new Stroke([
                new Linear({x:0, y:40}, {x:40, y:40}),
            ]),
            new Stroke([
                new Linear({x:0, y:60}, {x:40, y:60}),
            ]),
        ], 40),
        "-": new DrawLetter("-",[
            new Stroke([
                new Linear({x:0, y:50}, {x:40, y:50}),
            ]),
        ], 40),
        "+": new DrawLetter("+",[
            new Stroke([
                new Linear({x:20, y:30}, {x:20, y:70}),
            ]),
            new Stroke([
                new Linear({x:0, y:50}, {x:40, y:50}),
            ]),
        ], 40),
        "*": new DrawLetter("*",[
            new Stroke([
                new Circular({x:5, y:45}, {x:5, y:55}, 5, true, true),
                new Circular({x:5, y:55}, {x:5, y:45}, 5, true, true),
            ]),
        ], 10),
        ":": new DrawLetter(":",[
            new Stroke([
                new Circular({x:5, y:35}, {x:5, y:45}, 5, true, true),
                new Circular({x:5, y:45}, {x:5, y:35}, 5, true, true),
            ]),
            new Stroke([
                new Circular({x:5, y:55}, {x:5, y:65}, 5, true, true),
                new Circular({x:5, y:65}, {x:5, y:55}, 5, true, true),
            ]),
        ], 10),
        "?": new DrawLetter("?",[
            new Stroke([
                new Circular({x:0, y:25}, {x:25, y:50}, 25, true, true),
                new Linear({x:25, y:50}, {x:25, y:70}),
            ]),
            new Stroke([
                new Circular({x:25, y:90}, {x:25, y:100}, 5, true, true),
                new Circular({x:25, y:100}, {x:25, y:90}, 5, true, true),
            ]),
        ], 50),
        "!": new DrawLetter("!",[
            new Stroke([
                new Linear({x:5, y:0}, {x:5, y:70}),
            ]),
            new Stroke([
                new Circular({x:5, y:90}, {x:5, y:100}, 5, true, true),
                new Circular({x:5, y:100}, {x:5, y:90}, 5, true, true),
            ]),
        ], 10),
        "'": new DrawLetter("'", [
            new Stroke([
                new Linear({x:10, y:15}, {x:0, y:30}),
            ]),
        ], 10),
        ",": new DrawLetter(",", [
            new Stroke([
                new Linear({x:10, y:92.5}, {x:0, y:107.5}),
            ]),
        ], 10),
        ".": new DrawLetter(".", [
            new Stroke([
                new Circular({x:5, y:90}, {x:5, y:100}, 5, true, true),
                new Circular({x:5, y:100}, {x:5, y:90}, 5, true, true),
            ]),
        ], 10),
        "(": new DrawLetter("(", [
            new Stroke([
                /*
                 * 50^2 + (r - 20)^2 = r^2
                 * 2500 + r^2 - 40r + 400 = r^2
                 * r = 2900/40 = 72.5
                 */
                new Circular({x:20, y:0}, {x:20, y:100}, 72.5, false, false),
            ]),
        ], 20),
        ")": new DrawLetter(")", [
            new Stroke([
                /*
                 * 50^2 + (r - 20)^2 = r^2
                 * 2500 + r^2 - 40r + 400 = r^2
                 * r = 2900/40 = 72.5
                 */
                new Circular({x:0, y:0}, {x:0, y:100}, 72.5, true, false),
            ]),
        ], 20),
        "1": new DrawLetter("1", [
            new Stroke([
                new Linear({x:0, y:10}, {x:15, y:0}),
                new Linear({x:15, y:0}, {x:15, y:100}),
            ]),
            new Stroke([
                new Linear({x:0, y:100}, {x:30, y:100}),
            ]),
        ], 30),
        "2": new DrawLetter("2", [
            new Stroke([
                new Circular({x:0, y:25}, {x:25 + 25*Math.sqrt(3)/2, y:25 + 25/2}, 25, true, true),
                new Linear({x:25 + 25*Math.sqrt(3)/2, y:25 + 25/2}, {x:0, y:100}),
                new Linear({x:0, y:100}, {x:55, y:100}),
            ]),
        ], 55),
        "3": new DrawLetter("3", [
            new Stroke([
                new Circular({x:0, y:25}, {x:25, y:50}, 25, true, true),
                new Circular({x:25, y:50}, {x:0, y:75}, 25, true, true),
            ]),
        ], 50),
        "4": new DrawLetter("4", [
            new Stroke([
                new Linear({x:0, y:0}, {x:0, y:50}),
                new Linear({x:0, y:50}, {x:50, y:50}),
            ]),
            new Stroke([
                new Linear({x:50, y:0}, {x:50, y:100}),
            ]),
        ], 50),
        "5": new DrawLetter("5", [
            new Stroke([
                new Linear({x:50, y:0}, {x:0, y:0}),
                new Linear({x:0, y:0}, {x:0, y:55}),
                // new Linear({x:0, y:35}, {x:25, y:35}),
                new Circular({x:0, y:55}, {x:0, y:85}, 30, true, true),
            ]),
        ], 55),
        "6": new DrawLetter("6", [
            new Stroke([
                new Circular({x:40, y:0}, {x:0, y:40}, 40, false, false),
                new Linear({x:0, y:40}, {x:0, y:75}),
                new Circular({x:0, y:75}, {x:50, y:75}, 25, false, true),
                new Circular({x:50, y:75}, {x:0, y:75}, 25, false, true),
            ]),
            // new Stroke([
            //     /*
            //      * 50^2 + (r - 20)^2 = r^2
            //      * 2500 + r^2 - 40r + 400 = r^2
            //      * r = 2900/40 = 72.5
            //      */
            //     new Circular({x:20, y:0}, {x:20, y:100}, 72.5, false, false),
            // ]),
        ], 50),
        "7": new DrawLetter("7", [
            new Stroke([
                new Linear({x:0, y:0}, {x:50, y:0}),
                new Linear({x:60, y:0}, {x:10, y:100}),
            ]),
        ], 60),
        "8": new DrawLetter("8", [
            new Stroke([
                new Circular({x:27.5, y:45}, {x:27.5, y:0}, 22.5, false, true),
                new Circular({x:27.5, y:0}, {x:27.5, y:45}, 22.5, false, true),
                new Circular({x:27.5, y:45}, {x:27.5, y:100}, 27.5, true, true),
                new Circular({x:27.5, y:100}, {x:27.5, y:45}, 27.5, true, true),
            ]),
        ], 55),
        "9": new DrawLetter("9", [
            new Stroke([
                new Circular({x:50, y:25}, {x:0, y:25}, 25, true, true),
                new Circular({x:0, y:25}, {x:50, y:25}, 25, true, true),
                new Linear({x:50, y:25}, {x:50, y:100}),
            ]),
        ], 50),
        "0": new DrawLetter("0", [
            new Stroke([
                new Linear({x:0, y:25}, {x:0, y:75}),
                new Circular({x:0, y:75}, {x:50, y:75}, 25, false, true),
                new Linear({x:50, y:75}, {x:50, y:25}),
                new Circular({x:50, y:25}, {x:0, y:25}, 25, false, true),
            ]),
            // new Stroke([
            //     new Linear({x:50, y:0}, {x:50, y:100}),
            // ]),
        ], 50),
    }

    function getAtd() {
        return InkTool.InkCanvasLib.List[document.querySelector(".worksheet-container.selected stroke .stroke[id*='-red-comment-']").id];
    }

    // TODO this should be a map<atd:[]>
    // can't really make this usable because it doesn't account for other draw/undo
    // maybe implement an undo all & redo all instead
    var writeStrokes = {}
    var newDrawCounter = 0;

    function writeAllAt(text, pos, scale, color = "#ff2200") {
        // copy
        let original_pos = {x: pos.x, y: pos.y};
        let current_pos = {x: pos.x, y: pos.y};
        let atd = getAtd();
        let currentDrawIndex = atd.countDrawItems();
        newDrawCounter = 0;

        selectPen();
        setPenColorHex(color);
        let pointer = InkTool.InkCanvasLib.PointerTraceList[0];
        // atd.pen.col.R = 24;
        // atd.pen.col.G = 255;
        // // type 150 for writing?
        // atd.pen.tp = 150;
        atd.pen.w = 2;
        for (let c of text) {
            if (c == "\n") {
                current_pos.x = original_pos.x;
                current_pos.y = current_pos.y + 145 * scale + 5;
            }
            let letter = LETTERS[c];
            if (typeof letter === "undefined") {
                continue;
            }
            writeAt(letter, current_pos, scale, atd, pointer);
            current_pos.x += (letter.width + 10) * scale + 3;
        }
        saveDrawing(atd, pointer);
        if (!(atd in writeStrokes)) {
            writeStrokes[atd] = []
        }
        writeStrokes[atd].push({startIndex: currentDrawIndex, numLines: newDrawCounter});
    }

    function undoLastWriteAll() {
        let atd = getAtd();
        if (!(atd in writeStrokes) || writeStrokes[atd].length == 0) {
            return;
        }

        let numItems = atd.countDrawItems();

        let lastWriteInfo = writeStrokes[atd].pop();
        atd.clearupTracers();
        for (let i = lastWriteInfo.startIndex; i < Math.min(lastWriteInfo.startIndex + lastWriteInfo.numLines, numItems); i++) {
            undoInk(atd, lastWriteInfo.startIndex);
        }
        atd.redrawCurrentLayerByInk();
        atd.penUpFunc(atd); // updates the models in angular
    }

    function undoInk(atd, index) {
        var maxnum = atd.countDrawItems();
        if (maxnum <= index) {
            return false;
        }
        atd.currentLayer.Drawing.deleteDrawItem(index);
        return true;
    }

    function saveDrawing(atd, pointer) {
        // Add a dummy drawing to undo
        atd.currentStroke = new InkTool.InkStroke(atd.pen);
        atd.drawingContext.context = atd.dcanvas.getContext("2d");
        let cell = new InkTool.InkCell(0, 30, 20, 6, 0, ++pointer.lastTime);
        atd.currentStroke.addCell(cell);
        atd.pen.drawStart(atd.drawingContext);
        atd.pen.strokeDispatch(atd.drawingContext, cell, 1);
        atd.arrayCopy.push(cell);
        cell = new InkTool.InkCell(2, 30, 20, 6, 0, ++pointer.lastTime);
        atd.currentStroke.addCell(cell);
        atd.pen.strokeDispatch(atd.drawingContext, cell, 1);
        atd.pen.drawEnd(atd.drawingContext);
        atd.arrayCopy.push(cell);
        atd.currentLayer.Drawing.is.push(atd.currentStroke);

        // Doesn't look important
        atd.drawingBuffer = atd.currentLayer.Drawing.clone();

        // adding an extra stroke and undoing it makes the image persist on the canvas
        atd.undoInk();

        atd.penUpFunc(atd); // updates the models in angular
    }

    function writeAt(letter, pos, scale, atd, pointer) {
        for (let stroke of letter.strokes) {
            let doneFirst = false;
            let lastPoint = null;
            // console.log(`stroke: ${stroke}`);
            // console.log(`typeof stroke: ${typeof stroke}`);
            // console.log(`stroke.lines: ${stroke.lines}`);

            atd.currentStroke = new InkTool.InkStroke(atd.pen);
            atd.drawingContext.context = atd.dcanvas.getContext("2d");
            for (let line of stroke.lines) {
                let points = line.getPoints(scale);
                if (points.length < 3) {
                    continue;
                }

                if (!doneFirst) {
                    drawCell(pos, points[0], 0, atd, pointer);
                    doneFirst = true;
                } else {
                    drawCell(pos, points[0], 4, atd, pointer);
                }

                for (let i = 1; i < points.length; i++) {
                    drawCell(pos, points[i], 4, atd, pointer);
                }
                lastPoint = points[points.length - 1];
            }

            // finishing point
            drawCell(pos, lastPoint, 2, atd, pointer);
            atd.currentLayer.Drawing.is.push(atd.currentStroke);

            newDrawCounter++;

            // Doesn't look important
            atd.drawingBuffer = atd.currentLayer.Drawing.clone();
            atd.penUpFunc(atd); // updates the models in angular
        }

    }

    function drawCell(startPos, point, m, atd, pointer) {
        if (point == null) return;
        let x = Math.min(startPos.x + point[0], atd.inkWidth);
        let y = Math.min(startPos.y + point[1], atd.inkHeight);
        let cell = new InkTool.InkCell(m, x, y, atd.pen.w, 0, ++pointer.lastTime);
        atd.currentStroke.addCell(cell);
        if (m == 0) {
            atd.pen.drawStart(atd.drawingContext);
        }
        atd.pen.strokeDispatch(atd.drawingContext, cell, 1);
        if (m == 2) {
            atd.pen.drawEnd(atd.drawingContext);
        }
        atd.arrayCopy.push(cell);
    }

    function setPenColorHex(color) {
        let atd = getAtd();
        try {
            atd.pen.col.R = parseInt(color.substr(1,2), 16);
            atd.pen.col.G = parseInt(color.substr(3,2), 16);
            atd.pen.col.B = parseInt(color.substr(5,2), 16);
        } catch {
            atd.pen.col.R = 255;
            atd.pen.col.G = 34;
            atd.pen.col.B = 0;
        }
    }

    function wip() {
        // canvas_back = document.querySelector(".worksheet-container.selected .strokes.worksheet-layer canvas[id*='-comment-'][id*='_back']")
        // ctx_back = canvas_back.getContext("2d");
        // canvas_draw = document.querySelector(".worksheet-container.selected .strokes.worksheet-layer canvas[id*='-comment-'][id*='_draw']")
        // ctx_draw = canvas_draw.getContext("2d");

        // ctx_back.font = "20px sans-serif"
        // ctx_back.fillStyle = "#000000";
        // ctx_back.fillText("Please fix mistakes :)", 50, 20);

        // Modifying an existing stroke
        // atd = InkTool.InkCanvasLib.List["ATD0020P-red-comment-00"]
        // strokes = atd.currentDrawing.is; // list of strokes, including erases
        // stroke = strokes[59];
        // stroke_info = stroke.st; //stroke info
        // stroke_width = stroke_info.w; //width
        // stroke_color = stroke_info.col; // eraser is (58,63,59), red is (255,34,0)
        // After modifying these objects, have to "update" angular by adding something, e.g. adding an eraser stroke somewhere

        selectPen();
        atd = InkTool.InkCanvasLib.List["ATD0020P-red-comment-91"]
        pointer = InkTool.InkCanvasLib.PointerTraceList[0];
        // InkTool.InkCanvasLib.tracePenDown(pointer);
        // InkTool.InkCanvasLib.tracePenMove(pointer);
        // can adjust pen.col for color
        // pen.w for width
        atd.pen.col.R = 24;
        atd.pen.col.G = 255;
        // type 150 for writing?
        atd.pen.tp = 150;
        atd.pen.w = 2;
        // initialize new stroke (line from pen down to pen up)
        atd.currentStroke = new InkTool.InkStroke(atd.pen);
        // bcanvas
        //  shows wrong color initially, but "saving" click (manual draw after) will be correct color
        //  pause saves the correct color
        // dcanvas
        //  shows wrong color initially, next draw erases (because we didn't push to arrayCopy?)
        //  but pause correctly saves
        // dcanvas with arrayCopy & not selecting pencil or eraser before running
        //  shows correct color.
        //      Selecting pencil erases it, but will save if drawing something manually
        //      Selecting eraser can't erase it; next draw will erase it but will still save
        // dcanvas with arrayCopy after selecting pencil
        //  correct color, next draw is new color, erases but saves
        // click to draw and then undo :O
        atd.drawingContext.context = atd.dcanvas.getContext("2d");

        // first cell has mode 0, last cell has mode 2, middle cells have mode 3, -1, 4
        // 3 = pause ?
        // pause move pause has 3s & -1s
        // no pausing has 4s & -1s
        // mode, left, top, width, ?, timestamp
        // cell = new InkTool.InkCell(0, 10, 20, 6, 0, ++pointer.lastTime);
        cell = new InkTool.InkCell(0, 10, 110, 2, 0, ++pointer.lastTime);
        atd.currentStroke.addCell(cell);
        atd.pen.drawStart(atd.drawingContext);
        atd.pen.strokeDispatch(atd.drawingContext, cell, 1);
        atd.arrayCopy.push(cell);
        // cell = new InkTool.InkCell(4, 10, 30, 6, 0, ++pointer.lastTime);
        cell = new InkTool.InkCell(4, 27.5, 60, 2, 0, ++pointer.lastTime);
        atd.currentStroke.addCell(cell);
        atd.pen.strokeDispatch(atd.drawingContext, cell, 1);
        atd.arrayCopy.push(cell);
        // cell = new InkTool.InkCell(4, 20, 30, 6, 0, ++pointer.lastTime);
        cell = new InkTool.InkCell(4, 45, 10, 2, 0, ++pointer.lastTime);
        atd.currentStroke.addCell(cell);
        atd.pen.strokeDispatch(atd.drawingContext, cell, 1);
        atd.arrayCopy.push(cell);
        cell = new InkTool.InkCell(4, 45, 10, 2, 0, ++pointer.lastTime);
        atd.currentStroke.addCell(cell);
        atd.pen.strokeDispatch(atd.drawingContext, cell, 1);
        atd.arrayCopy.push(cell);
        cell = new InkTool.InkCell(4, 62.5, 60, 2, 0, ++pointer.lastTime);
        atd.currentStroke.addCell(cell);
        atd.pen.strokeDispatch(atd.drawingContext, cell, 1);
        atd.arrayCopy.push(cell);
        cell = new InkTool.InkCell(4, 80, 110, 2, 0, ++pointer.lastTime);
        atd.currentStroke.addCell(cell);
        atd.pen.strokeDispatch(atd.drawingContext, cell, 1);
        atd.arrayCopy.push(cell);
        // cell = new InkTool.InkCell(2, 20, 30, 6, 0, ++pointer.lastTime);
        cell = new InkTool.InkCell(2, 80, 110, 2, 0, ++pointer.lastTime);
        atd.currentStroke.addCell(cell);
        atd.pen.strokeDispatch(atd.drawingContext, cell, 1);
        atd.pen.drawEnd(atd.drawingContext);
        atd.arrayCopy.push(cell);
        // also push cell to atd.currentStroke.arrayCell or .arrayCopy ?
        // atd.pen.strokeDispatch ? if arrayCopy or ___?
        // penUp creates last cell with mode 2
        // atd.pen.strokeDispatch ? if arrayCopy or ___?
        // atd.pen.drawEnd ? if arrayCopy or ___?
        // ????
        atd.currentLayer.Drawing.is.push(atd.currentStroke);
        // might need to manually draw something to update angular

        // Doesn't look important
        atd.drawingBuffer = atd.currentLayer.Drawing.clone();

        /*** del here ***/

        atd.currentStroke = new InkTool.InkStroke(atd.pen);
        // bcanvas
        //  shows wrong color initially, but "saving" click (manual draw after) will be correct color
        //  pause saves the correct color
        // dcanvas
        //  shows wrong color initially, next draw erases (because we didn't push to arrayCopy?)
        //  but pause correctly saves
        // dcanvas with arrayCopy & not selecting pencil or eraser before running
        //  shows correct color.
        //      Selecting pencil erases it, but will save if drawing something manually
        //      Selecting eraser can't erase it; next draw will erase it but will still save
        // dcanvas with arrayCopy after selecting pencil
        //  correct color, next draw is new color, erases but saves
        // click to draw and then undo :O
        atd.drawingContext.context = atd.dcanvas.getContext("2d");

        // first cell has mode 0, last cell has mode 2, middle cells have mode 3, -1, 4
        // 3 = pause ?
        // pause move pause has 3s & -1s
        // no pausing has 4s & -1s
        // mode, left, top, width, ?, timestamp
        // cell = new InkTool.InkCell(0, 10, 20, 6, 0, ++pointer.lastTime);
        cell = new InkTool.InkCell(0, 27.5, 60, 2, 0, ++pointer.lastTime);
        atd.currentStroke.addCell(cell);
        atd.pen.drawStart(atd.drawingContext);
        atd.pen.strokeDispatch(atd.drawingContext, cell, 1);
        atd.arrayCopy.push(cell);
        // cell = new InkTool.InkCell(4, 10, 30, 6, 0, ++pointer.lastTime);
        cell = new InkTool.InkCell(4, 45, 60, 2, 0, ++pointer.lastTime);
        atd.currentStroke.addCell(cell);
        atd.pen.strokeDispatch(atd.drawingContext, cell, 1);
        atd.arrayCopy.push(cell);
        // cell = new InkTool.InkCell(4, 20, 30, 6, 0, ++pointer.lastTime);
        cell = new InkTool.InkCell(4, 62.5, 60, 2, 0, ++pointer.lastTime);
        atd.currentStroke.addCell(cell);
        atd.pen.strokeDispatch(atd.drawingContext, cell, 1);
        atd.arrayCopy.push(cell);
        // cell = new InkTool.InkCell(2, 20, 30, 6, 0, ++pointer.lastTime);
        cell = new InkTool.InkCell(2, 62.5, 60, 2, 0, ++pointer.lastTime);
        atd.currentStroke.addCell(cell);
        atd.pen.strokeDispatch(atd.drawingContext, cell, 1);
        atd.pen.drawEnd(atd.drawingContext);
        atd.arrayCopy.push(cell);
        // also push cell to atd.currentStroke.arrayCell or .arrayCopy ?
        // atd.pen.strokeDispatch ? if arrayCopy or ___?
        // penUp creates last cell with mode 2
        // atd.pen.strokeDispatch ? if arrayCopy or ___?
        // atd.pen.drawEnd ? if arrayCopy or ___?
        // ????
        atd.currentLayer.Drawing.is.push(atd.currentStroke);
        // might need to manually draw something to update angular

        // Doesn't look important
        atd.drawingBuffer = atd.currentLayer.Drawing.clone();

        /*** del here ***/

        // doesn't work
        // atd.dcanvas.click();

        //atd.pen.strokeDispatch is what draws on the browser canvas
        // need to draw something to update angular (which removes the image) and undo to bring the image back

        atd.currentStroke = new InkTool.InkStroke(atd.pen);
        atd.drawingContext.context = atd.dcanvas.getContext("2d");
        cell = new InkTool.InkCell(0, 30, 20, 6, 0, pointer.getLastTime());
        atd.currentStroke.addCell(cell);
        atd.pen.drawStart(atd.drawingContext);
        atd.pen.strokeDispatch(atd.drawingContext, cell, 1);
        atd.arrayCopy.push(cell);
        cell = new InkTool.InkCell(2, 30, 20, 6, 0, pointer.getLastTime() + 1);
        atd.currentStroke.addCell(cell);
        atd.pen.strokeDispatch(atd.drawingContext, cell, 1);
        atd.pen.drawEnd(atd.drawingContext);
        atd.arrayCopy.push(cell);
        // also push cell to atd.currentStroke.arrayCell or .arrayCopy ?
        // atd.pen.strokeDispatch ? if arrayCopy or ___?
        // penUp creates last cell with mode 2
        // atd.pen.strokeDispatch ? if arrayCopy or ___?
        // atd.pen.drawEnd ? if arrayCopy or ___?
        // ????
        atd.currentLayer.Drawing.is.push(atd.currentStroke);
        // might need to manually draw something to update angular

        // Doesn't look important
        atd.drawingBuffer = atd.currentLayer.Drawing.clone();

        // adding an extra stroke and undoing it makes the image persist on the canvas, but it still doesn't get saved unless manually adding another stroke
        expandToolbar();
        document.querySelector(".grading-toolbar .toolbar-item.undo").click();
        document.querySelector(".grading-toolbar-box").classList.add("close");

        // atd.undoInk();
        // atd.redoInk();
        // the actual undo tool itself doesn't save properly unless drawing something after
        // trigger atd pendown penup?
        atd.penUpFunc(atd); // updates the models in angular
    }

    //wip();

    global.StampLib = {
        getAtd: getAtd,
        writeAllAt: writeAllAt,
        undoLastWriteAll: undoLastWriteAll,
        setPenColorHex: setPenColorHex,
        private: {
            expandToolbar: expandToolbar,
            selectPen: selectPen,
            DrawLetter: DrawLetter,
            Stroke: Stroke,
            Line: Line,
            Linear: Linear,
            Circular: Circular,
            LETTERS: LETTERS,
            getWriteStrokes: function() {return writeStrokes;},
            getNewDrawCounter: function() {return newDrawCounter;},
            undoInk: undoInk,
            saveDrawing: saveDrawing,
            writeAt: writeAt,
            drawCell: drawCell,
        },
    }
    global.stamp = global.StampLib;
})(window);
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

.customToolbar {
  position: fixed;
  top: 80px;
  width: 30px;
  height: 150px;
  z-index: 252;
}
.customToolbar > button {
  display: none;
  position: absolute;
  left: 0px;
  height: 30px;
  width: 30px;
  z-index: 252;
  padding: 0;
}

.customToolbar, .headerZindexBtn, .shiftbtn, .xallbtn, .drawtab, .texttab {
  display: none;
}

.headerZindexBtn {
  top: 0px;
}

.shiftbtn {
  top: 40px;
}

.xallbtn {
  top: 80px;
}

.drawbtn {
  top: 120px;
  padding-top: 4px !important;
  display: unset !important;
}

.drawtab {
  position: absolute;
  top: 80px;
  border: 1px solid;
  width: 200px;
  height: 100px;
  z-index: 253;
  right: 0px;
  background: white;
}
.drawtab button {
  height: 30px;
}
.drawtab .squarebtn {
  width: 30px;
  margin: 10px;
}

.textbtn {
  padding: 0px;
}

.undoLast {
  padding-top: 3px;
}

.texttab {
  width: 404px;
  border: 1px solid;
  position: absolute;
  z-index: 254;
  right: 0;
  top: 0;
  background: white;
}
.texttab textarea {
  max-width: 100%;
  width: calc(100% - 5px);
  margin-bottom: -6px;
}

.sizeslider {
  margin: 10px 20px;
}

.texttab .textcolorbtn, .texttab .textprintbtn {
  margin-bottom: 10px;
  margin-top: 6px;
}
.texttab .textprintbtn {
  margin-left: 55px;
}
.texttab .textcolorbtn {
  float: right;
  margin-right: 6px;
}

.printoverlay {
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.2);
  position: fixed;
  top: 0;
  z-index: 998;
  display: none;
  border: 0px;
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
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-tool):has(.content-answer-content) .customToolbar {
    /* account for dynamic width answer content */
    left: calc((100vw - 410px) * 2 / 3 + 385px + 6px) !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .content-answer-content {
    /* dynamic width answer content so our xallbtn can have "fixed" position relative to the other buttons */
    width: calc((100vw - 410px) * 2 / 3) !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-tool):not(:has(.content-answer-content)):has(.worksheet-group.single) .customToolbar {
    left: 391px;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-group.single) .xallbtn, body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-group.single) .customToolbar {
    /* for this size, only show if in single page mode */
    display: unset !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(div.worksheet-container.landscape.selected,
  div.worksheet-group.landscape.selected) .content-detail {
    min-width: 550px !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(div.worksheet-container.landscape.selected,
  div.worksheet-group.landscape.selected) .customToolbar {
    left: 515px !important;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(div.worksheet-container.landscape.selected,
  div.worksheet-group.landscape.selected) .worksheet-tool {
    margin-left: 510px !important;
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
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) {
    /* &:has( */
    /*     div.worksheet-container.landscape.selected, */
    /*     div.worksheet-group.landscape.selected */
    /* ) { */
    /*     .customToolbar { */
    /*         left: 676px !important; */
    /*     } */
    /*     .worksheet-tool { */
    /*         margin-left: 671px !important; */
    /*     } */
    /* } */
  }
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
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-tool):has(.content-answer-content) .customToolbar {
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
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-tool):not(:has(.content-answer-content)) .customToolbar {
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
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-tool) .xallbtn, body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-tool) .customToolbar, body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-tool) .headerZindexBtn {
    display: unset !important;
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
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-tool) .shiftbtn, body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container):has(.worksheet-tool) .customToolbar {
    display: unset !important;
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
    /* Show H button, x all button, and toolbar */
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
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .customToolbar {
    left: 376px;
  }
  body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .headerZindexBtn, body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .xallbtn, body:has(.scroll-content .container .content .content-scroll-container .content-bg .content-detail .worksheet-container) .customToolbar {
    display: unset !important;
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
