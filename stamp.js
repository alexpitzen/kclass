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
        constructor(strokes, width, height) {
            this.strokes = strokes;
            this.width = width;
            this.height = height;
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
        "@": new DrawLetter("@", [
            new Stroke([
                new Linear({x:0, y:0}, {x:0.01, y:0.01}),
            ]),
        ], 1),
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

        let atd = getAtd();
        let currentDrawIndex = atd.countDrawItems();
        newDrawCounter = 0;
        if (!dryRun) {
            setPenColorHex(color);
        }
        let previousAlpha = atd.pen.col.A;
        let previousWidth = atd.pen.w;
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
            width: (stampDimensions.max.x - stampDimensions.min.x) * atd.drawingContext.zoomRatio,
            height: (stampDimensions.max.y - stampDimensions.min.y) * atd.drawingContext.zoomRatio,
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
        let strokes = [];
        for (let child of svgElem.children) {
            strokes = strokes.concat(parseChild(child));
        }
        return new DrawStamp(strokes, width, height);
    }

    function drawAxolotl(pos, scale, options, dryRun = false) {
        return writeStampAt(axolotlStamp, pos, scale, options, dryRun);
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

    function parseG(element, transform) {
        let newTransforms = element.getAttribute("transform") || "";
        let allTransforms = [];
        if (newTransforms !== "") {
            for (let newTransform of newTransforms.split(" ").reverse()) {
                // TODO
                // allTransforms.push();
            }
        }
        allTransforms = allTransforms.concat(transform);
        let strokes = [];
        for (let child of element.children) {
            strokes = strokes.concat(parseChild(child, allTransforms));
        }
        return strokes;
    }

    const pathRegex = /([MmCcLlZzQq][0-9. -]*)/g;

    function parameterizePathSection(str) {
        return [str[0], ...str.substring(1).trim().split(" ").map(parseFloat)];
    }

    function parsePath(element, transform) {
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
                    x = pathSection.shift();
                    y = pathSection.shift();
                } else {
                    x += pathSection.shift();
                    y += pathSection.shift();
                }
                mx = x;
                my = y;
            } else {
                if (currentStroke == null) {
                    currentStroke = new Stroke([]);
                }
                do {
                    if (cmd == "L") {
                        let x2 = pathSection.shift();
                        let y2 = pathSection.shift();
                        currentStroke.lines.push(makeLinear(x2, y2));
                        x = x2;
                        y = y2;
                    } else if (cmd == "l") {
                        let dx = pathSection.shift();
                        let dy = pathSection.shift();
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
                        let cx1 = pathSection.shift();
                        let cy1 = pathSection.shift();
                        let cx2 = pathSection.shift();
                        let cy2 = pathSection.shift();
                        let x2 = pathSection.shift();
                        let y2 = pathSection.shift();
                        currentStroke.lines.push(new Bezier(x,y,cx1,cy1,cx2,cy2,x2,y2));
                        x = x2;
                        y = y2;
                    }
                } while (pathSection.length > 0);
            }
        }
        return strokes;
    }

    const axolotl_centerline = `<?xml version="1.0" standalone="yes"?>
<svg xmlns="http://www.w3.org/2000/svg" width="2307" height="2307">
<path style="stroke:#050505; fill:none;" d="M1038 430.464C1103.72 418.637 1138.33 509.948 1084 546.64C1077.51 551.025 1069.77 555.131 1062 556.536C1051.26 558.477 1039.54 558.591 1029 555.43C1021.26 553.107 1014.2 548.465 1008 543.384C965.816 508.803 984.1 440.165 1038 430.464M285 601.439C342.028 592.462 379.668 660.681 347.211 706C335.702 722.071 317.894 729.866 299 732.572C259.407 738.241 225.425 700.014 228.09 662C230.261 631.016 254.801 606.193 285 601.439M1152 635.518C1198.15 625.732 1215.62 700.746 1169 710.625C1161.13 712.294 1151.55 712.708 1144 709.468C1109.06 694.479 1116.02 643.147 1152 635.518M1065 769.532C1091.02 763.333 1102.15 803.113 1076 809.645C1050.56 815.999 1039.21 775.676 1065 769.532M441 770.514C456.172 769.536 472.517 776.151 479.954 790C492.54 813.44 480.786 850.463 451 852.907C432.509 854.424 415.085 847.414 406.378 830C393.106 803.455 412.492 772.351 441 770.514M1192 1119C1190.43 1124.33 1187.72 1138.69 1191.03 1143.57C1195.37 1149.98 1204.83 1145.66 1204.02 1157C1203.44 1164.95 1193.51 1166.31 1192.77 1174C1191.96 1182.5 1204.77 1192.22 1201.72 1198.87C1198.89 1205.01 1189.73 1202.51 1187.57 1210C1184.88 1219.36 1192.45 1233.11 1185.15 1241.55C1180.29 1247.16 1170.39 1238.05 1166.18 1245.15C1163.25 1250.09 1163.63 1261.37 1164.17 1267C1164.45 1269.91 1166.13 1274.81 1163.97 1277.36C1158.76 1283.5 1146.57 1269.92 1140.21 1273.12C1131.34 1277.58 1129.48 1294.25 1120.91 1300.29C1111.38 1307.01 1109.97 1290.84 1101 1292.67C1089.35 1295.04 1095.2 1315.06 1085.89 1317.07C1077.65 1318.85 1075.78 1307.29 1068.98 1306.1C1060.79 1304.68 1055.75 1312.92 1049 1315.66C1042.16 1318.43 1039.12 1315.41 1032.99 1313.01C1027.83 1311 1024.61 1308.92 1024.09 1303C1023.82 1299.85 1022.24 1292.22 1024.07 1289.59C1026.58 1285.98 1034.26 1287.23 1038 1286.83C1047.98 1285.75 1058.4 1282.17 1068 1279.28C1107.7 1267.32 1153.92 1240.17 1168 1199C1171.09 1189.96 1178.1 1167.19 1171.97 1158.33C1169.66 1154.99 1164.65 1157.32 1162.01 1158.99C1154.33 1163.87 1148.45 1173.55 1142 1180C1115.81 1206.19 1083.94 1228.25 1049 1240.95C1042.66 1243.25 1016.6 1252.09 1012.89 1243.9C1009.61 1236.66 1013.45 1216.18 1024 1216.52C1032.42 1216.8 1035.51 1229.21 1044.53 1219.79C1048.13 1216.03 1049.51 1211.1 1049.79 1206C1049.92 1203.68 1048.58 1199.78 1050.64 1198.03C1056.33 1193.21 1067.47 1201.81 1073.86 1198.8C1081.66 1195.13 1079.51 1176.7 1087.21 1170.7C1096.92 1163.14 1097.29 1179.13 1106 1178.74C1117.23 1178.24 1116.63 1151.51 1115 1144C1120.55 1142.4 1132.16 1147.23 1136.4 1143.36C1143.98 1136.44 1135.87 1118.06 1149 1113.79C1159.13 1110.49 1157 1129.13 1168 1126.21C1173.13 1124.84 1187.37 1120.2 1190.87 1116.41C1196.6 1110.2 1198.87 1100.71 1205.17 1094.04C1215.53 1083.07 1228.81 1073.57 1242 1066.31C1285.76 1042.22 1338.5 1039.74 1384 1018.69C1403.04 1009.88 1417.54 995.223 1434 982.654C1452.08 968.843 1472.02 957.227 1493 948.424C1518.3 937.807 1545.6 929.823 1573 927.17C1612.63 923.332 1652.34 926.623 1692 922.83C1736.89 918.538 1776.01 891.486 1821 887.17C1877.88 881.712 1925.2 903.002 1979 916.626C2013.2 925.285 2048.66 922.226 2083 929.662C2132.2 940.317 2178.35 975.781 2205 1018C2208.12 1022.95 2208.19 1028.93 2211 1034M593 941L592 950C578.5 952.446 575.631 969.552 573.211 981C566.486 1012.81 569.448 1047.54 580.681 1078C584.146 1087.39 589.127 1095.89 593.125 1105C594.507 1108.15 596.731 1112.54 594.298 1115.7C586.709 1125.55 565.15 1115.35 562.123 1106C560.322 1100.43 564.176 1095.4 560.99 1090C557.137 1083.47 550.113 1079.99 548.689 1072C547.591 1065.84 554.731 1065.06 554.002 1059C552.864 1049.53 545.963 1041.78 544.773 1032C543.993 1025.59 548.931 1022.07 547.611 1015C546.227 1007.58 541.507 999.758 542.238 992.059C542.819 985.94 551.29 989.711 552.643 983.891C554.48 975.989 546.49 969.523 546.951 962.005C547.384 954.947 556.32 957.226 558.357 951.856C561.003 944.882 555.729 935.682 558 928C563.276 929.256 572.23 930.463 574.442 923.942C575.742 920.11 574.223 907.239 579.148 906.618C588.259 905.469 593.81 915.489 601 918.81C606.618 921.405 624.686 916.045 630 913M625 916C623.753 925.261 613.67 937.716 617.742 946.856C620.575 953.212 633.657 948.131 634.357 955.134C635.209 963.657 624.371 967.177 624.863 975.001C625.345 982.683 637.256 988.201 634.303 996.852C632.299 1002.72 621.371 996.92 621.474 1004.06C621.639 1015.55 633.481 1013.28 638.356 1020.22C642.182 1025.67 634.813 1032.26 636.071 1037.96C637.282 1043.44 645.25 1044.31 647.948 1049.04C651.744 1055.7 642.112 1060.36 644.667 1066.94C647.322 1073.78 656.726 1068.03 659.397 1074.15C661.102 1078.06 657.184 1088.35 661.333 1090.39C664.982 1092.19 673.052 1090.14 677 1089.57C689.708 1087.75 702.201 1085.39 715 1084.17C748.489 1080.98 783.53 1085.26 816 1093.38C844.213 1100.43 871.661 1111.11 897 1125.42C905.948 1130.48 920.222 1143.3 931 1139C929.428 1133.68 926.91 1112.37 935.044 1111.64C939.718 1111.23 949.19 1119.03 952.973 1114.39C956.932 1109.54 952.171 1095.01 959.228 1092.41C965.216 1090.2 972.902 1099.94 978.411 1093.68C986.629 1084.35 974.17 1070.07 977.693 1060.15C980.086 1053.41 992.72 1059.25 997.258 1055.23C999.578 1053.17 999.025 1048.76 998.996 1046C998.903 1036.95 996.728 1025.63 994 1017L1006.77 1014.4L1015.01 995.213L1025 985M592 950C596.868 955.756 595.501 960.971 596.17 968C597.216 978.998 597.879 990.038 599.424 1001C602.045 1019.59 604.777 1038.55 612.012 1056C618.03 1070.52 628.442 1083.62 632 1099C642.178 1096.55 650.287 1096.64 659 1090M1202 1147C1216.62 1129.1 1242.63 1117.94 1263 1107.75C1312.71 1082.9 1365.33 1063.22 1418 1045.67C1551 1001.33 1688.29 972.48 1828 962.911C1864.33 960.422 1900.63 961.368 1937 962.961C1959.11 963.929 1982.27 964.276 2004 969.189C2010.4 970.635 2012.78 977.443 2019 979.022C2046.64 986.036 2074.88 986.888 2102 997M504 1081C507.268 1082.74 515.964 1081.7 517.802 1084.6C521.147 1089.88 513.465 1099.04 517.042 1104.68C520.11 1109.52 528.887 1105.26 531.535 1111.15C533.487 1115.49 529.635 1122.7 532.773 1126.4C538.927 1133.64 551.607 1121.7 552.006 1137C552.362 1150.61 536.67 1152.2 529.418 1159.42C524.227 1164.59 521.013 1172.34 515.714 1177.91C512.114 1181.69 506.206 1183.17 502.988 1186.84C498.668 1191.78 500.834 1199.63 492.999 1202.28C486.182 1204.59 470.727 1199.61 464.015 1197.32C453.125 1193.59 463.071 1182.08 456.602 1175.39C448.441 1166.96 433.495 1166.29 427.534 1154.99C422.571 1145.58 437.722 1142.86 431.293 1134.19C427.132 1128.57 411.211 1128.37 410.121 1121.94C408.782 1114.04 419.753 1109.83 418.487 1102C416.575 1090.18 400.006 1083.86 401.746 1070.15C402.626 1063.21 417.138 1070.42 417.681 1060.98C418.404 1048.42 403.711 1043.34 402.838 1032C402.216 1023.94 414.762 1027.1 413.742 1018C412.983 1011.23 404.787 995.564 409.067 989.422C411.815 985.479 422.366 992.132 426.815 990.382C436.882 986.423 433.658 966.028 446.982 965.362C454.411 964.99 451.777 975.911 455.434 979.682C459.688 984.07 470.663 982.271 476 981C478.411 989.393 469.491 1001.48 474.028 1008.61C478.601 1015.8 496.176 1015.48 496.427 1025.99C496.665 1035.94 477.472 1032.89 480.395 1046C483.363 1059.31 496.616 1056.23 504.397 1062.99C510.756 1068.51 504.077 1080.67 499 1084M2015 978C2006.28 986.434 1992.6 985 1981 985C1961.92 985 1942.87 987.492 1924 990.272C1855.58 1000.35 1788.41 1022.92 1724 1047.42C1633.68 1081.78 1550.67 1137.17 1478 1200.28C1434.1 1238.41 1394 1280.8 1352 1320.96C1313.14 1358.12 1270.62 1392.96 1226 1423C1215.83 1429.84 1204.28 1436.32 1195.05 1444.38C1192.19 1446.87 1187.51 1452.79 1189.82 1456.85C1192.42 1461.43 1199.7 1459.76 1204 1460.17C1217.09 1461.42 1229.82 1463.69 1243 1464.01C1254.6 1464.3 1266.5 1464.71 1278 1462.33C1329.21 1451.77 1366.5 1411.03 1400.96 1375C1418.22 1356.95 1434.22 1336.41 1456 1323.45C1487.8 1304.53 1524.95 1297.61 1555 1275.1C1605.79 1237.07 1629.47 1171.72 1684 1138.06C1724.75 1112.92 1772.66 1123.42 1816 1108.3C1859.1 1093.27 1890.68 1056.33 1938 1053.09C1974.46 1050.59 2007.78 1072.29 2044 1068.83C2076.64 1065.71 2105 1047.49 2136 1038.42C2160.64 1031.22 2182.81 1033 2208 1033M409 986L410 987M1024 990C1028.42 994.927 1031.06 1003.58 1038 1005.41C1043 1006.73 1052.59 1001.13 1056.4 1004.64C1061.71 1009.55 1055.89 1022.56 1058.6 1028.86C1061.2 1034.89 1069.6 1030.9 1073.3 1035.32C1078.76 1041.82 1066.87 1048.79 1069.5 1055.94C1071.56 1061.52 1080.04 1058.19 1079.97 1065.02C1079.87 1073.91 1071.58 1078.23 1069.24 1086C1067.62 1091.37 1072.6 1095.68 1072.1 1100.98C1071.57 1106.59 1064.11 1108.17 1061.8 1113.04C1058.47 1120.09 1064.45 1126.24 1060.16 1132.98C1055.9 1139.67 1045.82 1139.78 1042.03 1146.21C1038.5 1152.2 1044.25 1162.23 1039.26 1167.51C1034.5 1172.55 1023.1 1166.53 1017.51 1171.6C1011.58 1177 1019.04 1186.28 1010.96 1190.7C1005.61 1193.62 993.274 1190.42 989.904 1195.43C988.054 1198.19 990.027 1203.19 990.975 1206C994.11 1215.29 1001.23 1226.15 1009 1232M446 1003C444.911 1011.59 440.779 1014.49 438.148 1022C434.803 1031.55 434.777 1043.96 434.09 1054C430.518 1106.16 461.158 1156.3 502 1186M445 1014C452.96 1022.16 453.069 1031.33 455.424 1042C457.95 1053.44 461.777 1064.41 466.781 1075C477.082 1096.81 488.921 1118.01 505.17 1136C512.497 1144.11 521.67 1149.98 529 1158M975 1182C965.553 1179.53 956.595 1168.97 950.044 1162C947.669 1159.47 944.113 1155.85 945.357 1152C948.123 1143.45 964.443 1135.75 971 1129.83C987.426 1114.99 1001.44 1098.5 1011.97 1079C1018.36 1067.18 1022.77 1054.16 1025.39 1041C1026.23 1036.78 1027.42 1031.48 1033 1033.03C1047.67 1037.1 1047.34 1066.28 1046.17 1078C1043.24 1107.34 1028.21 1133.81 1007.96 1155C999.81 1163.53 983.392 1172.02 977.904 1182.17C974.462 1188.53 982.185 1193.21 987 1195M1076 1039L1082 1039M631 1100C623.178 1108.56 608.408 1109.48 598 1113M337 1267C338.565 1262.5 340.248 1249.18 334.852 1246.74C331.191 1245.09 322.561 1248.11 320.643 1243.68C316.812 1234.85 324.848 1222.39 314.786 1214.73C309.821 1210.95 296.819 1215.27 294.117 1211.39C289.416 1204.64 299.327 1191.67 297.388 1184.04C295.385 1176.16 282.315 1173.16 284.121 1163.13C285.145 1157.45 294.172 1160.51 295.142 1153.98C296.802 1142.81 288.433 1123.63 297.433 1114.27C305.27 1106.12 311.297 1125.72 320 1123.93C325.925 1122.71 329.018 1114.15 335.891 1115.41C342.833 1116.69 340.423 1130.3 344.317 1134.82C349.821 1141.21 359.652 1139.55 365.535 1145.28C372.824 1152.37 374.618 1166.52 382.394 1172.36C388.512 1176.95 396.42 1165.74 402.411 1169.21C408.747 1172.88 402.655 1187.92 407.728 1193.56C412.623 1199 419.336 1190.78 424.957 1193.27C431.924 1196.36 433.267 1208.25 437.789 1213.89C443.996 1221.63 450.458 1215.17 458 1217.83C464.934 1220.27 467.915 1228.42 475 1230.22C485.204 1232.81 489.672 1210.84 491 1204M579 1120C575.546 1131.63 563.821 1135.77 553 1138M350 1140L350 1144M929 1141C933.532 1146.18 937.094 1150.34 944 1152M317 1155C320.78 1160.74 332.368 1162.42 338 1168C366.283 1196.02 395.744 1218.96 432 1235.75C442.518 1240.62 454.264 1246.65 466 1247C468.501 1247.08 472.548 1248.88 474.75 1247.44C478.149 1245.23 477.938 1235.7 478 1232M1205 1158L1209 1158M317 1159C329.058 1209.07 362.604 1247.08 408 1271.69C422.344 1279.47 437.531 1286.13 453 1291.33C458.44 1293.16 468.901 1292.8 472.042 1298.11C478.868 1309.65 454.926 1310.83 449 1310.99C438.069 1311.28 438.531 1321.19 429.003 1323.15C420.321 1324.94 423.686 1312.48 416.945 1310.81C411.939 1309.57 406.094 1315.36 401.228 1312.88C395.675 1310.05 395.909 1298.04 391.319 1293.28C384.324 1286.02 377.463 1294.42 370.043 1290.46C361.266 1285.78 361.689 1272.45 353.79 1266.74C349.869 1263.91 343.57 1265 339 1265M1203 1198L1206 1198M589 1205.44C616.612 1201.33 614.796 1240.8 591 1244.85C559.203 1250.27 561.26 1209.58 589 1205.44M902 1244.48C912.707 1242.15 924.669 1247.95 929.196 1258C933.571 1267.71 931.626 1282.29 920 1285.5C907.844 1288.85 894.533 1279.85 891.354 1268C888.86 1258.71 891.204 1246.84 902 1244.48M1015 1248C1016.59 1260.6 1017.78 1276.77 1024 1288M474 1249C474 1263.76 477.183 1282.85 473 1297M607 1300C622.462 1318.83 649.773 1328.74 672 1337.05C737.321 1361.48 819.631 1367.7 881 1330M475 1305C484.866 1310.72 488.678 1323.66 494.692 1333C503.923 1347.33 516.055 1358.89 526.779 1372C529.184 1374.94 529.983 1378.95 532.51 1381.7C535.493 1384.94 540.487 1384.83 543.896 1387.51C547.633 1390.45 548.667 1395.48 552.263 1398.44C555.997 1401.51 561.783 1401.55 566 1403.95C578.745 1411.24 590.959 1419.14 604 1426M1026 1310C1022.01 1317.44 1021.62 1329.95 1024 1338C1029.67 1336.65 1043.12 1334.37 1047.77 1338.44C1051.34 1341.55 1050.1 1349.64 1055.13 1350.79C1063.41 1352.7 1064.39 1341.54 1071.04 1341.33C1079.45 1341.07 1081.66 1351.6 1089 1353.07C1095.78 1354.43 1107.94 1344.99 1115 1343C1116.07 1346.61 1115.65 1350.39 1116.72 1353.98C1121.58 1370.17 1141.33 1344.58 1147.98 1345.36C1153.94 1346.05 1152.82 1354.42 1158.11 1355.97C1167.98 1358.87 1181.05 1347.73 1190.67 1352.6C1195.24 1354.92 1190.77 1372.77 1193.86 1378C1196.02 1381.67 1200.49 1384.56 1201.2 1389C1202.43 1396.68 1189.21 1395.77 1185.56 1400.22C1178.79 1408.49 1182.24 1422.2 1173.79 1429.68C1167.97 1434.82 1159.96 1428.63 1154.21 1432.75C1149.24 1436.31 1149.21 1449.57 1143.85 1450.78C1135.72 1452.63 1130.56 1442.97 1123 1443.25C1112.62 1443.63 1108.34 1457.93 1097.06 1458.24C1090.1 1458.43 1094.29 1445.97 1087.89 1443.64C1078.25 1440.14 1072.85 1454.46 1064 1454.44C1055.96 1454.43 1058.24 1442.74 1050.98 1441.41C1041.46 1439.66 1032.8 1452.95 1023.13 1449.36C1015.67 1446.58 1021.13 1434.03 1014.72 1430.19C1005.77 1424.83 992.744 1448.16 986.854 1435.89C984.158 1430.28 982.106 1416.85 984.038 1411C986.667 1403.04 995.099 1402.65 998.348 1395.96C1004.91 1382.43 1012.43 1368.71 1018.7 1355C1021.37 1349.14 1019.63 1342.84 1023 1337M1054 1353C1052.5 1356.68 1051.04 1363.17 1046.94 1364.76C1041.72 1366.79 1023.78 1357.94 1019 1355M1048 1366C1070.19 1380.06 1107.36 1383.27 1133 1380.83C1142.3 1379.95 1151.68 1378.73 1161 1378.09C1163.64 1377.91 1169.13 1377.09 1170.93 1379.6C1173.94 1383.77 1168.42 1392.02 1165.81 1395C1156.34 1405.8 1143.54 1413.32 1130 1417.66C1100.34 1427.16 1055.06 1420.32 1026 1410.67C1016.71 1407.58 1005.92 1404.88 998 1399M532 1382C520.529 1392.22 501.168 1396.48 487 1402.2C459.981 1413.1 431.779 1425.38 409 1443.8C387.948 1460.83 370.012 1483.59 355.001 1506C348.041 1516.39 340.392 1535.45 329.96 1542.4C324.298 1546.16 315.424 1544.5 309 1545.29C293.155 1547.23 278.234 1551.61 264 1558.75C258.236 1561.64 251.642 1564.84 248.801 1571C242.379 1584.93 272.101 1581.68 281 1583.9C285.097 1584.92 290.642 1586.88 290.581 1592C290.487 1599.95 278.197 1606.46 273 1611.17C261.024 1622.02 250.316 1635.47 249 1652C277.686 1648.14 307.502 1625.18 337.985 1635.23C349.155 1638.91 348 1666.46 348 1676C348 1682.01 347.294 1690.6 356 1687.43C363.54 1684.69 368.469 1676.4 372.656 1670C380.846 1657.48 387.22 1642.87 389.561 1628C391.004 1618.83 389.45 1609.04 391.928 1600C394.541 1590.47 401.774 1581.42 406.799 1573C420.092 1550.73 434.816 1527.76 456 1512.16C478.808 1495.36 505.23 1486.01 532 1477.66C539.627 1475.28 560.712 1473.72 565.107 1466.72C568.337 1461.58 562.96 1450.92 561 1446C554.922 1430.76 551 1416.5 551 1400M838 1466C869.722 1465.74 905.594 1455.48 934 1441.74C950.249 1433.88 964.645 1420.93 982 1416M1147 1453C1155.75 1471.19 1173.73 1458.08 1187 1457M1172 1465C1176.42 1476.36 1186.93 1481.1 1194.71 1490C1204.52 1501.23 1209.6 1513.84 1213.57 1528C1217.15 1540.76 1216.36 1555.03 1214.57 1568C1213.46 1576.08 1209.46 1586.06 1212.61 1594C1219.68 1611.82 1230.12 1625.56 1227.42 1646C1226.84 1650.43 1227.83 1657.98 1223.69 1660.95C1219.18 1664.18 1214.21 1659.94 1211 1656.96C1205 1651.4 1192.84 1637.67 1183.1 1642.27C1178.88 1644.27 1177.48 1650.1 1175.69 1654C1171.73 1662.64 1167.26 1671.08 1162 1679C1159.08 1683.38 1154.36 1690.96 1148.04 1687.81C1136.41 1682 1137 1653.93 1137 1643C1137 1637.96 1138 1629.06 1132.85 1626.03C1123.86 1620.74 1102.95 1630.45 1094 1633.33C1090.92 1634.32 1081.51 1637.65 1079.07 1634.38C1075.89 1630.14 1081.86 1620.3 1084.34 1617C1091.01 1608.13 1100.04 1600.74 1110 1595.81C1115.78 1592.95 1123.85 1593.36 1127.08 1586.96C1130.17 1580.83 1129.64 1573.61 1130.09 1567C1131.76 1542.53 1122.71 1522.4 1104 1506.19C1099.33 1502.14 1092.87 1501.99 1088.39 1498.27C1083.2 1493.96 1081.15 1488.15 1075 1484M567 1466C574.707 1471.79 581.765 1479.19 587.446 1487C589.791 1490.22 590.369 1496.28 593.563 1498.58C596.3 1500.55 600.105 1500.83 603 1502.69C618.272 1512.49 632.494 1523.92 647.999 1533.62C652.273 1536.29 654.776 1541.33 659.104 1543.57C665.308 1546.77 673.407 1546.09 680 1548.44C706.574 1557.9 732.853 1565.35 761 1568.71C794.897 1572.77 831.06 1572.41 865 1569.17C872.685 1568.44 893.912 1569.84 898.071 1561.89C903.224 1552.04 883.744 1540.01 878 1535M945 1482C964.13 1497.18 983.23 1512.25 1002 1527.87C1005.14 1530.49 1009.59 1531 1012.49 1533.7C1015.49 1536.5 1016.39 1541.64 1018.83 1545C1032.09 1563.24 1040.68 1582.37 1042.83 1605C1044.52 1622.74 1042.99 1641.52 1039.92 1659C1038.4 1667.62 1033.03 1678.2 1035.43 1687C1037.57 1694.83 1047.57 1701.26 1052.91 1707C1062.01 1716.78 1069.32 1727.72 1074.57 1740C1076.74 1745.07 1081.44 1755.11 1078.55 1760.64C1076.23 1765.07 1065.93 1759.8 1063 1758.29C1053.06 1753.2 1042.98 1749.91 1032 1747.8C1028.27 1747.09 1022.64 1745.86 1019.43 1748.6C1016.26 1751.31 1015.83 1757.19 1014.87 1761C1012.58 1770.14 1009.66 1779.07 1006.67 1788C1005.09 1792.71 1003.42 1799.51 997.985 1801.16C991.027 1803.28 985.429 1793.97 982.782 1789C976.349 1776.93 973.293 1765.39 971.08 1752C970.331 1747.46 970.881 1738.89 966.581 1736.03C962.122 1733.06 953.46 1736.13 949 1737.81C934.681 1743.21 922.162 1751.06 907 1754C903.559 1733.59 924.234 1711.11 939 1699.9C944.232 1695.93 954.539 1692.72 957.682 1686.9C962.655 1677.68 957.687 1661.63 956.08 1652C949.482 1612.46 934.407 1582.37 900 1561M592 1499C585.782 1506.64 579.447 1513.75 574.003 1522C571.419 1525.92 569.009 1531.36 563.996 1532.53C557.685 1534 549.445 1531.32 543 1531.04C528.39 1530.4 514.491 1530.17 500 1533C493.491 1534.27 482.244 1534.5 479.605 1542C477.473 1548.07 485.585 1550.79 490 1551.56C500.011 1553.31 510.133 1554.89 520 1557.38C523.919 1558.36 529.065 1559.61 530.442 1564.02C532.005 1569.03 527.13 1573.92 524.13 1577.17C518.684 1583.07 513.11 1591.23 510.785 1599C509.953 1601.78 508.062 1607.81 510.042 1610.39C512.791 1613.97 521.911 1610.12 525 1608.63C538.926 1601.9 555.193 1595.23 571 1595.13C581.495 1595.07 588.022 1609.88 591.688 1618C593.455 1621.92 594.665 1628.84 600.015 1629.22C608.146 1629.8 611.143 1616.83 612.856 1611C616.186 1599.66 613.198 1582.92 619.738 1573.04C628.378 1559.99 647.89 1557.05 657 1544M1087 1499C1067.03 1516.91 1034.67 1516.32 1014 1533M249 1652L246 1655"/>
</svg>`;
    const axolotlStamp = parseSvg(axolotl_centerline);


    global.StampLib = {
        getAtd: getAtd,
        writeAllAt: writeAllAt,
        undoLastWriteAll: undoLastWriteAll,
        setPenColorHex: setPenColorHex,
        setHighlighter: setHighlighter,
        getWriteAllDimensions: getWriteAllDimensions,
        getWriteStampDimensions: getWriteStampDimensions,
        drawAxolotl: drawAxolotl,
        writeStampAt: writeStampAt,
        stamps: {
            "axolotl": axolotlStamp,
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
