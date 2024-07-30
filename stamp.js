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
    construtor(lines) {
        this.lines = lines;
    }
}
class Line {
    draw(scale){}
}

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Linear extends Line {
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }
    draw(scale) {
        return [
            [this.start.x*scale/100.0, this.start.y*scale/100.0],
            [this.end.x*scale/100.0, this.end.y*scale/100.0],
        ];
    }
}

class Circular extends Line {
    constructor(startPos, endPos, radius, clockwise) {
        this.startPos = startPos;
        this.endPos = endPos;
        this.radius = radius;
        this.clockwise = clockwise;
    }
    draw(scale) {
        let strokes = [];
        for (i = 0; i < this.radius / 2; i++) {

        }
        return strokes;
    }
}

letters = {
    A: new DrawLetter("A", [
        new Stroke([
            new Linear(new Point(0, 100), new Point(50, 0)),
            new Linear(new Point(50, 0), new Point(100, 100)),
        ]),
        new Stroke([
            new Linear(new Point(25, 50), new Point(75, 50)),
        ])
    ])
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
    cell = new InkTool.InkCell(0, 10, 20, 6, 0, pointer.getLastTime());
    atd.currentStroke.addCell(cell);
    atd.pen.drawStart(atd.drawingContext);
    atd.pen.strokeDispatch(atd.drawingContext, cell, 1);
    atd.arrayCopy.push(cell);
    cell = new InkTool.InkCell(4, 10, 30, 6, 0, pointer.getLastTime() + 1);
    atd.currentStroke.addCell(cell);
    atd.pen.strokeDispatch(atd.drawingContext, cell, 1);
    atd.arrayCopy.push(cell);
    cell = new InkTool.InkCell(4, 20, 30, 6, 0, pointer.getLastTime() + 2);
    atd.currentStroke.addCell(cell);
    atd.pen.strokeDispatch(atd.drawingContext, cell, 1);
    atd.arrayCopy.push(cell);
    cell = new InkTool.InkCell(2, 20, 30, 6, 0, pointer.getLastTime() + 3);
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

wip();
