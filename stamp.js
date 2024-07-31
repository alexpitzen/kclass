function expandToolbar() {
    if ($(".grading-toolbar-box.close")) {
        $(".grading-toolbar .toolbar-item").click();
    }
}

function selectPen() {
    if ($(".grading-toolbar .active.pen")) {
        return;
    }
    expandToolbar();
    $(".grading-toolbar-box .grading-toolbar .pen").click();
    $(".grading-toolbar-box").classList.add("close");
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
        console.log(a, b, xa, ya);
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

        console.log(this);
    }
    getPoints(scale) {
        let strokes = [];
        // we'll say the number of points will be equal to the arclength
        let numpts = this.arclength * scale;
        let angle = this.angle1;
        let anglestep = (this.angle2 - this.angle1) / numpts;
        strokes.push([this.startPos.x * scale, this.startPos.y * scale])
        for (i = 1; i < numpts - 1; i++) {
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

LETTERS = {
    A: new DrawLetter("A", [
        new Stroke([
            new Linear({x:0, y:100}, {x:35, y:0}),
            new Linear({x:35, y:0}, {x:70, y:100}),
        ]),
        new Stroke([
            new Linear({x:17.5, y:50}, {x:52.5, y:50}),
        ])
    ], 80),
    B: new DrawLetter("B", [
        new Stroke([
            new Linear({x:0, y:100}, {x:0, y:0}),
            new Circular({x:0, y:0}, {x:0, y:50}, 26, true, true),
            new Circular({x:0, y:50}, {x:0, y:100}, 26, true, true),
        ])
    ], 45),
    C: new DrawLetter("C", [
        new Stroke([
            new Circular({x:70, y:50-Math.sqrt(50**2 - 20**2)}, {x:70, y:50+Math.sqrt(50**2 - 20**2)}, 50, false, true),
            // new Circular({x:50, y:0}, {x:100, y:50}, 50, false, true),
        ])
    ], 80),
    D: new DrawLetter("D", [
        new Stroke([
            new Linear({x:0, y:100}, {x:0, y:0}),
            new Circular({x:0, y:0}, {x:0, y:100}, 50, true, false),
        ])
    ], 60),
    E: new DrawLetter("E", [
        new Stroke([
            new Linear({x:50, y:0}, {x:0, y:0}),
            new Linear({x:0, y:0}, {x:0, y:100}),
            new Linear({x:0, y:100}, {x:50, y:100}),
        ]),
        new Stroke([
            new Linear({x:0, y:50}, {x:40, y:50}),
        ]),
    ], 60),
    F: new DrawLetter("F", [
        new Stroke([
            new Linear({x:50, y:0}, {x:0, y:0}),
            new Linear({x:0, y:0}, {x:0, y:100}),
        ]),
        new Stroke([
            new Linear({x:0, y:50}, {x:40, y:50}),
        ]),
    ], 60),
}

function getAtd() {
    return atd = InkTool.InkCanvasLib.List[document.querySelector(".worksheet-container.selected stroke .stroke[id*='-red-comment-']").id];
}

function writeAllAt(text, pos, scale) {
    // copy
    console.log(pos);
    pos = {x: pos.x, y: pos.y};
    console.log(pos);

    selectPen();
    atd = getAtd();
    pointer = InkTool.InkCanvasLib.PointerTraceList[0];
    // atd.pen.col.R = 24;
    // atd.pen.col.G = 255;
    // // type 150 for writing?
    // atd.pen.tp = 150;
    atd.pen.w = 2;
    for (c of text) {
        letter = LETTERS[c];
        if (typeof letter === "undefined") {
            continue;
        }
        writeAt(letter, pos, scale, atd, pointer);
        pos.x += letter.width * scale;
    }
    saveDrawing(atd, pointer);
}

function saveDrawing(atd, pointer) {
    // Add a dummy drawing to undo
    atd.currentStroke = new InkTool.InkStroke(atd.pen);
    atd.drawingContext.context = atd.dcanvas.getContext("2d");
    cell = new InkTool.InkCell(0, 30, 20, 6, 0, ++pointer.lastTime);
    atd.currentStroke.addCell(cell);
    atd.pen.drawStart(atd.drawingContext);
    atd.pen.strokeDispatch(atd.drawingContext, cell, 1);
    atd.arrayCopy.push(cell);
    cell = new InkTool.InkCell(2, 30, 20, 6, 0, ++pointer.lastTime);
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

    // adding an extra stroke and undoing it makes the image persist on the canvas
    expandToolbar();
    $(".grading-toolbar .toolbar-item.undo").click();
    $(".grading-toolbar-box").classList.add("close");

    atd.penUpFunc(atd); // updates the models in angular
}

function writeAt(letter, pos, scale, atd, pointer) {
    for (stroke of letter.strokes) {
        let doneFirst = false;
        let lastPoint = null;
        // console.log(`stroke: ${stroke}`);
        // console.log(`typeof stroke: ${typeof stroke}`);
        // console.log(`stroke.lines: ${stroke.lines}`);

        atd.currentStroke = new InkTool.InkStroke(atd.pen);
        atd.drawingContext.context = atd.dcanvas.getContext("2d");
        for (line of stroke.lines) {
            points = line.getPoints(scale);
            if (points.length < 3) {
                continue;
            }

            if (!doneFirst) {
                drawCell(pos, points[0], 0, atd, pointer);
                doneFirst = true;
            } else {
                drawCell(pos, points[0], 4, atd, pointer);
            }

            for (i = 1; i < points.length; i++) {
                drawCell(pos, points[i], 4, atd, pointer);
            }
            lastPoint = points[points.length - 1];
        }

        // finishing point
        drawCell(pos, lastPoint, 2, atd, pointer);
        atd.currentLayer.Drawing.is.push(atd.currentStroke);

        // Doesn't look important
        atd.drawingBuffer = atd.currentLayer.Drawing.clone();
        atd.penUpFunc(atd); // updates the models in angular
    }

}

function drawCell(startPos, point, m, atd, pointer) {
    cell = new InkTool.InkCell(m, startPos.x + point[0], startPos.y + point[1], atd.pen.w, 0, ++pointer.lastTime);
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
    $(".grading-toolbar .toolbar-item.undo").click();
    $(".grading-toolbar-box").classList.add("close");

    // atd.undoInk();
    // atd.redoInk();
    // the actual undo tool itself doesn't save properly unless drawing something after
    // trigger atd pendown penup?
    atd.penUpFunc(atd); // updates the models in angular
}

//wip();
