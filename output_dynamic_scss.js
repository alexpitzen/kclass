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

    class DrawLetter {
        constructor(character, strokes, width) {
            this.character = character;
            this.strokes = strokes;
            this.width = width;
        }
    }

    class DrawStamp {
        constructor(strokes, width, height, svg) {
            this.strokes = strokes;
            this.width = width;
            this.height = height;
            this.svg = svg;
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

    // TODO this should be a map<atd:[]>
    // can't really make this usable because it doesn't account for other draw/undo
    // maybe implement an undo all & redo all instead
    var writeStrokes = {}
    var newDrawCounter = 0;

    function writeStampAt(stamp, pos, scale, options, dryRun = false) {
        let color = options.color || "#ff2200",
            alpha = options.alpha || 255,
            width = options.width || 2;

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
        let stampDimensions = getStampDimensions(stamp, scale);
        pos = {
            x: pos.x - stampDimensions.min.x,
            y: pos.y - stampDimensions.min.y,
        };
        if (!dryRun) {
            atd.pen.col.A = alpha;
            atd.pen.w = width;
            let pointer = InkTool.InkCanvasLib.PointerTraceList[0];
            writeAt(stamp, pos, scale, atd, pointer);
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
            let letter = LETTERS[c];
            if (typeof letter === "undefined") {
                continue;
            }
            if (!dryRun) {
                writeAt(letter, current_pos, scale, atd, pointer);
            }
            let addWidth = (letter.width + 10) * scale + 3;
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

    function getStampDimensions(stamp, scale) {
        let min = null;
        let max = null;
        for (let stroke of stamp.strokes) {
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
        selectPen();
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
        let strokes = [];
        for (let child of svgElem.children) {
            strokes = strokes.concat(parseChild(child));
        }
        return new DrawStamp(strokes, width, height, svgElem);
    }

    function parseChild(element, transform = []) {
        switch (element.nodeName) {
            case "path":
                return parsePath(element, transform);
            case "g":
                return parseG(element, transform);
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

    const TRANSFORM_CLASSES = {
        "translate": TranslateTransformation,
        "scale": ScaleTransformation,
    };

    // <g transform="translate(0.000000,654.000000) scale(0.100000,-0.100000)"
    function parseG(element, transform) {
        let newTransforms = element.getAttribute("transform") || "";
        let allTransforms = [];
        if (newTransforms !== "") {
            for (let match of newTransforms.matchAll(transformsRegex)) {
                let transformClass = TRANSFORM_CLASSES[match.groups.transform.trim().toLowerCase()] || null;
                if (transformClass != null) {
                    allTransforms.push(new transformClass(...match.groups.params.split(",")));
                }
            }
            allTransforms.reverse();
        }
        allTransforms = allTransforms.concat(transform);
        let strokes = [];
        for (let child of element.children) {
            strokes = strokes.concat(parseChild(child, allTransforms));
        }
        return strokes;
    }

    const pathRegex = /[MmCcLlZzQq][0-9. -]*/g;

    function parameterizePathSection(str) {
        return [str[0], ...str.substring(1).trim().split(" ").map(parseFloat)];
    }

    function shift2Translated(pathSection, transformations, relative) {
        let x = pathSection.shift();
        let y = pathSection.shift();
        for (let transformation of transformations) {
            [x, y] = transformation.transform(x, y, relative);
        }
        return [x, y];
    }

    function parsePath(element, transformations) {
        let pathstring = element.getAttribute("d") || "";
        let strokes = [];
        let x = 0, y = 0;
        let mx = 0, my = 0;
        let currentStroke = null;
        let makeLinear = (x2, y2) => {
            return new Linear({x:x, y:y}, {x:x2, y:y2});
        }
        for (let match of pathstring.matchAll(pathRegex)) {
            let matchstr = match[0].trim();
            let pathSection = parameterizePathSection(matchstr);
            let cmd = pathSection.shift();
            // TODO apply transforms
            if (cmd == "M" || cmd == "m") {
                if (currentStroke != null) {
                    strokes.push(currentStroke);
                    currentStroke = null;
                }
                if (cmd == "M") {
                    [x, y] = shift2Translated(pathSection, transformations, false);
                } else {
                    let [dx, dy] = shift2Translated(pathSection, transformations, true);
                    x += dx;
                    y += dy;
                }
                mx = x;
                my = y;
            } else {
                if (currentStroke == null) {
                    currentStroke = new Stroke([]);
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
        }
        if (currentStroke != null) {
            strokes.push(currentStroke);
            currentStroke = null;
        }
        return strokes;
    }

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

    const cuteCat = parseSvg(`<?xml version="1.0" standalone="yes"?> <svg xmlns="http://www.w3.org/2000/svg" width="251" height="272" stroke-width="2px"> <path style="stroke:#0e0e0e; fill:none;" d="M32 196C26.7881 199.752 16.5345 198.761 14.4336 206.043C9.83828 221.972 41.8615 241.677 53 231C35.1133 216.312 31.9986 196.77 32 175C32.0024 137.959 42.3506 102.41 57.6914 69C63.3962 56.5758 71.9914 33.0696 84.1844 25.7083C92.7567 20.533 102.951 41.8896 109.285 44.8025C112.399 46.2342 117.613 45.0013 121 45C130.762 44.9962 140.299 44.7477 150 44.9853C154.46 45.0946 160.106 45.8908 163.674 42.6821C167.543 39.2038 173.975 22.5088 180.788 26.8009C184.504 29.142 186.608 35.3081 188.72 39C194.231 48.6339 200.449 57.7554 204.85 68C221.839 107.554 236.994 147.237 232.925 191C230.892 212.871 217.059 243.645 191 245C192.313 236.272 198.634 229.969 201.907 222C208.155 206.791 208.793 185.68 200.475 171C176.611 128.889 89.8959 127.516 69.6659 173C58.4093 198.309 68.086 225.215 84.8387 245.698C87.4595 248.902 103.059 254.838 105.544 249.678C107.307 246.018 104.201 239.928 104 236"/> <path style="stroke:#0e0e0e; fill:none;" d="M89 102C95.0921 97.8175 101.178 96.717 108 100M161 101C167.642 96.6163 173.087 98.1582 179 103"/> <path style="stroke:#0e0e0e; fill:none;" d="M136 104C136.028 112.006 143.707 119.833 149 110M67 107L79 108M188 109L201 108"/> <path style="stroke:#0e0e0e; fill:none;" d="M123 112C127.99 116.216 131.01 116.216 136 112"/> <path style="stroke:#0e0e0e; fill:none;" d="M67 115L78 114M190 115L199 117"/> <path style="stroke:#0e0e0e; fill:none;" d="M171 231L166 252C175.699 252 182.846 250.623 191 245M53 232C60.1372 242.131 71.3689 244.743 83 247M144 234C147.021 245.297 152.102 264.85 166 252M132 236C131.243 252.572 121.857 265.086 107 251M130 255L149 255"/> </svg> `);

    const cuteFish = parseSvg(`<?xml version="1.0" standalone="no"?> <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 20010904//EN" "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd"> <svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="793.000000pt" height="724.000000pt" viewBox="0 0 793.000000 724.000000" preserveAspectRatio="xMidYMid meet"> <metadata> Created by potrace 1.16, written by Peter Selinger 2001-2019 </metadata> <g transform="translate(0.000000,724.000000) scale(0.100000,-0.100000)" fill="#000000" stroke="none"> <path d="M3570 7199 c-87 -8 -178 -26 -255 -50 -153 -47 -176 -56 -300 -109 -310 -134 -575 -307 -776 -509 -97 -97 -249 -286 -249 -310 0 -5 -4 -11 -8 -13 -12 -4 -95 -164 -117 -223 -10 -27 -21 -54 -25 -60 -4 -5 -15 -39 -24 -75 -10 -36 -22 -76 -27 -90 -18 -53 -32 -161 -38 -298 l-6 -143 -110 -38 c-466 -161 -813 -416 -1055 -774 -122 -181 -220 -415 -263 -627 -30 -150 -37 -197 -43 -318 l-7 -123 -76 -77 c-51 -51 -86 -97 -105 -137 -15 -33 -36 -76 -46 -96 -14 -27 -18 -51 -14 -105 2 -38 6 -109 8 -159 4 -98 13 -143 53 -250 129 -352 462 -747 872 -1035 188 -132 174 -118 187 -190 60 -350 351 -664 673 -726 95 -18 129 -18 214 0 154 32 250 140 259 291 4 50 16 53 153 31 160 -25 309 -36 472 -36 l152 0 42 -73 c78 -134 183 -271 294 -383 132 -133 230 -208 350 -267 83 -41 119 -55 216 -86 19 -6 85 -11 146 -11 100 0 116 3 161 26 169 87 211 270 126 543 -9 28 -14 92 -14 172 0 145 -18 240 -56 300 -28 44 -111 129 -128 129 -12 1 -61 39 -55 43 2 2 29 18 59 37 139 83 319 244 416 371 26 35 51 66 54 69 9 8 120 178 120 185 0 3 11 23 25 45 27 43 55 53 55 20 0 -10 6 -34 14 -52 8 -18 33 -82 56 -143 56 -147 168 -376 248 -505 285 -463 640 -778 1087 -966 44 -19 87 -34 95 -34 9 0 20 -4 25 -9 6 -4 51 -18 100 -30 50 -12 99 -24 110 -27 11 -3 79 -12 150 -19 349 -38 667 63 799 253 52 75 67 135 67 271 1 120 -6 176 -37 331 -24 116 -77 305 -109 390 -8 19 -23 62 -35 95 -68 189 -227 520 -337 697 -205 333 -439 582 -624 665 -48 21 -42 39 29 82 48 29 195 134 212 151 3 3 28 23 55 45 28 22 103 91 169 155 285 277 497 575 636 895 12 28 27 64 35 80 7 17 25 68 40 115 15 47 36 112 48 145 11 33 22 80 24 105 2 25 11 77 19 115 22 109 19 415 -6 535 -22 107 -34 153 -51 190 -7 14 -19 41 -28 60 -56 123 -163 206 -299 236 -78 17 -87 17 -185 0 -97 -16 -171 -37 -209 -57 -10 -5 -23 -9 -29 -9 -33 0 -271 -128 -504 -271 -16 -10 -39 -23 -50 -29 -11 -6 -33 -19 -50 -30 -16 -11 -41 -26 -55 -34 -21 -12 -124 -78 -184 -118 -77 -52 -278 -201 -356 -265 -131 -107 -367 -346 -473 -478 -89 -112 -232 -319 -282 -410 -15 -27 -44 -79 -63 -114 -41 -74 -38 -75 -99 44 -59 117 -194 313 -292 424 -35 40 -32 51 13 51 59 0 157 37 222 84 95 69 148 183 164 358 18 184 -2 306 -74 449 -64 127 -166 242 -436 490 -69 62 -113 112 -128 142 -23 46 -23 50 -12 177 15 183 -7 421 -49 525 -88 219 -243 349 -439 370 -115 12 -139 12 -232 4z m272 -50 c9 -5 24 -9 33 -9 26 0 138 -59 176 -93 73 -65 117 -134 158 -252 24 -70 19 -83 -37 -90 -49 -7 -155 -30 -207 -45 -149 -45 -218 -73 -355 -140 -320 -157 -666 -468 -892 -801 -35 -52 -67 -101 -71 -109 -4 -8 -21 -37 -38 -65 -17 -27 -35 -62 -41 -76 -6 -15 -19 -31 -28 -37 -20 -12 -309 -20 -328 -9 -22 14 5 207 51 372 21 74 84 229 129 315 159 303 435 588 759 786 93 56 337 185 375 197 10 3 35 13 54 21 115 47 146 54 195 49 27 -3 58 -10 67 -14z m-307 -5 c-11 -9 -40 -25 -65 -35 -219 -95 -488 -265 -655 -414 -175 -156 -289 -289 -393 -460 -97 -158 -144 -262 -193 -425 -11 -36 -24 -79 -30 -96 -10 -34 -26 -142 -36 -242 -3 -34 -10 -65 -15 -68 -5 -4 -37 -10 -71 -15 -34 -5 -96 -16 -137 -25 -41 -9 -93 -17 -115 -18 -37 -1 -40 1 -44 29 -10 89 44 411 89 520 112 275 208 423 400 615 108 108 192 175 344 275 104 68 355 196 476 243 47 19 94 37 105 42 36 14 108 37 170 53 106 27 139 34 165 35 25 1 25 1 5 -14z m709 -491 c11 -28 18 -277 9 -338 -9 -67 1 -61 -138 -91 -328 -71 -668 -265 -934 -533 -39 -40 -178 -204 -229 -270 -18 -24 -19 -24 -108 -13 -50 7 -125 12 -167 12 -68 0 -77 2 -77 18 0 24 132 239 215 348 164 219 384 435 550 543 22 14 42 28 45 32 11 12 129 79 215 122 179 90 310 135 510 177 33 7 65 13 70 15 16 4 33 -6 39 -22z m-4 -462 c5 -11 10 -28 10 -38 0 -43 46 -101 175 -222 40 -38 63 -66 57 -70 -6 -4 -40 -13 -74 -20 -228 -47 -480 -167 -693 -330 -33 -25 -104 -88 -158 -140 l-98 -95 -42 12 c-37 11 -234 61 -367 92 -25 6 -48 15 -53 19 -11 11 74 119 184 235 188 199 428 367 659 463 105 43 160 61 300 97 77 19 88 19 100 -3z m3185 -352 c14 -14 14 -18 -2 -50 -42 -87 -117 -183 -223 -289 -127 -128 -130 -130 -262 -228 -123 -90 -245 -169 -528 -342 -209 -128 -331 -205 -410 -259 -14 -10 -63 -44 -109 -76 -47 -32 -89 -61 -95 -66 -6 -5 -60 -48 -121 -95 -96 -75 -347 -316 -412 -396 -84 -103 -223 -313 -223 -336 0 -7 -4 -12 -9 -12 -18 0 -28 22 -98 231 -14 43 -14 48 4 85 69 140 226 394 310 499 5 6 24 30 43 55 111 146 337 375 505 511 229 186 619 439 995 646 62 34 234 102 305 122 71 19 78 20 197 18 91 -2 121 -5 133 -18z m-2783 -111 c49 -50 111 -125 138 -166 55 -84 54 -97 -9 -107 -164 -27 -354 -77 -531 -140 -75 -27 -241 -112 -313 -160 -38 -25 -72 -45 -75 -45 -4 0 -34 13 -67 29 -86 42 -154 72 -204 90 -78 29 -77 43 13 127 250 234 541 392 826 448 127 25 123 27 222 -76z m2908 35 c70 -71 126 -180 144 -282 22 -124 -240 -408 -584 -633 -155 -101 -451 -278 -465 -278 -2 0 -34 -18 -70 -40 -36 -22 -67 -40 -70 -40 -3 0 -34 -18 -70 -40 -36 -22 -67 -40 -70 -40 -3 0 -34 -18 -70 -40 -36 -22 -67 -40 -70 -40 -8 0 -334 -199 -415 -253 -106 -71 -294 -210 -370 -275 -93 -79 -253 -246 -308 -320 -25 -34 -50 -58 -54 -54 -11 11 -38 139 -37 177 0 17 11 48 24 70 14 22 29 49 34 60 5 11 29 49 53 85 202 304 493 575 903 841 86 56 131 85 240 152 11 7 46 29 78 50 32 20 60 37 62 37 2 0 30 17 62 38 32 22 77 50 100 63 67 39 194 120 258 166 33 23 75 52 93 65 32 22 67 50 162 126 75 61 182 173 248 259 34 45 62 84 62 87 0 14 63 106 72 106 6 0 32 -21 58 -47z m-2660 -444 c14 -51 20 -108 20 -185 0 -140 0 -139 -135 -148 -87 -6 -144 -16 -340 -56 -58 -12 -146 -36 -178 -49 -16 -6 -32 -11 -36 -11 -5 0 -51 30 -103 68 -108 77 -118 83 -175 113 -53 28 -47 43 34 92 58 35 204 109 240 120 10 4 36 13 58 22 123 49 408 122 535 138 38 5 59 -23 80 -104z m-2116 56 c88 -8 184 -19 211 -25 28 -5 67 -12 87 -15 83 -13 181 -158 136 -203 -24 -24 -54 -11 -118 51 -50 48 -84 71 -145 97 -77 33 -85 34 -210 34 -103 1 -141 -3 -180 -17 -73 -27 -115 -47 -159 -74 -24 -15 -47 -23 -60 -19 -170 44 -196 47 -398 53 -115 3 -208 9 -208 14 0 5 9 9 20 9 11 0 37 6 57 14 35 12 74 21 218 48 103 20 364 45 474 47 62 0 186 -6 275 -14z m4956 -108 c17 -109 2 -347 -30 -491 -12 -51 -54 -148 -74 -170 -6 -6 -23 -27 -37 -46 -89 -118 -270 -272 -449 -382 -153 -94 -417 -228 -625 -318 -27 -12 -63 -28 -78 -36 -16 -8 -33 -14 -38 -14 -4 0 -32 -11 -61 -24 -29 -14 -120 -52 -203 -86 -170 -69 -169 -69 -247 -104 -31 -14 -60 -26 -63 -26 -3 0 -30 -11 -58 -24 -29 -13 -77 -34 -107 -47 -123 -53 -372 -184 -481 -254 -37 -24 -71 -40 -77 -36 -6 3 -14 34 -18 69 -6 60 -5 64 28 115 79 117 269 317 398 417 25 19 47 37 50 41 34 41 426 300 635 419 17 9 77 44 135 77 58 33 132 75 165 93 123 68 151 84 187 107 21 12 40 23 42 23 4 0 198 113 256 150 335 209 576 411 680 572 24 37 47 65 51 63 4 -3 12 -42 19 -88z m-4464 24 c16 -5 56 -17 89 -26 33 -9 78 -23 100 -30 40 -13 48 -16 135 -51 105 -42 293 -136 316 -159 20 -20 24 -34 24 -82 0 -77 -7 -85 -59 -77 -37 6 -47 13 -81 64 -97 142 -245 223 -418 226 -51 1 -99 7 -106 13 -8 6 -16 25 -20 42 -3 17 -15 44 -27 60 -20 28 -20 29 -1 29 10 0 32 -4 48 -9z m-384 -29 c112 -37 214 -116 256 -199 29 -55 52 -140 52 -187 0 -47 -16 -113 -30 -121 -5 -3 -49 26 -97 65 -103 84 -182 137 -313 212 -83 47 -132 70 -292 136 -20 9 -35 20 -31 25 8 13 128 67 150 67 10 0 25 5 33 10 27 17 211 12 272 -8z m-742 -56 c160 -26 253 -53 410 -119 306 -129 612 -364 808 -623 63 -83 132 -183 132 -190 0 -3 11 -22 24 -43 29 -45 95 -176 126 -246 11 -27 25 -59 30 -70 49 -115 108 -338 135 -511 20 -137 21 -491 0 -623 -17 -105 -42 -232 -54 -271 -5 -14 -16 -52 -26 -85 -65 -223 -183 -466 -348 -715 -69 -105 -85 -120 -123 -120 -60 0 -133 -23 -169 -53 -53 -43 -80 -93 -94 -172 -11 -59 -10 -84 3 -160 8 -49 24 -114 35 -144 11 -30 18 -57 15 -60 -3 -3 -101 -5 -217 -4 -334 3 -566 42 -927 154 -127 40 -170 56 -285 105 -89 38 -275 129 -350 172 -81 46 -276 170 -285 182 -3 4 -12 11 -21 16 -33 19 -189 145 -289 235 -116 104 -294 312 -385 449 -100 152 -178 337 -215 510 -13 62 -9 225 8 285 28 101 97 202 191 279 32 26 35 33 38 89 18 349 79 600 211 857 32 62 128 212 163 255 153 185 261 284 451 411 211 140 344 188 638 224 83 11 260 4 370 -14z m1347 -102 c142 -46 243 -130 305 -253 31 -62 33 -72 33 -176 0 -86 -4 -121 -19 -160 -32 -81 -97 -183 -158 -249 l-58 -61 -22 27 c-13 14 -49 66 -80 115 -68 105 -146 204 -230 291 l-62 64 12 44 c17 64 15 217 -3 261 -24 56 -20 70 28 92 54 25 186 28 254 5z m577 -173 c179 -121 515 -447 516 -501 0 -25 -51 -97 -77 -109 -20 -9 -23 -8 -28 17 -28 133 -74 220 -165 313 -69 70 -214 169 -246 169 -27 0 -105 40 -98 51 3 6 6 29 6 52 -1 39 4 57 14 57 3 0 38 -22 78 -49z m814 -4 c5 -38 -54 -151 -99 -192 -22 -19 -58 -44 -81 -55 -42 -19 -170 -50 -209 -50 -12 0 -63 42 -126 102 l-105 103 34 14 c88 36 359 89 528 105 51 4 55 2 58 -27z m-880 -126 c222 -71 372 -220 428 -426 32 -116 -2 -249 -86 -334 -40 -40 -60 -45 -60 -15 0 39 -76 170 -130 224 -74 74 -202 130 -295 130 -30 0 -56 3 -58 8 -3 4 6 29 19 55 13 27 30 73 39 102 17 60 20 190 5 230 -6 15 -8 31 -4 36 9 15 78 10 142 -10z m3632 -281 c0 -6 -4 -18 -9 -28 -5 -9 -17 -37 -26 -62 -10 -25 -21 -54 -25 -65 -21 -53 -108 -227 -140 -280 -20 -33 -39 -65 -41 -70 -2 -6 -30 -48 -61 -95 -75 -112 -180 -243 -288 -361 -81 -87 -98 -101 -197 -151 -95 -48 -266 -114 -388 -148 -118 -33 -291 -73 -415 -95 -47 -9 -107 -20 -135 -25 -47 -8 -174 -26 -360 -50 -44 -6 -132 -15 -195 -21 -63 -5 -145 -12 -182 -16 l-68 -6 0 50 0 50 78 50 c134 86 192 119 363 202 92 45 169 81 172 81 3 0 36 14 74 31 78 35 95 42 143 62 19 8 159 67 312 131 405 169 452 191 753 344 167 86 401 256 525 383 94 96 110 109 110 89z m-2905 -298 c-3 -3 -14 -1 -23 6 -18 12 -85 45 -115 55 -24 9 -31 33 -15 52 51 62 44 64 104 -25 31 -45 53 -84 49 -88z m-824 114 c126 -26 218 -88 283 -191 55 -86 71 -140 70 -240 -1 -78 -5 -99 -32 -158 -53 -116 -183 -224 -330 -273 -23 -8 -47 -12 -52 -9 -5 3 -12 22 -15 43 -27 171 -112 427 -202 605 l-23 47 58 63 c31 34 65 72 73 85 10 14 33 26 60 31 24 5 44 9 44 10 0 1 30 -5 66 -13z m755 -126 c154 -89 216 -263 144 -406 -64 -124 -84 -132 -128 -45 -54 109 -151 193 -278 241 l-26 10 27 35 c32 43 75 138 75 168 0 27 10 42 30 49 22 7 95 -17 156 -52z m-253 -259 c124 -40 211 -132 269 -283 16 -42 20 -77 21 -168 0 -105 -2 -121 -28 -184 -22 -53 -45 -86 -94 -136 -57 -58 -135 -111 -145 -99 -1 2 -11 38 -21 79 -21 89 -40 129 -94 198 -41 51 -172 152 -198 152 -26 0 -12 26 46 83 35 34 71 84 89 120 28 56 36 89 46 194 4 36 21 63 41 63 6 0 37 -8 68 -19z m521 -118 c49 -140 73 -227 82 -303 4 -37 3 -42 -7 -26 -30 49 -144 166 -161 166 -4 0 -17 9 -28 20 -20 20 -20 21 -2 48 27 39 49 91 56 135 11 58 30 45 60 -40z m-111 -197 c138 -90 207 -215 207 -375 -1 -77 -4 -92 -33 -147 -18 -34 -43 -75 -57 -90 -39 -45 -120 -107 -176 -137 l-52 -27 -38 38 c-62 60 -157 122 -189 122 -33 0 -15 26 45 64 66 43 132 116 164 182 50 101 69 242 45 327 -9 33 -8 42 7 58 9 10 19 19 21 19 2 0 27 -15 56 -34z m-709 -162 c253 -127 339 -379 215 -631 -79 -160 -237 -265 -393 -262 -90 2 -101 8 -100 60 1 24 6 76 12 114 29 190 35 326 22 469 -15 168 -13 200 15 204 20 3 59 19 130 53 22 10 42 19 44 19 1 0 26 -12 55 -26z m2665 -170 c-7 -9 -47 -42 -89 -72 -41 -30 -77 -58 -80 -61 -3 -4 -45 -33 -95 -65 -125 -81 -137 -90 -139 -99 0 -4 34 -23 77 -41 186 -82 390 -282 578 -571 92 -141 119 -186 119 -200 0 -21 -4 -20 -95 24 -185 91 -456 207 -680 292 -71 27 -139 53 -150 58 -11 5 -42 16 -70 26 -27 9 -59 21 -70 25 -71 32 -650 221 -840 275 -110 32 -139 46 -143 71 -5 39 12 46 134 54 161 12 517 52 609 70 28 5 95 16 150 25 55 9 116 21 135 25 19 5 71 16 115 26 44 9 100 22 125 29 25 7 56 16 70 19 42 9 121 33 200 62 41 15 91 33 110 40 41 14 48 11 29 -12z m-1722 -338 c-9 -191 -30 -262 -56 -183 -6 17 -31 56 -55 86 l-45 54 49 53 c26 29 58 74 70 99 35 73 44 49 37 -109z m-510 -17 c63 -36 136 -115 164 -178 29 -63 31 -204 4 -276 -49 -134 -178 -246 -305 -266 -58 -9 -70 2 -70 63 0 88 -30 180 -99 301 -11 21 -21 40 -21 43 0 2 15 19 33 37 73 74 133 173 151 252 4 17 14 40 22 52 16 26 33 22 121 -28z m377 -115 c30 -38 49 -77 61 -121 17 -61 17 -67 0 -129 -13 -48 -29 -77 -61 -112 -46 -53 -137 -106 -197 -117 -42 -8 -42 -7 -1 71 28 52 54 152 54 206 0 44 -26 145 -43 166 -7 9 -6 17 4 27 21 21 101 63 121 64 10 1 37 -24 62 -55z m280 36 c11 -5 55 -19 96 -31 113 -32 233 -69 255 -79 11 -4 85 -29 165 -54 80 -26 154 -51 165 -55 11 -5 40 -16 65 -24 113 -38 448 -163 525 -197 11 -4 72 -29 135 -55 63 -26 129 -53 145 -60 149 -65 306 -139 384 -179 60 -32 66 -38 105 -112 23 -44 52 -104 65 -134 13 -30 31 -73 41 -95 44 -100 120 -303 120 -322 0 -11 -29 2 -78 37 -31 22 -65 46 -76 53 -10 6 -36 24 -57 40 -45 32 -428 267 -435 267 -2 0 -21 11 -42 23 -20 13 -66 40 -102 59 -36 19 -81 44 -100 55 -19 11 -64 36 -100 55 -36 19 -85 47 -110 60 -47 26 -192 103 -370 196 -131 68 -544 275 -752 376 -86 42 -160 81 -163 86 -3 5 -3 32 1 61 l7 51 45 -7 c24 -4 54 -10 66 -15z m-13 -191 c507 -248 1007 -503 1214 -619 17 -9 59 -33 95 -52 88 -48 159 -88 195 -110 17 -10 37 -21 45 -25 8 -4 43 -24 78 -45 34 -21 64 -38 67 -38 13 0 347 -214 515 -331 63 -44 107 -87 113 -113 3 -11 13 -48 22 -81 26 -96 51 -222 47 -234 -2 -6 -11 -11 -19 -11 -43 0 -302 73 -380 106 -17 8 -36 14 -42 14 -6 0 -19 4 -29 9 -9 5 -53 24 -97 42 -95 38 -395 183 -445 214 -19 12 -66 39 -104 60 -105 58 -437 265 -456 285 -3 3 -18 14 -35 24 -85 54 -442 327 -511 391 -6 5 -60 54 -121 108 -110 98 -244 238 -277 290 -15 22 -17 38 -11 85 4 31 9 60 12 65 9 15 43 6 124 -34z m-988 -101 c23 -31 43 -71 78 -158 9 -22 14 -72 14 -136 0 -91 -3 -106 -30 -159 -56 -112 -170 -199 -317 -240 -100 -28 -373 -21 -385 11 -2 7 19 59 47 116 50 99 70 145 112 253 30 79 68 199 82 257 l6 27 108 -1 c85 0 119 4 166 21 33 11 64 25 70 31 16 16 23 12 49 -22z m1055 -280 c117 -109 310 -272 427 -359 55 -40 102 -77 105 -80 12 -15 437 -302 489 -330 20 -10 45 -25 56 -32 46 -29 116 -69 245 -140 122 -67 393 -197 411 -197 5 0 17 -4 27 -10 9 -5 33 -15 52 -23 19 -8 49 -20 65 -27 42 -17 114 -41 150 -51 17 -4 62 -16 100 -27 39 -11 98 -25 133 -32 37 -8 66 -19 71 -29 30 -58 19 -281 -18 -344 -18 -32 -2 -32 -191 -2 -190 30 -196 31 -335 70 -73 21 -237 74 -260 84 -11 5 -67 28 -125 52 -209 85 -442 218 -667 381 -67 49 -128 94 -135 101 -7 6 -52 45 -98 86 -316 277 -568 617 -712 963 -30 73 -39 105 -33 125 14 58 23 55 94 -25 37 -42 105 -112 149 -154z m-313 112 c6 -9 -62 -181 -103 -265 -25 -49 -30 -38 -35 70 -1 44 -6 87 -10 96 -6 12 4 22 40 41 26 15 57 36 68 47 23 23 31 25 40 11z m86 -117 c34 -73 113 -223 154 -291 60 -99 173 -252 269 -362 126 -144 388 -381 531 -480 28 -19 52 -37 55 -40 8 -9 174 -116 190 -123 8 -4 38 -21 65 -38 54 -33 323 -164 395 -194 25 -10 59 -24 77 -31 17 -8 36 -14 42 -14 6 0 19 -4 29 -9 33 -16 92 -35 207 -66 147 -40 217 -54 390 -80 50 -7 91 -13 93 -14 1 -1 -5 -12 -14 -26 -36 -55 -175 -137 -284 -167 -127 -36 -170 -41 -320 -41 -179 1 -270 16 -495 83 -128 38 -312 130 -470 236 -129 86 -159 110 -279 224 -290 276 -518 628 -676 1045 -23 61 -48 126 -56 145 -40 105 -40 110 7 224 24 58 45 106 46 106 2 0 22 -39 44 -87z m-265 -18 c28 -68 7 -193 -49 -288 -47 -80 -162 -167 -220 -167 -35 0 -37 7 -14 53 15 29 22 67 25 123 3 71 1 88 -22 136 -14 30 -26 57 -26 60 0 3 19 13 43 23 23 11 62 33 87 51 46 32 69 40 128 43 29 1 35 -3 48 -34z m-332 -132 c14 -21 31 -59 38 -86 23 -88 -28 -218 -117 -295 -85 -76 -189 -108 -340 -105 -113 1 -183 17 -195 44 -17 35 -37 110 -31 113 4 3 49 12 101 21 212 36 378 161 433 328 5 12 17 17 47 17 35 0 43 -4 64 -37z m-821 -304 c40 -5 83 -14 97 -20 56 -21 82 -138 47 -211 -23 -48 -71 -98 -94 -98 -17 0 -94 20 -189 50 -17 6 -42 10 -56 10 -34 0 -58 9 -58 22 0 12 150 239 165 250 12 10 4 10 88 -3z m1001 -57 c-46 -61 -228 -242 -243 -242 -9 0 -11 6 -6 18 4 9 9 49 12 87 7 110 22 127 128 140 28 4 68 17 90 29 49 28 56 17 19 -32z m-274 -153 c-17 -68 -24 -85 -52 -131 -18 -28 -49 -60 -81 -80 -93 -60 -102 -63 -149 -48 -74 22 -132 42 -148 49 -8 4 -50 18 -92 31 -43 13 -80 31 -83 38 -3 8 6 27 19 43 13 16 32 47 42 69 l18 41 46 -8 c25 -4 110 -8 190 -8 l145 1 70 34 c79 39 91 34 75 -31z m-905 -100 c127 -33 233 -65 360 -111 44 -16 140 -49 213 -73 73 -25 157 -60 185 -78 95 -61 151 -144 151 -226 l1 -46 -60 3 c-221 11 -568 148 -791 313 -60 44 -74 48 -74 19 0 -11 12 -26 29 -35 16 -8 35 -20 43 -28 40 -39 245 -152 358 -197 30 -12 64 -26 75 -30 64 -26 224 -64 334 -80 96 -14 105 -21 97 -82 -7 -54 6 -148 31 -221 11 -31 14 -50 7 -57 -18 -18 -304 49 -381 89 -10 5 -47 24 -83 41 -91 46 -95 48 -191 113 -99 65 -268 222 -337 311 -67 88 -75 96 -89 96 -26 0 -12 -30 48 -104 193 -241 463 -436 724 -523 115 -38 222 -63 274 -63 39 0 41 -1 52 -42 13 -50 5 -143 -16 -174 -31 -48 -243 -44 -384 6 -264 93 -535 355 -740 715 -51 89 -79 114 -73 65 3 -30 123 -224 206 -335 79 -106 222 -252 321 -329 44 -35 87 -66 95 -69 8 -4 31 -17 50 -28 53 -32 177 -76 254 -90 41 -7 105 -9 157 -6 85 5 89 5 79 -13 -16 -31 -73 -69 -126 -85 -184 -56 -462 51 -728 279 -72 62 -217 229 -279 323 -65 98 -121 208 -147 289 -12 38 -26 79 -31 92 -5 13 -9 70 -9 127 0 79 4 114 19 147 20 47 69 95 104 103 12 2 31 6 42 9 29 7 182 -3 230 -15z m-2196 -124 c22 -13 71 -40 110 -60 68 -35 111 -74 111 -101 0 -7 23 -58 50 -113 79 -156 181 -283 298 -372 52 -39 61 -50 47 -55 -21 -8 -110 18 -185 54 -138 66 -291 209 -362 337 -48 87 -65 125 -82 180 -10 33 -23 70 -27 83 -10 25 -12 72 -4 72 3 0 23 -11 44 -25z m324 -164 c23 -11 77 -34 119 -51 65 -27 82 -39 116 -83 45 -60 129 -148 187 -196 48 -40 140 -101 153 -101 5 0 17 -10 28 -21 19 -21 19 -22 -5 -38 -42 -28 -114 -51 -160 -51 -110 0 -336 217 -449 432 -43 81 -58 128 -42 128 6 0 29 -9 53 -19z m315 -120 c9 -5 44 -17 77 -26 33 -10 71 -22 85 -26 14 -5 48 -14 75 -19 102 -22 122 -27 133 -34 25 -15 8 -152 -23 -186 -17 -18 -18 -18 -56 6 -21 13 -41 24 -44 24 -31 0 -285 231 -285 259 0 13 14 14 38 2z"/> <path d="M710 4080 c-82 -15 -161 -80 -220 -179 -49 -82 -67 -134 -86 -236 -18 -103 -18 -172 1 -263 36 -174 117 -259 236 -250 46 3 66 11 101 38 135 104 211 295 212 535 2 257 -87 385 -244 355z m138 -146 c91 -63 49 -264 -50 -239 -43 11 -63 53 -63 128 0 65 2 70 33 98 37 33 49 35 80 13z"/> <path d="M2181 3871 c-44 -12 -76 -29 -130 -69 -115 -85 -183 -214 -212 -399 -16 -106 7 -246 57 -351 83 -172 253 -275 401 -243 93 21 143 49 214 120 114 114 163 245 163 436 -1 105 -4 130 -28 200 -68 194 -196 304 -360 311 -39 2 -86 -1 -105 -5z m315 -186 c62 -40 80 -119 43 -185 -28 -49 -66 -70 -127 -70 -43 0 -56 5 -85 33 -42 40 -60 95 -45 140 13 39 63 94 92 101 36 8 96 -1 122 -19z"/> <path d="M901 3120 c-19 -11 -8 -93 16 -124 46 -60 135 -74 203 -31 48 30 52 31 76 4 26 -29 98 -59 142 -59 80 1 162 65 162 127 0 37 -18 35 -39 -4 -24 -49 -48 -69 -90 -77 -76 -14 -147 20 -188 89 -11 19 -13 18 -46 -16 -80 -84 -207 -52 -207 52 0 41 -8 52 -29 39z"/> </g> </svg>`);

    const cuteCrab = parseSvg(`<?xml version="1.0" standalone="yes"?> <svg xmlns="http://www.w3.org/2000/svg" width="962" height="494" stroke-width="4px"> <path style="stroke:#131111; fill:none;" d="M379 93C358.171 94.6439 340.106 97.5907 324.3 79.9606C300.632 53.561 314.441 7.05203 351 2.28937C372.655 -0.531677 393.281 10.5499 401.547 31C406.898 44.2377 406.247 59.9645 398.084 72C389.788 84.2314 378.097 87.1267 380.289 104C382.702 122.568 388.37 143.594 399.428 159C403.877 165.198 420.697 177.166 419.573 184.985C417.902 196.615 402.832 185.039 399 181.711C382.824 167.663 375.041 149.913 363 133C345.17 145.953 323.162 153.103 304 163.861C279.076 177.854 255.796 195.604 229 206M575 124C576.068 125.953 578.498 118.583 579 117C581.207 110.04 583.319 101.227 581.278 94C579.04 86.076 570.425 81.8458 565.389 75.9722C555.67 64.6382 553.705 48.1253 557.694 34C567.429 -0.470337 616.067 -7.57947 638.917 18C655.188 36.2155 651.093 67.3297 633 82.7778C626.316 88.4845 613.717 89.7904 608.5 96.25C606.28 98.9992 606.413 103.682 605.583 107C603.731 114.408 598.09 124.426 598.333 131.972C598.52 137.757 616.29 144.769 621 147.222C642.593 158.469 665.618 167.887 686 181.333C690.992 184.626 703.486 195.822 710 193.194C714.648 191.32 715.315 185.185 716.361 181C719.014 170.388 721.284 158.879 728 150C736.196 155.034 749.919 169.114 759 163L738 141C747.267 130.661 764.453 128.56 777 123.808C793.431 117.585 811.35 111.298 829 110.09C872.842 107.087 907.809 136.765 935 167M595 44.5725C605.664 41.509 619.73 51.028 617.566 63C616.192 70.5991 607.81 75.3326 601 77.2145C581.099 82.7144 578.213 49.3947 595 44.5725M354 46.5324C373.251 42.8979 383.534 76.9059 362 80.517C342.253 83.8284 331.677 50.7469 354 46.5324M596.133 66.1751C599.61 64.6724 602.105 69.8268 598.682 71.493C594.67 73.4458 591.907 68.002 596.133 66.1751M357.333 68.0463C360.742 65.8191 364.92 70.4053 361.443 73.0339C358.149 75.5243 353.559 70.5121 357.333 68.0463M582 93L608 96M353 98L364 132M222 141C217.464 144.994 212.211 148.377 208.278 153.005C205.745 155.985 203.713 161.028 199.866 162.523C193.158 165.131 182.392 158.629 176 156.708C160.985 152.196 145.472 148.629 130 146.074C123.83 145.055 115.747 146.554 110.005 144.37C101.26 141.045 102.528 118.27 108.477 112.755C113.491 108.105 125.007 110.216 131 111C152.778 113.848 175.486 120.672 196 128.412C202.961 131.039 210.138 133.122 217 136.005C218.683 136.712 223.019 138.246 222 140M387 124C402.247 122.669 417.802 116.165 433 113.424C465.956 107.48 500.151 109.032 533 114.75C546.214 117.05 561.172 118.277 573 125M121 111L113 141M840 112L846.576 135L847.096 143.4L824 147.211L760 164M106 143C90.8489 155.449 66.2645 157.584 48 163.667C44.1667 164.943 30.8165 171.281 28.2415 165.682C25.3638 159.425 39.1771 148.64 43 145.286C60.6378 129.815 83.3625 116.053 107 113M855 114C855.025 123.014 863.51 142.591 849 144M575 126C574.667 141.643 563.203 154.704 553.579 166C549.517 170.768 541.731 177.299 541.333 183.996C540.535 197.438 557.354 184.882 561 181.711C576.769 167.996 584.159 149.072 598 134M224 140C240.921 146.699 242.477 177.278 248 192M728 150C729.645 144.51 732.511 142.323 738 141M857 146C874.245 152.603 892.494 157.038 910 163.003C917.378 165.517 925.5 169.982 933 166M232 149C225.59 154.754 211.915 158.596 210.14 168C207.659 181.149 222.849 190.754 224.576 203C226.223 214.675 205.184 220.926 197 224.2C194.057 225.377 190.253 227.693 187 227.492C182.833 227.235 179.416 222.541 176 220.479C170.919 217.413 164.836 215.786 159 215M201 163L209 167M751 170C747.66 181.572 736.107 191.224 737.062 204C737.578 210.889 746.238 218.251 753 214.243C761.471 209.222 768.564 198.799 776 192.174C778.645 189.817 783.136 185.18 786.985 185.306C793.909 185.534 800.524 200.392 802.236 206C803.501 210.144 803.471 217.212 809.946 213.816C818.503 209.329 813.125 185.683 806.49 181.028C801.811 177.745 793.141 181.452 789 184M43 207C69.3114 191.498 103.086 186.03 133 181.87C145.914 180.073 159.996 177.675 172 184C167.734 188.887 162.914 193.887 160.479 200C158.722 204.411 159.25 210.279 154.867 213.221C150.241 216.326 140.564 216.799 135 218.424C118.205 223.331 101.374 227.991 85 234.192C77.7008 236.957 64.8365 244.385 57.0432 243.611C48.7902 242.792 46.422 223.238 45.2454 217C44.7924 214.598 43.0822 211.1 44 209M809 180C821.522 180.001 833.702 182.842 846 184.919C868.784 188.766 894.602 191.822 914 205.44C929.117 216.053 939.232 231.703 947.244 248C953.389 260.499 958.299 274.191 960.271 288C960.932 292.628 962.058 300.823 958.262 304.549C954.308 308.429 947.524 299.594 945.3 297C937.632 288.055 932.587 277.223 925.331 268C921.705 263.391 914.971 258.935 913.558 253C912.175 247.189 918.199 244.23 921.532 240.7C926.034 235.932 928.414 229.438 932 224M153 181C150.763 191.838 145.921 201.794 148 213M173 184C185.185 192.76 197.479 202.525 206 215M714 196L732 206M189 253C192.918 256.423 205.036 264.51 203.462 270.786C202.366 275.155 193.58 276.376 190 277.424C179.166 280.597 157.107 291.602 146.015 285.971C140.492 283.168 122.726 263.24 130.333 256.854C134.521 253.338 141.938 254 147 254C160.534 253.999 175.19 257.998 188 253C184.097 246.771 179.768 241.626 182 234C196.806 243.642 219.219 239.319 236 238.089C287.183 234.337 337.557 217.519 388 208.424C451.497 196.976 514.62 197.993 578 209.424C629.916 218.788 682.099 236.644 735 238.961C745.904 239.438 764.275 242.132 773.966 236.442C779.329 233.294 776.561 228.459 779.603 224.105C784.037 217.76 794.766 215.315 802 215M917 208C916.119 214.935 915.278 222.397 912.91 229C910.348 236.142 905.352 241.373 909 249M1 292C9.04043 266.574 10.8256 245.117 28.8156 223.715C33.2915 218.39 35.3386 212.132 42 209M815 216L902 244M756 219L774 228M29 224C32.4249 229.849 34.3558 235.887 39.0934 240.996C41.6243 243.725 46.9826 246.937 47.1721 251.039C47.4423 256.888 39.6163 263.113 36.0895 267C26.8399 277.194 17.2704 304.598 2 306L1 303M183 228L184 229M184 230L182 234M780 235C782.447 247.725 769.439 253.925 762.325 262.039C758.921 265.921 756.375 271.119 751 272.566C740.736 275.328 727.053 272.219 716 274.081C677.902 280.499 642.625 298.557 620.347 331C606.076 351.783 601.216 374.554 597.424 399C596.684 403.773 591.707 423.312 601.044 422.914C608.37 422.601 617.664 409.58 623 405.001C635.513 394.262 648.215 388.22 664 384C669.063 410.036 632.447 437.176 613 447.511C604.858 451.838 588.984 454.551 586.449 465C582.964 479.368 612.581 485.269 622 487.848C658.133 497.741 705.185 497.65 737 475C731.996 470.888 724.233 468.485 721.742 461.999C717.708 451.493 726.27 440.049 733.089 433.039C749.258 416.421 778.839 402.872 799 420C781.249 442.368 762.734 460.411 738 475M432 238C436.338 253.279 443.956 265.905 459 272.687C486.384 285.032 524.773 269.364 529 238M53 245L51 250M774 253C790.223 262.938 814.608 249.227 833 257C829.818 266.32 823.907 282.288 813.826 286.396C809.551 288.138 802.405 286.171 798 285.385C784.507 282.979 766.256 278.944 755 271M833 257L849 265L823 293L816 287M145 286L137 293L111 265C116.09 260.818 121.369 258.304 128 258M36 382C31.7486 404.9 37.9688 432.213 47.7809 453C52.2458 462.459 56.9782 471.592 67 476C73.4215 457.031 67.7646 436.438 70.2894 417C71.1816 410.13 76.1114 397.882 71.6821 391.514C69.1524 387.877 62.7687 389.132 59 388.961C51.2344 388.607 41.22 385.147 38.6528 376.999C35.2719 366.269 42.0325 350.916 47.6952 342C60.2591 322.217 75.4098 303.508 90.9498 286C97.3396 278.801 103.07 270.586 111 265M850 265C865.242 279.039 877.676 294.837 890.6 311C903.022 326.534 916.445 343.656 922.279 363C929.353 386.46 926.997 411.986 919.333 435C914.192 450.439 908.906 466.205 895 476C890.369 468.44 892 458.573 892 450C892 433.784 892.221 417.014 889.385 401C882.149 360.14 853.136 320.885 824 293M205 270C212.355 274.506 219.857 271.395 228 272.17C245.859 273.869 263.146 277.47 280 283.681C285.946 285.872 294.525 287.711 298.447 293.105C301.216 296.914 299.736 301.869 298.572 306C295.841 315.693 292.82 324.991 291.275 335C287.408 360.048 291.37 389.602 305.749 411C316.013 426.274 331.434 439.666 348 447.741C355.819 451.552 372.407 455.022 374.522 465.001C377.42 478.667 348.017 484.999 339 487.573C302.922 497.868 254.789 497.631 223 475C228.749 470.273 237.006 467.483 239.848 460C242.439 453.178 237.35 445.232 233.319 440C222.828 426.384 205.317 414.545 188 412.289C182.194 411.533 163.874 411.417 163.113 420.093C162.526 426.792 174.756 437.635 179.015 442C184.144 447.258 189.35 452.382 195 457.079C203.172 463.875 212.651 471.956 223 475M165 289C158.184 299.102 150.754 308.362 146.695 320C135.504 352.087 142.126 392.643 162 420M796 289C801.818 301.448 811.061 311.857 815.655 325C826.31 355.484 817.676 393.293 799 419M136 293C109.814 319.186 87.0664 354.714 73 389M301 297C321.787 298.815 332.744 319.393 341.245 336C345.159 343.647 350.175 356.1 359.004 358.826C415.832 376.377 475.194 380.153 534 373.834C557.755 371.282 581.355 360.488 605 360M661 299C665.482 322.112 682.027 363.776 664 384M0 302L1 303M355 358L357 366L363 360M41 360C52.1078 369.196 63.0005 372.096 76 377M175.004 365.533C186.7 362.656 199.764 370.982 206.442 380C211.691 387.089 211.788 397.262 201.999 400.347C190.218 404.06 175.94 394.593 169.995 385C165.749 378.149 165.758 367.808 175.004 365.533M777 365.465C787.343 363.651 797.504 371.115 792.326 382C787.702 391.722 776.603 399.298 766 400.696C755.517 402.078 747.297 393.034 752.05 383C756.534 373.535 766.932 367.231 777 365.465M357 366C358.096 379.415 363.266 392.586 365.13 406C365.845 411.142 367.384 418.905 361.867 422.15C356.257 425.449 349.381 416.34 346 413.004C331.165 398.37 316.388 392.141 298 384M236.005 402.742C252.025 396.522 276.101 423.849 254 431.866C238.313 437.556 217.348 409.986 236.005 402.742M715 402.468C739.173 397.909 731.427 429.462 713 432.517C703.528 434.087 695.912 425.12 698.649 416C700.858 408.637 707.695 403.845 715 402.468"/> </svg>`);

    const cuteTurtle = parseSvg(`<?xml version="1.0" standalone="yes"?> <svg xmlns="http://www.w3.org/2000/svg" width="394" height="290" stroke-width="2px"> <path style="stroke:#010101; fill:none;" d="M217 24C212.867 27.9076 199.27 30.4698 197.697 35.1443C195.663 41.1866 204.958 50.9448 199.512 56.1574C196.173 59.3539 189.253 60.6973 185 62.3997C176.448 65.8232 168.289 69.9686 161 75.6682C145.247 87.9859 140.534 104.043 129 119C115.65 111.876 96.5232 118.65 82 116.949C77.0729 116.372 68.9386 112.258 64.213 114.317C55.9651 117.912 50.9474 136.311 47.7299 144C46.5185 146.895 43.5612 151.635 44.6165 154.852C45.7254 158.232 51.114 158.607 54 159.499C61.1104 161.699 76.1377 162.863 81.5123 167.854C85.511 171.567 81 192.064 81 198C68.7368 197.473 59.2142 194.197 48 189.936C43.3326 188.163 37.6144 187.115 36 182C22.8736 179.915 16.0614 162.496 22.3032 151.044C24.642 146.753 30.1909 146.416 32.1103 141.942C36.2719 132.241 36.2015 121.797 41.2585 112C45.0988 104.56 50.9918 102.712 55.5 96.7253C63.8149 85.6841 71.0033 74.9934 81.1698 65.2901C84.3581 62.247 89.1612 61.1288 92.0772 58.1466C94.8711 55.2892 95.6015 51.6244 99.0432 49.0432C117.184 35.4381 142.087 27.0092 164 22.6003C178.606 19.6616 204.625 13.5005 217 24M217 24L248 26L242 34C249.16 37.3491 266.997 49.3973 274.87 45.8017C279.891 43.5086 278.971 38.224 274.951 35.7963C267.129 31.0718 257.048 27.2194 248 26M238 26L242 34M148 30C148.31 39.4543 154.785 37.2254 162 37.0139C173.748 36.6694 185.225 34 197 34M150 37L120.603 61.3002L117.866 81L109 115M281 40C322.756 54.5084 348.436 96.3136 361.569 135.895C362.977 140.141 367.906 141.287 370.956 144.133C377.7 150.425 377.332 160.062 371.66 166.996C366.987 172.71 349.487 186.691 342.059 183.872C340.115 183.134 338.876 181.973 338.318 179.941C337.032 175.256 331.725 157.246 333.978 153.303C335.846 150.036 342.78 148.83 346 147L333.965 116L330.555 104.104L341 94M275 47C280.146 53.2661 288.601 54.2633 293.146 59.5139C298.136 65.2792 295.277 74.6011 298.599 81C303.815 91.0493 313.483 98.6854 318.08 109C324.035 122.361 323 139.732 323 154L332 154M301 52L295 57M202 55C219.95 55 238.515 52.4937 256 58.0285C269.418 62.2761 282.26 74.7914 296 76M93 59L119 63M55 99L64 113M318 108L329 105M277.019 116.576C289.152 113.108 297.014 131.431 284.981 135.347C272.481 139.415 264.928 120.033 277.019 116.576M170.058 117.742C181.844 112.841 190.526 130.337 178.956 135.282C167.65 140.115 159.36 122.191 170.058 117.742M129 119C128.865 135.255 125.723 154.23 132.585 169.791C136.056 177.663 145.047 185.879 150.985 192C154.039 195.15 156.439 200.47 160.213 202.686C166.137 206.165 175.377 206.846 182 209M213 124C220.148 136.054 235.414 138.734 242 124M102 131L102.576 159L100.682 168.968L84 169M362 139L346 147M32 145L42 152M322 155L310.748 179L308.212 188.397L316 189.41L338 185M44 158L36 182M103 171L131 172M347 186C347.017 212.43 362.09 261.897 320 262.871C315.23 262.982 309.366 261.525 305 259.64C297.495 256.401 290.588 249.75 286.105 243C284.171 240.089 282.641 232.77 278.856 231.933C272.701 230.571 261.253 239.489 255 241.254C238.203 245.995 221.303 246.007 204 246C196.036 245.997 179.962 247.542 180 237M35 187C33.5175 203.98 22.0505 221.964 34.5571 237.96C43.7731 249.747 79.1301 248.549 82.4576 231.001C83.5176 225.41 76.4501 221.913 73 218.826C65.9753 212.541 61.7542 206.477 61 197M307 189L272 207M82 199C100.511 201.352 118.287 204 137 204C143.933 204 152.187 206.133 158 202M116 204C115.199 222.605 105.542 239.123 112.559 258C119.429 276.481 145.186 280.916 159.999 269.471C168.988 262.526 173.104 252.261 179 243M84 230L109 237"/> </svg> `);

    const newLevel = parseSvg(`<?xml version="1.0" standalone="no"?> <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 20010904//EN" "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd"> <svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="932.000000pt" height="138.000000pt" viewBox="0 0 932.000000 138.000000" preserveAspectRatio="xMidYMid meet"> <metadata> Created by potrace 1.16, written by Peter Selinger 2001-2019 </metadata> <g transform="translate(0.000000,138.000000) scale(0.100000,-0.100000)" fill="#000000" stroke="none"> <path d="M8510 1357 c-53 -17 -103 -74 -124 -141 -29 -92 -18 -249 33 -453 59 -236 77 -273 138 -273 43 0 68 26 88 92 34 116 95 377 103 449 20 165 -30 287 -135 325 -45 15 -56 16 -103 1z m143 -78 c49 -38 65 -164 22 -164 -15 0 -24 12 -35 46 -8 25 -25 58 -37 74 -13 15 -23 33 -23 40 0 31 37 33 73 4z"/> <path d="M9068 1360 c-59 -18 -97 -51 -125 -108 -26 -54 -28 -65 -27 -182 0 -114 4 -141 48 -315 26 -105 55 -205 66 -223 34 -55 107 -56 136 -1 23 45 111 400 123 496 13 107 0 188 -43 251 -46 69 -116 101 -178 82z m120 -76 c34 -23 52 -67 52 -124 0 -48 -2 -51 -22 -48 -17 2 -27 15 -38 49 -8 25 -25 58 -37 74 -23 28 -28 46 -16 58 11 12 37 8 61 -9z"/> <path d="M1142 1310 c-26 -11 -52 -65 -52 -110 0 -24 -6 -32 -34 -44 -38 -16 -59 -46 -50 -70 6 -15 13 -18 65 -30 31 -7 35 -20 45 -162 6 -85 4 -101 -10 -113 -22 -19 -20 -47 6 -65 21 -15 22 -25 26 -164 l4 -148 -40 -18 c-60 -27 -86 -59 -85 -103 2 -56 29 -73 117 -73 39 0 125 -7 191 -15 154 -20 299 -23 347 -6 71 24 116 105 103 189 -8 57 -61 114 -120 131 -62 17 -183 13 -270 -9 -43 -11 -80 -20 -82 -20 -6 0 -1 175 6 200 6 23 13 25 83 31 89 8 148 33 166 72 19 39 8 74 -31 98 -28 18 -44 20 -124 16 l-93 -4 -2 53 c-1 30 -2 62 -2 71 -1 16 14 18 169 18 155 0 174 2 211 22 39 21 64 56 64 92 0 29 -36 67 -82 87 -53 21 -230 22 -325 1 -69 -15 -72 -14 -93 26 -13 26 -57 58 -77 56 -4 0 -18 -4 -31 -9z m475 -105 c52 -15 90 -46 78 -64 -9 -15 -41 -14 -73 3 -15 7 -45 16 -66 19 -43 7 -61 24 -44 44 14 17 43 16 105 -2z m-106 -355 c24 -13 25 -40 2 -40 -38 0 -63 13 -63 31 0 21 29 25 61 9z m139 -397 c45 -18 80 -51 80 -75 0 -29 -30 -34 -71 -10 -21 12 -47 22 -59 22 -35 0 -60 19 -60 45 0 45 32 50 110 18z"/> <path d="M4006 1305 c-84 -30 -136 -112 -157 -246 -18 -120 -6 -551 19 -666 45 -206 115 -286 277 -314 83 -14 172 -7 296 25 163 42 208 63 266 123 l52 54 15 -29 c19 -37 32 -42 114 -42 37 0 121 -7 187 -16 184 -23 312 -23 360 2 60 31 79 64 83 142 3 57 0 72 -20 101 -38 57 -79 75 -183 79 -70 3 -111 -1 -175 -17 -46 -11 -86 -19 -89 -16 -9 10 0 200 11 212 6 7 32 13 60 13 69 0 133 18 163 46 48 45 24 124 -43 141 -13 3 -59 3 -102 0 l-79 -5 -6 53 c-12 95 -20 91 145 86 160 -4 212 5 259 45 33 27 41 55 28 96 -20 64 -150 97 -298 78 -188 -24 -172 -25 -191 8 -24 45 -61 66 -95 55 -33 -11 -63 -63 -63 -110 0 -26 -6 -34 -37 -50 -60 -29 -58 -92 2 -93 42 -1 48 -14 59 -138 11 -110 10 -122 -6 -142 -24 -29 -23 -46 5 -65 21 -15 22 -23 25 -164 l4 -148 -33 -13 c-18 -8 -48 -27 -67 -44 -27 -24 -35 -27 -43 -15 -5 8 -9 20 -9 27 0 25 -39 69 -74 86 -19 9 -59 16 -93 16 -76 0 -147 -34 -258 -124 -44 -36 -90 -65 -102 -66 -13 0 -23 2 -23 5 0 3 11 61 24 128 45 224 74 572 57 676 -20 120 -84 209 -166 230 -53 13 -51 13 -99 -4z m143 -81 c50 -35 85 -186 46 -200 -24 -10 -43 13 -59 71 -9 29 -23 58 -31 65 -60 50 -19 108 44 64z m1218 -19 c52 -15 90 -46 78 -64 -9 -15 -45 -13 -75 4 -14 8 -39 14 -56 15 -16 0 -39 6 -49 14 -16 12 -17 16 -6 30 17 20 43 20 108 1z m-106 -355 c25 -14 25 -40 0 -40 -37 0 -71 18 -65 35 7 17 37 20 65 5z m122 -390 c30 -11 64 -31 76 -44 47 -49 -1 -87 -58 -47 -16 12 -41 21 -55 21 -24 0 -66 30 -66 48 1 17 14 29 47 41 1 1 26 -8 56 -19z m-726 -82 c20 -21 27 -44 24 -75 -2 -26 -49 -13 -80 22 -44 51 -41 75 9 75 15 0 36 -10 47 -22z"/> <path d="M6683 1308 c-24 -11 -39 -42 -49 -101 -5 -31 -13 -42 -41 -55 -58 -28 -54 -92 7 -92 15 0 32 -6 38 -12 5 -7 15 -66 21 -131 11 -112 10 -120 -8 -143 -22 -28 -18 -49 10 -65 17 -9 19 -23 19 -160 l0 -150 -44 -19 c-51 -22 -76 -53 -76 -95 0 -54 33 -75 121 -75 41 0 129 -7 194 -16 275 -36 382 -19 425 70 43 91 14 192 -67 232 -54 27 -200 31 -284 9 -35 -10 -75 -20 -88 -23 l-24 -5 7 109 c4 60 12 112 18 115 5 3 43 9 83 12 140 10 204 81 141 154 -24 27 -27 28 -128 29 l-103 1 -3 71 -3 71 143 -6 c213 -9 298 23 298 112 0 37 -27 66 -85 91 -51 22 -220 23 -318 1 l-68 -15 -25 39 c-14 22 -36 44 -50 49 -30 12 -33 12 -61 -2z m513 -117 c31 -14 44 -26 44 -40 0 -26 -34 -28 -76 -6 -16 8 -41 15 -55 15 -36 0 -64 23 -55 45 5 15 14 17 52 11 25 -3 66 -15 90 -25z m-138 -343 c24 -24 14 -41 -20 -34 -38 7 -53 20 -44 35 9 15 49 14 64 -1z m143 -399 c50 -25 69 -46 69 -75 0 -29 -33 -33 -68 -8 -13 9 -44 21 -70 27 -38 10 -48 17 -50 36 -8 51 41 59 119 20z"/> <path d="M7595 1308 c-90 -32 -148 -126 -165 -268 -24 -196 -6 -545 35 -703 33 -129 99 -210 199 -244 122 -42 369 -9 543 73 84 40 114 76 120 143 4 36 0 53 -19 81 -37 54 -80 72 -165 67 -83 -5 -133 -30 -255 -130 -108 -87 -124 -77 -93 56 31 136 58 390 59 563 l1 171 -35 69 c-53 104 -142 153 -225 122z m150 -101 c54 -54 72 -187 26 -187 -25 0 -38 18 -49 67 -5 23 -23 59 -40 79 -24 29 -29 41 -21 56 15 27 47 22 84 -15z m495 -827 c25 -25 36 -68 21 -83 -27 -27 -119 50 -104 89 8 21 60 17 83 -6z"/> <path d="M1955 1296 c-60 -27 -95 -93 -95 -181 0 -30 11 -112 25 -182 13 -71 31 -186 40 -258 47 -402 68 -465 164 -515 40 -21 117 -14 166 15 65 38 89 72 206 296 58 112 110 204 116 206 21 7 31 -32 42 -172 12 -156 34 -249 75 -319 50 -85 141 -122 202 -81 56 36 134 204 264 565 46 126 53 158 57 240 5 84 3 102 -17 148 -43 100 -121 140 -204 104 -86 -39 -110 -98 -187 -457 -33 -157 -48 -191 -72 -165 -7 8 -19 40 -27 70 -46 196 -107 258 -205 210 -51 -25 -87 -67 -139 -162 -38 -68 -58 -86 -74 -65 -5 7 -14 98 -21 202 -12 208 -25 277 -72 372 -33 69 -81 114 -138 132 -48 14 -69 14 -106 -3z m160 -90 c29 -29 44 -94 24 -106 -18 -12 -60 12 -98 55 -34 40 -36 46 -19 63 20 20 67 14 93 -12z m998 -116 c34 -27 52 -89 33 -109 -12 -12 -19 -11 -50 8 -42 27 -76 67 -76 92 0 33 55 39 93 9z"/> <path d="M6397 1293 c-32 -8 -57 -80 -93 -265 -19 -101 -46 -241 -60 -313 -25 -129 -73 -294 -100 -347 -20 -39 -51 -37 -69 5 -23 56 -53 223 -70 397 -20 207 -37 287 -72 351 -38 70 -81 101 -148 107 -43 3 -61 0 -89 -17 -111 -69 -120 -342 -21 -621 73 -203 178 -349 290 -402 126 -59 230 -26 290 92 66 130 102 273 170 676 37 219 43 277 35 300 -10 26 -28 45 -40 43 -3 -1 -13 -3 -23 -6z m31 -84 c4 -31 -19 -44 -49 -29 -19 11 -26 40 -12 54 4 4 19 6 33 4 19 -2 26 -10 28 -29z m-599 -85 c66 -59 93 -165 44 -172 -18 -3 -28 8 -52 57 -17 33 -40 65 -50 71 -25 13 -36 47 -21 65 19 23 36 18 79 -21z"/> <path d="M663 1259 c-42 -12 -97 -79 -114 -137 -21 -70 -16 -193 16 -413 28 -196 28 -229 1 -229 -39 0 -53 46 -131 420 -24 116 -46 196 -66 237 -75 156 -210 157 -278 3 -37 -85 -51 -188 -63 -469 -12 -297 -6 -387 31 -460 24 -46 74 -90 104 -93 72 -5 107 15 138 79 20 42 21 55 15 169 -6 112 -5 125 11 131 10 4 20 1 25 -8 5 -8 29 -48 53 -90 59 -100 151 -208 200 -236 61 -35 101 -30 144 15 42 44 60 96 95 277 63 329 58 648 -12 744 -41 56 -106 79 -169 60z m108 -68 c21 -22 29 -39 29 -65 0 -41 -10 -44 -55 -16 -53 33 -83 91 -52 103 28 12 50 5 78 -22z m-482 -15 c24 -25 46 -90 36 -106 -13 -21 -44 -8 -84 35 -38 41 -50 72 -34 88 15 15 61 6 82 -17z"/> <path d="M8485 366 c-88 -39 -120 -143 -72 -236 30 -61 76 -90 142 -90 37 0 62 6 86 23 41 27 79 98 79 147 0 49 -38 120 -79 147 -39 26 -108 30 -156 9z m180 -91 c15 -34 20 -86 9 -98 -13 -12 -43 13 -49 42 -3 17 -16 42 -27 56 -16 20 -17 29 -8 40 17 21 55 0 75 -40z"/> <path d="M9025 364 c-46 -24 -63 -43 -81 -90 -29 -77 2 -174 70 -215 44 -27 123 -25 167 4 41 27 79 98 79 147 0 49 -38 120 -79 147 -41 27 -111 31 -156 7z m176 -78 c18 -30 26 -96 13 -109 -13 -12 -43 13 -49 42 -3 17 -16 42 -27 56 -15 20 -17 29 -9 39 17 20 50 7 72 -28z"/> </g> </svg>`);

    const cuteHorse = parseSvg(`<?xml version="1.0" standalone="yes"?> <svg xmlns="http://www.w3.org/2000/svg" width="680" height="678" stroke-width="3px"> <path style="stroke:#010101; fill:none;" d="M194 81C178.819 69.1814 174.449 44.881 179.721 27C181.651 20.4525 184.788 7.53992 194 8.63812C212.851 10.8854 223.296 36.1059 225.572 52C226.239 56.6599 224.131 65.5754 227.028 69.412C230.098 73.4788 239.604 76.1108 244 79.2091C253.305 85.7678 260.965 95.3785 266.934 105C288.18 139.243 284 181.593 284 220C284 246.877 287.061 276.04 311 292.957C317.814 297.772 329.289 303.802 338 301.681C341.734 300.772 344.098 297.351 348 296.893C357.112 295.824 367.077 298.396 375.961 294.968C388.942 289.957 395.113 271.669 392.772 259.004C390.437 246.376 380.104 260.903 374 261.782C365.043 263.074 359.087 255.691 356.523 248C352.295 235.319 355.31 219.234 354.985 206C354.218 174.677 350.991 140.853 330 116M181 65C164.64 76.5569 137.351 97.3989 116 92.6104C93.2695 87.5125 77.3884 53.6062 103 40C105.085 45.9967 107.906 53.8159 115.91 49.5424C122.564 45.9894 126.399 36.5596 131.428 31.0895C142.896 18.6174 165.158 7.01208 182 16M214 21C236.737 14.2791 269.557 27.6832 288 40.3472C293.571 44.1726 311.86 56.1483 308.353 64.6829C307.377 67.0589 303.083 67.8598 301 69C311.553 82.217 328.595 89.3466 339.331 103C345.21 110.476 348.793 119.691 336 120M195 27C208.192 43.043 207.569 59.7893 206 79M293 65L300 68M225 71L222 83M154 97C161.583 91.8383 168.658 92.8336 176 98M120 94C119.368 100.169 115.902 105.329 113.604 111C105.757 130.369 100.644 140.405 81 149.738C65.6659 157.024 47.936 154.951 39.3279 173C32.5921 187.124 36.0487 203.88 40.2785 218C41.5432 222.222 41.1411 228.322 44.3179 231.606C48.7418 236.18 57.0165 236.876 63 237C67.3914 252.643 87.8483 252.91 100 247.485C117.151 239.829 129.695 223.96 149 219.529C159.356 217.153 170.604 221.783 181 222.1C210.546 223 238.101 209.126 243 178M160 110.65C171.107 107.349 179.737 119.682 182.235 129C185.48 141.102 177.799 152.162 166 155.66C161.396 157.024 155.654 159.273 151.044 156.821C136.051 148.845 146.142 114.769 160 110.65M145 138C155.974 138.092 160.903 144.194 161 155M59 173C64.4057 169.436 68.0159 170.022 73 174M65 185L63 187M64 236C80.4784 234.654 88.1072 224.555 101 217L102 218L104 220M180 223C179.453 235.699 175.144 248.619 172.424 261C166.391 288.466 160.137 316.778 160.001 345C159.934 358.904 160.505 373.518 164.151 387C165.53 392.1 171.442 402.746 169.508 407.775C167.418 413.209 153.038 417.002 148 419.309C129.564 427.75 104.671 435.453 89.0934 448.529C76.3432 459.232 75.6316 481.698 81.4537 496C93.7294 526.155 121.985 550.406 149 567C158.9 554.719 168.212 542.14 170.05 526C170.483 522.203 172.183 516.878 170.535 513.213C166.61 504.482 142.372 501.43 146.785 488.004C148.716 482.132 155.738 479.996 161 478.347C174.884 473.997 189.791 472.939 204 469.997C207.899 469.19 217.607 468.765 220.096 465.411C222.95 461.566 218.055 455.257 214.906 453.376C195.269 441.648 185.326 425.85 171 409M462 289C486.945 252.741 541.365 252.592 567.079 288C580.953 307.103 581.27 329.899 591.89 350C595.067 356.012 599.816 362.382 606 365.547C608.986 367.076 617.056 366.765 618.289 370.317C622.875 383.531 595.902 382.297 599.525 394.001C603.117 405.605 613.604 411.945 625 414.192C631.669 415.507 644.828 409.319 643.709 420.001C638.492 469.806 573.377 506.264 536.326 461.999C532.447 457.365 525.253 449.707 523.573 443.985C518.138 425.479 526.438 403.722 525.985 385C525.278 355.764 510.014 320.803 487 302.669C464.789 285.168 445.287 285.857 419 290.247C408.214 292.048 389.042 299.152 379 294M332 289L344 299M344 299L350 302M211 404L216 453M399 413C399.491 423.747 403.618 435.144 407.746 445C409.253 448.597 413.831 454.544 411.107 458.501C408.999 461.564 403.311 462.559 400 463.667C390.431 466.868 380.858 470.354 371 472.575C367.574 473.347 357.851 473.764 356.256 477.433C354.655 481.117 360.796 485.842 363.001 487.961C369.405 494.114 391.98 504.1 392.762 513.004C393.535 521.801 388.357 531.23 385 539C377.041 557.423 367.708 574.877 361.333 594C359.259 600.222 354.976 608.283 355.322 614.945C355.608 620.459 365.678 623.146 370 624.655C378.404 627.59 388.06 629.661 397 629.661C401.072 629.661 407.988 626.99 411.682 629.117C415.797 631.487 415.021 647.957 413.397 651.892C411.42 656.681 403.503 658.009 399 658.985C386.562 661.682 374.392 661.308 362 658.576C358.446 657.792 352.384 657.331 349.859 654.436C344.475 648.264 351.469 624.369 355 618M309 417C309.346 432.539 310.948 447.738 314 463C314.883 467.414 315.147 476.288 319.303 478.972C327.25 484.105 345.888 477.025 355 477M524 449C524.007 459.347 527.055 468.69 531.486 478C534.038 483.363 538.973 488.831 539.068 495C539.269 508.062 528.203 523.522 522.781 535C513.675 554.278 506.911 574.914 503.59 596C502.283 604.3 501.967 612.659 501.17 621C500.863 624.211 501.778 628.861 498.682 630.976C494.789 633.636 487.489 633 483 633C468.759 633 451.712 630.698 439 624C436.122 630.809 429.983 655.422 435.603 661.436C438.635 664.68 445.872 664.765 450 665.41C463.094 667.456 476.272 667.001 489 662.971C492.642 661.818 498.814 660.452 501.307 657.351C505.003 652.754 501 637.852 501 632M414 460C420.807 465.622 425.43 474.335 431.286 481C437.901 488.529 446.139 494.778 454 500.946C459.184 505.014 470.796 506.951 472.682 514.043C475.944 526.311 467.188 541.343 462.309 552C452.563 573.286 440.033 600.317 439 624M222 466C229.998 475.733 234.81 487.969 242.668 498C246.113 502.396 251.913 506.916 251.838 513C251.739 521.047 246.359 530.266 244.141 538C238.938 556.147 234.587 574.468 231 593C229.593 600.271 224.378 614.711 227.603 621.722C229.268 625.34 235.601 626.202 239 627.333C251.328 631.438 263.993 633.53 277 632.961C280.27 632.817 288.809 633.128 290.972 630.397C292.932 627.922 291.935 622.97 292.285 620C293.578 609.047 292.968 597.982 294.285 587C296.437 569.072 299.821 550.998 306.053 534C310.442 522.03 318.279 510.723 320.156 498C321.034 492.05 319.05 485.992 319 480M455 504C452.272 518.313 441.469 531.919 435.298 545C423.457 570.099 414.232 600.022 414 628M172 514C177.992 514.307 190.226 516.962 194.487 521.43C202.499 529.83 200.327 548.883 198.196 559C196.925 565.032 194.382 579.112 187.895 581.672C184.616 582.966 180.088 580.724 177 579.656C167.717 576.444 158.034 572.72 150 567M226 624C225.584 633.696 225 643.251 225 653C225 656.219 223.993 661.687 226.028 664.436C228.551 667.844 237.107 668.124 241 668.725C253.159 670.602 281.095 672.981 290.397 662.49C295.114 657.169 292 639.885 292 633"/> </svg>`);

    const tanjiro = parseSvg(`<?xml version="1.0" standalone="no"?> <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 20010904//EN" "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd"> <svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="529.000000pt" height="517.000000pt" viewBox="0 0 529.000000 517.000000" preserveAspectRatio="xMidYMid meet"> <metadata> Created by potrace 1.16, written by Peter Selinger 2001-2019 </metadata> <g transform="translate(0.000000,517.000000) scale(0.100000,-0.100000)" fill="#000000" stroke="none"> <path d="M2030 5140 c-8 -14 -6 -46 5 -115 18 -112 19 -200 4 -243 -20 -57 -99 -105 -330 -200 -160 -67 -204 -89 -268 -140 -70 -57 -98 -105 -146 -256 -51 -160 -58 -236 -26 -299 l18 -36 -64 -31 c-89 -41 -176 -131 -225 -230 -57 -117 -79 -220 -88 -405 -4 -88 -12 -171 -17 -185 -17 -41 -102 -138 -172 -196 -148 -124 -330 -184 -557 -184 -128 0 -159 -9 -153 -45 4 -20 198 -165 281 -210 78 -43 225 -75 375 -82 73 -3 133 -9 133 -12 0 -3 -14 -16 -32 -28 -51 -36 -249 -216 -260 -237 -9 -16 -6 -23 13 -39 21 -17 40 -18 271 -15 l248 3 0 -97 0 -96 -151 -156 -150 -155 37 -7 c70 -13 248 18 346 60 12 6 24 -4 45 -36 46 -67 47 -82 3 -136 -21 -26 -54 -63 -74 -81 -82 -79 -23 -94 116 -30 58 27 97 39 112 35 59 -15 115 -95 116 -164 l0 -34 -44 26 c-56 32 -71 34 -55 5 24 -46 22 -207 -6 -444 -28 -240 -28 -330 -1 -383 16 -31 121 -132 137 -132 5 0 9 6 9 13 0 6 14 172 30 367 16 195 30 373 30 394 0 27 -10 54 -31 87 -25 40 -30 56 -27 100 l3 52 49 14 c55 16 60 13 71 -46 25 -137 183 -311 435 -481 85 -57 188 -128 229 -157 41 -29 97 -64 125 -77 28 -13 95 -45 148 -70 133 -62 171 -71 252 -57 36 6 93 24 128 39 117 50 308 153 305 163 -1 6 27 29 63 51 246 151 440 360 504 542 13 39 27 84 31 100 l6 28 62 -7 c34 -3 64 -8 66 -10 12 -13 -16 -83 -56 -136 -27 -37 -41 -65 -34 -67 8 -3 11 -117 11 -423 0 -230 3 -419 6 -419 3 0 43 29 89 65 l83 64 7 136 c4 75 4 189 1 253 -4 64 -7 204 -8 310 0 105 -3 192 -5 192 -2 0 -17 -7 -33 -15 -27 -14 -30 -14 -30 1 0 32 34 86 75 120 l42 34 52 -35 c29 -19 69 -39 89 -45 48 -13 139 -13 147 0 4 6 -28 43 -70 83 -64 60 -105 110 -105 131 0 2 32 -7 71 -21 140 -48 264 -41 314 19 l27 32 -23 9 c-78 31 -129 61 -168 99 -42 42 -91 116 -60 92 43 -33 129 -94 134 -94 3 0 5 24 5 53 0 47 -13 107 -34 158 -6 15 10 17 146 22 174 6 205 13 282 65 58 39 141 135 132 151 -4 5 -41 12 -84 16 -184 15 -218 34 -281 153 -22 44 -41 83 -41 86 0 3 50 -19 111 -50 61 -30 113 -53 116 -51 2 3 -15 65 -38 138 -27 88 -38 134 -30 137 6 2 59 39 118 82 220 159 415 360 349 360 -7 0 -60 -14 -117 -31 -58 -17 -140 -33 -186 -36 -141 -10 -214 25 -299 140 -46 61 -129 215 -121 223 4 4 48 -22 262 -155 55 -34 101 -57 103 -52 5 14 -77 290 -98 331 -10 20 -47 63 -81 94 -57 53 -61 59 -43 69 10 6 41 31 68 56 174 163 274 413 236 594 -6 31 -14 57 -18 57 -4 0 -20 -25 -36 -55 -75 -145 -329 -316 -430 -291 -15 4 -69 46 -120 95 -77 73 -110 96 -197 139 -57 28 -131 58 -164 68 -33 9 -67 19 -75 23 -8 3 86 7 210 9 128 1 229 7 234 12 15 15 -39 65 -124 114 -256 148 -462 220 -688 241 -63 6 -72 9 -66 24 43 97 58 161 58 251 0 151 -55 293 -102 263 -9 -5 -31 -44 -48 -85 -51 -123 -125 -216 -200 -249 -63 -29 -195 -39 -416 -32 -185 5 -286 -1 -359 -23 -13 -4 -17 7 -22 55 -15 141 -63 208 -254 359 -97 75 -125 86 -143 52z m235 -195 c81 -81 115 -149 115 -232 0 -77 -15 -110 -72 -154 -24 -19 -97 -79 -163 -134 -144 -121 -152 -126 -134 -94 6 13 26 47 44 74 18 28 38 61 45 75 l13 23 -38 -22 c-21 -12 -39 -20 -42 -18 -2 2 17 48 42 102 25 54 44 99 42 101 -1 2 -44 -34 -94 -79 -57 -51 -141 -112 -223 -161 -71 -43 -130 -80 -130 -82 0 -7 156 67 197 94 23 15 71 49 108 76 36 26 68 46 71 43 3 -3 -18 -46 -45 -96 -28 -50 -51 -94 -51 -97 0 -3 20 11 45 32 25 20 45 33 45 29 0 -4 -31 -55 -69 -113 -83 -127 -110 -185 -118 -251 -5 -47 11 -170 27 -200 10 -20 17 2 39 138 24 138 47 187 130 272 53 53 254 197 416 297 10 6 -3 -15 -51 -87 -13 -19 -22 -37 -20 -39 2 -2 56 21 120 51 l115 55 247 -24 c136 -13 249 -26 252 -28 2 -3 -13 -7 -34 -11 -206 -33 -451 -107 -664 -202 -260 -115 -330 -170 -409 -323 -64 -123 -86 -207 -86 -335 0 -130 16 -185 78 -272 l42 -58 6 220 c8 318 25 358 215 531 55 50 127 109 162 132 139 95 346 174 557 212 l110 20 -95 -6 c-52 -3 -92 -3 -89 0 3 4 51 15 105 26 304 58 593 50 839 -22 160 -47 368 -142 408 -186 18 -19 15 -20 -298 -27 -173 -4 -315 -10 -315 -14 0 -4 45 -14 101 -24 132 -22 258 -65 397 -133 95 -47 126 -69 195 -136 97 -95 149 -123 210 -113 94 16 182 70 300 184 42 41 77 70 77 65 0 -5 -14 -65 -30 -133 -80 -325 -211 -456 -385 -381 -61 26 -61 26 97 -94 l126 -96 57 -146 c31 -80 55 -147 52 -150 -10 -11 -77 78 -126 170 -29 54 -68 115 -87 135 -39 44 -121 89 -216 121 -38 12 -68 24 -68 27 0 3 21 2 48 -2 l47 -7 -60 61 -59 61 64 0 c127 0 243 31 279 73 10 13 3 16 -51 22 -101 12 -238 50 -464 130 -389 137 -494 144 -860 55 -173 -42 -513 -154 -501 -166 2 -2 52 14 111 36 238 90 500 147 716 157 200 8 241 -1 677 -156 79 -28 184 -58 233 -67 50 -9 89 -18 87 -20 -1 -2 -54 -8 -117 -14 -63 -5 -139 -13 -169 -16 l-54 -6 59 -59 58 -59 -58 0 c-74 0 -70 -15 12 -46 167 -62 287 -154 345 -262 16 -30 27 -55 25 -57 -1 -2 -29 12 -60 30 -77 46 -129 61 -157 46 -26 -14 -27 -41 -2 -89 10 -20 35 -78 54 -128 69 -179 120 -228 277 -263 99 -23 93 -17 68 -64 -46 -92 -200 -206 -333 -247 -22 -7 -43 -15 -46 -19 -4 -3 2 -60 12 -126 33 -203 70 -253 244 -330 50 -21 92 -41 95 -43 3 -2 -7 -14 -23 -28 -44 -38 -98 -47 -253 -42 -78 3 -149 1 -158 -4 -22 -12 -20 -37 9 -114 30 -80 31 -88 5 -72 -41 26 -60 87 -60 190 0 53 -7 131 -16 174 -25 121 -15 265 31 429 98 355 98 352 99 485 1 116 -1 129 -26 183 -70 148 -310 477 -349 477 -5 0 16 -35 47 -77 69 -96 146 -254 170 -348 26 -100 24 -295 -4 -390 -11 -38 -19 -71 -17 -73 9 -9 56 90 71 148 12 49 15 90 11 165 -3 55 -8 109 -12 120 -6 16 -3 15 14 -5 28 -34 51 -112 51 -176 0 -29 -9 -99 -19 -156 -11 -57 -23 -124 -27 -151 -4 -34 -10 -45 -18 -38 -8 7 -22 -22 -50 -102 -58 -169 -62 -166 -40 28 5 45 2 41 -41 -59 -14 -32 -28 -57 -30 -54 -6 5 33 339 40 346 3 3 5 -6 5 -19 0 -14 7 -34 16 -45 14 -17 15 -12 9 60 -4 44 -13 104 -21 135 -16 58 -62 151 -76 151 -11 0 -11 -1 12 -125 23 -127 25 -249 6 -396 -15 -105 -55 -285 -81 -360 -19 -53 1 -48 33 7 20 36 62 159 77 228 3 15 8 26 10 24 4 -4 -4 -72 -20 -163 -5 -28 -3 -27 21 13 49 81 44 50 -24 -168 -41 -132 -45 -155 -46 -250 -1 -123 7 -144 124 -325 39 -60 68 -110 65 -113 -8 -9 -100 19 -142 44 -23 13 -51 38 -63 54 -29 40 -40 38 -40 -8 0 -51 49 -147 108 -213 40 -44 43 -51 22 -44 -138 40 -258 169 -295 313 -22 83 -12 159 55 433 28 112 57 245 65 294 43 264 -12 458 -179 633 -57 60 -74 83 -57 77 l24 -7 -22 30 c-83 117 -413 273 -702 332 -93 19 -130 30 -103 30 5 0 70 7 144 15 74 9 214 18 311 22 207 7 260 -2 308 -51 58 -60 168 -269 216 -411 l7 -20 8 20 c9 26 3 46 -54 179 -88 206 -158 292 -256 316 -63 15 -618 8 -785 -10 -105 -11 -336 -47 -364 -57 -9 -3 2 13 24 36 l39 41 -35 0 c-44 0 -134 -23 -216 -56 -35 -14 -66 -24 -69 -21 -2 2 5 16 17 30 19 25 19 27 2 27 -36 -1 -89 -27 -170 -82 -102 -70 -123 -75 -211 -49 -90 27 -96 27 -76 -3 15 -25 15 -25 -23 -35 -21 -6 -69 -17 -108 -26 -123 -28 -145 -35 -145 -49 0 -7 20 -17 48 -22 l47 -10 -60 -38 c-33 -22 -87 -59 -120 -84 -63 -47 -185 -161 -185 -173 0 -4 28 1 63 12 34 10 63 19 65 19 1 0 -25 -40 -58 -90 -81 -119 -100 -174 -100 -294 0 -155 46 -441 120 -751 41 -169 9 -286 -107 -396 -54 -51 -149 -116 -158 -108 -2 2 26 47 61 99 133 199 166 359 60 295 -70 -42 -239 -126 -244 -121 -2 3 18 38 45 78 68 98 111 186 132 270 l18 69 22 -58 c21 -55 68 -129 77 -120 2 2 -12 112 -32 243 -19 131 -38 295 -41 364 -5 112 -16 170 -29 157 -3 -3 -12 -49 -20 -103 -8 -54 -16 -100 -18 -102 -2 -1 -7 103 -11 232 -7 227 -8 235 -25 213 -28 -35 -66 -117 -84 -180 -29 -99 -31 -172 -7 -270 28 -120 28 -204 -1 -247 -13 -18 -35 -42 -49 -53 -33 -24 -128 -36 -236 -29 l-81 5 145 169 c80 93 143 171 141 174 -2 2 -40 10 -83 19 -43 8 -80 17 -83 20 -3 3 5 16 17 29 l22 24 -176 7 -177 8 89 42 c120 58 239 166 322 295 17 27 14 25 -15 -10 -67 -81 -180 -184 -240 -220 -32 -19 -93 -47 -136 -61 l-78 -25 24 -23 c36 -34 108 -51 213 -51 88 0 94 -1 88 -19 -5 -17 1 -20 47 -25 29 -4 70 -9 90 -12 l38 -6 -60 -87 c-101 -148 -214 -240 -295 -241 -29 0 -28 1 38 68 37 37 100 94 141 127 41 33 80 71 87 84 23 40 -3 48 -189 54 -233 8 -342 40 -514 153 l-73 49 113 6 c391 24 488 85 823 525 50 65 105 134 123 153 93 100 194 150 272 133 l39 -8 -49 -13 c-92 -23 -152 -65 -221 -156 -36 -46 -33 -44 30 19 96 97 141 115 308 126 159 11 215 18 222 29 9 16 -129 43 -240 48 -122 6 -212 -10 -269 -48 -17 -12 -77 -69 -134 -128 l-103 -106 5 40 c3 22 8 56 11 75 3 19 -8 -9 -24 -63 -16 -54 -32 -101 -36 -105 -13 -12 4 279 20 346 29 123 77 192 214 309 107 91 171 102 206 33 18 -35 20 -34 -35 -15 -23 8 -44 15 -46 15 -2 0 3 -18 11 -40 8 -22 11 -40 7 -40 -4 0 -24 5 -46 9 l-39 9 37 -37 c20 -20 36 -40 36 -43 0 -3 -40 -9 -90 -13 -50 -4 -90 -10 -90 -13 0 -3 7 -13 15 -23 15 -15 12 -17 -30 -24 -45 -6 -46 -7 -30 -25 15 -17 14 -22 -14 -79 -39 -76 -40 -89 -2 -33 15 24 38 50 50 58 17 12 19 19 11 34 -11 20 -10 20 54 35 22 4 26 9 17 18 -19 19 -12 26 37 32 26 3 60 9 75 12 l29 5 -21 22 c-30 32 -26 39 20 31 l41 -7 -26 41 c-15 23 -25 41 -24 41 2 0 28 -7 58 -15 30 -8 56 -15 58 -15 1 0 -2 9 -8 21 -7 11 -10 22 -8 24 2 2 86 -64 188 -147 255 -207 270 -218 245 -188 -11 14 -72 79 -135 145 -149 154 -195 213 -239 305 -30 63 -35 85 -35 140 1 74 34 171 84 248 l31 47 -47 -50 c-60 -63 -86 -122 -92 -206 -6 -86 14 -145 81 -246 29 -43 56 -84 61 -92 17 -27 -191 109 -247 161 -63 60 -70 150 -25 298 60 196 111 239 488 415 101 47 199 97 217 111 54 41 73 90 73 186 0 74 -4 103 -26 196 -4 22 0 20 58 -20 34 -23 90 -70 123 -103z m1245 13 c6 -18 14 -78 17 -133 9 -163 -28 -271 -102 -295 -19 -6 -101 -12 -182 -13 -124 -1 -174 4 -303 27 -89 17 -193 29 -245 30 -86 1 -93 -1 -159 -37 -37 -21 -70 -36 -72 -34 -2 1 15 29 37 60 22 31 35 57 28 57 -39 0 -376 -229 -479 -326 -77 -73 -124 -153 -144 -246 l-14 -63 -1 66 c-2 118 57 199 252 346 56 43 137 108 180 145 148 127 224 145 491 113 87 -10 192 -16 254 -13 92 3 115 7 164 31 76 37 154 124 209 231 24 47 47 86 51 86 3 0 11 -15 18 -32z m-1015 -706 c-6 -5 -46 -33 -90 -63 -104 -71 -251 -213 -294 -283 -58 -97 -73 -168 -75 -353 0 -90 -2 -163 -4 -163 -2 0 -19 35 -39 78 -61 131 -56 259 18 409 42 87 128 193 200 247 74 56 232 136 267 136 15 0 22 -4 17 -8z m50 -882 l-39 -40 29 5 c75 14 499 74 502 71 2 -1 -14 -8 -35 -14 -36 -11 -87 -52 -66 -52 34 -2 296 -39 301 -43 2 -3 -5 -11 -17 -17 -17 -9 -26 -8 -45 4 -22 15 -25 14 -58 -23 -34 -38 -77 -133 -77 -171 0 -17 5 -16 60 12 51 27 63 30 85 20 14 -7 30 -24 36 -39 31 -82 -57 -273 -127 -273 -14 0 -34 14 -53 37 l-30 37 -15 -35 c-8 -19 -32 -74 -54 -124 -22 -49 -39 -91 -37 -93 1 -1 28 7 60 18 31 11 61 17 66 14 16 -10 9 -102 -11 -156 -11 -29 -44 -93 -74 -143 -30 -49 -52 -93 -50 -97 3 -4 56 31 118 77 62 47 116 85 119 85 3 0 0 -18 -8 -39 l-14 -40 87 31 c140 49 174 77 131 108 l-21 17 25 49 c39 77 101 140 172 175 35 17 68 30 73 28 5 -2 -12 -53 -38 -114 -26 -60 -47 -111 -46 -112 1 -1 53 13 116 32 63 19 116 35 118 35 2 0 -6 -15 -17 -34 l-22 -34 135 5 c114 5 143 3 181 -11 66 -26 79 -57 65 -149 -31 -204 -188 -868 -255 -1077 -110 -340 -178 -449 -380 -606 -151 -117 -478 -318 -568 -348 -120 -40 -295 -2 -481 107 -147 85 -542 383 -617 464 -97 107 -134 212 -239 673 -21 96 -55 261 -74 365 -20 105 -47 251 -62 325 -33 173 -36 322 -7 396 11 28 49 93 85 145 88 127 85 121 51 113 -15 -3 -36 -8 -47 -11 -33 -9 -10 12 150 138 151 118 155 123 132 135 -12 7 -21 14 -18 14 47 5 244 40 248 45 3 3 -3 12 -14 21 -18 15 -18 15 0 10 102 -33 97 -34 216 37 61 36 110 63 110 60 0 -3 -9 -21 -21 -39 l-21 -34 49 21 c127 57 191 78 233 79 l44 0 -39 -40z m919 -145 c72 -25 137 -48 144 -50 10 -4 9 -12 -3 -41 -31 -75 -15 -121 51 -144 28 -10 30 -14 29 -61 0 -72 24 -89 144 -100 112 -10 140 -24 173 -86 20 -36 68 -178 68 -200 0 -1 -19 5 -42 14 -31 12 -77 17 -160 17 -113 1 -118 2 -118 22 0 47 -59 54 -147 18 l-33 -14 16 37 c36 84 39 127 10 145 -41 27 -137 -16 -222 -100 -65 -64 -97 -127 -92 -183 l3 -42 -54 -18 c-30 -11 -55 -18 -55 -16 -17 50 -49 51 -123 2 -29 -20 -53 -34 -53 -31 0 2 14 36 31 77 60 145 49 219 -32 219 l-38 0 18 53 c13 34 23 51 32 48 48 -15 100 -12 132 8 99 61 151 257 87 326 -25 27 -77 33 -124 15 l-26 -10 30 60 c29 57 31 59 77 65 27 4 53 8 58 10 35 12 103 0 219 -40z m297 -141 c53 -38 63 -57 27 -50 -112 23 -127 14 -41 -24 38 -16 78 -45 117 -85 l59 -60 -41 -9 c-55 -12 -109 0 -139 30 -22 22 -25 32 -21 74 l5 48 -36 7 c-20 4 -46 13 -58 21 -50 32 -10 101 51 90 15 -3 50 -22 77 -42z m990 -280 c13 -16 12 -16 -17 -1 -33 17 -94 75 -94 90 0 9 87 -61 111 -89z m408 -45 c-51 -62 -189 -169 -305 -240 -110 -66 -120 -81 -98 -145 9 -27 27 -70 40 -96 13 -26 24 -49 24 -52 0 -2 -34 16 -75 41 -87 54 -148 64 -153 26 -5 -32 93 -217 133 -252 44 -39 90 -51 195 -51 l85 -1 -35 -30 c-30 -26 -41 -30 -80 -26 -61 5 -167 57 -229 113 -57 51 -71 87 -91 229 -6 44 -13 87 -16 96 -3 11 7 19 38 28 95 29 206 106 283 198 76 89 81 113 33 143 -18 11 -28 20 -23 21 6 0 73 11 150 24 77 12 146 23 153 24 8 1 -5 -22 -29 -50z m-3970 -424 c7 -49 14 -91 15 -93 10 -9 38 56 43 99 3 27 8 48 10 46 6 -7 63 -510 58 -515 -4 -5 -9 6 -42 98 -23 65 -30 68 -43 19 -57 -226 -94 -312 -167 -390 -43 -46 -116 -89 -176 -103 -23 -5 -9 13 76 96 165 164 228 274 235 413 4 75 1 90 -44 225 -61 184 -65 254 -19 400 l30 95 6 -150 c4 -82 12 -190 18 -240z m3126 -145 c-80 -261 -79 -214 2 71 39 138 59 195 61 175 1 -17 -27 -127 -63 -246z m-3166 -156 c1 -51 -42 -195 -54 -182 -5 5 20 200 32 248 l6 25 7 -25 c5 -14 8 -43 9 -66z m3195 -11 c23 -47 28 -109 16 -205 -17 -129 -23 -143 -41 -90 -11 33 -12 69 -5 182 5 77 11 140 12 140 2 0 10 -12 18 -27z m-97 -85 c-3 -7 -5 -2 -5 12 0 14 2 19 5 13 2 -7 2 -19 0 -25z m135 -364 c28 -30 76 -71 106 -91 51 -34 54 -37 35 -46 -33 -15 -90 1 -128 35 -35 30 -145 232 -145 265 0 9 18 -12 41 -47 22 -34 63 -87 91 -116z m-3088 -13 c-7 -32 -7 -32 -22 -10 -14 20 -14 23 3 35 24 18 27 14 19 -25z m2721 -112 c36 -66 41 -125 16 -166 -30 -48 -41 -40 -23 17 17 54 7 100 -22 100 -23 0 -58 -51 -51 -75 3 -11 8 -39 11 -61 6 -36 3 -44 -16 -54 -26 -14 -66 -6 -74 15 -3 8 9 61 28 118 18 56 39 126 46 156 l13 55 23 -29 c13 -16 35 -50 49 -76z m-2771 75 c17 -16 22 -59 8 -68 -5 -3 -26 12 -46 33 -27 27 -34 40 -24 44 25 10 47 7 62 -9z m288 -167 c21 -77 36 -143 33 -145 -5 -5 -79 -21 -82 -18 -2 2 4 19 12 39 21 50 19 87 -7 114 -28 30 -44 29 -64 -2 -15 -24 -15 -28 1 -71 9 -25 15 -47 13 -49 -2 -2 -23 13 -47 33 l-44 38 68 107 c37 59 71 105 74 101 3 -3 23 -69 43 -147z m2498 -341 c0 -3 -4 -8 -10 -11 -5 -3 -10 -1 -10 4 0 6 5 11 10 11 6 0 10 -2 10 -4z m-2630 -100 c0 -3 -4 -8 -10 -11 -5 -3 -10 -1 -10 4 0 6 5 11 10 11 6 0 10 -2 10 -4z m100 -12 c0 -14 -3 -14 -15 -4 -8 7 -15 14 -15 16 0 2 7 4 15 4 8 0 15 -7 15 -16z m2524 -34 c3 -16 9 -43 12 -60 9 -45 -4 -36 -16 13 -6 23 -13 50 -16 60 -3 9 -1 17 5 17 5 0 12 -13 15 -30z m-2637 -62 c-3 -7 -5 -2 -5 12 0 14 2 19 5 13 2 -7 2 -19 0 -25z m107 6 c3 -8 2 -12 -4 -9 -6 3 -10 10 -10 16 0 14 7 11 14 -7z m2543 -196 c6 -75 5 -78 -16 -78 -18 0 -21 6 -21 38 0 20 -2 82 -5 137 l-5 100 21 -60 c11 -33 23 -95 26 -137z m-58 65 c1 -70 -16 -148 -40 -175 l-20 -23 5 30 c3 17 10 73 16 125 6 52 14 109 17 125 l7 30 7 -30 c4 -16 7 -53 8 -82z m-2590 -100 c-6 -24 -19 -48 -27 -55 -13 -11 -15 -10 -10 2 3 8 14 60 24 115 l19 100 3 -60 c2 -33 -2 -79 -9 -102z m76 -72 l7 -44 -32 23 -31 22 6 86 c10 138 17 149 31 47 7 -49 16 -110 19 -134z m12 187 c-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3 4 -12 1 -19z m2440 -35 c-3 -10 -5 -4 -5 12 0 17 2 24 5 18 2 -7 2 -21 0 -30z m-2430 -5 c-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3 4 -12 1 -19z m-62 -198 c33 -34 41 -90 30 -205 l-7 -77 -29 28 c-67 64 -94 165 -69 256 12 43 33 42 75 -2z m2613 -47 c-6 -104 -22 -147 -74 -197 l-39 -38 -3 106 c-3 123 10 165 60 196 58 35 61 31 56 -67z"/> <path d="M3425 4431 c-49 -3 -81 -9 -70 -12 11 -3 -13 -9 -55 -13 -176 -19 -361 -77 -406 -127 -19 -21 -19 -21 16 -15 19 3 116 15 215 26 99 11 198 23 220 26 22 4 38 4 35 1 -3 -3 -50 -13 -105 -22 -125 -20 -223 -50 -261 -80 l-29 -24 40 9 c56 13 174 12 355 -2 l155 -13 -77 -9 c-45 -5 -78 -14 -78 -20 0 -6 51 -21 116 -34 121 -23 259 -73 327 -118 21 -14 37 -27 35 -29 -1 -1 -34 4 -73 13 -45 10 -123 16 -220 16 -211 1 -363 -34 -631 -148 -129 -55 -415 -205 -511 -269 -91 -61 -184 -146 -160 -147 10 0 89 37 175 81 179 93 272 140 320 159 18 7 31 15 28 17 -3 4 -122 -47 -339 -146 -37 -17 -65 -26 -62 -21 12 20 231 150 380 225 167 84 374 160 520 190 180 37 407 37 560 1 33 -8 64 -11 68 -7 13 13 -100 109 -167 141 -35 16 -99 38 -142 48 l-79 19 53 7 c87 13 70 25 -83 57 -33 7 -124 13 -202 14 -78 0 -136 3 -130 6 7 4 62 17 122 29 110 21 186 48 199 69 5 8 -41 11 -165 11 -95 0 -170 2 -167 5 3 3 68 16 144 29 184 32 331 69 248 64 -16 -1 -69 -4 -119 -7z"/> <path d="M1056 3345 c-3 -9 -6 -22 -5 -28 0 -7 5 -1 10 12 5 13 8 26 5 28 -2 2 -6 -3 -10 -12z"/> <path d="M1688 2391 c150 -43 275 -80 277 -83 3 -3 -41 -7 -99 -10 -76 -3 -112 -9 -131 -22 -15 -10 -25 -19 -23 -21 2 -3 62 1 133 7 202 17 325 -11 432 -98 45 -37 69 -75 104 -169 11 -31 23 -54 26 -52 4 4 -27 120 -44 164 -4 9 20 1 67 -22 l72 -36 -19 32 c-28 49 -91 99 -195 156 -223 122 -428 184 -718 218 -69 8 -132 15 -140 14 -8 0 108 -35 258 -78z"/> <path d="M3733 2425 c-271 -44 -425 -88 -613 -176 -108 -51 -151 -83 -176 -132 -15 -27 -15 -28 13 -21 15 4 39 11 52 16 13 5 25 7 27 5 2 -2 0 -28 -5 -58 -7 -41 -6 -50 3 -35 55 91 130 157 227 198 47 20 71 22 189 22 126 0 141 -2 224 -32 49 -18 92 -29 95 -26 10 10 -52 53 -104 71 -38 14 -82 18 -182 18 -73 0 -133 1 -133 2 0 1 62 22 138 46 106 35 176 50 307 67 94 13 179 26 190 30 18 7 18 9 -8 19 -39 15 -79 13 -244 -14z"/> <path d="M1635 2226 c-16 -7 -39 -24 -50 -36 l-20 -23 31 17 c34 20 82 56 74 55 -3 0 -18 -6 -35 -13z"/> <path d="M1805 2181 c-88 -22 -260 -97 -294 -129 -14 -13 -21 -21 -16 -19 6 3 35 12 65 21 l55 16 -30 -25 c-16 -13 -33 -24 -37 -25 -9 0 -62 -89 -57 -94 2 -2 60 23 129 55 69 32 129 58 133 59 4 0 -6 -21 -24 -46 -40 -58 -47 -112 -25 -188 51 -175 290 -261 435 -156 87 64 115 204 65 334 -5 14 7 9 52 -21 88 -59 88 -59 82 -37 -3 10 -13 36 -22 56 l-16 38 25 -10 c38 -14 31 3 -23 57 -120 119 -305 162 -497 114z m250 -110 c54 -24 91 -70 111 -137 9 -31 14 -57 12 -59 -2 -2 -26 -7 -55 -10 l-51 -7 -12 36 c-25 76 -109 81 -168 10 -22 -27 -39 -36 -81 -44 -30 -5 -56 -10 -58 -10 -10 0 9 75 27 110 56 108 175 157 275 111z m-56 -165 l32 -33 -27 -22 c-15 -11 -34 -21 -43 -21 -21 0 -61 28 -61 43 0 11 49 67 60 67 3 0 21 -15 39 -34z m-93 -103 l59 -27 101 27 c56 15 107 27 114 27 22 0 -54 -122 -93 -151 -74 -53 -184 -45 -275 21 -49 35 -61 69 -38 105 22 33 57 32 132 -2z"/> <path d="M3378 2180 c-125 -31 -263 -102 -341 -176 -36 -33 -26 -45 13 -15 34 25 34 27 15 -59 -7 -36 -12 -66 -10 -68 2 -2 11 5 21 16 11 10 40 37 65 60 l46 42 -13 -52 c-27 -104 -13 -187 42 -248 78 -86 231 -111 346 -56 87 41 122 103 134 239 5 59 2 82 -14 125 -11 28 -19 52 -17 52 2 0 47 -25 100 -55 54 -30 100 -55 102 -55 3 0 -4 15 -14 33 -67 113 -76 130 -63 122 8 -5 42 -26 75 -47 32 -20 61 -35 64 -33 9 9 -75 99 -118 127 -108 68 -274 87 -433 48z m120 -106 c20 -8 50 -27 66 -42 27 -26 76 -114 76 -139 0 -7 -24 -14 -56 -19 l-56 -7 -47 47 -48 47 -53 -42 c-36 -29 -72 -47 -109 -55 -30 -7 -56 -12 -58 -10 -1 1 5 28 14 59 37 133 162 207 271 161z m-29 -168 l33 -34 -30 -16 c-40 -21 -78 -20 -86 0 -6 15 31 84 45 84 3 0 20 -15 38 -34z m166 -88 c-3 -13 -18 -48 -33 -78 -31 -62 -78 -95 -150 -106 -76 -11 -205 45 -231 102 -15 33 -14 40 5 58 26 26 85 20 130 -14 50 -38 78 -38 117 2 44 44 75 58 125 58 40 0 43 -2 37 -22z"/> <path d="M3695 1638 c-83 -71 -154 -108 -211 -108 -23 0 -86 9 -139 20 -117 24 -124 24 -103 4 22 -23 139 -53 229 -61 93 -7 138 10 220 85 49 45 90 105 78 116 -2 2 -35 -23 -74 -56z"/> <path d="M1640 1682 c0 -27 75 -103 127 -129 52 -25 68 -28 158 -28 103 1 164 14 187 42 12 15 9 16 -21 10 -19 -4 -71 -10 -116 -13 -113 -9 -171 7 -250 66 -78 59 -85 63 -85 52z"/> <path d="M2690 1440 c0 -53 4 -90 10 -90 6 0 10 37 10 90 0 53 -4 90 -10 90 -6 0 -10 -37 -10 -90z"/> <path d="M2660 1360 c0 -33 4 -60 10 -60 6 0 10 27 10 60 0 33 -4 60 -10 60 -6 0 -10 -27 -10 -60z"/> <path d="M2786 1209 c-15 -12 -25 -23 -23 -25 7 -7 97 28 97 37 0 17 -47 9 -74 -12z"/> <path d="M2301 980 c41 -63 179 -99 324 -85 92 9 80 19 -35 29 -62 6 -208 43 -287 73 -17 7 -17 5 -2 -17z"/> <path d="M2970 959 c-102 -21 -186 -38 -187 -39 -2 0 -3 -5 -3 -11 0 -15 239 -6 293 11 41 12 124 80 97 79 -8 -1 -98 -18 -200 -40z"/> <path d="M2645 768 c-31 -11 -65 -36 -65 -48 0 -4 26 2 58 13 49 17 64 18 111 8 30 -6 57 -9 59 -6 8 8 -82 45 -108 44 -14 0 -38 -5 -55 -11z"/> <path d="M2782 688 c-36 -22 -104 -29 -157 -15 -28 7 -29 6 -11 -7 42 -34 165 -28 196 9 22 27 5 35 -28 13z"/> </g> </svg>`);

    const thinkingFace = parseSvg(`<?xml version="1.0" standalone="yes"?> <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"> <path style="stroke:#313131; fill:none;" d="M266 484C253.564 500.12 238.893 502.193 220 506.211C184.157 513.832 150.242 516.183 120 491.384C103.718 478.032 92.7208 459.378 87.8843 439C86.139 431.646 87.2741 420.863 84.2577 414.259C82.5042 410.42 77.3519 407.23 74.5795 404C67.1633 395.361 60.0953 386.542 53.8611 377C31.2272 342.358 16.9251 302.407 14.0895 261C11.7546 226.904 16.2221 192.199 27.6921 160C57.759 75.5958 133.377 16.6322 221 2.25928C231.505 0.536133 243.357 2 254 2C301.735 2 345.134 12.562 386 38.3187C412.032 54.7259 434.716 76.0156 452.706 101C471.859 127.6 485.504 157.982 492.576 190C516.078 296.407 462.683 413.039 363 460.297C340.735 470.853 317.42 478.788 293 482.576C286.738 483.547 274.121 487.18 268.238 484.397C264.658 482.703 266.299 477.146 265.656 474C264.737 469.501 261.756 467.189 258 465C268.346 458.147 279.497 446.348 271.146 433.015C268.885 429.406 265.022 427.767 262 425L265 427"/> <path style="stroke:#313131; fill:none;" d="M184 57.4252C200.602 55.319 227.669 60.6668 241.999 69.3796C250.483 74.5382 253.981 89.8146 240.961 92.2469C231.764 93.965 220.871 86.5861 212 84.662C195.063 80.9886 177.786 81.3261 161 85.733C152.441 87.98 139.644 96.5596 131.094 90.9908C122.165 85.1744 124.51 73.581 133.004 69.0548C148.327 60.8891 167.138 59.5644 184 57.4252"/> <path style="stroke:#313131; fill:none;" d="M361 140C365.951 149.288 374.174 154.64 375.83 166C376.806 172.692 376.944 179.387 375.239 186C370.699 203.613 350.228 221.587 332.17 208.301C311.299 192.946 311.675 161.52 329 144C321.274 141.974 313.761 148.884 306.001 145.457C298.315 142.062 295.662 131.173 302.144 125.303C305.619 122.156 311.574 120.973 316 119.745C340.686 112.896 366.383 113.414 391 120.152C400.531 122.761 413.813 126.129 420.276 134.174C426.093 141.415 421.658 152.862 412 153.228C407.276 153.406 403.233 150.162 399 148.533C387.802 144.224 373.228 137.938 361 140M186 121.878C226.993 121.875 226.509 197.093 185 197.162C146.311 197.227 146.403 121.881 186 121.878"/> <path style="stroke:#313131; fill:none;" d="M329 143C338.679 137.754 350.498 139.171 361 140"/> <path style="stroke:#313131; fill:none;" d="M85 411C85.0132 391.004 93.5827 373.525 107.09 359C120.974 344.069 139.376 332.376 143.381 311C146.001 297.018 139.673 285.469 139.04 272C138.745 265.726 139.789 259.396 146.005 256.318C161.665 248.563 178.219 265.524 184.216 278C197.773 306.203 193.616 333.495 176 358C185.831 365.044 207.907 355.039 219 352.576C246.389 346.493 273.61 339.659 301 333.576C312.574 331.005 325.075 326.026 337 326.029C352.388 326.034 363.149 344.054 352.606 356.957C344.831 366.471 328.191 367.329 317 370.127C301.037 374.117 279.022 375.372 265 384C276.298 398.025 280.053 410.219 265 424"/> <path style="stroke:#313131; fill:none;" d="M233 275.424C258.769 272.039 287.651 280.751 310 293.034C319.373 298.185 334.502 316.121 315 320.677C309.643 321.929 305.376 317.953 301 315.63C291.972 310.838 282.71 306.805 273 303.615C261.482 299.831 247.044 298.788 235 299.84C227.791 300.47 218.089 304.312 211.039 302.515C201.7 300.136 198.335 286.703 206.188 280.879C213.094 275.758 224.849 276.495 233 275.424"/> <path style="stroke:#313131; fill:none;" d="M263 384L265 384"/> </svg>`);

    const excellentWorkStreaked2 = parseSvg(`<?xml version="1.0" standalone="yes"?> <svg xmlns="http://www.w3.org/2000/svg" width="851" height="856" stroke-width="7px"> <path style="stroke:#030303; fill:none;" d="M411 2.42438C449.105 -2.57886 494.102 6.40198 531 15.6265C723.743 63.8123 857.616 247.337 848.961 445C840.052 648.444 681.577 821.51 479 846.715C433.155 852.419 385.272 851.505 340 841.576C281.201 828.679 225.132 805.684 176 770.573C38.4009 672.239 -24.607 496.984 10.7901 333C21.1491 285.01 40.101 238.305 66.6921 197C122.997 109.539 210.902 45.2486 311 17.4244C344.197 8.19653 377.23 6.85846 411 2.42438"/> <path style="stroke:#030303; fill:none;" d="M407 8.42438C445.725 3.33972 489.523 11.7573 527 21.1265C704.421 65.4818 839.486 230.305 843.985 414C849.101 622.829 690.057 812.69 482 840.718C425.817 848.286 368.723 845.171 314 829.573C153.219 783.743 29.5219 643.959 9.28549 477C3.08166 425.816 7.04402 372.963 19.3742 323C30.9399 276.135 51.615 230.699 79.0255 191C133.424 112.213 214.957 52.3476 307 25.4244C340.219 15.7075 373.013 12.8869 407 8.42438"/> <path style="stroke:#030303; fill:none;" d="M448 44L446 96"/> <path style="stroke:#030303; fill:none;" d="M375 46C368.132 48.3248 358.276 47.207 352.148 51.0131C345.101 55.3904 349.9 73.2804 353 79L379 73M405 99L405 58C405 52.3893 404.939 43.947 412.957 48.4221C428.888 57.3148 426.166 85.5024 444 93M474 46L515 54M493 54L484 103"/> <path style="stroke:#030303; fill:none;" d="M294 68C296.604 80.5829 301.608 92.8235 305.667 105C306.883 108.648 307.885 115.9 312.133 117.227C319.377 119.489 331.016 112.867 338 111"/> <path style="stroke:#030303; fill:none;" d="M576 75C572.514 88.4401 567.725 101.514 564.375 115C563.238 119.579 560.969 129.268 568.99 126.922C584.001 122.532 589.965 90.2556 608 94C604.994 106.591 601.17 118.576 597.348 131C596.48 133.822 593.796 141.752 596.643 144.048C600.226 146.937 606.6 141.298 608.826 138.956C618.603 128.674 626.932 117.075 637 107M353 79C353.832 85.584 352.271 98.36 356.858 103.593C361.327 108.691 380.415 102.766 386 101"/> <path style="stroke:#030303; fill:none;" d="M243 92C247.756 103.422 253.347 115.22 259.424 126C261.292 129.313 263.214 134.977 267.105 136.356C273.705 138.696 285.52 130.198 291 127"/> <path style="stroke:#030303; fill:none;" d="M215 105C203.296 114.282 189.605 119.464 201.749 134.985C204.335 138.289 208.609 140.404 210.571 144.104C213.523 149.671 216.703 162.179 224.093 163.592C232.514 165.202 241.375 154.775 248 151"/> <path style="stroke:#030303; fill:none;" d="M230 126L210 142M660 133.479C696.137 129.243 692.787 182.982 662 187.786C623.749 193.756 626.396 137.418 660 133.479"/> <path style="stroke:#030303; fill:none;" d="M405 139.424C436.171 135.332 470.782 140.535 501 148.127C533.922 156.397 566.5 171.181 594 191.152C624.107 213.016 649.996 239.5 669.947 271C735.373 374.301 726.536 511.416 651.339 607C631.633 632.048 606.968 653.169 580 670.05C545.062 691.92 504.942 706.621 464 711.715C393.559 720.48 320.747 704.518 262 663.975C140.288 579.977 101.222 409.097 176.012 281C194.615 249.137 218.895 221.11 248 198.424C295.173 161.655 346.897 147.053 405 139.424M169 140C163.361 144.927 157.352 149.564 154.988 157C149.439 174.459 160.684 196.86 181 196.54C193.022 196.351 202.07 189.137 209 180"/> <path style="stroke:#030303; fill:none;" d="M394 294C387.293 259.413 377.378 225.447 370 191C368.14 182.315 366.164 173.642 364.116 165C363.393 161.95 361.35 157.398 362.643 154.303C364.286 150.369 372.445 150.369 376 149.75C389.762 147.355 404.009 145.068 418 145.001C474.583 144.728 537.182 159.039 583 194C548.995 236.879 520.031 285.454 489.667 331C482.663 341.506 474.533 359.8 464.471 367.357C460.956 369.997 454.856 366.785 452.523 363.786C446.033 355.442 461.327 332.201 464.85 324C480.474 287.623 499.46 242.508 473.363 206C465.59 195.127 455.172 181.907 440 184.305C419.494 187.546 424.237 209.461 422.83 224C422.047 232.09 420.068 240.2 417.86 248C406.302 288.824 378.093 320.096 355.405 355C346.134 369.263 340.861 386.148 331 400C319.019 391.991 300.787 389.604 287 385.576C257.617 376.99 228.421 367.747 199 359.291C188.975 356.409 178.957 353.449 169 350.341C165.954 349.39 160.422 346.682 157.303 348.212C154.243 349.714 153.854 355.09 153.127 358C150.81 367.265 148.665 376.543 147.272 386C142.258 420.034 143.297 454.519 151.627 488C153.483 495.462 155.08 513.435 161.51 518.292C164.421 520.492 169.988 517.622 173 516.656C182.985 513.453 193.133 510.482 203 506.95C218.079 501.552 234.466 498.459 249 491.677C269.649 482.041 286.647 466.822 300.451 449C305.537 442.434 310.491 436.045 314.947 429C316.323 426.823 319.477 423.095 318.554 420.303C317.368 416.717 310.908 417.095 308 416.989C298.082 416.628 287.882 415.771 278 414.83C247.031 411.883 215.972 410.117 185 407.17C172.85 406.013 158.685 407.454 147 404M433 146C433 157.688 428.403 175.512 434 186M372 330C362.61 319.54 356.553 305.166 349.579 293C335.437 268.332 321.246 243.695 307.15 219L292.28 193C290.779 190.374 287.234 186.343 288.306 183.105C289.98 178.042 300.619 174.938 305 172.753C322.389 164.081 342.62 155.61 362 153"/> <path style="stroke:#030303; fill:none;" d="M517 161C502.146 184.453 502.666 216.383 488 240"/> <path style="stroke:#030303; fill:none;" d="M695 198C699.581 193.514 712.022 179.817 718.816 180.167C722.069 180.335 724.679 185.713 726.371 188C731.949 195.538 738.313 205.544 728.786 213.348C719.586 220.885 709.344 215.881 703.001 208C701.133 205.68 697.983 199.425 694.741 199.036C688.514 198.291 675.569 212.046 671 216M342 378C307.108 353.083 266.275 333.519 229 312.281C213.946 303.704 196.381 296.003 183 285C203.202 254.469 224.907 227.101 254 204.424C263.755 196.821 275.08 186.798 287 183M125 190L149 247"/> <path style="stroke:#030303; fill:none;" d="M584 194C605.906 211.385 626.781 228.146 644.54 250C693.684 310.475 715.614 389.199 704.299 466C700.711 490.357 695.501 521.456 681 542C661.535 528.695 635.584 520.683 614 511.14C606.511 507.829 592.998 504.501 587.492 498.363C584.073 494.551 588.294 484.254 587.112 479C584.661 468.109 578.275 458.169 577.232 447C576.044 434.27 580.776 422.555 575.881 410C569.892 394.639 550.214 381.186 534 379.25C523.751 378.026 513.238 380.041 503 378.711C490.426 377.077 478.497 371.839 466 370"/> <path style="stroke:#030303; fill:none;" d="M106 216L134 218M708 216C704.445 226.925 700.183 234.794 692 243M137 218L167 220"/> <path style="stroke:#030303; fill:none;" d="M227 229L354 355"/> <path style="stroke:#030303; fill:none;" d="M701 262L760 231"/> <path style="stroke:#030303; fill:none;" d="M88 242C85.3239 248.428 76.6576 259.49 79.6181 266.787C82.2985 273.394 93.458 273.763 98.9105 276.429C106.199 279.993 114.736 290.624 123.995 288.79C131.381 287.328 136.405 271.232 139 265"/> <path style="stroke:#030303; fill:none;" d="M639 244L533 334.576L502 360.87L488 375"/> <path style="stroke:#030303; fill:none;" d="M725 250C738.236 259.631 762.252 258.926 778 263M112 255L101 276M742 258L720 296"/> <path style="stroke:#030303; fill:none;" d="M183 286C170.065 304.169 164.894 325.937 156 346"/> <path style="stroke:#030303; fill:none;" d="M81 304C82.4506 309.638 88.4866 322.727 94.1049 325.107C100.019 327.612 106.854 325.406 113 328L100.697 343L104 363L86 356.615L68 366C64.3795 353.636 70.5785 335.256 51 332M82 308L72.5008 326.258L55 332M796 330L783.456 344.17L785 366L766 356.631L748 364L749.972 345L737 328L756.79 324.397L767.891 310.207L776.699 324.436L796 330"/> <path style="stroke:#030303; fill:none;" d="M682 313C671.36 320.273 657.801 324.306 646 329.424C623.623 339.131 601.411 349.223 579 358.85C567.301 363.875 547.601 368.583 539 378"/> <path style="stroke:#030303; fill:none;" d="M104 363L106 365"/> <path style="stroke:#030303; fill:none;" d="M575 407C586.371 400.838 605.177 401.228 618 399.834C646.091 396.782 676.531 394.558 704 388M788 393C786.333 398.94 777.506 409.807 770.985 410.732C764.885 411.598 759.112 408.32 753 410L760.458 427L755.241 444.393L773 443.774L789 457L792.027 437.329L809 427C804.756 422.066 797.932 421.79 793.317 417.366C789.158 413.379 789.112 403.438 789 398M96 408L90.2022 425L98 443L77 443.607L63 457L58.2585 437.224L41 427L57.9761 415.79L62 396C73.7043 407.704 82.605 413.016 99 406M331 400L320 420"/> <path style="stroke:#030303; fill:none;" d="M754 445L752 447M149 471C185.319 463.957 222.357 458.092 259 453C269.697 451.514 289.188 444.185 299 449M578 448L704 465"/> <path style="stroke:#030303; fill:none;" d="M62 458L62 460"/> <path style="stroke:#030303; fill:none;" d="M66 487L85 496.958L103 489L100.893 509L114 525L95.1042 528.028L82 545L73.5818 528.728L54 523L67.3819 508L66 487M744 488C749.307 491.364 760.532 498.123 767 496.321C772.321 494.838 776.879 490.209 782 488C785.964 501.41 782.034 515.432 799 522"/> <path style="stroke:#030303; fill:none;" d="M746 490L749.138 511L738 526C743.949 527.759 751.184 526.295 756.907 528.603C762.885 531.015 767.659 543.14 769 549"/> <path style="stroke:#030303; fill:none;" d="M584 499C581.961 503.897 578.632 508.627 578.105 514C577.016 525.089 581.346 535.849 579.699 547C577.8 559.858 567.834 563.097 562.318 573.089C557.34 582.107 560.146 592.743 553.239 601.999C541.593 617.607 520.213 623.069 502 626.08C463.091 632.513 423.115 629.057 384 634L372 701C354.735 701.88 326.947 691.921 313 682C320.299 669.16 311.782 670.299 303 677L313 682"/> <path style="stroke:#030303; fill:none;" d="M162 520C163.974 533.177 172.051 546.387 178.22 558C197.522 594.337 225.187 625.911 258 650.626C271.075 660.474 286.797 673.151 303 677M795 521L778.275 526.854L769 545"/> <path style="stroke:#030303; fill:none;" d="M681 542C674.904 567.664 651.875 594.393 634.46 613.286C587.307 664.439 522.673 699.015 453 706.165C434.425 708.071 416.592 708.156 398 706.166C389.591 705.266 379.529 705.08 372 701M721 557C722.695 564.328 726.32 584.649 732.51 589.111C736.132 591.722 744.854 589.969 749 589.424C758.797 588.138 769.127 589 779 589M576 560L635 612M116 597C111.423 593.076 103.206 579.523 104.724 573.093C106.1 567.263 120.673 561.291 125.895 564.042C131.776 567.141 135.672 579.091 138 585"/> <path style="stroke:#030303; fill:none;" d="M89 612C86.252 605.267 76.6161 592.733 79.4915 585.213C82.2662 577.956 96.5219 575.677 103 574"/> <path style="stroke:#030303; fill:none;" d="M77 585L78 585M148 591C148.012 609.778 140.799 626.281 134.2 644C130.039 655.171 124.011 662.446 127 675M733 591L737 608C724.789 607.34 713.125 596.633 702 592"/> <path style="stroke:#030303; fill:none;" d="M737 608L761 623M544 611C556.829 624.445 567.954 643.753 577 660"/> <path style="stroke:#030303; fill:none;" d="M697 654C691.843 652.567 675.418 642.115 675.882 635.985C676.687 625.351 693.785 611.227 703.956 617.367C713.349 623.037 712.119 636.424 706.401 644C704.136 647.001 698.438 650.809 698.497 654.911C698.588 661.271 715.486 670.843 720 675"/> <path style="stroke:#030303; fill:none;" d="M490 630C498.544 649.275 505.246 672.449 510 693M140 634L167 631"/> <path style="stroke:#030303; fill:none;" d="M439 632L445 706M106 636C114.917 634.344 127.225 631.412 136 634"/> <path style="stroke:#030303; fill:none;" d="M315 670C332.115 654.379 360.127 637.312 383 633M711 640L742 647"/> <path style="stroke:#030303; fill:none;" d="M170 711C134.697 696.053 161.822 641.241 195 658.769C200.214 661.523 204.651 666.246 208 671"/> <path style="stroke:#030303; fill:none;" d="M654 664.428C684.284 660.129 702.328 714.052 667 718.711C634.846 722.951 617.76 669.573 654 664.428"/> <path style="stroke:#030303; fill:none;" d="M216 747C203.683 738.178 190.393 731.652 202.015 716.004C204.605 712.518 208.708 710.317 211.062 706.791C214.613 701.473 216.507 689.569 224.09 687.929C233.392 685.917 242.872 699.673 252 701"/> <path style="stroke:#030303; fill:none;" d="M612 700C613.788 713.278 619.538 725.908 622.424 739C623.18 742.425 626.02 750.829 619.942 751.033C614.583 751.213 610.539 744.601 607.611 741C599.852 731.456 593.813 720.591 582 716C576.846 728.654 588.764 746.296 590.855 759C593.693 776.24 579.851 765.411 574.12 758C571.256 754.298 568.359 750.614 565.385 747C560.836 741.472 556.04 736.082 551 731"/> <path style="stroke:#030303; fill:none;" d="M211 708L232 722M266 714C259.833 724.603 254.694 736.001 249.248 747C247.125 751.287 243.817 757.172 246.194 761.982C249.297 768.262 260.929 772.099 267 775"/> <path style="stroke:#030303; fill:none;" d="M310 734C305.616 745.449 302.2 757.358 298.333 769C296.953 773.157 293.783 779.614 296.042 783.895C299.333 790.129 313.602 792.663 320 794"/> <path style="stroke:#030303; fill:none;" d="M494 800L487.001 763L486.889 748.303L504 743"/> <path style="stroke:#030303; fill:none;" d="M379 777C373.132 775.554 359.718 776.394 355.407 772.397C351.601 768.867 353.374 749.883 358.279 747.603C365.575 744.212 377.333 749.67 385 750M464 751L484 749M448 754L447 805M405 808L405 788L405 774L405 766C405.004 757.168 410.369 751.907 417.034 761.105C424.67 771.643 427.794 785.748 435.638 795.945C438.289 799.391 441.949 800.88 446 802"/> <path style="stroke:#030303; fill:none;" d="M353 772C349.909 777.704 345.428 795.345 351.318 800.4C356.825 805.128 370.029 804.283 377 806"/> </svg>`);

    const youCanDoIt = parseSvg(`<?xml version="1.0" standalone="no"?> <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 20010904//EN" "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd"> <svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="498.000000pt" height="324.000000pt" viewBox="0 0 498.000000 324.000000" preserveAspectRatio="xMidYMid meet"> <metadata> Created by potrace 1.16, written by Peter Selinger 2001-2019 </metadata> <g transform="translate(0.000000,324.000000) scale(0.100000,-0.100000)" fill="#000000" stroke="none"> <path d="M426 3205 c-9 -24 4 -45 29 -45 27 0 40 26 24 46 -15 18 -45 18 -53 -1z"/> <path d="M4500 3171 c-6 -12 -26 -31 -43 -41 -18 -11 -26 -20 -18 -20 7 0 28 -16 47 -35 29 -32 33 -33 39 -16 3 11 20 28 37 39 30 19 30 20 9 27 -12 4 -31 20 -41 37 -18 30 -18 30 -30 9z"/> <path d="M3390 3155 c0 -8 7 -15 15 -15 8 0 15 7 15 15 0 8 -7 15 -15 15 -8 0 -15 -7 -15 -15z"/> <path d="M1231 3132 c-6 -11 -6 -24 0 -35 21 -37 70 -5 49 32 -13 26 -36 27 -49 3z"/> <path d="M2750 3130 c0 -13 5 -20 13 -17 6 2 12 10 12 17 0 7 -6 15 -12 18 -8 2 -13 -5 -13 -18z"/> <path d="M2342 3118 c-17 -17 -15 -36 6 -47 25 -13 44 1 40 30 -3 27 -27 36 -46 17z"/> <path d="M660 3094 c0 -9 7 -14 17 -12 25 5 28 28 4 28 -12 0 -21 -6 -21 -16z"/> <path d="M2640 3060 c-14 -33 -58 -75 -91 -85 -19 -6 -18 -8 12 -23 19 -10 47 -35 64 -58 l31 -41 20 36 c12 23 35 44 64 59 24 12 38 22 30 22 -26 0 -80 45 -99 83 l-19 37 -12 -30z"/> <path d="M3970 3060 c0 -28 3 -31 28 -28 21 2 27 8 27 28 0 20 -6 26 -27 28 -25 3 -28 0 -28 -28z"/> <path d="M1408 3037 c-34 -35 -35 -38 -17 -48 11 -6 29 -25 39 -42 13 -20 20 -26 20 -15 0 9 16 30 36 46 34 29 35 30 14 37 -12 4 -29 19 -38 33 l-17 27 -37 -38z"/> <path d="M403 3035 c-7 -20 2 -29 21 -22 9 4 13 13 10 22 -8 19 -23 19 -31 0z"/> <path d="M205 3030 c-11 -4 -55 -19 -97 -32 -56 -16 -78 -28 -78 -39 0 -14 36 -114 72 -199 6 -14 14 -34 18 -45 11 -29 26 -64 49 -116 12 -25 21 -51 21 -57 0 -6 8 -26 18 -44 10 -18 24 -52 32 -75 7 -24 17 -43 22 -43 4 0 8 -9 8 -19 0 -11 9 -40 20 -66 18 -43 20 -69 20 -341 0 -237 3 -294 13 -294 8 0 24 -11 37 -25 22 -23 30 -25 115 -25 l92 0 7 308 7 307 175 349 175 349 -25 26 c-15 15 -26 32 -26 37 0 14 -112 34 -188 34 l-60 0 -21 -45 c-12 -25 -21 -49 -21 -55 0 -5 -4 -10 -10 -10 -5 0 -10 -6 -10 -14 0 -8 -9 -31 -19 -53 -55 -108 -81 -168 -81 -182 -1 -20 -26 -55 -32 -44 -3 4 -26 83 -53 175 -31 109 -56 176 -71 194 -13 15 -24 33 -24 41 0 15 -52 17 -85 3z m61 -45 c-4 -14 0 -28 9 -35 8 -7 15 -22 15 -33 0 -22 17 -81 31 -109 5 -10 9 -28 9 -41 0 -13 3 -27 7 -31 4 -4 9 -19 11 -34 2 -15 7 -31 13 -37 5 -5 9 -21 9 -36 0 -15 5 -31 10 -34 6 -3 10 -19 10 -36 0 -25 4 -29 28 -29 22 0 31 8 49 48 13 26 23 50 22 55 0 4 9 24 19 45 11 20 30 60 42 87 12 28 36 79 53 115 17 36 35 75 40 87 13 29 53 37 123 24 32 -6 59 -11 61 -11 9 0 0 -34 -17 -65 -11 -20 -20 -40 -20 -45 0 -5 -16 -34 -35 -64 -19 -29 -32 -56 -29 -58 2 -3 -2 -11 -11 -18 -8 -7 -15 -16 -15 -21 0 -14 -60 -138 -70 -144 -6 -4 -8 -11 -4 -16 3 -5 -6 -25 -21 -44 -14 -19 -24 -35 -21 -35 2 0 -13 -34 -35 -76 l-39 -77 0 -319 0 -319 -87 3 -88 3 -2 300 c-2 165 -7 309 -12 320 -4 11 -14 34 -21 50 -7 17 -16 38 -22 48 -5 10 -6 22 -3 26 2 5 -2 14 -10 21 -8 7 -15 23 -15 36 0 13 -4 24 -10 24 -5 0 -10 9 -10 19 0 11 -4 22 -9 25 -5 3 -12 18 -16 33 -6 27 -16 50 -55 138 -10 22 -23 56 -30 75 -7 19 -19 51 -28 70 -8 19 -17 46 -18 61 -3 24 2 27 69 49 40 12 81 26 92 30 27 10 38 2 31 -25z"/> <path d="M4800 3005 c0 -8 7 -15 15 -15 8 0 15 7 15 15 0 8 -7 15 -15 15 -8 0 -15 -7 -15 -15z"/> <path d="M3153 2965 c-98 -21 -227 -115 -278 -201 -86 -146 -115 -238 -134 -424 -14 -131 1 -263 39 -355 4 -11 14 -36 21 -55 18 -49 71 -129 112 -167 47 -44 142 -106 197 -127 53 -21 200 -32 250 -19 l35 9 -4 104 c-3 100 -5 106 -35 142 -31 37 -32 38 -106 38 -83 0 -131 18 -162 60 -23 31 -48 147 -48 221 0 87 27 223 59 294 52 114 162 205 248 205 28 0 32 3 37 38 13 89 11 170 -5 189 -9 10 -22 28 -28 41 -10 19 -19 22 -74 21 -34 0 -90 -7 -124 -14z m151 -15 c15 0 17 -5 10 -27 -4 -16 -8 -50 -10 -78 -1 -27 -3 -56 -3 -62 -1 -9 -18 -13 -52 -13 -31 0 -48 -4 -44 -10 5 -9 -7 -14 -26 -12 -4 1 -15 -8 -24 -18 -10 -11 -23 -20 -30 -20 -15 0 -56 -47 -72 -82 -7 -16 -17 -28 -23 -28 -5 0 -10 -11 -10 -24 0 -14 -4 -27 -9 -30 -9 -6 -22 -51 -27 -100 -2 -16 -8 -34 -13 -40 -10 -12 -8 -242 3 -296 4 -19 11 -44 16 -55 5 -11 11 -27 12 -35 7 -37 39 -77 80 -103 46 -29 73 -35 165 -36 l52 -1 6 -47 c4 -27 11 -61 16 -77 7 -23 5 -33 -7 -47 -9 -10 -21 -16 -25 -13 -5 3 -15 2 -21 -3 -20 -12 -111 -10 -133 3 -11 6 -42 17 -70 24 -28 7 -74 31 -103 53 -56 42 -127 138 -138 185 -4 15 -11 36 -17 47 -6 11 -12 27 -13 35 -2 8 -9 48 -17 88 -8 39 -12 72 -10 72 2 0 -1 9 -7 20 -7 13 -7 26 -2 38 6 9 12 58 16 107 3 50 13 115 23 145 9 30 17 58 17 61 1 3 21 45 45 93 35 68 61 103 121 160 65 62 88 77 146 97 38 12 78 24 88 26 11 2 22 6 25 9 3 3 15 3 26 0 11 -3 28 -6 39 -6z"/> <path d="M4205 2898 c-4 -13 -9 -281 -12 -596 l-6 -573 39 -34 39 -34 117 -1 117 0 -6 238 c-3 130 -2 234 2 230 11 -11 95 -208 95 -224 0 -8 3 -14 8 -14 4 0 13 -15 20 -32 8 -18 17 -42 22 -53 4 -11 13 -35 20 -52 7 -18 18 -33 25 -33 8 0 27 -11 43 -25 27 -23 38 -25 121 -25 l91 0 0 578 c0 564 -1 579 -20 597 -11 10 -22 26 -25 36 -6 17 -18 19 -119 19 l-113 0 -6 -112 c-4 -62 -7 -160 -7 -217 0 -58 -4 -101 -8 -95 -5 5 -39 88 -76 184 -38 96 -83 193 -100 217 l-31 42 -111 1 c-107 0 -112 -1 -119 -22z m215 -27 c0 -11 7 -27 16 -35 8 -9 13 -20 9 -25 -3 -5 -1 -12 5 -16 5 -3 10 -17 10 -31 0 -13 5 -24 10 -24 6 0 10 -9 10 -19 0 -11 5 -23 10 -26 6 -3 10 -17 10 -31 0 -13 4 -24 10 -24 5 0 13 -12 16 -27 4 -16 10 -32 15 -38 4 -5 8 -14 9 -20 6 -48 34 -120 50 -130 5 -3 7 -11 5 -18 -7 -21 29 -82 50 -85 20 -3 20 2 20 190 0 106 3 218 6 248 4 30 7 67 8 82 1 26 2 27 86 30 l85 3 0 -562 0 -563 -73 0 c-70 0 -74 1 -95 30 -12 16 -22 32 -22 35 0 3 -7 22 -17 43 -9 20 -17 39 -18 42 -5 13 -30 72 -61 143 -19 43 -34 84 -34 92 0 8 -8 29 -18 47 -42 75 -46 84 -44 99 4 26 -50 45 -67 25 -14 -17 -10 -461 4 -475 6 -6 9 -29 7 -52 -4 -40 -5 -41 -34 -35 -17 3 -62 6 -101 6 l-70 0 6 548 c3 301 8 557 12 570 7 21 13 22 96 22 81 0 89 -2 89 -19z"/> <path d="M3682 2894 c4 -21 22 -23 26 -1 2 10 -3 17 -13 17 -10 0 -15 -6 -13 -16z"/> <path d="M1702 2888 c-30 -38 -41 -691 -14 -868 20 -126 50 -220 71 -220 6 0 11 -8 11 -18 0 -22 40 -62 62 -62 9 0 22 -7 29 -17 8 -9 37 -27 64 -39 96 -45 240 -27 330 41 143 110 205 404 193 912 l-5 192 -31 36 c-18 20 -32 40 -32 46 0 6 -39 9 -102 7 l-103 -3 -6 -255 c-9 -345 -24 -504 -51 -534 -4 -6 -8 -19 -8 -30 -1 -40 -68 -96 -115 -96 -35 0 -43 140 -24 425 6 88 13 216 17 284 l7 124 -35 43 -35 44 -106 0 c-73 0 -110 -4 -117 -12z m202 -173 c0 -88 -3 -176 -6 -195 -3 -19 -7 -132 -8 -251 -1 -203 0 -218 20 -254 12 -20 26 -43 33 -49 14 -13 80 -14 117 -2 30 11 70 55 70 77 0 9 6 22 14 29 8 6 12 18 9 26 -3 9 -1 25 5 37 15 29 21 139 28 452 7 303 4 295 94 295 94 0 91 13 87 -336 -2 -164 -6 -315 -10 -334 -4 -19 -7 -52 -7 -72 1 -20 -4 -39 -10 -43 -5 -3 -10 -19 -10 -34 0 -16 -7 -34 -15 -41 -8 -7 -12 -16 -9 -21 2 -5 -9 -35 -26 -66 -16 -32 -30 -61 -30 -65 0 -7 -92 -103 -100 -103 -3 -1 -15 -6 -27 -13 -13 -7 -23 -9 -23 -5 0 4 -4 2 -9 -5 -19 -30 -125 -36 -188 -10 -15 6 -32 10 -37 9 -5 -1 -20 8 -33 21 -28 26 -87 108 -78 108 3 0 -1 10 -9 22 -9 12 -16 36 -16 53 0 17 -4 35 -9 40 -5 6 -11 39 -12 75 -1 36 -6 70 -11 76 -9 12 -5 425 6 604 9 137 13 142 120 138 l81 -3 -1 -160z"/> <path d="M1104 2806 c-61 -15 -133 -55 -177 -99 -38 -38 -77 -110 -77 -141 0 -12 -4 -26 -8 -31 -33 -37 -42 -349 -14 -470 27 -116 117 -252 197 -297 17 -9 48 -27 70 -40 32 -18 55 -23 120 -23 96 0 135 18 213 97 98 99 141 224 149 434 6 161 -4 215 -63 323 -55 101 -160 221 -194 221 -9 0 -20 3 -24 7 -13 13 -81 33 -111 32 -16 0 -53 -6 -81 -13z m121 -27 c4 -6 13 -8 20 -5 8 3 19 -2 25 -9 7 -8 15 -13 19 -11 12 8 96 -60 111 -90 8 -16 18 -31 21 -34 17 -13 50 -84 45 -97 -3 -7 1 -16 9 -19 9 -4 13 -15 11 -29 -3 -13 2 -29 10 -36 17 -14 21 -224 4 -234 -5 -3 -10 -18 -10 -33 -1 -38 -23 -116 -38 -134 -6 -8 -9 -18 -5 -22 4 -4 2 -11 -5 -15 -8 -4 -14 -14 -16 -22 -6 -38 -119 -174 -136 -164 -4 3 -10 -1 -13 -9 -3 -8 -14 -13 -24 -12 -10 2 -21 -1 -24 -6 -7 -11 -149 -17 -149 -6 0 3 -13 11 -29 16 -35 12 -123 91 -116 103 3 4 -3 12 -12 18 -10 6 -14 11 -9 11 5 0 1 9 -9 20 -10 11 -14 20 -10 20 4 0 0 9 -10 20 -10 11 -15 23 -12 26 3 4 0 16 -8 28 -8 11 -15 34 -15 51 0 17 -5 36 -11 42 -6 6 -9 57 -6 144 5 141 13 206 28 215 5 3 9 18 9 35 0 16 5 29 10 29 6 0 10 7 10 15 0 29 98 145 123 145 4 0 25 11 48 25 22 14 43 24 47 21 5 -3 14 -1 22 5 21 12 87 11 95 -2z"/> <path d="M1113 2586 c-23 -11 -44 -28 -47 -36 -3 -8 -17 -30 -31 -49 -14 -19 -25 -46 -25 -60 -1 -14 -6 -36 -13 -48 -18 -33 2 -305 24 -319 5 -3 9 -12 9 -20 0 -9 15 -30 33 -47 31 -31 35 -32 95 -27 54 4 68 10 97 38 43 43 65 91 82 177 17 88 16 225 -1 253 -4 6 -5 16 -2 21 3 4 -1 17 -9 27 -8 10 -15 25 -15 32 0 29 -75 78 -120 79 -19 0 -54 -9 -77 -21z m181 -98 c57 -129 37 -317 -47 -430 -12 -15 -25 -28 -30 -28 -4 0 -15 -7 -23 -15 -21 -20 -67 -19 -87 3 -26 29 -39 116 -35 231 3 90 8 114 30 156 26 50 69 98 98 108 8 3 29 6 47 6 27 1 34 -4 47 -31z"/> <path d="M3628 2723 c-21 -2 -38 -8 -38 -14 0 -5 -7 -9 -15 -9 -20 0 -61 -27 -101 -66 -36 -37 -104 -165 -104 -198 0 -12 -4 -26 -9 -31 -5 -6 -15 -52 -22 -103 -10 -75 -10 -106 0 -169 19 -111 38 -140 138 -214 63 -47 71 -50 115 -46 37 3 62 15 118 55 38 29 70 48 70 43 0 -25 107 -122 150 -136 42 -13 160 38 160 69 0 8 -6 19 -14 25 -27 22 -66 118 -74 181 -12 85 0 193 37 335 l31 117 -30 35 c-17 18 -30 38 -30 43 0 5 -12 13 -27 16 -16 4 -32 10 -38 14 -5 4 -29 11 -51 15 -32 5 -45 2 -59 -11 -11 -11 -19 -13 -23 -7 -12 19 -79 52 -114 56 -18 2 -50 2 -70 0z m119 -55 c23 -11 44 -27 47 -34 8 -20 43 -17 55 3 13 23 37 23 86 -2 38 -20 40 -23 37 -60 -2 -22 -9 -49 -16 -60 -28 -44 -45 -223 -34 -370 3 -38 52 -153 72 -167 28 -20 -66 -61 -118 -51 -26 5 -86 82 -86 110 0 20 -29 73 -40 73 -5 0 -35 -25 -66 -55 -31 -30 -84 -68 -117 -84 -56 -28 -62 -29 -73 -13 -8 9 -14 13 -14 8 0 -15 -70 55 -87 88 -20 39 -27 79 -26 161 1 91 8 152 20 168 5 6 10 22 11 34 0 13 7 34 14 47 7 14 23 44 35 68 28 55 79 104 140 137 56 30 97 30 160 -1z"/> <path d="M3578 2493 c-30 -33 -72 -110 -75 -138 -1 -11 -5 -31 -8 -45 -10 -35 -8 -75 5 -110 1 -3 2 -8 1 -12 -2 -14 69 -30 83 -19 7 6 15 9 18 6 12 -12 83 93 92 135 1 3 6 12 11 20 16 25 15 147 -1 161 -7 6 -11 15 -8 20 3 5 -17 9 -44 9 -40 0 -53 -5 -74 -27z m109 -92 c-9 -71 -82 -201 -112 -201 -24 0 29 150 71 198 19 23 38 42 41 42 3 0 3 -18 0 -39z"/> <path d="M3840 1695 c0 -8 7 -15 15 -15 8 0 15 7 15 15 0 8 -7 15 -15 15 -8 0 -15 -7 -15 -15z"/> <path d="M3642 1588 c-16 -16 -15 -23 4 -42 21 -22 56 -3 52 27 -3 25 -37 34 -56 15z"/> <path d="M1630 1520 c0 -28 3 -31 28 -28 21 2 27 8 27 28 0 20 -6 26 -27 28 -25 3 -28 0 -28 -28z"/> <path d="M2457 1536 c-11 -28 4 -47 32 -44 20 2 26 8 26 28 0 20 -6 26 -26 28 -17 2 -29 -3 -32 -12z"/> <path d="M2790 1465 c0 -8 7 -15 15 -15 8 0 15 7 15 15 0 8 -7 15 -15 15 -8 0 -15 -7 -15 -15z"/> <path d="M920 1450 c-13 -8 -15 -90 -18 -619 l-3 -609 38 -36 38 -36 130 0 c147 0 216 14 311 61 73 37 192 150 233 223 117 206 118 528 4 713 -15 25 -32 54 -38 64 -5 10 -13 19 -17 19 -5 0 -8 6 -8 13 -1 6 -27 32 -60 57 -33 25 -59 48 -60 53 0 4 -5 7 -11 7 -6 0 -33 11 -61 25 -64 32 -141 51 -260 64 -119 13 -198 14 -218 1z m194 -26 c72 -5 111 -10 111 -14 0 -1 9 -3 20 -5 33 -6 48 -11 89 -28 21 -9 42 -17 46 -17 4 0 39 -23 79 -50 68 -48 136 -124 126 -140 -3 -4 2 -13 10 -20 8 -7 13 -16 10 -20 -3 -4 2 -13 10 -20 7 -6 11 -18 9 -25 -3 -8 1 -24 10 -36 9 -14 13 -33 9 -50 -3 -18 1 -38 11 -55 19 -27 21 -119 4 -141 -5 -6 -12 -38 -15 -70 -3 -32 -10 -64 -15 -70 -6 -7 -8 -19 -5 -27 3 -8 0 -20 -8 -26 -8 -6 -12 -17 -9 -24 3 -8 -2 -16 -10 -19 -9 -4 -16 -15 -16 -25 0 -41 -145 -202 -210 -234 -94 -45 -137 -63 -160 -64 -14 -1 -37 -6 -52 -10 -15 -5 -72 -8 -127 -6 l-101 3 0 542 c1 298 3 565 6 594 5 45 10 53 33 62 14 5 36 8 48 5 12 -2 56 -7 97 -10z"/> <path d="M1106 1201 c-4 -6 -7 -68 -8 -138 0 -71 -2 -168 -5 -216 -2 -49 -1 -96 2 -105 9 -21 8 -100 -1 -169 -3 -29 -3 -60 1 -70 5 -10 7 -22 6 -27 -6 -26 76 -35 126 -15 132 54 156 74 199 162 33 67 34 75 34 181 0 135 -16 207 -60 274 -32 50 -92 99 -131 108 -10 2 -29 7 -41 10 -45 13 -116 16 -122 5z m209 -96 c70 -28 115 -142 115 -290 -1 -77 -5 -100 -30 -160 -34 -79 -79 -125 -143 -145 -23 -8 -48 -18 -55 -23 -7 -6 -15 -8 -18 -5 -7 8 -6 627 1 638 7 11 88 2 130 -15z"/> <path d="M1756 1453 c-12 -12 -6 -33 9 -33 8 0 15 6 15 14 0 17 -14 28 -24 19z"/> <path d="M2665 1380 c-4 -12 -20 -29 -36 -39 l-29 -18 23 -12 c13 -7 30 -24 39 -38 l16 -26 11 22 c7 12 27 31 44 41 20 13 26 20 15 20 -9 0 -30 16 -46 36 -29 34 -30 35 -37 14z"/> <path d="M3625 1379 c-250 -12 -231 -4 -239 -96 -11 -141 -10 -149 32 -188 l37 -35 94 6 c74 6 95 4 102 -7 5 -8 9 -200 9 -426 l0 -412 28 -15 c16 -8 34 -22 41 -30 11 -13 35 -16 112 -16 54 0 100 4 103 8 3 5 8 211 12 459 l7 450 96 7 c53 3 120 6 149 6 l52 0 0 106 0 105 -37 45 -37 44 -196 -1 c-107 -1 -271 -6 -365 -10z m549 -31 c24 -33 22 -173 -1 -182 -9 -4 -76 -6 -148 -5 l-130 1 -3 -456 -2 -456 -58 -1 c-31 -1 -70 -3 -87 -4 -69 -6 -64 -41 -62 448 l2 442 -138 3 -138 3 3 96 3 97 30 8 c17 5 108 11 204 13 96 3 177 8 180 10 2 3 78 5 167 5 157 0 163 -1 178 -22z"/> <path d="M2015 1328 c-54 -29 -115 -81 -115 -98 0 -4 -11 -19 -24 -35 -37 -42 -76 -176 -89 -298 -16 -166 1 -309 53 -441 46 -114 65 -137 174 -210 190 -128 384 -60 479 167 54 131 62 175 62 352 -1 148 -3 166 -28 242 -15 45 -48 112 -72 149 -25 37 -45 68 -45 71 0 10 -94 96 -125 113 -28 16 -54 20 -123 20 -78 -1 -93 -4 -147 -32z m225 -5 c8 -4 19 -7 23 -7 12 -1 128 -118 123 -124 -3 -2 8 -28 25 -56 16 -29 29 -61 29 -72 0 -11 7 -29 15 -41 8 -12 12 -28 9 -36 -3 -9 -1 -24 5 -35 5 -10 10 -63 11 -118 1 -91 -8 -150 -40 -269 -6 -22 -12 -44 -13 -50 -1 -5 -7 -17 -12 -25 -5 -8 -10 -17 -11 -20 -10 -50 -120 -168 -169 -181 -19 -6 -35 -14 -35 -19 0 -6 -27 -10 -59 -10 -51 0 -69 5 -117 35 -85 50 -116 85 -143 156 -14 35 -29 73 -35 84 -5 11 -11 25 -12 30 -2 6 -6 21 -10 35 -4 14 -9 48 -11 75 -2 28 -6 67 -9 88 -4 20 -2 43 4 50 5 6 8 37 7 67 -1 30 1 62 5 70 5 8 11 31 14 51 3 20 14 57 25 83 11 25 21 50 22 54 1 4 11 20 23 35 50 66 79 97 90 97 6 0 19 9 29 20 9 11 25 20 36 20 10 0 23 6 29 13 10 12 121 12 152 0z"/> <path d="M2088 1090 c-14 -8 -26 -19 -26 -25 -1 -5 -10 -19 -19 -30 -10 -11 -17 -24 -15 -28 1 -4 -4 -18 -13 -30 -8 -12 -15 -31 -15 -44 0 -12 -4 -25 -10 -28 -13 -8 -13 -206 0 -240 5 -14 12 -40 15 -58 4 -17 10 -36 15 -42 4 -5 9 -13 9 -18 1 -14 31 -67 39 -68 4 -1 30 -3 59 -5 45 -3 56 0 84 23 41 35 64 90 85 204 28 153 0 315 -65 379 -31 30 -103 35 -143 10z m163 -112 c20 -45 23 -69 23 -158 0 -185 -60 -320 -141 -320 -31 0 -33 3 -50 58 -12 40 -17 90 -17 167 0 130 23 202 83 266 52 54 73 52 102 -13z"/> <path d="M3080 1351 l-105 -6 -3 -552 c-2 -426 1 -553 10 -553 6 0 23 -11 37 -24 24 -22 36 -24 146 -27 l120 -4 6 420 c4 231 10 476 13 545 l7 125 -36 38 c-42 44 -53 46 -195 38z m148 -540 c1 -371 -1 -518 -9 -527 -8 -10 -41 -14 -120 -14 l-109 0 0 524 c0 410 3 525 13 530 6 2 59 4 117 3 l105 -2 3 -514z"/> <path d="M4407 1276 c-11 -28 4 -47 32 -44 20 2 26 8 26 28 0 20 -6 26 -26 28 -17 2 -29 -3 -32 -12z"/> <path d="M406 1256 c-5 -22 -58 -76 -88 -90 -11 -5 -11 -7 0 -12 30 -14 83 -68 88 -91 l6 -24 20 31 c22 37 68 79 86 80 16 0 16 20 -1 20 -16 0 -87 71 -87 87 0 23 -18 22 -24 -1z"/> <path d="M650 1265 c0 -8 7 -15 15 -15 8 0 15 7 15 15 0 8 -7 15 -15 15 -8 0 -15 -7 -15 -15z"/> <path d="M770 1180 c0 -28 3 -31 28 -28 21 2 27 8 27 28 0 20 -6 26 -27 28 -25 3 -28 0 -28 -28z"/> <path d="M4532 1125 c-7 -14 -26 -32 -43 -39 l-31 -13 26 -7 c15 -4 35 -20 44 -36 l18 -29 27 35 c16 19 36 34 45 34 14 1 14 2 -3 11 -11 6 -32 24 -46 40 l-26 29 -11 -25z"/> <path d="M632 866 c-10 -12 -29 -29 -42 -38 -19 -13 -21 -17 -8 -17 9 -1 28 -15 42 -32 l26 -31 22 27 c11 15 28 30 38 33 14 6 10 13 -22 43 l-38 35 -18 -20z"/> <path d="M4590 829 c0 -24 23 -21 28 4 2 10 -3 17 -12 17 -10 0 -16 -9 -16 -21z"/> <path d="M4307 775 c-10 -21 -36 -47 -64 -65 -26 -17 -39 -30 -30 -30 22 0 87 -58 98 -89 l10 -25 15 30 c22 42 45 65 78 79 l30 13 -30 15 c-36 19 -70 54 -81 85 -9 22 -9 22 -26 -13z"/> <path d="M727 574 c-9 -10 2 -24 19 -24 8 0 14 7 14 15 0 15 -21 21 -33 9z"/> <path d="M2707 412 c-13 -3 -17 -11 -15 -30 2 -21 8 -27 28 -27 20 0 26 6 28 26 3 28 -10 38 -41 31z"/> <path d="M1707 334 c-24 -24 13 -72 42 -55 20 13 9 56 -14 59 -12 2 -24 0 -28 -4z"/> <path d="M3444 318 c-9 -28 20 -52 47 -37 22 11 24 30 7 47 -19 19 -46 14 -54 -10z"/> <path d="M1850 215 c0 -10 7 -15 18 -13 21 4 19 22 -2 26 -10 2 -16 -3 -16 -13z"/> <path d="M2751 204 c-6 -13 -22 -29 -35 -35 l-24 -11 34 -30 c19 -17 34 -37 34 -47 1 -10 6 -6 16 12 8 15 30 37 47 47 20 12 26 20 16 20 -10 0 -30 15 -47 34 l-30 34 -11 -24z"/> <path d="M1630 197 c0 -8 -15 -28 -33 -43 l-32 -29 32 -28 c18 -16 33 -36 33 -45 0 -8 10 0 23 19 12 19 32 38 44 44 l21 9 -21 11 c-12 6 -32 26 -44 44 -13 19 -23 27 -23 18z"/> <path d="M2510 180 c0 -11 7 -20 15 -20 8 0 15 9 15 20 0 11 -7 20 -15 20 -8 0 -15 -9 -15 -20z"/> <path d="M3600 185 c0 -8 7 -15 15 -15 8 0 15 7 15 15 0 8 -7 15 -15 15 -8 0 -15 -7 -15 -15z"/> <path d="M3480 165 c0 -8 7 -15 15 -15 8 0 15 7 15 15 0 8 -7 15 -15 15 -8 0 -15 -7 -15 -15z"/> <path d="M2954 99 c-10 -17 13 -36 27 -22 12 12 4 33 -11 33 -5 0 -12 -5 -16 -11z"/> </g> </svg>`);

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
            "newLevel": newLevel,
            "axolotl": axolotlStamp,
            "cuteAxolotl": cuteAxolotl,
            "cuteCat": cuteCat,
            "cuteCrab": cuteCrab,
            "cuteFish": cuteFish,
            "cuteHorse": cuteHorse,
            "cuteTurtle": cuteTurtle,
            "tanjiro": tanjiro,
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
            getWriteStrokes: function() {return writeStrokes;},
            getNewDrawCounter: function() {return newDrawCounter;},
            undoInk: undoInk,
            saveDrawing: saveDrawing,
            writeAt: writeAt,
            drawCell: drawCell,
            getStampDimensions: getStampDimensions,
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

const sizeslider = document.createElement("input");
sizeslider.className = "sizeslider";
sizeslider.type = "range";
sizeslider.value = 33;
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
  top: 80px;
  border: 1px solid;
  width: 405px;
  z-index: 253;
  right: 0px;
  background-color: rgb(240, 240, 247);
  max-height: calc(-160px + 100vh);
  overflow: auto;
  --sizeslider: 0.33;
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
.drawtab > input {
  margin: 7px;
}
.drawtab > input[type=checkbox] {
  margin-right: 3px;
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
.drawtab .undoLast {
  padding-top: 3px;
  position: sticky;
  top: 10px;
}
.drawtab .pencolorbtn {
  position: sticky;
  top: 10px;
}
.drawtab .textprintbtn {
  margin: 10px;
}
.drawtab .sizeslider {
  position: sticky;
  top: 13px;
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
