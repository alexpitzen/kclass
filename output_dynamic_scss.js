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

    class DrawThing {
        getDimensions(scale) {
            let min = null;
            let max = null;
            for (let stroke of this.strokes) {
                for (let line of stroke.lines) {
                    for (let point of line.getPoints(scale)) {
                        if (min == null) {
                            min = {x: point[0], y: point[1]};
                            max = {x: point[0], y: point[1]};
                        } else {
                            min.x = Math.min(min.x, point[0]);
                            min.y = Math.min(min.y, point[1]);
                            max.x = Math.max(max.x, point[0]);
                            max.y = Math.max(max.y, point[1]);
                        }
                    }
                }
            }
            return {min: min, max: max};
        }
    }

    class SpriteSheetLetter extends DrawThing {
        constructor(character, strokes, lineheight, baselineheight) {
            super();
            this.character = character;
            this.strokes = strokes;
            this.lineheight = lineheight;
            this.baselineheight = baselineheight;

            let dimensions = this.getDimensions(1);
            this.width = dimensions.max.x - dimensions.min.x;
            for (let stroke of strokes) {
                for (let line of stroke.lines) {
                    line.translate(-dimensions.min.x, -(baselineheight - lineheight));
                }
            }
        }
    }

    class DrawLetter extends DrawThing {
        constructor(character, strokes, width, lineheight=100) {
            super();
            this.character = character;
            this.strokes = strokes;
            this.width = width;
            this.lineheight = lineheight;
        }
    }

    class DrawStamp extends DrawThing {
        constructor(strokes, width, height, svg) {
            super();
            this.strokes = strokes;
            this.width = width;
            this.height = height;
            this.svg = svg;
        }
    }

    class Stroke {
        constructor(lines, color) {
            this.lines = lines;
            this.color = color;
        }
    }
    class Line {
        getPoints(scale){}
    }

    class Bezier extends Line {
        constructor(x, y, cx1, cy1, cx2, cy2, x2, y2) {
            super();
            this.start = {x: x, y: y};
            this.control1 = {x: cx1, y: cy1};
            this.control2 = {x: cx2, y: cy2};
            this.end = {x: x2, y: y2};
        }
        getPoints(scale) {
            let length = Math.sqrt((this.start.x - this.end.x)**2 + (this.start.y - this.end.y)**2);
            let numpts = Math.max(length * scale, 3);
            let pts = [];
            for (let t = 0; t <= 1; t+=1/numpts) {
                let u = 1 - t;
                let u2 = u * u;
                let u3 = u2 * u;
                let t2 = t * t;
                let t3 = t2 * t;
                pts.push([
                    (
                        u3 * this.start.x
                        + 3 * u2 * t * this.control1.x
                        + 3 * u * t2 * this.control2.x
                        + t3 * this.end.x
                    ) * scale,
                    (
                        u3 * this.start.y
                        + 3 * u2 * t * this.control1.y
                        + 3 * u * t2 * this.control2.y
                        + t3 * this.end.y
                    ) * scale,
                ]);
            }
            return pts;
        }
        translate(x, y) {
            this.start.x += x;
            this.start.y += y;
            this.control1.x += x;
            this.control1.y += y;
            this.control2.x += x;
            this.control2.y += y;
            this.end.x += x;
            this.end.y += y;
        }
    }

    class Linear extends Line {
        constructor(start, end) {
            super();
            this.start = start;
            this.end = end;
        }
        getPoints(scale) {
            let mms = [
                this.start.x < this.end.x ? 0.1 : -0.1,
                this.start.y < this.end.y ? 0.1 : -0.1,
            ];
            return [
                [this.start.x*scale, this.start.y*scale],
                [this.start.x*scale + mms[0], this.start.y*scale + mms[1]],
                [this.start.x*scale + mms[0] * 2, this.start.y*scale + mms[1] * 2],
                [this.start.x*scale + mms[0] * 3, this.start.y*scale + mms[1] * 3],
                [(this.start.x + this.end.x)/2*scale, (this.start.y + this.end.y)/2*scale],
                [this.end.x*scale - mms[0] * 3, this.end.y*scale - mms[1] * 3],
                [this.end.x*scale - mms[0] * 2, this.end.y*scale - mms[1] * 2],
                [this.end.x*scale - mms[0] * 1, this.end.y*scale - mms[1] * 1],
                [this.end.x*scale, this.end.y*scale],
            ];
        }
        translate(x, y) {
            this.start.x += x;
            this.start.y += y;
            this.end.x += x;
            this.end.y += y;
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
                new Circular({x:5, y:30}, {x:5, y:40}, 5, true, true),
                new Circular({x:5, y:40}, {x:5, y:30}, 5, true, true),
            ]),
            new Stroke([
                new Circular({x:5, y:60}, {x:5, y:70}, 5, true, true),
                new Circular({x:5, y:70}, {x:5, y:60}, 5, true, true),
            ]),
        ], 10),
        "_": new DrawLetter("_",[
            new Stroke([
                new Linear({x:0, y:100}, {x:50, y:100}),
            ]),
        ], 50),
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

    // map[atd:list[{startIndex, numLines}]]
    var writeStrokes = {}
    // TODO Why isn't this just using atd.countDrawItems at the end of the draw?
    var newDrawCounter = 0;

    function writeStampAt(stamp, pos, scale, options, dryRun = false) {
        let color = options.color || "#ff2200",
            alpha = options.alpha || 255,
            width = options.width || 2,
            usePredefinedColor = options.usePredefinedColor || false,
            rainbow = options.rainbow || false,
            rainbowspeed = options.rainbowspeed || 1;

        let atd = null;
        let currentDrawIndex = 0;
        newDrawCounter = 0;
        let previousAlpha = 0;
        let previousWidth = 0;
        let zoomRatio = 0;
        try {
            atd = getAtd();
            zoomRatio = atd.drawingContext.zoomRatio;
        } catch {
            zoomRatio = 370/768;
        }
        if (!dryRun) {
            atd = getAtd();
            currentDrawIndex = atd.countDrawItems();
            setPenColorHex(color);
            previousAlpha = atd.pen.col.A;
            previousWidth = atd.pen.w;
        }
        let stampDimensions = stamp.getDimensions(scale);
        pos = {
            x: pos.x - stampDimensions.min.x,
            y: pos.y - stampDimensions.min.y,
        };
        if (!dryRun) {
            atd.pen.col.A = alpha;
            atd.pen.w = width;
            let pointer = InkTool.InkCanvasLib.PointerTraceList[0];
            if (rainbow) {
                writeAtRainbow(stamp, pos, scale, atd, pointer, rainbowspeed);
            } else {
                writeAt(stamp, pos, scale, atd, pointer, usePredefinedColor);
            }
            saveDrawing(atd, pointer);
            if (!(atd in writeStrokes)) {
                writeStrokes[atd] = []
            }
            writeStrokes[atd].push({startIndex: currentDrawIndex, numLines: newDrawCounter});
            atd.pen.col.A = previousAlpha;
            atd.pen.w = previousWidth;
        }
        return {
            width: (stampDimensions.max.x - stampDimensions.min.x) * zoomRatio,
            height: (stampDimensions.max.y - stampDimensions.min.y) * zoomRatio,
        };
    }

    function writeAllAt(text, pos, scale, options, dryRun = false) {
        let color = options.color || "#ff2200",
            alpha = options.alpha || 255,
            width = options.width || 2;
        // copy
        let original_pos = {x: pos.x, y: pos.y};
        let current_pos = {x: pos.x, y: pos.y};
        let atd = getAtd();
        let currentDrawIndex = atd.countDrawItems();
        newDrawCounter = 0;
        let maxwidth = 0, currentwidth = 0, height = 100 * scale;

        if (!dryRun) {
            setPenColorHex(color);
        }
        let previousAlpha = atd.pen.col.A;
        let previousWidth = atd.pen.w;
        if (!dryRun) {
            atd.pen.col.A = alpha;
            atd.pen.w = width;
        }
        let pointer = InkTool.InkCanvasLib.PointerTraceList[0];
        // atd.pen.col.R = 24;
        // atd.pen.col.G = 255;
        // // type 150 for writing with SolidPen?
        // atd.pen.tp = 150;
        for (let c of text) {
            if (c == "\n") {
                current_pos.x = original_pos.x;
                let addHeight = 145 * scale + 5;
                current_pos.y += addHeight;
                height += addHeight;
                if (currentwidth > maxwidth) {
                    maxwidth = currentwidth;
                }
                currentwidth = 0;
                continue;
            }
            // let letter = LETTERS[c];
            let letter = HELVETICANT[c];
            if (typeof letter === "undefined") {
                continue;
            }
            if (!dryRun) {
                writeAt(letter, current_pos, scale * 100 / letter.lineheight, atd, pointer, false);
            }
            let addWidth = (letter.width * 100 / letter.lineheight + 10) * scale + 3;
            current_pos.x += addWidth;
            currentwidth += addWidth;
        }
        if (currentwidth > maxwidth) {
            maxwidth = currentwidth;
        }
        // Subtract the letter spacing at the end
        maxwidth = maxwidth - (10 * scale + 3);
        if (!dryRun) {
            saveDrawing(atd, pointer);
            if (!(atd in writeStrokes)) {
                writeStrokes[atd] = []
            }
            writeStrokes[atd].push({startIndex: currentDrawIndex, numLines: newDrawCounter});
            atd.pen.col.A = previousAlpha;
            atd.pen.w = previousWidth;
        }
        return {width: maxwidth * atd.drawingContext.zoomRatio, height: height * atd.drawingContext.zoomRatio};
    }

    function getWriteAllDimensions(text, scale) {
        return writeAllAt(text, {x:0, y:0}, scale, {}, true);
    }

    function getWriteStampDimensions(stamp, scale) {
        return writeStampAt(stamp, {x:0, y:0}, scale, {}, true);
    }

    function setHighlighter(on = true) {
        selectPen();
        let atd = getAtd();
        if (on) {
            atd.pen.w = 25;
            atd.pen.col.A = 50;
        } else {
            atd.pen.w = 2;
            atd.pen.col.A = 255;
        }
    }

    function undoLastWriteAll() {
        let atd = getAtd();
        if (!(atd in writeStrokes) || writeStrokes[atd].length == 0) {
            atd.penUpFunc(atd); // updates the models in angular
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

    var _rainbowColors = ["R", "G", "B"];
    var _rainbowIncreasing = true;
    var _rainbowIndex = 0;

    function _incrementRainbow(col, speed, rainbowmin, rainbowmax) {
        let c = col[_rainbowColors[_rainbowIndex]];
        let new_c = c + speed * (_rainbowIncreasing ? 1: -1);
        if (new_c > rainbowmax) {
            col[_rainbowColors[_rainbowIndex]] = rainbowmax;
            _rainbowIncreasing = !_rainbowIncreasing;
            _rainbowIndex = (_rainbowIndex + 2) % 3;
            speed = new_c - rainbowmax;
        } else if (new_c < rainbowmin) {
            col[_rainbowColors[_rainbowIndex]] = rainbowmin;
            _rainbowIncreasing = !_rainbowIncreasing;
            _rainbowIndex = (_rainbowIndex + 2) % 3;
            speed = rainbowmin - new_c;
        }
        col[_rainbowColors[_rainbowIndex]] = (col[_rainbowColors[_rainbowIndex]] + 256 + speed * (_rainbowIncreasing ? 1 : -1)) % 256;
    }

    function writeAtRainbow(letter, pos, scale, atd, pointer, rainbowspeed) {
        let col = atd.pen.col;
        let rainbowmax = Math.max(col.R, col.G, col.B);
        let rainbowmin = Math.min(col.R, col.G, col.B);
        if (rainbowmax == rainbowmin) {
            writeAt(letter, pos, scale, atd, pointer, false);
            return;
        }
        let indexed = Array.from([col.R, col.G, col.B].entries());
        let maxs = indexed.filter(c => c[1]==rainbowmax).map(c => c[0]);
        let mins = indexed.filter(c => c[1]==rainbowmin).map(c => c[0]);
        if (maxs.length == 2) {
            _rainbowIncreasing = false;
            /* 0, 1 = 0
             * 1, 2 = 1
             * 0, 2 = 2
             */
            _rainbowIndex = maxs[1] == maxs[0] + 1 ? maxs[0] : maxs[1];
        } else if (mins.length == 2) {
            _rainbowIncreasing = true;
            /* 0, 1 = 0
             * 1, 2 = 1
             * 0, 2 = 2
             */
            _rainbowIndex = mins[1] == mins[0] + 1 ? mins[0] : mins[1];
        } else if ((mins[0] + 2) % 3 == maxs[0]){
            /*
             * 100, 255, 0 = decreasing 0
             * 0, 100, 255 = decreasing 1
             * 255, 0, 100 = decreasing 2
             */
            _rainbowIncreasing = false;
            _rainbowIndex = 3 - mins[0] - maxs[0];
        } else if ((mins[0] + 1) % 3 == maxs[0]){
            /*
             * 100, 0, 255 = increasing 0
             * 255, 100, 0 = increasing 1
             * 0, 255, 100 = increasing 2
             */
            _rainbowIncreasing = true;
            _rainbowIndex = 3 - mins[0] - maxs[0];
        }
        for (let stroke of letter.strokes) {
            let lastPoint = null;
            // console.log(`stroke: ${stroke}`);
            // console.log(`typeof stroke: ${typeof stroke}`);
            // console.log(`stroke.lines: ${stroke.lines}`);

            for (let line of stroke.lines) {
                atd.currentStroke = new InkTool.InkStroke(atd.pen);
                atd.drawingContext.context = atd.dcanvas.getContext("2d");
                let points = line.getPoints(scale);
                if (points.length < 3) {
                    continue;
                }

                drawCell(pos, points[0], 0, atd, pointer);

                for (let i = 1; i < points.length; i++) {
                    drawCell(pos, points[i], 4, atd, pointer);
                }
                lastPoint = points[points.length - 1];

                // finishing point
                drawCell(pos, lastPoint, 2, atd, pointer);
                atd.currentLayer.Drawing.is.push(atd.currentStroke);

                newDrawCounter++;
                _incrementRainbow(col, rainbowspeed, rainbowmin, rainbowmax);
            }

            // Doesn't look important
            atd.drawingBuffer = atd.currentLayer.Drawing.clone();
            atd.penUpFunc(atd); // updates the models in angular
        }

    }

    function writeAt(letter, pos, scale, atd, pointer, usePredefinedColor) {
        for (let stroke of letter.strokes) {
            let doneFirst = false;
            let lastPoint = null;
            // console.log(`stroke: ${stroke}`);
            // console.log(`typeof stroke: ${typeof stroke}`);
            // console.log(`stroke.lines: ${stroke.lines}`);

            let r = atd.pen.col.R;
            let g = atd.pen.col.G;
            let b = atd.pen.col.B;
            if (usePredefinedColor && stroke.color) {
                _setPenColorHex(atd, stroke.color);
            }

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

            if (usePredefinedColor && stroke.color) {
                atd.pen.col.R = r;
                atd.pen.col.G = g;
                atd.pen.col.B = b;
            }
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

    function _setPenColor(atd, r, g, b) {
        atd.pen.col.R = r;
        atd.pen.col.G = g;
        atd.pen.col.B = b;
    }

    function _setPenColorHex(atd, color) {
        try {
            _setPenColor(
                atd,
                parseInt(color.substr(1,2), 16),
                parseInt(color.substr(3,2), 16),
                parseInt(color.substr(5,2), 16),
            );
        } catch {
            _setPenColor(
                atd,
                atd.pen.col.R = 255,
                atd.pen.col.G = 34,
                atd.pen.col.B = 0,
            );
        }
    }

    function setPenColorHex(color) {
        let atd = getAtd();
        selectPen();
        _setPenColorHex(atd, color);
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

    //base1: 34 height
    //base2: 32.5 height
    //base3: 31 height
    //let's try 31
    function parseFont(xmlstring, lineheight=31) {
        let doc = new DOMParser().parseFromString(xmlstring, "application/xml");
        let svgElem = doc.querySelector("svg");
        let width = parseInt(svgElem.getAttribute("width").replaceAll(/[^0-9.]/g, ""));
        let height = parseInt(svgElem.getAttribute("height").replaceAll(/[^0-9.]/g, ""));
        if (!svgElem.hasAttribute("viewBox")) {
            svgElem.setAttribute("viewBox", `0 0 ${width} ${height}`);
        }
        let characters = {};
        for (let child of svgElem.children) {
            parseFontChild(child, characters, lineheight);
        }
        characters[" "] = new DrawLetter(" ", [], 20);
        return characters;
    }

    function parseFontChild(element, characters, lineheight, transform = [], baselineheight = 0) {
        switch (element.nodeName) {
            case "path":
                let char = element.getAttribute("inkscape:label");
                if (char.length > 1) {
                    return;
                }
                let strokes = parsePath(element, transform);
                characters[char] = new SpriteSheetLetter(char, strokes, lineheight, baselineheight);
                return;
            case "g":
                let newTransforms = element.getAttribute("transform") || "";
                if (newTransforms) {
                    console.log("Please don't use <g> with a transform attribute in the font svg. I don't want to implement that right now");
                }
                // TODO figure out how to do this properly
                let baseline = element.querySelector('path[*|label="baseline"]');
                const mRegex = /[Mm][0-9e. ,-]*/g;
                let pathstring = baseline.getAttribute("d") || "";
                for (let match of pathstring.matchAll(mRegex)) {
                    let matchstr = match[0].trim();
                    let pathSection = parameterizePathSection(matchstr);
                    pathSection.shift(); // Get rid of M/m
                    baselineheight = shift2Translated(pathSection, transform, false)[1];
                    break;
                }
                for (let child of element.children) {
                    parseFontChild(child, characters, lineheight, transform, baselineheight);
                }
                return;
            default:
                console.log(`${element.nodeName} not yet implemented`);
                return;
        }
    }

    function parseSvg(xmlstring) {
        let doc = new DOMParser().parseFromString(xmlstring, "application/xml");
        let svgElem = doc.querySelector("svg");
        let width = parseInt(svgElem.getAttribute("width").replaceAll(/[^0-9.]/g, ""));
        let height = parseInt(svgElem.getAttribute("height").replaceAll(/[^0-9.]/g, ""));
        svgElem.removeAttribute("width");
        svgElem.removeAttribute("height");
        if (!svgElem.hasAttribute("viewBox")) {
            svgElem.setAttribute("viewBox", `0 0 ${width} ${height}`);
        }
        let currentColor = getColor(svgElem);
        let strokes = [];
        for (let child of svgElem.children) {
            strokes = strokes.concat(parseChild(child, [], currentColor));
        }
        return new DrawStamp(strokes, width, height, svgElem);
    }

    function parseChild(element, transform, currentColor) {
        switch (element.nodeName) {
            case "path":
                return parsePath(element, transform, currentColor);
            case "g":
                return parseG(element, transform, currentColor);
            default:
                console.log(`${element.nodeName} not yet implemented`);
                return [];
        }
    }

    const transformsRegex = /(?<transform>[^\(\)]*)\((?<params>[^\)]*)\)/g;

    class Transformation {
        transform(x, y, relative) {}
    }

    class ScaleTransformation extends Transformation{
        constructor(x, y) {
            super();
            this.x = parseFloat(x);
            this.y = parseFloat(y);
        }
        transform(x, y, relative) {
            return [
                x * this.x,
                y * this.y,
            ];
        }
    }

    class TranslateTransformation extends Transformation {
        constructor(x, y) {
            super();
            this.x = parseFloat(x);
            this.y = parseFloat(y);
        }
        transform(x, y, relative) {
            return relative ? [x, y] : [
                x + this.x,
                y + this.y,
            ];
        }
    }

    class MatrixTransformation extends Transformation {
        constructor(a, b, c, d, e, f) {
            super();
            this.a = parseFloat(a);
            this.b = parseFloat(b);
            this.c = parseFloat(c);
            this.d = parseFloat(d);
            this.e = parseFloat(e);
            this.f = parseFloat(f);
        }

        transform(x, y, relative) {
            return [
                x * this.a + (relative ? 0 : this.e),
                y * this.d + (relative ? 0 : this.f),
            ];
        }
    }

    const TRANSFORM_CLASSES = {
        "translate": TranslateTransformation,
        "scale": ScaleTransformation,
        "matrix": MatrixTransformation,
    };

    // <g transform="translate(0.000000,654.000000) scale(0.100000,-0.100000)"
    function parseG(element, transform, currentColor) {
        let newTransforms = element.getAttribute("transform") || "";
        let allTransforms = [];
        if (newTransforms !== "") {
            for (let match of newTransforms.matchAll(transformsRegex)) {
                let transformClass = TRANSFORM_CLASSES[match.groups.transform.trim().toLowerCase()] || null;
                if (transformClass != null) {
                    allTransforms.push(new transformClass(...match.groups.params.split(",")));
                } else {
                    console.log(`SVG transformation ${match.groups.transform.trim()} not implemented yet`);
                }
            }
            allTransforms.reverse();
        }
        allTransforms = allTransforms.concat(transform);
        currentColor = getColor(element) || currentColor;
        let strokes = [];
        for (let child of element.children) {
            strokes = strokes.concat(parseChild(child, allTransforms, currentColor));
        }
        return strokes;
    }

    const pathRegex = /[MmCcLlZzQqHhVv][0-9e. ,-]*/g;

    function parameterizePathSection(str) {
        return [str[0], ...str.substring(1).trim().split(" ").map(z => z.split(",")).flat().map(parseFloat)];
    }

    function shift2Translated(pathSection, transformations, relative) {
        let x = pathSection.shift();
        let y = pathSection.shift();
        for (let transformation of transformations) {
            [x, y] = transformation.transform(x, y, relative);
        }
        return [x, y];
    }

    function getColor(element) {
        let stroke = element.getAttribute("stroke") || "";
        if (stroke) {
            return stroke;
        }
        let style = element.getAttribute("style") || "";
        for (let match of style.matchAll(/[^;]*;?/g)) {
            try {
                let [key, val] = match[0].split(":");
                if (key == "stroke") {
                    return val.substr(0, 7);
                }
            }
            catch {
                console.log(`unexpected style match ${match}. Style: ${style}`);
            }
        }
        return null;
    }

    function parsePath(element, transformations, currentColor) {
        let pathstring = element.getAttribute("d") || "";
        let strokes = [];
        let x = 0, y = 0;
        let mx = 0, my = 0;
        let currentStroke = null;
        let makeLinear = (x2, y2) => {
            return new Linear({x:x, y:y}, {x:x2, y:y2});
        }
        currentColor = getColor(element) || currentColor;
        let isFirstCommand = true;
        for (let match of pathstring.matchAll(pathRegex)) {
            let matchstr = match[0].trim();
            let pathSection = parameterizePathSection(matchstr);
            let cmd = pathSection.shift();
            if (cmd == "M" || cmd == "m") {
                if (currentStroke != null) {
                    strokes.push(currentStroke);
                    currentStroke = null;
                }
                if (cmd == "M") {
                    [x, y] = shift2Translated(pathSection, transformations, false);
                } else {
                    let [dx, dy] = shift2Translated(pathSection, transformations, !isFirstCommand);
                    x += dx;
                    y += dy;
                }
                mx = x;
                my = y;
                if (pathSection.length > 0) {
                    // if there are more coordinates, then they are implicit L/l commands
                    // so swap cmd to L/l and process below
                    cmd = cmd == "M" ? "L" : "l";
                }
            }
            if (!(cmd == "M" || cmd == "m")){
                if (currentStroke == null) {
                    currentStroke = new Stroke([], currentColor);
                }
                do {
                    if (cmd == "L") {
                        let [x2, y2] = shift2Translated(pathSection, transformations, false);
                        currentStroke.lines.push(makeLinear(x2, y2));
                        x = x2;
                        y = y2;
                    } else if (cmd == "l") {
                        let [dx, dy] = shift2Translated(pathSection, transformations, true);
                        currentStroke.lines.push(makeLinear(x + dx, y + dy));
                        x += dx;
                        y += dy;
                    } else if (cmd == "H" || cmd == "h") {
                        let x2 = pathSection.shift();
                        for (let transformation of transformations) {
                            x2 = transformation.transform(x2, 0, cmd == "h")[0];
                        }
                        if (cmd == "h") {
                            x2 += x;
                        }
                        currentStroke.lines.push(makeLinear(x2, y));
                        x = x2;
                    } else if (cmd == "V" || cmd == "v") {
                        let y2 = pathSection.shift();
                        for (let transformation of transformations) {
                            y2 = transformation.transform(0, y2, cmd == "v")[1];
                        }
                        if (cmd == "v") {
                            y2 += y;
                        }
                        currentStroke.lines.push(makeLinear(x, y2));
                        y = y2;
                    } else if (cmd == "Z" || cmd == "z") {
                        currentStroke.lines.push(makeLinear(mx, my));
                        x = mx;
                        y = my;
                        // dump anything attached to Z/z
                        pathSection = [];
                    } else if (cmd == "C" || cmd == "c") {
                        let [cx1, cy1] = shift2Translated(pathSection, transformations, cmd == "c");
                        let [cx2, cy2] = shift2Translated(pathSection, transformations, cmd == "c");
                        let [x2, y2] = shift2Translated(pathSection, transformations, cmd == "c");
                        if (cmd == "c") {
                            cx1 += x;
                            cy1 += y;
                            cx2 += x;
                            cy2 += y;
                            x2 += x;
                            y2 += y;
                        }
                        currentStroke.lines.push(new Bezier(x,y,cx1,cy1,cx2,cy2,x2,y2));
                        x = x2;
                        y = y2;
                    }
                } while (pathSection.length > 0);
            }
            isFirstCommand = false;
        }
        if (currentStroke != null) {
            strokes.push(currentStroke);
            currentStroke = null;
        }
        return strokes;
    }

    const HELVETICANT = parseFont(`<?xml version="1.0" encoding="UTF-8" standalone="no"?> <!-- Created with Inkscape (http://www.inkscape.org/) --> <svg version="1.1" id="svg1" width="924" height="173" viewBox="0 0 924 173" sodipodi:docname="font_manual2.svg" inkscape:version="1.3.2 (091e20ef0f, 2023-11-25, custom)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"> <defs id="defs1" /> <sodipodi:namedview id="namedview1" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" inkscape:zoom="2.8284271" inkscape:cx="528.38554" inkscape:cy="120.03138" inkscape:window-width="2560" inkscape:window-height="1371" inkscape:window-x="0" inkscape:window-y="0" inkscape:window-maximized="1" inkscape:current-layer="layer4" /> <g inkscape:groupmode="layer" id="layer2" inkscape:label="line3" style="display:inline"> <path id="path74" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 25.234701,141.36076 10.208681,8.76081 M 21.901666,117.59241 c -3.2128,0.037 -13.1820846,1.98575 -12.9650647,15.06503 0.1707166,10.28869 7.1197147,15.41945 12.4070317,15.52262 6.018962,0.11744 14.20393,-3.91004 14.284642,-15.58884 0.08304,-12.01605 -8.358762,-14.93809 -13.726609,-14.99881 z" inkscape:label="Q" sodipodi:nodetypes="cccsssc" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 41.815112,117.02237 8.291414,31.87281 9.209824,-31.67687 9.836138,31.71606 7.686506,-32.00332" id="path75" inkscape:label="W" /> <path id="path77" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 103.96411,132.75708 -18.66162,0.0618 m 19.56201,-14.39017 -19.632567,0.20288 -0.113769,28.90479 20.544436,-0.0432" inkscape:label="E" /> <path id="path79" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 128.90857,132.81692 c 0,0 4.02526,1.29095 5.1051,4.17307 1.05188,2.80751 -0.46289,9.27382 1.69278,11.73921 m -21.16934,-0.0449 0.0752,-30.11963 14.99531,-0.0588 c 0,0 5.36851,0.42281 5.32583,6.24405 -0.038,5.18792 -3.30746,8.12207 -5.22665,8.07715 -1.91919,-0.0449 -15.25611,0.0339 -15.25611,0.0339" inkscape:label="R" sodipodi:nodetypes="csccccssc" /> <path id="path81" style="display:inline;fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 152.38574,118.75366 -0.0901,30.44141 m -12.22484,-30.49292 24.65942,0.0947" inkscape:label="T" /> <path id="path83" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 192.73047,116.97119 -11.58643,18.56885 m -11.31811,-18.28027 11.33764,18.14257 0.15162,13.75806" inkscape:label="Y" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 200.83904,117.16842 0.22113,24.84766 c 0.023,2.58351 3.73672,6.24519 9.59566,6.29197 5.92308,0.0473 10.34748,-3.25846 10.46833,-6.33185 0.0896,-2.27975 0.22097,-24.91654 0.22097,-24.91654" id="path84" inkscape:label="U" sodipodi:nodetypes="csssc" /> <path id="path86-5" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 227.43104,148.56234 11.33411,-0.02 m -11.30949,-31.14289 11.30371,0.0219 m -5.62878,-0.0238 0.0669,31.12718" inkscape:label="I" sodipodi:nodetypes="cccccc" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 255.74951,117.97412 c -2.43039,0.17763 -12.38799,1.81019 -12.56751,13.79761 0.12479,11.52392 5.62464,16.22814 12.24573,16.31043 6.59875,0.082 13.84319,-4.56906 14.14258,-14.17908 0.30627,-9.83105 -5.07226,-16.1272 -13.8208,-15.92896 z" id="path86" inkscape:label="O" sodipodi:nodetypes="ccssc" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 278.66636,148.84822 0.13259,-30.38833 c 0,0 12.06827,-0.0315 12.88743,0.14778 1.21069,0.26505 5.59133,1.65727 5.70225,6.16724 0.12328,5.01278 -1.93979,8.08287 -4.46637,8.52758 -2.29307,0.40361 -14.19772,0.20043 -14.19772,0.20043" id="path87" sodipodi:nodetypes="ccsssc" inkscape:label="P" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 313.87109,118.89941 c 0,0 -5.1311,-1.17993 -5.05859,3.11329 0.0725,4.29321 -0.0681,11.31518 -0.0681,11.31518 0,0 -0.86645,3.76001 -3.5708,3.90869 -2.70434,0.14868 2.8689,-0.69873 2.96387,2.84204 0.095,3.54077 0.53589,14.53565 0.53589,14.53565 0,0 0.52685,2.31177 5.12793,2.31299" id="path88" inkscape:label="{" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 317.8435,118.81968 c 0,0 5.1311,-1.17993 5.05859,3.11329 -0.0725,4.29321 0.0681,11.31518 0.0681,11.31518 0,0 0.86645,3.76001 3.5708,3.90869 2.70434,0.14868 -2.8689,-0.69873 -2.96387,2.84204 -0.095,3.54077 -0.53589,14.53565 -0.53589,14.53565 0,0 -0.52685,2.31177 -5.12793,2.31299" id="path88-5" inkscape:label="}" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 336.52197,116.86523 0.0137,41.01563" id="path89" inkscape:label="|" /> <path id="path91" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 349.80859,137.24731 14.37124,0.0126 m -18.71377,11.50766 11.5066,-30.39185 11.73046,30.73804" inkscape:label="A" sodipodi:nodetypes="ccccc" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 394.65942,125.78467 c 0,0 -0.57681,-7.86088 -8.71899,-8.27027 -8.74527,-0.43971 -10.37207,5.31446 -10.36963,6.79468 0.002,1.48023 -0.76533,5.75552 9.33813,8.28711 7.39718,1.85348 10.42041,2.97583 10.4668,7.08399 0.0464,4.10815 -3.41479,8.48266 -9.49902,8.50903 -6.08423,0.0264 -11.41382,-2.58496 -11.57593,-8.94141" id="path92" sodipodi:nodetypes="cscsssc" inkscape:label="S" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 405.97656,118.70508 -0.008,28.70617 c 5.09917,-0.20623 6.77879,-0.0128 9.70692,-0.70173 0,0 11.12072,-1.99494 11.10094,-13.70612 -0.0198,-11.71118 -10.57043,-13.84928 -11.59221,-14.0344 -1.74286,-0.31576 -9.3087,-0.27897 -9.2077,-0.26425 z" id="path93" sodipodi:nodetypes="cccsscc" inkscape:label="D" /> <path id="path95" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 436.97241,132.67847 17.04859,-0.0125 m -16.91187,16.41118 0.001,-30.65381 18.77831,0.0109" inkscape:label="F" sodipodi:nodetypes="ccccc" /> <path id="path97" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 485.71219,133.74069 0.42087,14.95511 m -0.97364,-22.8335 c 0,0 -3.00342,-8.20898 -10.76391,-8.17309 -7.7605,0.0359 -13.83624,6.06754 -13.62256,14.2793 0.21274,8.17549 3.54113,15.50424 11.00928,16.3811 8.41979,0.98859 13.89404,-4.7002 13.94433,-14.604 l -10.99707,0.0435" inkscape:label="G" sodipodi:nodetypes="cccssscc" /> <path id="path100" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 495.8999,132.98883 20.42676,-0.0367 m 0.0203,-16.10889 -0.033,32.16626 m -20.52168,-32.07471 0.24804,31.97632" inkscape:label="H" sodipodi:nodetypes="cccccc" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 538.32146,117.11283 -0.13969,25.51394 c -0.0907,1.94857 -1.37728,5.42713 -6.20074,5.43027 -4.82513,0.003 -7.16972,-2.07143 -7.22704,-8.96313" id="path101" sodipodi:nodetypes="ccsc" inkscape:label="J" /> <path id="path104" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 556.42593,129.70891 13.53183,19.43244 m -0.57815,-32.04129 -20.56587,19.99549 m 9e-4,-20.00499 0.0149,31.83586" inkscape:label="K" sodipodi:nodetypes="cccccc" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 577.94741,116.88254 0.11877,30.51297 17.24988,-0.10548" id="path105" inkscape:label="L" /> <path id="path42-3-4-0" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" inkscape:label=":" d="m 603.48187,144.67774 c -2.3612,0.23999 -2.34788,4.27356 0.38185,4.21239 2.4759,-0.0555 2.36201,-4.18582 -0.37324,-4.20786 m -0.0476,-18.39787 c -2.3612,0.23999 -2.34788,4.27356 0.38185,4.21239 2.4759,-0.0555 2.36201,-4.18582 -0.37324,-4.20786" /> <path id="path65-9" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" inkscape:label="&quot;" d="m 620.20351,117.97583 -0.0395,10.58814 m -7.1909,-10.58633 -0.0395,10.58814" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 626.74414,118.94141 20.90234,0.0317 -20.48486,27.86084 20.42847,-0.0261" id="path106" inkscape:label="Z" /> <path id="path108" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 676.2456,116.9646 -21.8081,32.06714 m 0.88598,-31.67359 21.58594,31.82471" inkscape:label="X" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 705.06689,126.42407 c -0.17592,-2.9728 -2.56891,-8.5882 -10.65649,-8.68579 -7.90073,-0.0953 -11.95056,8.05957 -12.02161,14.11243 -0.0742,6.32248 2.5365,16.48865 11.22632,16.39953 9.19598,-0.0943 11.73767,-8.25488 11.7113,-11.06347" id="path109" sodipodi:nodetypes="csssc" inkscape:label="C" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 711.2562,117.79646 11.35686,31.30329 10.91907,-32.03629" id="path110" inkscape:label="V" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 741.95436,147.7231 0.18067,-29.22928 c 0,0 12.06827,-0.0315 12.88743,0.14778 1.21069,0.26505 5.59133,1.65727 5.70225,6.16725 0.12328,5.01278 -3.35418,6.95333 -5.88076,7.39804 -2.29307,0.40361 -12.86326,0.27242 -12.86326,0.27242 l 12.9069,-0.0365 c 0,0 6.92442,2.33168 6.77612,7.4746 -0.14829,5.14293 -2.71483,7.64844 -6.82222,7.71749 -4.09148,0.0688 -12.86309,0.0981 -12.86309,0.0981" id="path87-9" sodipodi:nodetypes="ccsssccssc" inkscape:label="B" inkscape:transform-center-x="0.096000086" inkscape:transform-center-y="1.4868643" /> <path style="display:inline;fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 771.19109,148.90916 0.32007,-31.05504 20.44153,31.34437 0.26309,-31.83914" id="path111" inkscape:label="N" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 802.51233,148.68439 0.34769,-31.26358 12.73396,31.49198 12.27217,-31.5745 1.07326,31.67203" id="path112" inkscape:label="M" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 856.32861,131.02686 -18.99927,8.4143 18.92505,8.75488" id="path113" inkscape:label="&lt;" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 861.69067,130.71191 19.47705,8.65015 -19.26562,8.79004" id="path114" inkscape:label="&gt;" /> <path id="path115" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 890.00439,125.77563 c 0,0 -0.7124,-8.02148 6.72119,-8.16894 7.4336,-0.14746 8.22779,5.05029 8.23121,6.35376 0.003,1.30347 -0.37006,3.64624 -1.7605,5.39014 -1.47727,1.8528 -5.83573,5.49449 -5.88623,6.30249 -0.051,0.81515 0.0259,4.21997 0.0259,4.21997 m -0.0309,4.55985 c -2.3612,0.23999 -2.34788,4.27356 0.38185,4.21239 2.4759,-0.0555 2.37672,-4.18551 -0.35853,-4.20755" inkscape:label="?" sodipodi:nodetypes="cscssccsc" /> <path style="fill:none;stroke:#bd0000;stroke-width:1.04172" d="m 6.4159012,149.32369 903.1843688,0.0323" id="path14-8" sodipodi:nodetypes="cc" inkscape:label="baseline" /> </g> <g inkscape:groupmode="layer" id="layer3" inkscape:label="line1" style="display:inline"> <path style="fill:none;stroke:#be0000;stroke-opacity:1" d="m 11.967395,23.007784 c 2.61359,-2.874923 3.887512,-4.245289 6.912684,-8.118672 l -0.450732,30.062492" id="path1" sodipodi:nodetypes="ccc" inkscape:label="1" /> <path style="fill:none;stroke:#be0000;stroke-opacity:1" d="m 33.346864,23.668578 c 0,0 -0.227017,-5.056692 2.308045,-6.809194 2.535062,-1.752503 4.036106,-1.999117 5.691944,-2.08323 1.655838,-0.08411 4.926118,0.452053 6.180988,2.079486 1.25487,1.627434 1.845047,4.003162 1.905315,5.241873 0.136518,2.805897 -1.28132,4.919132 -2.50974,6.213357 -1.360561,1.433445 -6.59781,4.257178 -7.588891,4.779031 -0.471083,0.248048 -2.467467,1.797839 -3.260592,2.667837 -1.953757,2.143121 -5.029279,7.443134 -2.980068,7.445327 3.909497,0.0042 17.658678,-0.05791 17.658678,-0.05791" id="path2" sodipodi:nodetypes="cssssssssc" inkscape:label="2" /> <path style="fill:none;stroke:#be0000;stroke-opacity:1" d="m 57.489073,22.727701 c 0,0 -0.260926,-7.441804 7.109536,-8.114488 7.370461,-0.672685 8.11735,5.805562 8.112946,6.868866 -0.0044,1.063303 -0.266211,4.330281 -2.577999,5.693925 -2.311788,1.363645 -6.78167,1.365626 -6.78167,1.365626 0,0 4.629521,-0.920399 6.718916,1.147417 2.089394,2.067816 3.385,3.332375 3.369807,6.980944 -0.01519,3.648569 -2.119341,5.072986 -3.436966,6.120656 -1.317624,1.04767 -5.475496,2.096 -8.334679,1.2901 -2.859183,-0.8059 -5.180219,-5.276883 -4.991075,-7.64482" id="path3" inkscape:label="3" /> <path style="fill:none;stroke:#be0000;stroke-opacity:1" d="M 99.943268,35.57542 79.804796,35.393322 94.179542,14.248796 94.020344,45.309855" id="path4" inkscape:label="4" /> <path style="fill:none;stroke:#be0000;stroke-opacity:1" d="m 122.22112,15.825806 -13.89033,-0.01057 -1.49972,14.341496 c 0,0 1.86282,-4.175707 6.88648,-3.901128 5.02367,0.274578 6.77459,2.448804 7.74171,4.277215 1.40054,2.64784 1.95192,7.122319 0.0834,9.749848 -1.87808,2.64104 -5.49862,3.891 -7.73268,3.943626 -2.23406,0.05262 -8.10304,-1.817899 -8.34106,-6.611683" id="path5" sodipodi:nodetypes="cccssssc" inkscape:label="5" /> <path style="fill:none;stroke:#be0000;stroke-opacity:1" d="m 146.30013,20.761833 c 0,0 0.27832,-3.901128 -5.22051,-5.874262 -5.49884,-1.973134 -9.11768,3.63866 -9.32422,4.378283 -0.20654,0.739622 -2.08829,5.359014 -1.75977,11.546829 0.32853,6.187815 0.73082,9.082229 2.40867,11.127805 1.67786,2.045577 4.10107,2.730367 5.67763,2.720904 2.11744,-0.01271 4.72446,-0.708427 6.62028,-3.209508 1.88452,-2.486179 2.58145,-6.227776 1.56688,-9.503234 -1.14053,-3.682121 -3.1502,-4.705471 -6.73808,-5.20334 -4.98733,-0.692061 -8.08652,3.445993 -9.4625,5.354611" id="path6" sodipodi:nodetypes="cssssssssc" inkscape:label="6" /> <path style="fill:none;stroke:#be0000;stroke-opacity:1" d="m 152.67775,15.782648 19.38234,-0.01938 -2.11626,3.82274 c 0,0 -5.40834,7.72497 -6.04051,9.585806 -0.63217,1.860836 -5.93701,13.618609 -5.24055,15.545502" id="path7" inkscape:label="7" /> <path style="fill:none;stroke:#be0000;stroke-opacity:1" d="m 186.41149,14.730354 c 0,0 -3.52753,0.0192 -5.45215,2.552898 -1.37803,1.814132 -1.47215,2.723654 -1.53364,4.706588 -0.0741,2.389606 0.87416,3.611357 1.85203,4.557518 0.97787,0.946162 3.20048,1.972474 4.96355,2.034347 1.76308,0.06187 5.00011,0.494109 6.35318,1.929756 1.35308,1.435647 2.35781,2.953206 2.45778,5.310793 0.1,2.357588 -1.22603,4.981387 -2.20236,5.978633 -0.97632,0.997246 -4.04733,2.481996 -5.83396,2.504235 -1.78663,0.02224 -4.30166,-0.251678 -5.64527,-1.680279 -1.3436,-1.428601 -2.89287,-3.751399 -2.91225,-5.803361 -0.0194,-2.051962 0.52384,-4.072437 1.3784,-5.147851 0.85456,-1.075414 4.28404,-3.241436 6.66827,-3.169653 2.38423,0.07178 5.70186,-1.638884 6.18429,-2.742923 0.48244,-1.104039 1.47176,-3.127376 1.35836,-4.422101 -0.11339,-1.294724 -0.84619,-4.042271 -2.61058,-5.27314 -1.7644,-1.230869 -5.02565,-1.33546 -5.02565,-1.33546 z" id="path8" inkscape:label="8" sodipodi:nodetypes="csssssssssssssssc" /> <path style="fill:none;stroke:#be0000;stroke-opacity:1" d="m 218.67184,26.522348 c 0,0 -3.17648,4.64053 -6.67972,4.671357 -3.50325,0.03083 -4.91678,-0.06175 -6.76308,-1.649103 -1.84631,-1.587359 -2.66828,-3.986123 -2.69757,-5.909273 -0.0293,-1.92315 0.8222,-5.145649 2.28933,-6.45909 1.46714,-1.313441 3.24628,-2.332926 5.58581,-2.297696 2.33954,0.03523 4.40427,0.52912 5.84102,1.994933 1.43674,1.465813 2.41307,3.276225 2.39942,5.838151 -0.0137,2.561925 0.12331,10.030372 0.12331,10.030372 -0.0297,1.403094 -0.50537,4.852017 -1.42904,6.535276 -1.7164,3.127886 -3.83826,4.712785 -6.21424,5.060215 -1.80074,0.263315 -3.91742,-0.04712 -5.36936,-1.49664 -1.45195,-1.449519 -2.3413,-3.622146 -2.3849,-4.795765" id="path9" sodipodi:nodetypes="cssssssccsssc" inkscape:label="9" /> <path style="display:inline;fill:none;stroke:#be0000;stroke-opacity:1" d="m 235.19967,14.398927 c 0,0 -2.85416,-0.157182 -4.96598,2.242424 -2.02556,2.301592 -3.03599,6.153276 -2.9964,9.006807 0.0452,3.257794 0.14966,8.354914 0.3066,9.436492 0.17038,1.774671 0.74503,4.354767 2.10682,6.407292 1.30298,1.96389 2.62558,3.053886 5.10218,3.267952 2.54238,0.219751 4.16168,-1.030889 5.40429,-2.31139 1.31267,-1.352693 3.17929,-4.546846 3.19217,-8.856271 0.0101,-3.384605 0.20854,-9.458336 -0.49632,-11.845247 -0.54897,-1.85902 -1.0696,-3.425905 -2.87371,-5.510969 -1.6484,-1.905108 -4.77965,-1.83709 -4.77965,-1.83709 z" id="path10" sodipodi:nodetypes="csscssssssc" inkscape:label="0" /> <path style="display:inline;fill:none;stroke:#be0000;stroke-opacity:1" d="m 249.34146,32.605978 10.28084,0.0252" id="path11" inkscape:label="-" /> <path id="path13" style="display:inline;fill:none;stroke:#be0000;stroke-opacity:1" d="m 263.9896,38.587064 21.24657,-8.18e-4 m -21.24866,-7.289175 21.23371,0.0012" inkscape:label="=" sodipodi:nodetypes="cccc" /> <path id="path15" style="display:inline;fill:none;stroke:#be0000;stroke-opacity:1" d="m 294.69403,41.599487 c -0.50007,0.0095 -0.97866,0.505346 -0.99422,1.349917 -0.0143,0.777254 0.52729,1.249983 1.04823,1.26373 0.64137,0.01693 1.05254,-0.475175 1.06542,-1.27787 0.0133,-0.825553 -0.52502,-1.304503 -1.11943,-1.335777 z m 0.0635,-28.774292 -0.0745,24.901367" inkscape:label="!" /> <path style="fill:none;stroke:#be0000;stroke-opacity:1" d="m 327.91461,30.117005 c -0.0815,-0.369873 -1.46686,-6.022767 -4.91681,-6.339905 -3.44995,-0.317139 -6.07202,1.968261 -7.26831,3.109863 -1.19629,1.141601 -2.1687,3.368896 -2.36328,5.436279 -0.10578,1.123915 0.0196,2.681071 0.4208,4.069087 0.33675,1.165167 0.84955,2.32907 2.18679,3.21863 1.38417,0.920779 3.77032,1.086071 5.12361,0.520877 1.69407,-0.707518 4.83716,-3.546631 5.36084,-4.956543 0.52368,-1.409912 3.34717,-11.900147 3.34717,-11.900147 l -3.81397,14.846924 c 0,0 0.59815,2.493164 2.66675,2.732666 2.06861,0.239502 6.86914,-2.687011 7.46387,-3.706787 0.59473,-1.019775 2.93408,-4.016845 2.93774,-8.283691 0.002,-1.851059 -1.23998,-7.299072 -3.5166,-9.361572 -1.84451,-1.671035 -5.03951,-4.473068 -10.39453,-5.465577 -3.58332,-0.664139 -7.09155,-0.523193 -11.74585,2.09668 -3.22735,1.816652 -7.53784,4.925293 -9.10571,10.220215 -1.15058,3.885666 -2.32706,9.760475 0.13501,13.986816 2.59427,4.453283 7.17554,7.107178 10.84644,8.405518 3.6709,1.29834 14.50707,-0.535889 14.50707,-0.535889" id="path16" sodipodi:nodetypes="csssssssccsssssssssc" inkscape:label="@" /> <path id="path20" style="fill:none;stroke:#be0000;stroke-opacity:1" d="m 344.75342,35.716309 21.29467,-0.183106 m -19.75317,-11.035156 20.8103,-0.05347 m -3.60351,-9.622556 -5.66284,31.031739 m -3.30494,-31.282715 -5.66381,31.270996" inkscape:label="#" /> <path id="path22" style="fill:none;stroke:#be0000;stroke-opacity:1" d="m 380.63772,11.606566 -0.12353,38.949707 m 8.49487,-28.891845 c 0,0 -1.06714,-4.048096 -3.23559,-5.019532 -2.16846,-0.971435 -6.23877,-2.193603 -9.06324,-0.751464 -2.82446,1.442138 -4.22412,3.522461 -4.15991,6.447265 0.0642,2.924805 2.62256,5.620117 4.39307,6.331543 1.7705,0.711426 7.31469,0.915283 9.80981,2.802735 2.49512,1.887451 2.91968,3.905761 2.89527,5.938476 -0.0244,2.032715 -1.38672,4.165039 -2.66431,5.414795 -1.27759,1.249756 -4.74365,2.137207 -6.47437,2.101807 -1.73071,-0.0354 -4.69775,-0.411621 -6.51757,-2.155274 -1.81983,-1.743652 -2.40308,-5.654052 -2.32496,-6.232422" inkscape:label="$" /> <path style="fill:none;stroke:#bd0000" d="m 7.573792,45.509327 405.042048,0.0065" id="path12" inkscape:label="baseline" sodipodi:nodetypes="cc" /> </g> <g inkscape:groupmode="layer" id="layer4" inkscape:label="line2" style="display:inline"> <path id="path24" style="fill:none;stroke:#be0000;stroke-opacity:1" d="M 32.799805,66.117432 15.622314,97.936523 m 13.694814,-8.084319 c -0.286173,8.780678 11.904147,8.656096 11.68042,0.923829 -0.225845,-7.805472 -11.446895,-8.089076 -11.68042,-0.923829 z M 7.8666992,73.92456 C 7.5805258,82.705238 19.770846,82.580656 19.547119,74.848389 19.321274,67.042917 8.1002236,66.759313 7.8666992,73.92456 Z" inkscape:label="%" /> <path style="fill:none;stroke:#be0000;stroke-opacity:1" d="M 47.163086,82.683838 53.901123,66.541504 60.72168,83.028808" id="path25" inkscape:label="^" /> <path style="fill:none;stroke:#be0000;stroke-opacity:1" d="m 89.716064,97.023193 c -5.9882,-7.491781 -17.619206,-20.841191 -17.964599,-22.475342 0,0 -0.91455,-2.955968 1.595947,-5.284912 1.377844,-1.278202 2.294498,-1.51781 3.89917,-1.506347 2.899311,0.02071 4.778808,1.511568 5.299072,3.164795 0.544494,1.730224 0.894069,5.16746 -2.739258,7.264648 -3.605294,2.081007 -7.828758,4.728183 -9.37048,6.181068 0,0 -2.090213,1.654625 -1.909061,4.76278 0.181153,3.108154 1.972289,6.545415 5.485048,7.04321 2.6247,0.371948 6.704507,-1.250279 8.133849,-2.476804 1.560547,-1.339112 5.529053,-4.581299 5.279053,-10.836914" id="path26" sodipodi:nodetypes="ccsssscsssc" inkscape:label="&amp;" /> <path id="path30" style="display:inline;fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 101.4165,71.350302 3.20575,5.136428 m -3.18996,-11.281398 0.0143,6.159704 -2.983228,5.011586 m -2.713472,-6.335502 5.62483,1.319179 5.8906,-1.271585" sodipodi:nodetypes="cccccccc" inkscape:label="*" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 121.56299,64.957031 c 0,0 -4.51014,9.079181 -5.52246,12.836914 -0.57564,2.136763 -0.75749,4.0441 -0.77124,6.836426 0.0361,2.665527 -0.009,5.906235 0.69311,8.85376 0.67041,2.814178 3.69605,10.432619 5.40113,12.570559" id="path27" sodipodi:nodetypes="cscsc" inkscape:label="(" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 127.64116,64.791047 c 0,0 4.51014,9.079181 5.52246,12.836914 0.57564,2.136763 0.75749,4.0441 0.77124,6.836426 -0.0361,2.665527 0.009,5.906235 -0.69311,8.85376 -0.67041,2.814178 -3.69605,10.432623 -5.40113,12.570563" id="path27-0" sodipodi:nodetypes="cscsc" inkscape:label=")" /> <path style="display:inline;fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 138.04199,104.08618 25.73511,-0.0784" id="path28" inkscape:label="_" /> <path id="path29" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 176.04077,97.909668 0.14209,-20.865479 m -10.4126,10.408203 20.52808,-0.06518" inkscape:label="+" /> <path style="display:inline;fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 208.7868,78.678576 c -0.91712,-1.232036 -4.61253,-4.014824 -7.84173,-4.165881 -3.44194,-0.161008 -5.22522,0.937629 -7.09786,3.831374 -1.18079,1.824647 -1.41948,4.331956 -1.50322,6.912278 -0.0837,2.580323 0.57194,5.821403 1.80321,7.682418 1.49933,2.266161 2.64013,3.00433 5.20019,3.375488 2.44983,0.355175 5.65581,-1.24427 7.57033,-3.404341 1.05524,-1.190579 1.72559,-2.866699 1.72681,-3.966065 0.001,-1.099365 0.13355,-14.554687 0.13355,-14.554687 l 0.0288,32.42969" id="path31" sodipodi:nodetypes="cssssssccc" inkscape:label="q" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 215.32056,74.176269 6.72802,22.8396 6.57447,-23.09082 6.78564,23.341552 6.51221,-23.172119" id="path32" inkscape:label="w" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 248.20215,85.351074 16.46704,-0.08716 c 0,0 0.2478,-5.550781 -1.34546,-7.717041 -1.59326,-2.16626 -3.50171,-2.911621 -6.23853,-2.947754 -2.73681,-0.03613 -4.7096,0.391911 -6.81201,3.120117 -1.22751,1.592887 -2.57397,5.343262 -2.54394,7.670166 0.03,2.326904 0.72048,4.761811 1.47339,6.481933 0.54364,1.242037 1.30414,2.102111 2.17026,2.845608 1.37751,1.182495 2.97677,1.857933 4.45632,1.899388 2.42237,0.06787 4.54285,-0.572379 5.73816,-1.868531 1.19531,-1.296142 2.45313,-3.29663 2.46533,-4.130371" id="path33" sodipodi:nodetypes="ccssssssssc" inkscape:label="e" /> <path id="path35" style="display:inline;fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 273.07901,79.988159 c 0,0 1.04499,-2.835709 2.61288,-4.170776 2.0387,-1.735962 3.73047,-1.169678 6.021,-1.194336 m -8.59814,-0.70752 -0.0462,23.029053" inkscape:label="r" sodipodi:nodetypes="csccc" /> <path id="path37" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 284.76807,75.761963 10.04711,-0.110596 m -5.2583,-7.641602 0.20093,26.3667 c 0,0 -0.47851,2.3125 4.89258,2.196533" inkscape:label="t" /> <path id="path39" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 315.25415,74.343505 c -2.82705,10.228658 -7.08053,27.176805 -11.11499,29.526365 0,0 -1.11914,0.96167 -5.21411,0.83277 m 0.18042,-30.423588 9.44946,22.024902" inkscape:label="y" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 323.58552,74.510015 c 0.0942,1.179861 -0.41725,17.606635 0.59714,18.838489 1.45509,2.575717 2.41057,3.368392 4.82808,3.439338 6.05991,0.17784 9.13221,-5.950928 9.13221,-5.950928 l -0.214,-16.796631 0.3003,22.844971" id="path40" inkscape:label="u" sodipodi:nodetypes="ccsccc" /> <path id="path42" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 347.82918,65.282611 c -2.3612,0.239993 -2.34788,4.273557 0.38185,4.212392 2.4759,-0.05548 2.36201,-4.185821 -0.37324,-4.207862 m -0.0296,8.659552 0.14812,23.166033" inkscape:label="i" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 364.14773,74.756516 c -5.91057,-0.01187 -7.53459,4.850415 -7.68343,11.014782 -0.1177,4.87503 2.55805,10.502631 7.52583,10.70044 2.90176,0.115544 8.9488,-1.25483 9.02768,-9.847631 0.0965,-10.503583 -4.49933,-11.973841 -8.87007,-11.867591 z" id="path43" inkscape:label="o" sodipodi:nodetypes="cssscc" /> <path id="path45" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 380.75809,81.270639 c 2.17334,-5.015784 5.64092,-6.477134 8.94943,-6.295602 4.22125,0.231612 7.82609,3.480303 8.01311,8.734252 0.18749,5.267343 -1.38124,12.403889 -7.27719,12.550973 -5.89595,0.147084 -9.56156,-4.474833 -9.55828,-7.35246 m -0.11023,-14.775356 0.25619,32.192864" sodipodi:nodetypes="csssccc" inkscape:label="p" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 411.80225,66.396484 -6.29712,0.01416 0.0864,37.842046 6.31104,0.0933" id="path46" inkscape:label="[" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 414.39409,66.493162 6.29712,0.01416 -0.0864,37.842038 -6.31104,0.0933" id="path46-9" inkscape:label="]" /> <path style="display:inline;fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 426.27295,65.082519 10.22583,32.802246" id="path47" inkscape:label="\\" /> <path id="path49" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 456.42913,90.696045 c 0,0 -1.00896,6.4104 4.07026,6.066772 M 442.6499,79.693115 c 0,0 0.0328,-5.123535 6.33899,-5.078735 6.30615,0.0448 7.49207,2.588501 7.51782,6.022949 0.0258,3.434448 -0.0797,10.060669 -0.0797,10.060669 0,0 -2.31897,5.10437 -7.43237,5.523682 -5.11341,0.419311 -6.1991,-1.421509 -6.58911,-1.977662 -0.39002,-0.556152 -1.18836,-3.570068 -0.36084,-5.67395 0.82751,-2.103882 4.23852,-3.241699 6.42675,-3.323974 2.18824,-0.08228 7.07203,-0.291504 7.948,-2.354615" sodipodi:nodetypes="cccsscssssc" inkscape:label="a" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 479.2865,79.865777 c 0,0 -0.72609,-5.456772 -6.21774,-5.433811 -5.49164,0.02296 -6.98924,3.672259 -7.01185,5.035546 -0.0226,1.363287 0.43383,5.623881 6.83732,5.910107 6.4035,0.286227 7.12815,2.773757 7.17361,4.837881 0.0542,2.462037 -1.36691,6.173029 -6.45424,6.317696 -5.42897,0.154382 -8.12086,-2.933561 -8.19388,-6.202894" id="path50" inkscape:label="s" sodipodi:nodetypes="csssssc" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 503.32422,80.675293 c 0,0 -3.22502,-6.242926 -8.39624,-6.20459 -4.82966,0.0358 -8.19392,4.988522 -8.12036,9.812012 0.0895,5.8692 2.40954,11.864077 7.54639,12.23291 6.03921,0.433623 9.13329,-7.362549 9.16674,-8.206543 0.0334,-0.843994 -0.11816,-23.436524 -0.11816,-23.436524 l 0.36914,32.189209" id="path51" inkscape:label="d" sodipodi:nodetypes="csssscc" /> <path id="path53" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 509.18628,75.643066 9.66064,-0.04712 m 0.0532,-8.934081 c 0,0 -5.2898,-1.034912 -5.31031,2.885742 -0.0205,3.920655 0.19654,27.60083 0.19654,27.60083" inkscape:label="f" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 539.16211,81.009277 c 0,0 -3.12826,-5.82215 -7.49813,-5.791388 -4.36987,0.03076 -7.87297,4.455633 -7.82817,10.456978 0.0316,4.235355 2.40909,9.921928 7.49031,9.527539 5.81555,-0.451385 7.35819,-6.591903 7.54569,-7.704452 0.1875,-1.112549 0.33595,-12.164475 0.33595,-12.164475 -0.20459,8.680583 0.10865,18.211171 -0.74091,24.54726 -0.81269,2.860731 -2.44723,5.284331 -6.87899,5.133871 -4.43231,-0.15048 -6.61643,-1.74972 -7.25266,-4.90499" id="path54" sodipodi:nodetypes="cssssccsc" inkscape:label="g" /> <path id="path56" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 548.54468,80.712646 c 0.13858,0.05306 3.64656,-6.327608 8.20581,-6.089599 3.91131,0.204183 6.03223,2.763672 6.19214,4.430664 0.17962,1.872472 0.23097,18.107666 0.23097,18.107666 m -14.74294,-32.295166 -0.0808,32.147705" inkscape:label="h" sodipodi:nodetypes="cssccc" /> <path id="path58" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 572.72766,65.110474 c 0,0 -1.39795,0.08228 -1.41724,1.807861 -0.0193,1.725586 0.5044,2.490356 1.3346,2.519653 0.8302,0.0293 1.72766,-0.769653 1.58288,-2.226074 -0.14477,-1.456421 -0.13867,-2.108398 -1.50024,-2.10144 z m -0.01,8.978881 0.023,28.038335 c 0,0 0.39478,2.78173 -5.54565,2.76757" inkscape:label="j" /> <path id="path61" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 587.67336,81.704166 9.73278,15.401828 m -1.8073,-23.031898 -13.38939,12.888946 m -0.19872,-21.764379 0.023,31.890758" inkscape:label="k" sodipodi:nodetypes="cccccc" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 604.58435,64.978027 -0.0194,31.968506" id="path62" inkscape:label="l" sodipodi:nodetypes="cc" /> <path id="path64" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 616.39429,75.287353 c 0,0 -1.09156,0.04834 -1.15772,1.098877 -0.0662,1.050537 0.97095,1.185547 1.29517,1.128662 0.32422,-0.05688 1.38647,-0.364013 1.29419,-1.141113 -0.0923,-0.777099 -1.43164,-1.086426 -1.43164,-1.086426 z m 0.81166,18.954085 c -4.2e-4,-3.08e-4 -0.0403,1.190396 -0.27535,2.71311 -0.32519,2.106713 -1.02392,4.848942 -2.50846,5.951812" inkscape:label=";" sodipodi:nodetypes="csssccsc" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 625.97827,66.056152 -0.0395,10.588135" id="path65" inkscape:label="'" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 632.38501,75.349365 15.75659,0.172363 -16.04468,19.765625 17.53467,-0.06445" id="path66" inkscape:label="z" /> <path id="path68" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 670.42602,74.154785 -15.9038,22.883789 m 0.48754,-22.845215 15.17847,22.775879" inkscape:label="x" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 691.43091,80.671875 c 0,0 -0.51953,-6.237549 -6.66138,-6.261475 -6.14185,-0.02393 -8.86295,7.365235 -8.39091,12.306623 0.383,4.009229 1.30274,8.631787 6.95222,9.008336 6.68592,0.44563 8.20016,-3.207293 8.41379,-6.436541" id="path69" inkscape:label="c" sodipodi:nodetypes="csssc" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 696.80021,73.917863 8.10446,23.304485 8.61026,-23.137376" id="path70" inkscape:label="v" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 720.46236,80.675168 c 0,0 3.22502,-6.242926 8.39624,-6.20459 4.82966,0.0358 8.19392,4.988522 8.12036,9.812012 -0.0895,5.8692 -2.40954,11.864077 -7.54639,12.23291 -6.03921,0.433623 -9.13329,-7.362549 -9.16674,-8.206543 -0.0334,-0.843994 0.11816,-23.436524 0.11816,-23.436524 l -0.36914,32.189209" id="path51-7" inkscape:label="b" sodipodi:nodetypes="csssscc" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 759.87904,96.549237 c -0.0942,-1.179861 0.41725,-17.606635 -0.59714,-18.838489 -1.45509,-2.575717 -2.41057,-3.368392 -4.82808,-3.439338 -6.05991,-0.17784 -9.13221,5.950928 -9.13221,5.950928 l 0.214,16.796631 -0.3003,-22.844971" id="path40-9" inkscape:label="n" sodipodi:nodetypes="ccsccc" /> <path id="path71" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 782.65588,79.120411 c 0,0 2.09851,-4.507008 7.13613,-4.699667 5.03762,-0.192659 6.13436,3.662247 6.12417,4.154598 -0.0102,0.492351 0.18731,18.396861 0.18731,18.396861 m -13.24226,-0.201789 c -0.0942,-1.179861 0.21786,-16.896593 -0.2914,-18.708841 -1.45509,-2.575717 -2.88669,-3.338527 -5.3042,-3.409473 -6.05991,-0.17784 -7.99784,5.769318 -7.99784,5.769318 l 0.214,16.796631 -0.3003,-22.844971" inkscape:label="m" sodipodi:nodetypes="csscccsccc" /> <path id="path64-3" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 808.11567,93.704665 c -4.2e-4,-3.1e-4 -0.0403,1.19039 -0.27535,2.71311 -0.32519,2.10671 -1.02392,4.848935 -2.50846,5.951805" inkscape:label="," sodipodi:nodetypes="csc" /> <path id="path42-3" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 818.76297,92.590252 c -2.3612,0.239993 -2.34788,4.273557 0.38185,4.212392 2.4759,-0.05548 2.36201,-4.185821 -0.37324,-4.207862" inkscape:label="." sodipodi:nodetypes="csc" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="M 836.36818,64.951279 826.16761,97.952588" id="path72" inkscape:label="/" /> <path style="fill:none;stroke:#bd0000" d="m 7.02824,97.441137 832.08327,0.03229" id="path14" sodipodi:nodetypes="cc" inkscape:label="baseline" /> </g> </svg>`);

    const axolotl_centerline = `<?xml version="1.0" standalone="yes"?>
<svg xmlns="http://www.w3.org/2000/svg" width="2067" height="1457">
<g transform="translate(-200,-400)">
<path style="stroke:#050505; fill:none;" stroke-width="7px" d="M1038 430.464C1103.72 418.637 1138.33 509.948 1084 546.64C1077.51 551.025 1069.77 555.131 1062 556.536C1051.26 558.477 1039.54 558.591 1029 555.43C1021.26 553.107 1014.2 548.465 1008 543.384C965.816 508.803 984.1 440.165 1038 430.464M285 601.439C342.028 592.462 379.668 660.681 347.211 706C335.702 722.071 317.894 729.866 299 732.572C259.407 738.241 225.425 700.014 228.09 662C230.261 631.016 254.801 606.193 285 601.439M1152 635.518C1198.15 625.732 1215.62 700.746 1169 710.625C1161.13 712.294 1151.55 712.708 1144 709.468C1109.06 694.479 1116.02 643.147 1152 635.518M1065 769.532C1091.02 763.333 1102.15 803.113 1076 809.645C1050.56 815.999 1039.21 775.676 1065 769.532M441 770.514C456.172 769.536 472.517 776.151 479.954 790C492.54 813.44 480.786 850.463 451 852.907C432.509 854.424 415.085 847.414 406.378 830C393.106 803.455 412.492 772.351 441 770.514M1192 1119C1190.43 1124.33 1187.72 1138.69 1191.03 1143.57C1195.37 1149.98 1204.83 1145.66 1204.02 1157C1203.44 1164.95 1193.51 1166.31 1192.77 1174C1191.96 1182.5 1204.77 1192.22 1201.72 1198.87C1198.89 1205.01 1189.73 1202.51 1187.57 1210C1184.88 1219.36 1192.45 1233.11 1185.15 1241.55C1180.29 1247.16 1170.39 1238.05 1166.18 1245.15C1163.25 1250.09 1163.63 1261.37 1164.17 1267C1164.45 1269.91 1166.13 1274.81 1163.97 1277.36C1158.76 1283.5 1146.57 1269.92 1140.21 1273.12C1131.34 1277.58 1129.48 1294.25 1120.91 1300.29C1111.38 1307.01 1109.97 1290.84 1101 1292.67C1089.35 1295.04 1095.2 1315.06 1085.89 1317.07C1077.65 1318.85 1075.78 1307.29 1068.98 1306.1C1060.79 1304.68 1055.75 1312.92 1049 1315.66C1042.16 1318.43 1039.12 1315.41 1032.99 1313.01C1027.83 1311 1024.61 1308.92 1024.09 1303C1023.82 1299.85 1022.24 1292.22 1024.07 1289.59C1026.58 1285.98 1034.26 1287.23 1038 1286.83C1047.98 1285.75 1058.4 1282.17 1068 1279.28C1107.7 1267.32 1153.92 1240.17 1168 1199C1171.09 1189.96 1178.1 1167.19 1171.97 1158.33C1169.66 1154.99 1164.65 1157.32 1162.01 1158.99C1154.33 1163.87 1148.45 1173.55 1142 1180C1115.81 1206.19 1083.94 1228.25 1049 1240.95C1042.66 1243.25 1016.6 1252.09 1012.89 1243.9C1009.61 1236.66 1013.45 1216.18 1024 1216.52C1032.42 1216.8 1035.51 1229.21 1044.53 1219.79C1048.13 1216.03 1049.51 1211.1 1049.79 1206C1049.92 1203.68 1048.58 1199.78 1050.64 1198.03C1056.33 1193.21 1067.47 1201.81 1073.86 1198.8C1081.66 1195.13 1079.51 1176.7 1087.21 1170.7C1096.92 1163.14 1097.29 1179.13 1106 1178.74C1117.23 1178.24 1116.63 1151.51 1115 1144C1120.55 1142.4 1132.16 1147.23 1136.4 1143.36C1143.98 1136.44 1135.87 1118.06 1149 1113.79C1159.13 1110.49 1157 1129.13 1168 1126.21C1173.13 1124.84 1187.37 1120.2 1190.87 1116.41C1196.6 1110.2 1198.87 1100.71 1205.17 1094.04C1215.53 1083.07 1228.81 1073.57 1242 1066.31C1285.76 1042.22 1338.5 1039.74 1384 1018.69C1403.04 1009.88 1417.54 995.223 1434 982.654C1452.08 968.843 1472.02 957.227 1493 948.424C1518.3 937.807 1545.6 929.823 1573 927.17C1612.63 923.332 1652.34 926.623 1692 922.83C1736.89 918.538 1776.01 891.486 1821 887.17C1877.88 881.712 1925.2 903.002 1979 916.626C2013.2 925.285 2048.66 922.226 2083 929.662C2132.2 940.317 2178.35 975.781 2205 1018C2208.12 1022.95 2208.19 1028.93 2211 1034M593 941L592 950C578.5 952.446 575.631 969.552 573.211 981C566.486 1012.81 569.448 1047.54 580.681 1078C584.146 1087.39 589.127 1095.89 593.125 1105C594.507 1108.15 596.731 1112.54 594.298 1115.7C586.709 1125.55 565.15 1115.35 562.123 1106C560.322 1100.43 564.176 1095.4 560.99 1090C557.137 1083.47 550.113 1079.99 548.689 1072C547.591 1065.84 554.731 1065.06 554.002 1059C552.864 1049.53 545.963 1041.78 544.773 1032C543.993 1025.59 548.931 1022.07 547.611 1015C546.227 1007.58 541.507 999.758 542.238 992.059C542.819 985.94 551.29 989.711 552.643 983.891C554.48 975.989 546.49 969.523 546.951 962.005C547.384 954.947 556.32 957.226 558.357 951.856C561.003 944.882 555.729 935.682 558 928C563.276 929.256 572.23 930.463 574.442 923.942C575.742 920.11 574.223 907.239 579.148 906.618C588.259 905.469 593.81 915.489 601 918.81C606.618 921.405 624.686 916.045 630 913M625 916C623.753 925.261 613.67 937.716 617.742 946.856C620.575 953.212 633.657 948.131 634.357 955.134C635.209 963.657 624.371 967.177 624.863 975.001C625.345 982.683 637.256 988.201 634.303 996.852C632.299 1002.72 621.371 996.92 621.474 1004.06C621.639 1015.55 633.481 1013.28 638.356 1020.22C642.182 1025.67 634.813 1032.26 636.071 1037.96C637.282 1043.44 645.25 1044.31 647.948 1049.04C651.744 1055.7 642.112 1060.36 644.667 1066.94C647.322 1073.78 656.726 1068.03 659.397 1074.15C661.102 1078.06 657.184 1088.35 661.333 1090.39C664.982 1092.19 673.052 1090.14 677 1089.57C689.708 1087.75 702.201 1085.39 715 1084.17C748.489 1080.98 783.53 1085.26 816 1093.38C844.213 1100.43 871.661 1111.11 897 1125.42C905.948 1130.48 920.222 1143.3 931 1139C929.428 1133.68 926.91 1112.37 935.044 1111.64C939.718 1111.23 949.19 1119.03 952.973 1114.39C956.932 1109.54 952.171 1095.01 959.228 1092.41C965.216 1090.2 972.902 1099.94 978.411 1093.68C986.629 1084.35 974.17 1070.07 977.693 1060.15C980.086 1053.41 992.72 1059.25 997.258 1055.23C999.578 1053.17 999.025 1048.76 998.996 1046C998.903 1036.95 996.728 1025.63 994 1017L1006.77 1014.4L1015.01 995.213L1025 985M592 950C596.868 955.756 595.501 960.971 596.17 968C597.216 978.998 597.879 990.038 599.424 1001C602.045 1019.59 604.777 1038.55 612.012 1056C618.03 1070.52 628.442 1083.62 632 1099C642.178 1096.55 650.287 1096.64 659 1090M1202 1147C1216.62 1129.1 1242.63 1117.94 1263 1107.75C1312.71 1082.9 1365.33 1063.22 1418 1045.67C1551 1001.33 1688.29 972.48 1828 962.911C1864.33 960.422 1900.63 961.368 1937 962.961C1959.11 963.929 1982.27 964.276 2004 969.189C2010.4 970.635 2012.78 977.443 2019 979.022C2046.64 986.036 2074.88 986.888 2102 997M504 1081C507.268 1082.74 515.964 1081.7 517.802 1084.6C521.147 1089.88 513.465 1099.04 517.042 1104.68C520.11 1109.52 528.887 1105.26 531.535 1111.15C533.487 1115.49 529.635 1122.7 532.773 1126.4C538.927 1133.64 551.607 1121.7 552.006 1137C552.362 1150.61 536.67 1152.2 529.418 1159.42C524.227 1164.59 521.013 1172.34 515.714 1177.91C512.114 1181.69 506.206 1183.17 502.988 1186.84C498.668 1191.78 500.834 1199.63 492.999 1202.28C486.182 1204.59 470.727 1199.61 464.015 1197.32C453.125 1193.59 463.071 1182.08 456.602 1175.39C448.441 1166.96 433.495 1166.29 427.534 1154.99C422.571 1145.58 437.722 1142.86 431.293 1134.19C427.132 1128.57 411.211 1128.37 410.121 1121.94C408.782 1114.04 419.753 1109.83 418.487 1102C416.575 1090.18 400.006 1083.86 401.746 1070.15C402.626 1063.21 417.138 1070.42 417.681 1060.98C418.404 1048.42 403.711 1043.34 402.838 1032C402.216 1023.94 414.762 1027.1 413.742 1018C412.983 1011.23 404.787 995.564 409.067 989.422C411.815 985.479 422.366 992.132 426.815 990.382C436.882 986.423 433.658 966.028 446.982 965.362C454.411 964.99 451.777 975.911 455.434 979.682C459.688 984.07 470.663 982.271 476 981C478.411 989.393 469.491 1001.48 474.028 1008.61C478.601 1015.8 496.176 1015.48 496.427 1025.99C496.665 1035.94 477.472 1032.89 480.395 1046C483.363 1059.31 496.616 1056.23 504.397 1062.99C510.756 1068.51 504.077 1080.67 499 1084M2015 978C2006.28 986.434 1992.6 985 1981 985C1961.92 985 1942.87 987.492 1924 990.272C1855.58 1000.35 1788.41 1022.92 1724 1047.42C1633.68 1081.78 1550.67 1137.17 1478 1200.28C1434.1 1238.41 1394 1280.8 1352 1320.96C1313.14 1358.12 1270.62 1392.96 1226 1423C1215.83 1429.84 1204.28 1436.32 1195.05 1444.38C1192.19 1446.87 1187.51 1452.79 1189.82 1456.85C1192.42 1461.43 1199.7 1459.76 1204 1460.17C1217.09 1461.42 1229.82 1463.69 1243 1464.01C1254.6 1464.3 1266.5 1464.71 1278 1462.33C1329.21 1451.77 1366.5 1411.03 1400.96 1375C1418.22 1356.95 1434.22 1336.41 1456 1323.45C1487.8 1304.53 1524.95 1297.61 1555 1275.1C1605.79 1237.07 1629.47 1171.72 1684 1138.06C1724.75 1112.92 1772.66 1123.42 1816 1108.3C1859.1 1093.27 1890.68 1056.33 1938 1053.09C1974.46 1050.59 2007.78 1072.29 2044 1068.83C2076.64 1065.71 2105 1047.49 2136 1038.42C2160.64 1031.22 2182.81 1033 2208 1033M409 986L410 987M1024 990C1028.42 994.927 1031.06 1003.58 1038 1005.41C1043 1006.73 1052.59 1001.13 1056.4 1004.64C1061.71 1009.55 1055.89 1022.56 1058.6 1028.86C1061.2 1034.89 1069.6 1030.9 1073.3 1035.32C1078.76 1041.82 1066.87 1048.79 1069.5 1055.94C1071.56 1061.52 1080.04 1058.19 1079.97 1065.02C1079.87 1073.91 1071.58 1078.23 1069.24 1086C1067.62 1091.37 1072.6 1095.68 1072.1 1100.98C1071.57 1106.59 1064.11 1108.17 1061.8 1113.04C1058.47 1120.09 1064.45 1126.24 1060.16 1132.98C1055.9 1139.67 1045.82 1139.78 1042.03 1146.21C1038.5 1152.2 1044.25 1162.23 1039.26 1167.51C1034.5 1172.55 1023.1 1166.53 1017.51 1171.6C1011.58 1177 1019.04 1186.28 1010.96 1190.7C1005.61 1193.62 993.274 1190.42 989.904 1195.43C988.054 1198.19 990.027 1203.19 990.975 1206C994.11 1215.29 1001.23 1226.15 1009 1232M446 1003C444.911 1011.59 440.779 1014.49 438.148 1022C434.803 1031.55 434.777 1043.96 434.09 1054C430.518 1106.16 461.158 1156.3 502 1186M445 1014C452.96 1022.16 453.069 1031.33 455.424 1042C457.95 1053.44 461.777 1064.41 466.781 1075C477.082 1096.81 488.921 1118.01 505.17 1136C512.497 1144.11 521.67 1149.98 529 1158M975 1182C965.553 1179.53 956.595 1168.97 950.044 1162C947.669 1159.47 944.113 1155.85 945.357 1152C948.123 1143.45 964.443 1135.75 971 1129.83C987.426 1114.99 1001.44 1098.5 1011.97 1079C1018.36 1067.18 1022.77 1054.16 1025.39 1041C1026.23 1036.78 1027.42 1031.48 1033 1033.03C1047.67 1037.1 1047.34 1066.28 1046.17 1078C1043.24 1107.34 1028.21 1133.81 1007.96 1155C999.81 1163.53 983.392 1172.02 977.904 1182.17C974.462 1188.53 982.185 1193.21 987 1195M1076 1039L1082 1039M631 1100C623.178 1108.56 608.408 1109.48 598 1113M337 1267C338.565 1262.5 340.248 1249.18 334.852 1246.74C331.191 1245.09 322.561 1248.11 320.643 1243.68C316.812 1234.85 324.848 1222.39 314.786 1214.73C309.821 1210.95 296.819 1215.27 294.117 1211.39C289.416 1204.64 299.327 1191.67 297.388 1184.04C295.385 1176.16 282.315 1173.16 284.121 1163.13C285.145 1157.45 294.172 1160.51 295.142 1153.98C296.802 1142.81 288.433 1123.63 297.433 1114.27C305.27 1106.12 311.297 1125.72 320 1123.93C325.925 1122.71 329.018 1114.15 335.891 1115.41C342.833 1116.69 340.423 1130.3 344.317 1134.82C349.821 1141.21 359.652 1139.55 365.535 1145.28C372.824 1152.37 374.618 1166.52 382.394 1172.36C388.512 1176.95 396.42 1165.74 402.411 1169.21C408.747 1172.88 402.655 1187.92 407.728 1193.56C412.623 1199 419.336 1190.78 424.957 1193.27C431.924 1196.36 433.267 1208.25 437.789 1213.89C443.996 1221.63 450.458 1215.17 458 1217.83C464.934 1220.27 467.915 1228.42 475 1230.22C485.204 1232.81 489.672 1210.84 491 1204M579 1120C575.546 1131.63 563.821 1135.77 553 1138M350 1140L350 1144M929 1141C933.532 1146.18 937.094 1150.34 944 1152M317 1155C320.78 1160.74 332.368 1162.42 338 1168C366.283 1196.02 395.744 1218.96 432 1235.75C442.518 1240.62 454.264 1246.65 466 1247C468.501 1247.08 472.548 1248.88 474.75 1247.44C478.149 1245.23 477.938 1235.7 478 1232M1205 1158L1209 1158M317 1159C329.058 1209.07 362.604 1247.08 408 1271.69C422.344 1279.47 437.531 1286.13 453 1291.33C458.44 1293.16 468.901 1292.8 472.042 1298.11C478.868 1309.65 454.926 1310.83 449 1310.99C438.069 1311.28 438.531 1321.19 429.003 1323.15C420.321 1324.94 423.686 1312.48 416.945 1310.81C411.939 1309.57 406.094 1315.36 401.228 1312.88C395.675 1310.05 395.909 1298.04 391.319 1293.28C384.324 1286.02 377.463 1294.42 370.043 1290.46C361.266 1285.78 361.689 1272.45 353.79 1266.74C349.869 1263.91 343.57 1265 339 1265M1203 1198L1206 1198M589 1205.44C616.612 1201.33 614.796 1240.8 591 1244.85C559.203 1250.27 561.26 1209.58 589 1205.44M902 1244.48C912.707 1242.15 924.669 1247.95 929.196 1258C933.571 1267.71 931.626 1282.29 920 1285.5C907.844 1288.85 894.533 1279.85 891.354 1268C888.86 1258.71 891.204 1246.84 902 1244.48M1015 1248C1016.59 1260.6 1017.78 1276.77 1024 1288M474 1249C474 1263.76 477.183 1282.85 473 1297M607 1300C622.462 1318.83 649.773 1328.74 672 1337.05C737.321 1361.48 819.631 1367.7 881 1330M475 1305C484.866 1310.72 488.678 1323.66 494.692 1333C503.923 1347.33 516.055 1358.89 526.779 1372C529.184 1374.94 529.983 1378.95 532.51 1381.7C535.493 1384.94 540.487 1384.83 543.896 1387.51C547.633 1390.45 548.667 1395.48 552.263 1398.44C555.997 1401.51 561.783 1401.55 566 1403.95C578.745 1411.24 590.959 1419.14 604 1426M1026 1310C1022.01 1317.44 1021.62 1329.95 1024 1338C1029.67 1336.65 1043.12 1334.37 1047.77 1338.44C1051.34 1341.55 1050.1 1349.64 1055.13 1350.79C1063.41 1352.7 1064.39 1341.54 1071.04 1341.33C1079.45 1341.07 1081.66 1351.6 1089 1353.07C1095.78 1354.43 1107.94 1344.99 1115 1343C1116.07 1346.61 1115.65 1350.39 1116.72 1353.98C1121.58 1370.17 1141.33 1344.58 1147.98 1345.36C1153.94 1346.05 1152.82 1354.42 1158.11 1355.97C1167.98 1358.87 1181.05 1347.73 1190.67 1352.6C1195.24 1354.92 1190.77 1372.77 1193.86 1378C1196.02 1381.67 1200.49 1384.56 1201.2 1389C1202.43 1396.68 1189.21 1395.77 1185.56 1400.22C1178.79 1408.49 1182.24 1422.2 1173.79 1429.68C1167.97 1434.82 1159.96 1428.63 1154.21 1432.75C1149.24 1436.31 1149.21 1449.57 1143.85 1450.78C1135.72 1452.63 1130.56 1442.97 1123 1443.25C1112.62 1443.63 1108.34 1457.93 1097.06 1458.24C1090.1 1458.43 1094.29 1445.97 1087.89 1443.64C1078.25 1440.14 1072.85 1454.46 1064 1454.44C1055.96 1454.43 1058.24 1442.74 1050.98 1441.41C1041.46 1439.66 1032.8 1452.95 1023.13 1449.36C1015.67 1446.58 1021.13 1434.03 1014.72 1430.19C1005.77 1424.83 992.744 1448.16 986.854 1435.89C984.158 1430.28 982.106 1416.85 984.038 1411C986.667 1403.04 995.099 1402.65 998.348 1395.96C1004.91 1382.43 1012.43 1368.71 1018.7 1355C1021.37 1349.14 1019.63 1342.84 1023 1337M1054 1353C1052.5 1356.68 1051.04 1363.17 1046.94 1364.76C1041.72 1366.79 1023.78 1357.94 1019 1355M1048 1366C1070.19 1380.06 1107.36 1383.27 1133 1380.83C1142.3 1379.95 1151.68 1378.73 1161 1378.09C1163.64 1377.91 1169.13 1377.09 1170.93 1379.6C1173.94 1383.77 1168.42 1392.02 1165.81 1395C1156.34 1405.8 1143.54 1413.32 1130 1417.66C1100.34 1427.16 1055.06 1420.32 1026 1410.67C1016.71 1407.58 1005.92 1404.88 998 1399M532 1382C520.529 1392.22 501.168 1396.48 487 1402.2C459.981 1413.1 431.779 1425.38 409 1443.8C387.948 1460.83 370.012 1483.59 355.001 1506C348.041 1516.39 340.392 1535.45 329.96 1542.4C324.298 1546.16 315.424 1544.5 309 1545.29C293.155 1547.23 278.234 1551.61 264 1558.75C258.236 1561.64 251.642 1564.84 248.801 1571C242.379 1584.93 272.101 1581.68 281 1583.9C285.097 1584.92 290.642 1586.88 290.581 1592C290.487 1599.95 278.197 1606.46 273 1611.17C261.024 1622.02 250.316 1635.47 249 1652C277.686 1648.14 307.502 1625.18 337.985 1635.23C349.155 1638.91 348 1666.46 348 1676C348 1682.01 347.294 1690.6 356 1687.43C363.54 1684.69 368.469 1676.4 372.656 1670C380.846 1657.48 387.22 1642.87 389.561 1628C391.004 1618.83 389.45 1609.04 391.928 1600C394.541 1590.47 401.774 1581.42 406.799 1573C420.092 1550.73 434.816 1527.76 456 1512.16C478.808 1495.36 505.23 1486.01 532 1477.66C539.627 1475.28 560.712 1473.72 565.107 1466.72C568.337 1461.58 562.96 1450.92 561 1446C554.922 1430.76 551 1416.5 551 1400M838 1466C869.722 1465.74 905.594 1455.48 934 1441.74C950.249 1433.88 964.645 1420.93 982 1416M1147 1453C1155.75 1471.19 1173.73 1458.08 1187 1457M1172 1465C1176.42 1476.36 1186.93 1481.1 1194.71 1490C1204.52 1501.23 1209.6 1513.84 1213.57 1528C1217.15 1540.76 1216.36 1555.03 1214.57 1568C1213.46 1576.08 1209.46 1586.06 1212.61 1594C1219.68 1611.82 1230.12 1625.56 1227.42 1646C1226.84 1650.43 1227.83 1657.98 1223.69 1660.95C1219.18 1664.18 1214.21 1659.94 1211 1656.96C1205 1651.4 1192.84 1637.67 1183.1 1642.27C1178.88 1644.27 1177.48 1650.1 1175.69 1654C1171.73 1662.64 1167.26 1671.08 1162 1679C1159.08 1683.38 1154.36 1690.96 1148.04 1687.81C1136.41 1682 1137 1653.93 1137 1643C1137 1637.96 1138 1629.06 1132.85 1626.03C1123.86 1620.74 1102.95 1630.45 1094 1633.33C1090.92 1634.32 1081.51 1637.65 1079.07 1634.38C1075.89 1630.14 1081.86 1620.3 1084.34 1617C1091.01 1608.13 1100.04 1600.74 1110 1595.81C1115.78 1592.95 1123.85 1593.36 1127.08 1586.96C1130.17 1580.83 1129.64 1573.61 1130.09 1567C1131.76 1542.53 1122.71 1522.4 1104 1506.19C1099.33 1502.14 1092.87 1501.99 1088.39 1498.27C1083.2 1493.96 1081.15 1488.15 1075 1484M567 1466C574.707 1471.79 581.765 1479.19 587.446 1487C589.791 1490.22 590.369 1496.28 593.563 1498.58C596.3 1500.55 600.105 1500.83 603 1502.69C618.272 1512.49 632.494 1523.92 647.999 1533.62C652.273 1536.29 654.776 1541.33 659.104 1543.57C665.308 1546.77 673.407 1546.09 680 1548.44C706.574 1557.9 732.853 1565.35 761 1568.71C794.897 1572.77 831.06 1572.41 865 1569.17C872.685 1568.44 893.912 1569.84 898.071 1561.89C903.224 1552.04 883.744 1540.01 878 1535M945 1482C964.13 1497.18 983.23 1512.25 1002 1527.87C1005.14 1530.49 1009.59 1531 1012.49 1533.7C1015.49 1536.5 1016.39 1541.64 1018.83 1545C1032.09 1563.24 1040.68 1582.37 1042.83 1605C1044.52 1622.74 1042.99 1641.52 1039.92 1659C1038.4 1667.62 1033.03 1678.2 1035.43 1687C1037.57 1694.83 1047.57 1701.26 1052.91 1707C1062.01 1716.78 1069.32 1727.72 1074.57 1740C1076.74 1745.07 1081.44 1755.11 1078.55 1760.64C1076.23 1765.07 1065.93 1759.8 1063 1758.29C1053.06 1753.2 1042.98 1749.91 1032 1747.8C1028.27 1747.09 1022.64 1745.86 1019.43 1748.6C1016.26 1751.31 1015.83 1757.19 1014.87 1761C1012.58 1770.14 1009.66 1779.07 1006.67 1788C1005.09 1792.71 1003.42 1799.51 997.985 1801.16C991.027 1803.28 985.429 1793.97 982.782 1789C976.349 1776.93 973.293 1765.39 971.08 1752C970.331 1747.46 970.881 1738.89 966.581 1736.03C962.122 1733.06 953.46 1736.13 949 1737.81C934.681 1743.21 922.162 1751.06 907 1754C903.559 1733.59 924.234 1711.11 939 1699.9C944.232 1695.93 954.539 1692.72 957.682 1686.9C962.655 1677.68 957.687 1661.63 956.08 1652C949.482 1612.46 934.407 1582.37 900 1561M592 1499C585.782 1506.64 579.447 1513.75 574.003 1522C571.419 1525.92 569.009 1531.36 563.996 1532.53C557.685 1534 549.445 1531.32 543 1531.04C528.39 1530.4 514.491 1530.17 500 1533C493.491 1534.27 482.244 1534.5 479.605 1542C477.473 1548.07 485.585 1550.79 490 1551.56C500.011 1553.31 510.133 1554.89 520 1557.38C523.919 1558.36 529.065 1559.61 530.442 1564.02C532.005 1569.03 527.13 1573.92 524.13 1577.17C518.684 1583.07 513.11 1591.23 510.785 1599C509.953 1601.78 508.062 1607.81 510.042 1610.39C512.791 1613.97 521.911 1610.12 525 1608.63C538.926 1601.9 555.193 1595.23 571 1595.13C581.495 1595.07 588.022 1609.88 591.688 1618C593.455 1621.92 594.665 1628.84 600.015 1629.22C608.146 1629.8 611.143 1616.83 612.856 1611C616.186 1599.66 613.198 1582.92 619.738 1573.04C628.378 1559.99 647.89 1557.05 657 1544M1087 1499C1067.03 1516.91 1034.67 1516.32 1014 1533M249 1652L246 1655"/>
</g>
</svg>`;
    const axolotlStamp = parseSvg(axolotl_centerline);

    const great_job = `<?xml version="1.0" standalone="no"?> <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 20010904//EN" "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd"> <svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="878.000000pt" height="512.000000pt" viewBox="0 0 878.000000 512.000000" preserveAspectRatio="xMidYMid meet"> <metadata> Created by potrace 1.16, written by Peter Selinger 2001-2019 </metadata> <g transform="translate(0.000000,512.000000) scale(0.100000,-0.100000)" fill="#000000" stroke="none"> <path d="M2400 5084 c-197 -23 -341 -60 -426 -110 l-43 -26 -67 27 c-75 30 -22 28 -589 27 -223 0 -338 -5 -410 -16 -455 -68 -737 -338 -837 -799 -30 -141 -33 -507 -4 -667 69 -392 261 -682 556 -843 91 -50 157 -74 290 -107 191 -48 236 -53 475 -55 127 -1 241 -6 254 -10 21 -7 13 -12 -53 -31 -161 -48 -282 -145 -326 -262 -44 -116 -36 -352 15 -469 35 -77 121 -163 208 -207 40 -20 138 -53 220 -75 82 -21 150 -41 152 -43 8 -7 25 -135 25 -185 l0 -52 -62 32 c-55 29 -70 32 -148 32 -80 0 -92 -3 -163 -38 -103 -51 -184 -127 -233 -219 l-39 -73 0 -130 c1 -116 4 -139 28 -210 50 -143 145 -260 297 -367 141 -99 222 -134 412 -179 124 -30 133 -30 331 -27 l204 3 86 43 c74 36 102 58 184 143 86 88 169 149 202 149 6 0 41 -22 78 -49 164 -120 319 -187 593 -257 99 -26 121 -27 380 -31 351 -6 388 1 625 122 205 105 205 105 258 60 60 -52 152 -94 238 -110 41 -7 103 -20 139 -28 103 -25 223 -30 400 -17 216 15 333 38 526 105 88 30 174 55 192 55 19 0 66 -16 105 -35 104 -49 337 -105 468 -112 140 -7 230 9 329 58 176 88 226 214 186 461 -18 111 -20 184 -6 278 5 36 14 119 20 185 11 124 33 260 75 475 53 268 69 456 45 540 -5 19 -14 71 -20 115 -13 103 -45 168 -118 237 -69 66 -155 112 -259 138 -41 10 -77 21 -81 24 -14 15 123 4 194 -15 115 -31 183 -37 329 -28 72 4 220 13 330 19 308 18 402 43 475 126 66 76 74 134 41 314 -24 132 -36 160 -101 239 l-52 63 -1 126 c-1 230 38 297 216 366 121 47 173 85 210 156 l29 55 -5 200 c-4 188 -7 209 -40 340 -57 227 -100 327 -175 407 -48 51 -138 100 -206 113 -62 11 -215 7 -344 -9 -195 -24 -380 -29 -631 -16 -274 15 -345 8 -445 -44 -57 -29 -115 -91 -162 -172 -10 -17 -15 -15 -64 28 -123 107 -280 159 -485 158 -195 0 -345 -35 -471 -111 -80 -48 -192 -146 -243 -212 -24 -31 -45 -57 -47 -57 -1 0 -15 39 -29 88 -15 48 -34 100 -42 116 -23 45 -93 116 -138 139 -54 28 -177 34 -267 13 -51 -12 -80 -13 -125 -6 -150 25 -419 34 -718 23 -335 -11 -369 -18 -468 -89 -33 -24 -55 -33 -62 -28 -105 78 -206 129 -335 168 -161 48 -253 58 -560 61 -157 2 -301 1 -320 -1z m685 -238 c114 -24 231 -63 298 -98 81 -42 186 -147 219 -218 57 -122 78 -283 60 -455 -26 -230 -119 -382 -291 -474 -33 -18 -61 -37 -61 -43 0 -27 161 -284 220 -352 24 -27 40 -35 80 -40 29 -4 59 -15 70 -26 39 -39 54 -166 25 -208 -38 -53 -148 -94 -367 -137 -164 -32 -280 -37 -324 -13 -38 21 -64 86 -64 159 0 39 4 51 26 68 15 12 34 21 44 21 31 0 29 12 -14 78 -56 89 -125 211 -170 300 -27 53 -41 72 -56 72 -19 0 -20 -7 -20 -204 0 -112 -3 -211 -6 -220 -4 -11 6 -20 36 -32 50 -20 63 -47 51 -109 -12 -64 -35 -94 -94 -120 -86 -39 -172 -49 -376 -41 -198 7 -321 22 -321 40 1 6 7 38 15 71 8 33 15 81 15 107 0 43 2 47 28 50 26 3 27 6 34 68 11 109 21 875 13 1042 l-7 157 -35 12 -36 11 7 57 c16 140 17 306 3 359 l-15 54 45 19 c60 26 149 48 235 59 116 14 650 4 733 -14z m5281 -46 c76 -37 121 -168 160 -472 19 -153 10 -224 -36 -270 -61 -60 -132 -27 -203 94 l-37 63 -100 19 c-55 10 -103 16 -106 13 -3 -3 -1 -174 5 -381 6 -207 11 -459 11 -560 0 -199 -1 -196 56 -196 39 0 103 -38 124 -73 12 -20 20 -50 20 -79 0 -129 -45 -146 -465 -168 -351 -18 -508 -11 -522 25 -2 7 4 28 14 47 13 25 18 55 18 131 l0 98 30 7 c70 18 79 106 72 686 -3 273 -9 462 -15 468 -12 12 -133 -17 -143 -35 -46 -82 -145 -172 -160 -145 -3 7 -12 45 -19 83 -16 88 -75 274 -107 339 -19 38 -24 60 -20 93 6 56 59 162 93 187 35 25 141 30 384 18 192 -9 498 -1 640 17 36 5 110 9 164 10 81 1 107 -3 142 -19z m-6566 -35 c67 -40 75 -62 74 -203 -1 -224 -44 -442 -97 -489 -30 -28 -52 -31 -131 -22 -81 10 -124 34 -154 87 -22 39 -23 40 -105 52 -118 18 -259 10 -322 -19 -68 -30 -121 -84 -147 -151 -27 -69 -37 -301 -18 -417 30 -191 113 -313 211 -313 72 0 115 64 126 184 l6 75 -29 6 c-64 15 -91 27 -128 57 -51 42 -66 81 -66 177 0 74 2 82 24 97 60 38 120 45 436 46 299 1 306 1 359 -22 68 -30 81 -58 81 -178 0 -93 -7 -109 -52 -125 -16 -6 -18 -26 -18 -226 0 -121 5 -265 11 -321 17 -158 -9 -232 -95 -271 -58 -26 -175 -25 -282 3 -83 22 -84 22 -156 4 -41 -10 -128 -20 -198 -23 -354 -14 -632 141 -785 438 -99 191 -141 410 -132 684 11 319 79 510 241 670 97 96 184 145 324 182 90 24 116 27 362 31 176 3 287 0 330 -7 56 -10 70 -10 95 4 43 23 188 17 235 -10z m2850 -16 c102 -6 211 -17 242 -24 51 -11 63 -10 110 6 101 35 177 20 199 -40 34 -89 70 -336 72 -506 2 -106 -11 -146 -59 -176 -43 -26 -164 -37 -217 -20 -66 22 -125 111 -126 189 -1 26 -7 35 -27 42 -35 14 -221 25 -266 16 l-35 -6 -12 -88 c-6 -48 -14 -111 -17 -140 l-7 -52 190 0 c125 1 198 -3 215 -10 87 -40 89 -215 2 -304 -51 -52 -90 -60 -226 -47 -63 6 -131 11 -151 11 -35 0 -37 -2 -37 -34 0 -45 26 -188 45 -255 l17 -54 71 5 c40 3 105 13 144 23 71 18 73 19 78 54 20 121 49 188 95 222 60 45 194 44 268 -1 54 -33 67 -76 65 -220 -1 -249 -47 -477 -105 -525 -47 -40 -159 -32 -228 16 -23 15 -38 16 -145 8 -66 -5 -264 -10 -440 -11 -279 -2 -328 0 -384 15 -36 10 -66 19 -67 20 -1 1 5 30 14 64 15 59 15 69 -1 150 -10 49 -31 115 -46 148 -38 81 -52 187 -53 407 0 155 3 194 21 256 66 238 47 563 -46 745 -28 55 -24 64 35 93 30 15 71 20 212 25 306 10 411 9 600 -2z m1736 -4 c130 -30 259 -134 340 -271 77 -132 135 -328 173 -589 l16 -110 40 -13 c22 -7 51 -23 64 -35 90 -83 77 -265 -26 -365 l-45 -43 7 -93 c4 -51 10 -98 14 -103 3 -5 21 -15 39 -22 70 -29 111 -108 82 -161 -36 -68 -221 -105 -449 -89 -172 12 -273 46 -299 103 -24 54 19 146 70 146 22 0 23 43 4 144 -20 102 -27 106 -191 106 -121 0 -135 -2 -166 -23 -42 -28 -55 -66 -61 -174 -4 -79 -4 -83 16 -83 35 0 86 -38 102 -75 33 -79 9 -137 -71 -171 -58 -24 -228 -37 -415 -31 -187 5 -215 10 -205 36 32 81 63 285 71 471 9 189 -18 294 -96 384 l-30 34 26 21 c15 12 33 21 41 21 18 0 29 32 38 115 11 116 64 354 97 440 89 231 253 386 453 428 91 20 282 21 361 2z m284 -2150 l105 -29 -45 -8 c-203 -37 -313 -79 -403 -151 l-57 -47 -60 30 c-33 17 -99 43 -146 59 -71 24 -83 31 -68 39 44 23 284 115 334 128 84 21 216 13 340 -21z m-2590 -1 c66 -13 177 -18 505 -24 307 -5 430 -10 458 -20 20 -7 37 -16 37 -20 0 -3 -30 -12 -67 -20 -90 -17 -199 -60 -256 -99 -42 -28 -69 -57 -125 -130 l-19 -24 -64 36 c-90 50 -196 91 -324 123 -107 28 -117 29 -370 29 -250 -1 -264 -2 -380 -29 -127 -30 -222 -64 -334 -121 l-69 -34 -27 44 c-14 25 -54 68 -88 96 -34 29 -63 55 -65 59 -2 4 19 18 45 31 45 23 60 24 250 25 216 2 297 11 435 51 197 55 286 61 458 27z m3045 -279 c120 -32 206 -92 218 -151 10 -51 -22 -305 -67 -536 -51 -254 -63 -333 -81 -541 -15 -172 -17 -178 -111 -207 -132 -40 -307 -49 -416 -20 l-36 10 5 138 c4 103 1 155 -11 211 -17 82 -60 182 -102 236 l-27 36 36 77 c42 92 57 158 57 256 0 131 -39 265 -103 350 -40 53 -40 53 6 81 105 61 238 86 432 80 87 -2 163 -10 200 -20z m-1340 -30 c276 -49 454 -135 530 -255 64 -101 73 -268 21 -373 -27 -56 -116 -148 -163 -170 -33 -15 -25 -27 34 -49 188 -70 268 -314 192 -588 -85 -311 -287 -472 -674 -536 -87 -15 -165 -19 -370 -19 -302 0 -311 2 -355 90 -22 45 -25 62 -25 170 0 111 2 126 31 200 78 199 113 487 83 702 -32 239 -111 433 -239 591 -48 60 -51 65 -40 96 27 83 140 138 325 156 128 13 546 4 650 -15z m-3140 5 c82 -12 187 -58 208 -92 37 -59 26 -278 -18 -354 -31 -53 -30 -52 -111 -69 -36 -7 -68 -15 -69 -17 -2 -2 3 -93 10 -203 19 -256 19 -409 0 -615 -17 -194 -26 -248 -61 -351 -64 -196 -182 -307 -359 -340 -86 -16 -297 -4 -383 23 -130 40 -246 112 -345 216 -78 83 -117 181 -120 303 -1 63 18 106 72 162 42 45 73 63 131 76 68 15 93 0 147 -87 67 -110 94 -141 129 -152 44 -15 103 6 126 45 67 116 72 401 11 737 l-15 86 -97 6 c-244 15 -365 46 -426 110 -52 54 -65 99 -65 227 0 122 13 157 76 205 54 40 175 73 308 83 151 12 770 12 851 1z m1545 -95 c179 -43 303 -108 428 -220 139 -125 243 -361 260 -592 25 -344 -65 -650 -250 -847 -167 -179 -343 -261 -613 -287 -291 -27 -594 38 -810 173 -115 73 -227 197 -290 322 l-46 91 11 110 c14 134 17 403 6 545 l-7 105 30 18 c85 50 153 165 172 288 6 41 16 85 23 99 29 62 227 158 401 195 152 33 156 33 375 31 176 -2 206 -5 310 -31z m2857 -1459 c104 -33 183 -122 183 -206 0 -51 -38 -120 -88 -157 -68 -51 -158 -75 -282 -75 -181 0 -309 40 -357 111 -31 45 -29 90 5 148 16 26 39 74 52 105 25 61 21 59 165 92 46 11 272 -2 322 -18z"/> <path d="M2758 4304 c-10 -9 -10 -208 -1 -294 l6 -63 106 5 c160 8 220 40 241 129 22 89 -4 183 -57 209 -31 15 -282 27 -295 14z"/> <path d="M6153 4136 c-40 -45 -67 -148 -68 -256 0 -80 1 -85 25 -97 17 -10 58 -13 132 -11 144 4 146 6 130 130 -24 189 -68 268 -150 268 -33 0 -45 -6 -69 -34z"/> <path d="M5555 1808 c-3 -8 -4 -63 -3 -124 l3 -109 48 -3 c63 -4 150 22 188 56 38 34 49 90 25 127 -23 35 -73 53 -171 61 -69 5 -86 4 -90 -8z"/> <path d="M5550 1073 c0 -76 -3 -189 -7 -250 l-6 -113 39 0 c86 0 184 51 229 118 35 53 51 150 36 216 -26 113 -96 166 -219 166 l-72 0 0 -137z"/> <path d="M3751 1554 c-63 -17 -96 -39 -148 -98 -46 -52 -62 -96 -70 -191 -14 -176 53 -312 185 -377 58 -29 77 -33 142 -33 97 1 164 29 225 97 59 66 80 130 80 243 -1 266 -181 422 -414 359z m197 -368 c8 -65 -27 -116 -78 -116 -34 0 -37 13 -16 65 17 39 64 87 80 82 6 -2 12 -16 14 -31z"/> </g> </svg>`;

    const greatJobStamp = parseSvg(great_job);

    const cuteAxolotl = parseSvg(`<?xml version="1.0" standalone="yes"?> <svg xmlns="http://www.w3.org/2000/svg" width="656" height="608" stroke-width="3px"> <path style="stroke:#0d0d0c; fill:none;" d="M93 75C86.2699 76.0548 65.177 70.5256 72.6042 60.1327C76.0881 55.2576 87.5224 56.0547 88.5772 49.892C90.0333 41.3834 76.8667 29.098 87.1443 21.743C98.9835 13.2706 106.394 36.8672 115.961 34.2878C120.055 33.1841 121.748 28.309 126.003 27.2068C137.657 24.1881 139.075 46.113 142 53C158.722 46.767 155.173 58.0817 161 69C162.983 68.158 164.861 67.4109 167.005 67.054C182.939 64.4009 174.78 81.7208 180.028 88.3973C181.924 90.8093 186.354 90.145 188.956 91.4337C193.179 93.5255 193.973 97.7773 194.799 102C195.895 107.599 191.725 123.889 199.059 125.667C206.17 127.391 218.052 120.676 225 118.71C240.661 114.279 257.748 112.006 274 112C320.984 111.982 365.956 121.256 406 146.95C415.962 153.342 429.623 161.193 437.2 170.274C448.759 184.127 461.218 201.923 467.427 219C470.141 226.465 469.721 234.591 473 242C480.241 236.455 503.128 213.769 504 235"/> <path style="stroke:#0d0d0c; fill:none;" d="M161 70L159 80"/> <path style="stroke:#0d0d0c; fill:none;" d="M87 76C83.2345 92.4727 91.6514 91.7353 103 100C95.4332 113.979 113.76 119.485 125 119"/> <path style="stroke:#0d0d0c; fill:none;" d="M501 142C501.078 135.423 512.072 115.193 519.04 113.337C524.791 111.806 528.276 119.186 533.815 114.586C542.123 107.686 548.357 86.0233 562.892 89.3572C569.625 90.9016 566.455 102.226 575.005 100.901C584.616 99.4121 602.787 85.524 609.343 100.015C615.546 113.727 596.699 117.823 592.281 127.04C589.736 132.348 595.86 137.355 592.82 142.895C587.35 152.866 571.482 149.48 564.603 156.589C561.393 159.905 562.871 165.849 559.49 169.468C551.624 177.888 536.181 176.563 526 176M180 90L177 101"/> <path style="stroke:#0d0d0c; fill:none;" d="M104 100L112 99"/> <path style="stroke:#0d0d0c; fill:none;" d="M529 118L529 124M122 120C113.35 136.293 136.116 140.566 147 142.801C151.549 143.735 158.843 145.695 155.713 151.91C154.076 155.16 150.539 157.507 148.004 160.015C145.745 162.249 143.678 164.618 141.576 166.995C127.743 182.638 126.444 153.277 114.005 149.851C107.555 148.075 108.195 158.216 101.985 156.704C91.3444 154.112 87.9163 140.34 79 154C72.7916 150.515 68.5351 143.2 62 140.743C52.0116 136.988 51.1345 152.101 54 158"/> <path style="stroke:#0d0d0c; fill:none;" d="M198 126C187.594 134.551 171.467 142.961 159 148M437 168C443.132 161.122 446.051 145.767 456 143.207C462.996 141.406 464.59 152.232 470.907 148.882C477.573 145.347 484.319 120.674 494.829 127.617C497.205 129.188 499.082 131.925 501 134"/> <path style="stroke:#0d0d0c; fill:none;" d="M586 131L590 130"/> <path style="stroke:#0d0d0c; fill:none;" d="M55 189C50.2941 189.866 28.3777 195.753 29.5818 185.981C30.1918 181.03 38.587 177.337 36.7438 172.105C34.7782 166.525 11.3102 159.493 19.6042 150.703C27.5882 142.241 42.353 153.222 51 154"/> <path style="stroke:#0d0d0c; fill:none;" d="M468 151L468 156"/> <path style="stroke:#0d0d0c; fill:none;" d="M559 156L563 158"/> <path style="stroke:#0d0d0c; fill:none;" d="M133 174C131.264 182.065 126.075 188.496 122.851 196C121.519 199.101 120.525 204.111 117.582 206.111C114.055 208.508 108.126 207.634 104 209.865C98.46 212.86 89.8004 218.832 83.1335 216.092C77.5008 213.777 81.4971 206.584 77.5123 204.201C70.1137 199.778 53.4439 215.671 53.1829 197.002C53.1503 194.672 53.709 192.304 54 190M533 178C532.588 197.358 508.082 199.137 493 197"/> <path style="stroke:#0d0d0c; fill:none;" d="M155 232C144.718 221.595 147.775 205.561 157.591 195.174C161.687 190.841 172.823 184.267 178.775 188.618C181.371 190.515 182.422 194.052 183.254 197C187.512 212.085 172.898 214.375 164 223.015C158.667 228.194 153.496 233.298 158.279 240.851C161.808 246.425 173.586 242.096 177.906 239.157C185.842 233.757 188.758 215.775 184 208"/> <path style="stroke:#0d0d0c; fill:none;" d="M83 198L79 203M498 200C502.547 218.254 476.247 211.068 468 217"/> <path style="stroke:#0d0d0c; fill:none;" d="M540 230C543.768 221.713 563.321 200.443 573.981 205.357C579.709 207.998 577.689 215.058 582.303 217.968C589.208 222.324 617.533 212.669 609.282 232.996C605.693 241.839 594.925 240.957 589.746 247.418C584.038 254.539 595.713 263.422 586.891 270.49C576.734 278.628 565.078 268.507 555.228 272.618C550.978 274.391 551.105 280.142 545.995 281.566C536.272 284.276 527.404 278.485 518.058 279.122C513.518 279.431 513.307 285.305 508.956 286.566C501.078 288.85 477.919 281.142 474.028 273.945C469.997 266.489 473 250.446 473 242M117 208L114.039 234L117 279C108.665 281.182 107.238 289.644 99.9961 293.427C91.7547 297.732 92.0709 287.552 85.9568 287.971C78.8469 288.457 63.4272 308.381 61.304 290.005C61.0467 287.777 61.3927 286.114 62 284C54.0309 281.987 39.2663 290.358 32.7423 283.411C23.076 273.119 49.2346 269.034 51.9329 263.867C54.8447 258.29 48.0456 251.866 51.8727 246.214C57.4674 237.951 66.6412 245.378 73.8912 244.393C79.4083 243.643 77.4153 235.264 84.0046 234.438C94.3082 233.146 102.946 244.638 113 246"/> <path style="stroke:#0d0d0c; fill:none;" d="M380.995 214.873C388.98 215.826 389.38 228.13 391.482 234C393.014 238.278 396.681 241.425 397.478 246C400.098 261.056 389.805 279.065 373.004 276.837C365.096 275.788 365.845 267.68 362.57 262.471C360.114 258.563 354.805 258.064 353.662 252.985C350.158 237.408 362.85 212.706 380.995 214.873"/> <path style="stroke:#0d0d0c; fill:none;" d="M506 232C518.944 225.83 530.275 206.178 543 222"/> <path style="stroke:#0d0d0c; fill:none;" d="M392 237L363 261"/> <path style="stroke:#0d0d0c; fill:none;" d="M76 245L84 253M223 253C226.415 292.114 271.841 293.458 292 267"/> <path style="stroke:#0d0d0c; fill:none;" d="M549 267L554 272"/> <path style="stroke:#0d0d0c; fill:none;" d="M512 274L515 278M473 276C464.645 320.845 444.428 360.077 403 383.138C391.799 389.373 379.722 390.602 368 395L382.742 425L393 452C401.223 450.042 409.669 451.722 418 450.826C428.858 449.66 437.686 443.143 448 440.759C453.283 439.538 458.597 441.202 464 439.316C480.571 433.53 494.372 419.68 510 411.756C518.421 407.486 527.88 403.294 537 400.785C539.727 400.035 544.873 399.018 546.382 402.318C549.861 409.929 537.173 426.479 533.745 433C517.036 464.779 494.82 495.066 462 511.244C451.18 516.577 439.698 515.54 429.005 519.603C423.799 521.582 423.692 526.143 427.309 529.772C436.391 538.883 457.524 535.93 469 535.089C535.048 530.247 552.913 461.4 583.746 416C592.766 402.718 602.773 391.143 616 381.861C619.683 379.277 627.715 374.862 626.208 369.188C625.113 365.07 618.511 363.589 615 362.64C602.873 359.365 590.434 360 578 360C567.25 360 557.625 353.306 547.005 357.728C539.089 361.023 544.333 369.673 538.686 374.258C526.938 383.794 503.008 362.381 497 354M117 279C122.968 287.759 123.983 298.959 129.696 308C146.346 334.349 165.875 346.752 192 362C187.159 377.276 179.797 391.571 175.025 407C171.796 417.445 171.413 428.66 168.072 439C165.425 447.191 155.057 453.545 155.782 462.941C156.437 471.423 172.062 462.292 175.972 466.693C180.034 471.265 174.445 480.639 179.589 485.382C185.476 490.812 190.096 479.112 195.015 478.443C199.65 477.813 202.092 483.643 206.039 485.091C215.785 488.667 216.098 474.409 219 469C230.437 477.198 233.215 489.69 239.37 502C246.179 515.618 254.693 528.838 265.09 540C280.022 556.032 306.668 575.169 330 573.62C337.612 573.115 342.452 564.459 350 564.505C356.858 564.546 363.246 572.955 371 574L366 548"/> <path style="stroke:#0d0d0c; fill:none;" d="M466 311C476.186 319.613 490.602 306.325 502.999 307.045C510.475 307.479 508.767 315.559 514.147 316.512C523.153 318.106 533.768 305.788 542.682 310.313C548.189 313.109 541.769 322.68 549.059 324.682C556.853 326.822 577.553 320.374 579.64 332.015C581.564 342.743 566.544 346.324 562 354"/> <path style="stroke:#0d0d0c; fill:none;" d="M513 317L506 324"/> <path style="stroke:#0d0d0c; fill:none;" d="M539 326L544 324"/> <path style="stroke:#0d0d0c; fill:none;" d="M453 339C462.148 348.341 469.818 362.967 482 368.583C489.007 371.814 498.211 371.763 500 363"/> <path style="stroke:#0d0d0c; fill:none;" d="M516 374C510.307 381.254 500.285 385.961 493 391.668C476.919 404.267 459.597 420.001 450 438"/> <path style="stroke:#0d0d0c; fill:none;" d="M363 395L368 395M335 396C334.759 408.055 337.133 419.948 336.981 432C336.876 440.372 334.401 448.581 334.746 457C335.005 463.316 340.734 475.03 336.972 480.682C332.472 487.444 321.06 477.861 315.09 479.634C310.689 480.941 308.446 487.09 303.044 485.928C298.254 484.898 299.222 478.336 294.853 477.407C290.597 476.503 278.968 483.01 276.643 477.681C273.886 471.364 280.793 463.083 281.699 457C284.425 438.706 284.548 420.324 288 402M233 399L232.334 426L219 469"/> <path style="stroke:#0d0d0c; fill:none;" d="M393 452L394 471"/> <path style="stroke:#0d0d0c; fill:none;" d="M276 502L305 513.388L325.892 517.742L333.258 531L349 562"/> <path style="stroke:#0d0d0c; fill:none;" d="M371 574C388.68 590.494 405.757 562.442 406.91 546C407.277 540.773 405.994 531.851 409.028 527.318C411.359 523.834 419.231 524.162 423 524"/> <path style="stroke:#0d0d0c; fill:none;" d="M382 542C385.448 551.637 389.77 560.704 397 568M325 544C326.665 552.637 333.617 561.221 339 568M312 550L320 571"/> </svg> `);

    const cuteAxolotl2 = parseSvg(`<?xml version="1.0" standalone="yes"?> <svg xmlns="http://www.w3.org/2000/svg" width="450" height="570" stroke-width="4px"> <path style="stroke:#150f11; fill:none;" d="M392 9C387.809 12.8751 384.65 14.6501 379 13C381.48 7.68628 385.688 4.33655 391 2L392 9L406 5C401.118 16.1148 390.707 19.1197 384.182 28.0301C382.857 29.8402 377.291 36.7548 381.361 38.4036C387.52 40.8987 400.049 28.604 392 23M379 13L371 16C371.822 10.6767 374.771 7.04346 380 10M100 15L107 20L109 15C113.514 17.1067 116.64 20.1553 118 25C103.16 25.1759 112.806 43.8915 113 53C106.443 49.0391 100.299 42.4747 107 36C102.471 29.6211 97.6335 23.0846 100 15M388 15L388 23M358 16C359.356 21.006 356.797 22.6362 352 23L358 16M360 20L370 17M107 20L110 24M129 34C123.143 32.0029 119.98 28.4744 124 23C128.77 28.2469 131.138 44.7231 140 39C144.527 44.528 143.646 50.0287 146.699 55.9915C150.212 62.8524 159.864 65.6442 156.469 76C153.252 85.8135 141.814 94.5485 136 103C132.952 99.6102 125.911 95.6668 124.086 91.8712C122.494 88.5579 125.638 85.5014 128.897 87.1219C132.666 88.9966 135.128 94.9237 138 98M352 23L341 31C337.199 27.5319 334.966 29.3709 334 34L340 31M118 25L120 27M334 34C325.969 43.4116 315.535 50.3344 307.438 60C304.71 63.2567 301.373 70.7514 296.896 71.6273C291.119 72.7575 283.01 65.6779 278 63.2585C266.87 57.8839 254.143 54.6095 242 52.4637C211.5 47.0743 185.198 61.2044 159 74M107 36L109 36M379 38C374.79 42.7181 375.078 45.076 380 49C375.204 53.6825 371.814 56.1836 365 56L374 44M138 43L144 51M111 53L104 58C111.439 67.5341 120.33 63.969 113 53M364 57L370 62C368.248 64.3284 355.626 75.945 353.342 69.6667C351.673 65.08 360.989 59.0645 364 57M151 62L154 68M118 65L120 71C115.829 71.359 114.361 69.8639 113 66M352 70C345.076 75.8486 337.39 82.7559 329.985 87.8302C326.459 90.2465 319.895 93.4812 318.932 98.0895C318.108 102.031 321.682 109.889 326.044 110.218C339.161 111.206 354.631 102.39 368 101.495C377.453 100.861 388.115 104.276 397 100L394 95L384 101M120 71L127 85M115 72C111.559 79.181 118.708 82.4293 124 86M350 73L357 79C351.251 84.1571 342.433 89.2581 335 85M330 89C334.35 95.8688 328.555 97.9457 323 94M134 95L132 97M423 100C418.553 108.65 405.525 104.783 398 101M414 104L422 101M136 103C133.154 112.008 127.907 121.416 117.015 116.852C113.268 115.282 108.879 109.662 104.333 110.929C101.125 111.823 103.427 115.894 105.229 116.968C107.96 118.594 110.54 117.304 113 116M407 133C405.787 118.866 437.391 126.393 429 108L439 108L435 112C449.334 119.524 442.293 119.548 431 125C433.675 132.984 423.514 132.87 418 133.015C412.268 133.165 407.4 136.899 401.996 136.883C391.486 136.853 385.858 131.049 376 139C381.549 143.739 389.13 146.249 396 143L392 135M422 107L429 108M115 116C119.039 112.629 121.302 111.953 125 116M433 113L435 112M88 114L104 118M89 116C92.9841 119.899 100.464 127.974 103 119M127 119C126.8 128.658 121.642 137.423 121.914 147C122.594 171.003 139.925 190.578 160.039 201.631C182.511 213.98 211.142 206.844 222 235C241.975 229.263 236.179 259.24 229 268M426 122L430 125M98 124C96.5494 131.224 101.897 135.889 109 134L102 124M394 133L406 129M140.189 132.032C148.789 127.22 152.065 143.262 144.891 146.953C136.463 151.289 133.178 135.956 140.189 132.032M247.044 132.028C257.942 126.216 266.473 141.667 255.956 147.907C245.373 154.186 236.577 137.61 247.044 132.028M117 141C106.754 144.759 107.4 132.151 117 141M396 220L373 216C374.403 221.898 379.436 227.67 384 221C390.947 226.259 407.227 235.787 396 220L401 218C395.794 208.282 384.345 200.24 377.917 190.791C375.204 186.804 377.355 179.837 373.702 177.09C370.502 174.683 366.574 175.989 363.09 174.706C357.43 172.621 351.343 166.939 346 163.796C339.344 159.882 322.455 153.483 327 144C331.112 147.375 332.931 147.408 336 143C343.398 150.014 353.24 156.044 353 142L366.667 146.357L376 139M355 142L368 140M117 141L121 141M337 143L352 141M327 144L335 143M115 143L113 148L121 149M224 165C219.05 185.579 176.058 188.586 170 168M356 169C358.911 168.17 359.464 168.368 361 171M322 179L316 177C326.378 174.947 322.426 188.496 328.259 192.11C333.775 195.526 330.331 186.044 326 184M316 178C309.389 184.769 302.622 193.304 301.305 203C300.306 210.354 303.751 217.445 306.579 224C314.389 242.098 328.479 257.147 338.525 274C366.753 321.351 385 377.392 385 433C385 450.616 386.669 475.393 375 490M365 178L373 183M74 215C62.169 239.968 57.1789 266.439 50.6906 293C43.5006 322.434 40.2599 350.6 47.8951 381C51.3175 394.627 56.2895 409.575 62.8897 422C67.3094 430.321 73.5067 437.135 77 446C52.4981 442.617 30.7456 411.746 19.6667 392C-10.5637 338.122 -0.230537 262.394 40.9252 217C52.9024 203.789 67.5604 188.776 86 185.325C93.2087 183.976 99.5457 183.683 103.427 191.004C106.644 197.069 105 206.328 105 213C105 224.477 106.752 235.64 108.282 247C115.09 297.535 130.709 345.579 132.961 397C133.647 412.667 133.378 428.416 135.424 444C135.995 448.346 134.811 455.921 137.938 459.397C143.941 466.066 167.26 461.714 175 460.414C202.886 455.726 230.022 447.596 254 432.136C262.707 426.522 273.763 420.328 277 410C265.728 406.435 253.948 406.88 243 401.68C225.259 393.253 212.012 375.31 199.184 360.985C192.219 353.208 188.206 343.094 186.2 333C185.61 330.034 183.673 324.333 186.603 322.029C190.724 318.788 198.898 323.612 203 325C204.998 318.239 203.624 310.948 205.235 304C207.212 295.477 212.287 286.675 212.881 278C213.259 272.489 210.635 267.412 210.188 262C209.306 251.314 214.96 242.361 222 235M142 190C140.727 193.121 141.443 196.806 139.833 199.741C136.639 205.558 130.965 209.584 132 217C135.517 215.521 147.215 202.378 149.248 209.109C150.64 213.715 144.714 215.028 142 213M333 191C335.598 192.654 338.439 193.897 340.998 195.609C343.311 197.155 350.764 205.707 342.959 205.387C337.341 205.157 335.392 197.347 335 193M136 203C130.366 199.33 135.28 193.683 140 192M385 196C389.446 197.264 391.734 199.445 390 204M349 201C353.741 204.195 362.076 207.381 365.111 212.326C366.534 214.644 366.519 220.585 362.852 220.883C356.559 221.393 349.709 209.03 346 205M156 202L151 209M141 203L143 206M150 205L152 205M155 205C158.28 208.433 159.81 208.597 163 205L163 205M394 212L396 218M367 213L373 216M393 215L392 219M275 275C261.911 271.605 237.257 259.756 241.333 242.005C245.022 225.935 271.508 237.639 279 243M50 297C55.9397 308.13 51.9637 328.335 53.1698 341C55.9031 369.703 61.6977 396.94 76.6042 422C82.3326 431.63 101.761 451.834 98 463L77 446M350 302C350.002 317.45 353.643 332.43 352.961 348C350.579 402.38 334.39 460.148 290 494.985C257.491 520.498 220.162 524.586 181 514.377C172.561 512.178 165.082 508.496 157 505.352C153.913 504.151 150.316 504.414 147.992 501.762C139.641 492.234 138 473.032 138 461M203 325L211 334M0 327L2 327M283 374C271.83 369.903 264.53 359.003 261.029 348C255.921 331.95 261.18 324.43 277 334.062C280.493 336.188 283.853 338.394 287 341M143 485C156.272 487.293 168.436 495.733 182 498.486C217.332 505.658 255.477 495.119 278.535 467C288.03 455.421 293.947 441.388 297.714 427C299.307 420.913 298.454 409.405 301.912 404.418C304.543 400.625 312.074 398.718 315.999 396.351C322.561 392.395 326.858 386.359 333 382M278 409L300 406M100 462C112.422 474.524 122.799 488.869 135.08 501.41C138.806 505.214 149.092 516.642 150 505M378 490L375 497L376 495M375 497L347 536L349 533M370 503L372 501M149 511C163.749 531.131 181.833 549.318 205 559.688C249.379 579.551 310.819 569.441 346 536M340 542L337 545M323 553L320 555"/> </svg>`);

    const cuteCat = parseSvg(`<?xml version="1.0" encoding="UTF-8" standalone="no"?> <svg width="220.60725" height="233.18806" version="1.1" id="svg6" sodipodi:docname="cute_cat.svg" inkscape:version="1.3.2 (091e20ef0f, 2023-11-25, custom)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"> <defs id="defs6" /> <sodipodi:namedview id="namedview6" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" inkscape:zoom="4.2830882" inkscape:cx="111.95193" inkscape:cy="111.48498" inkscape:window-width="2560" inkscape:window-height="1371" inkscape:window-x="0" inkscape:window-y="0" inkscape:window-maximized="1" inkscape:current-layer="svg6" /> <path style="fill:none;stroke:#0e0e0e" d="m 18.513881,171.58535 c -5.2119,3.752 -15.4654998,2.761 -17.56639979,10.043 -4.59532001,15.929 27.42789979,35.634 38.56639979,24.957 -17.8867,-14.688 -21.0014,-34.23 -21,-56 0.0024,-37.041 10.3506,-72.590004 25.6914,-106.000004 5.7048,-12.4242 14.3,-35.9303999 26.493,-43.2916999 8.5723,-5.1753 18.7666,16.1812999 25.1006,19.0941999 3.114,1.4317 8.327999,0.1988 11.714999,0.1975 9.762,-0.0038 19.299,-0.2523 29,-0.0147 4.46,0.1093 10.106,0.9055 13.674,-2.3032 3.869,-3.4783 10.301,-20.1732999 17.114,-15.8811999 3.716,2.3411 5.82,8.5071999 7.932,12.1990999 5.511,9.6339 11.729,18.7554 16.13,29 16.989,39.554 32.144,79.237004 28.075,123.000004 -2.033,21.871 -15.866,52.645 -41.925,54 1.313,-8.728 7.634,-15.031 10.907,-23 6.248,-15.209 6.886,-36.32 -1.432,-51 -23.864,-42.111 -110.579099,-43.484 -130.809099,2 -11.2566,25.309 -1.5799,52.215 15.1728,72.698 2.6208,3.204 18.2203,9.14 20.7053,3.98 1.763,-3.66 -1.343,-9.75 -1.544,-13.678" id="path1" /> <path style="fill:none;stroke:#0e0e0e" d="m 75.513881,77.585346 c 6.0921,-4.1825 12.178,-5.283 19,-2 m 52.999999,1 c 6.642,-4.3837 12.087,-2.8418 18,2" id="path2" /> <path style="fill:none;stroke:#0e0e0e" d="m 122.51388,79.585346 c 0.028,8.006 7.707,15.833 13,6 m -81.999999,-3 12,1 m 108.999999,1 13,-1" id="path3" /> <path style="fill:none;stroke:#0e0e0e" d="m 109.51388,87.585346 c 4.99,4.216 8.01,4.216 13,0" id="path4" /> <path style="fill:none;stroke:#0e0e0e" d="m 53.513881,90.585346 11,-1 m 111.999999,1 9,2" id="path5" /> <path style="fill:none;stroke:#0e0e0e" d="m 157.51388,206.58535 -5,21 c 9.699,0 16.846,-1.377 25,-7 m -137.999999,-13 c 7.1372,10.131 18.3689,12.743 30,15 m 60.999999,-13 c 3.021,11.297 8.102,30.85 22,18 m -34,-16 c -0.757,16.572 -10.143,29.086 -24.999999,15 m 22.999999,4 h 19" id="path6" /> </svg>`);

    const cuteFish = parseSvg(`<?xml version="1.0" standalone="no"?> <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 20010904//EN" "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd"> <svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="793.000000pt" height="724.000000pt" viewBox="0 0 793.000000 724.000000" preserveAspectRatio="xMidYMid meet"> <metadata> Created by potrace 1.16, written by Peter Selinger 2001-2019 </metadata> <g transform="translate(0.000000,724.000000) scale(0.100000,-0.100000)" fill="#000000" stroke="none"> <path d="M3570 7199 c-87 -8 -178 -26 -255 -50 -153 -47 -176 -56 -300 -109 -310 -134 -575 -307 -776 -509 -97 -97 -249 -286 -249 -310 0 -5 -4 -11 -8 -13 -12 -4 -95 -164 -117 -223 -10 -27 -21 -54 -25 -60 -4 -5 -15 -39 -24 -75 -10 -36 -22 -76 -27 -90 -18 -53 -32 -161 -38 -298 l-6 -143 -110 -38 c-466 -161 -813 -416 -1055 -774 -122 -181 -220 -415 -263 -627 -30 -150 -37 -197 -43 -318 l-7 -123 -76 -77 c-51 -51 -86 -97 -105 -137 -15 -33 -36 -76 -46 -96 -14 -27 -18 -51 -14 -105 2 -38 6 -109 8 -159 4 -98 13 -143 53 -250 129 -352 462 -747 872 -1035 188 -132 174 -118 187 -190 60 -350 351 -664 673 -726 95 -18 129 -18 214 0 154 32 250 140 259 291 4 50 16 53 153 31 160 -25 309 -36 472 -36 l152 0 42 -73 c78 -134 183 -271 294 -383 132 -133 230 -208 350 -267 83 -41 119 -55 216 -86 19 -6 85 -11 146 -11 100 0 116 3 161 26 169 87 211 270 126 543 -9 28 -14 92 -14 172 0 145 -18 240 -56 300 -28 44 -111 129 -128 129 -12 1 -61 39 -55 43 2 2 29 18 59 37 139 83 319 244 416 371 26 35 51 66 54 69 9 8 120 178 120 185 0 3 11 23 25 45 27 43 55 53 55 20 0 -10 6 -34 14 -52 8 -18 33 -82 56 -143 56 -147 168 -376 248 -505 285 -463 640 -778 1087 -966 44 -19 87 -34 95 -34 9 0 20 -4 25 -9 6 -4 51 -18 100 -30 50 -12 99 -24 110 -27 11 -3 79 -12 150 -19 349 -38 667 63 799 253 52 75 67 135 67 271 1 120 -6 176 -37 331 -24 116 -77 305 -109 390 -8 19 -23 62 -35 95 -68 189 -227 520 -337 697 -205 333 -439 582 -624 665 -48 21 -42 39 29 82 48 29 195 134 212 151 3 3 28 23 55 45 28 22 103 91 169 155 285 277 497 575 636 895 12 28 27 64 35 80 7 17 25 68 40 115 15 47 36 112 48 145 11 33 22 80 24 105 2 25 11 77 19 115 22 109 19 415 -6 535 -22 107 -34 153 -51 190 -7 14 -19 41 -28 60 -56 123 -163 206 -299 236 -78 17 -87 17 -185 0 -97 -16 -171 -37 -209 -57 -10 -5 -23 -9 -29 -9 -33 0 -271 -128 -504 -271 -16 -10 -39 -23 -50 -29 -11 -6 -33 -19 -50 -30 -16 -11 -41 -26 -55 -34 -21 -12 -124 -78 -184 -118 -77 -52 -278 -201 -356 -265 -131 -107 -367 -346 -473 -478 -89 -112 -232 -319 -282 -410 -15 -27 -44 -79 -63 -114 -41 -74 -38 -75 -99 44 -59 117 -194 313 -292 424 -35 40 -32 51 13 51 59 0 157 37 222 84 95 69 148 183 164 358 18 184 -2 306 -74 449 -64 127 -166 242 -436 490 -69 62 -113 112 -128 142 -23 46 -23 50 -12 177 15 183 -7 421 -49 525 -88 219 -243 349 -439 370 -115 12 -139 12 -232 4z m272 -50 c9 -5 24 -9 33 -9 26 0 138 -59 176 -93 73 -65 117 -134 158 -252 24 -70 19 -83 -37 -90 -49 -7 -155 -30 -207 -45 -149 -45 -218 -73 -355 -140 -320 -157 -666 -468 -892 -801 -35 -52 -67 -101 -71 -109 -4 -8 -21 -37 -38 -65 -17 -27 -35 -62 -41 -76 -6 -15 -19 -31 -28 -37 -20 -12 -309 -20 -328 -9 -22 14 5 207 51 372 21 74 84 229 129 315 159 303 435 588 759 786 93 56 337 185 375 197 10 3 35 13 54 21 115 47 146 54 195 49 27 -3 58 -10 67 -14z m-307 -5 c-11 -9 -40 -25 -65 -35 -219 -95 -488 -265 -655 -414 -175 -156 -289 -289 -393 -460 -97 -158 -144 -262 -193 -425 -11 -36 -24 -79 -30 -96 -10 -34 -26 -142 -36 -242 -3 -34 -10 -65 -15 -68 -5 -4 -37 -10 -71 -15 -34 -5 -96 -16 -137 -25 -41 -9 -93 -17 -115 -18 -37 -1 -40 1 -44 29 -10 89 44 411 89 520 112 275 208 423 400 615 108 108 192 175 344 275 104 68 355 196 476 243 47 19 94 37 105 42 36 14 108 37 170 53 106 27 139 34 165 35 25 1 25 1 5 -14z m709 -491 c11 -28 18 -277 9 -338 -9 -67 1 -61 -138 -91 -328 -71 -668 -265 -934 -533 -39 -40 -178 -204 -229 -270 -18 -24 -19 -24 -108 -13 -50 7 -125 12 -167 12 -68 0 -77 2 -77 18 0 24 132 239 215 348 164 219 384 435 550 543 22 14 42 28 45 32 11 12 129 79 215 122 179 90 310 135 510 177 33 7 65 13 70 15 16 4 33 -6 39 -22z m-4 -462 c5 -11 10 -28 10 -38 0 -43 46 -101 175 -222 40 -38 63 -66 57 -70 -6 -4 -40 -13 -74 -20 -228 -47 -480 -167 -693 -330 -33 -25 -104 -88 -158 -140 l-98 -95 -42 12 c-37 11 -234 61 -367 92 -25 6 -48 15 -53 19 -11 11 74 119 184 235 188 199 428 367 659 463 105 43 160 61 300 97 77 19 88 19 100 -3z m3185 -352 c14 -14 14 -18 -2 -50 -42 -87 -117 -183 -223 -289 -127 -128 -130 -130 -262 -228 -123 -90 -245 -169 -528 -342 -209 -128 -331 -205 -410 -259 -14 -10 -63 -44 -109 -76 -47 -32 -89 -61 -95 -66 -6 -5 -60 -48 -121 -95 -96 -75 -347 -316 -412 -396 -84 -103 -223 -313 -223 -336 0 -7 -4 -12 -9 -12 -18 0 -28 22 -98 231 -14 43 -14 48 4 85 69 140 226 394 310 499 5 6 24 30 43 55 111 146 337 375 505 511 229 186 619 439 995 646 62 34 234 102 305 122 71 19 78 20 197 18 91 -2 121 -5 133 -18z m-2783 -111 c49 -50 111 -125 138 -166 55 -84 54 -97 -9 -107 -164 -27 -354 -77 -531 -140 -75 -27 -241 -112 -313 -160 -38 -25 -72 -45 -75 -45 -4 0 -34 13 -67 29 -86 42 -154 72 -204 90 -78 29 -77 43 13 127 250 234 541 392 826 448 127 25 123 27 222 -76z m2908 35 c70 -71 126 -180 144 -282 22 -124 -240 -408 -584 -633 -155 -101 -451 -278 -465 -278 -2 0 -34 -18 -70 -40 -36 -22 -67 -40 -70 -40 -3 0 -34 -18 -70 -40 -36 -22 -67 -40 -70 -40 -3 0 -34 -18 -70 -40 -36 -22 -67 -40 -70 -40 -8 0 -334 -199 -415 -253 -106 -71 -294 -210 -370 -275 -93 -79 -253 -246 -308 -320 -25 -34 -50 -58 -54 -54 -11 11 -38 139 -37 177 0 17 11 48 24 70 14 22 29 49 34 60 5 11 29 49 53 85 202 304 493 575 903 841 86 56 131 85 240 152 11 7 46 29 78 50 32 20 60 37 62 37 2 0 30 17 62 38 32 22 77 50 100 63 67 39 194 120 258 166 33 23 75 52 93 65 32 22 67 50 162 126 75 61 182 173 248 259 34 45 62 84 62 87 0 14 63 106 72 106 6 0 32 -21 58 -47z m-2660 -444 c14 -51 20 -108 20 -185 0 -140 0 -139 -135 -148 -87 -6 -144 -16 -340 -56 -58 -12 -146 -36 -178 -49 -16 -6 -32 -11 -36 -11 -5 0 -51 30 -103 68 -108 77 -118 83 -175 113 -53 28 -47 43 34 92 58 35 204 109 240 120 10 4 36 13 58 22 123 49 408 122 535 138 38 5 59 -23 80 -104z m-2116 56 c88 -8 184 -19 211 -25 28 -5 67 -12 87 -15 83 -13 181 -158 136 -203 -24 -24 -54 -11 -118 51 -50 48 -84 71 -145 97 -77 33 -85 34 -210 34 -103 1 -141 -3 -180 -17 -73 -27 -115 -47 -159 -74 -24 -15 -47 -23 -60 -19 -170 44 -196 47 -398 53 -115 3 -208 9 -208 14 0 5 9 9 20 9 11 0 37 6 57 14 35 12 74 21 218 48 103 20 364 45 474 47 62 0 186 -6 275 -14z m4956 -108 c17 -109 2 -347 -30 -491 -12 -51 -54 -148 -74 -170 -6 -6 -23 -27 -37 -46 -89 -118 -270 -272 -449 -382 -153 -94 -417 -228 -625 -318 -27 -12 -63 -28 -78 -36 -16 -8 -33 -14 -38 -14 -4 0 -32 -11 -61 -24 -29 -14 -120 -52 -203 -86 -170 -69 -169 -69 -247 -104 -31 -14 -60 -26 -63 -26 -3 0 -30 -11 -58 -24 -29 -13 -77 -34 -107 -47 -123 -53 -372 -184 -481 -254 -37 -24 -71 -40 -77 -36 -6 3 -14 34 -18 69 -6 60 -5 64 28 115 79 117 269 317 398 417 25 19 47 37 50 41 34 41 426 300 635 419 17 9 77 44 135 77 58 33 132 75 165 93 123 68 151 84 187 107 21 12 40 23 42 23 4 0 198 113 256 150 335 209 576 411 680 572 24 37 47 65 51 63 4 -3 12 -42 19 -88z m-4464 24 c16 -5 56 -17 89 -26 33 -9 78 -23 100 -30 40 -13 48 -16 135 -51 105 -42 293 -136 316 -159 20 -20 24 -34 24 -82 0 -77 -7 -85 -59 -77 -37 6 -47 13 -81 64 -97 142 -245 223 -418 226 -51 1 -99 7 -106 13 -8 6 -16 25 -20 42 -3 17 -15 44 -27 60 -20 28 -20 29 -1 29 10 0 32 -4 48 -9z m-384 -29 c112 -37 214 -116 256 -199 29 -55 52 -140 52 -187 0 -47 -16 -113 -30 -121 -5 -3 -49 26 -97 65 -103 84 -182 137 -313 212 -83 47 -132 70 -292 136 -20 9 -35 20 -31 25 8 13 128 67 150 67 10 0 25 5 33 10 27 17 211 12 272 -8z m-742 -56 c160 -26 253 -53 410 -119 306 -129 612 -364 808 -623 63 -83 132 -183 132 -190 0 -3 11 -22 24 -43 29 -45 95 -176 126 -246 11 -27 25 -59 30 -70 49 -115 108 -338 135 -511 20 -137 21 -491 0 -623 -17 -105 -42 -232 -54 -271 -5 -14 -16 -52 -26 -85 -65 -223 -183 -466 -348 -715 -69 -105 -85 -120 -123 -120 -60 0 -133 -23 -169 -53 -53 -43 -80 -93 -94 -172 -11 -59 -10 -84 3 -160 8 -49 24 -114 35 -144 11 -30 18 -57 15 -60 -3 -3 -101 -5 -217 -4 -334 3 -566 42 -927 154 -127 40 -170 56 -285 105 -89 38 -275 129 -350 172 -81 46 -276 170 -285 182 -3 4 -12 11 -21 16 -33 19 -189 145 -289 235 -116 104 -294 312 -385 449 -100 152 -178 337 -215 510 -13 62 -9 225 8 285 28 101 97 202 191 279 32 26 35 33 38 89 18 349 79 600 211 857 32 62 128 212 163 255 153 185 261 284 451 411 211 140 344 188 638 224 83 11 260 4 370 -14z m1347 -102 c142 -46 243 -130 305 -253 31 -62 33 -72 33 -176 0 -86 -4 -121 -19 -160 -32 -81 -97 -183 -158 -249 l-58 -61 -22 27 c-13 14 -49 66 -80 115 -68 105 -146 204 -230 291 l-62 64 12 44 c17 64 15 217 -3 261 -24 56 -20 70 28 92 54 25 186 28 254 5z m577 -173 c179 -121 515 -447 516 -501 0 -25 -51 -97 -77 -109 -20 -9 -23 -8 -28 17 -28 133 -74 220 -165 313 -69 70 -214 169 -246 169 -27 0 -105 40 -98 51 3 6 6 29 6 52 -1 39 4 57 14 57 3 0 38 -22 78 -49z m814 -4 c5 -38 -54 -151 -99 -192 -22 -19 -58 -44 -81 -55 -42 -19 -170 -50 -209 -50 -12 0 -63 42 -126 102 l-105 103 34 14 c88 36 359 89 528 105 51 4 55 2 58 -27z m-880 -126 c222 -71 372 -220 428 -426 32 -116 -2 -249 -86 -334 -40 -40 -60 -45 -60 -15 0 39 -76 170 -130 224 -74 74 -202 130 -295 130 -30 0 -56 3 -58 8 -3 4 6 29 19 55 13 27 30 73 39 102 17 60 20 190 5 230 -6 15 -8 31 -4 36 9 15 78 10 142 -10z m3632 -281 c0 -6 -4 -18 -9 -28 -5 -9 -17 -37 -26 -62 -10 -25 -21 -54 -25 -65 -21 -53 -108 -227 -140 -280 -20 -33 -39 -65 -41 -70 -2 -6 -30 -48 -61 -95 -75 -112 -180 -243 -288 -361 -81 -87 -98 -101 -197 -151 -95 -48 -266 -114 -388 -148 -118 -33 -291 -73 -415 -95 -47 -9 -107 -20 -135 -25 -47 -8 -174 -26 -360 -50 -44 -6 -132 -15 -195 -21 -63 -5 -145 -12 -182 -16 l-68 -6 0 50 0 50 78 50 c134 86 192 119 363 202 92 45 169 81 172 81 3 0 36 14 74 31 78 35 95 42 143 62 19 8 159 67 312 131 405 169 452 191 753 344 167 86 401 256 525 383 94 96 110 109 110 89z m-2905 -298 c-3 -3 -14 -1 -23 6 -18 12 -85 45 -115 55 -24 9 -31 33 -15 52 51 62 44 64 104 -25 31 -45 53 -84 49 -88z m-824 114 c126 -26 218 -88 283 -191 55 -86 71 -140 70 -240 -1 -78 -5 -99 -32 -158 -53 -116 -183 -224 -330 -273 -23 -8 -47 -12 -52 -9 -5 3 -12 22 -15 43 -27 171 -112 427 -202 605 l-23 47 58 63 c31 34 65 72 73 85 10 14 33 26 60 31 24 5 44 9 44 10 0 1 30 -5 66 -13z m755 -126 c154 -89 216 -263 144 -406 -64 -124 -84 -132 -128 -45 -54 109 -151 193 -278 241 l-26 10 27 35 c32 43 75 138 75 168 0 27 10 42 30 49 22 7 95 -17 156 -52z m-253 -259 c124 -40 211 -132 269 -283 16 -42 20 -77 21 -168 0 -105 -2 -121 -28 -184 -22 -53 -45 -86 -94 -136 -57 -58 -135 -111 -145 -99 -1 2 -11 38 -21 79 -21 89 -40 129 -94 198 -41 51 -172 152 -198 152 -26 0 -12 26 46 83 35 34 71 84 89 120 28 56 36 89 46 194 4 36 21 63 41 63 6 0 37 -8 68 -19z m521 -118 c49 -140 73 -227 82 -303 4 -37 3 -42 -7 -26 -30 49 -144 166 -161 166 -4 0 -17 9 -28 20 -20 20 -20 21 -2 48 27 39 49 91 56 135 11 58 30 45 60 -40z m-111 -197 c138 -90 207 -215 207 -375 -1 -77 -4 -92 -33 -147 -18 -34 -43 -75 -57 -90 -39 -45 -120 -107 -176 -137 l-52 -27 -38 38 c-62 60 -157 122 -189 122 -33 0 -15 26 45 64 66 43 132 116 164 182 50 101 69 242 45 327 -9 33 -8 42 7 58 9 10 19 19 21 19 2 0 27 -15 56 -34z m-709 -162 c253 -127 339 -379 215 -631 -79 -160 -237 -265 -393 -262 -90 2 -101 8 -100 60 1 24 6 76 12 114 29 190 35 326 22 469 -15 168 -13 200 15 204 20 3 59 19 130 53 22 10 42 19 44 19 1 0 26 -12 55 -26z m2665 -170 c-7 -9 -47 -42 -89 -72 -41 -30 -77 -58 -80 -61 -3 -4 -45 -33 -95 -65 -125 -81 -137 -90 -139 -99 0 -4 34 -23 77 -41 186 -82 390 -282 578 -571 92 -141 119 -186 119 -200 0 -21 -4 -20 -95 24 -185 91 -456 207 -680 292 -71 27 -139 53 -150 58 -11 5 -42 16 -70 26 -27 9 -59 21 -70 25 -71 32 -650 221 -840 275 -110 32 -139 46 -143 71 -5 39 12 46 134 54 161 12 517 52 609 70 28 5 95 16 150 25 55 9 116 21 135 25 19 5 71 16 115 26 44 9 100 22 125 29 25 7 56 16 70 19 42 9 121 33 200 62 41 15 91 33 110 40 41 14 48 11 29 -12z m-1722 -338 c-9 -191 -30 -262 -56 -183 -6 17 -31 56 -55 86 l-45 54 49 53 c26 29 58 74 70 99 35 73 44 49 37 -109z m-510 -17 c63 -36 136 -115 164 -178 29 -63 31 -204 4 -276 -49 -134 -178 -246 -305 -266 -58 -9 -70 2 -70 63 0 88 -30 180 -99 301 -11 21 -21 40 -21 43 0 2 15 19 33 37 73 74 133 173 151 252 4 17 14 40 22 52 16 26 33 22 121 -28z m377 -115 c30 -38 49 -77 61 -121 17 -61 17 -67 0 -129 -13 -48 -29 -77 -61 -112 -46 -53 -137 -106 -197 -117 -42 -8 -42 -7 -1 71 28 52 54 152 54 206 0 44 -26 145 -43 166 -7 9 -6 17 4 27 21 21 101 63 121 64 10 1 37 -24 62 -55z m280 36 c11 -5 55 -19 96 -31 113 -32 233 -69 255 -79 11 -4 85 -29 165 -54 80 -26 154 -51 165 -55 11 -5 40 -16 65 -24 113 -38 448 -163 525 -197 11 -4 72 -29 135 -55 63 -26 129 -53 145 -60 149 -65 306 -139 384 -179 60 -32 66 -38 105 -112 23 -44 52 -104 65 -134 13 -30 31 -73 41 -95 44 -100 120 -303 120 -322 0 -11 -29 2 -78 37 -31 22 -65 46 -76 53 -10 6 -36 24 -57 40 -45 32 -428 267 -435 267 -2 0 -21 11 -42 23 -20 13 -66 40 -102 59 -36 19 -81 44 -100 55 -19 11 -64 36 -100 55 -36 19 -85 47 -110 60 -47 26 -192 103 -370 196 -131 68 -544 275 -752 376 -86 42 -160 81 -163 86 -3 5 -3 32 1 61 l7 51 45 -7 c24 -4 54 -10 66 -15z m-13 -191 c507 -248 1007 -503 1214 -619 17 -9 59 -33 95 -52 88 -48 159 -88 195 -110 17 -10 37 -21 45 -25 8 -4 43 -24 78 -45 34 -21 64 -38 67 -38 13 0 347 -214 515 -331 63 -44 107 -87 113 -113 3 -11 13 -48 22 -81 26 -96 51 -222 47 -234 -2 -6 -11 -11 -19 -11 -43 0 -302 73 -380 106 -17 8 -36 14 -42 14 -6 0 -19 4 -29 9 -9 5 -53 24 -97 42 -95 38 -395 183 -445 214 -19 12 -66 39 -104 60 -105 58 -437 265 -456 285 -3 3 -18 14 -35 24 -85 54 -442 327 -511 391 -6 5 -60 54 -121 108 -110 98 -244 238 -277 290 -15 22 -17 38 -11 85 4 31 9 60 12 65 9 15 43 6 124 -34z m-988 -101 c23 -31 43 -71 78 -158 9 -22 14 -72 14 -136 0 -91 -3 -106 -30 -159 -56 -112 -170 -199 -317 -240 -100 -28 -373 -21 -385 11 -2 7 19 59 47 116 50 99 70 145 112 253 30 79 68 199 82 257 l6 27 108 -1 c85 0 119 4 166 21 33 11 64 25 70 31 16 16 23 12 49 -22z m1055 -280 c117 -109 310 -272 427 -359 55 -40 102 -77 105 -80 12 -15 437 -302 489 -330 20 -10 45 -25 56 -32 46 -29 116 -69 245 -140 122 -67 393 -197 411 -197 5 0 17 -4 27 -10 9 -5 33 -15 52 -23 19 -8 49 -20 65 -27 42 -17 114 -41 150 -51 17 -4 62 -16 100 -27 39 -11 98 -25 133 -32 37 -8 66 -19 71 -29 30 -58 19 -281 -18 -344 -18 -32 -2 -32 -191 -2 -190 30 -196 31 -335 70 -73 21 -237 74 -260 84 -11 5 -67 28 -125 52 -209 85 -442 218 -667 381 -67 49 -128 94 -135 101 -7 6 -52 45 -98 86 -316 277 -568 617 -712 963 -30 73 -39 105 -33 125 14 58 23 55 94 -25 37 -42 105 -112 149 -154z m-313 112 c6 -9 -62 -181 -103 -265 -25 -49 -30 -38 -35 70 -1 44 -6 87 -10 96 -6 12 4 22 40 41 26 15 57 36 68 47 23 23 31 25 40 11z m86 -117 c34 -73 113 -223 154 -291 60 -99 173 -252 269 -362 126 -144 388 -381 531 -480 28 -19 52 -37 55 -40 8 -9 174 -116 190 -123 8 -4 38 -21 65 -38 54 -33 323 -164 395 -194 25 -10 59 -24 77 -31 17 -8 36 -14 42 -14 6 0 19 -4 29 -9 33 -16 92 -35 207 -66 147 -40 217 -54 390 -80 50 -7 91 -13 93 -14 1 -1 -5 -12 -14 -26 -36 -55 -175 -137 -284 -167 -127 -36 -170 -41 -320 -41 -179 1 -270 16 -495 83 -128 38 -312 130 -470 236 -129 86 -159 110 -279 224 -290 276 -518 628 -676 1045 -23 61 -48 126 -56 145 -40 105 -40 110 7 224 24 58 45 106 46 106 2 0 22 -39 44 -87z m-265 -18 c28 -68 7 -193 -49 -288 -47 -80 -162 -167 -220 -167 -35 0 -37 7 -14 53 15 29 22 67 25 123 3 71 1 88 -22 136 -14 30 -26 57 -26 60 0 3 19 13 43 23 23 11 62 33 87 51 46 32 69 40 128 43 29 1 35 -3 48 -34z m-332 -132 c14 -21 31 -59 38 -86 23 -88 -28 -218 -117 -295 -85 -76 -189 -108 -340 -105 -113 1 -183 17 -195 44 -17 35 -37 110 -31 113 4 3 49 12 101 21 212 36 378 161 433 328 5 12 17 17 47 17 35 0 43 -4 64 -37z m-821 -304 c40 -5 83 -14 97 -20 56 -21 82 -138 47 -211 -23 -48 -71 -98 -94 -98 -17 0 -94 20 -189 50 -17 6 -42 10 -56 10 -34 0 -58 9 -58 22 0 12 150 239 165 250 12 10 4 10 88 -3z m1001 -57 c-46 -61 -228 -242 -243 -242 -9 0 -11 6 -6 18 4 9 9 49 12 87 7 110 22 127 128 140 28 4 68 17 90 29 49 28 56 17 19 -32z m-274 -153 c-17 -68 -24 -85 -52 -131 -18 -28 -49 -60 -81 -80 -93 -60 -102 -63 -149 -48 -74 22 -132 42 -148 49 -8 4 -50 18 -92 31 -43 13 -80 31 -83 38 -3 8 6 27 19 43 13 16 32 47 42 69 l18 41 46 -8 c25 -4 110 -8 190 -8 l145 1 70 34 c79 39 91 34 75 -31z m-905 -100 c127 -33 233 -65 360 -111 44 -16 140 -49 213 -73 73 -25 157 -60 185 -78 95 -61 151 -144 151 -226 l1 -46 -60 3 c-221 11 -568 148 -791 313 -60 44 -74 48 -74 19 0 -11 12 -26 29 -35 16 -8 35 -20 43 -28 40 -39 245 -152 358 -197 30 -12 64 -26 75 -30 64 -26 224 -64 334 -80 96 -14 105 -21 97 -82 -7 -54 6 -148 31 -221 11 -31 14 -50 7 -57 -18 -18 -304 49 -381 89 -10 5 -47 24 -83 41 -91 46 -95 48 -191 113 -99 65 -268 222 -337 311 -67 88 -75 96 -89 96 -26 0 -12 -30 48 -104 193 -241 463 -436 724 -523 115 -38 222 -63 274 -63 39 0 41 -1 52 -42 13 -50 5 -143 -16 -174 -31 -48 -243 -44 -384 6 -264 93 -535 355 -740 715 -51 89 -79 114 -73 65 3 -30 123 -224 206 -335 79 -106 222 -252 321 -329 44 -35 87 -66 95 -69 8 -4 31 -17 50 -28 53 -32 177 -76 254 -90 41 -7 105 -9 157 -6 85 5 89 5 79 -13 -16 -31 -73 -69 -126 -85 -184 -56 -462 51 -728 279 -72 62 -217 229 -279 323 -65 98 -121 208 -147 289 -12 38 -26 79 -31 92 -5 13 -9 70 -9 127 0 79 4 114 19 147 20 47 69 95 104 103 12 2 31 6 42 9 29 7 182 -3 230 -15z m-2196 -124 c22 -13 71 -40 110 -60 68 -35 111 -74 111 -101 0 -7 23 -58 50 -113 79 -156 181 -283 298 -372 52 -39 61 -50 47 -55 -21 -8 -110 18 -185 54 -138 66 -291 209 -362 337 -48 87 -65 125 -82 180 -10 33 -23 70 -27 83 -10 25 -12 72 -4 72 3 0 23 -11 44 -25z m324 -164 c23 -11 77 -34 119 -51 65 -27 82 -39 116 -83 45 -60 129 -148 187 -196 48 -40 140 -101 153 -101 5 0 17 -10 28 -21 19 -21 19 -22 -5 -38 -42 -28 -114 -51 -160 -51 -110 0 -336 217 -449 432 -43 81 -58 128 -42 128 6 0 29 -9 53 -19z m315 -120 c9 -5 44 -17 77 -26 33 -10 71 -22 85 -26 14 -5 48 -14 75 -19 102 -22 122 -27 133 -34 25 -15 8 -152 -23 -186 -17 -18 -18 -18 -56 6 -21 13 -41 24 -44 24 -31 0 -285 231 -285 259 0 13 14 14 38 2z"/> <path d="M710 4080 c-82 -15 -161 -80 -220 -179 -49 -82 -67 -134 -86 -236 -18 -103 -18 -172 1 -263 36 -174 117 -259 236 -250 46 3 66 11 101 38 135 104 211 295 212 535 2 257 -87 385 -244 355z m138 -146 c91 -63 49 -264 -50 -239 -43 11 -63 53 -63 128 0 65 2 70 33 98 37 33 49 35 80 13z"/> <path d="M2181 3871 c-44 -12 -76 -29 -130 -69 -115 -85 -183 -214 -212 -399 -16 -106 7 -246 57 -351 83 -172 253 -275 401 -243 93 21 143 49 214 120 114 114 163 245 163 436 -1 105 -4 130 -28 200 -68 194 -196 304 -360 311 -39 2 -86 -1 -105 -5z m315 -186 c62 -40 80 -119 43 -185 -28 -49 -66 -70 -127 -70 -43 0 -56 5 -85 33 -42 40 -60 95 -45 140 13 39 63 94 92 101 36 8 96 -1 122 -19z"/> <path d="M901 3120 c-19 -11 -8 -93 16 -124 46 -60 135 -74 203 -31 48 30 52 31 76 4 26 -29 98 -59 142 -59 80 1 162 65 162 127 0 37 -18 35 -39 -4 -24 -49 -48 -69 -90 -77 -76 -14 -147 20 -188 89 -11 19 -13 18 -46 -16 -80 -84 -207 -52 -207 52 0 41 -8 52 -29 39z"/> </g> </svg>`);

    const cuteCrab = parseSvg(`<?xml version="1.0" standalone="yes"?> <svg xmlns="http://www.w3.org/2000/svg" width="962" height="494" stroke-width="4px"> <path style="stroke:#131111; fill:none;" d="M379 93C358.171 94.6439 340.106 97.5907 324.3 79.9606C300.632 53.561 314.441 7.05203 351 2.28937C372.655 -0.531677 393.281 10.5499 401.547 31C406.898 44.2377 406.247 59.9645 398.084 72C389.788 84.2314 378.097 87.1267 380.289 104C382.702 122.568 388.37 143.594 399.428 159C403.877 165.198 420.697 177.166 419.573 184.985C417.902 196.615 402.832 185.039 399 181.711C382.824 167.663 375.041 149.913 363 133C345.17 145.953 323.162 153.103 304 163.861C279.076 177.854 255.796 195.604 229 206M575 124C576.068 125.953 578.498 118.583 579 117C581.207 110.04 583.319 101.227 581.278 94C579.04 86.076 570.425 81.8458 565.389 75.9722C555.67 64.6382 553.705 48.1253 557.694 34C567.429 -0.470337 616.067 -7.57947 638.917 18C655.188 36.2155 651.093 67.3297 633 82.7778C626.316 88.4845 613.717 89.7904 608.5 96.25C606.28 98.9992 606.413 103.682 605.583 107C603.731 114.408 598.09 124.426 598.333 131.972C598.52 137.757 616.29 144.769 621 147.222C642.593 158.469 665.618 167.887 686 181.333C690.992 184.626 703.486 195.822 710 193.194C714.648 191.32 715.315 185.185 716.361 181C719.014 170.388 721.284 158.879 728 150C736.196 155.034 749.919 169.114 759 163L738 141C747.267 130.661 764.453 128.56 777 123.808C793.431 117.585 811.35 111.298 829 110.09C872.842 107.087 907.809 136.765 935 167M595 44.5725C605.664 41.509 619.73 51.028 617.566 63C616.192 70.5991 607.81 75.3326 601 77.2145C581.099 82.7144 578.213 49.3947 595 44.5725M354 46.5324C373.251 42.8979 383.534 76.9059 362 80.517C342.253 83.8284 331.677 50.7469 354 46.5324M596.133 66.1751C599.61 64.6724 602.105 69.8268 598.682 71.493C594.67 73.4458 591.907 68.002 596.133 66.1751M357.333 68.0463C360.742 65.8191 364.92 70.4053 361.443 73.0339C358.149 75.5243 353.559 70.5121 357.333 68.0463M582 93L608 96M353 98L364 132M222 141C217.464 144.994 212.211 148.377 208.278 153.005C205.745 155.985 203.713 161.028 199.866 162.523C193.158 165.131 182.392 158.629 176 156.708C160.985 152.196 145.472 148.629 130 146.074C123.83 145.055 115.747 146.554 110.005 144.37C101.26 141.045 102.528 118.27 108.477 112.755C113.491 108.105 125.007 110.216 131 111C152.778 113.848 175.486 120.672 196 128.412C202.961 131.039 210.138 133.122 217 136.005C218.683 136.712 223.019 138.246 222 140M387 124C402.247 122.669 417.802 116.165 433 113.424C465.956 107.48 500.151 109.032 533 114.75C546.214 117.05 561.172 118.277 573 125M121 111L113 141M840 112L846.576 135L847.096 143.4L824 147.211L760 164M106 143C90.8489 155.449 66.2645 157.584 48 163.667C44.1667 164.943 30.8165 171.281 28.2415 165.682C25.3638 159.425 39.1771 148.64 43 145.286C60.6378 129.815 83.3625 116.053 107 113M855 114C855.025 123.014 863.51 142.591 849 144M575 126C574.667 141.643 563.203 154.704 553.579 166C549.517 170.768 541.731 177.299 541.333 183.996C540.535 197.438 557.354 184.882 561 181.711C576.769 167.996 584.159 149.072 598 134M224 140C240.921 146.699 242.477 177.278 248 192M728 150C729.645 144.51 732.511 142.323 738 141M857 146C874.245 152.603 892.494 157.038 910 163.003C917.378 165.517 925.5 169.982 933 166M232 149C225.59 154.754 211.915 158.596 210.14 168C207.659 181.149 222.849 190.754 224.576 203C226.223 214.675 205.184 220.926 197 224.2C194.057 225.377 190.253 227.693 187 227.492C182.833 227.235 179.416 222.541 176 220.479C170.919 217.413 164.836 215.786 159 215M201 163L209 167M751 170C747.66 181.572 736.107 191.224 737.062 204C737.578 210.889 746.238 218.251 753 214.243C761.471 209.222 768.564 198.799 776 192.174C778.645 189.817 783.136 185.18 786.985 185.306C793.909 185.534 800.524 200.392 802.236 206C803.501 210.144 803.471 217.212 809.946 213.816C818.503 209.329 813.125 185.683 806.49 181.028C801.811 177.745 793.141 181.452 789 184M43 207C69.3114 191.498 103.086 186.03 133 181.87C145.914 180.073 159.996 177.675 172 184C167.734 188.887 162.914 193.887 160.479 200C158.722 204.411 159.25 210.279 154.867 213.221C150.241 216.326 140.564 216.799 135 218.424C118.205 223.331 101.374 227.991 85 234.192C77.7008 236.957 64.8365 244.385 57.0432 243.611C48.7902 242.792 46.422 223.238 45.2454 217C44.7924 214.598 43.0822 211.1 44 209M809 180C821.522 180.001 833.702 182.842 846 184.919C868.784 188.766 894.602 191.822 914 205.44C929.117 216.053 939.232 231.703 947.244 248C953.389 260.499 958.299 274.191 960.271 288C960.932 292.628 962.058 300.823 958.262 304.549C954.308 308.429 947.524 299.594 945.3 297C937.632 288.055 932.587 277.223 925.331 268C921.705 263.391 914.971 258.935 913.558 253C912.175 247.189 918.199 244.23 921.532 240.7C926.034 235.932 928.414 229.438 932 224M153 181C150.763 191.838 145.921 201.794 148 213M173 184C185.185 192.76 197.479 202.525 206 215M714 196L732 206M189 253C192.918 256.423 205.036 264.51 203.462 270.786C202.366 275.155 193.58 276.376 190 277.424C179.166 280.597 157.107 291.602 146.015 285.971C140.492 283.168 122.726 263.24 130.333 256.854C134.521 253.338 141.938 254 147 254C160.534 253.999 175.19 257.998 188 253C184.097 246.771 179.768 241.626 182 234C196.806 243.642 219.219 239.319 236 238.089C287.183 234.337 337.557 217.519 388 208.424C451.497 196.976 514.62 197.993 578 209.424C629.916 218.788 682.099 236.644 735 238.961C745.904 239.438 764.275 242.132 773.966 236.442C779.329 233.294 776.561 228.459 779.603 224.105C784.037 217.76 794.766 215.315 802 215M917 208C916.119 214.935 915.278 222.397 912.91 229C910.348 236.142 905.352 241.373 909 249M1 292C9.04043 266.574 10.8256 245.117 28.8156 223.715C33.2915 218.39 35.3386 212.132 42 209M815 216L902 244M756 219L774 228M29 224C32.4249 229.849 34.3558 235.887 39.0934 240.996C41.6243 243.725 46.9826 246.937 47.1721 251.039C47.4423 256.888 39.6163 263.113 36.0895 267C26.8399 277.194 17.2704 304.598 2 306L1 303M183 228L184 229M184 230L182 234M780 235C782.447 247.725 769.439 253.925 762.325 262.039C758.921 265.921 756.375 271.119 751 272.566C740.736 275.328 727.053 272.219 716 274.081C677.902 280.499 642.625 298.557 620.347 331C606.076 351.783 601.216 374.554 597.424 399C596.684 403.773 591.707 423.312 601.044 422.914C608.37 422.601 617.664 409.58 623 405.001C635.513 394.262 648.215 388.22 664 384C669.063 410.036 632.447 437.176 613 447.511C604.858 451.838 588.984 454.551 586.449 465C582.964 479.368 612.581 485.269 622 487.848C658.133 497.741 705.185 497.65 737 475C731.996 470.888 724.233 468.485 721.742 461.999C717.708 451.493 726.27 440.049 733.089 433.039C749.258 416.421 778.839 402.872 799 420C781.249 442.368 762.734 460.411 738 475M432 238C436.338 253.279 443.956 265.905 459 272.687C486.384 285.032 524.773 269.364 529 238M53 245L51 250M774 253C790.223 262.938 814.608 249.227 833 257C829.818 266.32 823.907 282.288 813.826 286.396C809.551 288.138 802.405 286.171 798 285.385C784.507 282.979 766.256 278.944 755 271M833 257L849 265L823 293L816 287M145 286L137 293L111 265C116.09 260.818 121.369 258.304 128 258M36 382C31.7486 404.9 37.9688 432.213 47.7809 453C52.2458 462.459 56.9782 471.592 67 476C73.4215 457.031 67.7646 436.438 70.2894 417C71.1816 410.13 76.1114 397.882 71.6821 391.514C69.1524 387.877 62.7687 389.132 59 388.961C51.2344 388.607 41.22 385.147 38.6528 376.999C35.2719 366.269 42.0325 350.916 47.6952 342C60.2591 322.217 75.4098 303.508 90.9498 286C97.3396 278.801 103.07 270.586 111 265M850 265C865.242 279.039 877.676 294.837 890.6 311C903.022 326.534 916.445 343.656 922.279 363C929.353 386.46 926.997 411.986 919.333 435C914.192 450.439 908.906 466.205 895 476C890.369 468.44 892 458.573 892 450C892 433.784 892.221 417.014 889.385 401C882.149 360.14 853.136 320.885 824 293M205 270C212.355 274.506 219.857 271.395 228 272.17C245.859 273.869 263.146 277.47 280 283.681C285.946 285.872 294.525 287.711 298.447 293.105C301.216 296.914 299.736 301.869 298.572 306C295.841 315.693 292.82 324.991 291.275 335C287.408 360.048 291.37 389.602 305.749 411C316.013 426.274 331.434 439.666 348 447.741C355.819 451.552 372.407 455.022 374.522 465.001C377.42 478.667 348.017 484.999 339 487.573C302.922 497.868 254.789 497.631 223 475C228.749 470.273 237.006 467.483 239.848 460C242.439 453.178 237.35 445.232 233.319 440C222.828 426.384 205.317 414.545 188 412.289C182.194 411.533 163.874 411.417 163.113 420.093C162.526 426.792 174.756 437.635 179.015 442C184.144 447.258 189.35 452.382 195 457.079C203.172 463.875 212.651 471.956 223 475M165 289C158.184 299.102 150.754 308.362 146.695 320C135.504 352.087 142.126 392.643 162 420M796 289C801.818 301.448 811.061 311.857 815.655 325C826.31 355.484 817.676 393.293 799 419M136 293C109.814 319.186 87.0664 354.714 73 389M301 297C321.787 298.815 332.744 319.393 341.245 336C345.159 343.647 350.175 356.1 359.004 358.826C415.832 376.377 475.194 380.153 534 373.834C557.755 371.282 581.355 360.488 605 360M661 299C665.482 322.112 682.027 363.776 664 384M0 302L1 303M355 358L357 366L363 360M41 360C52.1078 369.196 63.0005 372.096 76 377M175.004 365.533C186.7 362.656 199.764 370.982 206.442 380C211.691 387.089 211.788 397.262 201.999 400.347C190.218 404.06 175.94 394.593 169.995 385C165.749 378.149 165.758 367.808 175.004 365.533M777 365.465C787.343 363.651 797.504 371.115 792.326 382C787.702 391.722 776.603 399.298 766 400.696C755.517 402.078 747.297 393.034 752.05 383C756.534 373.535 766.932 367.231 777 365.465M357 366C358.096 379.415 363.266 392.586 365.13 406C365.845 411.142 367.384 418.905 361.867 422.15C356.257 425.449 349.381 416.34 346 413.004C331.165 398.37 316.388 392.141 298 384M236.005 402.742C252.025 396.522 276.101 423.849 254 431.866C238.313 437.556 217.348 409.986 236.005 402.742M715 402.468C739.173 397.909 731.427 429.462 713 432.517C703.528 434.087 695.912 425.12 698.649 416C700.858 408.637 707.695 403.845 715 402.468"/> </svg>`);

    const cuteTurtle = parseSvg(`<?xml version="1.0" standalone="yes"?> <svg xmlns="http://www.w3.org/2000/svg" width="394" height="290" stroke-width="2px"> <path style="stroke:#010101; fill:none;" d="M217 24C212.867 27.9076 199.27 30.4698 197.697 35.1443C195.663 41.1866 204.958 50.9448 199.512 56.1574C196.173 59.3539 189.253 60.6973 185 62.3997C176.448 65.8232 168.289 69.9686 161 75.6682C145.247 87.9859 140.534 104.043 129 119C115.65 111.876 96.5232 118.65 82 116.949C77.0729 116.372 68.9386 112.258 64.213 114.317C55.9651 117.912 50.9474 136.311 47.7299 144C46.5185 146.895 43.5612 151.635 44.6165 154.852C45.7254 158.232 51.114 158.607 54 159.499C61.1104 161.699 76.1377 162.863 81.5123 167.854C85.511 171.567 81 192.064 81 198C68.7368 197.473 59.2142 194.197 48 189.936C43.3326 188.163 37.6144 187.115 36 182C22.8736 179.915 16.0614 162.496 22.3032 151.044C24.642 146.753 30.1909 146.416 32.1103 141.942C36.2719 132.241 36.2015 121.797 41.2585 112C45.0988 104.56 50.9918 102.712 55.5 96.7253C63.8149 85.6841 71.0033 74.9934 81.1698 65.2901C84.3581 62.247 89.1612 61.1288 92.0772 58.1466C94.8711 55.2892 95.6015 51.6244 99.0432 49.0432C117.184 35.4381 142.087 27.0092 164 22.6003C178.606 19.6616 204.625 13.5005 217 24M217 24L248 26L242 34C249.16 37.3491 266.997 49.3973 274.87 45.8017C279.891 43.5086 278.971 38.224 274.951 35.7963C267.129 31.0718 257.048 27.2194 248 26M238 26L242 34M148 30C148.31 39.4543 154.785 37.2254 162 37.0139C173.748 36.6694 185.225 34 197 34M150 37L120.603 61.3002L117.866 81L109 115M281 40C322.756 54.5084 348.436 96.3136 361.569 135.895C362.977 140.141 367.906 141.287 370.956 144.133C377.7 150.425 377.332 160.062 371.66 166.996C366.987 172.71 349.487 186.691 342.059 183.872C340.115 183.134 338.876 181.973 338.318 179.941C337.032 175.256 331.725 157.246 333.978 153.303C335.846 150.036 342.78 148.83 346 147L333.965 116L330.555 104.104L341 94M275 47C280.146 53.2661 288.601 54.2633 293.146 59.5139C298.136 65.2792 295.277 74.6011 298.599 81C303.815 91.0493 313.483 98.6854 318.08 109C324.035 122.361 323 139.732 323 154L332 154M301 52L295 57M202 55C219.95 55 238.515 52.4937 256 58.0285C269.418 62.2761 282.26 74.7914 296 76M93 59L119 63M55 99L64 113M318 108L329 105M277.019 116.576C289.152 113.108 297.014 131.431 284.981 135.347C272.481 139.415 264.928 120.033 277.019 116.576M170.058 117.742C181.844 112.841 190.526 130.337 178.956 135.282C167.65 140.115 159.36 122.191 170.058 117.742M129 119C128.865 135.255 125.723 154.23 132.585 169.791C136.056 177.663 145.047 185.879 150.985 192C154.039 195.15 156.439 200.47 160.213 202.686C166.137 206.165 175.377 206.846 182 209M213 124C220.148 136.054 235.414 138.734 242 124M102 131L102.576 159L100.682 168.968L84 169M362 139L346 147M32 145L42 152M322 155L310.748 179L308.212 188.397L316 189.41L338 185M44 158L36 182M103 171L131 172M347 186C347.017 212.43 362.09 261.897 320 262.871C315.23 262.982 309.366 261.525 305 259.64C297.495 256.401 290.588 249.75 286.105 243C284.171 240.089 282.641 232.77 278.856 231.933C272.701 230.571 261.253 239.489 255 241.254C238.203 245.995 221.303 246.007 204 246C196.036 245.997 179.962 247.542 180 237M35 187C33.5175 203.98 22.0505 221.964 34.5571 237.96C43.7731 249.747 79.1301 248.549 82.4576 231.001C83.5176 225.41 76.4501 221.913 73 218.826C65.9753 212.541 61.7542 206.477 61 197M307 189L272 207M82 199C100.511 201.352 118.287 204 137 204C143.933 204 152.187 206.133 158 202M116 204C115.199 222.605 105.542 239.123 112.559 258C119.429 276.481 145.186 280.916 159.999 269.471C168.988 262.526 173.104 252.261 179 243M84 230L109 237"/> </svg> `);

    const newLevel = parseSvg(`<?xml version="1.0" standalone="no"?> <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 20010904//EN" "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd"> <svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="932.000000pt" height="138.000000pt" viewBox="0 0 932.000000 138.000000" preserveAspectRatio="xMidYMid meet"> <metadata> Created by potrace 1.16, written by Peter Selinger 2001-2019 </metadata> <g transform="translate(0.000000,138.000000) scale(0.100000,-0.100000)" fill="#000000" stroke="none"> <path d="M8510 1357 c-53 -17 -103 -74 -124 -141 -29 -92 -18 -249 33 -453 59 -236 77 -273 138 -273 43 0 68 26 88 92 34 116 95 377 103 449 20 165 -30 287 -135 325 -45 15 -56 16 -103 1z m143 -78 c49 -38 65 -164 22 -164 -15 0 -24 12 -35 46 -8 25 -25 58 -37 74 -13 15 -23 33 -23 40 0 31 37 33 73 4z"/> <path d="M9068 1360 c-59 -18 -97 -51 -125 -108 -26 -54 -28 -65 -27 -182 0 -114 4 -141 48 -315 26 -105 55 -205 66 -223 34 -55 107 -56 136 -1 23 45 111 400 123 496 13 107 0 188 -43 251 -46 69 -116 101 -178 82z m120 -76 c34 -23 52 -67 52 -124 0 -48 -2 -51 -22 -48 -17 2 -27 15 -38 49 -8 25 -25 58 -37 74 -23 28 -28 46 -16 58 11 12 37 8 61 -9z"/> <path d="M1142 1310 c-26 -11 -52 -65 -52 -110 0 -24 -6 -32 -34 -44 -38 -16 -59 -46 -50 -70 6 -15 13 -18 65 -30 31 -7 35 -20 45 -162 6 -85 4 -101 -10 -113 -22 -19 -20 -47 6 -65 21 -15 22 -25 26 -164 l4 -148 -40 -18 c-60 -27 -86 -59 -85 -103 2 -56 29 -73 117 -73 39 0 125 -7 191 -15 154 -20 299 -23 347 -6 71 24 116 105 103 189 -8 57 -61 114 -120 131 -62 17 -183 13 -270 -9 -43 -11 -80 -20 -82 -20 -6 0 -1 175 6 200 6 23 13 25 83 31 89 8 148 33 166 72 19 39 8 74 -31 98 -28 18 -44 20 -124 16 l-93 -4 -2 53 c-1 30 -2 62 -2 71 -1 16 14 18 169 18 155 0 174 2 211 22 39 21 64 56 64 92 0 29 -36 67 -82 87 -53 21 -230 22 -325 1 -69 -15 -72 -14 -93 26 -13 26 -57 58 -77 56 -4 0 -18 -4 -31 -9z m475 -105 c52 -15 90 -46 78 -64 -9 -15 -41 -14 -73 3 -15 7 -45 16 -66 19 -43 7 -61 24 -44 44 14 17 43 16 105 -2z m-106 -355 c24 -13 25 -40 2 -40 -38 0 -63 13 -63 31 0 21 29 25 61 9z m139 -397 c45 -18 80 -51 80 -75 0 -29 -30 -34 -71 -10 -21 12 -47 22 -59 22 -35 0 -60 19 -60 45 0 45 32 50 110 18z"/> <path d="M4006 1305 c-84 -30 -136 -112 -157 -246 -18 -120 -6 -551 19 -666 45 -206 115 -286 277 -314 83 -14 172 -7 296 25 163 42 208 63 266 123 l52 54 15 -29 c19 -37 32 -42 114 -42 37 0 121 -7 187 -16 184 -23 312 -23 360 2 60 31 79 64 83 142 3 57 0 72 -20 101 -38 57 -79 75 -183 79 -70 3 -111 -1 -175 -17 -46 -11 -86 -19 -89 -16 -9 10 0 200 11 212 6 7 32 13 60 13 69 0 133 18 163 46 48 45 24 124 -43 141 -13 3 -59 3 -102 0 l-79 -5 -6 53 c-12 95 -20 91 145 86 160 -4 212 5 259 45 33 27 41 55 28 96 -20 64 -150 97 -298 78 -188 -24 -172 -25 -191 8 -24 45 -61 66 -95 55 -33 -11 -63 -63 -63 -110 0 -26 -6 -34 -37 -50 -60 -29 -58 -92 2 -93 42 -1 48 -14 59 -138 11 -110 10 -122 -6 -142 -24 -29 -23 -46 5 -65 21 -15 22 -23 25 -164 l4 -148 -33 -13 c-18 -8 -48 -27 -67 -44 -27 -24 -35 -27 -43 -15 -5 8 -9 20 -9 27 0 25 -39 69 -74 86 -19 9 -59 16 -93 16 -76 0 -147 -34 -258 -124 -44 -36 -90 -65 -102 -66 -13 0 -23 2 -23 5 0 3 11 61 24 128 45 224 74 572 57 676 -20 120 -84 209 -166 230 -53 13 -51 13 -99 -4z m143 -81 c50 -35 85 -186 46 -200 -24 -10 -43 13 -59 71 -9 29 -23 58 -31 65 -60 50 -19 108 44 64z m1218 -19 c52 -15 90 -46 78 -64 -9 -15 -45 -13 -75 4 -14 8 -39 14 -56 15 -16 0 -39 6 -49 14 -16 12 -17 16 -6 30 17 20 43 20 108 1z m-106 -355 c25 -14 25 -40 0 -40 -37 0 -71 18 -65 35 7 17 37 20 65 5z m122 -390 c30 -11 64 -31 76 -44 47 -49 -1 -87 -58 -47 -16 12 -41 21 -55 21 -24 0 -66 30 -66 48 1 17 14 29 47 41 1 1 26 -8 56 -19z m-726 -82 c20 -21 27 -44 24 -75 -2 -26 -49 -13 -80 22 -44 51 -41 75 9 75 15 0 36 -10 47 -22z"/> <path d="M6683 1308 c-24 -11 -39 -42 -49 -101 -5 -31 -13 -42 -41 -55 -58 -28 -54 -92 7 -92 15 0 32 -6 38 -12 5 -7 15 -66 21 -131 11 -112 10 -120 -8 -143 -22 -28 -18 -49 10 -65 17 -9 19 -23 19 -160 l0 -150 -44 -19 c-51 -22 -76 -53 -76 -95 0 -54 33 -75 121 -75 41 0 129 -7 194 -16 275 -36 382 -19 425 70 43 91 14 192 -67 232 -54 27 -200 31 -284 9 -35 -10 -75 -20 -88 -23 l-24 -5 7 109 c4 60 12 112 18 115 5 3 43 9 83 12 140 10 204 81 141 154 -24 27 -27 28 -128 29 l-103 1 -3 71 -3 71 143 -6 c213 -9 298 23 298 112 0 37 -27 66 -85 91 -51 22 -220 23 -318 1 l-68 -15 -25 39 c-14 22 -36 44 -50 49 -30 12 -33 12 -61 -2z m513 -117 c31 -14 44 -26 44 -40 0 -26 -34 -28 -76 -6 -16 8 -41 15 -55 15 -36 0 -64 23 -55 45 5 15 14 17 52 11 25 -3 66 -15 90 -25z m-138 -343 c24 -24 14 -41 -20 -34 -38 7 -53 20 -44 35 9 15 49 14 64 -1z m143 -399 c50 -25 69 -46 69 -75 0 -29 -33 -33 -68 -8 -13 9 -44 21 -70 27 -38 10 -48 17 -50 36 -8 51 41 59 119 20z"/> <path d="M7595 1308 c-90 -32 -148 -126 -165 -268 -24 -196 -6 -545 35 -703 33 -129 99 -210 199 -244 122 -42 369 -9 543 73 84 40 114 76 120 143 4 36 0 53 -19 81 -37 54 -80 72 -165 67 -83 -5 -133 -30 -255 -130 -108 -87 -124 -77 -93 56 31 136 58 390 59 563 l1 171 -35 69 c-53 104 -142 153 -225 122z m150 -101 c54 -54 72 -187 26 -187 -25 0 -38 18 -49 67 -5 23 -23 59 -40 79 -24 29 -29 41 -21 56 15 27 47 22 84 -15z m495 -827 c25 -25 36 -68 21 -83 -27 -27 -119 50 -104 89 8 21 60 17 83 -6z"/> <path d="M1955 1296 c-60 -27 -95 -93 -95 -181 0 -30 11 -112 25 -182 13 -71 31 -186 40 -258 47 -402 68 -465 164 -515 40 -21 117 -14 166 15 65 38 89 72 206 296 58 112 110 204 116 206 21 7 31 -32 42 -172 12 -156 34 -249 75 -319 50 -85 141 -122 202 -81 56 36 134 204 264 565 46 126 53 158 57 240 5 84 3 102 -17 148 -43 100 -121 140 -204 104 -86 -39 -110 -98 -187 -457 -33 -157 -48 -191 -72 -165 -7 8 -19 40 -27 70 -46 196 -107 258 -205 210 -51 -25 -87 -67 -139 -162 -38 -68 -58 -86 -74 -65 -5 7 -14 98 -21 202 -12 208 -25 277 -72 372 -33 69 -81 114 -138 132 -48 14 -69 14 -106 -3z m160 -90 c29 -29 44 -94 24 -106 -18 -12 -60 12 -98 55 -34 40 -36 46 -19 63 20 20 67 14 93 -12z m998 -116 c34 -27 52 -89 33 -109 -12 -12 -19 -11 -50 8 -42 27 -76 67 -76 92 0 33 55 39 93 9z"/> <path d="M6397 1293 c-32 -8 -57 -80 -93 -265 -19 -101 -46 -241 -60 -313 -25 -129 -73 -294 -100 -347 -20 -39 -51 -37 -69 5 -23 56 -53 223 -70 397 -20 207 -37 287 -72 351 -38 70 -81 101 -148 107 -43 3 -61 0 -89 -17 -111 -69 -120 -342 -21 -621 73 -203 178 -349 290 -402 126 -59 230 -26 290 92 66 130 102 273 170 676 37 219 43 277 35 300 -10 26 -28 45 -40 43 -3 -1 -13 -3 -23 -6z m31 -84 c4 -31 -19 -44 -49 -29 -19 11 -26 40 -12 54 4 4 19 6 33 4 19 -2 26 -10 28 -29z m-599 -85 c66 -59 93 -165 44 -172 -18 -3 -28 8 -52 57 -17 33 -40 65 -50 71 -25 13 -36 47 -21 65 19 23 36 18 79 -21z"/> <path d="M663 1259 c-42 -12 -97 -79 -114 -137 -21 -70 -16 -193 16 -413 28 -196 28 -229 1 -229 -39 0 -53 46 -131 420 -24 116 -46 196 -66 237 -75 156 -210 157 -278 3 -37 -85 -51 -188 -63 -469 -12 -297 -6 -387 31 -460 24 -46 74 -90 104 -93 72 -5 107 15 138 79 20 42 21 55 15 169 -6 112 -5 125 11 131 10 4 20 1 25 -8 5 -8 29 -48 53 -90 59 -100 151 -208 200 -236 61 -35 101 -30 144 15 42 44 60 96 95 277 63 329 58 648 -12 744 -41 56 -106 79 -169 60z m108 -68 c21 -22 29 -39 29 -65 0 -41 -10 -44 -55 -16 -53 33 -83 91 -52 103 28 12 50 5 78 -22z m-482 -15 c24 -25 46 -90 36 -106 -13 -21 -44 -8 -84 35 -38 41 -50 72 -34 88 15 15 61 6 82 -17z"/> <path d="M8485 366 c-88 -39 -120 -143 -72 -236 30 -61 76 -90 142 -90 37 0 62 6 86 23 41 27 79 98 79 147 0 49 -38 120 -79 147 -39 26 -108 30 -156 9z m180 -91 c15 -34 20 -86 9 -98 -13 -12 -43 13 -49 42 -3 17 -16 42 -27 56 -16 20 -17 29 -8 40 17 21 55 0 75 -40z"/> <path d="M9025 364 c-46 -24 -63 -43 -81 -90 -29 -77 2 -174 70 -215 44 -27 123 -25 167 4 41 27 79 98 79 147 0 49 -38 120 -79 147 -41 27 -111 31 -156 7z m176 -78 c18 -30 26 -96 13 -109 -13 -12 -43 13 -49 42 -3 17 -16 42 -27 56 -15 20 -17 29 -9 39 17 20 50 7 72 -28z"/> </g> </svg>`);

    const cuteHorse = parseSvg(`<?xml version="1.0" standalone="yes"?> <svg xmlns="http://www.w3.org/2000/svg" width="680" height="678" stroke-width="3px"> <path style="stroke:#010101; fill:none;" d="M194 81C178.819 69.1814 174.449 44.881 179.721 27C181.651 20.4525 184.788 7.53992 194 8.63812C212.851 10.8854 223.296 36.1059 225.572 52C226.239 56.6599 224.131 65.5754 227.028 69.412C230.098 73.4788 239.604 76.1108 244 79.2091C253.305 85.7678 260.965 95.3785 266.934 105C288.18 139.243 284 181.593 284 220C284 246.877 287.061 276.04 311 292.957C317.814 297.772 329.289 303.802 338 301.681C341.734 300.772 344.098 297.351 348 296.893C357.112 295.824 367.077 298.396 375.961 294.968C388.942 289.957 395.113 271.669 392.772 259.004C390.437 246.376 380.104 260.903 374 261.782C365.043 263.074 359.087 255.691 356.523 248C352.295 235.319 355.31 219.234 354.985 206C354.218 174.677 350.991 140.853 330 116M181 65C164.64 76.5569 137.351 97.3989 116 92.6104C93.2695 87.5125 77.3884 53.6062 103 40C105.085 45.9967 107.906 53.8159 115.91 49.5424C122.564 45.9894 126.399 36.5596 131.428 31.0895C142.896 18.6174 165.158 7.01208 182 16M214 21C236.737 14.2791 269.557 27.6832 288 40.3472C293.571 44.1726 311.86 56.1483 308.353 64.6829C307.377 67.0589 303.083 67.8598 301 69C311.553 82.217 328.595 89.3466 339.331 103C345.21 110.476 348.793 119.691 336 120M195 27C208.192 43.043 207.569 59.7893 206 79M293 65L300 68M225 71L222 83M154 97C161.583 91.8383 168.658 92.8336 176 98M120 94C119.368 100.169 115.902 105.329 113.604 111C105.757 130.369 100.644 140.405 81 149.738C65.6659 157.024 47.936 154.951 39.3279 173C32.5921 187.124 36.0487 203.88 40.2785 218C41.5432 222.222 41.1411 228.322 44.3179 231.606C48.7418 236.18 57.0165 236.876 63 237C67.3914 252.643 87.8483 252.91 100 247.485C117.151 239.829 129.695 223.96 149 219.529C159.356 217.153 170.604 221.783 181 222.1C210.546 223 238.101 209.126 243 178M160 110.65C171.107 107.349 179.737 119.682 182.235 129C185.48 141.102 177.799 152.162 166 155.66C161.396 157.024 155.654 159.273 151.044 156.821C136.051 148.845 146.142 114.769 160 110.65M145 138C155.974 138.092 160.903 144.194 161 155M59 173C64.4057 169.436 68.0159 170.022 73 174M65 185L63 187M64 236C80.4784 234.654 88.1072 224.555 101 217L102 218L104 220M180 223C179.453 235.699 175.144 248.619 172.424 261C166.391 288.466 160.137 316.778 160.001 345C159.934 358.904 160.505 373.518 164.151 387C165.53 392.1 171.442 402.746 169.508 407.775C167.418 413.209 153.038 417.002 148 419.309C129.564 427.75 104.671 435.453 89.0934 448.529C76.3432 459.232 75.6316 481.698 81.4537 496C93.7294 526.155 121.985 550.406 149 567C158.9 554.719 168.212 542.14 170.05 526C170.483 522.203 172.183 516.878 170.535 513.213C166.61 504.482 142.372 501.43 146.785 488.004C148.716 482.132 155.738 479.996 161 478.347C174.884 473.997 189.791 472.939 204 469.997C207.899 469.19 217.607 468.765 220.096 465.411C222.95 461.566 218.055 455.257 214.906 453.376C195.269 441.648 185.326 425.85 171 409M462 289C486.945 252.741 541.365 252.592 567.079 288C580.953 307.103 581.27 329.899 591.89 350C595.067 356.012 599.816 362.382 606 365.547C608.986 367.076 617.056 366.765 618.289 370.317C622.875 383.531 595.902 382.297 599.525 394.001C603.117 405.605 613.604 411.945 625 414.192C631.669 415.507 644.828 409.319 643.709 420.001C638.492 469.806 573.377 506.264 536.326 461.999C532.447 457.365 525.253 449.707 523.573 443.985C518.138 425.479 526.438 403.722 525.985 385C525.278 355.764 510.014 320.803 487 302.669C464.789 285.168 445.287 285.857 419 290.247C408.214 292.048 389.042 299.152 379 294M332 289L344 299M344 299L350 302M211 404L216 453M399 413C399.491 423.747 403.618 435.144 407.746 445C409.253 448.597 413.831 454.544 411.107 458.501C408.999 461.564 403.311 462.559 400 463.667C390.431 466.868 380.858 470.354 371 472.575C367.574 473.347 357.851 473.764 356.256 477.433C354.655 481.117 360.796 485.842 363.001 487.961C369.405 494.114 391.98 504.1 392.762 513.004C393.535 521.801 388.357 531.23 385 539C377.041 557.423 367.708 574.877 361.333 594C359.259 600.222 354.976 608.283 355.322 614.945C355.608 620.459 365.678 623.146 370 624.655C378.404 627.59 388.06 629.661 397 629.661C401.072 629.661 407.988 626.99 411.682 629.117C415.797 631.487 415.021 647.957 413.397 651.892C411.42 656.681 403.503 658.009 399 658.985C386.562 661.682 374.392 661.308 362 658.576C358.446 657.792 352.384 657.331 349.859 654.436C344.475 648.264 351.469 624.369 355 618M309 417C309.346 432.539 310.948 447.738 314 463C314.883 467.414 315.147 476.288 319.303 478.972C327.25 484.105 345.888 477.025 355 477M524 449C524.007 459.347 527.055 468.69 531.486 478C534.038 483.363 538.973 488.831 539.068 495C539.269 508.062 528.203 523.522 522.781 535C513.675 554.278 506.911 574.914 503.59 596C502.283 604.3 501.967 612.659 501.17 621C500.863 624.211 501.778 628.861 498.682 630.976C494.789 633.636 487.489 633 483 633C468.759 633 451.712 630.698 439 624C436.122 630.809 429.983 655.422 435.603 661.436C438.635 664.68 445.872 664.765 450 665.41C463.094 667.456 476.272 667.001 489 662.971C492.642 661.818 498.814 660.452 501.307 657.351C505.003 652.754 501 637.852 501 632M414 460C420.807 465.622 425.43 474.335 431.286 481C437.901 488.529 446.139 494.778 454 500.946C459.184 505.014 470.796 506.951 472.682 514.043C475.944 526.311 467.188 541.343 462.309 552C452.563 573.286 440.033 600.317 439 624M222 466C229.998 475.733 234.81 487.969 242.668 498C246.113 502.396 251.913 506.916 251.838 513C251.739 521.047 246.359 530.266 244.141 538C238.938 556.147 234.587 574.468 231 593C229.593 600.271 224.378 614.711 227.603 621.722C229.268 625.34 235.601 626.202 239 627.333C251.328 631.438 263.993 633.53 277 632.961C280.27 632.817 288.809 633.128 290.972 630.397C292.932 627.922 291.935 622.97 292.285 620C293.578 609.047 292.968 597.982 294.285 587C296.437 569.072 299.821 550.998 306.053 534C310.442 522.03 318.279 510.723 320.156 498C321.034 492.05 319.05 485.992 319 480M455 504C452.272 518.313 441.469 531.919 435.298 545C423.457 570.099 414.232 600.022 414 628M172 514C177.992 514.307 190.226 516.962 194.487 521.43C202.499 529.83 200.327 548.883 198.196 559C196.925 565.032 194.382 579.112 187.895 581.672C184.616 582.966 180.088 580.724 177 579.656C167.717 576.444 158.034 572.72 150 567M226 624C225.584 633.696 225 643.251 225 653C225 656.219 223.993 661.687 226.028 664.436C228.551 667.844 237.107 668.124 241 668.725C253.159 670.602 281.095 672.981 290.397 662.49C295.114 657.169 292 639.885 292 633"/> </svg>`);

    const tanjiro = parseSvg(`<?xml version="1.0" standalone="no"?> <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 20010904//EN" "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd"> <svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="529.000000pt" height="517.000000pt" viewBox="0 0 529.000000 517.000000" preserveAspectRatio="xMidYMid meet"> <metadata> Created by potrace 1.16, written by Peter Selinger 2001-2019 </metadata> <g transform="translate(0.000000,517.000000) scale(0.100000,-0.100000)" fill="#000000" stroke="none"> <path d="M2030 5140 c-8 -14 -6 -46 5 -115 18 -112 19 -200 4 -243 -20 -57 -99 -105 -330 -200 -160 -67 -204 -89 -268 -140 -70 -57 -98 -105 -146 -256 -51 -160 -58 -236 -26 -299 l18 -36 -64 -31 c-89 -41 -176 -131 -225 -230 -57 -117 -79 -220 -88 -405 -4 -88 -12 -171 -17 -185 -17 -41 -102 -138 -172 -196 -148 -124 -330 -184 -557 -184 -128 0 -159 -9 -153 -45 4 -20 198 -165 281 -210 78 -43 225 -75 375 -82 73 -3 133 -9 133 -12 0 -3 -14 -16 -32 -28 -51 -36 -249 -216 -260 -237 -9 -16 -6 -23 13 -39 21 -17 40 -18 271 -15 l248 3 0 -97 0 -96 -151 -156 -150 -155 37 -7 c70 -13 248 18 346 60 12 6 24 -4 45 -36 46 -67 47 -82 3 -136 -21 -26 -54 -63 -74 -81 -82 -79 -23 -94 116 -30 58 27 97 39 112 35 59 -15 115 -95 116 -164 l0 -34 -44 26 c-56 32 -71 34 -55 5 24 -46 22 -207 -6 -444 -28 -240 -28 -330 -1 -383 16 -31 121 -132 137 -132 5 0 9 6 9 13 0 6 14 172 30 367 16 195 30 373 30 394 0 27 -10 54 -31 87 -25 40 -30 56 -27 100 l3 52 49 14 c55 16 60 13 71 -46 25 -137 183 -311 435 -481 85 -57 188 -128 229 -157 41 -29 97 -64 125 -77 28 -13 95 -45 148 -70 133 -62 171 -71 252 -57 36 6 93 24 128 39 117 50 308 153 305 163 -1 6 27 29 63 51 246 151 440 360 504 542 13 39 27 84 31 100 l6 28 62 -7 c34 -3 64 -8 66 -10 12 -13 -16 -83 -56 -136 -27 -37 -41 -65 -34 -67 8 -3 11 -117 11 -423 0 -230 3 -419 6 -419 3 0 43 29 89 65 l83 64 7 136 c4 75 4 189 1 253 -4 64 -7 204 -8 310 0 105 -3 192 -5 192 -2 0 -17 -7 -33 -15 -27 -14 -30 -14 -30 1 0 32 34 86 75 120 l42 34 52 -35 c29 -19 69 -39 89 -45 48 -13 139 -13 147 0 4 6 -28 43 -70 83 -64 60 -105 110 -105 131 0 2 32 -7 71 -21 140 -48 264 -41 314 19 l27 32 -23 9 c-78 31 -129 61 -168 99 -42 42 -91 116 -60 92 43 -33 129 -94 134 -94 3 0 5 24 5 53 0 47 -13 107 -34 158 -6 15 10 17 146 22 174 6 205 13 282 65 58 39 141 135 132 151 -4 5 -41 12 -84 16 -184 15 -218 34 -281 153 -22 44 -41 83 -41 86 0 3 50 -19 111 -50 61 -30 113 -53 116 -51 2 3 -15 65 -38 138 -27 88 -38 134 -30 137 6 2 59 39 118 82 220 159 415 360 349 360 -7 0 -60 -14 -117 -31 -58 -17 -140 -33 -186 -36 -141 -10 -214 25 -299 140 -46 61 -129 215 -121 223 4 4 48 -22 262 -155 55 -34 101 -57 103 -52 5 14 -77 290 -98 331 -10 20 -47 63 -81 94 -57 53 -61 59 -43 69 10 6 41 31 68 56 174 163 274 413 236 594 -6 31 -14 57 -18 57 -4 0 -20 -25 -36 -55 -75 -145 -329 -316 -430 -291 -15 4 -69 46 -120 95 -77 73 -110 96 -197 139 -57 28 -131 58 -164 68 -33 9 -67 19 -75 23 -8 3 86 7 210 9 128 1 229 7 234 12 15 15 -39 65 -124 114 -256 148 -462 220 -688 241 -63 6 -72 9 -66 24 43 97 58 161 58 251 0 151 -55 293 -102 263 -9 -5 -31 -44 -48 -85 -51 -123 -125 -216 -200 -249 -63 -29 -195 -39 -416 -32 -185 5 -286 -1 -359 -23 -13 -4 -17 7 -22 55 -15 141 -63 208 -254 359 -97 75 -125 86 -143 52z m235 -195 c81 -81 115 -149 115 -232 0 -77 -15 -110 -72 -154 -24 -19 -97 -79 -163 -134 -144 -121 -152 -126 -134 -94 6 13 26 47 44 74 18 28 38 61 45 75 l13 23 -38 -22 c-21 -12 -39 -20 -42 -18 -2 2 17 48 42 102 25 54 44 99 42 101 -1 2 -44 -34 -94 -79 -57 -51 -141 -112 -223 -161 -71 -43 -130 -80 -130 -82 0 -7 156 67 197 94 23 15 71 49 108 76 36 26 68 46 71 43 3 -3 -18 -46 -45 -96 -28 -50 -51 -94 -51 -97 0 -3 20 11 45 32 25 20 45 33 45 29 0 -4 -31 -55 -69 -113 -83 -127 -110 -185 -118 -251 -5 -47 11 -170 27 -200 10 -20 17 2 39 138 24 138 47 187 130 272 53 53 254 197 416 297 10 6 -3 -15 -51 -87 -13 -19 -22 -37 -20 -39 2 -2 56 21 120 51 l115 55 247 -24 c136 -13 249 -26 252 -28 2 -3 -13 -7 -34 -11 -206 -33 -451 -107 -664 -202 -260 -115 -330 -170 -409 -323 -64 -123 -86 -207 -86 -335 0 -130 16 -185 78 -272 l42 -58 6 220 c8 318 25 358 215 531 55 50 127 109 162 132 139 95 346 174 557 212 l110 20 -95 -6 c-52 -3 -92 -3 -89 0 3 4 51 15 105 26 304 58 593 50 839 -22 160 -47 368 -142 408 -186 18 -19 15 -20 -298 -27 -173 -4 -315 -10 -315 -14 0 -4 45 -14 101 -24 132 -22 258 -65 397 -133 95 -47 126 -69 195 -136 97 -95 149 -123 210 -113 94 16 182 70 300 184 42 41 77 70 77 65 0 -5 -14 -65 -30 -133 -80 -325 -211 -456 -385 -381 -61 26 -61 26 97 -94 l126 -96 57 -146 c31 -80 55 -147 52 -150 -10 -11 -77 78 -126 170 -29 54 -68 115 -87 135 -39 44 -121 89 -216 121 -38 12 -68 24 -68 27 0 3 21 2 48 -2 l47 -7 -60 61 -59 61 64 0 c127 0 243 31 279 73 10 13 3 16 -51 22 -101 12 -238 50 -464 130 -389 137 -494 144 -860 55 -173 -42 -513 -154 -501 -166 2 -2 52 14 111 36 238 90 500 147 716 157 200 8 241 -1 677 -156 79 -28 184 -58 233 -67 50 -9 89 -18 87 -20 -1 -2 -54 -8 -117 -14 -63 -5 -139 -13 -169 -16 l-54 -6 59 -59 58 -59 -58 0 c-74 0 -70 -15 12 -46 167 -62 287 -154 345 -262 16 -30 27 -55 25 -57 -1 -2 -29 12 -60 30 -77 46 -129 61 -157 46 -26 -14 -27 -41 -2 -89 10 -20 35 -78 54 -128 69 -179 120 -228 277 -263 99 -23 93 -17 68 -64 -46 -92 -200 -206 -333 -247 -22 -7 -43 -15 -46 -19 -4 -3 2 -60 12 -126 33 -203 70 -253 244 -330 50 -21 92 -41 95 -43 3 -2 -7 -14 -23 -28 -44 -38 -98 -47 -253 -42 -78 3 -149 1 -158 -4 -22 -12 -20 -37 9 -114 30 -80 31 -88 5 -72 -41 26 -60 87 -60 190 0 53 -7 131 -16 174 -25 121 -15 265 31 429 98 355 98 352 99 485 1 116 -1 129 -26 183 -70 148 -310 477 -349 477 -5 0 16 -35 47 -77 69 -96 146 -254 170 -348 26 -100 24 -295 -4 -390 -11 -38 -19 -71 -17 -73 9 -9 56 90 71 148 12 49 15 90 11 165 -3 55 -8 109 -12 120 -6 16 -3 15 14 -5 28 -34 51 -112 51 -176 0 -29 -9 -99 -19 -156 -11 -57 -23 -124 -27 -151 -4 -34 -10 -45 -18 -38 -8 7 -22 -22 -50 -102 -58 -169 -62 -166 -40 28 5 45 2 41 -41 -59 -14 -32 -28 -57 -30 -54 -6 5 33 339 40 346 3 3 5 -6 5 -19 0 -14 7 -34 16 -45 14 -17 15 -12 9 60 -4 44 -13 104 -21 135 -16 58 -62 151 -76 151 -11 0 -11 -1 12 -125 23 -127 25 -249 6 -396 -15 -105 -55 -285 -81 -360 -19 -53 1 -48 33 7 20 36 62 159 77 228 3 15 8 26 10 24 4 -4 -4 -72 -20 -163 -5 -28 -3 -27 21 13 49 81 44 50 -24 -168 -41 -132 -45 -155 -46 -250 -1 -123 7 -144 124 -325 39 -60 68 -110 65 -113 -8 -9 -100 19 -142 44 -23 13 -51 38 -63 54 -29 40 -40 38 -40 -8 0 -51 49 -147 108 -213 40 -44 43 -51 22 -44 -138 40 -258 169 -295 313 -22 83 -12 159 55 433 28 112 57 245 65 294 43 264 -12 458 -179 633 -57 60 -74 83 -57 77 l24 -7 -22 30 c-83 117 -413 273 -702 332 -93 19 -130 30 -103 30 5 0 70 7 144 15 74 9 214 18 311 22 207 7 260 -2 308 -51 58 -60 168 -269 216 -411 l7 -20 8 20 c9 26 3 46 -54 179 -88 206 -158 292 -256 316 -63 15 -618 8 -785 -10 -105 -11 -336 -47 -364 -57 -9 -3 2 13 24 36 l39 41 -35 0 c-44 0 -134 -23 -216 -56 -35 -14 -66 -24 -69 -21 -2 2 5 16 17 30 19 25 19 27 2 27 -36 -1 -89 -27 -170 -82 -102 -70 -123 -75 -211 -49 -90 27 -96 27 -76 -3 15 -25 15 -25 -23 -35 -21 -6 -69 -17 -108 -26 -123 -28 -145 -35 -145 -49 0 -7 20 -17 48 -22 l47 -10 -60 -38 c-33 -22 -87 -59 -120 -84 -63 -47 -185 -161 -185 -173 0 -4 28 1 63 12 34 10 63 19 65 19 1 0 -25 -40 -58 -90 -81 -119 -100 -174 -100 -294 0 -155 46 -441 120 -751 41 -169 9 -286 -107 -396 -54 -51 -149 -116 -158 -108 -2 2 26 47 61 99 133 199 166 359 60 295 -70 -42 -239 -126 -244 -121 -2 3 18 38 45 78 68 98 111 186 132 270 l18 69 22 -58 c21 -55 68 -129 77 -120 2 2 -12 112 -32 243 -19 131 -38 295 -41 364 -5 112 -16 170 -29 157 -3 -3 -12 -49 -20 -103 -8 -54 -16 -100 -18 -102 -2 -1 -7 103 -11 232 -7 227 -8 235 -25 213 -28 -35 -66 -117 -84 -180 -29 -99 -31 -172 -7 -270 28 -120 28 -204 -1 -247 -13 -18 -35 -42 -49 -53 -33 -24 -128 -36 -236 -29 l-81 5 145 169 c80 93 143 171 141 174 -2 2 -40 10 -83 19 -43 8 -80 17 -83 20 -3 3 5 16 17 29 l22 24 -176 7 -177 8 89 42 c120 58 239 166 322 295 17 27 14 25 -15 -10 -67 -81 -180 -184 -240 -220 -32 -19 -93 -47 -136 -61 l-78 -25 24 -23 c36 -34 108 -51 213 -51 88 0 94 -1 88 -19 -5 -17 1 -20 47 -25 29 -4 70 -9 90 -12 l38 -6 -60 -87 c-101 -148 -214 -240 -295 -241 -29 0 -28 1 38 68 37 37 100 94 141 127 41 33 80 71 87 84 23 40 -3 48 -189 54 -233 8 -342 40 -514 153 l-73 49 113 6 c391 24 488 85 823 525 50 65 105 134 123 153 93 100 194 150 272 133 l39 -8 -49 -13 c-92 -23 -152 -65 -221 -156 -36 -46 -33 -44 30 19 96 97 141 115 308 126 159 11 215 18 222 29 9 16 -129 43 -240 48 -122 6 -212 -10 -269 -48 -17 -12 -77 -69 -134 -128 l-103 -106 5 40 c3 22 8 56 11 75 3 19 -8 -9 -24 -63 -16 -54 -32 -101 -36 -105 -13 -12 4 279 20 346 29 123 77 192 214 309 107 91 171 102 206 33 18 -35 20 -34 -35 -15 -23 8 -44 15 -46 15 -2 0 3 -18 11 -40 8 -22 11 -40 7 -40 -4 0 -24 5 -46 9 l-39 9 37 -37 c20 -20 36 -40 36 -43 0 -3 -40 -9 -90 -13 -50 -4 -90 -10 -90 -13 0 -3 7 -13 15 -23 15 -15 12 -17 -30 -24 -45 -6 -46 -7 -30 -25 15 -17 14 -22 -14 -79 -39 -76 -40 -89 -2 -33 15 24 38 50 50 58 17 12 19 19 11 34 -11 20 -10 20 54 35 22 4 26 9 17 18 -19 19 -12 26 37 32 26 3 60 9 75 12 l29 5 -21 22 c-30 32 -26 39 20 31 l41 -7 -26 41 c-15 23 -25 41 -24 41 2 0 28 -7 58 -15 30 -8 56 -15 58 -15 1 0 -2 9 -8 21 -7 11 -10 22 -8 24 2 2 86 -64 188 -147 255 -207 270 -218 245 -188 -11 14 -72 79 -135 145 -149 154 -195 213 -239 305 -30 63 -35 85 -35 140 1 74 34 171 84 248 l31 47 -47 -50 c-60 -63 -86 -122 -92 -206 -6 -86 14 -145 81 -246 29 -43 56 -84 61 -92 17 -27 -191 109 -247 161 -63 60 -70 150 -25 298 60 196 111 239 488 415 101 47 199 97 217 111 54 41 73 90 73 186 0 74 -4 103 -26 196 -4 22 0 20 58 -20 34 -23 90 -70 123 -103z m1245 13 c6 -18 14 -78 17 -133 9 -163 -28 -271 -102 -295 -19 -6 -101 -12 -182 -13 -124 -1 -174 4 -303 27 -89 17 -193 29 -245 30 -86 1 -93 -1 -159 -37 -37 -21 -70 -36 -72 -34 -2 1 15 29 37 60 22 31 35 57 28 57 -39 0 -376 -229 -479 -326 -77 -73 -124 -153 -144 -246 l-14 -63 -1 66 c-2 118 57 199 252 346 56 43 137 108 180 145 148 127 224 145 491 113 87 -10 192 -16 254 -13 92 3 115 7 164 31 76 37 154 124 209 231 24 47 47 86 51 86 3 0 11 -15 18 -32z m-1015 -706 c-6 -5 -46 -33 -90 -63 -104 -71 -251 -213 -294 -283 -58 -97 -73 -168 -75 -353 0 -90 -2 -163 -4 -163 -2 0 -19 35 -39 78 -61 131 -56 259 18 409 42 87 128 193 200 247 74 56 232 136 267 136 15 0 22 -4 17 -8z m50 -882 l-39 -40 29 5 c75 14 499 74 502 71 2 -1 -14 -8 -35 -14 -36 -11 -87 -52 -66 -52 34 -2 296 -39 301 -43 2 -3 -5 -11 -17 -17 -17 -9 -26 -8 -45 4 -22 15 -25 14 -58 -23 -34 -38 -77 -133 -77 -171 0 -17 5 -16 60 12 51 27 63 30 85 20 14 -7 30 -24 36 -39 31 -82 -57 -273 -127 -273 -14 0 -34 14 -53 37 l-30 37 -15 -35 c-8 -19 -32 -74 -54 -124 -22 -49 -39 -91 -37 -93 1 -1 28 7 60 18 31 11 61 17 66 14 16 -10 9 -102 -11 -156 -11 -29 -44 -93 -74 -143 -30 -49 -52 -93 -50 -97 3 -4 56 31 118 77 62 47 116 85 119 85 3 0 0 -18 -8 -39 l-14 -40 87 31 c140 49 174 77 131 108 l-21 17 25 49 c39 77 101 140 172 175 35 17 68 30 73 28 5 -2 -12 -53 -38 -114 -26 -60 -47 -111 -46 -112 1 -1 53 13 116 32 63 19 116 35 118 35 2 0 -6 -15 -17 -34 l-22 -34 135 5 c114 5 143 3 181 -11 66 -26 79 -57 65 -149 -31 -204 -188 -868 -255 -1077 -110 -340 -178 -449 -380 -606 -151 -117 -478 -318 -568 -348 -120 -40 -295 -2 -481 107 -147 85 -542 383 -617 464 -97 107 -134 212 -239 673 -21 96 -55 261 -74 365 -20 105 -47 251 -62 325 -33 173 -36 322 -7 396 11 28 49 93 85 145 88 127 85 121 51 113 -15 -3 -36 -8 -47 -11 -33 -9 -10 12 150 138 151 118 155 123 132 135 -12 7 -21 14 -18 14 47 5 244 40 248 45 3 3 -3 12 -14 21 -18 15 -18 15 0 10 102 -33 97 -34 216 37 61 36 110 63 110 60 0 -3 -9 -21 -21 -39 l-21 -34 49 21 c127 57 191 78 233 79 l44 0 -39 -40z m919 -145 c72 -25 137 -48 144 -50 10 -4 9 -12 -3 -41 -31 -75 -15 -121 51 -144 28 -10 30 -14 29 -61 0 -72 24 -89 144 -100 112 -10 140 -24 173 -86 20 -36 68 -178 68 -200 0 -1 -19 5 -42 14 -31 12 -77 17 -160 17 -113 1 -118 2 -118 22 0 47 -59 54 -147 18 l-33 -14 16 37 c36 84 39 127 10 145 -41 27 -137 -16 -222 -100 -65 -64 -97 -127 -92 -183 l3 -42 -54 -18 c-30 -11 -55 -18 -55 -16 -17 50 -49 51 -123 2 -29 -20 -53 -34 -53 -31 0 2 14 36 31 77 60 145 49 219 -32 219 l-38 0 18 53 c13 34 23 51 32 48 48 -15 100 -12 132 8 99 61 151 257 87 326 -25 27 -77 33 -124 15 l-26 -10 30 60 c29 57 31 59 77 65 27 4 53 8 58 10 35 12 103 0 219 -40z m297 -141 c53 -38 63 -57 27 -50 -112 23 -127 14 -41 -24 38 -16 78 -45 117 -85 l59 -60 -41 -9 c-55 -12 -109 0 -139 30 -22 22 -25 32 -21 74 l5 48 -36 7 c-20 4 -46 13 -58 21 -50 32 -10 101 51 90 15 -3 50 -22 77 -42z m990 -280 c13 -16 12 -16 -17 -1 -33 17 -94 75 -94 90 0 9 87 -61 111 -89z m408 -45 c-51 -62 -189 -169 -305 -240 -110 -66 -120 -81 -98 -145 9 -27 27 -70 40 -96 13 -26 24 -49 24 -52 0 -2 -34 16 -75 41 -87 54 -148 64 -153 26 -5 -32 93 -217 133 -252 44 -39 90 -51 195 -51 l85 -1 -35 -30 c-30 -26 -41 -30 -80 -26 -61 5 -167 57 -229 113 -57 51 -71 87 -91 229 -6 44 -13 87 -16 96 -3 11 7 19 38 28 95 29 206 106 283 198 76 89 81 113 33 143 -18 11 -28 20 -23 21 6 0 73 11 150 24 77 12 146 23 153 24 8 1 -5 -22 -29 -50z m-3970 -424 c7 -49 14 -91 15 -93 10 -9 38 56 43 99 3 27 8 48 10 46 6 -7 63 -510 58 -515 -4 -5 -9 6 -42 98 -23 65 -30 68 -43 19 -57 -226 -94 -312 -167 -390 -43 -46 -116 -89 -176 -103 -23 -5 -9 13 76 96 165 164 228 274 235 413 4 75 1 90 -44 225 -61 184 -65 254 -19 400 l30 95 6 -150 c4 -82 12 -190 18 -240z m3126 -145 c-80 -261 -79 -214 2 71 39 138 59 195 61 175 1 -17 -27 -127 -63 -246z m-3166 -156 c1 -51 -42 -195 -54 -182 -5 5 20 200 32 248 l6 25 7 -25 c5 -14 8 -43 9 -66z m3195 -11 c23 -47 28 -109 16 -205 -17 -129 -23 -143 -41 -90 -11 33 -12 69 -5 182 5 77 11 140 12 140 2 0 10 -12 18 -27z m-97 -85 c-3 -7 -5 -2 -5 12 0 14 2 19 5 13 2 -7 2 -19 0 -25z m135 -364 c28 -30 76 -71 106 -91 51 -34 54 -37 35 -46 -33 -15 -90 1 -128 35 -35 30 -145 232 -145 265 0 9 18 -12 41 -47 22 -34 63 -87 91 -116z m-3088 -13 c-7 -32 -7 -32 -22 -10 -14 20 -14 23 3 35 24 18 27 14 19 -25z m2721 -112 c36 -66 41 -125 16 -166 -30 -48 -41 -40 -23 17 17 54 7 100 -22 100 -23 0 -58 -51 -51 -75 3 -11 8 -39 11 -61 6 -36 3 -44 -16 -54 -26 -14 -66 -6 -74 15 -3 8 9 61 28 118 18 56 39 126 46 156 l13 55 23 -29 c13 -16 35 -50 49 -76z m-2771 75 c17 -16 22 -59 8 -68 -5 -3 -26 12 -46 33 -27 27 -34 40 -24 44 25 10 47 7 62 -9z m288 -167 c21 -77 36 -143 33 -145 -5 -5 -79 -21 -82 -18 -2 2 4 19 12 39 21 50 19 87 -7 114 -28 30 -44 29 -64 -2 -15 -24 -15 -28 1 -71 9 -25 15 -47 13 -49 -2 -2 -23 13 -47 33 l-44 38 68 107 c37 59 71 105 74 101 3 -3 23 -69 43 -147z m2498 -341 c0 -3 -4 -8 -10 -11 -5 -3 -10 -1 -10 4 0 6 5 11 10 11 6 0 10 -2 10 -4z m-2630 -100 c0 -3 -4 -8 -10 -11 -5 -3 -10 -1 -10 4 0 6 5 11 10 11 6 0 10 -2 10 -4z m100 -12 c0 -14 -3 -14 -15 -4 -8 7 -15 14 -15 16 0 2 7 4 15 4 8 0 15 -7 15 -16z m2524 -34 c3 -16 9 -43 12 -60 9 -45 -4 -36 -16 13 -6 23 -13 50 -16 60 -3 9 -1 17 5 17 5 0 12 -13 15 -30z m-2637 -62 c-3 -7 -5 -2 -5 12 0 14 2 19 5 13 2 -7 2 -19 0 -25z m107 6 c3 -8 2 -12 -4 -9 -6 3 -10 10 -10 16 0 14 7 11 14 -7z m2543 -196 c6 -75 5 -78 -16 -78 -18 0 -21 6 -21 38 0 20 -2 82 -5 137 l-5 100 21 -60 c11 -33 23 -95 26 -137z m-58 65 c1 -70 -16 -148 -40 -175 l-20 -23 5 30 c3 17 10 73 16 125 6 52 14 109 17 125 l7 30 7 -30 c4 -16 7 -53 8 -82z m-2590 -100 c-6 -24 -19 -48 -27 -55 -13 -11 -15 -10 -10 2 3 8 14 60 24 115 l19 100 3 -60 c2 -33 -2 -79 -9 -102z m76 -72 l7 -44 -32 23 -31 22 6 86 c10 138 17 149 31 47 7 -49 16 -110 19 -134z m12 187 c-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3 4 -12 1 -19z m2440 -35 c-3 -10 -5 -4 -5 12 0 17 2 24 5 18 2 -7 2 -21 0 -30z m-2430 -5 c-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3 4 -12 1 -19z m-62 -198 c33 -34 41 -90 30 -205 l-7 -77 -29 28 c-67 64 -94 165 -69 256 12 43 33 42 75 -2z m2613 -47 c-6 -104 -22 -147 -74 -197 l-39 -38 -3 106 c-3 123 10 165 60 196 58 35 61 31 56 -67z"/> <path d="M3425 4431 c-49 -3 -81 -9 -70 -12 11 -3 -13 -9 -55 -13 -176 -19 -361 -77 -406 -127 -19 -21 -19 -21 16 -15 19 3 116 15 215 26 99 11 198 23 220 26 22 4 38 4 35 1 -3 -3 -50 -13 -105 -22 -125 -20 -223 -50 -261 -80 l-29 -24 40 9 c56 13 174 12 355 -2 l155 -13 -77 -9 c-45 -5 -78 -14 -78 -20 0 -6 51 -21 116 -34 121 -23 259 -73 327 -118 21 -14 37 -27 35 -29 -1 -1 -34 4 -73 13 -45 10 -123 16 -220 16 -211 1 -363 -34 -631 -148 -129 -55 -415 -205 -511 -269 -91 -61 -184 -146 -160 -147 10 0 89 37 175 81 179 93 272 140 320 159 18 7 31 15 28 17 -3 4 -122 -47 -339 -146 -37 -17 -65 -26 -62 -21 12 20 231 150 380 225 167 84 374 160 520 190 180 37 407 37 560 1 33 -8 64 -11 68 -7 13 13 -100 109 -167 141 -35 16 -99 38 -142 48 l-79 19 53 7 c87 13 70 25 -83 57 -33 7 -124 13 -202 14 -78 0 -136 3 -130 6 7 4 62 17 122 29 110 21 186 48 199 69 5 8 -41 11 -165 11 -95 0 -170 2 -167 5 3 3 68 16 144 29 184 32 331 69 248 64 -16 -1 -69 -4 -119 -7z"/> <path d="M1056 3345 c-3 -9 -6 -22 -5 -28 0 -7 5 -1 10 12 5 13 8 26 5 28 -2 2 -6 -3 -10 -12z"/> <path d="M1688 2391 c150 -43 275 -80 277 -83 3 -3 -41 -7 -99 -10 -76 -3 -112 -9 -131 -22 -15 -10 -25 -19 -23 -21 2 -3 62 1 133 7 202 17 325 -11 432 -98 45 -37 69 -75 104 -169 11 -31 23 -54 26 -52 4 4 -27 120 -44 164 -4 9 20 1 67 -22 l72 -36 -19 32 c-28 49 -91 99 -195 156 -223 122 -428 184 -718 218 -69 8 -132 15 -140 14 -8 0 108 -35 258 -78z"/> <path d="M3733 2425 c-271 -44 -425 -88 -613 -176 -108 -51 -151 -83 -176 -132 -15 -27 -15 -28 13 -21 15 4 39 11 52 16 13 5 25 7 27 5 2 -2 0 -28 -5 -58 -7 -41 -6 -50 3 -35 55 91 130 157 227 198 47 20 71 22 189 22 126 0 141 -2 224 -32 49 -18 92 -29 95 -26 10 10 -52 53 -104 71 -38 14 -82 18 -182 18 -73 0 -133 1 -133 2 0 1 62 22 138 46 106 35 176 50 307 67 94 13 179 26 190 30 18 7 18 9 -8 19 -39 15 -79 13 -244 -14z"/> <path d="M1635 2226 c-16 -7 -39 -24 -50 -36 l-20 -23 31 17 c34 20 82 56 74 55 -3 0 -18 -6 -35 -13z"/> <path d="M1805 2181 c-88 -22 -260 -97 -294 -129 -14 -13 -21 -21 -16 -19 6 3 35 12 65 21 l55 16 -30 -25 c-16 -13 -33 -24 -37 -25 -9 0 -62 -89 -57 -94 2 -2 60 23 129 55 69 32 129 58 133 59 4 0 -6 -21 -24 -46 -40 -58 -47 -112 -25 -188 51 -175 290 -261 435 -156 87 64 115 204 65 334 -5 14 7 9 52 -21 88 -59 88 -59 82 -37 -3 10 -13 36 -22 56 l-16 38 25 -10 c38 -14 31 3 -23 57 -120 119 -305 162 -497 114z m250 -110 c54 -24 91 -70 111 -137 9 -31 14 -57 12 -59 -2 -2 -26 -7 -55 -10 l-51 -7 -12 36 c-25 76 -109 81 -168 10 -22 -27 -39 -36 -81 -44 -30 -5 -56 -10 -58 -10 -10 0 9 75 27 110 56 108 175 157 275 111z m-56 -165 l32 -33 -27 -22 c-15 -11 -34 -21 -43 -21 -21 0 -61 28 -61 43 0 11 49 67 60 67 3 0 21 -15 39 -34z m-93 -103 l59 -27 101 27 c56 15 107 27 114 27 22 0 -54 -122 -93 -151 -74 -53 -184 -45 -275 21 -49 35 -61 69 -38 105 22 33 57 32 132 -2z"/> <path d="M3378 2180 c-125 -31 -263 -102 -341 -176 -36 -33 -26 -45 13 -15 34 25 34 27 15 -59 -7 -36 -12 -66 -10 -68 2 -2 11 5 21 16 11 10 40 37 65 60 l46 42 -13 -52 c-27 -104 -13 -187 42 -248 78 -86 231 -111 346 -56 87 41 122 103 134 239 5 59 2 82 -14 125 -11 28 -19 52 -17 52 2 0 47 -25 100 -55 54 -30 100 -55 102 -55 3 0 -4 15 -14 33 -67 113 -76 130 -63 122 8 -5 42 -26 75 -47 32 -20 61 -35 64 -33 9 9 -75 99 -118 127 -108 68 -274 87 -433 48z m120 -106 c20 -8 50 -27 66 -42 27 -26 76 -114 76 -139 0 -7 -24 -14 -56 -19 l-56 -7 -47 47 -48 47 -53 -42 c-36 -29 -72 -47 -109 -55 -30 -7 -56 -12 -58 -10 -1 1 5 28 14 59 37 133 162 207 271 161z m-29 -168 l33 -34 -30 -16 c-40 -21 -78 -20 -86 0 -6 15 31 84 45 84 3 0 20 -15 38 -34z m166 -88 c-3 -13 -18 -48 -33 -78 -31 -62 -78 -95 -150 -106 -76 -11 -205 45 -231 102 -15 33 -14 40 5 58 26 26 85 20 130 -14 50 -38 78 -38 117 2 44 44 75 58 125 58 40 0 43 -2 37 -22z"/> <path d="M3695 1638 c-83 -71 -154 -108 -211 -108 -23 0 -86 9 -139 20 -117 24 -124 24 -103 4 22 -23 139 -53 229 -61 93 -7 138 10 220 85 49 45 90 105 78 116 -2 2 -35 -23 -74 -56z"/> <path d="M1640 1682 c0 -27 75 -103 127 -129 52 -25 68 -28 158 -28 103 1 164 14 187 42 12 15 9 16 -21 10 -19 -4 -71 -10 -116 -13 -113 -9 -171 7 -250 66 -78 59 -85 63 -85 52z"/> <path d="M2690 1440 c0 -53 4 -90 10 -90 6 0 10 37 10 90 0 53 -4 90 -10 90 -6 0 -10 -37 -10 -90z"/> <path d="M2660 1360 c0 -33 4 -60 10 -60 6 0 10 27 10 60 0 33 -4 60 -10 60 -6 0 -10 -27 -10 -60z"/> <path d="M2786 1209 c-15 -12 -25 -23 -23 -25 7 -7 97 28 97 37 0 17 -47 9 -74 -12z"/> <path d="M2301 980 c41 -63 179 -99 324 -85 92 9 80 19 -35 29 -62 6 -208 43 -287 73 -17 7 -17 5 -2 -17z"/> <path d="M2970 959 c-102 -21 -186 -38 -187 -39 -2 0 -3 -5 -3 -11 0 -15 239 -6 293 11 41 12 124 80 97 79 -8 -1 -98 -18 -200 -40z"/> <path d="M2645 768 c-31 -11 -65 -36 -65 -48 0 -4 26 2 58 13 49 17 64 18 111 8 30 -6 57 -9 59 -6 8 8 -82 45 -108 44 -14 0 -38 -5 -55 -11z"/> <path d="M2782 688 c-36 -22 -104 -29 -157 -15 -28 7 -29 6 -11 -7 42 -34 165 -28 196 9 22 27 5 35 -28 13z"/> </g> </svg>`);

    const thinkingFace = parseSvg(`<?xml version="1.0" standalone="yes"?> <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"> <path style="stroke:#313131; fill:none;" d="M266 484C253.564 500.12 238.893 502.193 220 506.211C184.157 513.832 150.242 516.183 120 491.384C103.718 478.032 92.7208 459.378 87.8843 439C86.139 431.646 87.2741 420.863 84.2577 414.259C82.5042 410.42 77.3519 407.23 74.5795 404C67.1633 395.361 60.0953 386.542 53.8611 377C31.2272 342.358 16.9251 302.407 14.0895 261C11.7546 226.904 16.2221 192.199 27.6921 160C57.759 75.5958 133.377 16.6322 221 2.25928C231.505 0.536133 243.357 2 254 2C301.735 2 345.134 12.562 386 38.3187C412.032 54.7259 434.716 76.0156 452.706 101C471.859 127.6 485.504 157.982 492.576 190C516.078 296.407 462.683 413.039 363 460.297C340.735 470.853 317.42 478.788 293 482.576C286.738 483.547 274.121 487.18 268.238 484.397C264.658 482.703 266.299 477.146 265.656 474C264.737 469.501 261.756 467.189 258 465C268.346 458.147 279.497 446.348 271.146 433.015C268.885 429.406 265.022 427.767 262 425L265 427"/> <path style="stroke:#313131; fill:none;" d="M184 57.4252C200.602 55.319 227.669 60.6668 241.999 69.3796C250.483 74.5382 253.981 89.8146 240.961 92.2469C231.764 93.965 220.871 86.5861 212 84.662C195.063 80.9886 177.786 81.3261 161 85.733C152.441 87.98 139.644 96.5596 131.094 90.9908C122.165 85.1744 124.51 73.581 133.004 69.0548C148.327 60.8891 167.138 59.5644 184 57.4252"/> <path style="stroke:#313131; fill:none;" d="M361 140C365.951 149.288 374.174 154.64 375.83 166C376.806 172.692 376.944 179.387 375.239 186C370.699 203.613 350.228 221.587 332.17 208.301C311.299 192.946 311.675 161.52 329 144C321.274 141.974 313.761 148.884 306.001 145.457C298.315 142.062 295.662 131.173 302.144 125.303C305.619 122.156 311.574 120.973 316 119.745C340.686 112.896 366.383 113.414 391 120.152C400.531 122.761 413.813 126.129 420.276 134.174C426.093 141.415 421.658 152.862 412 153.228C407.276 153.406 403.233 150.162 399 148.533C387.802 144.224 373.228 137.938 361 140M186 121.878C226.993 121.875 226.509 197.093 185 197.162C146.311 197.227 146.403 121.881 186 121.878"/> <path style="stroke:#313131; fill:none;" d="M329 143C338.679 137.754 350.498 139.171 361 140"/> <path style="stroke:#313131; fill:none;" d="M85 411C85.0132 391.004 93.5827 373.525 107.09 359C120.974 344.069 139.376 332.376 143.381 311C146.001 297.018 139.673 285.469 139.04 272C138.745 265.726 139.789 259.396 146.005 256.318C161.665 248.563 178.219 265.524 184.216 278C197.773 306.203 193.616 333.495 176 358C185.831 365.044 207.907 355.039 219 352.576C246.389 346.493 273.61 339.659 301 333.576C312.574 331.005 325.075 326.026 337 326.029C352.388 326.034 363.149 344.054 352.606 356.957C344.831 366.471 328.191 367.329 317 370.127C301.037 374.117 279.022 375.372 265 384C276.298 398.025 280.053 410.219 265 424"/> <path style="stroke:#313131; fill:none;" d="M233 275.424C258.769 272.039 287.651 280.751 310 293.034C319.373 298.185 334.502 316.121 315 320.677C309.643 321.929 305.376 317.953 301 315.63C291.972 310.838 282.71 306.805 273 303.615C261.482 299.831 247.044 298.788 235 299.84C227.791 300.47 218.089 304.312 211.039 302.515C201.7 300.136 198.335 286.703 206.188 280.879C213.094 275.758 224.849 276.495 233 275.424"/> <path style="stroke:#313131; fill:none;" d="M263 384L265 384"/> </svg>`);

    const excellentWorkStreaked2 = parseSvg(`<?xml version="1.0" standalone="yes"?> <svg xmlns="http://www.w3.org/2000/svg" width="851" height="856" stroke-width="7px"> <path style="stroke:#030303; fill:none;" d="M411 2.42438C449.105 -2.57886 494.102 6.40198 531 15.6265C723.743 63.8123 857.616 247.337 848.961 445C840.052 648.444 681.577 821.51 479 846.715C433.155 852.419 385.272 851.505 340 841.576C281.201 828.679 225.132 805.684 176 770.573C38.4009 672.239 -24.607 496.984 10.7901 333C21.1491 285.01 40.101 238.305 66.6921 197C122.997 109.539 210.902 45.2486 311 17.4244C344.197 8.19653 377.23 6.85846 411 2.42438"/> <path style="stroke:#030303; fill:none;" d="M407 8.42438C445.725 3.33972 489.523 11.7573 527 21.1265C704.421 65.4818 839.486 230.305 843.985 414C849.101 622.829 690.057 812.69 482 840.718C425.817 848.286 368.723 845.171 314 829.573C153.219 783.743 29.5219 643.959 9.28549 477C3.08166 425.816 7.04402 372.963 19.3742 323C30.9399 276.135 51.615 230.699 79.0255 191C133.424 112.213 214.957 52.3476 307 25.4244C340.219 15.7075 373.013 12.8869 407 8.42438"/> <path style="stroke:#030303; fill:none;" d="M448 44L446 96"/> <path style="stroke:#030303; fill:none;" d="M375 46C368.132 48.3248 358.276 47.207 352.148 51.0131C345.101 55.3904 349.9 73.2804 353 79L379 73M405 99L405 58C405 52.3893 404.939 43.947 412.957 48.4221C428.888 57.3148 426.166 85.5024 444 93M474 46L515 54M493 54L484 103"/> <path style="stroke:#030303; fill:none;" d="M294 68C296.604 80.5829 301.608 92.8235 305.667 105C306.883 108.648 307.885 115.9 312.133 117.227C319.377 119.489 331.016 112.867 338 111"/> <path style="stroke:#030303; fill:none;" d="M576 75C572.514 88.4401 567.725 101.514 564.375 115C563.238 119.579 560.969 129.268 568.99 126.922C584.001 122.532 589.965 90.2556 608 94C604.994 106.591 601.17 118.576 597.348 131C596.48 133.822 593.796 141.752 596.643 144.048C600.226 146.937 606.6 141.298 608.826 138.956C618.603 128.674 626.932 117.075 637 107M353 79C353.832 85.584 352.271 98.36 356.858 103.593C361.327 108.691 380.415 102.766 386 101"/> <path style="stroke:#030303; fill:none;" d="M243 92C247.756 103.422 253.347 115.22 259.424 126C261.292 129.313 263.214 134.977 267.105 136.356C273.705 138.696 285.52 130.198 291 127"/> <path style="stroke:#030303; fill:none;" d="M215 105C203.296 114.282 189.605 119.464 201.749 134.985C204.335 138.289 208.609 140.404 210.571 144.104C213.523 149.671 216.703 162.179 224.093 163.592C232.514 165.202 241.375 154.775 248 151"/> <path style="stroke:#030303; fill:none;" d="M230 126L210 142M660 133.479C696.137 129.243 692.787 182.982 662 187.786C623.749 193.756 626.396 137.418 660 133.479"/> <path style="stroke:#030303; fill:none;" d="M405 139.424C436.171 135.332 470.782 140.535 501 148.127C533.922 156.397 566.5 171.181 594 191.152C624.107 213.016 649.996 239.5 669.947 271C735.373 374.301 726.536 511.416 651.339 607C631.633 632.048 606.968 653.169 580 670.05C545.062 691.92 504.942 706.621 464 711.715C393.559 720.48 320.747 704.518 262 663.975C140.288 579.977 101.222 409.097 176.012 281C194.615 249.137 218.895 221.11 248 198.424C295.173 161.655 346.897 147.053 405 139.424M169 140C163.361 144.927 157.352 149.564 154.988 157C149.439 174.459 160.684 196.86 181 196.54C193.022 196.351 202.07 189.137 209 180"/> <path style="stroke:#030303; fill:none;" d="M394 294C387.293 259.413 377.378 225.447 370 191C368.14 182.315 366.164 173.642 364.116 165C363.393 161.95 361.35 157.398 362.643 154.303C364.286 150.369 372.445 150.369 376 149.75C389.762 147.355 404.009 145.068 418 145.001C474.583 144.728 537.182 159.039 583 194C548.995 236.879 520.031 285.454 489.667 331C482.663 341.506 474.533 359.8 464.471 367.357C460.956 369.997 454.856 366.785 452.523 363.786C446.033 355.442 461.327 332.201 464.85 324C480.474 287.623 499.46 242.508 473.363 206C465.59 195.127 455.172 181.907 440 184.305C419.494 187.546 424.237 209.461 422.83 224C422.047 232.09 420.068 240.2 417.86 248C406.302 288.824 378.093 320.096 355.405 355C346.134 369.263 340.861 386.148 331 400C319.019 391.991 300.787 389.604 287 385.576C257.617 376.99 228.421 367.747 199 359.291C188.975 356.409 178.957 353.449 169 350.341C165.954 349.39 160.422 346.682 157.303 348.212C154.243 349.714 153.854 355.09 153.127 358C150.81 367.265 148.665 376.543 147.272 386C142.258 420.034 143.297 454.519 151.627 488C153.483 495.462 155.08 513.435 161.51 518.292C164.421 520.492 169.988 517.622 173 516.656C182.985 513.453 193.133 510.482 203 506.95C218.079 501.552 234.466 498.459 249 491.677C269.649 482.041 286.647 466.822 300.451 449C305.537 442.434 310.491 436.045 314.947 429C316.323 426.823 319.477 423.095 318.554 420.303C317.368 416.717 310.908 417.095 308 416.989C298.082 416.628 287.882 415.771 278 414.83C247.031 411.883 215.972 410.117 185 407.17C172.85 406.013 158.685 407.454 147 404M433 146C433 157.688 428.403 175.512 434 186M372 330C362.61 319.54 356.553 305.166 349.579 293C335.437 268.332 321.246 243.695 307.15 219L292.28 193C290.779 190.374 287.234 186.343 288.306 183.105C289.98 178.042 300.619 174.938 305 172.753C322.389 164.081 342.62 155.61 362 153"/> <path style="stroke:#030303; fill:none;" d="M517 161C502.146 184.453 502.666 216.383 488 240"/> <path style="stroke:#030303; fill:none;" d="M695 198C699.581 193.514 712.022 179.817 718.816 180.167C722.069 180.335 724.679 185.713 726.371 188C731.949 195.538 738.313 205.544 728.786 213.348C719.586 220.885 709.344 215.881 703.001 208C701.133 205.68 697.983 199.425 694.741 199.036C688.514 198.291 675.569 212.046 671 216M342 378C307.108 353.083 266.275 333.519 229 312.281C213.946 303.704 196.381 296.003 183 285C203.202 254.469 224.907 227.101 254 204.424C263.755 196.821 275.08 186.798 287 183M125 190L149 247"/> <path style="stroke:#030303; fill:none;" d="M584 194C605.906 211.385 626.781 228.146 644.54 250C693.684 310.475 715.614 389.199 704.299 466C700.711 490.357 695.501 521.456 681 542C661.535 528.695 635.584 520.683 614 511.14C606.511 507.829 592.998 504.501 587.492 498.363C584.073 494.551 588.294 484.254 587.112 479C584.661 468.109 578.275 458.169 577.232 447C576.044 434.27 580.776 422.555 575.881 410C569.892 394.639 550.214 381.186 534 379.25C523.751 378.026 513.238 380.041 503 378.711C490.426 377.077 478.497 371.839 466 370"/> <path style="stroke:#030303; fill:none;" d="M106 216L134 218M708 216C704.445 226.925 700.183 234.794 692 243M137 218L167 220"/> <path style="stroke:#030303; fill:none;" d="M227 229L354 355"/> <path style="stroke:#030303; fill:none;" d="M701 262L760 231"/> <path style="stroke:#030303; fill:none;" d="M88 242C85.3239 248.428 76.6576 259.49 79.6181 266.787C82.2985 273.394 93.458 273.763 98.9105 276.429C106.199 279.993 114.736 290.624 123.995 288.79C131.381 287.328 136.405 271.232 139 265"/> <path style="stroke:#030303; fill:none;" d="M639 244L533 334.576L502 360.87L488 375"/> <path style="stroke:#030303; fill:none;" d="M725 250C738.236 259.631 762.252 258.926 778 263M112 255L101 276M742 258L720 296"/> <path style="stroke:#030303; fill:none;" d="M183 286C170.065 304.169 164.894 325.937 156 346"/> <path style="stroke:#030303; fill:none;" d="M81 304C82.4506 309.638 88.4866 322.727 94.1049 325.107C100.019 327.612 106.854 325.406 113 328L100.697 343L104 363L86 356.615L68 366C64.3795 353.636 70.5785 335.256 51 332M82 308L72.5008 326.258L55 332M796 330L783.456 344.17L785 366L766 356.631L748 364L749.972 345L737 328L756.79 324.397L767.891 310.207L776.699 324.436L796 330"/> <path style="stroke:#030303; fill:none;" d="M682 313C671.36 320.273 657.801 324.306 646 329.424C623.623 339.131 601.411 349.223 579 358.85C567.301 363.875 547.601 368.583 539 378"/> <path style="stroke:#030303; fill:none;" d="M104 363L106 365"/> <path style="stroke:#030303; fill:none;" d="M575 407C586.371 400.838 605.177 401.228 618 399.834C646.091 396.782 676.531 394.558 704 388M788 393C786.333 398.94 777.506 409.807 770.985 410.732C764.885 411.598 759.112 408.32 753 410L760.458 427L755.241 444.393L773 443.774L789 457L792.027 437.329L809 427C804.756 422.066 797.932 421.79 793.317 417.366C789.158 413.379 789.112 403.438 789 398M96 408L90.2022 425L98 443L77 443.607L63 457L58.2585 437.224L41 427L57.9761 415.79L62 396C73.7043 407.704 82.605 413.016 99 406M331 400L320 420"/> <path style="stroke:#030303; fill:none;" d="M754 445L752 447M149 471C185.319 463.957 222.357 458.092 259 453C269.697 451.514 289.188 444.185 299 449M578 448L704 465"/> <path style="stroke:#030303; fill:none;" d="M62 458L62 460"/> <path style="stroke:#030303; fill:none;" d="M66 487L85 496.958L103 489L100.893 509L114 525L95.1042 528.028L82 545L73.5818 528.728L54 523L67.3819 508L66 487M744 488C749.307 491.364 760.532 498.123 767 496.321C772.321 494.838 776.879 490.209 782 488C785.964 501.41 782.034 515.432 799 522"/> <path style="stroke:#030303; fill:none;" d="M746 490L749.138 511L738 526C743.949 527.759 751.184 526.295 756.907 528.603C762.885 531.015 767.659 543.14 769 549"/> <path style="stroke:#030303; fill:none;" d="M584 499C581.961 503.897 578.632 508.627 578.105 514C577.016 525.089 581.346 535.849 579.699 547C577.8 559.858 567.834 563.097 562.318 573.089C557.34 582.107 560.146 592.743 553.239 601.999C541.593 617.607 520.213 623.069 502 626.08C463.091 632.513 423.115 629.057 384 634L372 701C354.735 701.88 326.947 691.921 313 682C320.299 669.16 311.782 670.299 303 677L313 682"/> <path style="stroke:#030303; fill:none;" d="M162 520C163.974 533.177 172.051 546.387 178.22 558C197.522 594.337 225.187 625.911 258 650.626C271.075 660.474 286.797 673.151 303 677M795 521L778.275 526.854L769 545"/> <path style="stroke:#030303; fill:none;" d="M681 542C674.904 567.664 651.875 594.393 634.46 613.286C587.307 664.439 522.673 699.015 453 706.165C434.425 708.071 416.592 708.156 398 706.166C389.591 705.266 379.529 705.08 372 701M721 557C722.695 564.328 726.32 584.649 732.51 589.111C736.132 591.722 744.854 589.969 749 589.424C758.797 588.138 769.127 589 779 589M576 560L635 612M116 597C111.423 593.076 103.206 579.523 104.724 573.093C106.1 567.263 120.673 561.291 125.895 564.042C131.776 567.141 135.672 579.091 138 585"/> <path style="stroke:#030303; fill:none;" d="M89 612C86.252 605.267 76.6161 592.733 79.4915 585.213C82.2662 577.956 96.5219 575.677 103 574"/> <path style="stroke:#030303; fill:none;" d="M77 585L78 585M148 591C148.012 609.778 140.799 626.281 134.2 644C130.039 655.171 124.011 662.446 127 675M733 591L737 608C724.789 607.34 713.125 596.633 702 592"/> <path style="stroke:#030303; fill:none;" d="M737 608L761 623M544 611C556.829 624.445 567.954 643.753 577 660"/> <path style="stroke:#030303; fill:none;" d="M697 654C691.843 652.567 675.418 642.115 675.882 635.985C676.687 625.351 693.785 611.227 703.956 617.367C713.349 623.037 712.119 636.424 706.401 644C704.136 647.001 698.438 650.809 698.497 654.911C698.588 661.271 715.486 670.843 720 675"/> <path style="stroke:#030303; fill:none;" d="M490 630C498.544 649.275 505.246 672.449 510 693M140 634L167 631"/> <path style="stroke:#030303; fill:none;" d="M439 632L445 706M106 636C114.917 634.344 127.225 631.412 136 634"/> <path style="stroke:#030303; fill:none;" d="M315 670C332.115 654.379 360.127 637.312 383 633M711 640L742 647"/> <path style="stroke:#030303; fill:none;" d="M170 711C134.697 696.053 161.822 641.241 195 658.769C200.214 661.523 204.651 666.246 208 671"/> <path style="stroke:#030303; fill:none;" d="M654 664.428C684.284 660.129 702.328 714.052 667 718.711C634.846 722.951 617.76 669.573 654 664.428"/> <path style="stroke:#030303; fill:none;" d="M216 747C203.683 738.178 190.393 731.652 202.015 716.004C204.605 712.518 208.708 710.317 211.062 706.791C214.613 701.473 216.507 689.569 224.09 687.929C233.392 685.917 242.872 699.673 252 701"/> <path style="stroke:#030303; fill:none;" d="M612 700C613.788 713.278 619.538 725.908 622.424 739C623.18 742.425 626.02 750.829 619.942 751.033C614.583 751.213 610.539 744.601 607.611 741C599.852 731.456 593.813 720.591 582 716C576.846 728.654 588.764 746.296 590.855 759C593.693 776.24 579.851 765.411 574.12 758C571.256 754.298 568.359 750.614 565.385 747C560.836 741.472 556.04 736.082 551 731"/> <path style="stroke:#030303; fill:none;" d="M211 708L232 722M266 714C259.833 724.603 254.694 736.001 249.248 747C247.125 751.287 243.817 757.172 246.194 761.982C249.297 768.262 260.929 772.099 267 775"/> <path style="stroke:#030303; fill:none;" d="M310 734C305.616 745.449 302.2 757.358 298.333 769C296.953 773.157 293.783 779.614 296.042 783.895C299.333 790.129 313.602 792.663 320 794"/> <path style="stroke:#030303; fill:none;" d="M494 800L487.001 763L486.889 748.303L504 743"/> <path style="stroke:#030303; fill:none;" d="M379 777C373.132 775.554 359.718 776.394 355.407 772.397C351.601 768.867 353.374 749.883 358.279 747.603C365.575 744.212 377.333 749.67 385 750M464 751L484 749M448 754L447 805M405 808L405 788L405 774L405 766C405.004 757.168 410.369 751.907 417.034 761.105C424.67 771.643 427.794 785.748 435.638 795.945C438.289 799.391 441.949 800.88 446 802"/> <path style="stroke:#030303; fill:none;" d="M353 772C349.909 777.704 345.428 795.345 351.318 800.4C356.825 805.128 370.029 804.283 377 806"/> </svg>`);

    const youCanDoIt = parseSvg(`<?xml version="1.0" standalone="no"?> <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 20010904//EN" "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd"> <svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="498.000000pt" height="324.000000pt" viewBox="0 0 498.000000 324.000000" preserveAspectRatio="xMidYMid meet"> <metadata> Created by potrace 1.16, written by Peter Selinger 2001-2019 </metadata> <g transform="translate(0.000000,324.000000) scale(0.100000,-0.100000)" fill="#000000" stroke="none"> <path d="M426 3205 c-9 -24 4 -45 29 -45 27 0 40 26 24 46 -15 18 -45 18 -53 -1z"/> <path d="M4500 3171 c-6 -12 -26 -31 -43 -41 -18 -11 -26 -20 -18 -20 7 0 28 -16 47 -35 29 -32 33 -33 39 -16 3 11 20 28 37 39 30 19 30 20 9 27 -12 4 -31 20 -41 37 -18 30 -18 30 -30 9z"/> <path d="M3390 3155 c0 -8 7 -15 15 -15 8 0 15 7 15 15 0 8 -7 15 -15 15 -8 0 -15 -7 -15 -15z"/> <path d="M1231 3132 c-6 -11 -6 -24 0 -35 21 -37 70 -5 49 32 -13 26 -36 27 -49 3z"/> <path d="M2750 3130 c0 -13 5 -20 13 -17 6 2 12 10 12 17 0 7 -6 15 -12 18 -8 2 -13 -5 -13 -18z"/> <path d="M2342 3118 c-17 -17 -15 -36 6 -47 25 -13 44 1 40 30 -3 27 -27 36 -46 17z"/> <path d="M660 3094 c0 -9 7 -14 17 -12 25 5 28 28 4 28 -12 0 -21 -6 -21 -16z"/> <path d="M2640 3060 c-14 -33 -58 -75 -91 -85 -19 -6 -18 -8 12 -23 19 -10 47 -35 64 -58 l31 -41 20 36 c12 23 35 44 64 59 24 12 38 22 30 22 -26 0 -80 45 -99 83 l-19 37 -12 -30z"/> <path d="M3970 3060 c0 -28 3 -31 28 -28 21 2 27 8 27 28 0 20 -6 26 -27 28 -25 3 -28 0 -28 -28z"/> <path d="M1408 3037 c-34 -35 -35 -38 -17 -48 11 -6 29 -25 39 -42 13 -20 20 -26 20 -15 0 9 16 30 36 46 34 29 35 30 14 37 -12 4 -29 19 -38 33 l-17 27 -37 -38z"/> <path d="M403 3035 c-7 -20 2 -29 21 -22 9 4 13 13 10 22 -8 19 -23 19 -31 0z"/> <path d="M205 3030 c-11 -4 -55 -19 -97 -32 -56 -16 -78 -28 -78 -39 0 -14 36 -114 72 -199 6 -14 14 -34 18 -45 11 -29 26 -64 49 -116 12 -25 21 -51 21 -57 0 -6 8 -26 18 -44 10 -18 24 -52 32 -75 7 -24 17 -43 22 -43 4 0 8 -9 8 -19 0 -11 9 -40 20 -66 18 -43 20 -69 20 -341 0 -237 3 -294 13 -294 8 0 24 -11 37 -25 22 -23 30 -25 115 -25 l92 0 7 308 7 307 175 349 175 349 -25 26 c-15 15 -26 32 -26 37 0 14 -112 34 -188 34 l-60 0 -21 -45 c-12 -25 -21 -49 -21 -55 0 -5 -4 -10 -10 -10 -5 0 -10 -6 -10 -14 0 -8 -9 -31 -19 -53 -55 -108 -81 -168 -81 -182 -1 -20 -26 -55 -32 -44 -3 4 -26 83 -53 175 -31 109 -56 176 -71 194 -13 15 -24 33 -24 41 0 15 -52 17 -85 3z m61 -45 c-4 -14 0 -28 9 -35 8 -7 15 -22 15 -33 0 -22 17 -81 31 -109 5 -10 9 -28 9 -41 0 -13 3 -27 7 -31 4 -4 9 -19 11 -34 2 -15 7 -31 13 -37 5 -5 9 -21 9 -36 0 -15 5 -31 10 -34 6 -3 10 -19 10 -36 0 -25 4 -29 28 -29 22 0 31 8 49 48 13 26 23 50 22 55 0 4 9 24 19 45 11 20 30 60 42 87 12 28 36 79 53 115 17 36 35 75 40 87 13 29 53 37 123 24 32 -6 59 -11 61 -11 9 0 0 -34 -17 -65 -11 -20 -20 -40 -20 -45 0 -5 -16 -34 -35 -64 -19 -29 -32 -56 -29 -58 2 -3 -2 -11 -11 -18 -8 -7 -15 -16 -15 -21 0 -14 -60 -138 -70 -144 -6 -4 -8 -11 -4 -16 3 -5 -6 -25 -21 -44 -14 -19 -24 -35 -21 -35 2 0 -13 -34 -35 -76 l-39 -77 0 -319 0 -319 -87 3 -88 3 -2 300 c-2 165 -7 309 -12 320 -4 11 -14 34 -21 50 -7 17 -16 38 -22 48 -5 10 -6 22 -3 26 2 5 -2 14 -10 21 -8 7 -15 23 -15 36 0 13 -4 24 -10 24 -5 0 -10 9 -10 19 0 11 -4 22 -9 25 -5 3 -12 18 -16 33 -6 27 -16 50 -55 138 -10 22 -23 56 -30 75 -7 19 -19 51 -28 70 -8 19 -17 46 -18 61 -3 24 2 27 69 49 40 12 81 26 92 30 27 10 38 2 31 -25z"/> <path d="M4800 3005 c0 -8 7 -15 15 -15 8 0 15 7 15 15 0 8 -7 15 -15 15 -8 0 -15 -7 -15 -15z"/> <path d="M3153 2965 c-98 -21 -227 -115 -278 -201 -86 -146 -115 -238 -134 -424 -14 -131 1 -263 39 -355 4 -11 14 -36 21 -55 18 -49 71 -129 112 -167 47 -44 142 -106 197 -127 53 -21 200 -32 250 -19 l35 9 -4 104 c-3 100 -5 106 -35 142 -31 37 -32 38 -106 38 -83 0 -131 18 -162 60 -23 31 -48 147 -48 221 0 87 27 223 59 294 52 114 162 205 248 205 28 0 32 3 37 38 13 89 11 170 -5 189 -9 10 -22 28 -28 41 -10 19 -19 22 -74 21 -34 0 -90 -7 -124 -14z m151 -15 c15 0 17 -5 10 -27 -4 -16 -8 -50 -10 -78 -1 -27 -3 -56 -3 -62 -1 -9 -18 -13 -52 -13 -31 0 -48 -4 -44 -10 5 -9 -7 -14 -26 -12 -4 1 -15 -8 -24 -18 -10 -11 -23 -20 -30 -20 -15 0 -56 -47 -72 -82 -7 -16 -17 -28 -23 -28 -5 0 -10 -11 -10 -24 0 -14 -4 -27 -9 -30 -9 -6 -22 -51 -27 -100 -2 -16 -8 -34 -13 -40 -10 -12 -8 -242 3 -296 4 -19 11 -44 16 -55 5 -11 11 -27 12 -35 7 -37 39 -77 80 -103 46 -29 73 -35 165 -36 l52 -1 6 -47 c4 -27 11 -61 16 -77 7 -23 5 -33 -7 -47 -9 -10 -21 -16 -25 -13 -5 3 -15 2 -21 -3 -20 -12 -111 -10 -133 3 -11 6 -42 17 -70 24 -28 7 -74 31 -103 53 -56 42 -127 138 -138 185 -4 15 -11 36 -17 47 -6 11 -12 27 -13 35 -2 8 -9 48 -17 88 -8 39 -12 72 -10 72 2 0 -1 9 -7 20 -7 13 -7 26 -2 38 6 9 12 58 16 107 3 50 13 115 23 145 9 30 17 58 17 61 1 3 21 45 45 93 35 68 61 103 121 160 65 62 88 77 146 97 38 12 78 24 88 26 11 2 22 6 25 9 3 3 15 3 26 0 11 -3 28 -6 39 -6z"/> <path d="M4205 2898 c-4 -13 -9 -281 -12 -596 l-6 -573 39 -34 39 -34 117 -1 117 0 -6 238 c-3 130 -2 234 2 230 11 -11 95 -208 95 -224 0 -8 3 -14 8 -14 4 0 13 -15 20 -32 8 -18 17 -42 22 -53 4 -11 13 -35 20 -52 7 -18 18 -33 25 -33 8 0 27 -11 43 -25 27 -23 38 -25 121 -25 l91 0 0 578 c0 564 -1 579 -20 597 -11 10 -22 26 -25 36 -6 17 -18 19 -119 19 l-113 0 -6 -112 c-4 -62 -7 -160 -7 -217 0 -58 -4 -101 -8 -95 -5 5 -39 88 -76 184 -38 96 -83 193 -100 217 l-31 42 -111 1 c-107 0 -112 -1 -119 -22z m215 -27 c0 -11 7 -27 16 -35 8 -9 13 -20 9 -25 -3 -5 -1 -12 5 -16 5 -3 10 -17 10 -31 0 -13 5 -24 10 -24 6 0 10 -9 10 -19 0 -11 5 -23 10 -26 6 -3 10 -17 10 -31 0 -13 4 -24 10 -24 5 0 13 -12 16 -27 4 -16 10 -32 15 -38 4 -5 8 -14 9 -20 6 -48 34 -120 50 -130 5 -3 7 -11 5 -18 -7 -21 29 -82 50 -85 20 -3 20 2 20 190 0 106 3 218 6 248 4 30 7 67 8 82 1 26 2 27 86 30 l85 3 0 -562 0 -563 -73 0 c-70 0 -74 1 -95 30 -12 16 -22 32 -22 35 0 3 -7 22 -17 43 -9 20 -17 39 -18 42 -5 13 -30 72 -61 143 -19 43 -34 84 -34 92 0 8 -8 29 -18 47 -42 75 -46 84 -44 99 4 26 -50 45 -67 25 -14 -17 -10 -461 4 -475 6 -6 9 -29 7 -52 -4 -40 -5 -41 -34 -35 -17 3 -62 6 -101 6 l-70 0 6 548 c3 301 8 557 12 570 7 21 13 22 96 22 81 0 89 -2 89 -19z"/> <path d="M3682 2894 c4 -21 22 -23 26 -1 2 10 -3 17 -13 17 -10 0 -15 -6 -13 -16z"/> <path d="M1702 2888 c-30 -38 -41 -691 -14 -868 20 -126 50 -220 71 -220 6 0 11 -8 11 -18 0 -22 40 -62 62 -62 9 0 22 -7 29 -17 8 -9 37 -27 64 -39 96 -45 240 -27 330 41 143 110 205 404 193 912 l-5 192 -31 36 c-18 20 -32 40 -32 46 0 6 -39 9 -102 7 l-103 -3 -6 -255 c-9 -345 -24 -504 -51 -534 -4 -6 -8 -19 -8 -30 -1 -40 -68 -96 -115 -96 -35 0 -43 140 -24 425 6 88 13 216 17 284 l7 124 -35 43 -35 44 -106 0 c-73 0 -110 -4 -117 -12z m202 -173 c0 -88 -3 -176 -6 -195 -3 -19 -7 -132 -8 -251 -1 -203 0 -218 20 -254 12 -20 26 -43 33 -49 14 -13 80 -14 117 -2 30 11 70 55 70 77 0 9 6 22 14 29 8 6 12 18 9 26 -3 9 -1 25 5 37 15 29 21 139 28 452 7 303 4 295 94 295 94 0 91 13 87 -336 -2 -164 -6 -315 -10 -334 -4 -19 -7 -52 -7 -72 1 -20 -4 -39 -10 -43 -5 -3 -10 -19 -10 -34 0 -16 -7 -34 -15 -41 -8 -7 -12 -16 -9 -21 2 -5 -9 -35 -26 -66 -16 -32 -30 -61 -30 -65 0 -7 -92 -103 -100 -103 -3 -1 -15 -6 -27 -13 -13 -7 -23 -9 -23 -5 0 4 -4 2 -9 -5 -19 -30 -125 -36 -188 -10 -15 6 -32 10 -37 9 -5 -1 -20 8 -33 21 -28 26 -87 108 -78 108 3 0 -1 10 -9 22 -9 12 -16 36 -16 53 0 17 -4 35 -9 40 -5 6 -11 39 -12 75 -1 36 -6 70 -11 76 -9 12 -5 425 6 604 9 137 13 142 120 138 l81 -3 -1 -160z"/> <path d="M1104 2806 c-61 -15 -133 -55 -177 -99 -38 -38 -77 -110 -77 -141 0 -12 -4 -26 -8 -31 -33 -37 -42 -349 -14 -470 27 -116 117 -252 197 -297 17 -9 48 -27 70 -40 32 -18 55 -23 120 -23 96 0 135 18 213 97 98 99 141 224 149 434 6 161 -4 215 -63 323 -55 101 -160 221 -194 221 -9 0 -20 3 -24 7 -13 13 -81 33 -111 32 -16 0 -53 -6 -81 -13z m121 -27 c4 -6 13 -8 20 -5 8 3 19 -2 25 -9 7 -8 15 -13 19 -11 12 8 96 -60 111 -90 8 -16 18 -31 21 -34 17 -13 50 -84 45 -97 -3 -7 1 -16 9 -19 9 -4 13 -15 11 -29 -3 -13 2 -29 10 -36 17 -14 21 -224 4 -234 -5 -3 -10 -18 -10 -33 -1 -38 -23 -116 -38 -134 -6 -8 -9 -18 -5 -22 4 -4 2 -11 -5 -15 -8 -4 -14 -14 -16 -22 -6 -38 -119 -174 -136 -164 -4 3 -10 -1 -13 -9 -3 -8 -14 -13 -24 -12 -10 2 -21 -1 -24 -6 -7 -11 -149 -17 -149 -6 0 3 -13 11 -29 16 -35 12 -123 91 -116 103 3 4 -3 12 -12 18 -10 6 -14 11 -9 11 5 0 1 9 -9 20 -10 11 -14 20 -10 20 4 0 0 9 -10 20 -10 11 -15 23 -12 26 3 4 0 16 -8 28 -8 11 -15 34 -15 51 0 17 -5 36 -11 42 -6 6 -9 57 -6 144 5 141 13 206 28 215 5 3 9 18 9 35 0 16 5 29 10 29 6 0 10 7 10 15 0 29 98 145 123 145 4 0 25 11 48 25 22 14 43 24 47 21 5 -3 14 -1 22 5 21 12 87 11 95 -2z"/> <path d="M1113 2586 c-23 -11 -44 -28 -47 -36 -3 -8 -17 -30 -31 -49 -14 -19 -25 -46 -25 -60 -1 -14 -6 -36 -13 -48 -18 -33 2 -305 24 -319 5 -3 9 -12 9 -20 0 -9 15 -30 33 -47 31 -31 35 -32 95 -27 54 4 68 10 97 38 43 43 65 91 82 177 17 88 16 225 -1 253 -4 6 -5 16 -2 21 3 4 -1 17 -9 27 -8 10 -15 25 -15 32 0 29 -75 78 -120 79 -19 0 -54 -9 -77 -21z m181 -98 c57 -129 37 -317 -47 -430 -12 -15 -25 -28 -30 -28 -4 0 -15 -7 -23 -15 -21 -20 -67 -19 -87 3 -26 29 -39 116 -35 231 3 90 8 114 30 156 26 50 69 98 98 108 8 3 29 6 47 6 27 1 34 -4 47 -31z"/> <path d="M3628 2723 c-21 -2 -38 -8 -38 -14 0 -5 -7 -9 -15 -9 -20 0 -61 -27 -101 -66 -36 -37 -104 -165 -104 -198 0 -12 -4 -26 -9 -31 -5 -6 -15 -52 -22 -103 -10 -75 -10 -106 0 -169 19 -111 38 -140 138 -214 63 -47 71 -50 115 -46 37 3 62 15 118 55 38 29 70 48 70 43 0 -25 107 -122 150 -136 42 -13 160 38 160 69 0 8 -6 19 -14 25 -27 22 -66 118 -74 181 -12 85 0 193 37 335 l31 117 -30 35 c-17 18 -30 38 -30 43 0 5 -12 13 -27 16 -16 4 -32 10 -38 14 -5 4 -29 11 -51 15 -32 5 -45 2 -59 -11 -11 -11 -19 -13 -23 -7 -12 19 -79 52 -114 56 -18 2 -50 2 -70 0z m119 -55 c23 -11 44 -27 47 -34 8 -20 43 -17 55 3 13 23 37 23 86 -2 38 -20 40 -23 37 -60 -2 -22 -9 -49 -16 -60 -28 -44 -45 -223 -34 -370 3 -38 52 -153 72 -167 28 -20 -66 -61 -118 -51 -26 5 -86 82 -86 110 0 20 -29 73 -40 73 -5 0 -35 -25 -66 -55 -31 -30 -84 -68 -117 -84 -56 -28 -62 -29 -73 -13 -8 9 -14 13 -14 8 0 -15 -70 55 -87 88 -20 39 -27 79 -26 161 1 91 8 152 20 168 5 6 10 22 11 34 0 13 7 34 14 47 7 14 23 44 35 68 28 55 79 104 140 137 56 30 97 30 160 -1z"/> <path d="M3578 2493 c-30 -33 -72 -110 -75 -138 -1 -11 -5 -31 -8 -45 -10 -35 -8 -75 5 -110 1 -3 2 -8 1 -12 -2 -14 69 -30 83 -19 7 6 15 9 18 6 12 -12 83 93 92 135 1 3 6 12 11 20 16 25 15 147 -1 161 -7 6 -11 15 -8 20 3 5 -17 9 -44 9 -40 0 -53 -5 -74 -27z m109 -92 c-9 -71 -82 -201 -112 -201 -24 0 29 150 71 198 19 23 38 42 41 42 3 0 3 -18 0 -39z"/> <path d="M3840 1695 c0 -8 7 -15 15 -15 8 0 15 7 15 15 0 8 -7 15 -15 15 -8 0 -15 -7 -15 -15z"/> <path d="M3642 1588 c-16 -16 -15 -23 4 -42 21 -22 56 -3 52 27 -3 25 -37 34 -56 15z"/> <path d="M1630 1520 c0 -28 3 -31 28 -28 21 2 27 8 27 28 0 20 -6 26 -27 28 -25 3 -28 0 -28 -28z"/> <path d="M2457 1536 c-11 -28 4 -47 32 -44 20 2 26 8 26 28 0 20 -6 26 -26 28 -17 2 -29 -3 -32 -12z"/> <path d="M2790 1465 c0 -8 7 -15 15 -15 8 0 15 7 15 15 0 8 -7 15 -15 15 -8 0 -15 -7 -15 -15z"/> <path d="M920 1450 c-13 -8 -15 -90 -18 -619 l-3 -609 38 -36 38 -36 130 0 c147 0 216 14 311 61 73 37 192 150 233 223 117 206 118 528 4 713 -15 25 -32 54 -38 64 -5 10 -13 19 -17 19 -5 0 -8 6 -8 13 -1 6 -27 32 -60 57 -33 25 -59 48 -60 53 0 4 -5 7 -11 7 -6 0 -33 11 -61 25 -64 32 -141 51 -260 64 -119 13 -198 14 -218 1z m194 -26 c72 -5 111 -10 111 -14 0 -1 9 -3 20 -5 33 -6 48 -11 89 -28 21 -9 42 -17 46 -17 4 0 39 -23 79 -50 68 -48 136 -124 126 -140 -3 -4 2 -13 10 -20 8 -7 13 -16 10 -20 -3 -4 2 -13 10 -20 7 -6 11 -18 9 -25 -3 -8 1 -24 10 -36 9 -14 13 -33 9 -50 -3 -18 1 -38 11 -55 19 -27 21 -119 4 -141 -5 -6 -12 -38 -15 -70 -3 -32 -10 -64 -15 -70 -6 -7 -8 -19 -5 -27 3 -8 0 -20 -8 -26 -8 -6 -12 -17 -9 -24 3 -8 -2 -16 -10 -19 -9 -4 -16 -15 -16 -25 0 -41 -145 -202 -210 -234 -94 -45 -137 -63 -160 -64 -14 -1 -37 -6 -52 -10 -15 -5 -72 -8 -127 -6 l-101 3 0 542 c1 298 3 565 6 594 5 45 10 53 33 62 14 5 36 8 48 5 12 -2 56 -7 97 -10z"/> <path d="M1106 1201 c-4 -6 -7 -68 -8 -138 0 -71 -2 -168 -5 -216 -2 -49 -1 -96 2 -105 9 -21 8 -100 -1 -169 -3 -29 -3 -60 1 -70 5 -10 7 -22 6 -27 -6 -26 76 -35 126 -15 132 54 156 74 199 162 33 67 34 75 34 181 0 135 -16 207 -60 274 -32 50 -92 99 -131 108 -10 2 -29 7 -41 10 -45 13 -116 16 -122 5z m209 -96 c70 -28 115 -142 115 -290 -1 -77 -5 -100 -30 -160 -34 -79 -79 -125 -143 -145 -23 -8 -48 -18 -55 -23 -7 -6 -15 -8 -18 -5 -7 8 -6 627 1 638 7 11 88 2 130 -15z"/> <path d="M1756 1453 c-12 -12 -6 -33 9 -33 8 0 15 6 15 14 0 17 -14 28 -24 19z"/> <path d="M2665 1380 c-4 -12 -20 -29 -36 -39 l-29 -18 23 -12 c13 -7 30 -24 39 -38 l16 -26 11 22 c7 12 27 31 44 41 20 13 26 20 15 20 -9 0 -30 16 -46 36 -29 34 -30 35 -37 14z"/> <path d="M3625 1379 c-250 -12 -231 -4 -239 -96 -11 -141 -10 -149 32 -188 l37 -35 94 6 c74 6 95 4 102 -7 5 -8 9 -200 9 -426 l0 -412 28 -15 c16 -8 34 -22 41 -30 11 -13 35 -16 112 -16 54 0 100 4 103 8 3 5 8 211 12 459 l7 450 96 7 c53 3 120 6 149 6 l52 0 0 106 0 105 -37 45 -37 44 -196 -1 c-107 -1 -271 -6 -365 -10z m549 -31 c24 -33 22 -173 -1 -182 -9 -4 -76 -6 -148 -5 l-130 1 -3 -456 -2 -456 -58 -1 c-31 -1 -70 -3 -87 -4 -69 -6 -64 -41 -62 448 l2 442 -138 3 -138 3 3 96 3 97 30 8 c17 5 108 11 204 13 96 3 177 8 180 10 2 3 78 5 167 5 157 0 163 -1 178 -22z"/> <path d="M2015 1328 c-54 -29 -115 -81 -115 -98 0 -4 -11 -19 -24 -35 -37 -42 -76 -176 -89 -298 -16 -166 1 -309 53 -441 46 -114 65 -137 174 -210 190 -128 384 -60 479 167 54 131 62 175 62 352 -1 148 -3 166 -28 242 -15 45 -48 112 -72 149 -25 37 -45 68 -45 71 0 10 -94 96 -125 113 -28 16 -54 20 -123 20 -78 -1 -93 -4 -147 -32z m225 -5 c8 -4 19 -7 23 -7 12 -1 128 -118 123 -124 -3 -2 8 -28 25 -56 16 -29 29 -61 29 -72 0 -11 7 -29 15 -41 8 -12 12 -28 9 -36 -3 -9 -1 -24 5 -35 5 -10 10 -63 11 -118 1 -91 -8 -150 -40 -269 -6 -22 -12 -44 -13 -50 -1 -5 -7 -17 -12 -25 -5 -8 -10 -17 -11 -20 -10 -50 -120 -168 -169 -181 -19 -6 -35 -14 -35 -19 0 -6 -27 -10 -59 -10 -51 0 -69 5 -117 35 -85 50 -116 85 -143 156 -14 35 -29 73 -35 84 -5 11 -11 25 -12 30 -2 6 -6 21 -10 35 -4 14 -9 48 -11 75 -2 28 -6 67 -9 88 -4 20 -2 43 4 50 5 6 8 37 7 67 -1 30 1 62 5 70 5 8 11 31 14 51 3 20 14 57 25 83 11 25 21 50 22 54 1 4 11 20 23 35 50 66 79 97 90 97 6 0 19 9 29 20 9 11 25 20 36 20 10 0 23 6 29 13 10 12 121 12 152 0z"/> <path d="M2088 1090 c-14 -8 -26 -19 -26 -25 -1 -5 -10 -19 -19 -30 -10 -11 -17 -24 -15 -28 1 -4 -4 -18 -13 -30 -8 -12 -15 -31 -15 -44 0 -12 -4 -25 -10 -28 -13 -8 -13 -206 0 -240 5 -14 12 -40 15 -58 4 -17 10 -36 15 -42 4 -5 9 -13 9 -18 1 -14 31 -67 39 -68 4 -1 30 -3 59 -5 45 -3 56 0 84 23 41 35 64 90 85 204 28 153 0 315 -65 379 -31 30 -103 35 -143 10z m163 -112 c20 -45 23 -69 23 -158 0 -185 -60 -320 -141 -320 -31 0 -33 3 -50 58 -12 40 -17 90 -17 167 0 130 23 202 83 266 52 54 73 52 102 -13z"/> <path d="M3080 1351 l-105 -6 -3 -552 c-2 -426 1 -553 10 -553 6 0 23 -11 37 -24 24 -22 36 -24 146 -27 l120 -4 6 420 c4 231 10 476 13 545 l7 125 -36 38 c-42 44 -53 46 -195 38z m148 -540 c1 -371 -1 -518 -9 -527 -8 -10 -41 -14 -120 -14 l-109 0 0 524 c0 410 3 525 13 530 6 2 59 4 117 3 l105 -2 3 -514z"/> <path d="M4407 1276 c-11 -28 4 -47 32 -44 20 2 26 8 26 28 0 20 -6 26 -26 28 -17 2 -29 -3 -32 -12z"/> <path d="M406 1256 c-5 -22 -58 -76 -88 -90 -11 -5 -11 -7 0 -12 30 -14 83 -68 88 -91 l6 -24 20 31 c22 37 68 79 86 80 16 0 16 20 -1 20 -16 0 -87 71 -87 87 0 23 -18 22 -24 -1z"/> <path d="M650 1265 c0 -8 7 -15 15 -15 8 0 15 7 15 15 0 8 -7 15 -15 15 -8 0 -15 -7 -15 -15z"/> <path d="M770 1180 c0 -28 3 -31 28 -28 21 2 27 8 27 28 0 20 -6 26 -27 28 -25 3 -28 0 -28 -28z"/> <path d="M4532 1125 c-7 -14 -26 -32 -43 -39 l-31 -13 26 -7 c15 -4 35 -20 44 -36 l18 -29 27 35 c16 19 36 34 45 34 14 1 14 2 -3 11 -11 6 -32 24 -46 40 l-26 29 -11 -25z"/> <path d="M632 866 c-10 -12 -29 -29 -42 -38 -19 -13 -21 -17 -8 -17 9 -1 28 -15 42 -32 l26 -31 22 27 c11 15 28 30 38 33 14 6 10 13 -22 43 l-38 35 -18 -20z"/> <path d="M4590 829 c0 -24 23 -21 28 4 2 10 -3 17 -12 17 -10 0 -16 -9 -16 -21z"/> <path d="M4307 775 c-10 -21 -36 -47 -64 -65 -26 -17 -39 -30 -30 -30 22 0 87 -58 98 -89 l10 -25 15 30 c22 42 45 65 78 79 l30 13 -30 15 c-36 19 -70 54 -81 85 -9 22 -9 22 -26 -13z"/> <path d="M727 574 c-9 -10 2 -24 19 -24 8 0 14 7 14 15 0 15 -21 21 -33 9z"/> <path d="M2707 412 c-13 -3 -17 -11 -15 -30 2 -21 8 -27 28 -27 20 0 26 6 28 26 3 28 -10 38 -41 31z"/> <path d="M1707 334 c-24 -24 13 -72 42 -55 20 13 9 56 -14 59 -12 2 -24 0 -28 -4z"/> <path d="M3444 318 c-9 -28 20 -52 47 -37 22 11 24 30 7 47 -19 19 -46 14 -54 -10z"/> <path d="M1850 215 c0 -10 7 -15 18 -13 21 4 19 22 -2 26 -10 2 -16 -3 -16 -13z"/> <path d="M2751 204 c-6 -13 -22 -29 -35 -35 l-24 -11 34 -30 c19 -17 34 -37 34 -47 1 -10 6 -6 16 12 8 15 30 37 47 47 20 12 26 20 16 20 -10 0 -30 15 -47 34 l-30 34 -11 -24z"/> <path d="M1630 197 c0 -8 -15 -28 -33 -43 l-32 -29 32 -28 c18 -16 33 -36 33 -45 0 -8 10 0 23 19 12 19 32 38 44 44 l21 9 -21 11 c-12 6 -32 26 -44 44 -13 19 -23 27 -23 18z"/> <path d="M2510 180 c0 -11 7 -20 15 -20 8 0 15 9 15 20 0 11 -7 20 -15 20 -8 0 -15 -9 -15 -20z"/> <path d="M3600 185 c0 -8 7 -15 15 -15 8 0 15 7 15 15 0 8 -7 15 -15 15 -8 0 -15 -7 -15 -15z"/> <path d="M3480 165 c0 -8 7 -15 15 -15 8 0 15 7 15 15 0 8 -7 15 -15 15 -8 0 -15 -7 -15 -15z"/> <path d="M2954 99 c-10 -17 13 -36 27 -22 12 12 4 33 -11 33 -5 0 -12 -5 -16 -11z"/> </g> </svg>`);

    const congrats = parseSvg(`<?xml version="1.0" encoding="UTF-8" standalone="no"?> <svg width="742.86633" height="348.30579" version="1.1" id="svg87" sodipodi:docname="congrats_merged.svg" inkscape:version="1.3.2 (091e20ef0f, 2023-11-25, custom)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"> <defs id="defs87" /> <sodipodi:namedview id="namedview87" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" inkscape:zoom="1.7324116" inkscape:cx="463.2271" inkscape:cy="144.01889" inkscape:window-width="2560" inkscape:window-height="1371" inkscape:window-x="0" inkscape:window-y="0" inkscape:window-maximized="1" inkscape:current-layer="svg87" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 237.93695,35.341508 39.75725,26.260058 23.60084,16.018365 29,22.467999" id="path45" sodipodi:nodetypes="cccc" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 417.11161,42.053572 -30,50" id="path44" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 427.11161,95.053572 c 18.752,-18.752 38.699,-33.525 61,-47.695 9.486,-6.0278 19.404,-13.4478 30,-17.305" id="path43" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 492.11161,84.053572 c 46.179,-17.814 91.38,-36.184 139,-49.4244 19.495,-5.4204 38.596,-12.909 59,-14.5756" id="path41" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 674.30904,64.564772 c 8.32897,11.12192 14.66756,-5.26902 22,6" id="path7" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="M 343.36926,7.9483418 359.11161,97.053572" id="path17" sodipodi:nodetypes="cc" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 521.11161,111.05357 c 21.687,-6.961 44.302,-14.115998 67,-16.999998" id="path23" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 170.16032,84.836972 96.95129,38.216598" id="path18" sodipodi:nodetypes="cc" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 707.11161,138.05357 c -8.56428,15.20198 -16.31423,30.85526 -25.22354,45.86192 -2.46966,4.93546 -4.13118,10.62641 -2.77646,16.13808" id="path39" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 435.11161,142.05357 -37,91" id="path89" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 158.11161,147.05357 c 12.251,-6.862 35.302,-5.575 49,-4" id="path88" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 629.11161,200.05357 c -10.08263,1.2166 -14.5275,17.32709 -1.8218,18.41164 8.6157,1.11385 19.5798,-1.11657 23.8738,-9.45164 2.03065,-9.44052 -7.39496,-15.94922 -10.59162,-23.96608 -5.43891,-11.97377 11.72121,-14.42212 17.70163,-6.67523 1.02206,0.80724 1.99644,1.68425 2.83799,2.68131" id="path31" /> <path id="path27" style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 83.111607,221.05357 c -7.188807,9.73958 -15.695834,19.28417 -27.080738,24.0702 -3.943761,1.71442 -9.429471,1.67342 -11.963892,-2.35492 -4.117802,-6.85134 -3.485513,-15.53163 -0.734044,-22.77275 5.023723,-13.40657 13.159517,-25.64581 23.33391,-35.69664 4.711224,-4.42831 10.057159,-8.64074 16.444764,-10.24589" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 514.11161,148.05357 c -12,29.66667 -24,59.33333 -36,89" id="path25" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 479.11161,179.05357 c 7.68005,-1.14516 15.36009,-2.29031 23.04014,-3.43547" id="path21" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 501.78875,175.66932 c 7.30915,-0.41501 21.78427,-6.82831 23.09837,4.46077 -3.9231,13.40802 -12.06523,25.35606 -15.77551,38.92348" id="path24" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 527.82331,158.74741 c -1.45852,2.49086 1.58221,6.37661 4.17399,3.65699" id="path19" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 527.795,158.76249 c 2.31452,-2.72189 7.4355,1.0764 4.20837,3.60587" id="path20" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 588.11161,178.05357 c -1.33333,4.33333 -2.66667,8.66667 -4,13 8.91821,-2.3179 18.52008,-18.18094 27.40507,-9.81416 1.29475,8.55183 -4.26942,16.222 -7.35069,23.85579 -2.50985,5.24639 -5.06452,10.48614 -7.05438,15.95837" id="path38" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 554.11161,177.83957 c 9.56579,-2.26626 10.24303,11.04135 9.25267,17.54661 -2.11992,11.73417 -8.03806,25.26278 -20.25267,29.21839 -9.18361,2.03293 -11.30552,-10.21224 -9.12626,-16.73716 3.00304,-11.34027 8.08688,-24.00159 19.0926,-29.64989 z" id="path46" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 111.11061,200.10057 c 4.31405,-1.33538 7.70444,2.80018 8.27154,6.68135 1.86362,8.51608 -1.17742,17.16321 -4.52903,24.90258 -3.31255,6.88267 -8.20491,14.35108 -16.149055,16.15583 -4.07825,1.25056 -7.962749,-1.98847 -8.768002,-5.89225 -2.284641,-8.14556 1.240433,-16.4036 4.418006,-23.78732 3.508949,-7.05607 7.943661,-14.83676 15.704681,-17.77393 l 0.52396,-0.15581 z" id="path14" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 287.11161,216.05357 c -9.79842,1.91171 -15.5172,11.12862 -24.22867,15.06866 -8.02301,1.38774 -6.31118,-9.66817 -3.51633,-13.90491 5.50151,-9.90131 13.54043,-20.18117 25.15422,-22.74352 8.88939,-2.801 13.52092,7.3274 7.76698,13.62392 -4.22188,5.85503 -5.33686,12.98855 -8.02333,19.52035 -1.13967,2.77684 -2.32115,5.54622 -3.15287,8.4355" id="path12" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 584.11161,191.05357 c -5.66667,9 -11.33333,18 -17,27" id="path10" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 393.11161,188.05357 c -4.42762,10.74681 -8.85524,21.49363 -13.28286,32.24044" id="path16" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 335.26994,187.60962 c 7.79132,0.213 15.60673,-1.24188 23.35249,-0.75281 7.00291,2.33292 1.95174,10.87187 0.2536,15.46214 -3.44624,7.77431 -9.03696,15.5983 -8.00232,24.48077 1.66521,7.83089 10.20479,4.99961 14.80036,1.75486 4.72665,-1.53771 12.15643,-7.5777 14.17555,-7.76546 -0.46383,2.39803 -0.24277,4.87068 -0.73801,7.26443" id="path15" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 348.88018,157.62022 c -4.58527,10.02532 -9.17054,20.05065 -13.75581,30.07597 -7.55526,0.67909 -15.13225,1.09403 -22.682,1.83745" id="path13" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 335.24913,187.31792 c -5.66598,18.73994 -12.83548,37.01088 -21.13752,54.73565" id="path6" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 452.11161,206.05357 c -10.03167,2.60266 -14.56393,14.05879 -24.33463,17.18496 -8.47631,1.99086 -7.13772,-8.98722 -4.08282,-13.51168 4.88542,-9.73594 12.24459,-19.29775 22.74966,-23.22242 5.72436,-2.29341 14.66278,1.55844 12.29218,8.73558 -1.89984,6.22015 -6.51778,11.35374 -7.37599,17.95355 -1.3438,4.91435 -3.68917,9.48068 -6.2484,13.86001" id="path4" /> <path id="path54" style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 235.96441,200.43674 c -3.05874,5.65187 -5.93336,11.45342 -8.10528,17.50897 m 24.25248,-18.89214 c -11.31488,3.03816 -21.08029,11.52299 -25.93279,22.18597 -2.37683,4.78454 -4.25103,9.79639 -6.06721,14.81403" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 671.03778,217.10367 c 2.46232,-2.86634 5.78538,-0.26053 4,3" id="path9" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 671.11161,217.05357 c -0.89171,3.13834 1.34526,4.61352 4,3" id="path62" /> <path id="path58" style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 140.11161,214.05357 c -6,9.33333 -12,18.66667 -18,28 m 21,-40 -3,12 c 4.86534,-5.96512 13.55055,-12.06749 23.30935,-11.84439 7.57874,1.95291 1.39902,13.16877 -0.48823,18.96059 -3.32981,7.60098 -7.46403,14.88785 -9.82112,22.8838" sodipodi:nodetypes="ccccccc" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 481.11161,261.05357 56.46134,21.99446" id="path3" sodipodi:nodetypes="cc" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 424.11161,259.05357 26,18.888 23,18.269 19,8.843" id="path2" /> <path style="fill:none;stroke:#000000;stroke-width:3.04685998;stroke-dasharray:none" d="m 207.11161,220.05357 c -8.63584,4.20618 -13.51821,14.11086 -23.21232,16.45667 -8.09752,-1.84335 -5.41597,-12.87579 -2.48301,-18.21076 4.91101,-9.56243 13.31651,-19.22577 24.64557,-20.28536 7.45114,-1.03315 13.81818,6.87389 7.60889,12.96734 -5.71775,5.95663 -5.03475,14.33947 -7.01167,21.76538 -3.50254,13.84698 -9.98284,26.92491 -18.22457,38.54341 -3.86274,4.52063 -9.06712,9.47238 -15.36561,9.32795 -10.48618,-2.26914 -3.08034,-15.1372 3.62307,-17.52782 5.22235,-2.75395 11.55036,-4.58671 17.41965,-3.03681" id="path1" /> <path style="fill:none;stroke:#000000;stroke-width:3.04685998;stroke-dasharray:none" d="m 193.67435,259.90024 c 13.04152,4.97872 27.27959,4.62833 40.75899,7.80088 19.98978,3.31997 41.33028,7.04519 60.89118,-0.26625 3.00761,-1.23136 5.88474,-2.80167 8.4873,-4.7531" id="path72" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 397.11161,272.05357 11,36" id="path87" /> <path style="fill:none;stroke:#000000;stroke-width:3;stroke-dasharray:none" d="m 364.11161,275.05357 -28,51" id="path82" /> <path style="stroke-width:1.33333" d="m 418.72871,331.12146 c 2.5,0.13333 4.96719,1.06772 6.36719,2.73438 2.93333,3.33332 1.99948,9.06602 -1.86719,12.66602 -2.66667,2.4 -2.93295,2.40052 -7.5996,-0.1328 -3.86667,-2.13334 -4.93451,-3.60027 -5.20117,-6.9336 -0.26667,-2.53334 0.53437,-5.06758 1.73437,-6.26758 1.53333,-1.53333 4.0664,-2.19974 6.5664,-2.06641 z" id="path118" /> <path style="stroke-width:1.33333" d="m 333.0959,266.40467 c 0.53333,-0.0833 1.06576,0.1832 1.73242,0.7832 1.06667,0.8 1.86719,2.26732 1.86719,3.33399 0,0.93333 1.3336,2.53399 2.9336,3.33399 l 2.93359,1.5996 -2.93359,2.26562 c -1.6,1.33334 -2.9336,3.3332 -2.9336,4.5332 0,3.06667 -2.93268,4.13438 -4.66601,1.73439 -0.93334,-1.33333 -3.06746,-2.26759 -4.80079,-2.26759 -2.93333,0 -3.20065,-0.53333 -3.33399,-6 -0.13333,-5.33332 0.13412,-6 2.80079,-6 1.73333,0 3.73268,-0.93333 4.66601,-2 0.66667,-0.8 1.20104,-1.23306 1.73438,-1.3164 z" id="path121" /> <path style="stroke-width:1.33333" d="m 717.7619,185.72107 c 0.53333,0 2.66603,3.60054 4.66603,7.86719 l 3.73437,8 6.66601,-4 c 10.93332,-6.39999 12.2664,-5.066 3.0664,3.33399 l -6.13281,5.73242 6.80079,5.73438 c 3.86666,3.06666 6.66562,5.99896 6.26562,6.26562 -0.26666,0.4 -3.99896,-1.20013 -8.26562,-3.4668 l -7.73438,-4 -3.4668,7.86719 c -4.13333,9.33332 -6.00025,11.6 -4.93358,6 2.79998,-14.66665 2.80142,-14.93385 -1.86524,-15.86719 -2.26667,-0.4 -6.66771,-0.79882 -9.73437,-0.79882 -7.73332,0 -3.7319,-2.26732 6.13475,-3.33399 4.53334,-0.53333 7.73243,-1.60039 7.73243,-2.40039 -0.13333,-0.93333 -0.93385,-5.06537 -1.86719,-9.33204 -1.06666,-4.13332 -1.46641,-7.60156 -1.06641,-7.60156 z" id="path92" /> <path style="stroke-width:1.33333" d="m 249.21309,144.90468 c 0.91666,0.31666 1.61614,1.4168 1.88281,3.21678 0.26667,1.46667 1.59975,3.19962 3.06641,3.59962 3.33334,1.06666 3.20052,2.8013 -0.1328,4.66797 -1.46666,0.8 -2.66797,2.66667 -2.66797,4 0,1.73333 -0.93268,2.66601 -2.66601,2.66601 -1.46667,0 -2.66602,-0.66732 -2.66602,-1.33398 0,-0.8 -1.73333,-1.33203 -4,-1.33203 -4,0 -5.73424,-3.2004 -2.26758,-4.40039 1.2,-0.4 1.20104,-0.93269 -0.26562,-2.66602 -2.4,-2.93332 -1.0677,-6.26679 2.26562,-5.46679 1.33333,0.4 3.20092,-0.2668 4.26758,-1.4668 1.13334,-1.33333 2.26692,-1.80104 3.18359,-1.48437 z" id="path79" /> <path style="stroke-width:1.33333" d="m 109.9963,143.13905 c 0.73334,-0.25 1.63216,0.38216 2.29883,2.04883 0.53333,1.46666 1.73385,1.86732 3.86719,1.33398 3.46666,-0.93333 4.13293,0.40026 1.5996,2.93359 -1.19999,1.2 -0.93359,2.13373 1.06641,4.4004 2.53333,2.79999 2.53359,2.79843 -1.06641,2.39843 -2.39999,-0.4 -4.26627,0.2681 -5.5996,2.13477 -2,2.53333 -1.99948,2.53359 -2.13282,-1.06641 0,-2.66666 -0.66797,-3.60156 -2.66797,-3.60156 -3.06666,0 -3.59934,-1.99922 -0.66601,-3.19922 1.06666,-0.4 2,-2.26614 2,-4.13281 0,-1.86667 0.56744,-3 1.30078,-3.25 z" id="path77" /> <path style="stroke-width:1.33333" d="m 605.49238,135.25428 c -14.39922,-1.46717 -8.96271,23.38961 2.69693,15.12034 8.06339,-3.45607 4.79679,-13.84808 -2.69693,-15.12034 z" id="path72-3" /> <path style="stroke-width:1.33333" d="m 312.1252,133.37146 c -0.50234,0.2461 -0.94688,1.33322 -1.29688,3.28322 -0.4,2.4 -0.93307,5.2 -1.06641,6 -0.13333,1.2 -2.53268,1.73437 -6.66601,1.73437 -7.46665,0 -7.46613,1.59935 -0.1328,4.66601 5.06667,2.13334 4.93177,1.7327 2.39844,12.66602 -0.8,2.93333 -0.39843,2.8009 3.60156,-1.73242 l 4.53321,-5.06641 5.5996,4.13281 c 6.4,4.53334 7.06563,3.59999 2.26563,-4 -2.93334,-4.66666 -3.06692,-5.2 -0.93359,-6 1.2,-0.4 3.73489,-1.8668 5.60156,-3.4668 l 3.33203,-2.66601 -6.5332,0.40039 c -6.53334,0.4 -6.66524,0.39909 -7.86524,-4.26758 -1,-4.16666 -2.00066,-6.09374 -2.83788,-5.6836 z" id="path71-6" /> <path style="stroke-width:1.33333" d="m 670.99629,125.78749 c -2.3,0.13333 -4.50131,1.26705 -6.16797,3.40039 -3.46667,4.4 -3.46706,7.3336 -0.40039,10.93358 3.99999,4.66667 8.93412,5.06642 12.80077,1.06642 4.26667,-4.13334 4.39987,-9.19883 0.5332,-12.79883 -2.06665,-1.86667 -4.46562,-2.73489 -6.76561,-2.60156 z" id="path69" /> <path style="stroke-width:1.33333" d="m 399.42794,125.77186 c -2.06667,-0.0167 -4.06615,0.48411 -5.13282,1.55078 -0.93333,0.93333 -1.59961,4.13256 -1.59961,7.19922 0,5.33332 0.26603,5.60039 4.66601,6.40039 4.53334,0.93333 9.86811,-1.06719 10.13478,-3.86719 0.53333,-4.13333 -0.53322,-8.26576 -2.53322,-9.73242 -1.33333,-1 -3.46849,-1.53411 -5.53514,-1.55078 z" id="path68" /> <path style="stroke-width:1.33333" d="m 365.32246,113.80312 c 0.9177,0.25028 1.18291,1.27604 1.92305,1.74163 1.31373,0.77018 2.86949,0.85025 4.35285,0.87866 0.95462,-0.005 1.98962,0.55499 2.08527,1.59262 0.23606,1.52282 -0.0814,3.06984 0.1426,4.59756 0.13103,1.39279 0.41558,2.78221 1.01638,4.05243 0.5778,1.01477 -0.47787,1.81495 -1.45114,1.68913 -1.24985,0.0235 -2.52505,0.0611 -3.69327,0.56674 -1.12165,0.40687 -2.14438,1.09243 -2.84684,2.06699 -0.59909,0.63182 -1.39918,1.52257 -2.36605,1.18586 -1.11017,-0.59645 -1.56664,-1.87821 -2.10942,-2.94106 -0.64438,-1.4778 -1.71041,-3.00725 -3.33333,-3.47479 -1.16378,0.0754 -2.36357,-0.80928 -2.34705,-2.03781 -0.0169,-1.2268 1.17756,-2.10485 2.33696,-2.04153 1.32853,-0.43483 1.94911,-1.87558 2.36668,-3.09753 0.34855,-1.25554 0.51128,-2.61572 1.33904,-3.6776 0.56362,-0.79834 1.58017,-1.4748 2.58427,-1.1013 z" id="path65" /> <path style="stroke-width:1.33333" d="m 455.78731,95.160532 c 1.05,-0.10627 3.37538,2.09453 8.77538,7.894528 l 7.4668,7.86719 8,-3.86719 c 7.86666,-3.86666 11.33203,-4.79921 11.33203,-3.19921 0,0.53333 -1.33359,4.53216 -2.93359,8.79883 -3.2,9.06665 -3.06666,9.99961 6,19.5996 7.06666,7.73333 6.6677,8.66824 -4.26562,7.60157 -4.93334,-0.53333 -10.4,-1.20013 -12,-1.4668 -2.4,-0.4 -4.00027,1.19884 -8.9336,8.79883 -3.2,5.06666 -6.53255,8.9332 -7.19922,8.5332 -0.66666,-0.4 -1.60144,-4.93334 -2.13477,-10 -0.4,-5.19999 -0.93307,-9.33203 -1.0664,-9.33203 0,-0.13333 -5.46615,-1.2004 -12.13281,-2.40039 -6.79999,-1.33333 -12,-2.93386 -12,-3.8672 0,-0.79998 4.53333,-3.86549 10,-6.79882 l 10,-5.33398 0.1328,-10.53321 c 0,-5.73332 0.13424,-10.800128 0.26757,-11.466788 0.13333,-0.5 0.34141,-0.79272 0.69141,-0.82813 z" id="path61" /> <path style="stroke-width:1.33333" d="m 21.0918,91.668522 c 1.05,-0.10627 3.37538,2.09453 8.77538,7.89453 l 7.4668,7.867188 8,-3.86719 c 7.866663,-3.866658 11.332033,-4.799208 11.332033,-3.19921 0,0.53333 -1.33359,4.53216 -2.93359,8.79883 -3.200003,9.06665 -3.066663,9.99961 6,19.5996 7.06666,7.73333 6.6677,8.66824 -4.26562,7.60157 -4.933343,-0.53333 -10.400003,-1.20013 -12.000003,-1.4668 -2.4,-0.4 -4.00027,1.19884 -8.9336,8.79883 -3.2,5.06666 -6.53255,8.9332 -7.19922,8.5332 -0.66666,-0.4 -1.60144,-4.93334 -2.13477,-10 -0.4,-5.19999 -0.93307,-9.33203 -1.0664,-9.33203 0,-0.13333 -5.46615,-1.2004 -12.13281,-2.40039 -6.79999,-1.33333 -12,-2.93386 -12,-3.8672 0,-0.79998 4.53333,-3.86549 10,-6.79882 l 10,-5.33398 0.1328,-10.53321 c 0,-5.733318 0.13424,-10.800128 0.26757,-11.466788 0.13333,-0.5 0.34141,-0.79272 0.69141,-0.82813 z" id="path61-3" /> <path style="stroke-width:1.33333" d="m 127.9963,71.639052 c -0.86666,-0.28333 -1.96797,0.21549 -3.16797,1.54883 -0.93333,1.2 -2.93229,1.73346 -4.26563,1.46679 -3.46666,-0.93333 -4.53333,1.46759 -2,4.26758 2,2.13333 1.99948,2.53282 0.1328,4.13281 -3.2,2.66667 -2.39948,4.39962 1.86719,3.59962 2.66667,-0.53334 4.13268,-0.26694 4.66601,1.0664 1.06667,2.8 4.80079,2.53489 4.80079,-0.39844 0,-1.2 1.19935,-3.06667 2.66601,-4 3.33334,-2 3.33282,-3.86693 0.1328,-4.93359 -1.46666,-0.4 -2.79974,-2.1349 -3.06641,-3.60156 -0.26667,-1.8 -0.89895,-2.86511 -1.76561,-3.14844 z" id="path55" /> <path style="stroke-width:1.33333" d="m 622.5119,79.588272 c 0.95,0.26666 1.71746,1.26693 2.05079,2.93359 0.26667,1.33333 1.59975,3.3323 3.06641,4.26563 2.53332,1.86667 2.53242,1.86757 -0.26758,4.26757 -1.46667,1.2 -2.66602,3.3332 -2.66602,4.5332 0,2.4 -3.33268,2.93412 -4.66601,0.80079 -0.4,-0.8 -2.53321,-1.33399 -4.5332,-1.33399 -3.46667,0 -3.73439,-0.26666 -3.73439,-6 0,-5.33332 0.40027,-6 2.9336,-6 1.73334,0 3.73268,-0.93333 4.66602,-2 1.06666,-1.26666 2.2004,-1.73346 3.15038,-1.46679 z" id="path123" /> <path style="stroke-width:1.33333" d="m 555.46308,0.00427475 c -0.73333,0.08333 -1.70143,1.38489905 -2.63476,3.85156305 -1.46667,3.999996 -2.13321,4.533203 -6.5332,4.533203 h -4.9336 l 3.60156,3.5996092 c 3.33333,3.199997 3.33152,3.733206 1.46485,6.533204 -2.8,4.266661 -1.06497,6.399085 3.06836,3.732421 2.93332,-1.999997 3.46654,-1.999997 6.5332,0 4.26667,2.799997 5.06667,2.666793 4,-0.533203 -0.93333,-2.93333 0.3991,-8.400129 1.73242,-7.466797 0.53333,0.266667 2.00065,-0.932684 3.33398,-2.666016 l 2.4004,-3.1992182 -4.26758,0.933594 c -4.53332,0.9333322 -6.5332,-0.800526 -6.5332,-5.867188 0,-2.399997 -0.4991,-3.53450505 -1.23243,-3.45117205 z" id="path47" /> </svg>`);

    const wow = parseSvg(`<?xml version="1.0" encoding="UTF-8" standalone="no"?> <svg version="1.0" width="1034.8007pt" height="958.60059pt" viewBox="0 0 1034.8007 958.60059" preserveAspectRatio="xMidYMid" id="svg35" sodipodi:docname="wow_inkscape.svg" inkscape:version="1.3.2 (091e20ef0f, 2023-11-25, custom)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"> <defs id="defs35" /> <sodipodi:namedview id="namedview35" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" inkscape:document-units="pt" inkscape:zoom="0.52900426" inkscape:cx="592.62283" inkscape:cy="622.86833" inkscape:window-width="2560" inkscape:window-height="1371" inkscape:window-x="0" inkscape:window-y="0" inkscape:window-maximized="1" inkscape:current-layer="svg35" /> <metadata id="metadata1"> Created by potrace 1.16, written by Peter Selinger 2001-2019 </metadata> <g transform="matrix(0.1,0,0,-0.1,-73.19933,1045)" fill="#000000" stroke="none" id="g35"> <path d="m 8203,10443 c -13,-2 -23,-7 -23,-11 0,-4 -20,-198 -45,-432 -24,-234 -78,-751 -120,-1149 -72,-683 -91,-902 -51,-593 16,126 86,634 186,1357 23,160 48,342 56,405 9,63 26,186 38,273 l 23,157 -21,-1 c -12,-1 -31,-4 -43,-6 z" id="path1" /> <path d="m 8690,10433 -35,-4 -93,-402 c -98,-419 -190,-816 -337,-1441 -47,-202 -84,-370 -82,-372 1,-2 49,169 105,379 56,210 140,522 186,692 338,1255 313,1156 300,1153 -5,-1 -25,-3 -44,-5 z" id="path2" /> <path d="m 7740,10381 c -19,-8 -36,-16 -38,-17 -1,0 18,-234 43,-520 25,-285 57,-652 71,-814 87,-1003 94,-1042 53,-290 -10,201 -24,448 -29,550 -41,781 -51,974 -58,1036 l -7,71 z" id="path3" /> <path d="m 3933,10266 c 3,-6 30,-74 60,-151 182,-463 883,-2218 1007,-2520 33,-82 86,-212 117,-288 30,-76 57,-136 59,-134 2,2 -55,242 -127,533 -71,291 -202,819 -290,1174 -87,355 -191,776 -231,936 l -72,292 -151,48 c -82,26 -201,64 -263,85 -62,20 -111,32 -109,25 z" id="path4" /> <path d="m 7538,10258 c -33,-11 -31,23 -18,-348 15,-429 19,-578 41,-1294 11,-369 22,-672 24,-675 3,-2 5,521 5,1162 0,927 -3,1167 -12,1166 -7,0 -25,-5 -40,-11 z" id="path5" /> <path d="m 7122,10122 c -27,-13 -32,-20 -27,-41 3,-15 21,-134 40,-266 19,-132 57,-391 85,-575 28,-184 66,-443 86,-575 81,-553 122,-818 123,-795 1,14 -6,79 -14,145 -8,66 -30,257 -49,425 -55,474 -166,1445 -177,1540 -13,120 -20,160 -27,159 -4,0 -22,-8 -40,-17 z" id="path6" /> <path d="m 9090,10019 c 0,-6 -36,-97 -79,-202 -44,-106 -209,-507 -367,-892 -158,-385 -316,-770 -351,-855 -125,-301 -93,-240 102,195 87,193 206,458 265,590 59,132 194,431 300,665 106,234 201,444 211,468 l 18,42 h -49 c -30,0 -50,-4 -50,-11 z" id="path7" /> <path d="m 6678,9915 c -21,-14 -35,-31 -33,-38 2,-6 59,-196 125,-422 67,-225 157,-529 200,-675 144,-484 247,-833 290,-983 24,-81 45,-145 47,-143 2,2 -10,55 -27,117 -17,63 -101,382 -186,709 -85,327 -191,735 -236,905 -44,171 -95,365 -112,433 l -31,122 z" id="path8" /> <path d="m 9569,9892 c -9,-15 -48,-81 -86,-147 -39,-66 -94,-160 -123,-210 -59,-100 -112,-192 -142,-245 -11,-19 -57,-98 -103,-175 -272,-461 -322,-545 -350,-595 -17,-30 -107,-183 -199,-340 -190,-321 -183,-309 -169,-295 5,6 104,160 219,343 115,182 266,423 337,535 70,111 166,263 212,337 47,74 119,187 159,250 237,371 344,546 338,551 -4,4 -23,9 -42,13 -31,5 -37,2 -51,-22 z" id="path9" /> <path d="m 9758,9446 c -134,-177 -328,-433 -431,-571 -249,-329 -482,-637 -612,-808 -58,-77 -107,-133 -109,-125 -2,7 -8,28 -12,46 l -9,32 -105,-120 c -57,-66 -104,-120 -105,-120 0,0 -69,9 -154,20 -85,11 -156,18 -159,16 -2,-3 33,-65 77,-140 l 80,-135 -54,-118 c -30,-65 -61,-130 -69,-145 -8,-16 -12,-28 -8,-28 4,0 75,16 157,34 l 150,34 50,-44 c 28,-24 81,-72 120,-108 38,-36 70,-64 71,-63 1,1 8,71 15,156 7,85 18,158 23,163 6,5 71,42 144,82 l 133,73 -141,62 c -77,33 -144,61 -149,61 -4,0 -16,42 -25,93 -10,50 -19,99 -22,107 -2,9 77,116 194,261 205,255 1005,1243 1175,1452 53,66 97,123 97,126 0,4 -18,12 -40,18 l -40,10 z m -1179,-1736 11,-55 95,-40 c 52,-22 95,-42 95,-46 0,-3 -40,-27 -89,-54 l -89,-48 -6,-54 c -3,-29 -9,-78 -12,-108 l -6,-55 -80,73 -80,74 -100,-24 c -56,-13 -102,-22 -103,-21 -2,2 17,46 41,99 l 44,97 -54,88 c -30,49 -53,90 -51,92 1,2 49,-2 106,-9 l 103,-12 68,74 c 37,41 68,79 69,84 1,11 20,-66 38,-155 z" id="path10" /> <path d="m 10113,9578 C 9427,8557 8895,7759 8919,7790 c 11,14 109,149 217,300 178,248 461,642 814,1130 219,304 350,488 350,493 0,3 -11,8 -24,11 -13,3 -31,8 -39,12 -11,4 -46,-41 -124,-158 z" id="path11" /> <path d="m 3022,9662 c 3,-8 214,-297 591,-810 59,-81 139,-190 177,-242 38,-52 139,-189 225,-305 85,-115 210,-284 277,-375 260,-351 711,-955 721,-965 10,-10 -39,85 -143,275 -31,58 -101,186 -155,285 -54,99 -124,227 -155,285 -32,58 -89,164 -128,235 -154,286 -311,574 -581,1071 l -284,521 -251,12 c -138,7 -262,14 -274,17 -13,3 -22,1 -20,-4 z" id="path12" /> <path d="M 10364,9216 c -153,-154 -530,-535 -838,-846 -522,-525 -630,-638 -396,-414 52,50 415,392 805,759 391,367 728,684 749,705 l 39,38 -41,20 -41,20 z" id="path13" /> <path d="m 2261,9189 c -139,-37 -255,-70 -256,-71 -2,-2 92,-70 207,-153 116,-82 261,-186 322,-230 61,-44 193,-139 294,-210 101,-72 218,-155 260,-186 74,-54 523,-373 687,-489 44,-31 136,-96 205,-145 69,-49 244,-172 390,-275 146,-102 288,-203 316,-223 28,-20 54,-37 58,-37 3,0 -26,30 -65,68 -40,37 -538,507 -1107,1045 -570,537 -1040,977 -1046,976 -6,0 -125,-32 -265,-70 z" id="path14" /> <path d="m 10973,9167 c -15,-13 -113,-91 -218,-172 -302,-237 -616,-482 -945,-740 -168,-131 -374,-292 -457,-357 -84,-65 -153,-121 -153,-125 0,-3 6,-1 13,4 27,22 263,194 652,478 226,164 464,338 530,386 66,49 208,153 315,231 108,79 235,172 283,207 l 87,64 -32,23 c -39,29 -40,29 -75,1 z" id="path15" /> <path d="m 5999,8457 -117,-106 -152,35 c -84,19 -153,34 -155,32 -2,-2 26,-68 61,-146 l 65,-143 -82,-135 c -45,-74 -80,-136 -78,-138 2,-2 74,5 159,15 149,18 156,18 170,1 119,-141 195,-222 199,-211 2,8 18,79 35,157 l 31,144 148,62 149,63 -139,78 c -76,43 -139,79 -140,80 -2,1 -8,60 -14,131 -6,71 -14,142 -17,158 l -7,29 z m 69,-61 c 0,-13 3,-62 7,-109 l 7,-84 95,-53 95,-53 -98,-42 -99,-42 -18,-79 c -35,-153 -22,-146 -102,-53 l -69,81 -71,-6 c -38,-4 -87,-10 -108,-13 l -38,-6 44,74 c 24,41 49,83 56,94 11,17 6,34 -33,118 -24,53 -42,97 -38,97 4,0 44,-9 90,-20 46,-11 92,-20 104,-20 11,0 54,31 96,70 42,39 77,70 78,70 1,0 2,-11 2,-24 z" id="path16" /> <path d="m 1741,8393 c -62,-50 -111,-82 -120,-80 -9,3 -64,19 -122,36 -58,17 -111,31 -117,31 -5,0 12,-57 39,-126 l 49,-126 -76,-109 c -42,-61 -74,-112 -72,-115 3,-2 62,-1 133,4 148,9 126,20 228,-115 38,-52 72,-92 74,-90 2,2 19,59 37,126 18,68 37,126 42,131 5,5 63,28 129,51 66,23 121,42 122,43 2,1 -49,36 -112,76 l -115,74 -1,80 c -1,45 -4,106 -8,137 l -6,56 z m 55,-65 c 0,-13 1,-53 2,-90 l 2,-66 77,-51 c 73,-47 75,-51 52,-59 -159,-57 -147,-49 -164,-108 -8,-29 -18,-67 -21,-84 -4,-16 -10,-30 -15,-30 -5,0 -31,31 -59,69 l -51,70 -92,-6 -91,-6 18,29 c 11,16 34,51 52,78 l 32,48 -24,66 c -14,36 -30,74 -35,84 -12,23 -11,23 89,-7 l 83,-24 67,54 c 36,30 69,55 72,55 3,0 6,-10 6,-22 z" id="path17" /> <path d="m 8131,8184 c 0,-11 3,-14 6,-6 3,7 2,16 -1,19 -3,4 -6,-2 -5,-13 z" id="path18" /> <path d="m 8121,8144 c 0,-11 3,-14 6,-6 3,7 2,16 -1,19 -3,4 -6,-2 -5,-13 z" id="path19" /> <path d="m 7903,8055 c 0,-22 2,-30 4,-17 2,12 2,30 0,40 -3,9 -5,-1 -4,-23 z" id="path20" /> <path d="m 7432,7810 c 0,-19 2,-27 5,-17 2,9 2,25 0,35 -3,9 -5,1 -5,-18 z" id="path21" /> <path d="m 9169,7753 c -13,-16 -12,-17 4,-4 9,7 17,15 17,17 0,8 -8,3 -21,-13 z" id="path22" /> <path d="m 2439,7400 c -79,-177 -108,-232 -123,-235 -12,-3 -125,-24 -253,-48 l -232,-42 165,-150 c 90,-83 176,-160 190,-173 l 25,-22 -25,-183 c -45,-321 -45,-319 -28,-312 8,3 67,36 131,72 64,37 157,90 207,119 l 91,51 134,-64 c 174,-85 320,-153 326,-153 2,0 2,8 -1,18 -15,46 -96,459 -94,474 2,9 80,97 175,196 l 172,179 -97,11 c -53,6 -168,19 -255,28 l -158,18 -120,223 c -67,123 -122,223 -124,223 -1,0 -49,-104 -106,-230 z m 167,-115 c 20,-38 42,-77 48,-85 6,-8 22,-37 35,-63 29,-57 40,-63 141,-70 74,-6 131,-13 200,-23 33,-5 34,-7 15,-20 -10,-8 -16,-14 -13,-14 3,0 -34,-39 -83,-87 -72.496,-66.3984 -86.2057,-83.0904 -104.7155,-103.9457 C 2830.2767,6805.8136 2823,6797 2834,6745 c 3,-16 11.6825,-46.7724 14.6825,-66.7724 7.8429,-28.9999 10.8666,-33.6691 14.3175,-51.2276 2.3647,-12.0321 5,-54 15,-94 11,-40 18,-74 16,-76 -2,-2 -61,25 -131,59 -18.674,16.1544 -130.6779,54.5363 -143,63 -12.3643,8.4926 -37,23 -57,12 -10,-5 -47,-27 -83,-48 -125,-73 -190,-107 -194,-102 -2,2 5,60 15,129 10,69 21,144 24,168 5,34 -2.871,31.5246 -9,42 -7.5509,12.9056 -11.475,27.7609 -195,182 -25,21 -43,40 -40,42 2,2 56,14 119,26 63,12 122,23 130,25 8,2 29.7096,6.204 44.7096,6.204 20.5281,6.4333 29.0355,1.8687 37.2836,12.1011 C 2421.5452,7088.5612 2427,7096 2449,7147 c 84,191 105,232 113,220 4,-6 24,-43 44,-82 z" id="path23" sodipodi:nodetypes="cccccccccccccsccccccccsccsccccsccccscscscccscsccsscccsc" /> <path d="m 6271.4449,7432.3144 c -41.7741,-7.0276 -57.9134,-21.4474 -53.3646,-51.5631 9.0421,-86.16 37.1989,-199.4289 87.9197,-368.7513 46,-152 84,-280 84,-284 0,-3 -25,8 -56,27 -145,88 -330,139 -499,138 -499,-1 -561,-7 -725,-72 -260,-102 -496,-334 -634,-624 -46,-97 -111,-286 -122,-357 -4,-22 -10,-38 -14,-33 -4,4 -54,167 -111,361 -78,269 -107,352 -118,352 -9,0 -63,-20 -121,-45 -102,-44 -119,-45 -120,-10 0,6 -5,27 -11,48 -13,48 -44,62 -102,46 -48,-13 -226,-91 -403,-176 l -120,-58 181,-455 c 100,-250 181,-456 180,-457 -1,-2 -80,49 -176,112 l -174,116 -5,-76 -5,-76 -181,121 c -100,66 -184,120 -188,120 -3,0 -7,-161 -8,-357 l -3,-357 -279,300 c -154,164 -281,301 -283,303 -2,3 -44,-15 -94,-39 l -90,-44 -67,72 -67,72 -49,-25 c -27,-14 -50,-24 -51,-23 -4,4 -35,154 -35,166 0,6 76,90 170,188 93,98 170,181 170,184 0,4 -111,18 -247,33 -136,15 -250,30 -254,34 -3,5 -57,103 -119,218 -61,116 -115,213 -118,217 -4,4 -54,-98 -111,-226 l -104,-232 -248,-44 c -137,-25 -248,-48 -247,-52 2,-4 62,-59 133,-124 72,-64 154,-140 184,-167 l 53,-50 -27,-201 c -14,-111 -29,-219 -31,-241 -3,-22 -7,-46 -10,-53 -2,-7 22,1 54,19 31,18 130,75 220,126 90,51 167,93 172,93 14,0 80,-33 80,-39 0,-3 -49,-30 -108,-59 -326,-163 -422,-228 -422,-286 0,-31 77,-108 1067,-1062 587,-566 1090,-1050 1119,-1076 l 51,-47 119,74 c 65,41 121,75 124,75 3,0 21,-16 40,-35 19,-19 38,-35 43,-35 5,0 101,57 212,126 l 202,126 -45,151 c -24,84 -59,200 -77,260 -17,59 -29,107 -25,107 5,0 91,-85 192,-190 115,-118 192,-190 204,-190 29,0 119,45 189,94 l 63,44 39,-39 39,-40 59,30 c 51,26 170,110 283,201 l 32,25 -39,128 c -29,97 -35,125 -22,115 9,-7 41,-33 71,-59 101,-85 241,-164 377,-212 249,-90 550,-76 782,37 30,14 56,25 57,23 1,-1 -6,-63 -17,-137 -11,-74 -18,-143 -17,-153 2,-15 36,1 188,88 101,58 189,105 195,104 5,0 96,-42 200,-93 105,-51 191,-92 193,-91 2,2 -50,256 -78,379 l -11,49 48,51 c 26,28 92,96 146,152 l 98,101 137,2 c 75,2 148,4 161,4 22,2 27,-5 41,-50 8,-29 18,-55 22,-58 6,-7 500,13 506,20 2,2 31,122 64,267 32,145 62,271 66,281 6,15 117,-371 140,-487 12,-64 44,-80 153,-79 51,1 113,4 139,8 l 48,7 7,-44 c 13,-75 16,-78 104,-78 h 78 l -14,-92 c -7,-51 -12,-98 -11,-104 2,-7 98,42 221,113 l 217,125 133,-64 c 72,-34 175,-84 227,-109 52,-26 96,-45 98,-44 2,2 -20,114 -48,250 l -52,247 83,87 c 46,47 126,130 178,183 l 94,97 -34,5 c -19,3 -122,15 -229,26 -107,11 -207,23 -222,26 -22,4 -36,23 -77,99 l -51,93 62,281 c 34,155 65,281 68,281 3,0 40,-33 82,-73 l 78,-72 -30,-215 c -16,-118 -32,-233 -36,-254 l -6,-39 33,19 c 184,108 408,234 416,234 6,0 108,-47 227,-105 119,-58 220,-105 224,-105 5,0 -15,111 -44,247 l -51,248 171,178 c 94,98 172,182 174,186 1,4 -111,20 -250,35 -139,15 -253,28 -253,29 -1,1 -46,85 -100,187 -55,102 -109,202 -121,223 l -21,38 -68,-153 c -37,-84 -85,-189 -106,-234 l -37,-80 -114,-21 c -62,-11 -114,-20 -115,-19 -2,1 211,948 263,1164 13,57 24,110 24,117 0,15 -26,20 -165,36 -55,6 -101,12 -103,14 -2,1 4,29 12,61 26,100 1,116 -221,139 -117,11 -403,35 -434,35 -4,0 -9,-31 -13,-69 -4,-38 -9,-80 -11,-93 -4,-26 -41,-295 -80,-593 -15,-110 -30,-218 -34,-240 l -7,-40 -103,204 c -75,150 -105,201 -112,190 -5,-8 -24,-40 -41,-72 -17,-32 -35,-54 -39,-50 -4,4 -51,94 -105,198 -53,105 -100,194 -104,198 -4,4 -44,-59 -90,-140 -46,-81 -97,-173 -115,-203 -45,-78 -140,-250 -158,-284 -18,-36 -3,-87 -126,418 -55,225 -102,411 -105,413 -3,3 -47,8 -98,12 -52,4 -99,10 -104,14 -6,3 -19,42 -29,86 -10,44 -21,85 -25,92 -16,25 -931.5551,77.3144 -1098.5551,61.3144 z M 6910,7309 c 107,-6 218,-13 245,-15 28,-3 66,-6 85,-7 19,-1 40,-6 46,-10 7,-4 17,-37 23,-74 7,-38 16,-81 21,-98 14,-45 129,-509 135,-547 3,-18 13,-58 21,-88 9,-30 17,-62 19,-70 l 20,-80 c 9,-36 18,-74 19,-85 2,-11 11,-47 21,-80 9,-33 18,-69 20,-80 3,-21 23,-103 49,-199 16,-60 35,-91 43,-71 6,15 80,148 170,307 44,78 84,153 88,166 6.6175,11.5536 21.7478,37.1526 23.9831,41.021 6.6457,11.5009 33.9621,56.9392 40.4826,72.5401 8.3228,12.9828 15.4686,27.2808 22.4709,37.3607 8.75,8.5718 29.0634,44.0782 53.0634,89.0782 24,46 46.7691,90 53.7691,98 9.0575,16.5899 12.4505,22.7377 25.2309,47 10.4335,18.8434 21.4372,38.2723 24.7891,43.4632 C 8181.5014,6710.6636 8188,6723 8199,6732 c 17,15 20,12 52,-56 19,-39 36,-73 39,-76 3,-3 16,-25 29,-50 14,-25 28.7019,-45.8454 31.6687,-50.8651 12.4175,-21.0094 10.7824,-22.6306 36.3313,-77.1349 30.3673,-64.0665 62.103,-132.4086 99,-190 10.5179,-21.2212 36.342,-74.1798 53.0142,-103 11.1951,-23.9624 33.7268,-57.8993 40.9858,-71 10.9486,-19.7595 162,-338 170,-333 6,4 18,84 26,180 2,22 8,58 13,80 5,22 12,73 15,113 3,41 8,77 11,82 2,4 7,30 9,56 3,27 19,150 36,274 17,124 44,325 60,448 16,123 32,232 35,243 7,22 35,24 140,8 39,-6 96,-10 129,-10 6.4933,-0.9731 86.1593,-5.9537 87,-5 10.822,-3.4193 30.2738,-4.8492 47.4967,-5.9318 29.199,-0.4597 42.7836,-5.2181 53.3601,-8.2405 11.6303,-2.5729 15.2355,-9.5989 12.786,-16.5989 C 9421.98,7155.619 9410,7113 9399,7068 c -11,-46 -24,-99 -29,-118 -5,-19 -17,-71 -25,-114 -9,-44 -18,-82 -20,-86 -2,-3 -7,-29 -10,-56 -3,-27 -10,-60 -15,-74 -5,-14 -14,-50 -20,-80 -6,-30 -17,-77 -25,-105 -7,-27 -18,-75 -25,-105 -6,-30 -16,-68 -20,-85 -11,-37 -39,-178 -44,-222 -3,-18 -7,-37 -11,-43 -6,-10 -39,-151 -60,-255 -5,-22 -9,-42 -10,-45 -7,-21 -42,-180 -55,-245 -6,-33 -25,-116 -42,-185 -16,-69 -34,-147 -38,-175 -5,-27 -22,-110 -39,-183 -17,-73 -31,-141 -31,-152 0,-21 -2,-22 -130,-45 -52,-9 -124,-23 -160,-31 -36,-8 -75,-14 -87,-14 -13,0 -23,-3 -23,-7 0,-7 124,-123 132,-123 2,0 42,-37 90,-83 l 86,-82 -5,-47 -5,-46 -62,-10 c -228,-38 -323,-46 -340,-29 -7,7 -19,37 -25,67 -7,30 -17,69 -22,85 -21,72 -71,250 -75,264 -4,20 -43,166 -54,206 -4,17 -17,57 -28,90 -10,33 -27,87 -36,120 -9,33 -21,74 -27,92 -5,18 -12,40 -14,50 -12,55 -37,143 -50,173 -8,19 -26,80 -41,135 -15,55 -29,107 -31,115 -6,22 -33,-16 -33,-47 0,-23 -9,-62 -70,-318 -25,-104 -52,-225 -66,-302 -10.0606,-32.2642 -13.5213,-66.8315 -24,-99 -6,-14 -17,-58 -26,-97 -9,-40 -23,-99 -31,-132 -19,-77 -29,-126 -44,-200 -15,-81 -26,-90 -107,-91 -37,-1 -128,-5 -202,-9 -110,-6 -138,-5 -147,6 -6,8 -20,46 -31,84 -12,39 -35,115 -51,170 -16,55 -46,156 -67,225 -20,69 -40,134 -44,145 -4,11 -18,54 -29,95 -12,41 -33,112 -47,157 -14,45 -21.6605,86.0481 -23.4167,92 L 6816,5675 c -2,6 -5,17 -8,25 -20,57 -73,234 -99,330 -18,63 -42,144 -54,180 -12,36 -39,124 -60,195 -21,72 -44,150 -52,175 -8,25 -16,50 -17,55 -7,29 -74,253 -136,450 -42,134 -61,208 -56,221 3,7 15,14 28,16 43,6 351,-1 548,-13 z M 5640,6776 c 38.1744,-4.3914 104.544,-21.5879 119.1446,-24.319 35.9794,-18.3686 63.0056,-25.079 98.8554,-41.681 133,-60 287.9264,-150.9597 362.9264,-229.9597 21.4618,-21.2018 52.021,-48.4436 66.7355,-65.5802 17.8736,-15.0273 21.1122,-21.398 30.3381,-31.4601 41.8471,-31.8739 106.0809,-152.2853 136,-197 49,-73 148,-253 152,-276 0,-3 8,-23 18,-45 45,-103 101,-316 127,-480 6,-38 11,-154 11,-256 -1,-207 -18,-335 -71,-514 -45,-152 -55,-176 -70,-173 -7,2 -36,47 -64,101 -28,53 -55,97 -59,97 -7,0 -64,-115 -120,-240 -11,-25 -29,-65 -41,-89 l -22,-44 -165,-33 c -91,-18 -177,-34 -191,-34 -15,0 -31,-6 -37,-13 -12,-14 -20,-5 165,-176 56,-51 101,-99 100,-105 -6,-34 -220,-126 -338,-145 -82,-14 -225,-14 -306,-1 -99,16 -240,69 -343,128 -169.8163,110.9648 -178.9709,122.6383 -193,133 -15.9363,13.4241 -205,207 -212,239 -13.6338,35.5264 -20.7564,74.4328 -35,115 -10,28 -31,97 -49,155 -17,58 -40,132 -51,165 -11,33 -22,67 -24,75 -2,8 -9,33 -15,55 -6,22 -11,43 -11,47 0,5 -8,32 -19,60 -32,93 -50,152 -55,178 -2,14 -21,77 -41,140 -21,63 -43,138 -50,165 -7,28 -17,61 -22,75 -12,30 -8,120 8,210 6,36 13,79 16,95 7,38 9,46 16,65 3,8 11,38 17,65 7,28 24,74 36,103 13,29 24,56 24,61 0,11 69,143 81,156 0.7578,0.7578 23.0959,46.2988 26.6012,53.5526 7.6854,11.5099 6.0416,10.2445 42.3988,61.4474 39.2207,55.2356 125,149 205,221 79,70 290,174 375,185 14,1 37,6 53,11 51,15 241,15 317,-1 z M 3769,6441 c 8,-5 10.9437,-24.4814 15,-40 11.3853,-33.32 12.395,-37.5008 19,-58 14,-68 19,-89 26,-108 14,-34 38,-112 96,-315 31,-107 62,-205 68,-218 6,-12 9.747,-37.2619 16.732,-55.6016 12.2325,-32.8913 15.2652,-53.464 35.268,-122.3984 2,-10 15,-57 29,-104 15,-47 33,-109 41,-138 8,-28 22,-68 30,-88 8,-20 15,-44 15,-54 0,-10 11,-51 24,-91 23,-72 74,-235 115,-371 12,-37 23,-75 24,-85 2,-10 10,-31 16,-48 7,-16 14,-37 16,-45 26.9631,-90.8462 46.0076,-185.6613 80,-275 8,-17 26,-76 40,-130 14,-55 29,-111 34,-125 5,-14 19,-59 31,-100 13,-41 28,-86 34,-99 12,-27 22,-18 -166,-148 -66,-46 -125,-83 -131,-83 -14,0 -598.875,591.7615 -609,603 -62.5298,52.0657 -131.8736,120.371 -193,180 -99,96 -174.4471,175.0171 -187,171 -12,-8 -0.8295,-38.9404 6.9951,-70.0368 8.708,-26.1019 14.4126,-43.626 29.0049,-99.9632 2,-12 14,-52 26,-90 12,-38 26,-82 30,-99 22,-80 51,-179 78,-270 46,-154 133,-446 144,-485 24,-85 26,-80 -66,-140 -46,-30 -102.4097,-68.1872 -132.0507,-87.5026 -15.8831,-11.955 -60.1516,-39.2903 -82.2287,-52.0718 C 3294.5344,3085.1577 3262,3088 3151,3197 c -118,117 -248,243 -561,543 -111,107 -242,233 -290,280 -123,119 -303,293 -540,520 -111,107 -295,285 -408,396 l -206,201 c 141.1898,78.9273 269.0765,153.7165 408,223 l 143,71 39,-20 c 21,-11 45.5961,-19.8801 53.2293,-23 7.2743,-2.9732 15.6747,-7.5771 20.5382,-9.7275 C 1814.3382,5375.2567 1839,5361 1868,5346 c 49,-25 58,-25 52,-1 -1,6 -9,46 -16,89 -13,72 -13,80 2,98 12,12 24,16 38,12 14.5837,-4.8785 31.7943,-10.7092 40.2845,-18.019 C 1989.675,5520.981 2032,5470 2090,5408 c 58,-62 136.114,-144.6201 173.1515,-182.9988 38.5891,-37.1401 71.0169,-67.5471 75.8485,-74.0012 2.6531,-3.5441 2.9213,-3.8243 6.9114,-8.0459 6.0597,-7.6861 44.5183,-46.0002 55.589,-56.5365 7.2807,-8.8524 8.2175,-7.2028 14.0162,-14.5042 8.4058,-9.0778 17.7203,-20.3882 30.0391,-34.8136 11.8408,-13.0513 10.0538,-9.8394 16.5552,-18.0642 8.6139,-9.733 20.0171,-22.0003 38.9385,-44.5767 109,-119 99.1867,-108.4045 105.5008,-114.349 3.6249,-4.2667 26.456,-28.847 29.3741,-34.3434 7.999,-8.2964 15.7364,-15.8197 33.2426,-35.7528 C 2688.0979,4771.4593 2720,4737 2738,4717 c 18,-20 31.8364,-32.1424 35.7441,-35.2616 4.1694,-3.328 10.3154,-11.5864 15.0912,-16.3295 4.2572,-4.2281 28.6826,-31.0735 52.2368,-59.7046 25.4601,-28.8396 41.3907,-48.9309 44.6212,-52.7473 4.6148,-5.4517 6.9019,-7.9836 11.4054,-12.3673 3.9444,-3.3756 2.6083,-2.5412 6.4169,-6.0868 7.0292,-7.8193 42.9058,-41.9987 46.7137,-38.5029 5,3 9.7707,232 9.7707,509 0,330 0.878,476.615 4.4772,489.1067 1.9456,8.4557 2.0866,30.3636 2.5241,38.3436 1.4768,16.0519 43.7315,-6.0154 61.7315,-23.0154 13.1136,-6.933 21.5898,-13.53 23.1359,-18.1476 C 3060.3994,5486.5325 3120,5442 3207,5384 c 87,-59 164,-107 171,-107 48.1715,-38.794 106.5568,-77.48 161,-112 9,-6 48,-32 88,-59 39,-26 73.5598,-42.0354 79.3391,-44.9225 5.0144,-4.8417 21.5142,-16.2187 27.7121,-21.2768 11.7928,-9.624 102.1323,-71.8127 110.6084,-74.4858 4.7093,-4.1268 14.2812,-5.8656 25.2812,-18.8656 L 3891,4925 l -7,35 c -3,19 -15,53 -25,74 -11,22 -19,43 -19,48 0,8 -44,112 -60,140 -3.7008,10 -8.0911,24 -10,31 -2.1048,7.7182 -13,40 -29,73 -16,32 -37,84 -47,114 -9,30 -25,69 -34,86 -10,17 -19.2916,46 -25,65 -5.5868,18.5954 -12.3492,37.0922 -15,44 -4,6 -13,27 -19,48 -8.7841,31.0686 -29.6755,61.7388 -41,93 -2.7248,7.5217 -9,34 -20,56 -11,23 -18.6086,45 -20,50 -1.3405,4.817 -9,27 -19,51 -11,23 -32,75 -47,115 -15,39 -30.2139,64.9952 -33.1505,73.1069 -5.0803,14.0335 -10.3201,37.25 -18.8495,55.8931 -11,21 -23,52 -26,68 l -7,31 128,61 c 70,34 143,66 161,72 18,5 42,17 54,26 25,17 37,18 57,6 z m -2289,-73 c 6,-12 33,-63 61,-113 27,-49 53,-98 56,-107 3,-10 12,-19 19,-19 8,-1 17,-2 22,-3 9,-3 118,-15 187,-22 28,-2 67,-7 87,-10 l 38,-6 -113,-120 c -61,-66 -113,-126 -115,-134 -2,-8 9,-69 24,-137 32,-144 39,-187 29,-187 -3,0 -72,31 -152,70 l -145,69 -36,-18 c -21,-11 -72,-39 -114,-65 -42,-25 -94,-54 -115,-65 l -38,-19 23,169 24,169 -68,63 c -38,35 -95,86 -126,113 -31,27 -57,51 -57,54 -1,3 75,19 168,35 l 169,29 23,55 c 12,31 42,98 66,149 23,51 43,98 43,105 0,13 25,-21 40,-55 z m 8572,-550 c -2.07,-34.9435 44.069,-72.7361 56,-90 24.975,-23.2738 46,-17 152,-29 85,-10 163.555,-18.9221 173.555,-18.9221 13,-1 -15.555,-36.0779 -102.555,-125.0779 -114,-118 -113.363,-108.9076 -111.994,-133.8701 0.606,-11.0468 1.835,-15.3307 3.081,-21.3307 0.274,-7.769 10.913,-74.7992 27.913,-154.7992 16,-80 30,-148 30,-150 0,-2 -53,22 -117,54 -65,32 -135,66 -155,76 l -38,17 -147,-85 c -81,-47 -149,-85 -150,-84 -1,1 9,76 22,167 14,100 20,171 14,180 -4,8 -9,13 -9,10 0,-3 -30,23 -67,58 -38,35 -89,82 -115,105 -55,46 -56.5192,50.0454 -21.0381,60.5379 26.6088,7.8688 25.2131,6.3166 41.0381,9.4621 17.6972,2.112 80,7 146,20 l 119,22 70,158 71,157 33,-62 c 19,-35 52,-98 75,-140 z M 9260,4805 c 46,-85 88,-155 94,-155 23,0 321,-33 325,-36 4,-4 9,2 -128,-138 l -104,-106 35,-170 c 20,-94 34,-170 33,-170 -2,0 -72,34 -156,75 -112,55 -155,71 -161,62 -4,-6 -8,-9 -8,-4 0,4 -18,-4 -40,-18 -22,-14 -41,-25 -44,-25 -2,0 -46,-25 -97,-55 -51,-30 -94,-53 -96,-51 -2,2 3,55 11,117 30,220 30,223 7,243 -12,11 -21,16 -21,13 0,-3 -21,15 -47,41 -27,26 -73,70 -105,99 -60,56 -60,56 12,68 35,5 192,34 220,40 8,2 22,4 31,4 11,1 31,33 59,99 23,53 53,118 66,144 13,26 24,54 24,63 0,8 2,15 4,15 2,0 41,-70 86,-155 z M 7094,4390 c 24,-80 42,-147 41,-148 -3,-4 -227,19 -233,23 -1,1 13,27 31,58 19,31 52,95 73,142 21,47 40,82 41,78 1,-4 22,-73 47,-153 z m -518,-65 c 19,-33 41,-76 49,-96 l 16,-35 136,-13 c 74,-7 141,-15 149,-18 7,-3 -25,-43 -87,-106 -54,-56 -99,-109 -99,-117 0,-8 13,-77 29,-152 l 28,-137 -120,60 c -66,34 -129,63 -140,65 -11,2 -43,-11 -71,-28 -103,-63 -196,-109 -196,-96 1,7 9,73 19,146 l 18,133 -108,97 c -59,53 -108,99 -108,102 -1,3 45,13 102,23 56,10 109,19 117,22 8,2 27,4 41,4 24,1 32,12 78,114 28,63 51,118 51,123 0,6 5,15 12,22 12,12 19,3 84,-113 z" id="path24" sodipodi:nodetypes="cccscccccccscccccccccccccscccccccccsscssccccccccccccccssscsccccsssccccscscccccccccccccsccccccccccccccccscccccsccccccccccccccsccccsccccccsssccccsccccccccccsccccssscccccsscssccccccsccccscccccssccccsccscccccsccscscccsccscccssccccccscsccsssccccccscccsscsssscccccscccccscccscsccccccccccscscsccccscscccccccccccccccccccscsccsscccccccccssssccccccccccsccsccccccccccccccssccccsccscccscccccscccscccccccccccscccccccscscccccccccssscscccscccccscccscccccscscccsccscsccsccccccccccccccccscscccccccccscccccsccccccsccsccccsccsccsccccccccsccccscssssssccsccccccssscccccsscccccccscccsccccccccccssc" /> <path d="m 5392,5804 c -15.9303,-4.8738 -25.6518,-10.8646 -48.0677,-23.9794 -9.168,-5.5861 -14.0578,-10.1732 -22.8486,-19.457 C 5295.195,5733.2229 5296.4932,5728.347 5250,5620 c -31,-93 -38,-267 -15,-378 l 61,-202 c 7,-8 15,-26 19,-40 9.7286,-41.694 120.9155,-167.0257 170,-192 9.8004,-4.9865 22.9802,-12.2845 33,-15 20.5522,-8.0845 109.5807,-10.4622 122,-4 56.7017,29.504 61.2983,33.6636 71.1539,45.5312 12.9755,16.1421 14.462,16.4688 20.462,28.4688 6,12 14.4046,29 19.4046,37 15.2682,29.1552 35.9795,84 47.9795,138 15,73 13,244 -3,314 -8,31 -12.8805,58.7952 -13.6543,61.5157 C 5780.4251,5420.2684 5772,5465 5743,5529 c -11.8612,39.9087 -37.6359,85.609 -48.1156,104.5502 -8.2008,16.8741 -60.3487,80.9621 -78.2171,100.9435 -23.3373,26.0967 -41.6242,41.457 -57.9339,49.9787 C 5543.9573,5795.3218 5484,5819 5449,5818 c -14,0 -40,-6 -57,-14 z" id="path25" sodipodi:nodetypes="ccsccccscscscccsccsccc" /> <path d="m 7717,3827 c -3,-8 -13,-78 -23,-157 l -18,-142 -146,-73 -145,-73 146,-70 145,-70 23,-153 c 13,-85 25,-156 27,-158 3,-3 53,46 112,109 l 108,113 114,-17 c 63,-10 125,-20 137,-23 27,-6 208,-281 680,-1032 60,-96 114,-176 119,-178 6,-2 36,15 67,38 l 58,40 -29,37 c -34,45 -527,670 -627,797 -236,298 -243,307 -215,290 20,-12 9,13 -61,145 l -72,134 72,143 c 39,79 66,143 60,143 -6,0 -76,-12 -156,-26 l -145,-26 -113,112 c -78,78 -114,107 -118,97 z m 307,-267 c 55,11 101,18 104,16 2,-2 -18,-46 -44,-97 l -48,-93 48,-89 c 26,-48 46,-91 43,-94 -3,-3 -50,2 -103,11 l -98,17 -76,-76 -77,-77 -12,79 c -22,145 -12,130 -119,180 l -97,45 96,49 c 107,53 101,43 115,179 4,36 9,69 12,74 2,4 39,-26 81,-68 l 76,-75 z" id="path26" /> <path d="m 8655,3420 c 97,-88 346,-330 722,-704 l 353,-350 49,54 c 28,30 50,58 51,61 0,3 -199,165 -442,360 -243,195 -515,413 -604,485 -180,146 -218,174 -129,94 z" id="path27" /> <path d="m 9126,3382 c 202,-117 413,-245 937,-569 164,-102 300,-183 301,-181 11,11 68,130 65,133 -4,3 -558,272 -749,363 -52,24 -223,107 -379,183 -156,77 -286,139 -289,139 -3,0 48,-31 114,-68 z" id="path28" /> <path d="m 8410,3214 c 115,-108 229,-219 750,-732 l 275,-270 45,51 c 25,28 45,56 45,61 0,6 -117,105 -260,219 -143,115 -345,278 -450,361 -104,84 -264,212 -355,286 l -165,132 z" id="path29" /> <path d="M 4240,2269 C 3676,1696 3155,1165 3081,1088 l -134,-139 30,-42 c 17,-22 34,-42 39,-43 5,-2 476,507 1047,1129 570,623 1054,1150 1075,1172 91,97 134,145 131,145 -3,0 -465,-469 -1029,-1041 z" id="path30" /> <path d="m 4558,2852 c -186,-119 -535,-343 -775,-496 -241,-154 -589,-376 -773,-494 -184,-118 -409,-262 -500,-320 -187,-119 -363,-233 -368,-237 -2,-2 8,-26 23,-54 17,-34 30,-49 38,-44 7,4 273,187 592,407 319,220 646,445 727,500 172,119 384,265 483,333 39,27 122,84 185,128 63,43 135,93 160,110 25,18 151,104 280,193 241,164 279,191 270,191 -3,0 -157,-97 -342,-217 z" id="path31" /> <path d="m 4408,2993 c 6,-2 18,-2 25,0 6,3 1,5 -13,5 -14,0 -19,-2 -12,-5 z" id="path32" /> <path d="m 4285,2979 c -27,-4 -230,-35 -450,-68 -220,-33 -551,-82 -735,-110 -184,-27 -414,-62 -510,-76 -96,-14 -371,-55 -610,-91 -468,-70 -769,-114 -776,-114 -2,0 -4,-27 -4,-60 0,-33 2,-60 5,-60 5,0 158,28 1275,235 311,58 763,141 1005,186 242,44 546,100 675,124 129,24 222,43 205,43 -16,0 -52,-4 -80,-9 z" id="path33" /> <path d="M 4240,2840 C 4058,2779 3721,2669 3005,2435 2644,2318 1818,2048 1467,1933 l -108,-35 7,-42 c 13,-82 -11,-85 314,34 510,186 1367,499 1575,575 110,40 418,153 685,250 267,97 487,178 489,181 9,9 -21,0 -189,-56 z" id="path34" /> <path d="m 5646,2643 c -9,-70 -19,-142 -22,-160 -6,-29 -16,-36 -151,-103 l -146,-71 144,-70 c 79,-39 145,-72 147,-74 2,-2 12,-61 23,-132 32,-213 14,-205 143,-69 l 111,117 145,-26 c 80,-13 151,-25 158,-25 8,0 -17,57 -62,142 l -75,142 75,143 c 41,79 74,143 72,143 -2,0 -73,-13 -158,-29 l -155,-29 -116,115 -116,115 z m 317,-160 c 51,9 98,17 105,17 6,0 -11,-42 -38,-93 l -49,-93 25,-50 c 15,-27 37,-68 51,-92 14,-24 23,-45 21,-47 -2,-2 -50,4 -107,13 l -103,16 -74,-76 c -42,-42 -77,-71 -79,-65 -2,7 -9,52 -15,101 -6,50 -13,92 -15,95 -2,4 -44,26 -94,51 -50,24 -91,47 -91,50 0,3 42,26 93,52 l 94,46 13,107 12,107 79,-78 78,-77 z" id="path35" /> </g> </svg>`);

    const stickGoodJob = parseSvg(`<?xml version="1.0" encoding="UTF-8" standalone="no"?> <svg width="468.9866" height="487.56824" version="1.1" id="svg93" sodipodi:docname="good_job_center1.svg" inkscape:version="1.3.2 (091e20ef0f, 2023-11-25, custom)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"> <defs id="defs93" /> <sodipodi:namedview id="namedview93" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" inkscape:zoom="1.6089441" inkscape:cx="78.622993" inkscape:cy="299.26459" inkscape:window-width="2560" inkscape:window-height="1371" inkscape:window-x="0" inkscape:window-y="0" inkscape:window-maximized="1" inkscape:current-layer="svg93" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 278.87172,0.56817883 c 10.594,-0.7414 17.797,4.72759997 27,8.99079997 7.859,3.6402002 12.303,2.0948002 19,9.0092002 m -109,-15.0000002 c 1.718,4.5881 1.454,9.4339002 3.022,14.0000002 1.158,3.3697 2.591,6.4752 3.312,10 0.396,1.9373 0.784,4.0299 0.333,5.9962 -4.893,21.3751 -37.332,-7.0734 -13.663,-14.5525 2.956,-0.9343 5.917,-1.3095 8.996,-1.4437 m 87,-8.0000002 c -7.481,10.4001002 -0.27,26.7272002 -7.843,37.9421002 -10.67,15.8013 -21.156,-4.817 -21.157,-14.9421" id="path1" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 347.87172,24.271879 c 7.771,-2.5874 14.275,4.2183 15.876,11.2963 2.428,10.7331 0.433,25.7325 -11.876,29.6412 -25.604,8.1302 -24.621,-34.0718 -4,-40.9375" id="path6" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 168.87272,29.140679 c 13.707,-3.9296 19.633,16.0314 6.984,20.6705 -12.981,4.7607 -21.205,-16.5937 -6.984,-20.6705" id="path9" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 132.87172,43.126079 c 16.661,-2.0561 19.72,23.2812 4,25.9298 -16.018,2.6989 -21.674,-23.7488 -4,-25.9298" id="path95" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 86.871719,82.568179 c 3.886,-4.7713 16.817001,-20.7443 21.991001,-8.9452 8.226,18.7592 -13.602001,41.394201 -31.976301,29.940201 -18.8005,-11.720001 -14.3807,-57.317301 12.9853,-51.995001" id="path18" /> <path id="path96" style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 382.24329,66.132115 10.28823,4.968102 m 1.43337,-28.367052 c 10.51733,1.155582 19.88706,11.815621 15.73742,23.605351 -4.04787,9.998324 -15.55253,6.301066 -17.16999,4.748292 14.92637,29.413352 -1.37808,33.353402 -21.49556,21.004161 -2.989,-3.654 1.44896,-7.65079 3.34996,-11.52279 2.733,-5.5675 4.78363,-9.247762 7.56963,-14.580262 3.923,-7.5087 6.50037,-16.393338 11.91537,-23.419738" sodipodi:nodetypes="cccccccsc" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 161.87172,295.56818 c -14.756,-7.867 -28.475,-15.087 -39.711,-28 -39.450001,-45.339 -38.733001,-112.55 4.75,-154.91 41.924,-40.841901 105.935,-54.103201 161.961,-41.202701 74.271,17.1017 122.472,98.360701 82.573,168.112701 -9.166,16.023 -21.305,30.638 -35.573,42.385 -5.884,4.845 -21.632,11.257 -24.686,17.944 -3.098,6.783 6.68,17.742 9.262,23.671 7.126,16.367 11.635,33.876 16.565,51 2.713,9.422 6.466,18.017 17.859,17.867 14.912,-0.195 28.131,-10.699 39,-19.787 5.033,-4.208 10.796,-8.773 9.782,-16.08 -1.764,-12.698 -13.197,-25.501 -17.187,-38 -1.734,-5.431 -3.203,-13.126 4.41,-13.887 15.509,-1.552 19.165,14.429 26.694,23.669 7.439,9.13 23.703,-5.563 32.867,6.262 14.065,18.149 -30.663,41.409 -35.064,16.956 -1.378,-7.651 7.25,-11.388 7.498,-19" id="path28" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 271.87172,165.56818 1,21 m -77,-19 1,17" id="path47" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 258.87072,220.03618 c 9.154,-0.633 8.713,10.061 7.332,16.532 -2.404,11.267 -12.043,23.853 -24.331,24.906 -14.949,1.28 -29.284,-6.628 -32.96,-21.906 -0.903,-3.755 -2.774,-12.057 0.563,-15.062 3.396,-3.058 10.234,-1.851 14.397,-1.953 11.665,-0.285 23.352,-1.711 34.999,-2.517" id="path52" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 76.871719,254.56818 -12,29" id="path55" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 391.87172,262.56818 18,25" id="path57" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 7.8717186,369.56818 c 7.7675004,5.402 14.1111004,10.548 24.0000004,11 -1.8141,14.279 -19.9879,30.369 -29.5810004,10.996 -5.0954,-10.29 2.0047,-15.87 4.2785,-25.166 1.9233,-7.863 1.0866,-14.671 10.3025004,-17.83 -0.4872,-2.626 -1.1306,-5.314 -0.7716,-8 2.8333,-21.2 24.3042,-4.145 33.6636,-10.562 7.9856,-5.476 15.6182,-34.926 31.804,-24.41 4.945,3.212 1.84,11.735 0.238,15.972 -3.89,10.292 -18.7002,28.154 -16.3854,39 1.3054,6.116 6.96,9.929 11.4514,13.725 11.206,9.473 35.963001,27.279 49.786001,13.087 6.371,-6.541 7.743,-19.248 10.063,-27.812 4.803,-17.735 9.836,-37.161 21.151,-52" id="path66" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 46.871719,332.56818 c 0.1188,10.033 14.4297,19.927 -0.0031,27.685 -2.1423,1.152 -4.6995,1.568 -6.9969,2.315 2.0545,7.151 -0.3896,13.53 -7,17" id="path73" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 453.87172,348.56818 c 8.081,5.83 6.095,11.65 9.255,19.715 3.184,8.127 8.94,16.726 2.315,25.245 -5.023,6.458 -10.931,4.522 -17.4,7.55 -9.041,4.233 -18.031,10.2 -27.17,14.738 -27.742,13.773 -65.789,39.762 -96,19.647 -8.913,-5.934 -13.575,-14.594 -19.901,-22.791 -6.584,-8.531 -9.621,-14.27 -12.099,-25.104" id="path94" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 16.871719,348.56818 c 6.2133,7.053 12.3198,12.155 22,13" id="path93" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 428.87172,363.56818 c 0.007,2.66 -0.093,5.384 0.483,7.999 4.018,18.256 23.51,3.292 31.517,-1.999" id="path79" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 437.87172,381.56818 c 0.361,8.282 3.705,12.944 9,19" id="path83" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 175.87172,388.56818 c -7.134,31.195 -11,64.579 -11,97" id="path86" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 21.871719,400.56818 c 6.6302,7.719 17.045,11.276 26,15.753 22.5155,11.258 58.035001,33.946 84.000001,25.143 16.663,-5.65 22.439,-21.09 36,-29.896 m 131,-4 c -3.587,6.827 -0.044,15.672 0.845,23 2.284,18.835 5.153,38.018 5.155,57" id="path89" /> </svg>`);

    const stickGreatJobClap = parseSvg(`<?xml version="1.0" encoding="UTF-8" standalone="no"?> <svg width="407.78781" height="494.09128" version="1.1" id="svg91" sodipodi:docname="stickGreatJobClap.svg" inkscape:version="1.3.2 (091e20ef0f, 2023-11-25, custom)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"> <defs id="defs91" /> <sodipodi:namedview id="namedview91" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" inkscape:zoom="1.4142136" inkscape:cx="-100.40916" inkscape:cy="324.91556" inkscape:window-width="2560" inkscape:window-height="1371" inkscape:window-x="0" inkscape:window-y="0" inkscape:window-maximized="1" inkscape:current-layer="svg91" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 160.26313,0.09128427 c 2.271,12.23009973 3.323,29.16989973 10.086,39.94519973 6.601,10.5185 17.383,2.0806 20.914,-5.9452" id="path1" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 230.26313,9.0912843 c 11.477,-4.3918 22.31,0.2221 34,0.9451997 5.165,0.3195 9.873,-1.7968997 15,-1.9451997" id="path3" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 258.26313,11.091284 c 0,11.7039 2.891,27.9377 -1.264,38.9954 -5.996,15.9567 -20.019,-3.911 -22.736,-10.9954" id="path92" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 150.20862,17.953301 27.05451,-7.862017" id="path5" sodipodi:nodetypes="cc" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 152.62909,44.092837 c -1.559,2.1003 -4.39796,5.726147 -6.57696,7.253847 -16.357,11.4716 -29.38471,-25.653579 -6.789,-27.0679 3.57092,-0.223513 4.18,2.1133 5.775,3.8711 5.13689,7.37056 4.498,15.0849 12.225,20.9414" id="path95" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 301.26313,21.625284 c 22.544,-5.3794 32.124,30.6367 10,36.4043 -24.24,6.3192 -32.364,-31.0679 -10,-36.4043" id="path7" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 100.02418,63.087464 c 10.25821,-9.320866 17.43347,-12.280949 9.851,-18.658902 -4.30892,-3.257897 -12.654351,0.07488 -14.945851,5.322517 -1.76511,4.04217 1.27348,9.243826 5.0448,13.300805 11.083271,11.557696 23.122201,8.028662 22.289001,-5.9606" id="path17" sodipodi:nodetypes="ccscc" /> <path id="path37" style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 63.863069,66.251146 25.95228,26.914478 m -21.3337,-22.085322 c -3.27808,-6.694448 6.06604,-13.889968 15.38142,-11.829156" sodipodi:nodetypes="cccc" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 54.263129,105.09128 c 3.581,-3.306 5.564,-9.875996 10.093,-11.913996 5.827,-2.6216 10.61,6.286 10.838,10.913996 0.514,10.477 -8.113,23.221 -18.931,24.63 -26.5507,3.459 -33.2984,-40.794896 -11,-50.629996" id="path41" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 0.26312883,152.09128 16.84666417,-0.27178 7.145636,-13.68222 4.108969,13.18602 14.219032,2.74288 -9.902207,8.17853 1.230196,16.45239 -11.83756,-7.82762 -14.8107302,6.2218 L 13.36229,162.61309 0.31033883,152.28098" id="path57" sodipodi:nodetypes="ccccccccccc" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 378.25073,120.10356 12.10457,11.72021 14.72752,-4.62206 -6.41845,12.22941 8.11487,11.99388 -12.78502,-1.21883 -10.76371,12.50348 -2.83546,-13.90538 -14.87224,-6.07329 14.55038,-5.92487 -1.92322,-16.53503" id="path57-3" sodipodi:nodetypes="ccccccccccc" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 251.26313,159.09128 c 6.697,11.314 29.381,30.211 37,8" id="path60" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 201.26313,163.09128 c -4.511,18.765 -27.95,22.433 -37,5" id="path62" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 202.26313,214.09128 c 9.46,12.382 21.389,14 36,14" id="path66" /> <path id="path73" style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 291.55751,314.90987 c 1.88661,1.20179 11.84114,7.6142 15.69614,12.6692 20.175,26.45 0.0825,62.52047 -18.15027,73.53771 M 117.26313,277.09128 c -29.753001,46.775 -43.564001,109.27 -45.961001,164 -0.775,17.718 0.961,35.355 0.961,53 m 82.000001,-162 c 9.021,17.12 3.416,50.621 31,50.816 23.371,0.166 42.52513,-25.71775 57.75582,-39.48008 9.60468,-7.81717 24.95637,-22.33252 29.89246,-24.93298 5.88734,-4.28919 14.51476,-6.34208 18.65035,-3.58423 0.0885,0.0448 0.13001,0.11271 0.27513,-0.0689 2.26547,-2.83481 10.46209,-12.64664 17.42624,-14.82582 35.73,-11.177 54.931,31.87 40.627,60.076 -8.166,16.101 -25.24,28.307 -41.627,35.123 -6.777,2.82 -12.711,1.343 -19,5.877" sodipodi:nodetypes="cccccccccccscccc" /> <path id="path81" style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 296.32279,422.31531 6.94034,57.77597 m -39,-179 c 16.239,-3.848 31.783,-14.117 44,-25.17 5.731,-5.184 14.96934,-15.01133 19.23354,-23.16153 m -180.23354,35.33153 c -19.865,-8.549 -34.751,-13.11 -49.826001,-30 -8.871,-9.938 -15.58,-22.278 -19.453,-35 -23.854,-78.348 43.093001,-147.545796 119.279001,-154.830196 72.238,-6.907 143.682,45.959196 146.961,120.830196 0.69,15.773 -2.362,31.352 -8.165,46 -2.457,6.202 -10.583,16.227 -8.703,23 1.163,4.19 3.913,16.638 8.051,18.396 6.656,2.828 19.975,-2.229 26.856,-3.596 2.514,-0.499 7.962,-2.622 9.958,-0.157 6.379,7.877 -9.97,22.748 -6.339,31.054 1.243,2.843 5.793,3.49 8.381,4.507 6.297,2.476 21.991,7.172 24.673,13.981 3.623,9.201 -20.987,16.329 -22.412,24.83 -1.834,10.937 16.957,17.13 17.479,27.93 0.216,4.466 -5.499,5.113 -8.74,5.928 -8.616,2.169 -22.217,2.807 -29.682,7.557 -7.271,4.626 4.391,21.262 -0.346,28.248 -5.979,8.819 -30.362,-15.883 -29.928,1.323 0.051,2.024 0.426,3.996 0.671,5.999 0.34,2.774 0.491,5.319 1.285,8 -5.977,1.75 -26.211,-1.613 -29.697,-7.198 -4.375,-7.012 -3.867,-16.593 -8.303,-23.802 -11.399,5.179 -20.961,13.707 -32,19.691 -42.46,23.018 -94.899,40.352 -132.985,1.309 -7.413,-7.599 -14.135,-17.035 -17.95,-27 -5.027,-13.13 -6.065,-25.11 -6.065,-39" sodipodi:nodetypes="ccccccccccsscccccccccccscccccccc" /> <path id="path96" style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 345.77173,50.858488 10.28823,4.968102 m 1.43337,-28.367052 c 10.51733,1.155582 19.88706,11.815621 15.73742,23.605351 -4.04787,9.998324 -15.55253,6.301066 -17.16999,4.748292 14.92637,29.413352 -1.37808,33.353402 -21.49556,21.004161 -2.989,-3.654 1.44896,-7.65079 3.34996,-11.52279 2.733,-5.5675 4.78363,-9.247762 7.56963,-14.580262 3.923,-7.5087 6.50037,-16.393338 11.91537,-23.419738" sodipodi:nodetypes="cccccccsc" /> </svg>`);

    const stickGreatJobStarEyes = parseSvg(`<?xml version="1.0" encoding="UTF-8" standalone="no"?> <svg width="499.25351" height="470.31311" version="1.1" id="svg1" sodipodi:docname="stickGreatJobStarEyes.svg" inkscape:version="1.3.2 (091e20ef0f, 2023-11-25, custom)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"> <defs id="defs1" /> <sodipodi:namedview id="namedview1" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" inkscape:zoom="1.6089441" inkscape:cx="250.78559" inkscape:cy="264.45915" inkscape:window-width="2560" inkscape:window-height="1371" inkscape:window-x="0" inkscape:window-y="0" inkscape:window-maximized="1" inkscape:current-layer="svg1" /> <path style="fill:none;stroke:#010101;stroke-width:3;stroke-dasharray:none" d="m 266.19154,258.7371 c 13.335,-1.75 21.753,6.39 14.583,19.576 -4.969,9.138 -16.26,16.563 -26.583,17.816 -13.787,1.672 -29.518,-3.415 -34.215,-17.816 -1.222,-3.748 -3.386,-11.134 -0.182,-14.4 3.18,-3.242 10.279,-2.452 14.397,-2.639 10.557,-0.48 21.522,-1.162 32,-2.537" id="path22" /> <path style="fill:none;stroke:#010101;stroke-width:3;stroke-dasharray:none" d="m 6.1915367,160.3131 59.0000003,34" id="path19" /> <path style="fill:none;stroke:#010101;stroke-width:3;stroke-dasharray:none" d="m 315.17654,157.2791 c 3.28181,8.07468 1.8075,19.97557 4.5695,25.95557 7.20578,5.24495 14.63138,6.24947 22.8225,12.16843 -9.93043,5.77294 -10.76785,3.0037 -19.96717,7.75605 -1.63092,7.8867 1.64727,25.84572 -2.22298,31.90766 -5.20966,-4.33623 -14.29295,-15.90786 -17.30187,-22.40552 -6.11873,1.82778 -16.76929,11.03689 -24.84098,13.00481 5.28981,-11.8181 5.39746,-19.47989 7.57691,-25.15792 -1.188,-5.495 -15.33224,-15.47036 -18.09683,-22.61456 9.11112,-0.13292 23.9999,0.53209 29.33442,1.33242 6.07949,-6.5306 11.26586,-15.77655 18.1265,-21.94694" id="path18" sodipodi:nodetypes="ccccccccccc" /> <path style="fill:none;stroke:#010101;stroke-width:3;stroke-dasharray:none" d="m 195.19154,155.3991 c 8.6012,14.63465 13.15267,23.71403 14.63394,26.86567 0.64789,1.37848 20.63017,2.73348 25.18671,3.42536 -3.94401,5.31212 -14.98215,12.74165 -19.37889,16.61909 2.88564,7.77476 6.87522,18.53861 7.0556,24.21631 -6.64979,-2.04734 -14.05278,-8.10174 -21.43299,-10.22098 -4.69192,4.05627 -15.8729,10.84705 -20.06037,15.22255 -0.25743,-6.36236 1.62064,-21.34316 2.08618,-26.24125 -3.36678,-2.3794 -16.84308,-11.61024 -24.67918,-14.75875 -2.00505,-0.80562 20.89015,-5.06254 27.07656,-5.77805 2.5954,-6.1685 5.50459,-22.46479 9.51244,-29.34995" id="path16" sodipodi:nodetypes="csccccccscc" /> <path style="fill:none;stroke:#010101;stroke-width:3;stroke-dasharray:none" d="m 484.19154,148.3131 -64,41" id="path15" /> <path style="fill:none;stroke:#010101;stroke-width:3;stroke-dasharray:none" d="m 55.191537,82.313104 c -9.7587,10.294 -15.2742,28.972996 -12.1119,42.999996 4.0134,17.802 19.1287,27.749 36.1119,17.647 11.3059,-6.725 13.6548,-18.524 11.9344,-30.647 -0.6257,-4.409 -3.8598,-14.343996 -9.9236,-13.167996 -5.7464,1.113996 -11.6763,11.742996 -15.0108,16.167996" id="path13" /> <path id="path12" style="fill:none;stroke:#010101;stroke-width:3;stroke-dasharray:none" d="m 166.19154,330.3131 c -9.904,-14.682 -19.75,-29.148 -32.039,-42 -12.50129,-11.11736 -21.68538,-22.75836 -34.115,-33 -1.148193,-5.85337 -3.089003,-15.539 -4.231003,-22 -13.0775,-74.01 43.878003,-141.685996 115.385003,-152.725296 78.619,-12.1377 163.895,28.504296 183.346,110.725296 4.97,21.012 4.648,44.025 -0.346,65 11.89621,-9.82776 18.52267,-12.5803 26.33944,-15.58401 3.22567,-1.41106 35.50556,-10.62099 53.66056,-4.30899 24.993,8.69 30.24,40.175 15.076,59.854 -9.287,12.05 -26.064,16.581 -39.076,23.297 -22.121,11.419 -43.665,27.986 -60.985,45.742 -6.099,6.252 -15.478,15.648 -18.415,24 -2.594,7.378 1.193,20.296 2.115,28 2.086,17.449 3.285,35.433 3.285,53 m -253,-5 c 0,-18.089 1.768,-35.984 3.089,-54 0.601,-8.201 3.026,-16.768 1.582,-25 -2.399,-13.682 -13.816,-28.731 -23.671,-37.91 -15.478203,-14.417 -36.321503,-24.984 -56.000003,-32.406 -14.4639,-5.454 -32.2772,-9.282 -40.6366003,-23.684 -18.1221897,-31.221 6.9476003,-60.202 39.6366003,-57.91 18.8422,1.32 44.400738,14.79067 52.941203,20.97738 m 294.06707,0.89654 c -21.086,24.367 -42.84427,45.09308 -60.00827,73.03608" sodipodi:nodetypes="ccccccccccccccccccccccccc" /> <path style="fill:none;stroke:#010101;stroke-width:3;stroke-dasharray:none" d="m 370.19154,49.040704 c 23.201,-5.0707 31.821,32.0903 9,37.8924 -27.62,7.023 -35.755,-32.0448 -9,-37.8924" id="path8" /> <path id="path24" style="fill:none;stroke:#010101;stroke-width:3;stroke-dasharray:none" d="m 411.41427,87.807124 10.28823,4.96811 m 1.43337,-28.367055 c 10.51733,1.155582 19.88706,11.815621 15.73742,23.605355 -4.04787,9.99832 -15.55253,6.30106 -17.16999,4.74829 14.92637,29.413346 -1.37808,33.353396 -21.49556,21.004156 -2.989,-3.654 1.44896,-7.65079 3.34996,-11.52279 2.733,-5.567496 4.78363,-9.247756 7.56963,-14.580256 3.923,-7.508703 6.50037,-16.393341 11.91537,-23.419741" /> <path style="fill:none;stroke:#010101;stroke-width:3;stroke-dasharray:none" d="m 337.12287,15.541001 c -6.098,10.5733 -5.62233,28.064903 -16.02433,36.200403 -6.779,5.3016 -19.74,4.056 -18.907,-6.4283" id="path23" /> <path style="fill:none;stroke:#010101;stroke-width:3;stroke-dasharray:none" d="m 312.19154,1.3131039 20.55739,11.3517241 7.3187,4.422537 16.12391,8.225739" id="path2" /> <path id="path5-1" style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 197.53438,20.008231 27.05451,-7.862017 m -17,-10.0000001 c 2.271,12.2301001 3.323,29.1699001 10.086,39.9452001 6.601,10.518496 17.383,2.0806 20.914,-5.9452" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 193.78749,47.893579 c -1.559,2.1003 -4.39796,5.726143 -6.57696,7.253843 -16.357,11.4716 -29.38471,-25.653575 -6.789,-27.067896 3.57092,-0.223513 4.18,2.1133 5.775,3.8711 5.13689,7.37056 4.498,15.0849 12.225,20.9414" id="path95" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 136.54532,68.021404 c 10.25821,-9.32086 17.43347,-12.28095 9.851,-18.658898 -4.30892,-3.257897 -12.65435,0.07488 -14.94585,5.322518 -1.76511,4.04217 1.27348,9.24382 5.0448,13.3008 11.08327,11.5577 23.1222,8.02867 22.289,-5.9606" id="path17" sodipodi:nodetypes="ccscc" /> <path id="path37" style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 93.98486,75.285988 25.95228,26.914462 M 98.603437,80.115138 c -3.27808,-6.69445 6.066043,-13.88997 15.381423,-11.82915" sodipodi:nodetypes="cccc" /> </svg>`);

    const stickGoodJobThumb = parseSvg(`<?xml version="1.0" encoding="UTF-8" standalone="no"?> <svg width="387.17786" height="491.59857" version="1.1" id="svg94" sodipodi:docname="stickGoodJobThumb.svg" inkscape:version="1.3.2 (091e20ef0f, 2023-11-25, custom)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"> <defs id="defs94" /> <sodipodi:namedview id="namedview94" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" inkscape:zoom="1.6089441" inkscape:cx="311.6951" inkscape:cy="287.45561" inkscape:window-width="2560" inkscape:window-height="1371" inkscape:window-x="0" inkscape:window-y="0" inkscape:window-maximized="1" inkscape:current-layer="svg94" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 51.465627,0.47218995 c 4.5248,7.31077915 4.11077,16.34326505 6.13637,20.34646005 4.102,1.640845 10.54745,3.077776 19.13063,7.794479 -3.105,3.7158 -9.05824,6.078292 -13.58607,10.197504 -0.40921,4.732507 -3.00919,11.811803 -5.0184,16.955976 -4.42676,-2.502081 -8.05534,-9.86438 -13.60488,-13.941777 -4.57458,1.776637 -14.26075,4.126993 -23.685569,7.563557 -0.652327,0.237858 9.681479,-15.935135 10.865925,-20.149171 -3.490797,-3.026343 -9.926988,-8.793846 -12.248786,-12.921807 6.945252,-0.48296 17.548667,1.516434 21.16947,0.126334 4.66789,-4.112698 7.0267,-11.9759549 10.9543,-16.09887075" id="path5" sodipodi:nodetypes="ccccccscccc" /> <path id="path24-2" style="fill:none;stroke:#010101;stroke-width:3;stroke-dasharray:none" d="m 69.449217,416.62566 3.7619,10.78786 m 21.07207,-19.04499 c 6.619773,8.254 5.70738,22.41719 -5.56345,27.81953 -9.93217,4.20762 -15.45283,-6.54176 -15.49858,-8.78346 -10.24384,31.35291 -24.55886,22.60996 -30.05184,-0.34748 0.47023,-4.6973 6.4345,-4.38535 10.51662,-5.77905 5.86935,-2.0043 9.9217,-3.15661 15.66234,-4.95726 8.08344,-2.53548 16.1883,-6.9954 24.9857,-8.13483" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 134.67785,221.99951 c -69.233003,-32.813 -74.089003,-123.882999 -24.83,-175.960599 38.381,-40.5779999 104.975,-52.8059399 156.83,-34.9607 12.628,4.3457 24.371,11.3083 35,19.2963 54.672,41.0881 55.547,114.322999 10.025,162.620999 -6.932,7.355 -14.47,13.731 -21.982,20.443 -4.271,3.816 -6.222,8.028 -12.043,9.561" id="path7" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 22.677847,105.99951 c 0.9627,5.182 5.5015,22.338 0.4321,25.958 -6.1333,4.379 -15.3744999,-6.688 -17.9528999,-10.958 -7.2109,-11.942 -6.3021,-28.373999 4.5362,-37.786299 21.2980999,-18.4964 51.3045999,9.8643 35.9845999,32.786299" id="path21" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 242.67785,113.99951 c 8.625,-18.124999 29.506,-17.958999 41,-3" id="path24" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 130.67785,118.99951 c 8.814,-20.758999 33.448,-13.03 43,2" id="path27" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 18.677847,146.55751 c 20.202,-3.497 24.333,27.513 5,30.78 -18.7770999,3.173 -25.1700999,-27.288 -5,-30.78" id="path34" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 225.67785,153.42351 c 3.75,-0.492 10.331,-1.624 13.683,0.604 3.943,2.62 2.558,10.177 1.559,13.972 -3.002,11.402 -13.279,21.434 -25.242,22.696 -12.509,1.319 -25.248,-8.35 -29.3,-19.696 -1.223,-3.424 -3.261,-10.127 -0.672,-13.397 2.026,-2.559 7.123,-1.501 9.972,-1.773 9.966,-0.949 20.076,-1.103 30,-2.406" id="path37" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 19.677847,192.55751 c 19.233,-2.38 22.987,26.279 4,28.294 -17.5260999,1.859 -22.1042999,-26.054 -4,-28.294" id="path44" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 283.67785,221.99951 c 12.084,8.943 27.235,11.188 39,22.09 27.925,25.876 41.961,62.194 52.72,97.91 5.687,18.879 11.225,38.086 11.28,58" id="path51" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 163.67785,419.99951 c -12.686,-9.692 -18.582,-27.084 -22.859,-42 -7.901,-27.556 -11.477,-53.436 -10.18,-82 0.88,-19.401 7.728,-41.171 25.039,-52" id="path94" sodipodi:nodetypes="cccc" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 48.900867,256.76455 c -4.60718,2.35175 -14.54182,7.35496 -20.22302,6.50796 -8.3321,-1.242 -12.7724,-13.285 -9.4267,-20.269 4.5326,-9.463 17.5483,-10.58 24.1987,-2.96 3.554,4.073 5.27476,11.52232 5.49776,16.71132 l 14.73024,-4.75532" id="path54" sodipodi:nodetypes="cccccc" /> <path id="path67" style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 82.444437,314.19806 c 1.47293,6.74296 3.43041,11.64045 3.23341,17.80145 m -5.465,-46.47923 c 0.068,8.205 1.26285,20.6062 2.382,28.856 -2.68276,2.89452 -8.3505,5.20019 -13.20747,8.121 -4.44612,2.6779 -30.42453,16.48923 -43.60463,6.79923 -10.623,-7.81 -3.4446,-22.065 7.8951,-23.297" sodipodi:nodetypes="cccccsc" /> <path id="path70" style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 284.67785,326.99951 -15.27093,16.0712 m -19.72907,-130.5332 c 5.493,-1.232 9.601,2.214 10.857,7.462 3.243,13.551 -3.034,23.819 9.147,34.715 6.067,5.426 8.672,14.759 14.299,19.291 6.849,5.517 17.861,7.65 25.697,11.775 19.911,10.48 36.531,24.556 46.218,45.219 7.979,17.02 7.699,46.589 -14.218,53.2 -18.808,5.673 -45.179,-9.356 -57.711,-22.37 -4.001,-4.155 -9.9563,-16.14043 -14.5393,-18.81543 -0.98671,1.26505 -9.2287,3.57943 -13.7497,3.89543 -14.646,1.027 -48.342,5.666 -59.428,-6.304 -4.839,-5.223 -3.434,-15.18 -6.273,-21.606 -3.094,-7.002 0.787,-13.059 1.311,-20 0.712,-9.417 -2.507,-17.935 4.604,-25.96 5.757,-6.496 13.533,-8.552 21.786,-9.768 3.65,-0.538 10.689,-0.161 12.972,-3.59 2.479,-3.722 1.026,-11.392 1.028,-15.682 0.005,-11.866 4.394,-28.41 18,-31.462" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 61.677847,359.51451 c 7.551,-1.546 29.984,-1.913 29.836,9.489 -0.156,12.071 -18.217,18.279 -27.836,20.467 -9.847,2.241 -34.8089,0.28 -26.5394,-16.467 4.2144,-8.534 15.9494,-11.731 24.5394,-13.489" id="path74" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 133.67356,490.9347 c 0,-3.955 6.23154,-16.69692 6.70638,-21.09702 -2.517,-3.207 -12.25611,-4.56576 -16.14109,-8.69417 5.12187,-2.47509 14.52086,-2.28877 17.93286,-5.01977 1.34837,-5.33508 4.86331,-14.24478 7.51714,-19.08723 5.03547,4.49534 8.42975,13.05299 11.01291,16.47309 6.06802,-0.0115 12.34062,-0.86959 19.18709,0.0929 1.99345,4.6957 -7.30654,11.04406 -10.17416,14.5017 2.11254,4.34817 4.43459,15.31415 4.89616,20.2513 -4.15493,-1.64866 -12.58922,-8.28182 -18.09352,-11.22596 -4.25028,2.44094 -17.22599,11.78612 -22.91699,14.00312" id="path88" sodipodi:nodetypes="ccccccccccc" /> </svg>`);

    const stickGreatWorkStrong = parseSvg(`<?xml version="1.0" encoding="UTF-8" standalone="no"?> <svg width="500.63425" height="470.50595" version="1.1" id="svg141" sodipodi:docname="stickGreatWorkStrong.svg" inkscape:version="1.3.2 (091e20ef0f, 2023-11-25, custom)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"> <defs id="defs141" /> <sodipodi:namedview id="namedview141" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" inkscape:zoom="1.6089441" inkscape:cx="40.088402" inkscape:cy="260.10847" inkscape:window-width="2560" inkscape:window-height="1371" inkscape:window-x="0" inkscape:window-y="0" inkscape:window-maximized="1" inkscape:current-layer="svg141" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 178.05491,230.31657 c -28.75,-9.371 -45.446,-35.052 -53.421,-63 -19.153,-67.115 19.436,-138.534998 86.421,-159.1149982 27.888,-8.56789997 58.137,-9.3608 86,0.1937 68.38,23.4483002 107.922,99.8032982 82.947,167.9212982 -5.305,14.468 -13.52,28.691 -24.037,40 -11.952,12.853 -25.119,23.287 -40.91,31" id="path2" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 62.054908,43.316572 31,11" id="path7" /> <path style="fill:none;stroke:#17100e;stroke-width:3;stroke-dasharray:none" d="m 55.054908,72.316572 h 37" id="path10" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 174.05491,111.31657 v 13 m 72,-12 1,17" id="path13" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 160.05491,386.31657 c -1.55,-13.887 3.281,-30.19 5.271,-44 0.608,-4.217 3.586,-12.927 0.126,-16.397 -2.58,-2.586 -8.095,-1.603 -11.397,-1.603 h -29 c -30.313002,0 -59.044402,-2.339 -88.000002,-12 -10.6599,-3.557 -24.9151,-7.267 -30.5579,-18 -3.97368,-7.558 -2.80272,-15.898 -3.86648,-24 -2.13638002,-16.271 -0.57562,-33.592 -0.57562,-50 0,-13.096 -1.21834002,-26.73 4.3133,-39 9.5934,-21.281 35.5311,-33.544 52.1574,-12 18.4806,23.946 -1.0246,51.444 6.5293,77 9.8132,-3.049 17.7535,-9.531 28,-12.105 24.924002,-6.26 60.865002,0.942 77.000002,22.105 m 167,-1 c 18.753,-21.466 44.684,-27.423 72,-20.761 6.502,1.586 18.567,12.888 24.682,10.969 5.403,-1.695 1.034,-20.99 0.448,-25.208 -2.641,-19.009 -5.49,-46.528 13.885,-58.521 18.111,-11.211 37.348,2.355 44.946,19.521 10.668,24.105 4.039,55.53 4.039,81 0,10.245 1.555,24.128 -4.652,32.996 -6.295,8.995 -18.487,13.039 -28.348,16.685 -27.492,10.165 -55.953,12.319 -85,12.319 -9.567,0 -28.107,-3.616 -36.682,0.603 -3.875,1.907 -2.483,10.883 -2.148,14.397 1.415,14.872 2.104,30.316 4.83,45" id="path23" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 190.05491,172.31657 c 10.597,9.665 22.633,11.191 35,4" id="path27" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 273.05491,408.31657 c 1.5558,6.78698 11.97696,50.73374 19.776,45.353 8.064,-5.564 15.55101,-27.28919 14.77906,-38.4478 -0.55244,10.6332 7.37639,36.02896 13.07239,37.92396 8.804,2.929 13.96963,-36.22286 14.22663,-42.11586" id="path146" sodipodi:nodetypes="cccsc" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 24.054908,435.31657 c 5.478,-0.432 14.9465,-3.034 19.3966,1.589 2.8717,2.983 1.7041,9.783 0.9344,13.411 -2.4227,11.421 -11.1271,20.507 -23.331,15.517 -21.47663002,-8.781 -19.70361,-63.996 9,-54.517" id="path85" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 363.05491,414.96957 c 17.438,-5.44 34.16163,31.5499 13.34163,37.6759 -5.712,1.681 -16.05483,-1.34396 -20.85183,-5.50596 -8.113,-7.04 -1.4048,-29.38894 7.5102,-32.16994" id="path90" sodipodi:nodetypes="cccc" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 188.05491,416.31657 h 36" id="path93" /> <path id="path143" style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 99.848948,437.17967 c 7.163632,0.94365 22.055502,0.24023 26.709882,-0.21644 m 4.15342,29.22932 c -7.32,0.151 -19.985,3.94571 -26.866,0.66771 -4.462002,-2.127 -5.688522,-50.61759 -1.47152,-53.43159 6.66834,-1.9093 18.92618,-0.1681 25.68018,-0.1121" sodipodi:nodetypes="cccccc" /> <path id="path142" style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 411.42221,433.08926 c 4.88161,-0.27544 11.69589,27.58035 17.03119,27.08307 m -24.39849,1.14424 c 0,-8.739 0.51,-19.491 -1.304,-28 -1.119,-5.25 -4.377,-16.547 -0.668,-21.411 5.064,-6.642 14.831,-1.45378 17.77784,5.57679 6.25071,14.76919 -6.01721,16.1986 -17.07069,16.0616" sodipodi:nodetypes="ccccccc" /> <path id="path114" style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 450.58571,408.53134 c -0.79682,7.91274 7.3324,40.92305 8.53313,49.5282 m 21.17744,-5.14395 c 0.363,4.562 -17.32092,-13.47559 -25.35989,-17.19604 4.28531,-2.8001 13.69852,-15.97298 17.11852,-19.40298" sodipodi:nodetypes="ccccc" /> <path id="path120" style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 66.138599,436.95734 17.600056,27.55554 M 57.821861,440.00541 c 6.324264,-2.16375 17.078789,-4.08125 18.010696,-12.74797 0.233887,-13.81314 -19.88055,-22.13778 -19.015845,-13.38035 1.643966,16.64949 0.163754,32.8646 3.813593,51.04846" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 208.05491,416.31657 2.43948,50.95021" id="path145" sodipodi:nodetypes="cc" /> <path id="path125" style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 151.32536,448.0542 26.43023,0.13839 m 6.85408,21.77366 c -7.68114,-19.91885 -8.68385,-34.99094 -19.17785,-52.06732 -5.12263,9.49617 -10.2742,19.55949 -13.7435,29.73037 l -2.21441,5.57627 -6.419,15.111" sodipodi:nodetypes="ccccccc" /> </svg>`);

    const stickSoProud = parseSvg(`<?xml version="1.0" encoding="UTF-8" standalone="no"?> <svg width="499.00601" height="493.96387" version="1.1" id="svg118" sodipodi:docname="soProud.svg" inkscape:version="1.3.2 (091e20ef0f, 2023-11-25, custom)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"> <defs id="defs118" /> <sodipodi:namedview id="namedview118" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" inkscape:zoom="1.6089441" inkscape:cx="77.379939" inkscape:cy="205.41422" inkscape:window-width="2560" inkscape:window-height="1371" inkscape:window-x="0" inkscape:window-y="0" inkscape:window-maximized="1" inkscape:current-layer="svg118" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 273.46741,1.6993413 c 19.563,-3.14475 29.328,30.9604997 27.345,45.4814997 -0.952,6.9676 -4.78,15.0388 -12.345,16.5911 -21.086,4.3267 -30.065,-29.5012 -28.278,-44.5911 0.95,-8.0224 4.237,-16.0280997 13.278,-17.4814997" id="path3" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 326.46741,12.180841 c -6.646,15.0118 -14.116,62.9001 13,61.9028 24.077,-0.8856 22.221,-38.4319 21,-53.9028" id="path118" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 162.33951,89.124618 c -5.31,-19.694804 -25.6441,-44.740777 -22.1261,-53.925277 4.158,-10.8556 23.605,-9.9773 28.887,-1.0031 13.91342,23.641351 -16.13737,33.242535 -15.30424,34.902197" id="path12" sodipodi:nodetypes="cccc" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 388.61541,28.938541 c 8.519,-3.5542 19.427,8.4112 23.548,14.2423 11.143,15.7682 7.541,40.9271 -11.696,48.336 -4.516,1.74 -16.22,4.81 -19.972,0.061 -2.102,-2.6611 -1.021,-8.3245 -0.603,-11.397 1.36,-9.9916 2.715,-20.0508 4.329,-30 0.794,-4.896 -0.746,-19.098 4.394,-21.2423" id="path15" /> <path id="path23" style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 210.50904,45.814747 33.90429,20.590558 m -36.51674,4.939914 c -3.0226,-17.341693 -17.06567,-33.012975 -13.85318,-51.145878 2.936,-10.2690997 18.29411,-12.3465087 25.05611,-7.334609 14.022,10.3929 1.62609,32.465701 -19.03783,36.449578" sodipodi:nodetypes="ccccsc" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 447.46741,112.64884 c 21.728,-4.21 33.009,29.383 10,35.113 -5.972,1.487 -16.942,1.537 -21.606,-3 -10.759,-10.467 -1.503,-29.572 11.606,-32.113 m -387.000004,43.532 c 9.758,6.642 28.8296,-0.021 18.5664,-12.941 -7.5242,-9.473 -19.4397,0.499 -28.4329,-5.902 -9.1801,-6.535 -3.6966,-19.226 5.8665,-21.157" id="path41" /> <path id="path62" style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 471.4461,157.56772 6.02131,30.61312 m -33.53239,-10.84358 c 2.60082,-0.88414 26.84484,-11.82114 29.64629,-12.42492 10.36984,-3.77279 24.2092,-9.13029 23.9202,7.79071 -0.041,2.415 -1.8751,5.44279 -3.0341,7.47779" sodipodi:nodetypes="cccccc" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 304.46741,176.18084 v 22 m -103,-19 1,22" id="path65" /> <path id="path75" style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 9.7355755,210.81006 c -4.882072,3.39316 -4.191469,11.75478 -1.525869,14.94078 6.8164995,8.149 29.4722995,5.051 38.2576995,2.43 m -5,-21 c -8.4528,0 -16.6586,0.883 -25,2.285 -3.835,0.645 -8.1596995,2.667 -11.8518995,0.473 -7.83932,-4.656 1.016,-15.719 5.8557995,-18.763 10.3511,-6.512 22.8588,-3.155 33.9961,-0.995" sodipodi:nodetypes="cccccccc" /> <path id="path82" style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 472.59821,226.43692 c -7.14595,3.90551 -15.41365,14.94824 -18.07894,19.78118 m 24.94814,11.96274 c -7.235,-2.729 -16.76873,-7.2479 -24.93084,-11.93081 -7.81489,-4.74505 -10.494,-6.65531 -15.55571,-8.76159" sodipodi:nodetypes="ccccc" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 235.46741,241.18084 c 10.417,16.942 32.668,21.216 42,0 m -275.0000035,9 c 6.3156,0.293 10.3855995,2.801 14.9999995,7" id="path85" /> <path style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 452.46741,267.70284 c 18.018,-3.723 28.168,23.579 9,27.044 -16.064,2.903 -29.793,-22.747 -9,-27.044" id="path89" /> <path id="path94" style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 18.467406,287.18084 3,14 m 44,-25 5,10 m -9,-27 4,17 -34,8.127 -13.038682,2.9469 -5.961318,-14.0739" sodipodi:nodetypes="ccccccccc" /> <path id="path109" style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 419.84595,329.53513 10.15172,5.93627 m 23.46974,12.70944 c -7.445,-3.917 -21.942,-8.267 -25.973,-16.015 -6.954,-13.365 3.878,-23.582 16.973,-22.945 7.965,0.388 15.149,5.973 21,10.96" sodipodi:nodetypes="cccccc" /> <path id="path114" style="fill:none;stroke:#231815;stroke-width:3;stroke-dasharray:none" d="m 162.3568,342.5312 c -8.3738,8.58339 -20.57439,25.61264 -28.46239,36.64964 -17.535,24.537 -34.102004,54.13 -35.427004,85 m 77.000004,26 c 21.797,-30.438 40.752,-66.919 51.141,-103 4.022,-13.969 9.07,-29.648 3.38,-44 -8.62,-21.742 -33.121,-25.296 -51.521,-13.451 -3.87665,2.43473 -6.1572,3.98202 -16.18803,12.87699 -0.38577,0.34208 -28.08097,-15.27399 -35.08297,-23.42599 -24.603,-28.648 -38.190504,-67.143 -32.290004,-105 15.163004,-97.286 133.656004,-142.067599 220.561004,-116.278999 33.835,10.039999 62.735,31.671999 83.14,60.278999 10.53,14.763 19.194,32.057 22.436,50 7.169,39.677 -3.667,81.812 -32.861,110.576 -8.895,8.763 -18.562,16.012 -29.715,21.668 -3.54,1.795 -10.98536,6.07382 -14.67554,8.35348 4.34826,5.59291 15.12454,23.06552 19.09954,29.40252 18.242,29.079 28.539,62.757 47.576,91 M 97.467406,94.864841 c 22.755004,-2.49 25.751004,33.844999 4.000004,36.111999 -23.469004,2.447 -28.717204,-33.406999 -4.000004,-36.111999 M 319.46741,493.18084 c -20.546,-33.571 -39.52,-80.001 -39.996,-120 -0.188,-15.773 0.514,-38.072 18.996,-44.072 21.95,-7.126 39.63488,12.94198 45.31084,19.70322" sodipodi:nodetypes="cccccccsccccscccccccccccc" /> </svg>`);

    const rocketKeepUpTheGoodWork = parseSvg(`<?xml version="1.0" encoding="UTF-8" standalone="no"?> <svg width="441.98526" height="448.63742" version="1.1" id="svg49" sodipodi:docname="rocketKeepUpTheGoodWork.svg" inkscape:version="1.3.2 (091e20ef0f, 2023-11-25, custom)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"> <defs id="defs49" /> <sodipodi:namedview id="namedview49" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" inkscape:zoom="1.9416667" inkscape:cx="99.656652" inkscape:cy="217.59657" inkscape:window-width="2560" inkscape:window-height="1371" inkscape:window-x="0" inkscape:window-y="0" inkscape:window-maximized="1" inkscape:current-layer="svg49" /> <path style="fill:none;stroke:#682f82;stroke-width:3;stroke-dasharray:none" d="m 305.79151,74.982801 c 26.742,-3.831 33.138,39.894999 6,43.307999 -28.487,3.583 -34.648,-39.203999 -6,-43.307999" id="path4" /> <path style="fill:none;stroke:#682f82;stroke-width:3;stroke-dasharray:none" d="m 232.79151,181.0888 c 25.946,-6.872 38.456,34.889 12,41.829 -27.602,7.242 -39.867,-34.449 -12,-41.829" id="path49" /> <path id="path12" style="fill:none;stroke:#682f82;stroke-width:3;stroke-dasharray:none" d="m 13.855617,171.61817 c 6.196201,-2.02 24.152081,-14.56703 28.295201,-15.8835 -0.21312,9.46442 7.6518,24.46171 14.1938,28.24271 m -37.55311,-34.50158 42,11" sodipodi:nodetypes="ccccc" /> <path style="fill:none;stroke:#682f82;stroke-width:3;stroke-dasharray:none" d="m 8.7915082,215.4758 c -1.0839,-5.838 -2.286,-13.038 2.2784998,-17.772 7.4153,-7.692 25.0695,-4.09 28.8275,5.772 2.998,7.866 -4.309,16.807 -11.998,10.566 -5.932,-4.814 -5.108,-12.744 -5.108,-19.566" id="path14" /> <path style="fill:none;stroke:#682f82;stroke-width:3;stroke-dasharray:none" d="m 6.5884272,250.31122 c -1.0839,-5.838 -2.286,-13.038 2.2785,-17.772 7.4152998,-7.692 25.0695008,-4.09 28.8275008,5.772 2.998,7.866 -4.309,16.807 -11.998,10.566 -5.932001,-4.814 -5.108,-12.744 -5.108,-19.566" id="path14-3" /> <path id="path18" style="fill:none;stroke:#682f82;stroke-width:3;stroke-dasharray:none" d="m 395.79151,221.4758 45.00037,-1.00729 m -3.7e-4,-20.99271 -16.07531,21.12819 -13.92469,-18.12819" sodipodi:nodetypes="ccccc" /> <path style="fill:none;stroke:#682f82;stroke-width:3;stroke-dasharray:none" d="m 269.79151,127.9438 c 27.033,-4.976 34.661,37.817 7,42.912 -27.666,5.097 -34.705,-37.811 -7,-42.912" id="path51" /> <path id="path22" style="fill:none;stroke:#682f82;stroke-width:3;stroke-dasharray:none" d="m 417.34586,245.7142 -9.41202,-3.01026 m 0.85767,-10.22814 c 3.034,17.074 15.282,14.696 29,18" sodipodi:nodetypes="cccc" /> <path id="path56" style="fill:none;stroke:#682f82;stroke-width:3;stroke-dasharray:none" d="M 0.57318319,279.0381 19.664141,271.14395 m 23.734887,-11.41867 -23.728475,11.44568 c 2.856925,5.27911 3.120065,12.00271 7.389365,14.77458 8.59286,3.88186 23.88959,2.99626 23.31759,-8.47074 -0.338,-6.795 -3.32465,-14.16908 -7.77565,-18.04108" sodipodi:nodetypes="ccccccc" /> <path style="fill:none;stroke:#682f82;stroke-width:3;stroke-dasharray:none" d="m 410.79151,262.0888 c 6.277,-0.346 16.276,3.03 19.771,8.492 4.787,7.483 -1.457,17.149 -9.771,17.775 -7.264,0.548 -15.388,-2.62 -19.397,-8.884 -4.917,-7.684 0.838,-16.91 9.397,-17.383" id="path26" /> <path id="path28" style="fill:none;stroke:#682f82;stroke-width:3;stroke-dasharray:none" d="m 225.79151,292.4758 23.86249,6.08399 11.42107,-12.84352 m -104.86853,-39.6804 c -3.245,4.222 -9.32303,10.70393 -8.69403,16.43993 1.738,15.839 23.57083,10.27621 28.88483,-0.95679 M 148.79151,217.4758 c -12.925,-3.927 -28.544,-3.925 -42,-4.911 -3.529,-0.259 -12.638002,0.537 -14.932002,-2.692 -4.484,-6.311 12.482002,-23.138 16.218002,-27.397 19.282,-21.981 49.838,-46.98 80.714,-47 m 193,-47.999999 c -1.98914,16.148009 -6.383,31.971999 -12.4,46.999999 -15.197,37.961 -39.587,72.208 -65.734,103 -8.815,10.38 -17.395,21.228 -26.88,31 -4.997,5.148 -9.69337,9.40811 -15.66788,17.2908 2.63833,15.58487 11.31322,29.04156 18.82088,42.7092 1.894,3.415 3.646,9.176 7.186,11.248 3.23,1.892 5.737,-1.975 7.316,-4.253 4.759,-6.865 8.867,-14.53 12.6,-21.995 10.281,-20.563 15.759,-42.05 15.759,-65 0,-8.767 1.033,-18.383 -4,-26 M 291.45341,21.667669 c 5.75101,13.800162 90.16357,67.738252 90.25938,66.013782 0.68548,-12.33798 3.29503,-62.10435 -6.45306,-84.6959511 -35.49625,-6.667086 -72.95384,10.2222651 -100.46822,30.1203011 -11.377,8.465 -22.239,17.987 -31.91,28.37 -32.716,35.121 -55.312,77.123999 -75.868,119.999999 -6.306,13.153 -22.40964,40.83665 -22.30964,55.66765 8.74356,7.31463 52.82725,39.70467 81.08764,55.33235 -2.669,4.524 -5.254,11.365 -10.093,13.971 -6.761,3.642 -17.977,-3.76 -18.574,-10.971 -0.376,-4.545 6.09607,-11.25653 8.62954,-14.74904" sodipodi:nodetypes="ccccccccccccccccccccsccscccsccccc" /> <path id="path34" style="fill:none;stroke:#682f82;stroke-width:3;stroke-dasharray:none" d="m 393.79151,294.4758 c 23.87639,14.29467 49.02487,48.68685 -6.14903,22.95605 -3.56733,-1.66365 -1.03663,0.0942 1.17716,0.98367 29.32315,11.78133 29.98625,46.23767 -17.02813,12.06028" sodipodi:nodetypes="cssc" /> <path style="fill:none;stroke:#682f82;stroke-width:3;stroke-dasharray:none" d="m 347.79151,351.4758 c -5.372,4.948 -12.428,9.69 -11.581,18 0.81,7.939 12.685,22.456 21.522,16.396 5.221,-3.581 3.381,-10.379 6.059,-15.396" id="path60" /> <path id="path58" style="fill:none;stroke:#682f82;stroke-width:3;stroke-dasharray:none" d="m 57.750018,340.03896 -2.95851,6.43684 m 23,-18 c -6.218,2.954 -13.054,10.798 -20,11.461 -7.123,0.679 -19.114,-5.925 -14.958,-14.446 3.207,-6.574 15.326,-13.501 21.958,-16.015" sodipodi:nodetypes="cccccc" /> <path id="path57" style="fill:none;stroke:#682f82;stroke-width:3;stroke-dasharray:none" d="m 84.791508,340.4758 c -3.407,13.051 -19.766,23.792 -29,33 m 27.97718,-29.34088 c 3.941,0 10.46582,2.38788 13.79482,4.94388 11.972002,9.192 -4.23963,24.98286 -14.81663,23.18586 -5.389,-0.916 -10.14855,-6.55086 -13.37455,-10.50986" sodipodi:nodetypes="cccscc" /> <path style="fill:none;stroke:#682f82;stroke-width:3;stroke-dasharray:none" d="m 339.79151,339.4758 c 9.085,11.281 17.765,27.393 31,34" id="path36" /> <path id="path61" style="fill:none;stroke:#682f82;stroke-width:3;stroke-dasharray:none" d="m 122.79151,369.4758 14.1534,10.76741 m -1.1534,-13.76741 c -7.277,10.475 -27.121,31.152 -12,41" /> <path id="path63" style="fill:none;stroke:#682f82;stroke-width:3;stroke-dasharray:none" d="m 154.0877,368.77798 -16.29619,43.69782 m 8.24273,-22.09625 c 4.42241,-3.92546 17.58027,-5.06675 20.84927,3.20125 2.987,7.554 -5.365,19.433 -7.092,26.895" sodipodi:nodetypes="ccccc" /> <path style="fill:none;stroke:#682f82;stroke-width:3;stroke-dasharray:none" d="m 313.79251,376.9478 c 14.868,-2.688 26.01,27.495 8.998,31.273 -16.335,3.628 -27.692,-27.893 -8.998,-31.273" id="path62" /> <path style="fill:none;stroke:#682f82;stroke-width:3;stroke-dasharray:none" d="m 279.79151,390.9598 c 14.859,-2.417 21.783,29.479 5.999,32.287 -17.417,3.098 -23.694,-29.41 -5.999,-32.287" id="path44" /> <path style="fill:none;stroke:#682f82;stroke-width:3;stroke-dasharray:none" d="m 253.79151,421.4758 c -3.373,3.659 -6.664,9.009 -12,9.752 -14.457,2.013 -14.271,-24.905 -4.96,-30.743 3.728,-2.337 11.966,-3.639 15.102,0.309 3.611,4.546 1.327,12.355 1.991,17.682 1.231,9.889 10.715,27.165 -7.133,28.61 -2.967,0.24 -6.028,-0.483 -9,-0.61" id="path46" /> <path id="path48" style="fill:none;stroke:#682f82;stroke-width:3;stroke-dasharray:none" d="m 181.30424,406.78807 c -7.76846,22.50511 7.01627,24.62473 17.48727,22.68773 m -8.996,-32.296 c 10.54273,-5.31922 16.22618,10.06549 4.995,16.032 -15.80973,8.39884 -19.30522,-7.74167 -4.995,-16.032" sodipodi:nodetypes="cccsc" /> </svg>`);

    const keepUpTheGoodWorkFireworks = parseSvg(`<?xml version="1.0" encoding="UTF-8" standalone="no"?> <svg version="1.0" width="333.6264pt" height="415.50473pt" viewBox="0 0 333.6264 415.50473" preserveAspectRatio="xMidYMid" id="svg9" sodipodi:docname="keepUpFireworksOutlined.svg" inkscape:version="1.3.2 (091e20ef0f, 2023-11-25, custom)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"> <defs id="defs9" /> <sodipodi:namedview id="namedview9" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" inkscape:document-units="pt" inkscape:zoom="1.97681" inkscape:cx="228.39828" inkscape:cy="278.98484" inkscape:window-width="2560" inkscape:window-height="1371" inkscape:window-x="0" inkscape:window-y="0" inkscape:window-maximized="1" inkscape:current-layer="svg9" /> <metadata id="metadata1"> Created by potrace 1.16, written by Peter Selinger 2001-2019 </metadata> <g transform="matrix(0.1,0,0,-0.1,-1.326905,424.70185)" fill="none" stroke="#000000" stroke-width="15px" id="g9"> <path d="m 28,1895 c 41.286575,49.516 310,51 332,29 8,-8 -14,-13 -82,-17 -51,-3 -195.01883,-26.6663 -244.843298,-12.5558 z m 1230,2293 c 219,-171 432,-381 432,-428 0,-7 -34,24 -76,69 -42,45 -159,152 -260,237 -101,85 -184,159 -184,164 0,20 22,9 88,-42 z m 1030,28 c -2,-7 -32,-35 -68,-62 -97,-74 -164,-183 -250,-409 -6,-14 -14,-24 -19,-20 -12,7 37,144 89,252 45,90 121,181 189,225 50,31 64,35 59,14 z M 910,4145 c 201,-101 323,-191 508,-374 132,-131 147,-160 97,-183 -35,-16 -46,-8 -199,128 -155,138 -282,224 -439,299 -63,30 -123,62 -131,71 -21,20 -20,63 1,86 25,28 66,22 163,-27 z m 1910,-175 c 45,-45 32,-62 -157,-208 -263,-203 -405,-301 -435,-302 -31,0 -53,30 -43,60 3,11 68,68 143,127 75,60 201,161 280,226 151,123 175,134 212,97 z M 641,3749 c 106,-45 239,-118 239,-131 0,-14 -18,-9 -82,26 -35,19 -109,53 -165,76 -99,41 -111,49 -96,63 8,9 -4,13 104,-34 z m 2307,-151 c -3,-9 -37,-15 -98,-20 -66,-4 -118,-15 -182,-38 -49,-18 -92,-29 -95,-26 -10,9 126,67 192,81 81,18 188,19 183,3 z m -1913,-78 c 15,-16 17,-30 11,-75 -3,-30 -9,-80 -13,-112 l -6,-56 44,31 c 24,17 69,51 99,77 30,25 65,48 78,51 52,14 98,-55 68,-102 -12,-17 -132,-120 -164,-140 -2,-1 28,-68 68,-149 39,-81 75,-158 80,-171 13,-34 -3,-69 -39,-84 -52,-21 -73,2 -158,176 -41,85 -79,157 -83,159 -10,6 -17,-49 -30,-231 -5,-77 -15,-154 -20,-171 -20,-55 -95,-70 -120,-23 -14,26 12,435 40,630 11,74 20,140 20,146 0,6 9,23 21,38 26,32 77,36 104,6 z m 705,-90 c 11,-11 20,-33 20,-49 0,-46 -35,-66 -142,-81 -101,-13 -118,-21 -118,-54 0,-20 4,-21 84,-18 91,4 122,-5 135,-41 10,-27 -5,-74 -28,-86 -9,-4 -61,-11 -115,-15 -54,-4 -103,-9 -107,-12 -5,-3 -9,-31 -9,-63 0,-57 1,-59 31,-65 17,-3 60,-6 94,-6 76,0 115,-24 115,-71 0,-53 -29,-69 -122,-69 -119,0 -196,21 -232,61 l -29,32 6,121 c 4,82 16,163 36,251 34,145 51,171 106,162 16,-2 66,1 110,8 117,19 142,18 165,-5 z m 434,-31 c 31,-25 35,-70 7,-98 -19,-19 -42,-24 -154,-36 -64,-7 -77,-20 -77,-80 v -36 l 64,7 c 35,4 75,4 89,0 32,-8 53,-56 37,-85 -19,-36 -52,-49 -137,-57 l -82,-6 -7,-55 c -3,-30 -4,-57 0,-60 3,-3 39,-7 81,-8 83,-1 115,-19 115,-62 0,-63 -56,-89 -169,-77 -179,18 -194,56 -146,361 14,87 28,174 31,195 3,20 11,43 17,52 13,18 102,42 202,55 93,13 101,12 129,-10 z m 413,-56 c 45,-23 83,-88 83,-143 0,-20 -10,-56 -22,-80 -31,-60 -106,-101 -198,-109 l -65,-6 -27,-125 c -15,-69 -27,-141 -28,-161 0,-49 -32,-89 -71,-89 -43,0 -69,31 -69,84 0,43 82,454 100,502 6,14 10,41 10,60 0,44 15,72 43,85 38,16 200,4 244,-18 z M 487,3178 c 73,-36 183,-123 183,-144 0,-12 -9,-8 -34,14 -62,54 -124,92 -197,120 -40,15 -74,33 -77,41 -6,19 49,5 125,-31 z m 2782,-32 c 48,-17 55,-41 10,-32 -19,4 -73,9 -120,13 -85,5 -88,5 -201,-41 -123,-50 -128,-51 -128,-36 0,11 97,58 185,90 59,22 202,25 254,6 z M 529,2923 c 46,-44 223,-265 258,-324 45,-75 46,-83 25,-109 -26,-32 -62,-21 -95,28 -28,43 -113,146 -224,271 -40,44 -73,87 -73,95 0,22 40,66 61,66 10,0 32,-12 48,-27 z m 2553,-145 c 50,-40 23,-86 -74,-128 -37,-15 -152,-76 -256,-134 -199,-112 -237,-125 -248,-81 -3,14 -4,32 0,40 10,28 368,251 465,291 64,27 90,29 113,12 z m -1844,-70 c 19,-19 15,-40 -24,-130 -82,-193 -96,-328 -39,-388 40,-41 115,-63 168,-49 80,21 189,154 228,278 15,51 18,80 13,132 -6,63 -5,67 21,87 15,12 36,22 46,22 10,0 48,-27 85,-60 82,-74 103,-81 145,-46 21,18 44,27 72,28 106,4 144,-9 195,-66 59,-67 51,-149 -19,-210 -41,-35 -129,-66 -188,-66 -38,0 -41,-5 -96,-193 -21,-71 -47,-140 -57,-153 -25,-31 -70,-32 -99,-3 -20,20 -21,28 -15,113 8,109 39,268 66,339 24,61 24,67 7,67 -7,0 -21,-24 -30,-54 -36,-114 -168,-274 -271,-329 -58,-31 -191,-31 -257,-1 -192,89 -219,275 -83,564 25,52 52,102 61,112 19,21 53,24 71,6 z M 380,2460 c 83,-20 202,-73 274,-121 94,-63 122,-86 114,-94 -4,-4 -45,18 -92,49 -93,63 -162,93 -293,131 -48,14 -89,27 -91,30 -9,9 11,25 26,21 10,-3 37,-10 62,-16 z m 2702,-36 c 26,-8 48,-20 48,-26 0,-11 -11,-10 -133,17 -68,15 -93,16 -189,6 -102,-11 -130,-10 -116,5 3,3 52,11 109,17 113,14 202,8 281,-19 z m -401,-225 c 21,-21 22,-28 16,-158 -7,-150 -35,-301 -72,-394 -17,-41 -25,-80 -25,-120 0,-70 17,-97 63,-97 61,0 88,-60 45,-100 -28,-26 -96,-27 -147,0 -36,18 -84,65 -93,91 -3,8 -14,6 -38,-7 -25,-13 -57,-18 -111,-19 -64,0 -81,4 -111,25 -49,33 -68,69 -68,125 0,121 129,189 265,140 22,-8 43,-15 46,-15 3,0 12,35 18,78 31,197 91,422 122,453 25,25 64,24 90,-2 z M 965,2130 c 53,-26 120,-94 112,-114 -10,-25 -36,-19 -93,20 -164,113 -357,-7 -372,-232 -5,-86 15,-132 93,-210 77,-77 138,-83 242,-24 61,35 103,98 111,166 6,54 -4,56 -90,17 -67,-30 -91,-25 -96,19 -7,56 132,122 208,99 20,-6 44,-19 52,-28 20,-23 38,-78 39,-117 0,-29 1,-29 12,-11 29,47 84,93 127,105 25,6 53,16 62,21 27,14 49,11 108,-17 97,-45 140,-100 140,-179 0,-154 -183,-264 -330,-198 -64,29 -91,63 -110,139 l -17,67 -21,-45 c -53,-108 -163,-178 -292,-186 -63,-4 -83,-1 -123,18 -59,28 -146,121 -183,197 -96,195 33,470 239,513 56,12 133,3 182,-20 z m 1455,0 c 0,-5 -12,-10 -27,-12 -24,-2 -29,-8 -31,-36 -3,-33 -2,-34 26,-27 18,3 33,2 37,-4 6,-11 0,-15 -47,-25 -23,-5 -28,-12 -28,-35 0,-26 4,-30 40,-36 22,-4 40,-11 40,-16 0,-18 -31,-22 -71,-10 -36,11 -39,14 -39,49 1,20 6,64 13,97 12,55 15,60 42,66 32,6 45,3 45,-11 z m -262,-7 c 2,-8 -6,-13 -21,-13 -28,0 -37,-27 -37,-116 0,-51 -15,-79 -29,-55 -4,6 -4,35 0,64 14,95 13,97 -26,97 -39,0 -48,17 -12,25 69,15 119,14 125,-2 z m 49,-38 c -5,-52 -4,-55 17,-55 30,0 42,15 50,63 13,72 23,36 20,-75 -2,-85 -6,-113 -16,-113 -8,0 -15,18 -18,50 -4,43 -8,50 -27,51 -28,2 -40,-12 -45,-49 -1,-15 -7,-26 -13,-25 -13,4 -11,43 4,136 15,86 37,99 28,17 z m -300,-271 c 56,-22 112,-75 139,-130 21,-44 24,-60 18,-101 -9,-62 -33,-109 -79,-153 -35,-34 -39,-35 -115,-35 -72,0 -81,2 -117,31 -58,47 -85,104 -91,189 -4,67 -2,76 30,136 30,55 40,66 74,76 42,12 90,8 141,-13 z m 972,-53 c 92,-35 231,-139 231,-173 0,-5 -11,-20 -25,-34 -32,-32 -49,-27 -130,37 -34,27 -90,62 -124,79 -53,26 -61,34 -61,58 0,55 30,63 109,33 z M 464,1564 c 9,-8 16,-26 16,-40 0,-20 -16,-35 -83,-78 -119,-78 -131,-82 -162,-62 -31,20 -33,56 -5,81 25,23 190,114 207,115 6,0 19,-7 27,-16 z m 251,-194 c 19,-21 20,-18 -15,-209 -28,-160 -26,-295 6,-338 27,-36 43,-35 70,5 20,30 23,45 22,155 -1,94 3,130 15,154 17,31 53,48 82,37 44,-17 63,-123 45,-246 -11,-74 -11,-88 4,-116 48,-93 183,45 193,198 6,85 -22,143 -86,180 -59,34 -70,53 -51,88 49,86 213,-20 251,-162 20,-74 8,-183 -29,-261 C 1139,678 975,606 874,701 l -21,20 -38,-25 c -58,-40 -121,-32 -178,22 -69,65 -94,173 -76,329 18,168 46,294 71,320 26,28 59,30 83,3 z m 1418,-123 c 48,-36 65,-90 48,-149 -21,-69 -46,-94 -159,-163 -1,-1 16,-41 39,-89 32,-67 43,-102 47,-154 5,-71 -1,-83 -44,-96 -35,-11 -65,23 -75,84 -10,62 -98,255 -111,242 -5,-5 -17,-49 -27,-98 -23,-112 -28,-123 -56,-130 -35,-9 -65,5 -76,34 -29,77 97,490 164,537 15,10 46,14 117,12 89,-2 100,-4 133,-30 z m -555,-16 c 79,-41 122,-113 122,-204 0,-73 -22,-132 -76,-200 -130,-166 -295,-166 -320,-2 -14,95 55,315 124,395 33,39 38,42 75,36 21,-4 55,-15 75,-25 z m 850,-3 c 11,-24 10,-33 -13,-78 -14,-29 -25,-56 -23,-62 4,-11 79,43 150,108 26,24 56,44 67,44 21,0 61,-44 61,-66 0,-22 -67,-90 -142,-146 -37,-28 -68,-52 -68,-54 0,-2 18,-31 39,-64 65,-101 141,-256 141,-289 0,-22 -7,-35 -26,-48 -44,-28 -68,-5 -140,135 -35,68 -79,145 -96,170 l -32,47 -13,-60 c -47,-221 -62,-255 -109,-255 -23,0 -64,31 -64,48 0,5 7,31 14,58 8,27 27,110 41,184 37,190 75,298 121,344 26,26 76,17 92,-16 z m 681,-145 c 57,-67 142,-237 189,-378 49,-146 55,-180 28,-180 -15,0 -23,15 -38,70 -36,134 -81,260 -120,340 -39,80 -113,185 -129,185 -5,0 -9,7 -9,15 0,24 32,3 79,-52 z m -265,-73 c 99,-164 216,-382 216,-401 0,-48 -56,-75 -92,-46 -9,6 -68,115 -133,240 -115,224 -117,228 -100,253 12,18 23,24 43,22 21,-2 35,-17 66,-68 z M 540,665 c 0,-2 -28,-32 -62,-67 -35,-35 -98,-102 -141,-151 -43,-48 -83,-85 -88,-82 -15,10 8,44 90,134 97,107 201,193 201,166 z M 1036,498 C 1017,469 966,378 923,296 852,160 820,115 820,152 c 0,34 175,344 223,396 35,38 31,7 -7,-50 z m 304,-173 c -33,-99 -60,-187 -60,-197 0,-10 -4,-18 -10,-18 -17,0 26,173 80,320 36,96 43,111 47,90 2,-8 -24,-96 -57,-195 z m 513,187 c 21,-23 147,-339 147,-367 0,-50 -61,-63 -83,-18 -32,64 -130,370 -124,386 8,22 40,22 60,-1 z M 759,479 C 773,454 770,447 685,304 581,129 574,120 544,120 c -30,0 -58,42 -50,73 8,32 181,293 203,306 26,16 45,9 62,-20 z m 1728,-31 c 64,-61 139,-153 176,-219 31,-52 32,-59 13,-59 -7,0 -38,37 -67,83 -30,45 -89,117 -131,160 -43,43 -78,80 -78,83 0,18 40,-5 87,-48 z m -322,-48 c 33,-64 74,-189 64,-196 -14,-9 -14,-9 -52,96 -19,52 -37,103 -42,113 -13,30 14,19 30,-13 z" id="path1" sodipodi:nodetypes="csscccssssccccccccccccccccscccccscsccccccccccccccccccccccccccccsccsscscccscscsssccccccscscscccccccccscccccccscccccsscscccsccccccccscccccccssccccccccsccccccscccccsccsccscccccsccsccccccscccccsccssccccccscscsscsccscccccccccccscccccccccscccccscsccccscssccscccsccsccccccccccsccccccssccsccscscccccccccccccccccccccccccccccccscccccccscccccccccsscscscccccssccscccscsssccscccccsccccsccsccsssccscscccccscccccsccscccccc" /> <path d="m 2437,3223 c -3,-5 -8,-23 -12,-40 -6,-31 -5,-33 20,-33 64,0 115,60 63,74 -32,8 -66,7 -71,-1 z" id="path2" /> <path d="m 1981,2434 c -11,-8 -21,-24 -21,-35 0,-16 5,-18 28,-13 63,15 78,39 35,55 -13,5 -28,2 -42,-7 z" id="path3" /> <path d="m 2270,1609 c -30,-12 -40,-26 -40,-61 0,-63 101,-76 180,-24 57,38 54,61 -12,81 -58,17 -92,18 -128,4 z" id="path4" /> <path d="m 1320,1753 c -55,-20 -81,-87 -61,-153 16,-55 52,-80 115,-80 80,0 146,57 146,126 0,39 -21,58 -100,89 -66,26 -74,27 -100,18 z" id="path5" /> <path d="m 1777,1723 c -65,-10 -61,-136 7,-210 28,-30 39,-36 76,-36 36,0 48,6 71,31 35,39 47,104 25,137 -38,58 -110,89 -179,78 z" id="path6" /> <path d="m 1934,1105 c -27,-63 -29,-75 -11,-75 30,0 118,54 132,80 19,36 4,50 -53,50 -43,0 -43,0 -68,-55 z" id="path7" /> <path d="m 1501,1117 c -35,-43 -90,-253 -73,-282 7,-14 13,-13 42,7 85,58 135,183 96,242 -22,35 -51,49 -65,33 z" id="path8" /> <path d="m 259,383 c -13,-16 -12,-17 4,-4 9,7 17,15 17,17 0,8 -8,3 -21,-13 z" id="path9" /> </g> </svg>`);

    const greatWorkKeepItUp = parseSvg(`<?xml version="1.0" encoding="UTF-8" standalone="no"?> <svg version="1.0" width="702.37836pt" height="835.5pt" viewBox="0 0 702.37836 835.5" preserveAspectRatio="xMidYMid" id="svg31" sodipodi:docname="outline.svg" inkscape:version="1.3.2 (091e20ef0f, 2023-11-25, custom)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"> <defs id="defs31" /> <sodipodi:namedview id="namedview31" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" inkscape:document-units="pt" inkscape:zoom="0.87375" inkscape:cx="310.72961" inkscape:cy="709.01288" inkscape:window-width="2560" inkscape:window-height="1371" inkscape:window-x="0" inkscape:window-y="0" inkscape:window-maximized="1" inkscape:current-layer="svg31" /> <metadata id="metadata1"> Created by potrace 1.16, written by Peter Selinger 2001-2019 </metadata> <g transform="matrix(0.1,0,0,-0.1,-148.12952,921)" fill="#000000" stroke="none" id="g31" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none"> <path d="m 4806,9085 7,-125 h -41 c -47,0 -48,-3 -36,-94 7,-47 7,-47 42,-44 46,4 47,-1 55,-217 4,-93 10,-198 13,-233 l 7,-63 63,2 c 35,1 68,5 75,10 12,7 10,141 -7,406 l -7,102 52,7 c 40,5 51,10 47,21 -4,8 -6,37 -6,64 v 49 h -49 c -59,0 -61,4 -61,143 v 97 h -80 -80 z" id="path1" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 5365,8941 c 4,-25 13,-86 21,-136 9,-49 24,-144 34,-210 11,-66 24,-144 30,-174 5,-29 10,-68 10,-86 0,-32 2,-33 51,-40 27,-4 52,-5 53,-4 3,5 70,109 101,159 110,176 124,194 125,153 1,-32 11,-96 31,-195 10,-53 19,-109 19,-125 0,-39 9,-48 60,-61 34,-8 46,-8 53,1 4,7 40,66 79,132 40,66 116,194 170,285 111,186 111,175 -2,187 -49,5 -58,3 -64,-13 -15,-38 -177,-304 -186,-304 -5,0 -12,21 -15,48 -4,26 -15,90 -25,142 -10,52 -22,116 -25,141 -6,45 -7,46 -50,56 -52,12 -50,13 -104,-78 -115,-190 -153,-249 -160,-249 -5,0 -11,26 -14,58 -4,31 -17,118 -29,194 l -22,136 -73,15 -74,14 z" id="path2" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 4583,8954 c -79,-16 -81,-17 -75,-54 2,-16 2,-30 -1,-30 -2,0 -30,12 -62,26 -47,22 -67,26 -110,21 -190,-20 -309,-187 -275,-387 22,-128 84,-213 196,-269 39,-20 64,-25 124,-25 88,1 132,19 197,85 l 43,42 6,-31 c 7,-36 5,-35 94,-18 54,10 65,16 64,32 -2,19 -20,107 -54,264 -18,83 -53,253 -65,317 -4,18 -10,34 -13,37 -4,2 -35,-3 -69,-10 z m -106,-195 c 67,-32 98,-93 98,-190 0,-68 -3,-79 -29,-113 -79,-104 -223,-98 -301,12 -27,40 -30,51 -30,121 0,70 3,81 29,115 54,72 151,95 233,55 z" id="path3" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 3623,8706 c -51,-17 -131,-66 -159,-99 -32,-36 -72,-127 -79,-178 -13,-92 24,-210 93,-289 43,-51 147,-102 218,-108 152,-13 336,111 379,256 6,21 4,22 -67,22 l -73,-1 -27,-39 c -59,-85 -187,-124 -265,-80 -35,19 -80,67 -71,75 2,2 199,87 457,196 19,8 22,14 16,36 -15,59 -97,154 -166,192 -55,29 -191,39 -256,17 z m 187,-138 c 57,-30 61,-45 13,-64 -21,-8 -47,-19 -58,-24 -51,-24 -228,-100 -231,-100 -2,0 -4,18 -4,40 0,127 158,210 280,148 z" id="path4" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 6420,8672 c -71,-29 -128,-69 -160,-113 -127,-176 -76,-412 112,-514 74,-40 196,-47 280,-15 74,27 145,93 183,166 27,54 30,68 30,154 -1,84 -4,101 -28,148 -35,67 -92,124 -159,158 -70,36 -190,43 -258,16 z m 214,-156 c 101,-65 112,-201 25,-300 -63,-71 -159,-83 -242,-29 -42,26 -76,88 -77,136 0,83 51,175 114,203 39,18 147,12 180,-10 z" id="path5" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 3203,8507 c -40,-27 -63,-66 -63,-105 0,-43 -16,-48 -35,-12 l -16,31 -50,-28 c -28,-15 -53,-33 -55,-39 -5,-11 18,-52 171,-309 39,-66 86,-146 104,-177 18,-32 37,-60 42,-64 6,-3 33,8 60,25 28,17 55,31 60,31 18,0 7,25 -67,149 -105,176 -137,247 -137,300 0,34 5,48 22,63 13,10 30,18 38,18 15,0 14,21 -3,113 -7,33 -27,34 -71,4 z" id="path6" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 6974,8388 c -25,-40 -59,-95 -75,-123 -16,-27 -33,-57 -39,-65 -42,-65 -170,-283 -170,-289 0,-5 8,-11 18,-15 9,-3 38,-19 64,-35 l 47,-30 97,161 c 119,197 164,248 219,248 22,0 46,-7 56,-16 21,-19 34,-13 98,43 l 33,30 -31,26 c -42,35 -92,44 -141,24 -21,-8 -41,-13 -43,-10 -3,2 2,17 11,33 9,16 14,30 12,32 -29,22 -92,58 -100,58 -6,0 -31,-33 -56,-72 z" id="path7" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 7449,8368 c -40,-51 -114,-145 -163,-208 -50,-63 -141,-179 -203,-257 -62,-78 -113,-146 -113,-150 0,-14 110,-94 120,-88 5,3 49,56 97,117 l 87,112 7,-34 c 4,-18 13,-112 20,-208 l 13,-174 74,-60 75,-61 -7,104 c -7,109 -13,181 -22,290 l -5,67 118,21 c 65,12 157,29 205,37 l 88,16 -76,60 -75,60 -72,-12 c -40,-6 -119,-20 -175,-31 -57,-12 -106,-18 -109,-16 -5,6 84,124 231,309 l 85,107 -59,46 c -32,25 -61,45 -63,45 -3,0 -38,-42 -78,-92 z" id="path8" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 2566,8345 c -148,-52 -269,-166 -325,-307 -20,-50 -22,-71 -19,-170 3,-104 6,-118 37,-182 117,-240 400,-333 641,-211 76,39 184,149 217,222 37,82 44,222 14,308 -23,65 -86,165 -105,165 -6,0 -54,-37 -107,-83 -169,-145 -201,-172 -215,-180 -16,-9 -13,-16 49,-87 l 37,-44 38,35 c 20,20 63,57 95,84 66,55 77,52 77,-26 0,-72 -27,-135 -80,-188 -91,-91 -216,-123 -336,-85 -77,24 -162,105 -187,178 -71,209 69,411 301,432 l 72,7 v 41 c 0,23 3,58 6,79 l 7,37 h -74 c -52,0 -94,-8 -143,-25 z" id="path9" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 4575,7722 c -5,-4 -20,-28 -32,-55 -28,-57 -72,-87 -131,-87 -61,0 -62,-18 -8,-91 44,-58 46,-64 46,-125 0,-45 4,-66 13,-70 8,-3 39,5 70,16 l 57,21 59,-22 c 85,-30 91,-26 91,68 0,74 2,80 35,122 20,25 34,51 33,60 -2,9 -24,19 -58,26 -79,16 -94,28 -117,87 -19,51 -37,66 -58,50 z" id="path10" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 5927,7630 c -31,-56 -70,-90 -101,-90 -35,0 -96,-20 -96,-32 0,-6 17,-38 37,-72 34,-56 37,-66 34,-122 -2,-39 2,-64 9,-69 6,-4 40,-2 75,5 58,11 70,10 131,-10 79,-27 84,-24 84,67 0,58 2,64 45,114 25,30 44,60 43,69 -3,15 -61,39 -106,43 -20,1 -30,14 -58,74 -40,89 -57,94 -97,23 z" id="path11" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 3145,7452 c -79,-24 -112,-42 -161,-89 -81,-75 -119,-148 -164,-313 -28,-100 -33,-139 -41,-305 -10,-230 -26,-447 -35,-496 -6,-35 -8,-37 -58,-43 -169,-20 -316,-91 -391,-191 -14,-18 -48,-88 -76,-154 -53,-130 -76,-171 -132,-238 -83,-99 -105,-207 -72,-353 10,-41 20,-91 22,-111 6,-47 -45,-192 -102,-289 -77,-130 -88,-158 -88,-230 0,-36 6,-85 12,-109 14,-51 186,-425 239,-521 75,-134 172,-200 325,-220 145,-19 567,-44 743,-45 h 171 l 59,-38 c 144,-92 505,-257 562,-257 17,0 46,-9 64,-19 46,-26 238,-77 388,-102 69,-11 150,-25 180,-31 81,-14 731.8911,-33.8845 881.8911,-19.8845 4.8311,78.11 23.0062,270.3728 15.0062,197.3728 C 5483.8973,3447.4883 5466,3070 5460,2930 c -5,-140 -10,-262 -11,-270 -1,-8 -1,-45 -1,-82 2,-81 8,-83 90,-37 60,34 195,129 200,141 2,5 7,8 12,8 7,0 323,217 529,363 120,86 151,95 230,73 33,-9 93,-30 133,-47 40,-17 179,-70 308,-119 129,-49 302,-114 383,-145 82,-31 158,-55 170,-53 20,3 22,8 20,70 -1,39 -9,77 -17,90 -8,13 -22,52 -31,88 -9,36 -32,117 -52,180 -44,145 -146.1296,452.8648 -160.1296,501.8648 150.3702,-99.6554 423.9923,-23.2802 662.1296,43.1352 208,61 367,137 445,215 91,91 101,117 110,300 5,85 13,174 19,197 16,61 2,110 -61,211 l -53,87 -1,165 c 0,91 -5,176 -11,190 -17,40 -82,113 -163,181 -41,35 -100,86 -131,114 -87,80 -135,98 -239,93 -72,-4 -108,-14 -240,-62 -200,-74 -203,-75 -218,-41 -7,14 -12,33 -12,42 0,21 -75,243 -102,301 -77,166 -204,346 -347,496 -355,369 -923,649 -1496,735 -269,40 -447,54 -623,48 -195,-7 -498,-50 -694,-99 -98,-25 -133,-30 -146,-22 -9,6 -26,43 -38,82 -29,95 -80,169 -193,283 -79,79 -111,103 -181,137 -152,74 -295,97 -405,64 z m 192,-133 c 301,-81 474,-282 490,-570 9,-146 -23,-281 -102,-439 -37,-73 -118,-176 -145,-185 -10,-3 -84,8 -166,24 -137,27 -422,61 -503,61 h -34 l 6,68 c 19,223 29,349 37,494 12,237 32,316 106,434 37,59 79,92 149,116 64,22 70,22 162,-3 z m 1813,-460 c 30,-5 100,-13 155,-18 200,-18 732,-158 762,-201 6,-9 29,-22 51,-28 40,-12 246,-115 272,-137 8,-6 44,-29 79,-50 160,-96 404,-325 522,-491 105,-146 194,-335 240,-509 32,-118 30,-126 -52,-191 -39,-31 -91,-84 -116,-118 l -127.2908,-228.9904 c -64.1835,-372.5852 35.7027,-1014.6557 378.2869,-1218.8393 -319.6381,202.7744 -440.5523,741.1284 -378.668,1214.3958 C 6939.4771,4914.2959 6766,4856 6757,4864 c -30,30 -146,212 -153,240 -4,16 -20,41 -36,55 -15,14 -47,56 -71,93 -50,79 -259,391 -268,398 -3,3 -8,12 -11,20 -3,8 -29,48 -58,89 -58,82 -67,82 -89,1 -6,-25 -32,-99 -56,-165 -41,-113 -129,-362 -251,-715 l -54,-155 -117,-32 c -220,-61 -496,-135 -806,-217 -92,-24 -174,-47 -182,-50 -41,-15 -4,-58 160,-181 72,-54 159,-122 195,-150 36,-28 151,-116 255,-194 105,-78 209,-158 233,-177 l 42,-36 v -112 -112 l -6.6112,-58.6422 C 5489.6828,3420.3002 5106,3410 4995,3410 c -88,0 -339,21 -480,41 -85,12 -518,115 -560,134 -16,8 -70,30 -118,49 -124,51 -299,140 -320,164 -18,20 -17,21 27,52 71,48 126,70 182,70 83,0 113,10 154,52 27,28 42,55 51,91 18,75 15,229 -5,320 -10,42 -16,84 -12,92 3,8 45,34 93,59 95,48 143,90 167,148 9,20 20,39 25,42 4,3 54,-10 110,-28 178,-60 233,-69 414,-64 153,5 167,7 262,40 205,72 288,126 467,305 232,231 386,498 479,828 42,149 42,152 43,321 1,218 -3,229 -86,221 -31,-3 -62,-8 -69,-12 -8,-6 -10,-31 -5,-91 15,-198 -43,-457 -154,-684 -47,-97 -142,-264 -160,-280 -3,-3 -18,-23 -35,-45 -51,-70 -218,-236 -282,-281 -83,-60 -212,-118 -305,-139 -122,-27 -335,-17 -453,20 -49,15 -109,33 -132,39 -38,9 -44,14 -49,45 -4,20 -2,56 3,81 6,25 19,79 28,120 26,112 15,351 -20,475 -70,244 -161,345 -393,436 -59,22 -110,44 -114,48 -9,8 9,42 79,154 67,107 121,266 136,398 l 11,97 65,20 c 166,50 432,99 631,115 95,8 427,5 480,-4 z M 3117,6060 c 373,-50 724,-138 826,-207 134,-92 200,-259 220,-558 3,-42 -31,-45 -91,-6 -163,104 -349,168 -730,251 -101,22 -237,56 -304,75 -220,64 -268,64 -253,-3 12,-57 37,-73 178,-114 141,-41 295,-79 392,-98 96,-19 323,-80 412,-111 148,-52 308,-136 341,-177 18,-23 15,-85 -8,-161 -11,-36 -26,-101 -34,-143 -17,-90 -38,-126 -83,-145 -39,-16 -37,-17 -167,70 -89,60 -276,159 -386,206 -101,43 -284,98 -375,114 -49,8 -152,18 -227,22 l -137,6 -6,-24 c -4,-13 -5,-41 -3,-63 l 3,-39 95,-6 c 311,-22 455,-60 735,-194 192,-93 281,-152 277,-186 -1,-13 -5,-45 -8,-71 -4,-31 1,-88 16,-165 25,-131 20,-173 -21,-173 -12,0 -101,27 -198,59 -97,33 -232,76 -301,95 -69,20 -136,41 -150,46 -57,22 -376,71 -445,68 l -70,-3 1,-49 c 1,-57 16,-73 78,-80 174,-19 315,-41 391,-63 97,-26 527,-164 535,-171 6,-5 -11,-18 -117,-87 -133,-86 -281,-109 -563,-85 -80,7 -224,16 -320,20 -231,11 -320,37 -371,108 -29,41 -170,336 -231,482 -53,127 -50,154 28,291 67,118 97,190 119,287 15,64 14,73 -6,167 -41,191 -40,195 71,350 69,96 71,100 109,205 38,103 72,162 108,186 15,10 66,33 113,51 l 85,32 197,1 c 108,0 232,-5 275,-10 z m 4849,-736 c 21,-14 64,-49 94,-78 30,-29 81,-74 113,-101 85,-70 94,-94 78,-206 -20,-143 -2,-227 78,-349 40,-61 42,-68 37,-120 -3,-30 -10,-124 -15,-208 -8,-149 -9,-154 -38,-190 -41,-51 -122,-106 -201,-136 -191,-74 -570,-160 -693,-157 -84,1 -165,48 -217,125 -16,22 -41,59 -55,80 -51,73 -51,73 161,78 182,5 268,17 467,63 33,8 98,17 145,20 122,9 120,8 120,64 0,82 13,81 -368,23 -350,-54 -489,-64 -562,-39 -35,12 -35,13 -58,117 -25,113 -23,165 7,175 10,3 65,-2 122,-10 113,-17 355,-20 454,-6 90,13 215,49 260,74 44,25 55,55 34,93 -16,31 -48,31 -146,-2 -142,-48 -349,-64 -530,-42 l -96,12 -24,50 c -13,28 -39,73 -58,100 -39,54 -45,91 -16,101 10,3 59,7 108,10 248,12 478,53 582,104 40,19 76,41 78,49 3,7 -7,26 -23,43 -31,32 -65,37 -117,16 -71,-30 -268,-65 -464,-83 l -73,-7 v 28 c 0,38 78,114 157,153 61,31 319,133 413,163 32,10 87,18 131,18 66,1 82,-3 115,-25 z" id="path12" style="fill:none;stroke:#000000;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" sodipodi:nodetypes="ccccccccccccsccccccsccccccscccsccsscccsscccscccccccccccscccccccccccccccscccscccccccsccccccscscccsscccccccssccccccscccccsccccccccccccccccccccccccccccccccccccccccccscccccccccccccccccccscccccccccccccccccccsccccssccsccccccccccscccccccccccccccccccccscccs" /> <path d="m 5235,6378 c -2,-7 -9,-35 -15,-61 -29,-133 -125,-236 -236,-254 -40,-7 -113,18 -139,47 -24,26 -41,25 -82,-6 -45,-34 -44,-67 5,-112 64,-60 110,-75 210,-67 105,8 131,17 199,66 96,72 183,225 183,325 0,42 -2,46 -35,60 -42,17 -84,18 -90,2 z" id="path13" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 4281,6155 c -60,-35 -89,-72 -97,-122 -8,-53 15,-96 74,-137 93,-66 207,-44 275,54 58,84 -31,215 -154,226 -46,4 -61,1 -98,-21 z" id="path14" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 1774,6739 c -47,-109 -69,-136 -120,-144 -94,-14 -169,-40 -172,-59 -3,-11 4,-25 13,-32 10,-7 49,-41 87,-75 l 70,-62 -7,-118 c -7,-105 -6,-119 9,-125 10,-4 56,14 117,44 l 100,51 79,-29 c 44,-16 93,-36 110,-45 58,-30 66,-14 39,86 -35,135 -24,180 59,262 47,45 67,80 59,101 -5,13 -23,16 -89,16 -133,0 -145,6 -202,102 -89,151 -98,153 -152,27 z" id="path15" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 7375,6588 c -2,-7 -9,-30 -15,-50 -18,-60 -57,-94 -116,-101 -28,-4 -59,-14 -70,-22 -21,-16 -21,-17 40,-90 37,-44 40,-51 44,-126 3,-44 9,-82 14,-85 5,-3 38,6 73,22 l 65,27 74,-27 c 41,-15 80,-25 86,-21 7,5 9,34 4,91 l -7,84 47,50 c 33,35 46,57 44,73 -3,20 -10,23 -69,27 -79,6 -99,20 -140,103 -21,41 -35,57 -49,57 -12,0 -22,-6 -25,-12 z" id="path16" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 8121,6042 c -38,-41 -42,-50 -38,-82 3,-19 10,-47 15,-61 10,-24 14,-25 83,-25 l 74,1 5,36 c 4,19 14,46 23,59 23,34 22,37 -20,59 -21,10 -47,28 -57,40 -11,12 -24,21 -30,20 -6,-1 -31,-22 -55,-47 z" id="path17" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 2160,3700 c -35,-70 -67,-90 -140,-90 -70,0 -72,-16 -13,-91 l 48,-62 -4,-88 c -4,-104 -3,-104 85,-59 32,16 67,30 78,30 10,0 45,-14 77,-31 78,-42 86,-35 82,73 l -3,83 50,55 c 27,30 49,62 47,70 -1,11 -19,16 -63,20 -70,6 -110,29 -129,73 -17,39 -51,77 -70,77 -8,0 -28,-27 -45,-60 z" id="path18" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 3523,3128 c -11,-13 -30,-41 -41,-63 -11,-22 -28,-47 -38,-56 -21,-18 -97,-39 -143,-39 -16,0 -33,-4 -36,-10 -6,-9 11,-49 24,-60 4,-3 24,-29 45,-58 l 38,-53 -7,-88 c -5,-61 -4,-91 4,-96 6,-3 46,7 87,24 42,17 84,31 93,31 9,0 51,-12 94,-26 54,-18 82,-23 89,-16 7,7 6,33 -2,81 -15,91 -10,112 40,151 22,17 40,38 40,46 0,8 5,14 11,14 6,0 9,12 7,28 -3,25 -8,28 -89,46 l -86,19 -28,56 c -48,96 -66,108 -102,69 z" id="path19" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 4583,2958 c -11,-13 -26,-33 -32,-45 -8,-16 -21,-23 -42,-23 -40,0 -47,-24 -18,-63 13,-18 26,-52 29,-77 l 5,-45 h 95 95 l 5,47 c 3,26 16,61 28,77 12,17 22,35 22,40 0,5 -22,17 -50,26 -27,9 -50,20 -50,23 0,10 -49,62 -59,62 -4,0 -17,-10 -28,-22 z" id="path20" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 6370,2796 c -60,-36 -59,-32 -43,-136 l 8,-55 h 45 c 25,0 60,-6 77,-14 47,-19 63,-9 63,38 0,30 7,47 27,67 l 27,27 -30,23 c -33,27 -54,46 -72,68 -19,23 -40,19 -102,-18 z" id="path21" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 2818,2648 c -30,-40 -106,-144 -169,-232 -63,-87 -156,-215 -206,-284 l -92,-125 59,-44 c 33,-23 64,-43 69,-43 8,0 159,199 206,273 9,15 21,27 26,27 6,0 9,-101 9,-241 -1,-133 0,-242 2,-243 2,0 21,-15 43,-31 42,-32 92,-65 98,-65 2,0 4,60 5,133 1,72 5,205 8,294 l 7,163 51,15 c 95,29 361,103 394,110 17,3 32,10 32,13 0,4 -20,19 -43,33 -23,15 -58,39 -78,54 l -36,26 -84,-24 c -172,-51 -280,-79 -286,-74 -2,3 26,47 64,99 38,51 77,105 87,119 l 16,26 -52,40 c -29,22 -58,43 -65,47 -7,3 -33,-23 -65,-66 z" id="path22" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 7243,2450 c -57,-12 -112,-42 -149,-82 -34,-35 -74,-107 -74,-133 0,-23 -17,-18 -35,9 l -16,25 -33,-22 c -50,-35 -86,-64 -86,-72 0,-6 66,-103 217,-320 38,-55 116,-167 173,-250 57,-82 105,-152 106,-154 4,-5 100,57 114,74 10,12 -3,36 -64,125 -42,60 -79,116 -82,124 -4,10 11,14 63,18 41,3 84,13 108,26 95,49 165,165 165,275 0,139 -120,305 -250,345 -55,17 -111,21 -157,12 z m 154,-184 c 120,-80 122,-274 3,-336 -64,-33 -103,-35 -163,-7 -76,35 -120,99 -125,182 -4,78 17,119 83,163 45,30 56,34 105,30 39,-3 67,-12 97,-32 z" id="path23" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 4893,2443 c -7,-2 -13,-10 -13,-17 0,-18 -40,-52 -82,-70 -21,-8 -38,-21 -38,-28 0,-7 14,-31 30,-52 17,-22 30,-51 30,-65 0,-43 10,-47 105,-46 h 90 l 3,48 c 2,30 12,61 28,84 31,46 28,67 -11,71 -56,5 -74,12 -80,32 -7,22 -32,50 -43,49 -4,0 -13,-3 -19,-6 z" id="path24" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 6692,2116 c -28,-13 -55,-25 -58,-28 -3,-3 4,-25 15,-49 50,-110 143,-334 147,-359 11,-52 -47,-126 -101,-131 -99,-7 -115,10 -215,238 -46,104 -85,190 -87,192 -3,4 -119,-46 -135,-59 -6,-4 9,-43 62,-165 95,-219 151,-304 224,-342 117,-61 319,14 381,142 25,51 27,63 22,129 -6,68 -26,127 -88,265 -11,24 -29,64 -39,90 -46,114 -43,112 -128,77 z" id="path25" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 3290,2107 c -112,-24 -186,-86 -243,-205 -25,-54 -30,-76 -30,-140 0,-66 5,-86 31,-137 62,-122 195,-205 330,-205 72,0 141,17 149,37 3,7 -13,34 -34,60 l -40,47 -61,-3 c -64,-2 -135,21 -175,57 -32,29 -57,89 -57,138 0,45 1,46 28,41 15,-2 119,-48 232,-102 113,-53 212,-99 221,-102 12,-3 22,10 39,52 30,73 30,190 1,258 -40,92 -156,187 -246,202 -79,13 -91,13 -145,2 z m 174,-152 c 55,-26 96,-87 96,-142 0,-23 -4,-43 -9,-43 -19,0 -306,139 -309,150 -4,12 30,40 63,52 33,12 118,3 159,-17 z" id="path26" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 5740,2046 c -53,-14 -53,3 -4,-227 6,-25 3,-27 -36,-34 -36,-6 -41,-10 -36,-29 3,-11 8,-40 12,-63 7,-46 19,-52 68,-33 22,8 26,6 31,-13 2,-12 27,-125 55,-251 28,-127 52,-231 53,-233 5,-5 122,18 136,26 14,9 15,0 -75,418 -10,45 -15,85 -11,89 4,4 24,10 44,13 35,6 38,9 35,36 -2,17 -8,47 -13,68 -9,34 -13,38 -35,33 -76,-19 -67,-26 -92,81 -12,54 -22,106 -22,116 0,20 -40,22 -110,3 z" id="path27" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 5488,2015 c -36,-20 -53,-74 -38,-120 15,-44 44,-65 93,-65 83,0 129,102 74,165 -27,33 -90,42 -129,20 z" id="path28" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 3966,1853 c -196,-60 -299,-301 -210,-489 23,-49 92,-117 144,-142 117,-56 222,-63 319,-21 67,28 82,46 56,65 -11,8 -35,28 -52,45 l -33,31 -51,-17 c -123,-41 -269,47 -269,162 0,38 3,44 18,39 35,-11 466,-126 486,-129 17,-3 37,87 34,153 -8,152 -114,272 -271,306 -78,17 -110,16 -171,-3 z m 185,-137 c 43,-18 84,-61 104,-109 26,-64 30,-63 -160,-12 -55,15 -117,32 -137,37 -21,6 -38,16 -38,22 0,17 39,52 70,65 37,15 123,13 161,-3 z" id="path29" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 5570,1763 c -80,-8 -80,-8 -74,-66 3,-28 14,-108 24,-177 10,-69 22,-154 26,-190 8,-83 30,-210 37,-216 3,-3 37,-2 77,2 l 72,7 -7,61 c -3,33 -15,120 -25,191 -11,72 -26,182 -35,245 -20,142 -22,150 -43,148 -9,0 -33,-3 -52,-5 z" id="path30" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> <path d="m 4517,1738 c -3,-13 -10,-111 -17,-218 -6,-107 -18,-296 -26,-419 -8,-123 -12,-227 -7,-232 4,-4 40,-9 79,-11 l 71,-3 7,104 c 3,57 6,126 6,153 0,26 2,48 5,48 3,0 28,-18 55,-39 57,-45 106,-57 204,-49 199,17 329,253 255,465 -19,53 -36,80 -79,123 -101,102 -234,118 -351,44 -21,-13 -41,-24 -44,-24 -3,0 -5,16 -5,35 v 35 h -52 c -29,0 -63,3 -74,6 -17,4 -23,0 -27,-18 z m 374,-143 c 86,-31 126,-101 116,-203 -10,-111 -67,-173 -165,-180 -83,-5 -138,25 -174,97 -32,62 -34,96 -13,167 17,58 56,100 111,119 51,18 72,18 125,0 z" id="path31" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:30;stroke-dasharray:none" /> </g> </svg>`);

    const happyHalloween1 = parseSvg(`<?xml version="1.0" encoding="UTF-8" standalone="no"?> <svg version="1.0" width="463.19043pt" height="481.28061pt" viewBox="0 0 463.19043 481.28061" preserveAspectRatio="xMidYMid" id="svg81" sodipodi:docname="outline5.svg" inkscape:version="1.3.2 (091e20ef0f, 2023-11-25, custom)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"> <defs id="defs81" /> <sodipodi:namedview id="namedview81" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" inkscape:document-units="pt" inkscape:zoom="1.4142136" inkscape:cx="356.02826" inkscape:cy="333.40085" inkscape:window-width="2560" inkscape:window-height="1371" inkscape:window-x="0" inkscape:window-y="0" inkscape:window-maximized="1" inkscape:current-layer="g81" /> <metadata id="metadata1"> Created by potrace 1.16, written by Peter Selinger 2001-2019 </metadata> <g transform="matrix(0.1,0,0,-0.1,-81.584578,555.39141)" fill="none" stroke="#000000" stroke-width="30px" id="g81"> <path d="m 2553,852 c 47,-4 49,-22 2,-22 -31,0 -35,-3 -36,-27 0,-16 -4,-37 -8,-48 -7,-16 -10,-12 -18,25 -6,33 -14,46 -28,48 -11,1 -31,6 -45,9 -21,6 -18,8 20,12 44,6 45,7 55,51 l 10,45 5,-45 c 5,-44 6,-45 43,-48 z" id="path114" style="stroke:#ffc600;stroke-opacity:1" /> <path d="m 3865,897 c 19,-4 19,-5 -1,-6 -57.9008,-2.14447 -40.1066,-82.9467 -56,-75 -29.1972,78.13884 8.0159,40.15774 -71,82 79.4075,14.23078 41.8103,26.82095 73,72 13.1475,19.04444 -15.5004,-54.80635 55,-73 z" id="path113" sodipodi:nodetypes="ccccsc" style="stroke:#ffc600;stroke-opacity:1" /> <path d="m 1463,1249 c 3,-23 9,-45 14,-50 9,-9 43,-17 76,-18 33,-2 7,-21 -28,-21 -39,0 -65,-29 -65,-72 0,-16 -5,-28 -12,-28 -6.318,0 -8.1765,78.3866 -32,92 -6,4 -25,8 -43,8 -40,0 -55,20 -16,21 15,1 36,1 45,0 22,-3 38,29 38,73 0,49 16,45 23,-5 z" id="path112" sodipodi:nodetypes="cscssscsccsc" style="stroke:#ffc600;stroke-opacity:1" /> <path d="m 4780,1309 c 0,-47 15,-66 60,-73 50,-8 43,-26 -9,-26 -41,0 -51,-13 -51,-72 0,-47 -18,-31 -25,22 -7,50 -7,50 -43,50 -58,0 -72,16 -23,25 52,9 71,27 71,71 0,19 5,34 10,34 6,0 10,-14 10,-31 z" id="path111" style="stroke:#ffc600;stroke-opacity:1" /> <path d="m 3939,3056 c 9,-10 2,-39 -29,-126 -32,-90 -39,-119 -33,-153 5,-33 1,-51 -25,-101 -28,-57 -83,-263 -82,-313 0,-13 -9,-28 -20,-35 -11,-7 -35,-34 -53,-60 -17,-27 -34,-48 -37,-48 -6,0 -81,123 -93,153 -4,10 -9,31 -12,47 -3,15 -16,52 -30,81 -14,30 -25,61 -26,69 -1,18 -58,-187 -58,-211 -1,-10 -16,-32 -34,-50 -18,-19 -47,-52 -65,-74 -19,-22 -31,-35 -27,-28 6,12 -31,80 -65,118 -35,40 -72,148 -79,230 -6,65 -13,88 -36,124 -27,41 -30,53 -36,165 -3,67 -11,134 -18,149 -19,48 -16,50 52,42 34,-4 76,-7 92,-6 17,0 36,-3 44,-8 14,-9 17,-57 6,-118 -3,-23 -1,-51 6,-68 7,-17 13,-75 14,-130 2,-144 16,-317 27,-339 17,-33 28,-3 44,120 9,65 22,134 30,153 14,33 17,103 14,296 -1,110 5,118 95,108 l 70,-8 1,-85 c 1,-82 12,-226 33,-437 7,-68 17,-116 32,-144 33,-66 42,-36 53,181 3,52 10,109 15,127 7,23 5,43 -7,76 -15,41 -15,50 -1,94 10,35 12,60 6,93 -6,29 -5,55 2,73 10,26 13,27 83,27 44,1 83,6 98,15 31,18 35,18 49,1 z" id="path107" style="stroke:#ff9101;stroke-opacity:1" /> <path d="m 2337,3066 c 34,0 63,-3 66,-6 3,-3 1,-36 -5,-75 -5,-38 -13,-106 -18,-150 -4,-44 -13,-100 -19,-125 -5,-25 -10,-81 -10,-125 -1,-44 -8,-112 -17,-151 -26,-110 -30,-108 146,-99 l 150,7 v -29 c 0,-16 -6,-38 -14,-48 -12,-17 -17,-18 -40,-7 -39,18 -58,15 -90,-13 -35,-30 -43,-30 -76,-5 -30,23 -59,25 -104,6 -32,-13 -34,-13 -40,7 -3,12 -9,56 -12,97 -3,41 -13,97 -21,124 -9,29 -13,64 -10,90 4,22 -1,80 -10,128 -15,79 -15,92 0,160 11,51 14,97 10,152 l -6,79 29,-8 c 16,-4 57,-8 91,-9 z" id="path106" style="stroke:#ff9101;stroke-opacity:1" /> <path d="m 2943,3066 c 94,-101 90,-94 78,-140 -9,-36 -7,-51 10,-95 21,-58 23,-51 -25,-116 -6,-9 -2,-31 12,-65 27,-66 27,-68 -3,-92 -19,-15 -25,-29 -25,-59 0,-26 -9,-53 -26,-78 -18,-27 -23,-46 -19,-64 5,-20 1,-29 -24,-46 -25,-18 -29,-26 -21,-41 18,-34 12,-41 -37,-39 -27,0 -59,-2 -73,-6 -22,-6 -28,-2 -40,27 -12,25 -24,35 -55,44 -37,10 -40,14 -37,44 3,35 -35,160 -49,160 -5,0 -15,13 -24,30 -12,22 -14,46 -9,99 7,67 6,70 -21,93 l -27,24 17,59 c 16,54 16,59 1,70 -9,7 -16,18 -16,24 0,36 85,152 129,176 18,10 62,14 144,15 112,0 119,-1 140,-24 z" id="path105" style="stroke:#ff9101;stroke-opacity:1" /> <path d="m 4420,3091 c 14,-28 13,-163 -3,-185 -12,-16 -14,-15 -36,8 -18,20 -28,23 -42,16 -10,-6 -33,-10 -51,-10 -18,0 -54,-2 -81,-6 -55,-7 -53,-3 -62,-146 l -5,-98 26,-6 c 27,-7 134,0 172,12 21,6 22,3 22,-43 0,-27 -6,-58 -14,-68 -12,-17 -17,-17 -46,-5 -29,12 -34,12 -46,-5 -13,-18 -15,-18 -63,4 -27,13 -54,20 -60,17 -6,-4 -11,-36 -11,-74 0,-38 -7,-94 -15,-125 -22,-86 -20,-105 12,-113 15,-4 77,0 138,8 143,19 149,18 142,-40 -6,-54 -22,-66 -59,-45 -30,18 -49,13 -100,-29 l -28,-22 -23,22 c -28,26 -91,30 -124,7 -19,-14 -21,-13 -27,18 -4,17 -9,68 -12,112 -4,44 -12,101 -19,127 -8,28 -11,69 -8,100 3,32 -1,85 -11,132 -15,72 -15,85 0,159 11,52 15,109 12,164 -4,73 -2,85 13,94 12,6 27,5 44,-3 22,-10 31,-9 56,6 17,10 40,16 52,13 12,-3 58,1 102,8 119,19 143,18 155,-4 z" id="path104" style="stroke:#ff9101;stroke-opacity:1" /> <path d="m 1870,3105 c 9,-11 26,-13 72,-8 l 60,6 -5,-74 c -11,-158 -25,-286 -35,-324 -6,-22 -13,-96 -17,-165 -3,-69 -13,-154 -21,-189 -11,-48 -11,-67 -3,-77 14,-17 71,-18 188,-4 106,12 124,4 115,-48 -9,-53 -19,-59 -59,-38 -38,21 -39,20 -97,-33 l -28,-25 -28,27 c -32,30 -69,34 -112,12 -36,-18 -38,-13 -46,103 -3,48 -12,112 -20,143 -8,31 -14,96 -13,145 0,49 -5,105 -11,124 -13,45 -13,123 1,180 6,25 11,89 10,143 0,55 2,103 5,108 8,14 30,11 44,-6 z" id="path103" style="stroke:#ff9101;stroke-opacity:1" /> <path d="m 4906,3145 c 8,-33 1,-211 -9,-221 -4,-5 -19,5 -32,21 -21,27 -26,29 -45,17 -12,-8 -33,-11 -49,-7 -19,4 -32,1 -41,-10 -9,-10 -22,-14 -39,-10 -14,3 -31,2 -37,-3 -6,-4 -14,-50 -18,-102 -3,-52 -9,-109 -12,-126 -5,-29 -3,-33 30,-44 33,-11 89,-5 164,16 21,6 22,4 22,-59 0,-79 -15,-99 -57,-72 -26,17 -27,17 -46,-6 l -19,-23 -41,22 c -71,37 -77,31 -77,-81 -1,-40 -7,-101 -15,-137 -19,-88 -19,-99 9,-111 18,-8 49,-7 125,5 56,9 115,16 131,16 29,0 30,-2 30,-44 0,-24 -3,-51 -6,-60 -8,-20 -38,-21 -54,-1 -19,22 -32,19 -76,-20 -46,-42 -54,-42 -83,-11 -19,20 -30,23 -60,19 -20,-3 -46,-11 -57,-19 -20,-12 -22,-11 -28,33 -3,25 -6,73 -6,107 0,34 -7,88 -15,119 -8,32 -15,96 -15,142 0,47 -5,116 -12,155 -10,58 -9,90 4,188 9,66 14,148 11,187 -6,85 5,102 56,84 26,-9 35,-8 50,5 11,10 42,19 72,22 30,2 81,11 114,18 96,22 124,20 131,-9 z" id="path102" style="stroke:#ff9101;stroke-opacity:1" /> <path d="m 1400,3159 c 33,-17 50,-20 94,-15 44,6 62,3 95,-13 23,-12 59,-21 86,-21 57,0 65,-17 51,-103 -7,-48 -6,-79 9,-152 12,-62 16,-110 11,-146 -4,-30 -9,-101 -11,-159 -8,-168 -57,-491 -73,-476 -6,7 -39,225 -48,316 -9,112 -9,112 -52,105 -20,-4 -52,-11 -69,-17 -30,-9 -33,-13 -33,-51 0,-23 -7,-69 -14,-102 -8,-33 -17,-99 -21,-146 -4,-48 -10,-92 -14,-98 -9,-14 -41,124 -41,177 0,20 -7,66 -16,102 -9,36 -15,101 -15,146 1,44 -5,124 -13,177 -13,86 -13,108 0,190 11,62 14,125 11,193 -7,127 -6,129 63,93 z" id="path101" style="stroke:#ff9101;stroke-opacity:1" /> <path d="m 5439,3243 c 5,-11 5,-68 0,-143 -4,-69 -5,-161 -2,-206 3,-47 0,-117 -7,-165 -7,-46 -12,-133 -12,-194 1,-60 -5,-150 -13,-200 -8,-49 -15,-110 -15,-134 0,-52 -31,-211 -42,-211 -7,0 -14,46 -22,153 -4,50 -11,76 -29,100 -27,36 -47,88 -47,122 0,13 -13,55 -30,93 -16,39 -30,84 -30,99 0,30 -46,133 -59,133 -5,0 -11,-84 -14,-187 -4,-104 -11,-206 -16,-228 -6,-22 -15,-91 -21,-154 -6,-62 -14,-120 -19,-128 -10,-18 -41,129 -41,197 -1,25 -7,74 -15,110 -8,36 -14,110 -15,164 0,55 -5,137 -12,183 -10,70 -9,102 4,201 15,103 15,126 3,191 -8,41 -17,82 -20,91 -8,25 22,52 48,44 11,-3 36,-6 56,-6 20,0 47,-7 60,-17 21,-16 25,-30 32,-107 4,-49 15,-114 23,-144 9,-30 16,-64 16,-76 0,-32 60,-256 75,-280 7,-11 16,-31 18,-45 12,-52 -5,270 -18,341 -9,54 -11,90 -4,119 7,31 5,50 -6,77 -21,51 -31,165 -16,192 13,25 30,27 76,11 25,-9 37,-9 61,4 37,21 41,21 53,0 z" id="path100" style="stroke:#ff9101;stroke-opacity:1" /> <path d="m 871,3252 c 13,-10 43,-26 67,-36 l 42,-19 v -69 c 0,-39 5,-124 11,-190 10,-104 9,-133 -6,-220 -20,-113 -17,-121 44,-107 20,4 37,8 39,9 1,0 8,0 16,0 24,0 29,53 10,100 -15,37 -16,55 -6,144 8,81 8,114 -4,166 -20,96 -18,190 6,190 4,0 24,-13 44,-30 29,-23 44,-28 67,-23 56,11 57,6 54,-260 -2,-133 -8,-273 -15,-312 -6,-38 -8,-97 -5,-130 4,-37 0,-92 -9,-145 -9,-47 -16,-108 -16,-135 0,-28 -7,-77 -15,-108 -8,-32 -15,-67 -15,-77 0,-18 -19,-30 -20,-12 -1,4 -7,63 -15,132 -8,69 -20,176 -26,238 -14,126 -8,120 -99,98 -54,-12 -55,-13 -54,-47 1,-19 -4,-70 -12,-114 -7,-44 -16,-114 -19,-155 -9,-112 -16,-162 -22,-156 -11,10 -42,182 -43,231 0,28 -7,86 -16,130 -10,52 -13,102 -9,143 3,39 -1,111 -11,184 -15,112 -15,130 0,247 15,114 15,134 1,211 -25,141 -19,163 36,122 z" id="path99" style="stroke:#ff9101;stroke-opacity:1" /> <path d="m 5211,3636 c 18.2966,-33.9793 3.7882,-71.1133 -29,-108 -24.2572,-27.989 88,-37.4349 88,-117 0,-35 -36,-56 -80,-47 -46.3941,13.3447 -83.0728,48.4583 -120,78 l -216,-33 -217,-34 -24,-39 c -36.904,-59.7837 -16.2439,-65.8451 -80,-80 -85,-20 -106,62 -35,137 22,23 22.4676,15.3213 7,25 -2,-2 -16,12 -30,31 -43,59 -26,121 33,121 18,0 39,-15 72,-50 l 46,-50 c 140.5995,24.6513 284.0837,31.5732 422,70 29.6898,13.7029 23.4552,58.0528 58,100 35,41 81,40 105,-4 z" id="path97" sodipodi:nodetypes="ccscccccccccsccccc" style="stroke:#b3b146;stroke-opacity:1" /> <path d="m 1190,3570 c 5.9078,-71.8863 201.4415,-75.427 262,-85 155.7187,-16.4392 163.9978,-65.4078 252,44 33,30 60,34 87,12 68.9039,-54.7178 19.1014,-117.0255 -43,-131 -1.853,-0.417 129.3107,-190.7336 4,-170 -143.797,23.7923 66.2768,111.4853 -377,160 l -190,29 c -44.3925,-50.6133 -139.3808,-129.2088 -191,-45 -8,32 9,61 55,94 38,28 38,28 20,51 -50.1401,178.3084 110.2965,171.24 121,41 z" id="path96" sodipodi:nodetypes="scccsscccccs" style="stroke:#b3b146;stroke-opacity:1" /> <path d="m 2805,3750 h 82 l 7,-92 c 3,-51 15,-133 25,-183 21,-100 73,-275 82,-275 15,0 32,119 36,255 5,133 -3,227 -21,275 -5,13 13,15 121,17 119,3 129,2 169,-22 83,-49 120,-193 72,-285 -31,-60 -102,-98 -154,-82 -33,10 -34,10 -28,-16 6,-24 29,-89 48,-132 5,-13 -8,-15 -95,-12 -56,2 -106,-1 -111,-6 -6,-6 -24,-6 -46,-1 -20,5 -77,9 -126,9 -80,0 -87,2 -81,18 22,53 11,139 -20,149 -33,10 -62,-69 -45,-126 l 9,-31 -102,6 c -56,4 -103,8 -105,9 -1,1 13,44 32,96 41,111 70,223 86,334 16,111 15,108 51,101 18,-3 69,-6 114,-6 z" id="path94" style="stroke:#8500ff;stroke-opacity:1" /> <path d="m 3724,3732 c 53,-37 80,-92 84,-174 4,-59 1,-73 -22,-112 -30,-51 -94,-83 -145,-73 l -29,6 10,-37 c 12,-44 35,-90 56,-114 14,-17 10,-18 -79,-18 -52,0 -111,-4 -132,-9 -33,-8 -37,-7 -33,7 35,112 30,391 -8,503 l -14,39 67,1 c 36,1 80,5 96,9 47,13 107,2 149,-28 z" id="path93" style="stroke:#8500ff;stroke-opacity:1" /> <path d="m 4205,3713 c 1,-49 5,-140 9,-204 10,-135 2,-173 -50,-218 -66,-58 -207,-78 -268,-38 -14,10 -30,34 -37,56 -16,52 3,90 54,110 34,13 42,12 75,-4 36,-17 36,-18 15,-28 -29,-13 -30,-34 -3,-42 33,-11 67,19 75,64 4,22 4,44 1,49 -3,5 -25,3 -51,-6 -39,-12 -51,-13 -82,-1 -52,20 -71,53 -89,154 -8,50 -23,108 -33,130 l -18,40 51,-3 c 28,-2 70,1 94,6 l 42,10 v -67 c 0,-112 27,-175 57,-135 11,14 14,38 10,94 -3,41 -8,83 -12,92 -6,15 2,17 57,21 34,2 72,4 83,5 19,2 20,-4 20,-85 z" id="path92" style="stroke:#8500ff;stroke-opacity:1" /> <path d="m 2276,3790 h 41 l -23,-67 c -26,-75 -31,-142 -12,-161 19,-19 46,-14 59,11 14,25 18,145 7,196 -7,31 -7,33 15,27 12,-4 55,-9 95,-13 79,-7 79,-6 62,-78 -18,-77 -29,-289 -21,-385 5,-52 8,-96 7,-98 -2,-1 -51,1 -110,5 -92,5 -106,8 -101,22 4,9 14,44 22,79 18,72 8,112 -27,112 -30,0 -43,-43 -36,-119 l 7,-64 -31,6 c -17,4 -65,9 -108,13 l -78,7 22,66 c 30,88 54,256 54,373 v 95 l 58,-13 c 31,-8 75,-14 98,-14 z" id="path91" style="stroke:#8500ff;stroke-opacity:1" /> <path d="m 4041,4288 c 90,-31 268,-163 587,-436 155,-132 232,-158 329,-111 66,32 96,78 101,153 3,51 0,66 -20,95 -49,73 -125,99 -189,66 -41,-21 -56,-39 -68,-81 -8,-30 -1,-96 14,-136 11,-29 -23,-22 -55,10 -59,59 -45,168 28,217 121,82 278,34 317,-98 52,-176 -134,-334 -304,-257 -51,23 -70,38 -306,236 -186,155 -297,238 -399,294 -48,27 -69,33 -115,32 -69,-1 -120,-21 -154,-62 -101,-120 28,-302 154,-217 31,20 68,79 84,131 5,17 7,18 21,5 42,-43 21,-138 -42,-185 -65,-50 -192,-25 -249,51 -75,97 -19,258 102,295 42,12 125,12 164,-2 z" id="path89" style="stroke:#ff9700;stroke-opacity:1" /> <path d="m 2420,4270 c 44,-23 89,-82 99,-132 10,-45 -4,-113 -30,-150 -26,-35 -110,-78 -156,-78 -43,0 -83,16 -115,47 -43,41 -54,129 -21,165 15,17 17,15 34,-34 24,-72 75,-118 129,-118 89,0 135,54 128,147 -5,60 -28,98 -75,125 -36,22 -109,33 -156,24 -83,-15 -269,-152 -646,-473 -40,-34 -93,-72 -118,-84 -89,-43 -205,-20 -269,53 -84,95 -67,239 34,309 50,34 146,39 205,10 67,-32 92,-73 92,-148 0,-58 -2,-64 -34,-92 -39,-35 -67,-41 -56,-13 4,9 12,41 18,70 10,47 9,57 -8,89 -30,54 -65,76 -121,75 -160,-4 -209,-226 -70,-317 13,-9 48,-21 79,-27 53,-11 57,-10 119,20 39,19 125,85 227,172 280,240 431,349 531,381 39,13 136,1 180,-21 z" id="path88" style="stroke:#ff9700;stroke-opacity:1" /> <path d="m 2038,4530 c 1.8881,-4.7202 51.4528,-27.2573 33,-39 -2.4649,-1.5406 -151,19.4698 -151,-77 -8.2469,-33.7247 -26.0722,-61.1661 -67.2598,-51.0869 C 1809.0354,4350.9559 1848.4271,4290 1738,4290 c -35.6075,-14.8667 -84.1456,1.0703 -97,-68 -12,-22 -13,-23 -26,-5 -23.4491,33.4988 7.1573,57.4246 -24,49 -6,-4 -35.9672,-3.9448 -53.9672,4.0552 -8.2435,52.8027 -79.9709,30.2914 -111.4217,42.8726 C 1362.4992,4341.9236 1320,4303.2396 1320,4329 c -26.2185,50.2021 -93.632,39.0671 -161,28 -23.4302,23.4302 89.9623,83 92,83 47.8291,31.7481 102.4273,34.2259 156,46 18,3 48,3 65,0 62.4638,-10.7696 16.2633,-60.1317 52,-78 8.0849,-24.8426 92.6615,-81.2398 83,-31 -5,26 20,33 29,8 5,-12 9,-12 29,1 5.1165,37.5778 42.913,21.91 36,-9 52.3674,24.4552 116.4133,23.1581 116,164 62,5 109,12 113,15 3.0603,4.5905 103.4506,-12.3518 108,-26 z" id="path87" sodipodi:nodetypes="ccccccccccccccccscccccc" /> <path d="m 4481,4477 c 1.4837,-10.7337 63.1056,-107 75,-107 12,0 16.2598,2.5103 20.0457,23.4839 27.5062,69.2647 28.9037,-67.8742 68.9543,22.5161 13,5 15,2 9,-20 -5,-20 -2,-26 10,-26 50.2144,24.2937 89.0557,41.7396 116.0381,104.3826 83.4202,88.0373 184.2058,-1.3378 263.9619,-47.3826 52.58,-39.9383 -89.8236,-20.2835 -110,-92 -16.6208,-15.6059 -37.8767,26.0599 -77.6016,13.8738 -35.0802,-6.0747 -60.9319,-69.3105 -99.3984,-53.8738 -42.096,14.5738 -105.3633,-12.2231 -117,-55 -8,-12 -33.0121,-11.8857 -55,34 -47.9293,97.7945 -130.2323,0.6261 -145,104 -55.1896,66.8124 -102.0256,13.0521 -97,83 11.2515,131.2672 -214.4839,21.9704 -128,95 5.2187,4.1117 261.1687,109.1727 266,-79 z" id="path86" sodipodi:nodetypes="csccccccccscccccc" /> <path d="m 2289,4937 c 12,-12 15,-13 64,-15 35,-2 26,-22 -9,-22 -43,0 -62,-17 -69,-61 -5,-28 -10,-37 -15,-28 -24.7024,29.9786 16.804,81.3758 -77,89 -48,0 -40,18 12,25 42,7 45,9 51,44 10,61 17,68 24,23 3,-23 12,-48 19,-55 z" id="path85" sodipodi:nodetypes="scsccccccs" style="stroke:#ffc600;stroke-opacity:1" /> <path d="m 4035,4960 c 3,-6 22,-10 41,-10 44,0 44,-16 0,-24 -42,-8 -57,-25 -58,-66 -1,-37 -15,-27 -20,15 -5.1979,59.7754 -88,52.2898 -88,64 0,30.234 86.7037,-24.9261 91,61 4,54 13,59 21,12 4,-23 10,-47 13,-52 z" id="path84" sodipodi:nodetypes="cscccsccc" style="stroke:#ffc600;stroke-opacity:1" /> <path d="m 3195,4983 c 0,-40 5,-76 10,-80 13,-12 107,-39 179,-52 116,-21 202,-82 254,-179 41,-76 65,-234 50,-328 -46.2443,-429.4705 -714.0284,-547.0473 -1006,-219 -102,108 -134,243 -97,410 22,102 55,166 111,220 54,53 110,81 200,101 185,40 193,45 174,125 -17,68 -5,81 69,77 l 56,-3 z" id="path83" sodipodi:nodetypes="scccccccccccs" style="stroke:#ff8900;stroke-opacity:1" /> <path d="m 2985,5536 c 2,-6 5,-19 7,-30 5,-32 70,-91 96,-87 15,2 21,8 18,18 -12.674,17.2271 -4.4712,25.0626 13,8 11,-3 22,-1 26,5 12,20 27,10 23,-15 -4,-19 -1,-25 13,-25 70.1905,26.1825 71.3333,87.3333 107,131 -22,14 111,8 169,-7 55,-14 155.381,-72.9505 145.8782,-88.2377 -14.0758,-22.6438 -27.0023,-18.8692 -56.8782,-19.7623 -59,-1 -70,-4 -89,-26 -20,-22 -29,-25 -80,-22 -31,2 -57,-1 -56,-5 13.8093,-78.9102 -53.082,-13.9017 -76,-33 -21.6681,-18.9596 -15.3269,21.9823 -99,-81 l -19,-23 -14,29 c -23,47 -60,69 -115,68 -37,-1 -51,4 -58,17 -7,13 -6,20 3,23 6,3 -21,6 -60,6 -40,1 -73,5 -73,11 0,18 -61,41 -103,40 -71,-3 -73,-2 -46,26 30,33 109,73 163,83 61,13 157,11 161,-3 z" id="path82" sodipodi:nodetypes="ccccccccccscccccccccsccscccc" /> <path d="m 3101,4994 c 16,-44 10,-88 -16,-124 -35,-48 -49,-53 -129,-51 -84,1 -71,-13 18,-22 57.5299,-4.6769 108.4336,-30.7168 159,-56 62.2505,41.1896 124.9127,53.6642 199,54 124,0 113,17 -14,23 -76,3 -97,8 -115,25 -30,27 -45,78 -41,135 6.1366,90.0028 -75.4044,50.9822 -61,16 z" id="path3" sodipodi:nodetypes="cccccscccc" style="stroke:#ff8900;stroke-opacity:1" /> <path d="m 2844,4744 c -42,-29 -52,-39 -90,-98 -101,-153 -95,-423 13,-564 35,-46 39,-34 9,27 -15,28 -33,76 -41,108 -17,65 -19,226 -4,292 17,77 65,165 114,210 55,50 54,62 -1,25 z" id="path4" style="stroke:#ff8900;stroke-opacity:1" /> <path d="m 3390,4765 c 0,-5 18,-24 40,-43 77,-65 130,-207 130,-345 0,-96 -21,-182 -65,-264 -42,-80 -27,-81 25,-2 57,88 74,154 73,274 -1,169 -62,298 -175,370 -16,9 -28,14 -28,10 z" id="path5" style="stroke:#ff8900;stroke-opacity:1" /> <path d="m 2863,4603 c -71,-82 -75,-87 -67,-107 9,-24 76,-21 99,4 23,26 29,25 59,-5 29,-29 83,-34 93,-10 6,17 -100,185 -116,185 -5,0 -36,-30 -68,-67 z" id="path6" style="stroke:#ff8900;stroke-opacity:1" /> <path d="m 3251,4585 c -64,-94 -66,-115 -12,-115 31,0 43,6 59,27 l 20,28 24,-23 c 28,-26 89,-30 108,-7 12,15 4,27 -94,142 -32,38 -51,29 -105,-52 z" id="path7" style="stroke:#ff8900;stroke-opacity:1" /> <path d="m 3090,4438 c -33,-55 -28,-68 30,-68 37,0 50,4 50,14 0,20 -40,86 -51,86 -5,0 -18,-15 -29,-32 z" id="path8" style="stroke:#ff8900;stroke-opacity:1" /> <path d="m 2785,4340 c -10,-30 12,-127 40,-179 29,-53 81,-92 157,-117 60,-20 76,-14 80,28 3,32 4,33 55,36 l 52,3 3,-38 3,-38 46,1 c 99,4 221,93 247,182 13,44 16,132 5,132 -5,0 -46,-7 -93,-15 -47,-8 -87,-15 -89,-15 -2,0 -1,-13 2,-29 8,-37 -8,-51 -55,-51 -37,0 -38,1 -38,34 0,32 -2,34 -37,38 -21,3 -63,4 -93,4 -53,-1 -55,-2 -60,-31 -5,-28 -9,-30 -52,-33 l -47,-3 -3,42 -3,43 -55,12 c -30,7 -56,13 -57,14 -1,0 -4,-9 -8,-20 z" id="path9" style="stroke:#ff8900;stroke-opacity:1" /> <path d="m 3610,3611 c -11,-22 -14,-121 -2,-121 10,0 48,59 57,88 13,43 -34,71 -55,33 z" id="path10" style="stroke:#8500ff;stroke-opacity:1" /> <path d="m 3200,3601 c -5,-11 -10,-45 -10,-76 v -57 l 25,30 c 13,16 29,41 35,56 19,50 -26,91 -50,47 z" id="path11" style="stroke:#8500ff;stroke-opacity:1" /> <path d="m 2757,3580 c -24,-68 -26,-83 -16,-102 14,-26 43,-19 47,12 4,32 -24,111 -31,90 z" id="path12" style="stroke:#8500ff;stroke-opacity:1" /> <path d="m 1503,2958 c -4,-7 -11,-62 -15,-123 -4,-60 -10,-136 -14,-168 l -7,-58 54,6 c 30,4 60,8 67,10 16,6 15,64 -3,95 -9,16 -14,56 -15,115 0,115 -6,135 -36,135 -12,0 -26,-6 -31,-12 z" id="path13" style="stroke:#ff9101;stroke-opacity:1" /> <path d="m 2734,2834 c -10,-24 -15,-66 -14,-123 1,-47 1,-104 1,-126 -1,-46 24,-144 51,-197 35,-72 69,-38 89,87 6,44 18,92 26,107 11,24 11,33 -2,64 -11,27 -12,40 -4,50 8,10 8,28 -1,66 -6,29 -13,63 -16,76 -5,23 -44,32 -44,10 0,-7 -5,-5 -11,5 -5,9 -21,17 -35,17 -19,0 -28,-8 -40,-36 z" id="path14" style="stroke:#ff9101;stroke-opacity:1" /> <path id="path130" style="stroke:#000000;stroke-opacity:1" d="m 2060.286,1297.2248 1087.8766,842.8416 1074.9317,-819.624 M 3151.378,2141.2456 942.98689,1761.5362 c 631.63931,26.4325 1008.05971,-125.7138 1117.94681,-464.3555 341.6729,14.3418 679.7421,44.1009 1094.1357,-252.6782 431.155,307.7674 729.8595,243.1379 1064.6997,280.1075 199.0922,386.6921 604.37,432.9538 1025.9986,452.2191 z m -131.9876,-721.3268 c -184.657,169.6485 -422.8925,122.3474 -633.5489,125.6757 1.2215,185.7078 -97.2863,325.7883 -386.2005,397.1099 m 2498.6755,-37.4304 c -170.8905,-42.3178 -598.585,-25.0227 -554.3142,-372.6582 -159.7727,-3.1077 -468.0799,80.003 -666.5297,-111.181 m 653.4949,585.0862 c -159.7741,-56.5003 -228.7486,-138.4339 -262.4631,-260.5414 -203.2907,27.5495 -390.3979,-2.9734 -517.6244,-125.3467 -105.8892,143.1125 -294.9691,145.8479 -500.8622,129.5675 1.6681,119.3742 -106.7637,198.1025 -249.7457,262.6224 m 1129.4075,63.3146 c -73.3164,-41.2168 -111.8863,-76.0908 -127.6505,-129.8529 -82.5857,38.8435 -165.7578,33.2923 -248.7138,-41.5782 -55.1976,77.3328 -133.3113,92.2759 -260.2995,36.5735 -0.1277,86.0025 -63.4298,116.0114 -125.6393,135.7032 m 383.2398,-736.5894 5.7568,-298.125 m -2.146,1389.5141 -2.7978,-884.978" inkscape:label="web" /> <path id="path138" style="stroke:#ff0000;stroke-opacity:1" d="m 3273.8902,1407.4652 92.329,145.4046 94.7938,-127.746 m -190.3601,-57.4658 131.1548,37.9065 27.0117,-149.2383 m -163.7951,93.3032 75.8385,-31.4868 -103.4655,-158.7195 m -191.6748,187.6465 -92.9956,-31.4172 117.865,-168.6182 m -28.4143,213.3362 -135.3406,46.6772 -33.0103,-173.7927 m 149.4764,182.1094 -75.8367,121.1818 -103.2551,-108.0055 m 301.1232,121.0912 c -69.5361,-11.8141 -122.1159,-44.8074 -122.4533,-132.7119 27.9096,-83.6465 60.0455,-151.1826 107.3867,-160.7563 -10.5465,28.037 -36.6231,56.5531 -15.274,83.6062 l 73.0726,1.6103 c 25.4441,-22.3573 7.8796,-60.9773 -13.55,-91.4123 153.5738,101.0998 124.8148,280.3607 -29.557,299.7671" inkscape:label="spider" transform="translate(-2e-5)" /> </g> </svg>`);

    const happyHalloween1safe = parseSvg(`<?xml version="1.0" encoding="UTF-8" standalone="no"?> <svg version="1.0" width="463.19043pt" height="481.28061pt" viewBox="0 0 463.19043 481.28061" preserveAspectRatio="xMidYMid" id="svg81" sodipodi:docname="notscary.svg" inkscape:version="1.3.2 (091e20ef0f, 2023-11-25, custom)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"> <defs id="defs81" /> <sodipodi:namedview id="namedview81" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" inkscape:document-units="pt" inkscape:zoom="16" inkscape:cx="142.21875" inkscape:cy="296.15624" inkscape:window-width="2560" inkscape:window-height="1371" inkscape:window-x="0" inkscape:window-y="0" inkscape:window-maximized="1" inkscape:current-layer="g81" /> <metadata id="metadata1"> Created by potrace 1.16, written by Peter Selinger 2001-2019 </metadata> <g transform="matrix(0.1,0,0,-0.1,-81.584578,555.39141)" fill="none" stroke="#000000" stroke-width="30px" id="g81"> <path d="m 2553,852 c 47,-4 49,-22 2,-22 -31,0 -35,-3 -36,-27 0,-16 -4,-37 -8,-48 -7,-16 -10,-12 -18,25 -6,33 -14,46 -28,48 -11,1 -31,6 -45,9 -21,6 -18,8 20,12 44,6 45,7 55,51 l 10,45 5,-45 c 5,-44 6,-45 43,-48 z" id="path114" style="stroke:#ffc600;stroke-opacity:1" /> <path d="m 3865,897 c 19,-4 19,-5 -1,-6 -57.9008,-2.14447 -40.1066,-82.9467 -56,-75 -29.1972,78.13884 8.0159,40.15774 -71,82 79.4075,14.23078 41.8103,26.82095 73,72 13.1475,19.04444 -15.5004,-54.80635 55,-73 z" id="path113" sodipodi:nodetypes="ccccsc" style="stroke:#ffc600;stroke-opacity:1" /> <path d="m 1463,1249 c 3,-23 9,-45 14,-50 9,-9 43,-17 76,-18 33,-2 7,-21 -28,-21 -39,0 -65,-29 -65,-72 0,-16 -5,-28 -12,-28 -6.318,0 -8.1765,78.3866 -32,92 -6,4 -25,8 -43,8 -40,0 -55,20 -16,21 15,1 36,1 45,0 22,-3 38,29 38,73 0,49 16,45 23,-5 z" id="path112" sodipodi:nodetypes="cscssscsccsc" style="stroke:#ffc600;stroke-opacity:1" /> <path d="m 4780,1309 c 0,-47 15,-66 60,-73 50,-8 43,-26 -9,-26 -41,0 -51,-13 -51,-72 0,-47 -18,-31 -25,22 -7,50 -7,50 -43,50 -58,0 -72,16 -23,25 52,9 71,27 71,71 0,19 5,34 10,34 6,0 10,-14 10,-31 z" id="path111" style="stroke:#ffc600;stroke-opacity:1" /> <path d="m 3939,3056 c 9,-10 2,-39 -29,-126 -32,-90 -39,-119 -33,-153 5,-33 1,-51 -25,-101 -28,-57 -83,-263 -82,-313 0,-13 -9,-28 -20,-35 -11,-7 -35,-34 -53,-60 -17,-27 -34,-48 -37,-48 -6,0 -81,123 -93,153 -4,10 -9,31 -12,47 -3,15 -16,52 -30,81 -14,30 -25,61 -26,69 -1,18 -58,-187 -58,-211 -1,-10 -16,-32 -34,-50 -18,-19 -47,-52 -65,-74 -19,-22 -31,-35 -27,-28 6,12 -31,80 -65,118 -35,40 -72,148 -79,230 -6,65 -13,88 -36,124 -27,41 -30,53 -36,165 -3,67 -11,134 -18,149 -19,48 -16,50 52,42 34,-4 76,-7 92,-6 17,0 36,-3 44,-8 14,-9 17,-57 6,-118 -3,-23 -1,-51 6,-68 7,-17 13,-75 14,-130 2,-144 16,-317 27,-339 17,-33 28,-3 44,120 9,65 22,134 30,153 14,33 17,103 14,296 -1,110 5,118 95,108 l 70,-8 1,-85 c 1,-82 12,-226 33,-437 7,-68 17,-116 32,-144 33,-66 42,-36 53,181 3,52 10,109 15,127 7,23 5,43 -7,76 -15,41 -15,50 -1,94 10,35 12,60 6,93 -6,29 -5,55 2,73 10,26 13,27 83,27 44,1 83,6 98,15 31,18 35,18 49,1 z" id="path107" style="stroke:#ff9101;stroke-opacity:1" /> <path d="m 2337,3066 c 34,0 63,-3 66,-6 3,-3 1,-36 -5,-75 -5,-38 -13,-106 -18,-150 -4,-44 -13,-100 -19,-125 -5,-25 -10,-81 -10,-125 -1,-44 -8,-112 -17,-151 -26,-110 -30,-108 146,-99 l 150,7 v -29 c 0,-16 -6,-38 -14,-48 -12,-17 -17,-18 -40,-7 -39,18 -58,15 -90,-13 -35,-30 -43,-30 -76,-5 -30,23 -59,25 -104,6 -32,-13 -34,-13 -40,7 -3,12 -9,56 -12,97 -3,41 -13,97 -21,124 -9,29 -13,64 -10,90 4,22 -1,80 -10,128 -15,79 -15,92 0,160 11,51 14,97 10,152 l -6,79 29,-8 c 16,-4 57,-8 91,-9 z" id="path106" style="stroke:#ff9101;stroke-opacity:1" /> <path d="m 2943,3066 c 94,-101 90,-94 78,-140 -9,-36 -7,-51 10,-95 21,-58 23,-51 -25,-116 -6,-9 -2,-31 12,-65 27,-66 27,-68 -3,-92 -19,-15 -25,-29 -25,-59 0,-26 -9,-53 -26,-78 -18,-27 -23,-46 -19,-64 5,-20 1,-29 -24,-46 -25,-18 -29,-26 -21,-41 18,-34 12,-41 -37,-39 -27,0 -59,-2 -73,-6 -22,-6 -28,-2 -40,27 -12,25 -24,35 -55,44 -37,10 -40,14 -37,44 3,35 -35,160 -49,160 -5,0 -15,13 -24,30 -12,22 -14,46 -9,99 7,67 6,70 -21,93 l -27,24 17,59 c 16,54 16,59 1,70 -9,7 -16,18 -16,24 0,36 85,152 129,176 18,10 62,14 144,15 112,0 119,-1 140,-24 z" id="path105" style="stroke:#ff9101;stroke-opacity:1" /> <path d="m 4420,3091 c 14,-28 13,-163 -3,-185 -12,-16 -14,-15 -36,8 -18,20 -28,23 -42,16 -10,-6 -33,-10 -51,-10 -18,0 -54,-2 -81,-6 -55,-7 -53,-3 -62,-146 l -5,-98 26,-6 c 27,-7 134,0 172,12 21,6 22,3 22,-43 0,-27 -6,-58 -14,-68 -12,-17 -17,-17 -46,-5 -29,12 -34,12 -46,-5 -13,-18 -15,-18 -63,4 -27,13 -54,20 -60,17 -6,-4 -11,-36 -11,-74 0,-38 -7,-94 -15,-125 -22,-86 -20,-105 12,-113 15,-4 77,0 138,8 143,19 149,18 142,-40 -6,-54 -22,-66 -59,-45 -30,18 -49,13 -100,-29 l -28,-22 -23,22 c -28,26 -91,30 -124,7 -19,-14 -21,-13 -27,18 -4,17 -9,68 -12,112 -4,44 -12,101 -19,127 -8,28 -11,69 -8,100 3,32 -1,85 -11,132 -15,72 -15,85 0,159 11,52 15,109 12,164 -4,73 -2,85 13,94 12,6 27,5 44,-3 22,-10 31,-9 56,6 17,10 40,16 52,13 12,-3 58,1 102,8 119,19 143,18 155,-4 z" id="path104" style="stroke:#ff9101;stroke-opacity:1" /> <path d="m 1870,3105 c 9,-11 26,-13 72,-8 l 60,6 -5,-74 c -11,-158 -25,-286 -35,-324 -6,-22 -13,-96 -17,-165 -3,-69 -13,-154 -21,-189 -11,-48 -11,-67 -3,-77 14,-17 71,-18 188,-4 106,12 124,4 115,-48 -9,-53 -19,-59 -59,-38 -38,21 -39,20 -97,-33 l -28,-25 -28,27 c -32,30 -69,34 -112,12 -36,-18 -38,-13 -46,103 -3,48 -12,112 -20,143 -8,31 -14,96 -13,145 0,49 -5,105 -11,124 -13,45 -13,123 1,180 6,25 11,89 10,143 0,55 2,103 5,108 8,14 30,11 44,-6 z" id="path103" style="stroke:#ff9101;stroke-opacity:1" /> <path d="m 4906,3145 c 8,-33 1,-211 -9,-221 -4,-5 -19,5 -32,21 -21,27 -26,29 -45,17 -12,-8 -33,-11 -49,-7 -19,4 -32,1 -41,-10 -9,-10 -22,-14 -39,-10 -14,3 -31,2 -37,-3 -6,-4 -14,-50 -18,-102 -3,-52 -9,-109 -12,-126 -5,-29 -3,-33 30,-44 33,-11 89,-5 164,16 21,6 22,4 22,-59 0,-79 -15,-99 -57,-72 -26,17 -27,17 -46,-6 l -19,-23 -41,22 c -71,37 -77,31 -77,-81 -1,-40 -7,-101 -15,-137 -19,-88 -19,-99 9,-111 18,-8 49,-7 125,5 56,9 115,16 131,16 29,0 30,-2 30,-44 0,-24 -3,-51 -6,-60 -8,-20 -38,-21 -54,-1 -19,22 -32,19 -76,-20 -46,-42 -54,-42 -83,-11 -19,20 -30,23 -60,19 -20,-3 -46,-11 -57,-19 -20,-12 -22,-11 -28,33 -3,25 -6,73 -6,107 0,34 -7,88 -15,119 -8,32 -15,96 -15,142 0,47 -5,116 -12,155 -10,58 -9,90 4,188 9,66 14,148 11,187 -6,85 5,102 56,84 26,-9 35,-8 50,5 11,10 42,19 72,22 30,2 81,11 114,18 96,22 124,20 131,-9 z" id="path102" style="stroke:#ff9101;stroke-opacity:1" /> <path d="m 1400,3159 c 33,-17 50,-20 94,-15 44,6 62,3 95,-13 23,-12 59,-21 86,-21 57,0 65,-17 51,-103 -7,-48 -6,-79 9,-152 12,-62 16,-110 11,-146 -4,-30 -9,-101 -11,-159 -8,-168 -57,-491 -73,-476 -6,7 -39,225 -48,316 -9,112 -9,112 -52,105 -20,-4 -52,-11 -69,-17 -30,-9 -33,-13 -33,-51 0,-23 -7,-69 -14,-102 -8,-33 -17,-99 -21,-146 -4,-48 -10,-92 -14,-98 -9,-14 -41,124 -41,177 0,20 -7,66 -16,102 -9,36 -15,101 -15,146 1,44 -5,124 -13,177 -13,86 -13,108 0,190 11,62 14,125 11,193 -7,127 -6,129 63,93 z" id="path101" style="stroke:#ff9101;stroke-opacity:1" /> <path d="m 5439,3243 c 5,-11 5,-68 0,-143 -4,-69 -5,-161 -2,-206 3,-47 0,-117 -7,-165 -7,-46 -12,-133 -12,-194 1,-60 -5,-150 -13,-200 -8,-49 -15,-110 -15,-134 0,-52 -31,-211 -42,-211 -7,0 -14,46 -22,153 -4,50 -11,76 -29,100 -27,36 -47,88 -47,122 0,13 -13,55 -30,93 -16,39 -30,84 -30,99 0,30 -46,133 -59,133 -5,0 -11,-84 -14,-187 -4,-104 -11,-206 -16,-228 -6,-22 -15,-91 -21,-154 -6,-62 -14,-120 -19,-128 -10,-18 -41,129 -41,197 -1,25 -7,74 -15,110 -8,36 -14,110 -15,164 0,55 -5,137 -12,183 -10,70 -9,102 4,201 15,103 15,126 3,191 -8,41 -17,82 -20,91 -8,25 22,52 48,44 11,-3 36,-6 56,-6 20,0 47,-7 60,-17 21,-16 25,-30 32,-107 4,-49 15,-114 23,-144 9,-30 16,-64 16,-76 0,-32 60,-256 75,-280 7,-11 16,-31 18,-45 12,-52 -5,270 -18,341 -9,54 -11,90 -4,119 7,31 5,50 -6,77 -21,51 -31,165 -16,192 13,25 30,27 76,11 25,-9 37,-9 61,4 37,21 41,21 53,0 z" id="path100" style="stroke:#ff9101;stroke-opacity:1" /> <path d="m 871,3252 c 13,-10 43,-26 67,-36 l 42,-19 v -69 c 0,-39 5,-124 11,-190 10,-104 9,-133 -6,-220 -20,-113 -17,-121 44,-107 20,4 37,8 39,9 1,0 8,0 16,0 24,0 29,53 10,100 -15,37 -16,55 -6,144 8,81 8,114 -4,166 -20,96 -18,190 6,190 4,0 24,-13 44,-30 29,-23 44,-28 67,-23 56,11 57,6 54,-260 -2,-133 -8,-273 -15,-312 -6,-38 -8,-97 -5,-130 4,-37 0,-92 -9,-145 -9,-47 -16,-108 -16,-135 0,-28 -7,-77 -15,-108 -8,-32 -15,-67 -15,-77 0,-18 -19,-30 -20,-12 -1,4 -7,63 -15,132 -8,69 -20,176 -26,238 -14,126 -8,120 -99,98 -54,-12 -55,-13 -54,-47 1,-19 -4,-70 -12,-114 -7,-44 -16,-114 -19,-155 -9,-112 -16,-162 -22,-156 -11,10 -42,182 -43,231 0,28 -7,86 -16,130 -10,52 -13,102 -9,143 3,39 -1,111 -11,184 -15,112 -15,130 0,247 15,114 15,134 1,211 -25,141 -19,163 36,122 z" id="path99" style="stroke:#ff9101;stroke-opacity:1" /> <path d="m 5211,3636 c 18.2966,-33.9793 3.7882,-71.1133 -29,-108 -24.2572,-27.989 88,-37.4349 88,-117 0,-35 -36,-56 -80,-47 -46.3941,13.3447 -83.0728,48.4583 -120,78 l -216,-33 -217,-34 -24,-39 c -36.904,-59.7837 -16.2439,-65.8451 -80,-80 -85,-20 -106,62 -35,137 22,23 22.4676,15.3213 7,25 -2,-2 -16,12 -30,31 -43,59 -26,121 33,121 18,0 39,-15 72,-50 l 46,-50 c 140.5995,24.6513 284.0837,31.5732 422,70 29.6898,13.7029 23.4552,58.0528 58,100 35,41 81,40 105,-4 z" id="path97" sodipodi:nodetypes="ccscccccccccsccccc" style="stroke:#b3b146;stroke-opacity:1" /> <path d="m 1190,3570 c 5.9078,-71.8863 201.4415,-75.427 262,-85 155.7187,-16.4392 163.9978,-65.4078 252,44 33,30 60,34 87,12 68.9039,-54.7178 15.8961,-106.8522 -43,-131 -6.5771,-2.6967 129.3107,-190.7336 4,-170 -143.797,23.7923 66.2768,111.4853 -377,160 l -190,29 c -44.3925,-50.6133 -139.3808,-129.2088 -191,-45 -8,32 9,61 55,94 38,28 38,28 20,51 -50.1401,178.3084 110.2965,171.24 121,41 z" id="path96" sodipodi:nodetypes="scccsscccccs" style="stroke:#b3b146;stroke-opacity:1" /> <path d="m 2805,3750 h 82 l 7,-92 c 3,-51 15,-133 25,-183 21,-100 73,-275 82,-275 15,0 32,119 36,255 5,133 -3,227 -21,275 -5,13 13,15 121,17 119,3 129,2 169,-22 83,-49 120,-193 72,-285 -31,-60 -102,-98 -154,-82 -33,10 -34,10 -28,-16 6,-24 29,-89 48,-132 5,-13 -8,-15 -95,-12 -56,2 -106,-1 -111,-6 -6,-6 -24,-6 -46,-1 -20,5 -77,9 -126,9 -80,0 -87,2 -81,18 22,53 11,139 -20,149 -33,10 -62,-69 -45,-126 l 9,-31 -102,6 c -56,4 -103,8 -105,9 -1,1 13,44 32,96 41,111 70,223 86,334 16,111 15,108 51,101 18,-3 69,-6 114,-6 z" id="path94" style="stroke:#8500ff;stroke-opacity:1" /> <path d="m 3724,3732 c 53,-37 80,-92 84,-174 4,-59 1,-73 -22,-112 -30,-51 -94,-83 -145,-73 l -29,6 10,-37 c 12,-44 35,-90 56,-114 14,-17 10,-18 -79,-18 -52,0 -111,-4 -132,-9 -33,-8 -37,-7 -33,7 35,112 30,391 -8,503 l -14,39 67,1 c 36,1 80,5 96,9 47,13 107,2 149,-28 z" id="path93" style="stroke:#8500ff;stroke-opacity:1" /> <path d="m 4205,3713 c 1,-49 5,-140 9,-204 10,-135 2,-173 -50,-218 -66,-58 -207,-78 -268,-38 -14,10 -30,34 -37,56 -16,52 3,90 54,110 34,13 42,12 75,-4 36,-17 36,-18 15,-28 -29,-13 -30,-34 -3,-42 33,-11 67,19 75,64 4,22 4,44 1,49 -3,5 -25,3 -51,-6 -39,-12 -51,-13 -82,-1 -52,20 -71,53 -89,154 -8,50 -23,108 -33,130 l -18,40 51,-3 c 28,-2 70,1 94,6 l 42,10 v -67 c 0,-112 27,-175 57,-135 11,14 14,38 10,94 -3,41 -8,83 -12,92 -6,15 2,17 57,21 34,2 72,4 83,5 19,2 20,-4 20,-85 z" id="path92" style="stroke:#8500ff;stroke-opacity:1" /> <path d="m 2276,3790 h 41 l -23,-67 c -26,-75 -31,-142 -12,-161 19,-19 46,-14 59,11 14,25 18,145 7,196 -7,31 -7,33 15,27 12,-4 55,-9 95,-13 79,-7 79,-6 62,-78 -18,-77 -29,-289 -21,-385 5,-52 8,-96 7,-98 -2,-1 -51,1 -110,5 -92,5 -106,8 -101,22 4,9 14,44 22,79 18,72 8,112 -27,112 -30,0 -43,-43 -36,-119 l 7,-64 -31,6 c -17,4 -65,9 -108,13 l -78,7 22,66 c 30,88 54,256 54,373 v 95 l 58,-13 c 31,-8 75,-14 98,-14 z" id="path91" style="stroke:#8500ff;stroke-opacity:1" /> <path d="m 4041,4288 c 90,-31 268,-163 587,-436 155,-132 232,-158 329,-111 66,32 96,78 101,153 3,51 0,66 -20,95 -49,73 -125,99 -189,66 -41,-21 -56,-39 -68,-81 -8,-30 -1,-96 14,-136 11,-29 -23,-22 -55,10 -59,59 -45,168 28,217 121,82 278,34 317,-98 52,-176 -134,-334 -304,-257 -51,23 -70,38 -306,236 -186,155 -297,238 -399,294 -48,27 -69,33 -115,32 -69,-1 -120,-21 -154,-62 -101,-120 28,-302 154,-217 31,20 68,79 84,131 5,17 7,18 21,5 42,-43 21,-138 -42,-185 -65,-50 -192,-25 -249,51 -75,97 -19,258 102,295 42,12 125,12 164,-2 z" id="path89" style="stroke:#ff9700;stroke-opacity:1" /> <path d="m 2420,4270 c 44,-23 89,-82 99,-132 10,-45 -4,-113 -30,-150 -26,-35 -110,-78 -156,-78 -43,0 -83,16 -115,47 -43,41 -54,129 -21,165 15,17 17,15 34,-34 24,-72 75,-118 129,-118 89,0 135,54 128,147 -5,60 -28,98 -75,125 -36,22 -109,33 -156,24 -83,-15 -269,-152 -646,-473 -40,-34 -93,-72 -118,-84 -89,-43 -205,-20 -269,53 -84,95 -67,239 34,309 50,34 146,39 205,10 67,-32 92,-73 92,-148 0,-58 -2,-64 -34,-92 -39,-35 -67,-41 -56,-13 4,9 12,41 18,70 10,47 9,57 -8,89 -30,54 -65,76 -121,75 -160,-4 -209,-226 -70,-317 13,-9 48,-21 79,-27 53,-11 57,-10 119,20 39,19 125,85 227,172 280,240 431,349 531,381 39,13 136,1 180,-21 z" id="path88" style="stroke:#ff9700;stroke-opacity:1" /> <path d="m 2038,4530 c 1.8881,-4.7202 51.4528,-27.2573 33,-39 -2.4649,-1.5406 -151,19.4698 -151,-77 -8.2469,-33.7247 -26.0722,-61.1661 -67.2598,-51.0869 C 1809.0354,4350.9559 1848.4271,4290 1738,4290 c -35.6075,-14.8667 -84.1456,1.0703 -97,-68 -12,-22 -13,-23 -26,-5 -23.4491,33.4988 7.1573,57.4246 -24,49 -6,-4 -35.9672,-3.9448 -53.9672,4.0552 -8.2435,52.8027 -79.9709,30.2914 -111.4217,42.8726 C 1362.4992,4341.9236 1320,4303.2396 1320,4329 c -26.2185,50.2021 -93.632,39.0671 -161,28 -23.4302,23.4302 89.9623,83 92,83 47.8291,31.7481 102.4273,34.2259 156,46 18,3 48,3 65,0 62.4638,-10.7696 16.2633,-60.1317 52,-78 8.0849,-24.8426 92.6615,-81.2398 83,-31 -5,26 20,33 29,8 5,-12 9,-12 29,1 5.1165,37.5778 42.913,21.91 36,-9 52.3674,24.4552 116.4133,23.1581 116,164 62,5 109,12 113,15 3.0603,4.5905 103.4506,-12.3518 108,-26 z" id="path87" sodipodi:nodetypes="ccccccccccccccccscccccc" /> <path d="m 4481,4477 c 1.4837,-10.7337 63.1056,-107 75,-107 12,0 16.2598,2.5103 20.0457,23.4839 27.5062,69.2647 28.9037,-67.8742 68.9543,22.5161 13,5 15,2 9,-20 -5,-20 -2,-26 10,-26 50.2144,24.2937 89.0557,41.7396 116.0381,104.3826 83.4202,88.0373 184.2058,-1.3378 263.9619,-47.3826 52.58,-39.9383 -89.8236,-20.2835 -110,-92 -16.6208,-15.6059 -37.8767,26.0599 -77.6016,13.8738 -35.0802,-6.0747 -60.9319,-69.3105 -99.3984,-53.8738 -42.096,14.5738 -105.3633,-12.2231 -117,-55 -8,-12 -33.0121,-11.8857 -55,34 -47.9293,97.7945 -130.2323,0.6261 -145,104 -55.1896,66.8124 -102.0256,13.0521 -97,83 11.2515,131.2672 -214.4839,21.9704 -128,95 5.2187,4.1117 261.1687,109.1727 266,-79 z" id="path86" sodipodi:nodetypes="csccccccccscccccc" /> <path d="m 2289,4937 c 12,-12 15,-13 64,-15 35,-2 26,-22 -9,-22 -43,0 -62,-17 -69,-61 -5,-28 -10,-37 -15,-28 -24.7024,29.9786 16.804,81.3758 -77,89 -48,0 -40,18 12,25 42,7 45,9 51,44 10,61 17,68 24,23 3,-23 12,-48 19,-55 z" id="path85" sodipodi:nodetypes="scsccccccs" style="stroke:#ffc600;stroke-opacity:1" /> <path d="m 4035,4960 c 3,-6 22,-10 41,-10 44,0 44,-16 0,-24 -42,-8 -57,-25 -58,-66 -1,-37 -15,-27 -20,15 -5.1979,59.7754 -88,52.2898 -88,64 0,30.234 86.7037,-24.9261 91,61 4,54 13,59 21,12 4,-23 10,-47 13,-52 z" id="path84" sodipodi:nodetypes="cscccsccc" style="stroke:#ffc600;stroke-opacity:1" /> <path d="m 3195,4983 c 0,-40 5,-76 10,-80 13,-12 107,-39 179,-52 116,-21 202,-82 254,-179 41,-76 65,-234 50,-328 -46.2443,-429.4705 -714.0284,-547.0473 -1006,-219 -102,108 -134,243 -97,410 22,102 55,166 111,220 54,53 110,81 200,101 185,40 193,45 174,125 -17,68 -5,81 69,77 l 56,-3 z" id="path83" sodipodi:nodetypes="scccccccccccs" style="stroke:#ff8900;stroke-opacity:1" /> <path d="m 2985,5536 c 2,-6 5,-19 7,-30 5,-32 70,-91 96,-87 15,2 21,8 18,18 -12.674,17.2271 -4.4712,25.0626 13,8 11,-3 22,-1 26,5 12,20 27,10 23,-15 -4,-19 -1,-25 13,-25 70.1905,26.1825 71.3333,87.3333 107,131 -22,14 111,8 169,-7 55,-14 155.381,-72.9505 145.8782,-88.2377 -14.0758,-22.6438 -27.0023,-18.8692 -56.8782,-19.7623 -59,-1 -70,-4 -89,-26 -20,-22 -29,-25 -80,-22 -31,2 -57,-1 -56,-5 13.8093,-78.9102 -53.082,-13.9017 -76,-33 -21.6681,-18.9596 -15.3269,21.9823 -99,-81 l -19,-23 -14,29 c -23,47 -60,69 -115,68 -37,-1 -51,4 -58,17 -7,13 -6,20 3,23 6,3 -21,6 -60,6 -40,1 -73,5 -73,11 0,18 -61,41 -103,40 -71,-3 -73,-2 -46,26 30,33 109,73 163,83 61,13 157,11 161,-3 z" id="path82" sodipodi:nodetypes="ccccccccccscccccccccsccscccc" /> <path d="m 3101,4994 c 16,-44 10,-88 -16,-124 -35,-48 -49,-53 -129,-51 -84,1 -71,-13 18,-22 57.5299,-4.6769 108.4336,-30.7168 159,-56 62.2505,41.1896 124.9127,53.6642 199,54 124,0 113,17 -14,23 -76,3 -97,8 -115,25 -30,27 -45,78 -41,135 6.1366,90.0028 -75.4044,50.9822 -61,16 z" id="path3" sodipodi:nodetypes="cccccscccc" style="stroke:#ff8900;stroke-opacity:1" /> <path d="m 2844,4744 c -42,-29 -52,-39 -90,-98 -101,-153 -95,-423 13,-564 35,-46 39,-34 9,27 -15,28 -33,76 -41,108 -17,65 -19,226 -4,292 17,77 65,165 114,210 55,50 54,62 -1,25 z" id="path4" style="stroke:#ff8900;stroke-opacity:1" /> <path d="m 3390,4765 c 0,-5 18,-24 40,-43 77,-65 130,-207 130,-345 0,-96 -21,-182 -65,-264 -42,-80 -27,-81 25,-2 57,88 74,154 73,274 -1,169 -62,298 -175,370 -16,9 -28,14 -28,10 z" id="path5" style="stroke:#ff8900;stroke-opacity:1" /> <path d="m 2863,4603 c -71,-82 -75,-87 -67,-107 9,-24 76,-21 99,4 23,26 29,25 59,-5 29,-29 83,-34 93,-10 6,17 -100,185 -116,185 -5,0 -36,-30 -68,-67 z" id="path6" style="stroke:#ff8900;stroke-opacity:1" /> <path d="m 3251,4585 c -64,-94 -66,-115 -12,-115 31,0 43,6 59,27 l 20,28 24,-23 c 28,-26 89,-30 108,-7 12,15 4,27 -94,142 -32,38 -51,29 -105,-52 z" id="path7" style="stroke:#ff8900;stroke-opacity:1" /> <path d="m 3090,4438 c -33,-55 -28,-68 30,-68 37,0 50,4 50,14 0,20 -40,86 -51,86 -5,0 -18,-15 -29,-32 z" id="path8" style="stroke:#ff8900;stroke-opacity:1" /> <path d="m 2785,4340 c -10,-30 12,-127 40,-179 29,-53 81,-92 157,-117 60,-20 76,-14 80,28 3,32 4,33 55,36 l 52,3 3,-38 3,-38 46,1 c 99,4 221,93 247,182 13,44 16,132 5,132 -5,0 -46,-7 -93,-15 -47,-8 -87,-15 -89,-15 -2,0 -1,-13 2,-29 8,-37 -8,-51 -55,-51 -37,0 -38,1 -38,34 0,32 -2,34 -37,38 -21,3 -63,4 -93,4 -53,-1 -55,-2 -60,-31 -5,-28 -9,-30 -52,-33 l -47,-3 -3,42 -3,43 -55,12 c -30,7 -56,13 -57,14 -1,0 -4,-9 -8,-20 z" id="path9" style="stroke:#ff8900;stroke-opacity:1" /> <path d="m 3610,3611 c -11,-22 -14,-121 -2,-121 10,0 48,59 57,88 13,43 -34,71 -55,33 z" id="path10" style="stroke:#8500ff;stroke-opacity:1" /> <path d="m 3200,3601 c -5,-11 -10,-45 -10,-76 v -57 l 25,30 c 13,16 29,41 35,56 19,50 -26,91 -50,47 z" id="path11" style="stroke:#8500ff;stroke-opacity:1" /> <path d="m 2757,3580 c -24,-68 -26,-83 -16,-102 14,-26 43,-19 47,12 4,32 -24,111 -31,90 z" id="path12" style="stroke:#8500ff;stroke-opacity:1" /> <path d="m 1503,2958 c -4,-7 -11,-62 -15,-123 -4,-60 -10,-136 -14,-168 l -7,-58 54,6 c 30,4 60,8 67,10 16,6 15,64 -3,95 -9,16 -14,56 -15,115 0,115 -6,135 -36,135 -12,0 -26,-6 -31,-12 z" id="path13" style="stroke:#ff9101;stroke-opacity:1" /> <path d="m 2734,2834 c -10,-24 -15,-66 -14,-123 1,-47 1,-104 1,-126 -1,-46 24,-144 51,-197 35,-72 69,-38 89,87 6,44 18,92 26,107 11,24 11,33 -2,64 -11,27 -12,40 -4,50 8,10 8,28 -1,66 -6,29 -13,63 -16,76 -5,23 -44,32 -44,10 0,-7 -5,-5 -11,5 -5,9 -21,17 -35,17 -19,0 -28,-8 -40,-36 z" id="path14" style="stroke:#ff9101;stroke-opacity:1" /> <path id="path130" style="stroke:#000000;stroke-opacity:1" d="m 2060.286,1297.2248 1087.8766,842.8416 1074.9317,-819.624 M 3151.378,2141.2456 942.98689,1761.5362 c 631.63931,26.4325 1008.05971,-125.7138 1117.94681,-464.3555 341.6729,14.3418 679.7421,44.1009 1094.1357,-252.6782 431.155,307.7674 729.8595,243.1379 1064.6997,280.1075 199.0922,386.6921 604.37,432.9538 1025.9986,452.2191 z M 4498.3165,1905.274 c -170.8905,-42.3178 -598.585,-25.0227 -554.3142,-372.6582 -159.7727,-3.1077 -577.6026,67.9656 -790.4384,-197.0006 -234.8473,280.9711 -557.066,206.651 -767.7224,209.9793 1.2215,185.7078 -97.2863,325.7883 -386.2005,397.1099 m 1931.3265,63.8166 c -159.7741,-56.5003 -228.7486,-138.4339 -262.4631,-260.5414 -203.2907,27.5495 -390.3979,-2.9734 -517.6244,-125.3467 -105.8892,143.1125 -294.9691,145.8479 -500.8622,129.5675 1.6681,119.3742 -106.7637,198.1025 -249.7457,262.6224 m 1129.4075,63.3146 c -73.3164,-41.2168 -111.8863,-76.0908 -127.6505,-129.8529 -82.5857,38.8435 -165.7578,33.2923 -248.7138,-41.5782 -55.1976,77.3328 -133.3113,92.2759 -260.2995,36.5735 -0.1277,86.0025 -63.4298,116.0114 -125.6393,135.7032 m 386.8506,354.7997 -3.2043,-988.1836 5.3503,-401.3305" inkscape:label="web" sodipodi:nodetypes="cccccccccccccccccccccccccccc" /> </g> </svg>`)

    const happyHalloween2 = parseSvg(`<?xml version="1.0" encoding="UTF-8" standalone="no"?> <svg version="1.0" width="554.23718pt" height="479.99551pt" viewBox="0 0 554.23718 479.99551" preserveAspectRatio="xMidYMid" id="svg97" sodipodi:docname="outline2.svg" inkscape:version="1.3.2 (091e20ef0f, 2023-11-25, custom)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"> <defs id="defs97" /> <sodipodi:namedview id="namedview97" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" inkscape:document-units="pt" inkscape:zoom="1.3957668" inkscape:cx="357.86781" inkscape:cy="355.71846" inkscape:window-width="2560" inkscape:window-height="1371" inkscape:window-x="0" inkscape:window-y="0" inkscape:window-maximized="1" inkscape:current-layer="g97" /> <metadata id="metadata1"> Created by potrace 1.16, written by Peter Selinger 2001-2019 </metadata> <g transform="matrix(0.1,0,0,-0.1,-37.66235,560.35349)" fill="#000000" stroke="none" id="g97"> <path style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 4598,5590 c -50,-15 -54,-23 -18,-35 45,-15 79,-59 63,-84 -9,-15 -7,-19 18,-28 22,-9 29,-18 29,-38 0,-20 4,-26 15,-21 20,7 55,-28 55,-55 0,-15 4,-19 16,-15 21,8 51,-9 59,-35 5,-15 10,-17 20,-9 28,23 72,29 95,13 21,-15 23,-14 32,1 11,19 49,21 66,4 9,-9 12,-9 12,3 0,9 8,23 19,33 14,13 24,14 45,6 39,-14 39,-14 19,21 -42,73 -115,99 -166,59 -31,-25 -62,-27 -53,-4 3,9 9,27 12,40 6,23 4,24 -21,18 -21,-5 -32,-2 -42,12 -14,18 -16,18 -43,-14 l -28,-33 -12,53 c -19,86 -20,88 -50,103 -31,16 -98,18 -142,5 z" id="path1" /> <path style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 995,5455 c -27,-8 -53,-14 -56,-15 -3,0 -18,-11 -33,-25 -24,-22 -26,-30 -26,-108 0,-54 -5,-90 -14,-102 -13,-18 -16,-17 -60,19 l -46,38 v -30 c 0,-34 -22,-52 -60,-52 -14,0 -20,-5 -17,-12 29,-80 31,-88 19,-100 -9,-9 -23,-9 -60,1 -80,23 -101,24 -128,6 -39,-26 -64,-93 -71,-193 l -6,-87 22,27 c 27,33 51,41 84,29 23,-9 28,-7 39,17 7,14 25,31 40,36 23,8 33,6 58,-12 29,-22 30,-22 30,-3 0,34 49,64 95,58 22,-3 48,-8 58,-12 12,-5 17,-2 17,8 0,33 24,67 55,79 31,10 32,14 28,49 -5,33 -1,42 28,71 25,26 32,40 30,64 -2,33 29,74 56,74 10,0 11,5 3,19 -24,46 -5,119 36,142 13,7 24,16 24,21 0,13 -89,8 -145,-7 z" id="path3" /> <path d="m 1649,5452 c -8,-12 -21,-22 -31,-22 -21,0 -32,-16 -18,-25 7,-4 8,-19 5,-37 -6,-28 -6,-29 13,-17 18,11 24,10 40,-4 25,-23 32,-21 32,7 0,13 8,27 17,31 16,6 16,8 -4,23 -12,9 -26,28 -31,42 l -9,24 z" id="path4" style="fill:none;fill-opacity:1;stroke:#b1b200;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 3141,5421 c -7,-12 -25,-24 -42,-28 -32,-6 -36,-15 -14,-33 8,-7 15,-25 15,-41 0,-31 9,-36 27,-18 6,6 22,9 35,6 37,-10 43,-8 43,12 0,11 9,29 19,40 19,21 19,21 0,21 -10,0 -31,14 -45,32 l -26,32 z" id="path5" style="fill:none;fill-opacity:1;stroke:#b1b200;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 4276,5335 c -7,-19 31,-342 99,-853 25,-183 45,-361 45,-395 0,-59 -25,-164 -184,-767 -46,-175 -47,-197 -2,-215 51,-22 240,-75 264,-75 33,0 48,36 61,140 39,317 123,829 142,869 11,25 71,130 134,235 407,687 406,686 396,704 -14,26 -227,135 -250,127 -13,-4 -64,-107 -170,-343 -84,-186 -156,-344 -160,-351 -5,-8 -14,-10 -21,-6 -10,6 -11,100 -5,424 6,348 5,419 -7,434 -17,23 -189,75 -274,83 -52,6 -62,4 -68,-11 z" id="path6" style="fill:none;fill-opacity:1;stroke:#ff8600;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 1246,5248 c -91.1559,-624.1277 -197.4835,-1392.8204 -299.67226,-2015.2439 92.99856,-42.7877 132.59846,-57.5379 243.34716,-65.4083 33.9246,109.1644 114.4275,698.2502 145.6313,764.0523 135.1844,-17.904 230.0798,-33.3727 265.2422,-59.5329 -63.7953,-228.993 -79.614,-563.2771 -112.2238,-797.6161 107.5637,-34.3766 156.6257,-18.1585 270.2662,-35.5934 24.2169,312.7305 119.6754,746.1084 163.8443,1056.2995 45.4047,267.143 141.8369,732.452 176.2425,1001.2965 -77.0198,16.5865 -91.7787,24.3349 -300.5152,58.5798 -39.3018,-214.0154 -47.7377,-413.2282 -131.6841,-861.9078 -64.5316,9.0968 -173.8946,16.7413 -263.437,48.7749 32.2874,280.1097 75.3472,586.9445 128.6564,863.3131 C 1460.1731,5219.4679 1328.5793,5240.4706 1246,5248 Z" id="path12" style="fill:none;fill-opacity:1;stroke:#9a00ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" sodipodi:nodetypes="cccccccccccccc" /> <path d="m 5230,5210 c 0,-11 -7,-23 -15,-26 -14,-6 -13,-8 1,-19 10,-7 15,-19 11,-29 -4,-10 -1,-16 8,-16 8,0 15,5 15,11 0,7 10,9 25,5 23,-6 25,-4 19,18 -3,13 -1,27 5,31 6,3 9,11 5,16 -4,6 -11,6 -19,-1 -10,-9 -19,-6 -34,9 -21,21 -21,21 -21,1 z" id="path14" style="fill:none;fill-opacity:1;stroke:#aeae00;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="M 2776.2223,3551.1633 C 2689.7004,4048.4934 2662.6439,4555.1572 2574,5052 c -5,18 -17,21 -147,38 -93,12 -89,12 -105,1 -14,-8 -39,-115 -237,-1001 -69,-311 -140,-627 -157,-702 -17,-76 -28,-145 -24,-153 8,-23 60,-41 154,-56 72,-11 85,-11 98,3 10,9 31,105 60,267 24,139 49,262 55,273 10,19 123.8433,5.8877 198.8433,-0.1123 25.5175,-90.7058 29.1391,-142.8527 37.1391,-235.8527 M 2440,4459 c 21,-188 39,-444 32,-451 -10,-10 -141,7 -154,20 -7,7 62,472 78,526 12,38 34,-9 44,-95 z" id="path16" style="fill:none;fill-opacity:1;stroke:#ff8b00;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" sodipodi:nodetypes="ccccccccccccccsscc" /> <path d="m 3756.0269,3532.4793 c -2.4232,144.0937 1.3819,388.4268 -1.0269,532.5207 118.7847,7.328 252.8929,14.4289 340.9592,105.8336 118.1934,112.0754 134.5311,285.2665 131.5752,439.2718 -2.4954,146.0809 -47.8204,307.0679 -174.7926,393.097 -116.3821,78.7797 -265.9374,83.7604 -400.7418,65.7976 -74.4112,19.6275 -119.8875,-57.8858 -106.3359,-122.9458 -12.5196,-264.0817 -6.6967,-528.5955 -12.8613,-792.848 -1.9302,-160.6404 -18.3049,-421.1573 -26.7436,-581.6115 M 3894,4836 c 83.694,-37.1183 100.5718,-139.2699 102.4102,-221.0466 0.9007,-95.701 2.9347,-206.128 -66.6601,-280.7161 -42.0736,-40.5151 -117.6648,-51.7007 -166.6648,-31.3644 -14.0985,172.1654 -16.4865,345.5347 -5.5786,518.0645 19.5657,53.274 97.2324,22.4113 136.4933,15.0626 z" id="path17" style="fill:none;fill-opacity:1;stroke:#8800ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" sodipodi:nodetypes="ccccccccccccccc" /> <path d="m 3053.459,3845.2057 c 5.3739,37.9356 -37.5515,219.7238 28.1638,204.8239 91.9656,4.6795 192.4732,18.469 259.3696,88.6118 101.955,90.5902 127.599,233.2754 128.0486,363.4433 -0.9964,128.4309 -26.7812,267.2652 -119.9083,362.4173 -58.3346,65.4074 -144.1366,104.7404 -232.2475,100.2167 -66.9483,2.724 -134.1263,2.5039 -200.8852,-3.7187 -72.0785,5.8336 -78.6038,-81.3441 -73.3922,-133.5078 -5.1269,-360.2797 -1.0237,-720.6864 -13.0661,-1080.8587 -0.8472,-34.8778 -6.3595,-136.1412 -7.2067,-171.019 M 3180,4742 c 61.2639,-54.6456 82.0526,-140.413 74.8167,-219.7572 1.5749,-88.3777 -2.8876,-193.4019 -80.5421,-251.2787 -35.0923,-18.2633 -112.3439,-30.1346 -130.5947,-1.7524 -13.3079,155.0776 -15.8388,311.4548 -9.8118,466.7215 26.693,53.1843 102.9783,28.6617 144.8158,6.8935 z" id="path19" style="fill:none;fill-opacity:1;stroke:#8d00ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" sodipodi:nodetypes="ccccccccccccccccc" /> <path style="fill:none;fill-opacity:1;stroke:#8600ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 5658,3905 c 22,-48 16,-53 -97,-84 l -71,-20 v 47 c 0,44 2,47 28,49 15,1 45,8 67,16 56,21 60,20 73,-8 z" id="path360" /> <path style="fill:none;fill-opacity:1;stroke:#8600ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 5460,3915 c 17,-10 12,-131 -5,-145 -20,-16 -145,-6 -157,12 -12,18 -2,116 14,135 10,12 26,14 76,10 34,-4 67,-9 72,-12 z" id="path359" /> <path style="fill:none;fill-opacity:1;stroke:#8600ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 5265,3900 c 3,0 5,-20 5,-44 v -44 l -44,13 c -37,11 -82,30 -94,40 -1,1 5,18 13,38 l 15,37 50,-20 c 28,-11 53,-20 55,-20 z" id="path358" /> <path style="fill:none;fill-opacity:1;stroke:#8200ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 5493,4593 c -88,-138 -200,-344 -269,-494 l -67,-147 -86,-22 c -184,-48 -233,-103 -156,-176 99,-93 419,-147 684,-114 161,21 298,81 313,138 14,51 -44,98 -171,140 l -80,27 -55,109 c -31,61 -56,111 -56,113 0,2 17,1 38,-3 l 37,-6 -3,181 c -4,209 -17,191 121,162 48,-10 87,-14 87,-10 0,15 -261,179 -284,179 -2,0 -26,-35 -53,-77 z" id="path21" /> <path style="fill:none;fill-opacity:1;stroke:#8600ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 5420,3845 c 0,-33 -2,-35 -35,-35 -33,0 -35,2 -35,35 0,33 2,35 35,35 33,0 35,-2 35,-35 z" id="path361" /> <path style="fill:none;fill-opacity:1;stroke:#8600ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 5337,3904 c -4,-4 -7,-31 -7,-61 v -53 h 55 55 v 49 c 0,28 -3,52 -7,54 -16,10 -89,18 -96,11 z" id="path23" /> <path style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 901,4621 c -11,-11 -23,-40 -26,-65 -10,-66 -28,-76 -48,-25 -16,40 -17,40 -39,25 -12,-9 -35,-16 -51,-16 -28,0 -29,-1 -25,-45 3,-41 1,-45 -20,-45 -22,0 -36,12 -81,70 -40,52 -123,20 -198,-79 -42,-54 -42,-64 1,-56 37,7 76,-8 76,-29 0,-10 13,-12 49,-8 42,4 50,1 64,-19 14,-19 17,-20 22,-7 15,38 76,23 90,-22 6,-20 6,-20 33,0 22,16 33,18 59,11 31,-9 34,-8 49,26 17,34 56,59 75,47 5,-3 9,6 9,20 0,31 32,66 61,66 20,0 21,7 2,56 -7,19 36,61 69,69 l 33,7 -40,19 c -55,25 -139,25 -164,0 z" id="path26" /> <path d="m 4941,4206 c -8,-9 -20,-16 -28,-16 -11,0 -13,-5 -7,-17 4,-10 7,-30 7,-45 0,-31 8,-35 27,-13 9,11 16,13 24,5 16,-16 26,-12 26,11 0,11 5,30 11,41 9,16 8,19 -1,13 -8,-5 -19,1 -30,14 -15,20 -18,21 -29,7 z" id="path29" style="fill:none;fill-opacity:1;stroke:#aeae00;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 4073,3952 c -2,-25 2,-29 26,-29 24,0 28,4 28,29 0,23 -4,28 -26,28 -21,0 -26,-5 -28,-28 z" id="path33" style="fill:none;fill-opacity:1;stroke:#ff8800;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 4101.6509,3643.3568 c -12,30 -21.6028,71.4463 -30.9138,96.1491 -8.0472,-18.8459 -31.0411,-73.8123 -36.3711,-93.316 -43.6432,-7.4171 -52.9868,-6.6377 -85.9436,-16.0009 34.8141,-14.9032 63.448,-44.3444 63.448,-44.3444 -13.1318,-21.0186 -29.2787,-64.6142 -35.7695,-91.1233 40.7082,24.3535 54.0389,30.7833 85.8525,59.9124 l 60.7033,-54.0538 c -5.6411,28.9411 -0.8097,57.6599 -1.992,85.059 29.5691,13.9971 94.3016,32.4942 76.6162,38.7598 -49.0653,17.3828 -81.3521,10.7302 -95.63,18.9581 z" id="path36" style="fill:none;fill-opacity:1;stroke:#b1b200;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" sodipodi:nodetypes="ccccsccccsc" /> <path d="m 4831,3506 c -12,-14 -5,-26 16,-26 15,0 18,26 4,34 -5,3 -14,0 -20,-8 z" id="path38" style="fill:none;fill-opacity:1;stroke:#ff8800;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 5080,3496 c -46,-12 -120,-52 -120,-64 0,-4 16,-7 35,-8 49,-1 78,-30 72,-71 -5,-30 -3,-33 19,-33 28,0 64,-32 64,-58 0,-14 7,-17 40,-14 41,4 44,1 64,-61 5,-15 9,-16 28,-6 20,11 25,8 50,-22 l 28,-33 28,27 c 29,28 61,36 98,24 16,-6 23,-1 35,25 11,26 21,34 47,36 18,2 40,-2 48,-9 11,-9 14,-8 14,8 0,70 46,113 120,113 22,0 40,4 40,9 0,14 -76,79 -119,101 -74,37 -119,23 -157,-52 -40,-80 -74,-91 -74,-23 0,49 -1,51 -30,33 -16,-10 -24,-10 -40,0 -26,16 -32,12 -55,-37 -15,-34 -21,-39 -36,-31 -10,6 -21,27 -24,48 -18,107 -59,130 -175,98 z" id="path39" /> <path id="path365" style="fill:none;fill-opacity:1;stroke:#ff0000;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 5039,2994 c 6,4 11,2 11,-4 0,-17 -33,-8 -37,10 -4,12 -3,13 5,1 5,-7 15,-10 21,-7 z m 296,336 c -11,18 3,40 20,33 3.0486,-1.1725 28.8846,-39.0366 -20,-33 z m 51,0 c -9,9 0,30 14,30 32.5965,0 7.4188,-51.4188 -14,-30 z M 815,4500 c 10,-16 -14,-40 -41,-40 -28,0 -36,11 -23,30 8,13 11,12 20,-3 12,-20 31,-14 22,8 -6,17 12,21 22,5 z m 14,676 c 10,-11 6,-19 -15,-40 -29,-26 -44,-26 -44,1 0,11 6,14 21,10 18,-5 20,-2 15,19 -7,27 5,32 23,10 z m -74,-79 c -20,-11 -29,-3 -21,19 5,13 9,14 22,3 14,-11 14,-13 -1,-22 z m 4091,328 c -7,-18 15,-20 32,-3 7,7 12,9 12,4 0,-4 -6,-14 -14,-21 -11,-12 -17,-12 -31,-1 -10,7 -15,18 -11,24 10,17 19,15 12,-3 z" /> <path style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 4832,3113 c -9,-3 -3,-12 18,-25 25,-15 31,-24 26,-41 -4,-17 0,-25 17,-32 12,-6 22,-19 22,-30 0,-11 8,-23 18,-28 11,-4 21,-15 24,-25 3,-14 11,-18 28,-15 12,3 29,-2 36,-10 11,-11 19,-12 37,-4 20,9 27,8 36,-5 12,-16 14,-16 29,-1 16,16 19,15 47,-5 30,-22 30,-22 30,-2 0,29 -24,82 -44,99 -15,12 -22,12 -51,-2 -39,-19 -39,-19 -25,19 9,24 8,26 -10,21 -11,-3 -27,2 -36,10 -13,14 -17,13 -35,-3 -17,-16 -22,-16 -29,-4 -6,8 -10,27 -10,42 0,17 -8,31 -19,38 -20,10 -86,12 -109,3 z" id="path40" /> <path d="m 1883,3012 c -6,-4 -19,-25 -28,-47 -9,-23 -30,-49 -48,-60 -46,-29 -45,-49 2,-79 28,-18 43,-36 49,-58 11,-42 36,-47 71,-14 21,20 36,25 66,23 39,-2 40,-1 37,28 -5,50 -4,88 3,123 l 7,32 h -43 c -34,0 -49,6 -74,30 -17,16 -35,26 -42,22 z m 35,-72 c 8,-14 23,-20 47,-20 33,0 35,-1 24,-21 -6,-12 -8,-34 -5,-50 5,-26 3,-29 -21,-29 -15,0 -37,-9 -49,-21 l -22,-21 -7,32 c -5,23 -15,35 -36,42 l -29,10 35,33 c 19,18 35,40 35,49 0,22 13,20 28,-4 z" id="path41" style="fill:none;fill-opacity:1;stroke:#b1b200;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 573,2985 c -28,-20 -31,-25 -18,-35 8,-7 15,-24 15,-38 0,-23 1,-24 18,-9 11,10 26,14 40,10 21,-5 22,-3 16,21 -4,16 -1,32 6,41 10,12 9,15 -7,15 -10,0 -23,4 -28,9 -6,5 -24,-1 -42,-14 z" id="path42" style="fill:none;fill-opacity:1;stroke:#b1b200;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 1005.8456,2915.4734 c 0,-16 5,-20 23,-17 12,1 22,9 22,17 0,8 -10,15 -22,17 -18,3 -23,-2 -23,-17 z" id="path49" style="fill:none;fill-opacity:1;stroke:#ff8800;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 4348,2820 c -16,-23 -30,-30 -55,-30 -36,0 -42,-13 -18,-47 8,-12 14,-38 12,-59 l -2,-39 45,-2 c 25,-1 56,-3 70,-5 20,-2 27,3 35,29 6,17 18,40 28,51 24,26 21,40 -9,54 -14,7 -32,27 -39,45 -17,41 -38,42 -67,3 z" id="path50" style="fill:none;fill-opacity:1;stroke:#b1b200;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" sodipodi:nodetypes="cscccccccccc" /> <path d="m 1134,2768 c -4,-7 -10,-174 -12,-373 -3,-239 -8,-365 -15,-374 -13,-16 -131,-11 -148,6 -8,8 -8,97 1,323 9,241 9,314 0,326 -14,16 -155,20 -178,5 -11,-6 -13,-117 -11,-577 1,-313 4,-627 8,-699 l 6,-130 55,-6 c 30,-3 62,-2 70,2 12,6 17,53 25,266 l 10,258 68,3 c 42,2 74,-2 83,-9 11,-9 14,-63 14,-294 v -283 l 43,-4 c 74,-7 100,3 109,42 4,19 14,222 23,450 41,1095 40,1047 26,1064 -17,20 -165,23 -177,4 z" id="path55" style="fill:none;fill-opacity:1;stroke:#ff8900;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 5315,2676 c -17,-13 -18,-31 -12,-430 4,-268 3,-416 -3,-416 -6,0 -10,1 -10,3 0,2 -16,73 -35,158 -20,85 -58,264 -86,399 -27,134 -55,248 -62,252 -13,9 -118,1 -128,-10 -4,-4 -8,-326 -10,-717 l -4,-710 69,-3 c 38,-2 73,1 78,6 11,11 12,573 2,717 -4,50 -3,87 2,82 11,-10 52,-179 124,-512 34,-154 64,-290 67,-302 4,-20 12,-23 58,-23 32,0 57,5 64,13 7,10 14,240 21,748 11,828 17,759 -70,759 -25,0 -55,-6 -65,-14 z" id="path60" style="fill:none;fill-opacity:1;stroke:#8a00ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 1946,2588 c -6,-20 -31,-1019 -31,-1238 v -195 l 167,-3 c 194,-3 191,-4 186,96 l -3,57 -93,3 c -64,2 -94,7 -98,16 -3,7 5,291 16,630 16,468 18,622 9,632 -15,19 -148,20 -153,2 z" id="path65" style="fill:none;fill-opacity:1;stroke:#ff8500;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 1513,2493 c -13,-2 -23,-9 -23,-14 0,-51 -110,-946 -151,-1223 -7,-48 -6,-72 1,-81 13,-16 105,-39 124,-32 9,4 19,51 31,144 10,76 22,146 27,156 6,13 21,17 58,17 78,0 84,-10 104,-190 10,-85 21,-161 24,-168 4,-11 19,-13 65,-9 32,3 63,9 68,14 11,11 -7,155 -91,748 -33,231 -66,467 -74,523 -8,57 -16,105 -18,107 -6,7 -123,13 -145,8 z m 77,-395 c 1,-13 11,-117 24,-233 14,-115 22,-213 20,-217 -7,-11 -78,-10 -90,2 -6,6 -6,59 2,152 7,79 15,182 19,231 4,48 11,87 16,87 5,0 9,-10 9,-22 z" id="path68" style="fill:none;fill-opacity:1;stroke:#9300ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 4146,2463 c -17.2837,-179.8794 -21.5771,-360.8669 -31.1509,-541.3123 -10.7792,-252.0559 -21.7396,-504.1581 -34.6108,-756.0842 2.9701,-55.9408 79.4508,-35.6305 118.5025,-44.5431 81.2263,-2.903 163.4824,-10.3394 244.2592,-0.06 29.5128,41.1601 15.0505,101.5773 13.7285,150.3157 -22.8789,45.7763 -88.0467,22.2883 -129.487,28.6843 -25.7471,0 -51.4943,0 -77.2415,0 6.3905,141.7761 15.111,283.429 25,425 51.2686,-0.9737 103.7428,-9.0102 154,4 22.7736,37.6365 20.1022,85.959 18.4219,128.8125 -0.7743,53.2321 -70.2711,37.6908 -106.0527,44.5327 -22.1231,0.885 -44.2461,1.7699 -66.3692,2.6548 2.5804,128.4567 9.6713,256.7399 17,385 57.1402,2.0771 115.749,-5.9794 171.5742,8.7012 50.2483,23.7515 33.6609,90.5271 35.2417,135.3662 -2.1545,58.7893 -76.0169,38.1672 -115.449,44.8218 -73.6633,0.4584 -147.9196,4.64 -221.195,-3.9185 -6.5626,-1.2165 -14.3749,-4.7733 -16.1719,-11.9707 z" id="path69" style="fill:none;fill-opacity:1;stroke:#ff8500;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 4755,2430 c -64.3247,-13.9345 -132.2844,-0.6246 -195.5404,-19.035 -31.9502,-33.8443 -8.9734,-88.1225 -16.9511,-130.2472 -1.8619,-373.2255 5.8577,-746.5409 10.9327,-1119.6139 -15.4607,-54.8152 39.4728,-77.7183 83.0821,-56.4375 78.4207,26.5854 163.9531,1.5575 241.7998,29.4923 27.8749,34.1577 29.2462,111.1111 7.1165,145.9135 -61.8116,3.0734 -123.6263,-1.6423 -185.4396,-2.0722 0,147 0,294 0,441 48.8442,8.1516 122.002,-7.9704 155.3715,15.6876 -6.5558,43.9332 20.6383,120.3015 -5.5518,145.3124 -49.9399,0 -99.8798,0 -149.8197,0 -1.3846,84.2573 6.249,170.0804 -14.5671,252.4692 5.7657,43.2348 -17.5525,120.0653 45.1039,126.6907 48.2477,12.5597 123.2223,-13.6651 147.5968,43.73 1.3752,41.437 4.7865,102.4565 -10.6508,132.4358 -37.5449,1.4694 -75.3059,0.4425 -112.4828,-5.3257 z" id="path70" style="fill:none;fill-opacity:1;stroke:#ff8500;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 3982,2386 c -32.2317,-26.7348 -69.852,-45.6782 -110,-57 -18.0427,-247.827 -14.1675,-496.6435 -27.9141,-744.6445 3.2321,-29.9275 -16.0832,-49.0811 -22.1484,-9.9493 -30.0699,105.62 -50.2536,213.9962 -83.9375,318.5938 -38.1595,30.599 -124.1853,26.6576 -129.875,-35.0312 -33.5267,-101.6917 -52.1453,-207.4266 -70.8281,-312.5 -24.3291,-61.8435 -17.1954,49.2844 -22.2803,68.6909 -15.2888,166.7684 -26.2372,333.8799 -36.7314,500.977 -7.4903,65.4979 -104.7835,43.5959 -143.4825,14.4649 -60.1188,-20.6253 -20.5605,-87.8318 -21.7129,-132.4434 46.4854,-301.6901 72.203,-605.9907 109.0733,-908.8716 -6.3101,-71.9304 85.2423,-47.8731 130.8994,-57.7554 65.4455,-8.8033 41.0805,81.8577 57.5178,121.3001 21.6643,138.6404 39.9854,277.8108 63.4197,416.1687 51.1085,-168.7859 83.3688,-343.0946 138,-511 44.8371,6.4497 93.3248,2.8341 134,25 20.9876,74.3504 19.7099,153.5786 27.9574,230.2672 22.0935,337.0091 52.5668,673.3948 76.8165,1010.2327 7.0271,39.0902 7.5875,129.4972 -50.7114,76.6407 l -9.0078,-6.2715 z" id="path71" style="fill:none;fill-opacity:1;stroke:#8a00ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 2345,2257 c -3,-18 -6,-282 -7,-587 l -3,-555 40,-4 c 41,-3 295,16 328,26 15,4 17,15 15,81 l -3,77 -114,-4 -114,-4 7,324 c 3,178 9,389 12,469 3,80 1,150 -3,156 -4,6 -40,21 -80,32 l -72,20 z" id="path73" style="fill:none;fill-opacity:1;stroke:#ff8500;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 2849,2128 c -45,-41 -82,-113 -111,-215 -20,-68 -23,-101 -23,-258 0,-158 3,-190 23,-260 28,-95 58,-151 108,-194 47,-42 75,-52 144,-52 101,-1 178,49 227,145 37,73 52,129 65,253 36.4625,348.2169 -99.3443,601.0536 -143.1068,603.5854 -55.8321,3.2301 -90.2692,4.1842 -179.4186,40.8971 C 2949.4746,2195.4825 2872,2149 2849,2128 Z m 188,-140 c 32,-36 44,-65 59,-147 25,-144 11,-410 -26,-482 -21,-41 -52,-69 -76,-69 -101,0 -151,389 -80,625 27,89 80,120 123,73 z" id="path75" style="fill:none;fill-opacity:1;stroke:#8a00ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" sodipodi:nodetypes="ccscccccscccccscc" /> <path d="m 599,2143 c -11,-3 -15,-11 -11,-28 6,-32 55,-31 57,2 2,22 -16,32 -46,26 z" id="path76" style="fill:none;fill-opacity:1;stroke:#ff8800;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 3675,2091 c -3,-6 -14,-11 -24,-11 -12,0 -17,-8 -16,-27 0,-27 18,-42 29,-24 4,6 13,8 20,5 10,-4 13,3 12,25 -1,33 -11,48 -21,32 z" id="path77" style="fill:none;fill-opacity:1;stroke:#ff8800;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 3244.0558,1044.0539 c 33.4476,-2.2203 39.886,-37.4882 28.1853,-61.60235 14.9668,20.12625 40.8377,43.27935 73.5582,0.60485 -19.5178,50.9156 4.8919,61.8853 5.8648,73.0953 -35.6277,-5.2598 -36.4116,-3.2289 -54.4173,30.8501 -7.3639,-33.0112 -0.5306,-41.5885 -53.191,-42.9479 z" id="path84" style="fill:none;fill-opacity:1;stroke:#b1b200;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" sodipodi:nodetypes="cccccc" /> <path d="m 2957,959 c -9,-17 -26,-33 -37,-36 -25,-7 -26,-19 -3,-32 12,-6 17,-20 15,-42 l -3,-33 24,22 c 20,19 28,20 57,12 49,-14 51,-13 39,16 -7,21 -6,31 6,44 22,24 19,30 -14,30 -20,0 -35,8 -48,25 l -18,25 z" id="path90" style="fill:none;fill-opacity:1;stroke:#b1b200;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path style="fill:none;fill-opacity:1;stroke:#ff8400;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 2218.9992,5213.9148 c 149.2808,141.7828 269.7119,134.4397 360.1198,-28.0959" id="path98" sodipodi:nodetypes="cc" /> <path style="fill:none;fill-opacity:1;stroke:#ff8700;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 3083.2583,5129.5564 c 452.8578,14.0547 660.6366,266.9091 1022.3231,104.8998" id="path99" sodipodi:nodetypes="cc" /> <path style="fill:none;fill-opacity:1;stroke:#ff8400;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 919.44803,4050.1092 c -90.84064,8.2241 -168.97126,-5.4475 -152.47523,-182.1338" id="path100" sodipodi:nodetypes="cc" /> <path style="fill:none;fill-opacity:1;stroke:#8600ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="M 776.24505,3690.0186 C 655.89999,3547.409 706.56665,3412.8419 829.25483,3281.6619" id="path101" sodipodi:nodetypes="cc" /> <path style="fill:none;fill-opacity:1;stroke:#ff8600;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 4513.3218,2868.6952 c 0,0 316.614,50.8265 344.4799,-282.1322" id="path102" /> <path style="fill:none;fill-opacity:1;stroke:#ff8800;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 5313.5709,2829.3527 c 372.4532,258.5954 399.8468,-329.2749 258.1216,-410.5493" id="path103" sodipodi:nodetypes="cc" /> <path style="fill:none;fill-opacity:1;stroke:#ff8800;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 5602.1966,2242.4727 c 62.8784,0.3026 73.6644,-80.605 0.03,-82.2138 -65.8586,-0.9105 -58.2632,82.4591 -0.03,82.2138 z" id="path104" sodipodi:nodetypes="ccc" /> <path style="fill:none;fill-opacity:1;stroke:#ff8500;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="M 2995.2188,3561.3736 C 2972.2448,3579.931 2868.8793,3609.0205 2759,3541 c -39,-24 -59,-29 -132,-33 -114,-6 -191,-43 -273,-131 -116,-123 -172,-277 -181,-493 -7,-156 9,-246 63,-354 58,-114 167,-209 243,-210 14,0 45,-20 78,-50 84,-77 200,-101 289,-61 l 41,19 61,-30 c 128,-63 312,-58 424,11 49,31 50,31 81,14 22,-12 55,-18 107,-18 109,1 179,40 249,142 14,21 35,36 61,43 91,24 180,127 228,262 31,88 42,274 23,384 -38,218 -154,402 -297,469 -48,23 -77,29 -154,33 -72,3 -96.9055,14.2801 -123.436,7.0244 -132.056,94.4009 -215.5552,77.709 -236.2517,67.7266" id="path356" inkscape:label="pumpkinOuter" /> <path style="fill:none;fill-opacity:1;stroke:#935211;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 3400.5994,3456.768 -94.4793,160.3691 C 3298.3528,3625.7746 3283,3673 3275,3705 c -25,94 -42,122 -86,139 -47,19 -81,20 -132,2 -46,-17 -64,-32 -83,-67 -18,-35 -19,-30 16,-74 22,-28 30,-48 30,-79 0,-26.5129 2.4695,-35.9677 -5.9454,-45.2691 l -121.4178,-123.5051" id="path348" inkscape:label="pumpkinStem" transform="translate(-2.5e-6,-2.5e-5)" /> <path style="fill:none;fill-opacity:1;stroke:#ff0000;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 3044.7919,2697.2374 128.8144,155.2144 113.0354,-157.9169 z" id="path376" /> <path id="path320" style="fill:none;fill-opacity:1;stroke:#ff8500;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 3404.4623,2227.8421 c 69.776,46.47 109.2258,110.2474 128.2425,172.8987 m -640.4894,-174.0637 c -65.5951,46.0791 -86.6735,112.6466 -108.2281,178.9949 m 37.9715,1048.9088 c -1.5673,57.4973 -61.9932,70.4824 -158.9174,55.8654 m 336.5783,-150.5167 c -8.5273,86.5664 -125.1059,124.9143 -205.8367,84.8334 -292.2262,-136.8025 -475.2419,-635.1581 -303.7014,-1127.6051 m 833.9377,1014.2184 c -37.7113,126.4765 134.2789,149.4361 172.7798,121.7875 517.7925,-218.8259 379.7191,-1003.7761 335.3677,-1078.6026 m -955.8338,659.7096 c 36.4356,126.38 67.2539,251.1154 146.5455,352.2824 49.3295,66.1449 209.7506,62.7945 257.3403,-0.6217 101.4252,-121.6486 140.4935,-239.355 160.9178,-364.265 m 62.4222,428.9999 c -7.9028,57.9063 -0.5555,104.4889 100.0668,93.7887" /> <path style="fill:none;fill-opacity:1;stroke:#ff0000;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 2736.8189,3211.3407 294.0725,-364.7451 -461.0988,68.7783 z" transform="translate(-2.5e-6,-2.5e-5)" id="path369" /> <path style="fill:none;fill-opacity:1;stroke:#ff0000;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 3301.5654,2855.1175 291.1916,348.4308 188.1159,-292.3513 z" transform="translate(-2.5e-6,-2.5e-5)" id="path368" /> <path style="fill:none;fill-opacity:1;stroke:#ff0000;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 2559.9798,2833.393 c 75.4448,-80.5155 151.247,-160.0654 246.8717,-186.0746 l 18.4028,-88.2517 128.6832,-60.1672 5.1635,102.2938 370.2392,-13.9215 13.1711,-78.8535 140.2801,46.1776 6.5594,96.7473 c 111.792,43.7533 208.4004,107.2881 291.3122,188.6669 -89.8409,-447.9731 -328.242,-500.1386 -569.4954,-528.5654 l -7.5458,100.09 -140.8731,5.7774 -2.2617,-101.1551 c -211.4492,31.0746 -416.7447,81.6442 -500.5072,517.236 z" transform="translate(-2.5e-6,-2.5e-5)" id="path331" /> <path style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="M 5335.1419,4939.7464 C 5404.3053,4595.4092 5230.441,4449.5093 5113.521,4373.8087" id="path321" sodipodi:nodetypes="cc" /> <path style="fill:none;fill-opacity:1;stroke:#ff8900;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 1793.9988,2439.5036 c 64.4305,353.1036 -395.0948,437.2973 -367.3636,181.3204 4.9107,-85.6286 106.3856,-89.9645 90.55,-23.6082" id="path322" sodipodi:nodetypes="ccc" /> <path style="fill:none;fill-opacity:1;stroke:#8f00ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="M 666.67452,1640.3425 C 552.71679,1515.7823 589.2831,1409.0864 630.90521,1302.9904" id="path323" sodipodi:nodetypes="cc" /> <path style="fill:none;fill-opacity:1;stroke:#8f00ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 903.0786,1134.9294 c 128.8027,-145.40855 297.8783,-158.36908 493.0505,-85.5047" id="path324" sodipodi:nodetypes="cc" /> <path style="fill:none;fill-opacity:1;stroke:#8600ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 5252.2436,862.8647 c 111.4522,2.55001 183.8654,40.93655 192.8055,137.5894" id="path325" sodipodi:nodetypes="cc" /> <path style="fill:none;fill-opacity:1;stroke:#ff8600;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="M 704.1503,1210.0886 C 714.11251,995.10468 779.50373,898.85537 923.26289,857.72749 1462.3218,745.82032 1948.5756,1159.894 2152.9823,938.92655" id="path326" sodipodi:nodetypes="ccc" /> <path style="fill:none;fill-opacity:1;stroke:#8f00ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="M 2854.2517,970.49518 C 2820.5318,908.18954 2764.5708,863.89883 2664.593,855.26112" id="path327" sodipodi:nodetypes="cc" /> <path style="fill:none;fill-opacity:1;stroke:#8f00ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 2702.0336,982.32297 c -55.9308,-16.11849 -93.5313,-47.43985 -238.3445,10.15906" id="path328" sodipodi:nodetypes="cc" /> <path style="fill:none;fill-opacity:1;stroke:#ff8400;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="M 3171.0156,886.56005 C 3783.8427,753.26641 4328.7579,1112.6642 4558.308,880.32643" id="path329" sodipodi:nodetypes="cc" /> <path d="m 2870.6824,5232.9078 c -12,30 -21.6028,71.4463 -30.9138,96.1491 -8.0472,-18.8459 -31.0411,-73.8123 -36.3711,-93.316 -43.6432,-7.4171 -52.9868,-6.6377 -85.9436,-16.0009 34.8141,-14.9032 63.448,-44.3444 63.448,-44.3444 -13.1318,-21.0186 -29.2787,-64.6142 -35.7695,-91.1233 40.7082,24.3535 54.0389,30.7833 85.8525,59.9124 l 60.7033,-54.0538 c -5.6411,28.9411 -0.8097,57.6599 -1.992,85.059 29.5691,13.9971 94.3016,32.4942 76.6162,38.7598 -49.0653,17.3828 -81.3521,10.7302 -95.63,18.9581 z" id="path36-3" style="fill:none;fill-opacity:1;stroke:#b1b200;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" sodipodi:nodetypes="ccccsccccsc" /> </g> </svg>`);

    const happyHalloween2safe = parseSvg(`<?xml version="1.0" encoding="UTF-8" standalone="no"?> <svg version="1.0" width="554.23718pt" height="479.99551pt" viewBox="0 0 554.23718 479.99551" preserveAspectRatio="xMidYMid" id="svg97" sodipodi:docname="notscary.svg" inkscape:version="1.3.2 (091e20ef0f, 2023-11-25, custom)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"> <defs id="defs97" /> <sodipodi:namedview id="namedview97" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" inkscape:document-units="pt" inkscape:zoom="1.3957668" inkscape:cx="395.12331" inkscape:cy="340.67295" inkscape:window-width="2560" inkscape:window-height="1371" inkscape:window-x="0" inkscape:window-y="0" inkscape:window-maximized="1" inkscape:current-layer="g97" /> <metadata id="metadata1"> Created by potrace 1.16, written by Peter Selinger 2001-2019 </metadata> <g transform="matrix(0.1,0,0,-0.1,-37.66235,560.35349)" fill="#000000" stroke="none" id="g97"> <path style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 4598,5590 c -50,-15 -54,-23 -18,-35 45,-15 79,-59 63,-84 -9,-15 -7,-19 18,-28 22,-9 29,-18 29,-38 0,-20 4,-26 15,-21 20,7 55,-28 55,-55 0,-15 4,-19 16,-15 21,8 51,-9 59,-35 5,-15 10,-17 20,-9 28,23 72,29 95,13 21,-15 23,-14 32,1 11,19 49,21 66,4 9,-9 12,-9 12,3 0,9 8,23 19,33 14,13 24,14 45,6 39,-14 39,-14 19,21 -42,73 -115,99 -166,59 -31,-25 -62,-27 -53,-4 3,9 9,27 12,40 6,23 4,24 -21,18 -21,-5 -32,-2 -42,12 -14,18 -16,18 -43,-14 l -28,-33 -12,53 c -19,86 -20,88 -50,103 -31,16 -98,18 -142,5 z" id="path1" /> <path style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 995,5455 c -27,-8 -53,-14 -56,-15 -3,0 -18,-11 -33,-25 -24,-22 -26,-30 -26,-108 0,-54 -5,-90 -14,-102 -13,-18 -16,-17 -60,19 l -46,38 v -30 c 0,-34 -22,-52 -60,-52 -14,0 -20,-5 -17,-12 29,-80 31,-88 19,-100 -9,-9 -23,-9 -60,1 -80,23 -101,24 -128,6 -39,-26 -64,-93 -71,-193 l -6,-87 22,27 c 27,33 51,41 84,29 23,-9 28,-7 39,17 7,14 25,31 40,36 23,8 33,6 58,-12 29,-22 30,-22 30,-3 0,34 49,64 95,58 22,-3 48,-8 58,-12 12,-5 17,-2 17,8 0,33 24,67 55,79 31,10 32,14 28,49 -5,33 -1,42 28,71 25,26 32,40 30,64 -2,33 29,74 56,74 10,0 11,5 3,19 -24,46 -5,119 36,142 13,7 24,16 24,21 0,13 -89,8 -145,-7 z" id="path3" /> <path d="m 1649,5452 c -8,-12 -21,-22 -31,-22 -21,0 -32,-16 -18,-25 7,-4 8,-19 5,-37 -6,-28 -6,-29 13,-17 18,11 24,10 40,-4 25,-23 32,-21 32,7 0,13 8,27 17,31 16,6 16,8 -4,23 -12,9 -26,28 -31,42 l -9,24 z" id="path4" style="fill:none;fill-opacity:1;stroke:#b1b200;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 3141,5421 c -7,-12 -25,-24 -42,-28 -32,-6 -36,-15 -14,-33 8,-7 15,-25 15,-41 0,-31 9,-36 27,-18 6,6 22,9 35,6 37,-10 43,-8 43,12 0,11 9,29 19,40 19,21 19,21 0,21 -10,0 -31,14 -45,32 l -26,32 z" id="path5" style="fill:none;fill-opacity:1;stroke:#b1b200;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 4276,5335 c -7,-19 31,-342 99,-853 25,-183 45,-361 45,-395 0,-59 -25,-164 -184,-767 -46,-175 -47,-197 -2,-215 51,-22 240,-75 264,-75 33,0 48,36 61,140 39,317 123,829 142,869 11,25 71,130 134,235 407,687 406,686 396,704 -14,26 -227,135 -250,127 -13,-4 -64,-107 -170,-343 -84,-186 -156,-344 -160,-351 -5,-8 -14,-10 -21,-6 -10,6 -11,100 -5,424 6,348 5,419 -7,434 -17,23 -189,75 -274,83 -52,6 -62,4 -68,-11 z" id="path6" style="fill:none;fill-opacity:1;stroke:#ff8600;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 1246,5248 c -91.1559,-624.1277 -197.4835,-1392.8204 -299.67226,-2015.2439 92.99856,-42.7877 132.59846,-57.5379 243.34716,-65.4083 33.9246,109.1644 114.4275,698.2502 145.6313,764.0523 135.1844,-17.904 230.0798,-33.3727 265.2422,-59.5329 -63.7953,-228.993 -79.614,-563.2771 -112.2238,-797.6161 107.5637,-34.3766 156.6257,-18.1585 270.2662,-35.5934 24.2169,312.7305 119.6754,746.1084 163.8443,1056.2995 45.4047,267.143 141.8369,732.452 176.2425,1001.2965 -77.0198,16.5865 -91.7787,24.3349 -300.5152,58.5798 -39.3018,-214.0154 -47.7377,-413.2282 -131.6841,-861.9078 -64.5316,9.0968 -173.8946,16.7413 -263.437,48.7749 32.2874,280.1097 75.3472,586.9445 128.6564,863.3131 C 1460.1731,5219.4679 1328.5793,5240.4706 1246,5248 Z" id="path12" style="fill:none;fill-opacity:1;stroke:#9a00ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" sodipodi:nodetypes="cccccccccccccc" /> <path d="m 5230,5210 c 0,-11 -7,-23 -15,-26 -14,-6 -13,-8 1,-19 10,-7 15,-19 11,-29 -4,-10 -1,-16 8,-16 8,0 15,5 15,11 0,7 10,9 25,5 23,-6 25,-4 19,18 -3,13 -1,27 5,31 6,3 9,11 5,16 -4,6 -11,6 -19,-1 -10,-9 -19,-6 -34,9 -21,21 -21,21 -21,1 z" id="path14" style="fill:none;fill-opacity:1;stroke:#aeae00;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="M 2776.2223,3551.1633 C 2689.7004,4048.4934 2662.6439,4555.1572 2574,5052 c -5,18 -17,21 -147,38 -93,12 -89,12 -105,1 -14,-8 -39,-115 -237,-1001 -69,-311 -140,-627 -157,-702 -17,-76 -28,-145 -24,-153 8,-23 60,-41 154,-56 72,-11 85,-11 98,3 10,9 31,105 60,267 24,139 49,262 55,273 10,19 123.8433,5.8877 198.8433,-0.1123 25.5175,-90.7058 29.1391,-142.8527 37.1391,-235.8527 M 2440,4459 c 21,-188 39,-444 32,-451 -10,-10 -141,7 -154,20 -7,7 62,472 78,526 12,38 34,-9 44,-95 z" id="path16" style="fill:none;fill-opacity:1;stroke:#ff8b00;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" sodipodi:nodetypes="ccccccccccccccsscc" /> <path d="m 3756.0269,3532.4793 c -2.4232,144.0937 1.3819,388.4268 -1.0269,532.5207 118.7847,7.328 252.8929,14.4289 340.9592,105.8336 118.1934,112.0754 134.5311,285.2665 131.5752,439.2718 -2.4954,146.0809 -47.8204,307.0679 -174.7926,393.097 -116.3821,78.7797 -265.9374,83.7604 -400.7418,65.7976 -74.4112,19.6275 -119.8875,-57.8858 -106.3359,-122.9458 -12.5196,-264.0817 -6.6967,-528.5955 -12.8613,-792.848 -1.9302,-160.6404 -18.3049,-421.1573 -26.7436,-581.6115 M 3894,4836 c 83.694,-37.1183 100.5718,-139.2699 102.4102,-221.0466 0.9007,-95.701 2.9347,-206.128 -66.6601,-280.7161 -42.0736,-40.5151 -117.6648,-51.7007 -166.6648,-31.3644 -14.0985,172.1654 -16.4865,345.5347 -5.5786,518.0645 19.5657,53.274 97.2324,22.4113 136.4933,15.0626 z" id="path17" style="fill:none;fill-opacity:1;stroke:#8800ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" sodipodi:nodetypes="ccccccccccccccc" /> <path d="m 3053.459,3845.2057 c 5.3739,37.9356 -37.5515,219.7238 28.1638,204.8239 91.9656,4.6795 192.4732,18.469 259.3696,88.6118 101.955,90.5902 127.599,233.2754 128.0486,363.4433 -0.9964,128.4309 -26.7812,267.2652 -119.9083,362.4173 -58.3346,65.4074 -144.1366,104.7404 -232.2475,100.2167 -66.9483,2.724 -134.1263,2.5039 -200.8852,-3.7187 -72.0785,5.8336 -78.6038,-81.3441 -73.3922,-133.5078 -5.1269,-360.2797 -1.0237,-720.6864 -13.0661,-1080.8587 -0.8472,-34.8778 -6.3595,-136.1412 -7.2067,-171.019 M 3180,4742 c 61.2639,-54.6456 82.0526,-140.413 74.8167,-219.7572 1.5749,-88.3777 -2.8876,-193.4019 -80.5421,-251.2787 -35.0923,-18.2633 -112.3439,-30.1346 -130.5947,-1.7524 -13.3079,155.0776 -15.8388,311.4548 -9.8118,466.7215 26.693,53.1843 102.9783,28.6617 144.8158,6.8935 z" id="path19" style="fill:none;fill-opacity:1;stroke:#8d00ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" sodipodi:nodetypes="ccccccccccccccccc" /> <path style="fill:none;fill-opacity:1;stroke:#8600ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 5658,3905 c 22,-48 16,-53 -97,-84 l -71,-20 v 47 c 0,44 2,47 28,49 15,1 45,8 67,16 56,21 60,20 73,-8 z" id="path360" /> <path style="fill:none;fill-opacity:1;stroke:#8600ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 5460,3915 c 17,-10 12,-131 -5,-145 -20,-16 -145,-6 -157,12 -12,18 -2,116 14,135 10,12 26,14 76,10 34,-4 67,-9 72,-12 z" id="path359" /> <path style="fill:none;fill-opacity:1;stroke:#8600ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 5265,3900 c 3,0 5,-20 5,-44 v -44 l -44,13 c -37,11 -82,30 -94,40 -1,1 5,18 13,38 l 15,37 50,-20 c 28,-11 53,-20 55,-20 z" id="path358" /> <path style="fill:none;fill-opacity:1;stroke:#8200ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 5493,4593 c -88,-138 -200,-344 -269,-494 l -67,-147 -86,-22 c -184,-48 -233,-103 -156,-176 99,-93 419,-147 684,-114 161,21 298,81 313,138 14,51 -44,98 -171,140 l -80,27 -55,109 c -31,61 -56,111 -56,113 0,2 17,1 38,-3 l 37,-6 -3,181 c -4,209 -17,191 121,162 48,-10 87,-14 87,-10 0,15 -261,179 -284,179 -2,0 -26,-35 -53,-77 z" id="path21" /> <path style="fill:none;fill-opacity:1;stroke:#8600ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 5420,3845 c 0,-33 -2,-35 -35,-35 -33,0 -35,2 -35,35 0,33 2,35 35,35 33,0 35,-2 35,-35 z" id="path361" /> <path style="fill:none;fill-opacity:1;stroke:#8600ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 5337,3904 c -4,-4 -7,-31 -7,-61 v -53 h 55 55 v 49 c 0,28 -3,52 -7,54 -16,10 -89,18 -96,11 z" id="path23" /> <path style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 901,4621 c -11,-11 -23,-40 -26,-65 -10,-66 -28,-76 -48,-25 -16,40 -17,40 -39,25 -12,-9 -35,-16 -51,-16 -28,0 -29,-1 -25,-45 3,-41 1,-45 -20,-45 -22,0 -36,12 -81,70 -40,52 -123,20 -198,-79 -42,-54 -42,-64 1,-56 37,7 76,-8 76,-29 0,-10 13,-12 49,-8 42,4 50,1 64,-19 14,-19 17,-20 22,-7 15,38 76,23 90,-22 6,-20 6,-20 33,0 22,16 33,18 59,11 31,-9 34,-8 49,26 17,34 56,59 75,47 5,-3 9,6 9,20 0,31 32,66 61,66 20,0 21,7 2,56 -7,19 36,61 69,69 l 33,7 -40,19 c -55,25 -139,25 -164,0 z" id="path26" /> <path d="m 4941,4206 c -8,-9 -20,-16 -28,-16 -11,0 -13,-5 -7,-17 4,-10 7,-30 7,-45 0,-31 8,-35 27,-13 9,11 16,13 24,5 16,-16 26,-12 26,11 0,11 5,30 11,41 9,16 8,19 -1,13 -8,-5 -19,1 -30,14 -15,20 -18,21 -29,7 z" id="path29" style="fill:none;fill-opacity:1;stroke:#aeae00;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 4073,3952 c -2,-25 2,-29 26,-29 24,0 28,4 28,29 0,23 -4,28 -26,28 -21,0 -26,-5 -28,-28 z" id="path33" style="fill:none;fill-opacity:1;stroke:#ff8800;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 4101.6509,3643.3568 c -12,30 -21.6028,71.4463 -30.9138,96.1491 -8.0472,-18.8459 -31.0411,-73.8123 -36.3711,-93.316 -43.6432,-7.4171 -52.9868,-6.6377 -85.9436,-16.0009 34.8141,-14.9032 63.448,-44.3444 63.448,-44.3444 -13.1318,-21.0186 -29.2787,-64.6142 -35.7695,-91.1233 40.7082,24.3535 54.0389,30.7833 85.8525,59.9124 l 60.7033,-54.0538 c -5.6411,28.9411 -0.8097,57.6599 -1.992,85.059 29.5691,13.9971 94.3016,32.4942 76.6162,38.7598 -49.0653,17.3828 -81.3521,10.7302 -95.63,18.9581 z" id="path36" style="fill:none;fill-opacity:1;stroke:#b1b200;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" sodipodi:nodetypes="ccccsccccsc" /> <path d="m 4831,3506 c -12,-14 -5,-26 16,-26 15,0 18,26 4,34 -5,3 -14,0 -20,-8 z" id="path38" style="fill:none;fill-opacity:1;stroke:#ff8800;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 5080,3496 c -46,-12 -120,-52 -120,-64 0,-4 16,-7 35,-8 49,-1 78,-30 72,-71 -5,-30 -3,-33 19,-33 28,0 64,-32 64,-58 0,-14 7,-17 40,-14 41,4 44,1 64,-61 5,-15 9,-16 28,-6 20,11 25,8 50,-22 l 28,-33 28,27 c 29,28 61,36 98,24 16,-6 23,-1 35,25 11,26 21,34 47,36 18,2 40,-2 48,-9 11,-9 14,-8 14,8 0,70 46,113 120,113 22,0 40,4 40,9 0,14 -76,79 -119,101 -74,37 -119,23 -157,-52 -40,-80 -74,-91 -74,-23 0,49 -1,51 -30,33 -16,-10 -24,-10 -40,0 -26,16 -32,12 -55,-37 -15,-34 -21,-39 -36,-31 -10,6 -21,27 -24,48 -18,107 -59,130 -175,98 z" id="path39" /> <path style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 4832,3113 c -9,-3 -3,-12 18,-25 25,-15 31,-24 26,-41 -4,-17 0,-25 17,-32 12,-6 22,-19 22,-30 0,-11 8,-23 18,-28 11,-4 21,-15 24,-25 3,-14 11,-18 28,-15 12,3 29,-2 36,-10 11,-11 19,-12 37,-4 20,9 27,8 36,-5 12,-16 14,-16 29,-1 16,16 19,15 47,-5 30,-22 30,-22 30,-2 0,29 -24,82 -44,99 -15,12 -22,12 -51,-2 -39,-19 -39,-19 -25,19 9,24 8,26 -10,21 -11,-3 -27,2 -36,10 -13,14 -17,13 -35,-3 -17,-16 -22,-16 -29,-4 -6,8 -10,27 -10,42 0,17 -8,31 -19,38 -20,10 -86,12 -109,3 z" id="path40" /> <path d="m 1883,3012 c -6,-4 -19,-25 -28,-47 -9,-23 -30,-49 -48,-60 -46,-29 -45,-49 2,-79 28,-18 43,-36 49,-58 11,-42 36,-47 71,-14 21,20 36,25 66,23 39,-2 40,-1 37,28 -5,50 -4,88 3,123 l 7,32 h -43 c -34,0 -49,6 -74,30 -17,16 -35,26 -42,22 z m 35,-72 c 8,-14 23,-20 47,-20 33,0 35,-1 24,-21 -6,-12 -8,-34 -5,-50 5,-26 3,-29 -21,-29 -15,0 -37,-9 -49,-21 l -22,-21 -7,32 c -5,23 -15,35 -36,42 l -29,10 35,33 c 19,18 35,40 35,49 0,22 13,20 28,-4 z" id="path41" style="fill:none;fill-opacity:1;stroke:#b1b200;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 573,2985 c -28,-20 -31,-25 -18,-35 8,-7 15,-24 15,-38 0,-23 1,-24 18,-9 11,10 26,14 40,10 21,-5 22,-3 16,21 -4,16 -1,32 6,41 10,12 9,15 -7,15 -10,0 -23,4 -28,9 -6,5 -24,-1 -42,-14 z" id="path42" style="fill:none;fill-opacity:1;stroke:#b1b200;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 1005.8456,2915.4734 c 0,-16 5,-20 23,-17 12,1 22,9 22,17 0,8 -10,15 -22,17 -18,3 -23,-2 -23,-17 z" id="path49" style="fill:none;fill-opacity:1;stroke:#ff8800;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 4348,2820 c -16,-23 -30,-30 -55,-30 -36,0 -42,-13 -18,-47 8,-12 14,-38 12,-59 l -2,-39 45,-2 c 25,-1 56,-3 70,-5 20,-2 27,3 35,29 6,17 18,40 28,51 24,26 21,40 -9,54 -14,7 -32,27 -39,45 -17,41 -38,42 -67,3 z" id="path50" style="fill:none;fill-opacity:1;stroke:#b1b200;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" sodipodi:nodetypes="cscccccccccc" /> <path d="m 1134,2768 c -4,-7 -10,-174 -12,-373 -3,-239 -8,-365 -15,-374 -13,-16 -131,-11 -148,6 -8,8 -8,97 1,323 9,241 9,314 0,326 -14,16 -155,20 -178,5 -11,-6 -13,-117 -11,-577 1,-313 4,-627 8,-699 l 6,-130 55,-6 c 30,-3 62,-2 70,2 12,6 17,53 25,266 l 10,258 68,3 c 42,2 74,-2 83,-9 11,-9 14,-63 14,-294 v -283 l 43,-4 c 74,-7 100,3 109,42 4,19 14,222 23,450 41,1095 40,1047 26,1064 -17,20 -165,23 -177,4 z" id="path55" style="fill:none;fill-opacity:1;stroke:#ff8900;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 5315,2676 c -17,-13 -18,-31 -12,-430 4,-268 3,-416 -3,-416 -6,0 -10,1 -10,3 0,2 -16,73 -35,158 -20,85 -58,264 -86,399 -27,134 -55,248 -62,252 -13,9 -118,1 -128,-10 -4,-4 -8,-326 -10,-717 l -4,-710 69,-3 c 38,-2 73,1 78,6 11,11 12,573 2,717 -4,50 -3,87 2,82 11,-10 52,-179 124,-512 34,-154 64,-290 67,-302 4,-20 12,-23 58,-23 32,0 57,5 64,13 7,10 14,240 21,748 11,828 17,759 -70,759 -25,0 -55,-6 -65,-14 z" id="path60" style="fill:none;fill-opacity:1;stroke:#8a00ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 1946,2588 c -6,-20 -31,-1019 -31,-1238 v -195 l 167,-3 c 194,-3 191,-4 186,96 l -3,57 -93,3 c -64,2 -94,7 -98,16 -3,7 5,291 16,630 16,468 18,622 9,632 -15,19 -148,20 -153,2 z" id="path65" style="fill:none;fill-opacity:1;stroke:#ff8500;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 1513,2493 c -13,-2 -23,-9 -23,-14 0,-51 -110,-946 -151,-1223 -7,-48 -6,-72 1,-81 13,-16 105,-39 124,-32 9,4 19,51 31,144 10,76 22,146 27,156 6,13 21,17 58,17 78,0 84,-10 104,-190 10,-85 21,-161 24,-168 4,-11 19,-13 65,-9 32,3 63,9 68,14 11,11 -7,155 -91,748 -33,231 -66,467 -74,523 -8,57 -16,105 -18,107 -6,7 -123,13 -145,8 z m 77,-395 c 1,-13 11,-117 24,-233 14,-115 22,-213 20,-217 -7,-11 -78,-10 -90,2 -6,6 -6,59 2,152 7,79 15,182 19,231 4,48 11,87 16,87 5,0 9,-10 9,-22 z" id="path68" style="fill:none;fill-opacity:1;stroke:#9300ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 4146,2463 c -17.2837,-179.8794 -21.5771,-360.8669 -31.1509,-541.3123 -10.7792,-252.0559 -21.7396,-504.1581 -34.6108,-756.0842 2.9701,-55.9408 79.4508,-35.6305 118.5025,-44.5431 81.2263,-2.903 163.4824,-10.3394 244.2592,-0.06 29.5128,41.1601 15.0505,101.5773 13.7285,150.3157 -22.8789,45.7763 -88.0467,22.2883 -129.487,28.6843 -25.7471,0 -51.4943,0 -77.2415,0 6.3905,141.7761 15.111,283.429 25,425 51.2686,-0.9737 103.7428,-9.0102 154,4 22.7736,37.6365 20.1022,85.959 18.4219,128.8125 -0.7743,53.2321 -70.2711,37.6908 -106.0527,44.5327 -22.1231,0.885 -44.2461,1.7699 -66.3692,2.6548 2.5804,128.4567 9.6713,256.7399 17,385 57.1402,2.0771 115.749,-5.9794 171.5742,8.7012 50.2483,23.7515 33.6609,90.5271 35.2417,135.3662 -2.1545,58.7893 -76.0169,38.1672 -115.449,44.8218 -73.6633,0.4584 -147.9196,4.64 -221.195,-3.9185 -6.5626,-1.2165 -14.3749,-4.7733 -16.1719,-11.9707 z" id="path69" style="fill:none;fill-opacity:1;stroke:#ff8500;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 4755,2430 c -64.3247,-13.9345 -132.2844,-0.6246 -195.5404,-19.035 -31.9502,-33.8443 -8.9734,-88.1225 -16.9511,-130.2472 -1.8619,-373.2255 5.8577,-746.5409 10.9327,-1119.6139 -15.4607,-54.8152 39.4728,-77.7183 83.0821,-56.4375 78.4207,26.5854 163.9531,1.5575 241.7998,29.4923 27.8749,34.1577 29.2462,111.1111 7.1165,145.9135 -61.8116,3.0734 -123.6263,-1.6423 -185.4396,-2.0722 0,147 0,294 0,441 48.8442,8.1516 122.002,-7.9704 155.3715,15.6876 -6.5558,43.9332 20.6383,120.3015 -5.5518,145.3124 -49.9399,0 -99.8798,0 -149.8197,0 -1.3846,84.2573 6.249,170.0804 -14.5671,252.4692 5.7657,43.2348 -17.5525,120.0653 45.1039,126.6907 48.2477,12.5597 123.2223,-13.6651 147.5968,43.73 1.3752,41.437 4.7865,102.4565 -10.6508,132.4358 -37.5449,1.4694 -75.3059,0.4425 -112.4828,-5.3257 z" id="path70" style="fill:none;fill-opacity:1;stroke:#ff8500;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 3982,2386 c -32.2317,-26.7348 -69.852,-45.6782 -110,-57 -18.0427,-247.827 -14.1675,-496.6435 -27.9141,-744.6445 3.2321,-29.9275 -16.0832,-49.0811 -22.1484,-9.9493 -30.0699,105.62 -50.2536,213.9962 -83.9375,318.5938 -38.1595,30.599 -124.1853,26.6576 -129.875,-35.0312 -33.5267,-101.6917 -52.1453,-207.4266 -70.8281,-312.5 -24.3291,-61.8435 -17.1954,49.2844 -22.2803,68.6909 -15.2888,166.7684 -26.2372,333.8799 -36.7314,500.977 -7.4903,65.4979 -104.7835,43.5959 -143.4825,14.4649 -60.1188,-20.6253 -20.5605,-87.8318 -21.7129,-132.4434 46.4854,-301.6901 72.203,-605.9907 109.0733,-908.8716 -6.3101,-71.9304 85.2423,-47.8731 130.8994,-57.7554 65.4455,-8.8033 41.0805,81.8577 57.5178,121.3001 21.6643,138.6404 39.9854,277.8108 63.4197,416.1687 51.1085,-168.7859 83.3688,-343.0946 138,-511 44.8371,6.4497 93.3248,2.8341 134,25 20.9876,74.3504 19.7099,153.5786 27.9574,230.2672 22.0935,337.0091 52.5668,673.3948 76.8165,1010.2327 7.0271,39.0902 7.5875,129.4972 -50.7114,76.6407 l -9.0078,-6.2715 z" id="path71" style="fill:none;fill-opacity:1;stroke:#8a00ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 2345,2257 c -3,-18 -6,-282 -7,-587 l -3,-555 40,-4 c 41,-3 295,16 328,26 15,4 17,15 15,81 l -3,77 -114,-4 -114,-4 7,324 c 3,178 9,389 12,469 3,80 1,150 -3,156 -4,6 -40,21 -80,32 l -72,20 z" id="path73" style="fill:none;fill-opacity:1;stroke:#ff8500;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 2849,2128 c -45,-41 -82,-113 -111,-215 -20,-68 -23,-101 -23,-258 0,-158 3,-190 23,-260 28,-95 58,-151 108,-194 47,-42 75,-52 144,-52 101,-1 178,49 227,145 37,73 52,129 65,253 36.4625,348.2169 -99.3443,601.0536 -143.1068,603.5854 -55.8321,3.2301 -90.2692,4.1842 -179.4186,40.8971 C 2949.4746,2195.4825 2872,2149 2849,2128 Z m 188,-140 c 32,-36 44,-65 59,-147 25,-144 11,-410 -26,-482 -21,-41 -52,-69 -76,-69 -101,0 -151,389 -80,625 27,89 80,120 123,73 z" id="path75" style="fill:none;fill-opacity:1;stroke:#8a00ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" sodipodi:nodetypes="ccscccccscccccscc" /> <path d="m 599,2143 c -11,-3 -15,-11 -11,-28 6,-32 55,-31 57,2 2,22 -16,32 -46,26 z" id="path76" style="fill:none;fill-opacity:1;stroke:#ff8800;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 3675,2091 c -3,-6 -14,-11 -24,-11 -12,0 -17,-8 -16,-27 0,-27 18,-42 29,-24 4,6 13,8 20,5 10,-4 13,3 12,25 -1,33 -11,48 -21,32 z" id="path77" style="fill:none;fill-opacity:1;stroke:#ff8800;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path d="m 3244.0558,1044.0539 c 33.4476,-2.2203 39.886,-37.4882 28.1853,-61.60235 14.9668,20.12625 40.8377,43.27935 73.5582,0.60485 -19.5178,50.9156 4.8919,61.8853 5.8648,73.0953 -35.6277,-5.2598 -36.4116,-3.2289 -54.4173,30.8501 -7.3639,-33.0112 -0.5306,-41.5885 -53.191,-42.9479 z" id="path84" style="fill:none;fill-opacity:1;stroke:#b1b200;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" sodipodi:nodetypes="cccccc" /> <path d="m 2957,959 c -9,-17 -26,-33 -37,-36 -25,-7 -26,-19 -3,-32 12,-6 17,-20 15,-42 l -3,-33 24,22 c 20,19 28,20 57,12 49,-14 51,-13 39,16 -7,21 -6,31 6,44 22,24 19,30 -14,30 -20,0 -35,8 -48,25 l -18,25 z" id="path90" style="fill:none;fill-opacity:1;stroke:#b1b200;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" /> <path style="fill:none;fill-opacity:1;stroke:#ff8400;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 2218.9992,5213.9148 c 149.2808,141.7828 269.7119,134.4397 360.1198,-28.0959" id="path98" sodipodi:nodetypes="cc" /> <path style="fill:none;fill-opacity:1;stroke:#ff8700;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 3083.2583,5129.5564 c 452.8578,14.0547 660.6366,266.9091 1022.3231,104.8998" id="path99" sodipodi:nodetypes="cc" /> <path style="fill:none;fill-opacity:1;stroke:#ff8400;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 919.44803,4050.1092 c -90.84064,8.2241 -168.97126,-5.4475 -152.47523,-182.1338" id="path100" sodipodi:nodetypes="cc" /> <path style="fill:none;fill-opacity:1;stroke:#8600ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="M 776.24505,3690.0186 C 655.89999,3547.409 706.56665,3412.8419 829.25483,3281.6619" id="path101" sodipodi:nodetypes="cc" /> <path style="fill:none;fill-opacity:1;stroke:#ff8600;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 4513.3218,2868.6952 c 0,0 316.614,50.8265 344.4799,-282.1322" id="path102" /> <path style="fill:none;fill-opacity:1;stroke:#ff8800;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 5313.5709,2829.3527 c 372.4532,258.5954 399.8468,-329.2749 258.1216,-410.5493" id="path103" sodipodi:nodetypes="cc" /> <path style="fill:none;fill-opacity:1;stroke:#ff8800;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 5602.1966,2242.4727 c 62.8784,0.3026 73.6644,-80.605 0.03,-82.2138 -65.8586,-0.9105 -58.2632,82.4591 -0.03,82.2138 z" id="path104" sodipodi:nodetypes="ccc" /> <path style="fill:none;fill-opacity:1;stroke:#ff8500;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="M 2995.2188,3561.3736 C 2972.2448,3579.931 2868.8793,3609.0205 2759,3541 c -39,-24 -59,-29 -132,-33 -114,-6 -191,-43 -273,-131 -116,-123 -172,-277 -181,-493 -7,-156 9,-246 63,-354 58,-114 167,-209 243,-210 14,0 45,-20 78,-50 84,-77 200,-101 289,-61 l 41,19 61,-30 c 128,-63 312,-58 424,11 49,31 50,31 81,14 22,-12 55,-18 107,-18 109,1 179,40 249,142 14,21 35,36 61,43 91,24 180,127 228,262 31,88 42,274 23,384 -38,218 -154,402 -297,469 -48,23 -77,29 -154,33 -72,3 -96.9055,14.2801 -123.436,7.0244 -132.056,94.4009 -215.5552,77.709 -236.2517,67.7266" id="path356" inkscape:label="pumpkinOuter" /> <path style="fill:none;fill-opacity:1;stroke:#935211;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 3400.5994,3456.768 -94.4793,160.3691 C 3298.3528,3625.7746 3283,3673 3275,3705 c -25,94 -42,122 -86,139 -47,19 -81,20 -132,2 -46,-17 -64,-32 -83,-67 -18,-35 -19,-30 16,-74 22,-28 30,-48 30,-79 0,-26.5129 2.4695,-35.9677 -5.9454,-45.2691 l -121.4178,-123.5051" id="path348" inkscape:label="pumpkinStem" transform="translate(-2.5e-6,-2.5e-5)" /> <path style="fill:none;fill-opacity:1;stroke:#ff8300;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 3082.9907,2742.2343 84.56,137.457 66.5325,-141.0647 z" id="path376" sodipodi:nodetypes="cccc" /> <path id="path320" style="fill:none;fill-opacity:1;stroke:#ff8500;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 3404.4623,2227.8421 c 69.776,46.47 96.1351,99.1345 115.1518,161.7858 m -627.3987,-162.9508 c -65.5951,46.0791 -97.5861,88.9253 -106.7476,181.878 m 36.491,1046.0257 c -1.5673,57.4973 -61.9932,70.4824 -158.9174,55.8654 m 336.5783,-150.5167 c -8.5273,86.5664 -125.1059,124.9143 -205.8367,84.8334 -292.2262,-136.8025 -475.2419,-635.1581 -303.7014,-1127.6051 m 833.9377,1014.2184 c -37.7113,126.4765 134.2789,149.4361 172.7798,121.7875 517.7925,-218.8259 379.7191,-1003.7761 335.3677,-1078.6026 m -948.2569,706.5882 c 36.4356,126.38 59.677,204.2368 138.9686,305.4038 49.3295,66.1449 209.7506,62.7945 257.3403,-0.6217 101.4252,-121.6486 134.8536,-199.608 155.2779,-324.518 m 68.0621,389.2529 c -7.9028,57.9063 -0.5555,104.4889 100.0668,93.7887" sodipodi:nodetypes="cccccccccccccccccc" /> <path style="fill:none;fill-opacity:1;stroke:#ff8300;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 2839.1696,3177.3598 139.6486,-314.6977 c -38.824,11.723 -110.2964,44.5446 -169.3888,68.0862 -51.8194,-9.0267 -120.9906,-19.2333 -173.1594,-22.2315 z" id="path369" sodipodi:nodetypes="ccccc" transform="translate(-2.5e-6,-2.5e-5)" /> <path style="fill:none;fill-opacity:1;stroke:#ff8300;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 3369.1041,2855.8819 109.8814,329.1509 218.8611,-275.1048 c -43.5519,3.7371 -115.5974,14.5122 -178.2396,21.9527 -50.1736,-29.3582 -101.8658,-54.8107 -150.5029,-75.9988 z" transform="translate(-2.5e-6,-2.5e-5)" id="path368" sodipodi:nodetypes="ccccc" /> <path style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="M 5335.1419,4939.7464 C 5404.3053,4595.4092 5230.441,4449.5093 5113.521,4373.8087" id="path321" sodipodi:nodetypes="cc" /> <path style="fill:none;fill-opacity:1;stroke:#ff8900;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 1793.9988,2439.5036 c 64.4305,353.1036 -395.0948,437.2973 -367.3636,181.3204 4.9107,-85.6286 106.3856,-89.9645 90.55,-23.6082" id="path322" sodipodi:nodetypes="ccc" /> <path style="fill:none;fill-opacity:1;stroke:#8f00ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="M 666.67452,1640.3425 C 552.71679,1515.7823 589.2831,1409.0864 630.90521,1302.9904" id="path323" sodipodi:nodetypes="cc" /> <path style="fill:none;fill-opacity:1;stroke:#8f00ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 903.0786,1134.9294 c 128.8027,-145.40855 297.8783,-158.36908 493.0505,-85.5047" id="path324" sodipodi:nodetypes="cc" /> <path style="fill:none;fill-opacity:1;stroke:#8600ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 5252.2436,862.8647 c 111.4522,2.55001 183.8654,40.93655 192.8055,137.5894" id="path325" sodipodi:nodetypes="cc" /> <path style="fill:none;fill-opacity:1;stroke:#ff8600;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="M 704.1503,1210.0886 C 714.11251,995.10468 779.50373,898.85537 923.26289,857.72749 1462.3218,745.82032 1948.5756,1159.894 2152.9823,938.92655" id="path326" sodipodi:nodetypes="ccc" /> <path style="fill:none;fill-opacity:1;stroke:#8f00ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="M 2854.2517,970.49518 C 2820.5318,908.18954 2764.5708,863.89883 2664.593,855.26112" id="path327" sodipodi:nodetypes="cc" /> <path style="fill:none;fill-opacity:1;stroke:#8f00ff;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 2702.0336,982.32297 c -55.9308,-16.11849 -93.5313,-47.43985 -238.3445,10.15906" id="path328" sodipodi:nodetypes="cc" /> <path style="fill:none;fill-opacity:1;stroke:#ff8400;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="M 3171.0156,886.56005 C 3783.8427,753.26641 4328.7579,1112.6642 4558.308,880.32643" id="path329" sodipodi:nodetypes="cc" /> <path d="m 2870.6824,5232.9078 c -12,30 -21.6028,71.4463 -30.9138,96.1491 -8.0472,-18.8459 -31.0411,-73.8123 -36.3711,-93.316 -43.6432,-7.4171 -52.9868,-6.6377 -85.9436,-16.0009 34.8141,-14.9032 63.448,-44.3444 63.448,-44.3444 -13.1318,-21.0186 -29.2787,-64.6142 -35.7695,-91.1233 40.7082,24.3535 54.0389,30.7833 85.8525,59.9124 l 60.7033,-54.0538 c -5.6411,28.9411 -0.8097,57.6599 -1.992,85.059 29.5691,13.9971 94.3016,32.4942 76.6162,38.7598 -49.0653,17.3828 -81.3521,10.7302 -95.63,18.9581 z" id="path36-3" style="fill:none;fill-opacity:1;stroke:#b1b200;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" sodipodi:nodetypes="ccccsccccsc" /> <path style="fill:none;fill-opacity:1;stroke:#ff7e00;stroke-width:30;stroke-dasharray:none;stroke-opacity:1" d="m 2568.7242,2829.1126 c 75.4448,-80.5155 151.247,-160.0654 246.8717,-186.0746 l 18.4028,-88.2517 128.6832,-60.1672 5.1635,102.2938 370.2392,-13.9215 13.1711,-78.8535 140.2801,46.1776 6.5594,96.7473 c 111.792,43.7533 208.4004,107.2881 291.3122,188.6669 -89.8409,-447.9731 -328.242,-500.1386 -569.4954,-528.5654 l -7.5458,100.09 -140.8731,5.7774 -2.2617,-101.1551 c -211.4492,31.0746 -416.7447,81.6442 -500.5072,517.236 z" id="path331" /> </g> </svg>`);

    const happyHalloweenHorizontal = parseSvg(`<?xml version="1.0" encoding="UTF-8" standalone="no"?> <svg version="1.0" width="512.70239pt" height="162.83287pt" viewBox="0 0 512.70239 162.83287" preserveAspectRatio="xMidYMid" id="svg12" sodipodi:docname="outline2.svg" inkscape:version="1.3.2 (091e20ef0f, 2023-11-25, custom)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"> <defs id="defs12" /> <sodipodi:namedview id="namedview12" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" inkscape:document-units="pt" inkscape:zoom="1.9186036" inkscape:cx="479.25481" inkscape:cy="171.21828" inkscape:window-width="2560" inkscape:window-height="1371" inkscape:window-x="0" inkscape:window-y="0" inkscape:window-maximized="1" inkscape:current-layer="g12" /> <metadata id="metadata1"> Created by potrace 1.16, written by Peter Selinger 2001-2019 </metadata> <g transform="matrix(0.1,0,0,-0.1,-19.797601,176.5)" fill="none" stroke="#000000" stroke-width="30px" id="g12"> <path d="m 3578,677 c 96,-35 138,-145 61,-161 -113,-22 -176,5 -235,99 -14,23 -7,19 28,-17 50,-50 82,-62 158,-56 43,3 45,4 43,32 -3,41 -34,70 -67,62 -17,-4 -23,-11 -20,-21 4,-8 3,-15 0,-15 -8,0 -36,63 -36,80 0,13 26,12 68,-3 z" id="path28" style="stroke:#ff7c00;stroke-opacity:1" /> <path d="m 3803,1169 c 29,-12 75,-19 117,-20 65,-1 70,-3 70,-23 0,-27 -19,-96 -26,-96 -3,0 -18,9 -33,19 -61,44 -181,52 -222,15 -19,-17 -24,-49 -13,-79 10,-25 89,-55 146,-55 42,0 49,-3 44,-16 -3,-9 -6,-20 -6,-25 0,-6 -4,-7 -10,-4 -5,3 -7,0 -5,-8 3,-7 -3,-21 -14,-31 -15,-14 -24,-15 -38,-7 -15,9 -16,10 -2,11 27,0 30,28 6,45 -26,18 -122,20 -157,2 -34,-17 -53,-58 -41,-89 11,-30 55,-60 101,-69 32,-6 30,-7 -17,-8 -65,-1 -69,-16 -8,-24 52,-8 139,7 172,28 13,9 23,11 23,6 0,-5 -4,-13 -10,-16 -5,-3 -12,-27 -16,-53 l -6,-47 -61,-2 c -57,-3 -62,-1 -102,36 -50,46 -90,68 -142,79 -36,8 -38,10 -35,43 1,19 10,56 18,83 12,36 19,45 26,35 7,-10 8,-8 3,8 -7,27 26,96 103,211 42,63 59,81 71,76 9,-4 37,-15 64,-25 z" id="path27" style="stroke:#ff7c00;stroke-opacity:1" /> <path d="m 2052,1336 c 25,-8 49,-12 52,-9 3,4 6,2 6,-3 0,-5 35,-8 79,-8 l 79,2 -28,-78 c -34,-92 -57,-205 -66,-326 -11,-146 24,-222 63,-139 9,19 20,35 23,35 4,0 12,-18 19,-40 6,-22 31,-68 55,-103 l 43,-63 -51,16 c -127,42 -159,37 -236,-37 -51,-49 -144,-93 -197,-93 -51,0 -123,33 -123,57 0,9 17,33 39,53 40,39 100,60 166,60 33,0 36,-2 30,-22 -7,-26 -50,-68 -68,-68 -6,0 -1,7 11,16 32,22 28,44 -9,44 -39,0 -90,-24 -120,-56 -22,-24 -22,-24 -3,-39 12,-9 42,-14 79,-15 75,0 140,35 209,111 72,80 76,102 7,34 -33,-33 -61,-57 -61,-54 0,3 7,19 15,36 25,50 36,131 36,278 1,193 -23,310 -83,398 -11,15 -18,27 -16,27 2,0 24,-7 50,-14 z" id="path26" style="stroke:#ff7c00;stroke-opacity:1" /> <path d="m 1486,1306 c 24,-34 26,-48 29,-155 5,-199 52,-355 118,-391 27,-14 29,-14 54,15 l 26,30 -7,-40 c -4,-22 -14,-52 -22,-68 -12,-23 -19,-27 -37,-21 -30,10 -127,7 -159,-5 -25,-10 -26,-9 -17,27 27,115 -6,198 -69,177 -32,-9 -45,-55 -51,-175 -7,-125 -13,-142 -66,-189 -40,-34 -66,-39 -89,-15 -20,19 -22,41 -2,25 24,-20 61,21 82,91 27,91 25,279 -4,367 -22,68 -19,91 16,110 31,17 5,23 -33,7 l -37,-16 28,48 c 15,26 29,50 31,55 2,4 14,0 26,-8 42,-29 111,-16 149,29 23,27 22,54 -1,93 -18,29 -22,31 -57,23 -48,-11 -63,-34 -48,-74 8,-21 50,-20 63,2 9,14 10,14 11,2 0,-39 -58,-54 -92,-23 -41,37 -12,98 54,113 57,12 77,5 104,-34 z" id="path25" style="stroke:#ff7c00;stroke-opacity:1" /> <path d="m 4388,1374 c 12,-8 22,-21 22,-29 0,-17 -31,-35 -57,-34 -15,0 -14,2 5,9 25,10 28,20 10,38 -26,26 -103,6 -130,-32 -13,-19 -9,-25 52,-68 37,-26 58,-47 55,-56 -2,-7 0,-10 5,-7 21,13 25,-112 5,-145 -2,-4 -23,1 -45,12 -118,59 -230,16 -230,-87 0,-85 81,-124 191,-91 29,8 54,14 55,13 4,-5 -30,-97 -36,-97 -4,0 -27,7 -50,15 -62,22 -120,19 -173,-9 -25,-14 -49,-21 -53,-18 -4,4 -4,2 -1,-5 4,-6 3,-22 -2,-35 -6,-16 -5,-34 4,-55 17,-41 64,-51 159,-34 38,6 70,10 72,8 2,-2 -6,-42 -18,-89 l -21,-86 -56,5 c -40,5 -66,14 -91,34 -19,15 -60,40 -90,56 -38,20 -56,35 -58,51 -2,12 15,70 38,129 48,121 90,279 90,336 0,45 12,51 115,62 39,4 78,12 88,17 30,16 21,54 -23,89 l -39,32 20,26 c 44,57 138,80 187,45 z" id="path24" style="stroke:#ff7c00;stroke-opacity:1" /> <path d="m 2218,1458 c 14,-14 15,-73 2,-103 -8,-19 -9,-19 -9,3 -1,12 -5,22 -10,22 -5,0 -12,-10 -14,-22 -3,-16 -5,-13 -6,10 -1,43 -22,38 -38,-9 -8,-23 -12,-28 -13,-14 -1,11 -4,14 -7,7 -7,-17 -43,30 -43,56 0,15 5,19 19,15 13,-3 30,5 48,21 30,28 52,33 71,14 z" id="path23" style="stroke:#ff7c00;stroke-opacity:1" /> <path d="m 2876,1449 c 65,-61 -15,-152 -97,-109 -22,13 -26,32 -4,24 11,-5 13,-2 9,11 -6,15 -4,15 13,4 27,-17 53,-5 53,24 0,53 -95,54 -119,1 -19,-43 -13,-74 20,-105 36,-34 39,-35 39,-13 0,25 60,10 87,-21 25,-28 38,-33 29,-10 -4,11 2,15 22,15 48,0 101,-72 128,-175 45,-169 -34,-415 -133,-415 -13,0 -33,-9 -45,-20 -39,-36 -181,-68 -228,-51 -18,6 -47,11 -64,11 -17,0 -46,9 -64,20 -18,11 -43,20 -55,20 -56,0 -128,114 -147,233 -15,98 17,277 50,269 6,-1 9,2 6,6 -3,5 3,17 14,27 20,18 20,18 5,-18 -8,-20 -15,-51 -14,-69 0,-29 2,-26 18,24 10,31 28,70 40,86 27,38 80,72 113,72 h 25 l -17,-37 c -10,-21 -21,-54 -24,-73 l -6,-35 15,35 c 36,82 54,105 96,126 30,15 38,23 26,25 -16,4 -15,9 8,54 34,68 77,98 133,92 27,-3 53,-14 68,-28 z" id="path22" style="stroke:#007c00;stroke-opacity:1" /> <path d="m 1643,1518 c 20,-10 37,-21 37,-23 0,-3 -13,-24 -30,-46 -82,-113 -27,-177 116,-134 31,9 52,11 58,5 6,-6 12,-39 14,-75 2,-36 9,-65 14,-65 6,0 9,29 6,75 -2,41 -2,75 -1,75 1,0 9,-13 17,-28 10,-20 12,-39 6,-72 -5,-25 -14,-108 -21,-186 -12,-143 -6,-217 23,-251 24,-29 65,-15 113,40 l 47,52 -7,-80 c -4,-44 -9,-83 -12,-87 -2,-5 -26,-8 -52,-8 -60,0 -120,-20 -168,-57 -32,-24 -36,-25 -30,-8 7,18 6,19 -6,3 -8,-10 -18,-14 -22,-10 -5,4 -5,1 -1,-6 4,-7 12,-10 17,-7 16,10 9,-9 -12,-34 l -19,-24 -43,19 c -80,36 -162,20 -252,-50 l -40,-31 22,30 c 69,97 165,129 260,85 24,-10 45,-15 48,-10 3,4 -2,11 -10,14 -13,5 -12,12 9,43 37,56 57,144 63,269 6,126 -6,179 -58,258 -39,58 -126,116 -99,66 15,-28 2,-87 -20,-93 -12,-3 -19,1 -20,12 0,9 -1,27 -2,41 -1,14 2,37 6,53 6,21 5,27 -7,27 -9,0 -25,12 -36,26 l -21,26 43,45 c 23,24 49,55 57,68 13,22 13,26 -5,39 -29,22 -65,28 -81,15 -21,-17 -17,-47 8,-60 13,-7 18,-14 11,-16 -7,-3 -21,1 -32,7 -29,15 -28,64 1,84 24,17 53,13 111,-16 z" id="path21" style="stroke:#ff7c00;stroke-opacity:1" /> <path d="m 2278,1515 c 2,-15 -1,-32 -6,-37 -6,-6 -8,0 -5,16 3,14 0,33 -7,41 -16,19 -49,19 -56,0 -8,-19 14,-47 30,-38 8,4 8,3 0,-6 -22,-24 -60,11 -47,45 17,45 85,30 91,-21 z" id="path20" style="stroke:#ff7c00;stroke-opacity:1" /> <path d="m 3064,1601 c 3,-5 -1,-25 -9,-45 -8,-19 -15,-39 -15,-45 0,-5 27,-2 60,6 34,9 64,13 68,9 10,-11 -19,-25 -68,-32 -25,-3 -60,-15 -79,-25 -38,-23 -56,-16 -25,10 13,10 23,34 27,65 4,26 9,52 13,57 7,12 21,12 28,0 z" id="path19" style="stroke:#8000ff;stroke-opacity:1" /> <path d="m 331,1605 c 24,-9 60,-29 79,-44 l 34,-29 -27,-36 c -33,-42 -57,-97 -57,-126 0,-12 17,-47 38,-78 21,-31 64,-101 96,-155 32,-53 62,-99 66,-102 8,-5 -68,193 -89,233 -11,21 -6,27 22,23 11,-2 9,37 -3,60 -6,10 -18,19 -28,19 -14,0 -14,2 -3,9 9,6 11,18 7,35 -8,31 10,36 19,5 4,-12 12,-18 21,-15 8,3 14,1 14,-3 0,-5 -5,-11 -11,-13 -15,-5 7,-78 24,-78 6,0 37,27 69,60 54,57 59,60 105,60 46,0 107,-26 125,-54 13,-18 9,-65 -7,-96 -30,-58 -91,-46 -110,20 l -7,25 21,-22 c 28,-29 47,-29 66,1 30,45 -16,96 -85,96 -37,0 -55,-25 -82,-113 -48,-160 11,-332 137,-391 63,-30 141,18 165,102 14,54 12,177 -5,251 -16,67 -14,81 8,63 46,-39 195,-34 279,9 41,21 50,13 19,-15 -31,-28 -90,-159 -113,-253 -18,-71 -22,-117 -22,-233 0,-145 10,-217 42,-295 47,-116 91,-125 186,-36 l 39,36 -19,-34 c -26,-48 -107,-131 -127,-131 -9,0 -27,15 -40,32 -28,38 -77,148 -77,172 0,9 -4,16 -10,16 -14,0 -12,-14 10,-95 10,-38 18,-70 17,-71 -1,0 -33,1 -70,4 -68,4 -69,5 -63,31 39,187 30,304 -29,359 -40,37 -63,39 -122,13 -57,-26 -100,-88 -108,-154 -8,-62 13,-162 49,-237 l 24,-50 -29,-16 c -16,-8 -34,-12 -40,-9 -5,4 -8,3 -7,-2 2,-5 -15,-25 -38,-46 l -41,-37 -6,68 c -4,37 -7,85 -7,106 0,66 -8,37 -26,-99 C 584,192 570,170 498,170 l -43,1 45,22 c 39,20 46,27 57,72 22,87 43,272 43,384 0,194 -61,371 -185,536 -31,41 -73,88 -92,104 -34,28 -35,30 -23,67 21,63 75,148 89,140 3,-2 7,7 7,20 4,54 -101,98 -140,59 -15,-16 -12,-43 8,-58 7,-5 3,-7 -8,-5 -10,2 -28,15 -39,30 -17,23 -18,29 -6,44 28,35 60,39 120,19 z" id="path18" style="stroke:#ff7c00;stroke-opacity:1" /> <path d="m 2500,1593 c 0,-103 -4,-115 -14,-44 -3,24 -7,46 -9,48 -6,5 -70,-41 -74,-53 -2,-7 3,-19 12,-27 18,-19 19,-27 2,-27 -16,0 -39,35 -54,85 -17,52 -16,65 2,65 9,0 15,-9 15,-24 0,-52 8,-56 57,-28 42,23 45,27 40,58 -3,18 -3,35 0,38 18,18 23,-3 23,-91 z" id="path16" style="stroke:#8000ff;stroke-opacity:1" /> <path d="m 5302,1667 c 10,-12 18,-27 18,-34 0,-18 -59,-63 -83,-63 -20,1 -20,2 6,16 15,8 27,22 27,31 0,24 -30,53 -56,53 -27,0 -80,-43 -89,-71 -9,-27 42,-82 107,-115 l 47,-24 -18,-52 c -28,-80 -32,-88 -43,-88 -20,0 -126,-81 -178,-136 -117,-125 -190,-289 -220,-499 -14,-102 -12,-272 4,-358 26,-133 57,-166 139,-147 81,19 67,1 -20,-25 -89,-27 -118,-16 -157,62 -21,42 -53,179 -62,266 -9,98 -23,71 -31,-62 -5,-97 -8,-111 -22,-105 -9,3 -36,9 -61,11 l -46,5 19,72 c 14,54 17,91 13,157 -8,126 -51,316 -71,313 -14,-2 -61,-127 -81,-212 -17,-74 -16,-235 1,-275 5,-13 -15,-4 -61,27 -37,25 -73,46 -80,46 -7,0 -15,4 -18,9 -10,15 14,121 70,304 85,284 101,388 69,464 -8,20 -14,38 -12,39 2,2 29,-4 61,-13 45,-13 65,-14 87,-6 l 29,11 v -116 c 1,-171 32,-410 61,-464 14,-26 16,-23 39,58 78,286 122,481 117,524 -13,110 -55,130 -127,62 -22,-22 -40,-44 -40,-51 0,-18 26,-24 52,-11 22,11 22,10 4,-4 -11,-9 -32,-16 -48,-16 -23,0 -28,4 -28,24 0,58 46,117 108,137 45,15 69,6 120,-41 43,-39 82,-52 82,-27 0,6 3,22 6,35 5,17 2,22 -12,23 -16,0 -15,2 4,9 12,6 22,18 22,30 0,11 5,20 11,20 7,0 9,-10 7,-25 -4,-17 0,-29 11,-35 15,-9 14,-9 -1,-10 -19,0 -23,-5 -32,-42 -6,-26 -4,-28 23,-28 h 29 l -50,-95 c -27,-52 -46,-95 -41,-95 4,0 40,40 78,89 39,50 75,88 82,86 7,-2 10,2 7,9 -3,8 10,22 31,34 42,25 59,61 45,96 -5,14 -26,50 -46,81 l -37,55 30,37 c 64,80 164,104 205,50 z" id="path15" style="stroke:#ff7c00;stroke-opacity:1" /> <path d="m 2807,1686 c 21,-23 30,-41 26,-54 -5,-20 -50,-43 -82,-41 -9,0 0,5 19,12 45,15 49,41 14,78 -33,34 -48,37 -39,8 4,-11 0,-35 -10,-55 -9,-19 -17,-48 -17,-64 -1,-35 -15,-40 -20,-7 -3,20 4,52 22,103 5,11 4,27 0,34 -28,45 42,33 87,-14 z" id="path13" style="stroke:#8000ff;stroke-opacity:1" /> <path d="m 3771,1750 c 15,-9 19,-22 19,-63 v -52 l 41,-13 c 73,-23 85,-35 81,-88 -4,-41 -7,-47 -38,-60 -41,-17 -42,-24 -6,-47 23,-16 27,-26 27,-68 0,-46 -2,-49 -30,-55 -16,-3 -38,-8 -47,-10 -14,-4 -18,1 -18,20 0,13 -5,37 -10,51 -8,22 -6,32 11,53 16,20 17,28 7,30 -7,2 -22,15 -32,30 l -19,27 25,-23 c 25,-22 28,-23 56,-8 31,16 58,66 49,90 -3,8 -25,25 -48,36 -53,27 -107,20 -154,-22 -49,-43 -51,-58 -11,-117 20,-29 40,-68 45,-88 10,-35 7,-41 -63,-152 -161,-256 -218,-389 -220,-513 -1,-43 -4,-78 -8,-78 -3,0 -18,23 -32,52 -18,36 -26,68 -26,104 0,70 -19,207 -31,218 -6,6 -9,6 -9,-1 0,-7 -16,-38 -35,-71 -48,-82 -88,-207 -82,-254 5,-36 4,-36 -20,-27 -34,13 -91,11 -135,-5 -44,-16 -46,-13 -17,17 38,41 80,142 96,233 13,74 13,104 4,178 -13,97 -42,196 -71,236 l -18,25 h 104 c 91,0 103,-2 99,-16 -20,-61 -36,-173 -41,-284 l -6,-130 32,55 c 17,30 47,86 67,123 24,45 39,65 46,58 5,-5 22,-57 37,-116 15,-58 29,-108 32,-110 3,-3 13,22 23,56 16,58 23,233 11,278 -2,9 -7,29 -10,44 l -7,28 39,-20 c 22,-11 52,-22 68,-24 25,-3 29,-8 28,-33 0,-16 -10,-62 -22,-103 -12,-41 -17,-70 -13,-65 18,18 131,288 131,311 0,22 -24,76 -52,115 -10,13 -7,23 16,53 15,20 44,44 63,53 28,14 33,20 28,40 -8,31 4,112 17,112 5,0 18,-5 29,-10 z" id="path1" style="stroke:#ff7c00;stroke-opacity:1" /> <path d="m 3804,1357 c 8,-41 15,-47 49,-40 23,5 27,10 27,39 0,32 -1,33 -41,32 -40,0 -41,-1 -35,-31 z" id="path2" style="stroke:#ff7c00;stroke-opacity:1" /> <path id="path3" d="m 2592,1668 c -15,-20 -24,-58 -13,-58 23,0 59,20 57,32 -2,18 -16,38 -25,38 -5,0 -13,-6 -19,-12 z m 28,42 c 0,-5 6,-10 14,-10 8,0 17,-7 20,-16 9,-22 6,-95 -4,-119 -7,-17 -9,-15 -9,13 -1,35 -13,40 -55,20 -18,-7 -28,-22 -33,-47 l -7,-36 -7,40 c -4,22 -3,42 1,45 4,3 13,25 20,50 11,40 32,69 53,70 4,0 7,-4 7,-10 z" style="stroke:#8000ff;stroke-opacity:1" /> <path id="path4" d="m 2913,1656 c 4,-11 -2,-30 -18,-50 -14,-18 -22,-36 -18,-39 13,-13 71,-7 84,9 11,14 10,22 -8,52 -22,38 -52,59 -40,28 z m 45,3 c 38,-39 44,-62 25,-89 -14,-19 -23,-22 -70,-18 -49,4 -54,3 -59,-19 -4,-12 -10,-21 -14,-18 -12,7 0,44 31,97 16,27 26,55 23,63 -11,27 32,17 64,-16 z" style="stroke:#8000ff;stroke-opacity:1" /> <path d="m 1165,1259 c -4,-6 -5,-12 -2,-15 2,-3 7,2 10,11 7,17 1,20 -8,4 z" id="path5" style="stroke:#ff7c00;stroke-opacity:1" /> <path d="m 1180,411 c 0,-6 4,-13 10,-16 6,-3 7,1 4,9 -7,18 -14,21 -14,7 z" id="path6" style="stroke:#ff7c00;stroke-opacity:1" /> <path d="m 2824,1142 c -16,-11 -96,-123 -91,-128 2,-2 23,3 47,11 23,8 53,15 66,15 18,0 28,9 39,37 15,36 15,39 -6,55 -23,19 -38,22 -55,10 z" id="path8" style="stroke:#007c00;stroke-opacity:1" /> <path d="m 2945,1037 c 0,-40 -6,-92 -14,-117 -11,-39 -14,-42 -23,-25 -13,25 -49,65 -58,65 -4,0 -12,-25 -19,-55 -7,-30 -15,-55 -19,-55 -4,0 -16,14 -27,30 -11,16 -23,30 -27,30 -4,0 -13,-18 -19,-40 -7,-22 -15,-40 -19,-40 -4,0 -20,17 -36,37 l -28,37 -16,-51 c -9,-29 -18,-55 -22,-58 -3,-3 -15,7 -27,22 -11,15 -25,33 -30,39 -6,7 -8,15 -5,18 2,3 1,4 -2,1 -4,-2 -8,-18 -9,-35 -4,-43 -11,-47 -41,-19 -21,20 -27,21 -34,9 -5,-8 -10,-19 -10,-24 0,-13 -31,16 -52,49 -12,20 -18,25 -18,13 0,-33 32,-97 55,-112 31,-21 32,-21 39,10 l 7,27 32,-33 c 32,-33 32,-33 35,-9 6,37 18,43 38,17 11,-13 27,-29 36,-36 15,-12 18,-9 29,30 l 11,43 33,-37 c 18,-21 35,-38 37,-38 3,0 9,16 12,35 9,46 21,51 42,16 10,-16 25,-29 35,-28 10,1 15,5 13,9 -3,4 2,21 11,38 13,26 19,29 31,19 8,-6 14,-17 14,-25 0,-30 21,-21 45,20 36,62 48,146 31,219 -20,85 -31,86 -31,4 z" id="path9" style="stroke:#007c00;stroke-opacity:1" /> <path d="m 2437,1009 c -9,-5 -22,-7 -27,-4 -22,13 9,-41 33,-59 24,-18 31,-18 82,-6 50,12 75,30 42,30 -8,0 -36,11 -63,25 -27,14 -49,25 -49,25 0,0 -8,-5 -18,-11 z" id="path10" style="stroke:#007c00;stroke-opacity:1" /> <path d="m 2616,978 c -3,-13 -6,-32 -6,-43 0,-18 1,-18 16,3 11,16 21,21 40,16 33,-8 30,8 -5,29 -37,22 -37,21 -45,-5 z" id="path11" style="stroke:#007c00;stroke-opacity:1" /> <path d="m 1365,1046 c -11,-16 -15,-41 -13,-73 3,-44 5,-48 30,-51 54,-6 89,71 58,129 -15,27 -56,24 -75,-5 z" id="path12" style="stroke:#ff7c00;stroke-opacity:1" /> </g> </svg>`);

    const halloweenCuteCatHat = parseSvg(`<?xml version="1.0" encoding="UTF-8" standalone="no"?> <svg width="461.07773" height="534.5365" version="1.1" id="svg23" sodipodi:docname="colored.svg" inkscape:version="1.3.2 (091e20ef0f, 2023-11-25, custom)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"> <defs id="defs23" /> <sodipodi:namedview id="namedview23" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" inkscape:zoom="1.4142136" inkscape:cx="461.38717" inkscape:cy="152.38151" inkscape:window-width="2560" inkscape:window-height="1371" inkscape:window-x="0" inkscape:window-y="0" inkscape:window-maximized="1" inkscape:current-layer="g1" /> <g fill="none" stroke="#000000" stroke-width="3px" id="g1" transform="translate(-117.22757,-81.063964)"> <path id="path32" style="stroke:#5d00d2;stroke-opacity:1" d="m 397.16503,223.26898 c -8.723,-1.693 -31.46809,-5.71009 -36.26609,-9.04878 M 324.77022,201.08737 C 310.76322,199.88437 294.254,188.067 282,181.742 c -4.045,-2.089 -10.875,-4.797 -13.208,-8.927 -2.661,-4.713 4.49,-11.405 7.092,-14.815 10.013,-13.124 21.487,-25.753 34.116,-36.41 39.538,-33.3623 104.464,-58.2124 148.961,-19 6.618,5.833 12.433,13.459 16.255,21.41 4.572,9.51 8.431,21.322 7.694,32 -0.727,10.555 -7.319,10.1 -14.91,4.971 -10.961,-7.407 -28.752,-22.661 -42.985,-13.962 -19.457,11.891 -12.6634,46.978 -11.54519,64.89505" /> <path id="path22" style="stroke:#df7c00;stroke-opacity:1" d="m 358,526 c -0.144,17.416 -4.288,36.74 -10.425,53 -2.211,5.857 -5.975,17.81663 -9.37458,24.32071 C 340.14742,608.74171 355.339,607 360,607 c 56.52544,-1.31189 68.65737,-42.28082 56.27897,-85 -3.206,-10.631 -9.13,-20.576 -16.283,-29 -2.768,-3.26 -10.21364,-11.77203 -13.39391,-14.46442 C 391.57663,477.29375 403.057,473.393 407,471.947 c 10.977,-4.025 21.396,-10.061 30,-18.037 30.178,-27.975 30.76795,-80.39453 19.65795,-117.63153 m -40.1131,238.85044 c 3.5105,2.2895 13.63815,3.07709 17.45515,2.58209 15.343,-1.993 30.173,-9.243 43,-17.576 11.167,-7.255 20.241,-18.975 25.575,-31.135 3.753,-8.556 6.854,-22.128 14.035,-28.477 4.162,-3.679 10.653,0.17 15.39,0.434 9.062,0.504 18.226,-1.374 26,-6.229 31.593,-19.729 20.88,-73.077 -14,-82.569 -48.051,-13.076 -79.068,26.448 -89.116,68.841 -4.846,20.447 -7.8946,52.85073 -35.3276,55.09473 M 299,533 c -3.183,8.438 -7.616,20.24 -8.811,29 1.00951,5.933 7.49,46.489 -19.189,51.532 -3.509,0.664 -7.456,0.726 -11,0.283 -6.14,-0.767 -14.51183,-2.10258 -16.96908,-8.88615 M 286,539 c 0.291,6.782 2.95271,15.15217 4.16425,22.96203 m -2.22255,39.17277 c -0.97828,14.00465 45.07697,18.01323 50.252,2.126 M 132,320 c -29.97063,67.39863 -7.35903,126.61365 60,153.189 5.231,2.026 18.78245,8.67283 22.8366,9.76441 -4.89257,4.61388 -10.64878,19.61093 -14.1526,31.04659 -11.02,29.123 -14.063,69.232 18.316,86.215 7.479,3.923 15.577,7.275 24,4.785 -8.967,-27.986 -18.75,-50.789 -19,-81 M 160.75511,192.02888 C 147.14593,189.01328 142.41917,210.77749 139.333,220 c -9.49,28.368 -23.358,71.814 -7.333,100 5.90487,-15.53184 18.93,-24.871 27.154,-34.87 7.389,-8.985 20.152,-15.799 29.4578,-22.01366 -16.04792,-11.01492 9.98566,-9.16789 22.70051,-2.63531 M 447.581,278.669 c -2.876,1.048 -6.476,-2.767 -8.581,-4.23 -5.544,-3.852 -12.24,-7.596 -18.95491,-8.40181 21.62938,-9.67888 -9.67201,-6.06618 -16.26501,-9.58418 m -42.63088,1.65075 C 362.93238,253.06787 378.923,237.81 383,234.282 c 3.76476,-3.25748 9.25049,-6.87601 16.78667,-12.97812 C 422.52644,205.24424 446.697,186.776 464.996,192.243 c 9.202,2.749 11.766,18.67 13.579,26.757 6.343,28.297 1.80392,56.90701 1.39311,85.99037" sodipodi:nodetypes="ccccccccsccccsccccccccccccccccsccccccccccccccccccccc" /> <path id="path4" style="stroke:#5d00d2;stroke-opacity:1" d="M 312.12986,235.79519 C 297.79786,228.73819 279.112,223.251 265,215.15 c -4.276,-2.455 -12.834,-5.916 -14.096,-11.19 -1.665,-6.955 3.855,-14.406 7.108,-19.96 2.323,-3.966 6.8961,-11.77335 10.2931,-14.88735 M 351,246 c 4.78043,3.32666 12.80527,7.37731 11.60522,7.46881 -18.40688,1.40342 40.34316,37.581 102.39478,49.72719 5.40906,1.05895 27.07659,4.78058 14.82042,-2.4548 4.02949,0.59597 6.8691,1.80651 10.17958,3.2948 10.241,4.603 22.455,13.393 29.657,22.003 3.316,3.965 5.633,10.106 2.484,14.852 -5.257,7.925 -18.17089,6.24178 -25.97389,5.08678 C 474.31321,341.60769 451.11985,334.11958 429,326.656 365.163,306.28 299.509,283.633 241,250.576 166.76347,205.33258 159.03963,202.99468 160.66567,192.02786 166.52739,178.28118 177.776,180.492 188,181.714 c 21.154,2.53 41.859,10.604 63,12.286" /> <path id="path8" d="m 315.89219,245.14019 c -3.347,-3.386 -5.601,-3.6707 -3.85429,-9.17226 l 12.84721,-34.92425 C 327.34248,192.50679 334.89,193.873 343,196.915 c 5.172,1.94 14.86743,4.23061 18.67243,8.40361 2.277,2.497 -0.24818,6.48947 -0.72296,8.79149 L 351,246 c -9.027,10.239 -23.36166,7.77547 -35.10781,-0.85981 z" sodipodi:nodetypes="cccscccc" style="stroke:#d0b909;stroke-opacity:1" /> <path style="stroke:#c5b747;stroke-opacity:1" d="M 159.87954,283.70421 C 158.02254,269.32821 152.262,251.597 153.093,237 c 0.297,-5.208 1.115,-13.021 6.95,-14.878 6.755,-2.149 13.846,2.461 18.957,6.256 12.797,9.502 20.739,23.502 33,32.622" id="path21" /> <path style="stroke:#c5b747;stroke-opacity:1" d="m 454.127,261 c -0.991,3.967 -2.123,16.058 -6.546,17.669" id="path24" sodipodi:nodetypes="cc" /> <path style="stroke:#c5b747;stroke-opacity:1" d="M 403.78008,256.45301 C 407.75308,249.55801 416.211,243.407 422,238.086 c 4.411,-4.055 9.091,-7.928 14,-11.365 2.57,-1.798 5.212,-3.492 8,-4.936 22.848,-11.828 12.72,28.828 10.127,39.215" id="path23" sodipodi:nodetypes="ccccc" /> <path id="path25" d="m 368.18028,319.58936 c 20.27617,6.96782 21.75603,35.49818 19.13825,52.57649 -4.90253,17.2989 -15.3313,27.7898 -34.84414,24.70798 -14.97067,-4.05521 -22.45338,-13.76985 -27.83469,-32.40912 M 207.28368,321.27632 c -18.48727,13.33824 -21.37902,34.97514 -18.24999,52.45236 2.60597,14.5556 16.05531,28.90482 38.29523,22.98362 14.1848,-6.39282 20.22778,-14.64033 27.01724,-36.0844" style="stroke:#ff0000;stroke-opacity:1" sodipodi:nodetypes="cccccscc" /> <path id="path14" d="m 366.048,319.889 c 19.60557,-1.20166 27.912,8.908 34.524,18.111 15.541,21.632 18.778,55.149 -3.573,73.671 -27.8004,23.03915 -81.66724,7.3298 -70.89574,-60.14302 6.48712,-22.78914 21.90456,-32.30466 39.94474,-31.63898 z M 187,415.073 C 160.67,399.079 160.556,362.331 177.043,339 c 8.81,-12.466 28.26074,-21.6881 45.953,-16.852 23.56074,6.44023 32.03442,29.55197 32.05198,48.20694 C 251.27895,421.79311 207.938,427.792 187,415.073 Z" style="stroke:#f38730;stroke-opacity:1" /> <path d="m 279.9203,404.60866 c 6.13411,-4.19212 13.57495,-3.59636 20.42413,-0.74835 -7.16797,8.75422 -12.55361,8.79767 -20.42413,0.74835 z" id="path30" sodipodi:nodetypes="ccc" style="stroke:#df3bff;stroke-opacity:1" /> <path d="m 263.25726,416.64553 c 5.79811,7.07636 18.04783,15.54886 27.16067,-1.55542 7.46625,16.71141 20.53758,10.69309 27.70325,1.90079" id="path31" sodipodi:nodetypes="ccc" /> </g> </svg>`);

    const halloweenCuteCatHat2 = parseSvg(`<?xml version="1.0" encoding="UTF-8" standalone="no"?> <svg version="1.0" width="470.76831pt" height="543.87976pt" viewBox="0 0 470.76831 543.87976" preserveAspectRatio="xMidYMid" id="svg5" sodipodi:docname="outline.svg" inkscape:version="1.3.2 (091e20ef0f, 2023-11-25, custom)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"> <defs id="defs5" /> <sodipodi:namedview id="namedview5" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" inkscape:document-units="pt" inkscape:zoom="0.62769397" inkscape:cx="-2.3896996" inkscape:cy="416.60429" inkscape:window-width="2560" inkscape:window-height="1371" inkscape:window-x="0" inkscape:window-y="0" inkscape:window-maximized="1" inkscape:current-layer="svg5" /> <metadata id="metadata1"> Created by potrace 1.16, written by Peter Selinger 2001-2019 </metadata> <g transform="matrix(0.1,0,0,-0.1,-112.9,619.89712)" fill="none" stroke="#000000" stroke-width="20px" id="g5"> <path d="m 3835,6174 c -322,-58 -642,-244 -920,-536 -139,-146 -299,-353 -386,-500 -18,-32 -39,-58 -45,-58 -7,0 -67,13 -135,29 -328,78 -419,94 -554,95 -148,1 -184,-10 -212,-68 -11,-25 -26,-37 -54,-45 -68,-20 -107,-87 -179,-301 -91,-271 -141,-525 -141,-728 -1,-132 8,-187 40,-273 l 20,-51 -39,-116 c -66,-197 -91,-342 -91,-532 0,-399 149,-615 565,-820 78,-38 195,-87 261,-109 66,-22 120,-44 120,-48 0,-4 -26,-57 -56,-118 -103,-202 -151,-379 -151,-560 -1,-188 46,-308 163,-426 81,-82 182,-134 302,-156 45,-8 110,-29 145,-46 122,-59 270,-46 370,32 l 50,40 27,-29 c 92,-96 295,-106 413,-20 l 42,30 120,-12 c 298,-30 530,57 662,250 l 33,47 h 110 c 87,0 125,5 180,23 154,51 313,143 408,237 94,92 140,169 267,453 26,56 37,71 49,66 144,-60 358,-7 476,117 109,114 153,271 122,429 -81,414 -513,586 -902,358 -108,-64 -230,-192 -288,-305 -64,-125 -110,-269 -147,-465 -32,-167 -58,-240 -107,-305 -27,-35 -98,-93 -114,-93 -4,0 -20,37 -35,82 -44,136 -101,236 -196,347 -26,31 -48,58 -48,62 0,3 33,16 73,28 262,85 476,277 567,513 86,222 102,519 41,759 -16,62 -16,69 -2,64 82,-25 340,-65 419,-65 170,0 266,96 214,214 -36,80 -185,209 -356,307 -73,42 -77,46 -72,74 21,130 29,324 18,452 -29,343 -94,545 -192,596 -70,36 -235,-1 -434,-98 l -89,-44 6,142 c 7,155 26,252 59,305 23,38 72,72 104,72 51,0 133,-37 246,-112 136,-90 185,-110 236,-96 78,21 93,171 37,348 -99,308 -309,500 -620,565 -88,19 -293,18 -400,-1 z m 395,-111 c 150,-30 314,-128 398,-237 88,-114 155,-297 150,-407 l -3,-60 -107,74 c -141,97 -214,130 -301,135 -87,5 -143,-15 -192,-70 -74,-81 -101,-187 -110,-430 -9,-212 -16,-247 -61,-276 -36,-23 -37,-24 -108,-8 -116,26 -238,69 -243,86 -21,68 -26,73 -117,116 -136,63 -214,73 -262,33 -11,-9 -25,-9 -61,0 -76,19 -270,99 -368,151 -144,78 -139,60 -49,181 103,137 343,376 464,461 325,229 657,316 970,251 z M 2738,5160 c 82,-50 262,-132 377,-172 61,-20 109,-41 108,-45 -2,-8 -88,-240 -101,-275 -6,-15 -17,-14 -109,16 -116,38 -305,126 -411,192 l -73,46 37,66 c 41,76 117,202 121,202 2,0 24,-13 51,-30 z m -862,-59 c 69,-8 461,-91 577,-122 l 37,-10 -15,-30 c -15,-28 -15,-30 8,-52 78,-72 351,-208 530,-264 72,-22 87,-31 87,-48 0,-62 74,-115 223,-160 100,-30 116,-28 170,23 20,20 37,31 37,24 0,-18 145,-137 258,-212 195,-130 417,-229 659,-296 162,-44 347,-77 388,-70 27,5 45,-3 136,-66 194,-134 260,-220 192,-246 -77,-29 -150,-23 -400,33 -408,90 -934,265 -1578,525 -662,267 -1241,613 -1454,870 -63,75 -66,97 -13,103 69,7 77,7 158,-2 z m 2798,-150 c 26,-51 65,-194 87,-321 21,-114 18,-420 -5,-558 -10,-62 -21,-114 -25,-117 -12,-7 -232,43 -349,80 -234,74 -474,194 -652,326 l -79,58 62,59 c 288,272 553,442 781,502 39,10 90,19 113,19 41,1 44,-1 67,-48 z m -3027,27 c 15,-7 68,-50 116,-95 307,-289 781,-561 1422,-816 384,-152 1069,-392 1251,-438 41,-11 46,-16 73,-73 112,-238 103,-634 -21,-886 -55,-110 -184,-243 -301,-309 -93,-52 -244,-106 -342,-121 -38,-6 -77,-18 -85,-26 -13,-14 -11,-19 19,-42 175,-135 298,-308 352,-494 29,-102 36,-272 15,-361 -52,-221 -214,-345 -476,-363 -74,-5 -234,7 -246,18 -2,3 10,30 27,62 63,116 122,335 154,570 14,102 14,121 3,133 -16,15 -48,8 -48,-11 0,-6 -7,-68 -15,-136 -44,-358 -159,-622 -301,-691 -38,-18 -57,-21 -110,-16 -80,6 -134,39 -166,100 -21,38 -23,55 -22,177 1,113 6,160 34,290 41,192 43,224 13,228 -24,4 -29,-9 -60,-151 -19,-87 -27,-84 -38,16 -7,69 -25,95 -55,77 -11,-7 -10,-35 5,-173 23,-218 18,-404 -13,-463 -41,-80 -104,-112 -197,-102 -96,11 -178,75 -232,183 -72,142 -106,289 -123,541 -6,87 -14,162 -16,166 -8,13 -31,9 -44,-7 -9,-11 -9,-46 -1,-154 19,-243 60,-421 128,-561 21,-41 39,-79 41,-84 8,-17 -82,4 -146,34 -133,62 -230,195 -253,349 -30,198 58,497 223,758 22,35 38,69 35,77 -3,7 -38,21 -79,31 -193,46 -463,162 -616,265 -222,148 -305,316 -304,615 1,305 95,621 251,842 103,146 258,286 392,354 74,37 79,63 18,79 -23,6 -39,13 -38,14 12,10 163,-15 197,-33 23,-12 48,-21 56,-21 23,0 26,27 5,53 -10,14 -19,29 -19,34 0,14 -218,224 -287,277 -204,154 -312,117 -313,-106 0,-93 21,-273 45,-388 l 15,-71 -61,-76 c -33,-42 -81,-112 -107,-156 -44,-76 -46,-78 -58,-55 -38,70 -42,281 -9,474 37,216 157,607 201,655 20,22 69,25 111,7 z m 1841,-39 c 118,-54 118,-53 42,-264 -66,-184 -79,-210 -109,-220 -26,-8 -228,71 -241,95 -17,32 -11,64 36,191 25,68 52,143 60,166 9,24 27,52 42,63 32,26 57,21 170,-31 z m 349,-204 72,-17 -77,-63 c -42,-34 -108,-90 -146,-124 -38,-33 -74,-61 -80,-61 -6,0 -17,9 -24,20 -7,11 -19,20 -27,20 -8,0 -15,1 -15,3 0,6 59,174 80,229 l 22,56 62,-23 c 33,-12 93,-31 133,-40 z m -2112,-44 c 50,-28 189,-146 254,-214 l 33,-35 -78,5 c -71,5 -82,3 -106,-17 -33,-26 -35,-46 -7,-76 l 20,-21 -45,-27 c -25,-14 -73,-49 -107,-76 -34,-28 -64,-49 -66,-47 -11,11 -54,316 -55,387 -1,113 16,150 70,150 22,0 57,-11 87,-29 z M 5405,2798 c 64,-16 152,-67 194,-114 119,-128 153,-336 80,-484 -76,-150 -273,-229 -429,-170 -100,37 -119,18 -227,-229 -85,-195 -116,-245 -192,-321 -50,-49 -94,-79 -176,-122 -157,-81 -250,-110 -353,-111 -46,0 -88,5 -94,11 -7,7 -7,26 1,62 6,28 11,91 11,140 0,87 1,90 23,90 42,0 129,50 182,105 90,92 113,151 180,475 72,341 228,566 454,651 100,37 238,44 346,17 z" id="path1" /> <path d="m 4473,4791 c -92,-31 -165,-86 -375,-283 -86,-80 -118,-116 -118,-133 0,-33 9,-36 71,-20 30,8 88,15 129,14 h 75 l -45,-22 c -66,-32 -60,-53 20,-80 87,-29 151,-68 205,-124 55,-58 65,-52 101,61 67,210 101,450 75,528 -22,68 -62,85 -138,59 z m 77,-56 c 9,-11 11,-37 6,-98 -13,-143 -60,-391 -83,-430 -2,-4 -25,9 -50,28 -24,19 -66,44 -92,56 l -48,21 24,24 c 27,27 29,42 9,70 -12,16 -30,20 -117,24 l -102,5 91,82 c 107,96 175,148 256,197 66,39 87,44 106,21 z" id="path2" /> <path d="m 3582,3799 c -215,-42 -356,-242 -369,-525 -9,-184 32,-301 146,-415 71,-70 121,-99 216,-124 261,-67 535,111 586,380 45,241 -104,547 -316,646 -94,45 -173,56 -263,38 z m 240,-95 c 79,-40 121,-77 172,-152 117,-171 139,-399 54,-565 -82,-162 -295,-245 -479,-188 -120,38 -203,114 -262,239 -29,61 -32,77 -34,177 l -3,110 15,-64 c 30,-131 100,-237 187,-282 124,-64 269,-5 346,139 l 32,60 -34,6 c -88,17 -114,89 -47,133 21,14 49,23 72,23 45,0 45,0 29,99 -19,116 -83,223 -170,284 l -25,18 47,-5 c 27,-3 72,-18 100,-32 z m -287,-24 c 17,-11 45,-43 60,-72 39,-71 42,-178 6,-251 -66,-136 -215,-137 -281,-3 -30,62 -28,91 10,172 35,72 126,174 157,174 8,0 30,-9 48,-20 z" id="path3" /> <path d="m 1998,3781 c -83,-27 -138,-63 -199,-129 -125,-134 -193,-348 -169,-525 38,-276 321,-463 595,-392 225,59 382,296 360,545 -21,242 -116,409 -274,484 -57,26 -79,31 -161,33 -72,2 -109,-2 -152,-16 z m 219,-88 c 23,-40 29,-62 31,-128 3,-72 0,-86 -25,-135 -16,-32 -42,-64 -62,-77 -70,-47 -163,-19 -206,60 -11,20 -23,37 -27,37 -10,0 -10,-182 0,-195 4,-5 27,-11 51,-12 113,-7 146,-99 50,-142 l -38,-18 40,-41 c 71,-75 153,-103 239,-82 62,15 128,64 169,127 34,51 70,155 72,207 1,24 3,20 11,-19 33,-171 -79,-378 -249,-458 -62,-29 -77,-32 -163,-32 -113,0 -173,18 -253,75 -132,94 -193,283 -153,470 51,240 223,409 418,410 h 67 z" id="path4" /> <path d="m 2833,3239 c -63,-18 -68,-84 -10,-119 41,-26 78,-25 111,1 57,45 54,88 -9,115 -39,16 -47,16 -92,3 z" id="path5" /> </g> <path d="m 158.3417,344.70839 c 6.38691,2.60224 8.96534,1.90317 16.49491,-4.37584 12.8696,11.87934 20.22039,2.0385 21.95835,1.27648 1.96009,-1.94894 4.63607,-3.88905 3.10362,-5.86832 -1.81447,-1.71036 -2.61624,-0.78696 -4.00107,0.42673 -5.92936,4.59772 -10.33134,11.17185 -21.05306,-1.8288 -13.97017,17.33231 -18.15458,-0.25053 -20.86802,1.35849 -2.50582,1.43082 -0.19366,6.21679 4.36527,9.01126 z" id="path8" sodipodi:nodetypes="cccccccc" style="fill:none;stroke:#000000;stroke-width:2;stroke-dasharray:none;stroke-opacity:1" /> </svg>`);

    global.StampLib = {
        getAtd: getAtd,
        writeAllAt: writeAllAt,
        undoLastWriteAll: undoLastWriteAll,
        setPenColorHex: setPenColorHex,
        setHighlighter: setHighlighter,
        getWriteAllDimensions: getWriteAllDimensions,
        getWriteStampDimensions: getWriteStampDimensions,
        writeStampAt: writeStampAt,
        stamps: {
            "youCanDoIt": youCanDoIt,
            "excellentWorkStreaked2": excellentWorkStreaked2,
            "greatJob": greatJobStamp,
            "wow": wow,
            "rocketKeepUpTheGoodWork": rocketKeepUpTheGoodWork,
            "keepUpTheGoodWorkFireworks": keepUpTheGoodWorkFireworks,
            "greatWorkKeepItUp": greatWorkKeepItUp,
            "stickGoodJob": stickGoodJob,
            "stickGreatJobClap": stickGreatJobClap,
            "stickGreatJobStarEyes": stickGreatJobStarEyes,
            "stickGoodJobThumb": stickGoodJobThumb,
            "stickGreatWorkStrong": stickGreatWorkStrong,
            "stickSoProud": stickSoProud,
            "congrats": congrats,
            "newLevel": newLevel,
            "axolotl": axolotlStamp,
            "cuteAxolotl": cuteAxolotl,
            "cuteAxolotl2": cuteAxolotl2,
            "cuteCat": cuteCat,
            "cuteCrab": cuteCrab,
            "cuteFish": cuteFish,
            "cuteHorse": cuteHorse,
            "cuteTurtle": cuteTurtle,
            "halloweenCuteCatHat": halloweenCuteCatHat,
            "halloweenCuteCatHat2": halloweenCuteCatHat2,
            "happyHalloween1": happyHalloween1,
            "happyHalloween1safe": happyHalloween1safe,
            "happyHalloween2": happyHalloween2,
            "happyHalloween2safe": happyHalloween2safe,
            "happyHalloweenHorizontal": happyHalloweenHorizontal,
            //"tanjiro": tanjiro,
            //"thinkingFace": thinkingFace,
        },
        private: {
            axolotlStamp: axolotlStamp,
            expandToolbar: expandToolbar,
            selectPen: selectPen,
            DrawLetter: DrawLetter,
            Stroke: Stroke,
            Line: Line,
            Linear: Linear,
            Circular: Circular,
            Bezier: Bezier,
            DrawStamp: DrawStamp,
            LETTERS: LETTERS,
            HELVETICANT: HELVETICANT,
            getWriteStrokes: function() {return writeStrokes;},
            getNewDrawCounter: function() {return newDrawCounter;},
            undoInk: undoInk,
            saveDrawing: saveDrawing,
            writeAt: writeAt,
            drawCell: drawCell,
            parseSvg: parseSvg,
            parseChild: parseChild,
            parseG: parseG,
            parsePath: parsePath,
        },
    }
    global.stamp = global.StampLib;
})(window);
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

const drawstamps = document.createElement("div");
drawstamps.className = "stamps";
drawtab.appendChild(drawstamps);

function makeStamp(stamp, name) {
    let btn = document.createElement("button");
    btn.className = "stampbtn";
    btn.appendChild(stamp.svg);
    stamp.svg.addEventListener("mouseover", (e) => {
        // Prevent a bunch of errors being sent because of some code looking at .className and assuming it's a string
        e.stopPropagation();
    })
    drawstamps.appendChild(btn);
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
        printoverlay.addEventListener("mouseover", (e) => {
            // Prevent a bunch of errors being sent because of some code looking at .className and assuming it's a string
            e.stopPropagation();
        })
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

                let options = {
                    color: pencolorbtn.value,
                    rainbow: stampColorType.value == "Rainbow",
                    rainbowspeed: rainbowspeed.value,
                    usePredefinedColor: stampColorType.value == "Unchanged",
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

for (let i = 0; i < 3; i++) {
    let stampColorTypeOption = document.createElement("option");
    stampColorTypeOption.innerText = ["Color Picker", "Rainbow", "Unchanged"][i];
    stampColorType.appendChild(stampColorTypeOption);
}
stampColorType.value = "Color Picker";

stampColorType.addEventListener("change", function() {
    if (this.value == "Rainbow") {
        rainbowspeed.removeAttribute("disabled");
    } else {
        rainbowspeed.setAttribute("disabled", "");
    }
});

const rainbowspeed = document.createElement("input");
rainbowspeed.className = "rainbowspeed";
rainbowspeed.type = "range";
rainbowspeed.value = 1;
rainbowspeed.min = 1;
rainbowspeed.max = 130;
rainbowspeed.setAttribute("disabled", "");
drawheader.appendChild(rainbowspeed);

for (let stampName in StampLib.stamps) {
    makeStamp(StampLib.stamps[stampName], stampName);
}

const printoverlay = document.createElement("div");
printoverlay.className = "printoverlay";
document.body.appendChild(printoverlay);


;
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
  display: none;
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
  top: -60px;
  border: 1px solid;
  width: 405px;
  z-index: 253;
  right: 0px;
  background-color: rgb(240, 240, 247);
  max-height: calc(-20px + 100vh);
  overflow: auto;
  --sizeslider: 0.25;
}
.drawtab button {
  height: 30px;
}
.drawtab button.stampbtn {
  background: white;
  height: 100%;
  width: calc(var(--sizeslider) * var(--height-limiter) * 370px);
  margin: 4px;
}
.drawtab .squarebtn {
  width: 30px;
  margin: 10px;
}
.drawtab label {
  font-size: 12px;
}
.drawtab textarea {
  max-width: calc(100% - 5px);
  width: calc(100% - 6px);
  min-width: calc(100% - 6px);
  margin-bottom: -6px;
  font-size: calc(var(--sizeslider) * 57px);
}
.drawtab .header {
  position: sticky;
  top: 0px;
  background-color: rgb(240, 240, 247);
}
.drawtab .header > input {
  margin: 7px;
}
.drawtab .header > input[type=checkbox] {
  margin-right: 3px;
}
.drawtab .undoLast {
  padding-top: 3px;
}
.drawtab .textprintbtn {
  margin: 10px;
}
.drawtab .rainbowspeed {
  width: 210px;
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

.printPreviewDiv {
  border: 1px solid;
  z-index: 997;
  position: fixed;
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
