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
                for (let lines of stroke.lines) {
                    for (let line of lines) {
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
                for (let lines of stroke.lines) {
                    for (let line of lines) {
                        line.translate(-dimensions.min.x, -(baselineheight - lineheight));
                    }
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
        constructor(strokes, width, height, svg, xmlstring) {
            super();
            this.strokes = strokes;
            this.width = width;
            this.height = height;
            this.svg = svg;
            this.xmlstring = xmlstring;
        }

        toString() {
            return this.xmlstring;
        }

        getDimensions(scale) {
            return {
                min: {
                    x: 0,
                    y: 0,
                },
                max: {
                    x: this.width * scale,
                    y: this.height * scale,
                }
            };
        }
    }

    class Stroke {
        constructor(lines, strokeColor, fillColor) {
            // An array of arrays
            // 2 separate circles treated as one object would be an array with 2 entries: one array for each circle.
            // Inner arrays contain Line objects, e.g. Bezier
            this.lines = lines;
            this.strokeColor = strokeColor;
            this.fillColor = fillColor;
            if (!this.doFill() && !this.doStroke()) {
                this.fillColor = "#000000";
            }
            if (this.lines.length > 0 && !Array.isArray(this.lines[0])) {
                this.lines = [this.lines];
            }
        }
        doFill() {
            return (this.fillColor || "none") != "none";
        }
        doStroke() {
            return (this.strokeColor || "none") != "none";
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
        // TODO maybe do recursive subdivision into smaller curves until we can just use straight lines from start to control to end
        // https://www.clear.rice.edu/comp360/lectures/old/BezSubd.pdf
        getPoints(scale) {
            // TODO this is just straight line length from start to end, which could be way too many points
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
                this.start.x < this.end.x ? 0.01 : this.start.x > this.end.x ? -0.01 : 0,
                this.start.y < this.end.y ? 0.01 : this.start.y > this.end.y ? -0.01 : 0,
            ];
            return [
                [this.start.x*scale, this.start.y*scale],
                [this.start.x*scale + mms[0], this.start.y*scale + mms[1]],
                [this.start.x*scale + mms[0] * 2, this.start.y*scale + mms[1] * 2],
                // [this.start.x*scale + mms[0] * 3, this.start.y*scale + mms[1] * 3],
                [(this.start.x + this.end.x)/2*scale, (this.start.y + this.end.y)/2*scale],
                // [this.end.x*scale - mms[0] * 3, this.end.y*scale - mms[1] * 3],
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

    function unlockPage() {
        let atd = getAtd();
        atd.drawingMode = 1;
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
            rainbowSpeed = options.rainbowSpeed || 1,
            rainbowFill = options.rainbowFill || false;

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
            writeAt(stamp, pos, scale, atd, pointer, {
                    usePredefinedColor: usePredefinedColor,
                    rainbowSpeed: rainbow && rainbowSpeed,
                    rainbowFill: rainbowFill,
                }
            );
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
                writeAt(letter, current_pos, scale * 100 / letter.lineheight, atd, pointer, {});
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

    function setPenSettings(settings) {
        let atd = getAtd();
        selectPen();
        if (settings.color) {
            _setPenColorHex(atd, settings.color);
        }
        if (settings.width) {
            atd.pen.w = settings.width;
        }
        if (settings.alpha) {
            atd.pen.col.A = settings.alpha;
        }
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

    function clearPage() {
        let atd = getAtd();
        atd.clearInk();
        atd.penUpFunc(atd);
    }

    function makeHD(target) {
        // console.log("MAKE HD");
        // console.log(target);
        document.querySelectorAll(".worksheet-container:has(.worksheet-container)").forEach(container => {
            container.style.height = "1270px";
            container.style.width = "768px";
        });

        target.querySelectorAll("stroke .stroke").forEach(stroke => {
            let atd = InkTool.InkCanvasLib.List[stroke.id];
            target.querySelectorAll(`canvas#inktool_${stroke.id}_back, #inktool_${stroke.id}_draw`).forEach(canvas => {
                canvas.setAttribute("width", "768");
                canvas.setAttribute("height", "1270");
            });
            atd.drawingContext.setZoomRatio(1);
            atd.drawingContext.setCanvasSize(768,1270);

            atd.srect.height=1270;
            atd.srect.width=768;

            atd.rect.height=1270;
            atd.rect.width=768;

            atd.redrawCurrentLayerByInk();
        });

        document.querySelectorAll(".worksheet-container:has(.worksheet-container)").forEach(container => {
            container.style.height = null;
            container.style.width = null;
        });
    }

    function makeSD(target) {
        target.querySelectorAll("stroke .stroke").forEach(stroke => {
            let atd = InkTool.InkCanvasLib.List[stroke.id];
            target.querySelectorAll(`canvas#inktool_${stroke.id}_back, #inktool_${stroke.id}_draw`).forEach(canvas => {
                canvas.setAttribute("width", "370");
                canvas.setAttribute("height", "612");
            });
            atd.drawingContext.setZoomRatio(612/1270);
            atd.drawingContext.setCanvasSize(370,612);

            atd.srect.height=612;
            atd.srect.width=370;

            atd.rect.height=612;
            atd.rect.width=370;

            atd.redrawCurrentLayerByInk();
        });
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

    function _incrementRainbow(col, speed, rainbowInfo) {
        let rainbowIncreasing = rainbowInfo.rainbowIncreasing;
        let rainbowIndex = rainbowInfo.rainbowIndex;
        let rainbowmin = rainbowInfo.rainbowmin;
        let rainbowmax = rainbowInfo.rainbowmax;
        let c = col[_rainbowColors[rainbowIndex]];
        let new_c = c + speed * (rainbowIncreasing ? 1: -1);
        if (new_c > rainbowmax) {
            col[_rainbowColors[rainbowIndex]] = rainbowmax;
            rainbowIncreasing = !rainbowIncreasing;
            rainbowIndex = (rainbowIndex + 2) % 3;
            speed = new_c - rainbowmax;
        } else if (new_c < rainbowmin) {
            col[_rainbowColors[rainbowIndex]] = rainbowmin;
            rainbowIncreasing = !rainbowIncreasing;
            rainbowIndex = (rainbowIndex + 2) % 3;
            speed = rainbowmin - new_c;
        }
        col[_rainbowColors[rainbowIndex]] = (col[_rainbowColors[rainbowIndex]] + 256 + speed * (rainbowIncreasing ? 1 : -1)) % 256;
        rainbowInfo.rainbowIncreasing = rainbowIncreasing;
        rainbowInfo.rainbowIndex = rainbowIndex;
    }

    function getRainbowStart(atd) {
        let col = atd.pen.col;
        let rainbowmax = Math.max(col.R, col.G, col.B);
        let rainbowmin = Math.min(col.R, col.G, col.B);
        if (rainbowmax == rainbowmin) {
            // writeAt(letter, pos, scale, atd, pointer, false);
            return null;
        }
        let indexed = Array.from([col.R, col.G, col.B].entries());
        let maxs = indexed.filter(c => c[1]==rainbowmax).map(c => c[0]);
        let mins = indexed.filter(c => c[1]==rainbowmin).map(c => c[0]);
        let rainbowInfo = {
            rainbowmax: rainbowmax,
            rainbowmin: rainbowmin,
        }
        if (maxs.length == 2) {
            return {
                ...rainbowInfo,
                rainbowIncreasing: false,
                /* 0, 1 = 0
                 * 1, 2 = 1
                 * 0, 2 = 2
                 */
                rainbowIndex: maxs[1] == maxs[0] + 1 ? maxs[0] : maxs[1],
            };
        } else if (mins.length == 2) {
            return {
                ...rainbowInfo,
                rainbowIncreasing: true,
                /* 0, 1 = 0
                 * 1, 2 = 1
                 * 0, 2 = 2
                 */
                rainbowIndex: mins[1] == mins[0] + 1 ? mins[0] : mins[1],
            };
        } else if ((mins[0] + 2) % 3 == maxs[0]){
            /*
             * 100, 255, 0 = decreasing 0
             * 0, 100, 255 = decreasing 1
             * 255, 0, 100 = decreasing 2
             */
            return {
                ...rainbowInfo,
                rainbowIncreasing: false,
                rainbowIndex: 3 - mins[0] - maxs[0],
            };
        } else if ((mins[0] + 1) % 3 == maxs[0]){
            /*
             * 100, 0, 255 = increasing 0
             * 255, 100, 0 = increasing 1
             * 0, 255, 100 = increasing 2
             */
            return {
                ...rainbowInfo,
                rainbowIncreasing: true,
                rainbowIndex: 3 - mins[0] - maxs[0],
            };
        }
    }

    function getStrokeFillLines(pointsLists, strokeWidth) {
        strokeWidth /= 2;
        let minX = null, minY = null, maxX = null, maxY = null;
        for (let pointsList of pointsLists) {
            for (let point of pointsList) {
                if (minX == null) {
                    minX = maxX = point[0];
                    minY = maxY = point[1];
                } else {
                    minX = Math.min(minX, point[0]);
                    minY = Math.min(minY, point[1]);
                    maxX = Math.max(maxX, point[0]);
                    maxY = Math.max(maxY, point[1]);
                }
            }
        }
        // scanline fill algorithm
        // http://alienryderflex.com/polygon_fill/
        let fillLines = [];
        for (let y = minY + strokeWidth; y < maxY; y += strokeWidth) {
            // x coordinates of scanline intersection
            let intersections = [];
            for (let pointsList of pointsLists) {
                let j = pointsList.length - 1;
                for (let i = 0; i < pointsList.length; i++ ) {
                    if (pointsList[i][1] < y && pointsList[j][1] >= y
                    || pointsList[j][1] < y && pointsList[i][1] >= y) {
                        intersections.push(pointsList[i][0] + (y - pointsList[i][1])*(pointsList[j][0] - pointsList[i][0])/(pointsList[j][1] - pointsList[i][1]));
                    }
                    j = i;
                }
            }
            intersections.sort((a, b) => a - b);
            // console.log(intersections);
            for (let i = 0; i < intersections.length; i += 2) {
                // TODO probably don't need any of these conditions
                if (intersections[i] >= maxX) break;
                if (intersections[i+1] <= minX) continue;
                if (intersections[i] < minX) intersections[i] = minX;
                if (intersections[i+1] > maxX) intersections[i+1] = maxX;
                fillLines.push(new Linear({x:intersections[i] + 0*strokeWidth, y:y}, {x:intersections[i+1] - 0*strokeWidth, y:y}));
            }
        }
        // console.log(fillLines);
        return fillLines;
    }

    function writeAt(letter, pos, scale, atd, pointer, options) {
        let usePredefinedColor = options.usePredefinedColor || false,
            rainbowSpeed = options.rainbowSpeed || 0,
            rainbowFill = options.rainbowFill || false;
        if (rainbowSpeed > 0) {
            var rainbowInfo = getRainbowStart(atd);
            if (rainbowInfo == null) {
                rainbowSpeed = 0;
            }
        }
        let prev_r = atd.pen.col.R;
        let prev_g = atd.pen.col.G;
        let prev_b = atd.pen.col.B;
        let changedColor = false;

        for (let stroke of letter.strokes) {
            let lastPoint = null;
            // console.log(`stroke: ${stroke}`);
            // console.log(`typeof stroke: ${typeof stroke}`);
            // console.log(`stroke.lines: ${stroke.lines}`);

            let allStrokePoints = [];
            if (stroke.doFill()) {
                for (let lines of stroke.lines) {
                    let strokePoints = [];
                    for (let line of lines) {
                        let points = line.getPoints(scale);
                        strokePoints = strokePoints.concat(points);
                    }
                    allStrokePoints.push(strokePoints);
                }
                // atd.pen.w /= 2;
                if (usePredefinedColor) {
                    _setPenColorHex(atd, stroke.fillColor);
                    changedColor = true;
                }
                let prevY = null;
                for (let line of getStrokeFillLines(allStrokePoints, atd.pen.w)) {
                    let points = line.getPoints(1);
                    if (points.length < 3) {
                        continue;
                    }

                    atd.currentStroke = new InkTool.InkStroke(atd.pen);
                    atd.drawingContext.context = atd.dcanvas.getContext("2d");

                    if (rainbowSpeed > 0 && rainbowFill && prevY != null && points[0][1] != prevY) {
                        _incrementRainbow(atd.pen.col, rainbowSpeed, rainbowInfo);
                        changedColor = true;
                    }
                    prevY = points[0][1];

                    drawCell(pos, points[0], 0, atd, pointer);

                    for (let i = 1; i < points.length - 1; i++) {
                        drawCell(pos, points[i], 4, atd, pointer);
                    }

                    // finishing point
                    drawCell(pos, points[points.length - 1], 2, atd, pointer);
                    atd.currentLayer.Drawing.is.push(atd.currentStroke);

                    newDrawCounter++;
                }
                // atd.pen.w *= 2;
            }

            if (stroke.doStroke()) {
                if (usePredefinedColor) {
                    let strokeColor = stroke.strokeColor;
                    if ((strokeColor || "none") == "none") {
                        strokeColor = stroke.fillColor;
                    } else {
                        _setPenColorHex(atd, strokeColor);
                        changedColor = true;
                    }
                }

                for (let lines of stroke.lines) {
                    let doneFirst = false;
                    atd.currentStroke = new InkTool.InkStroke(atd.pen);
                    atd.drawingContext.context = atd.dcanvas.getContext("2d");
                    for (let line of lines) {
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
                    drawCell(pos, lastPoint, 2, atd, pointer);
                    // finishing point
                    atd.currentLayer.Drawing.is.push(atd.currentStroke);

                    newDrawCounter++;
                    if (rainbowSpeed > 0) {
                        _incrementRainbow(atd.pen.col, rainbowSpeed, rainbowInfo);
                        changedColor = true;
                    }
                }
            }
        }
        if (changedColor) {
            atd.pen.col.R = prev_r;
            atd.pen.col.G = prev_g;
            atd.pen.col.B = prev_b;
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
        let styleInfo = getStyleInfo(svgElem);
        let strokes = [];
        for (let child of svgElem.children) {
            strokes = strokes.concat(parseChild(child, [], styleInfo));
        }
        return new DrawStamp(strokes, width, height, svgElem, xmlstring);
    }

    function parseChild(element, transform, styleInfo) {
        switch (element.nodeName) {
            case "path":
                return parsePath(element, transform, styleInfo);
            case "g":
                return parseG(element, transform, styleInfo);
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
    function parseG(element, transform, styleInfo) {
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
        styleInfo = Object.assign({}, styleInfo, getStyleInfo(element));
        let strokes = [];
        for (let child of element.children) {
            strokes = strokes.concat(parseChild(child, allTransforms, styleInfo));
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

    function getStyleInfo(element) {
        let style = element.getAttribute("style") || "";
        let styleInfo = {};
        for (let key of ["stroke", "fill"]) {
            let value = element.getAttribute(key) || null;
            if (value !== null) {
                styleInfo[key] = value;
            }
        }
        for (let match of style.matchAll(/[^;]*;?/g)) {
            try {
                let [key, val] = match[0].split(":");
                styleInfo[key] = val.split(";")[0];
            }
            catch {
                console.log(`unexpected style match ${match}. Style: ${style}`);
            }
        }
        return styleInfo;
    }

    function parsePath(element, transformations, styleInfo) {
        let pathstring = element.getAttribute("d") || "";
        let x = 0, y = 0;
        let mx = 0, my = 0;
        let lines = [];
        let makeLinear = (x2, y2) => {
            return new Linear({x:x, y:y}, {x:x2, y:y2});
        }
        // make new styleInfo object with element's style overriding the passed in values
        styleInfo = Object.assign({}, styleInfo, getStyleInfo(element));
        let currentStroke = new Stroke([], styleInfo.stroke, styleInfo.fill);
        let isFirstCommand = true;
        for (let match of pathstring.matchAll(pathRegex)) {
            let matchstr = match[0].trim();
            let pathSection = parameterizePathSection(matchstr);
            let cmd = pathSection.shift();
            if (cmd == "M" || cmd == "m") {
                if (lines.length > 0) {
                    currentStroke.lines.push(lines);
                    lines = [];
                }
                // if (currentStroke != null) {
                //     strokes.push(currentStroke);
                //     currentStroke = null;
                // }
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
                do {
                    if (cmd == "L") {
                        let [x2, y2] = shift2Translated(pathSection, transformations, false);
                        lines.push(makeLinear(x2, y2));
                        x = x2;
                        y = y2;
                    } else if (cmd == "l") {
                        let [dx, dy] = shift2Translated(pathSection, transformations, true);
                        lines.push(makeLinear(x + dx, y + dy));
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
                        lines.push(makeLinear(x2, y));
                        x = x2;
                    } else if (cmd == "V" || cmd == "v") {
                        let y2 = pathSection.shift();
                        for (let transformation of transformations) {
                            y2 = transformation.transform(0, y2, cmd == "v")[1];
                        }
                        if (cmd == "v") {
                            y2 += y;
                        }
                        lines.push(makeLinear(x, y2));
                        y = y2;
                    } else if (cmd == "Z" || cmd == "z") {
                        lines.push(makeLinear(mx, my));
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
                        lines.push(new Bezier(x,y,cx1,cy1,cx2,cy2,x2,y2));
                        x = x2;
                        y = y2;
                    }
                } while (pathSection.length > 0);
            }
            isFirstCommand = false;
        }
        if (lines != null) {
            currentStroke.lines.push(lines);
        }
        return [currentStroke];
    }

    const HELVETICANT = parseFont(`<?xml version="1.0" encoding="UTF-8" standalone="no"?> <!-- Created with Inkscape (http://www.inkscape.org/) --> <svg version="1.1" id="svg1" width="924" height="173" viewBox="0 0 924 173" sodipodi:docname="font_manual2.svg" inkscape:version="1.4 (e7c3feb100, 2024-10-09)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"> <defs id="defs1" /> <sodipodi:namedview id="namedview1" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" inkscape:zoom="2.8284271" inkscape:cx="398.80823" inkscape:cy="104.29825" inkscape:window-width="2560" inkscape:window-height="1371" inkscape:window-x="0" inkscape:window-y="0" inkscape:window-maximized="1" inkscape:current-layer="layer3" showgrid="false" /> <g inkscape:groupmode="layer" id="layer2" inkscape:label="line3" style="display:inline"> <path id="path74" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 25.234701,141.36076 10.208681,8.76081 M 21.901666,117.59241 c -3.2128,0.037 -13.1820846,1.98575 -12.9650647,15.06503 0.1707166,10.28869 7.1197147,15.41945 12.4070317,15.52262 6.018962,0.11744 14.20393,-3.91004 14.284642,-15.58884 0.08304,-12.01605 -8.358762,-14.93809 -13.726609,-14.99881 z" inkscape:label="Q" sodipodi:nodetypes="cccsssc" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 41.815112,117.02237 8.291414,31.87281 9.209824,-31.67687 9.836138,31.71606 7.686506,-32.00332" id="path75" inkscape:label="W" /> <path id="path77" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 103.96411,132.75708 -18.66162,0.0618 m 19.56201,-14.39017 -19.632567,0.20288 -0.113769,28.90479 20.544436,-0.0432" inkscape:label="E" /> <path id="path79" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 128.90857,132.81692 c 0,0 4.02526,1.29095 5.1051,4.17307 1.05188,2.80751 -0.46289,9.27382 1.69278,11.73921 m -21.16934,-0.0449 0.0752,-30.11963 14.99531,-0.0588 c 0,0 5.36851,0.42281 5.32583,6.24405 -0.038,5.18792 -3.30746,8.12207 -5.22665,8.07715 -1.91919,-0.0449 -15.25611,0.0339 -15.25611,0.0339" inkscape:label="R" sodipodi:nodetypes="csccccssc" /> <path id="path81" style="display:inline;fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 152.38574,118.75366 -0.0901,30.44141 m -12.22484,-30.49292 24.65942,0.0947" inkscape:label="T" /> <path id="path83" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 192.73047,116.97119 -11.58643,18.56885 m -11.31811,-18.28027 11.33764,18.14257 0.15162,13.75806" inkscape:label="Y" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 200.83904,117.16842 0.22113,24.84766 c 0.023,2.58351 3.73672,6.24519 9.59566,6.29197 5.92308,0.0473 10.34748,-3.25846 10.46833,-6.33185 0.0896,-2.27975 0.22097,-24.91654 0.22097,-24.91654" id="path84" inkscape:label="U" sodipodi:nodetypes="csssc" /> <path id="path86-5" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 227.43104,148.56234 11.33411,-0.02 m -11.30949,-31.14289 11.30371,0.0219 m -5.62878,-0.0238 0.0669,31.12718" inkscape:label="I" sodipodi:nodetypes="cccccc" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 255.74951,117.97412 c -2.43039,0.17763 -12.38799,1.81019 -12.56751,13.79761 0.12479,11.52392 5.62464,16.22814 12.24573,16.31043 6.59875,0.082 13.84319,-4.56906 14.14258,-14.17908 0.30627,-9.83105 -5.07226,-16.1272 -13.8208,-15.92896 z" id="path86" inkscape:label="O" sodipodi:nodetypes="ccssc" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 278.66636,148.84822 0.13259,-30.38833 c 0,0 12.06827,-0.0315 12.88743,0.14778 1.21069,0.26505 5.59133,1.65727 5.70225,6.16724 0.12328,5.01278 -1.93979,8.08287 -4.46637,8.52758 -2.29307,0.40361 -14.19772,0.20043 -14.19772,0.20043" id="path87" sodipodi:nodetypes="ccsssc" inkscape:label="P" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 313.87109,118.89941 c 0,0 -5.1311,-1.17993 -5.05859,3.11329 0.0725,4.29321 -0.0681,11.31518 -0.0681,11.31518 0,0 -0.86645,3.76001 -3.5708,3.90869 -2.70434,0.14868 2.8689,-0.69873 2.96387,2.84204 0.095,3.54077 0.53589,14.53565 0.53589,14.53565 0,0 0.52685,2.31177 5.12793,2.31299" id="path88" inkscape:label="{" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 317.8435,118.81968 c 0,0 5.1311,-1.17993 5.05859,3.11329 -0.0725,4.29321 0.0681,11.31518 0.0681,11.31518 0,0 0.86645,3.76001 3.5708,3.90869 2.70434,0.14868 -2.8689,-0.69873 -2.96387,2.84204 -0.095,3.54077 -0.53589,14.53565 -0.53589,14.53565 0,0 -0.52685,2.31177 -5.12793,2.31299" id="path88-5" inkscape:label="}" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 336.52197,116.86523 0.0137,41.01563" id="path89" inkscape:label="|" /> <path id="path91" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 349.80859,137.24731 14.37124,0.0126 m -18.71377,11.50766 11.5066,-30.39185 11.73046,30.73804" inkscape:label="A" sodipodi:nodetypes="ccccc" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 394.65942,125.78467 c 0,0 -0.57681,-7.86088 -8.71899,-8.27027 -8.74527,-0.43971 -10.37207,5.31446 -10.36963,6.79468 0.002,1.48023 -0.76533,5.75552 9.33813,8.28711 7.39718,1.85348 10.42041,2.97583 10.4668,7.08399 0.0464,4.10815 -3.41479,8.48266 -9.49902,8.50903 -6.08423,0.0264 -11.41382,-2.58496 -11.57593,-8.94141" id="path92" sodipodi:nodetypes="cscsssc" inkscape:label="S" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 405.97656,118.70508 -0.008,28.70617 c 5.09917,-0.20623 6.77879,-0.0128 9.70692,-0.70173 0,0 11.12072,-1.99494 11.10094,-13.70612 -0.0198,-11.71118 -10.57043,-13.84928 -11.59221,-14.0344 -1.74286,-0.31576 -9.3087,-0.27897 -9.2077,-0.26425 z" id="path93" sodipodi:nodetypes="cccsscc" inkscape:label="D" /> <path id="path95" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 436.97241,132.67847 17.04859,-0.0125 m -16.91187,16.41118 0.001,-30.65381 18.77831,0.0109" inkscape:label="F" sodipodi:nodetypes="ccccc" /> <path id="path97" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 485.71219,133.74069 0.42087,14.95511 m -0.97364,-22.8335 c 0,0 -3.00342,-8.20898 -10.76391,-8.17309 -7.7605,0.0359 -13.83624,6.06754 -13.62256,14.2793 0.21274,8.17549 3.54113,15.50424 11.00928,16.3811 8.41979,0.98859 13.89404,-4.7002 13.94433,-14.604 l -10.99707,0.0435" inkscape:label="G" sodipodi:nodetypes="cccssscc" /> <path id="path100" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 495.8999,132.98883 20.42676,-0.0367 m 0.0203,-16.10889 -0.033,32.16626 m -20.52168,-32.07471 0.24804,31.97632" inkscape:label="H" sodipodi:nodetypes="cccccc" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 538.32146,117.11283 -0.13969,25.51394 c -0.0907,1.94857 -1.37728,5.42713 -6.20074,5.43027 -4.82513,0.003 -7.16972,-2.07143 -7.22704,-8.96313" id="path101" sodipodi:nodetypes="ccsc" inkscape:label="J" /> <path id="path104" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 556.42593,129.70891 13.53183,19.43244 m -0.57815,-32.04129 -20.56587,19.99549 m 9e-4,-20.00499 0.0149,31.83586" inkscape:label="K" sodipodi:nodetypes="cccccc" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 577.94741,116.88254 0.11877,30.51297 17.24988,-0.10548" id="path105" inkscape:label="L" /> <path id="path42-3-4-0" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" inkscape:label=":" d="m 603.48187,144.67774 c -2.3612,0.23999 -2.34788,4.27356 0.38185,4.21239 2.4759,-0.0555 2.36201,-4.18582 -0.37324,-4.20786 m -0.0476,-18.39787 c -2.3612,0.23999 -2.34788,4.27356 0.38185,4.21239 2.4759,-0.0555 2.36201,-4.18582 -0.37324,-4.20786" /> <path id="path65-9" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" inkscape:label="&quot;" d="m 620.20351,117.97583 -0.0395,10.58814 m -7.1909,-10.58633 -0.0395,10.58814" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 626.74414,118.94141 20.90234,0.0317 -20.48486,27.86084 20.42847,-0.0261" id="path106" inkscape:label="Z" /> <path id="path108" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 676.2456,116.9646 -21.8081,32.06714 m 0.88598,-31.67359 21.58594,31.82471" inkscape:label="X" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 705.06689,126.42407 c -0.17592,-2.9728 -2.56891,-8.5882 -10.65649,-8.68579 -7.90073,-0.0953 -11.95056,8.05957 -12.02161,14.11243 -0.0742,6.32248 2.5365,16.48865 11.22632,16.39953 9.19598,-0.0943 11.73767,-8.25488 11.7113,-11.06347" id="path109" sodipodi:nodetypes="csssc" inkscape:label="C" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 711.2562,117.79646 11.35686,31.30329 10.91907,-32.03629" id="path110" inkscape:label="V" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 741.95436,147.7231 0.18067,-29.22928 c 0,0 12.06827,-0.0315 12.88743,0.14778 1.21069,0.26505 5.59133,1.65727 5.70225,6.16725 0.12328,5.01278 -3.35418,6.95333 -5.88076,7.39804 -2.29307,0.40361 -12.86326,0.27242 -12.86326,0.27242 l 12.9069,-0.0365 c 0,0 6.92442,2.33168 6.77612,7.4746 -0.14829,5.14293 -2.71483,7.64844 -6.82222,7.71749 -4.09148,0.0688 -12.86309,0.0981 -12.86309,0.0981" id="path87-9" sodipodi:nodetypes="ccsssccssc" inkscape:label="B" inkscape:transform-center-x="0.096000086" inkscape:transform-center-y="1.4868643" /> <path style="display:inline;fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 771.19109,148.90916 0.32007,-31.05504 20.44153,31.34437 0.26309,-31.83914" id="path111" inkscape:label="N" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 802.51233,148.68439 0.34769,-31.26358 12.73396,31.49198 12.27217,-31.5745 1.07326,31.67203" id="path112" inkscape:label="M" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 856.32861,131.02686 -18.99927,8.4143 18.92505,8.75488" id="path113" inkscape:label="&lt;" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 861.69067,130.71191 19.47705,8.65015 -19.26562,8.79004" id="path114" inkscape:label="&gt;" /> <path id="path115" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 890.00439,125.77563 c 0,0 -0.7124,-8.02148 6.72119,-8.16894 7.4336,-0.14746 8.22779,5.05029 8.23121,6.35376 0.003,1.30347 -0.37006,3.64624 -1.7605,5.39014 -1.47727,1.8528 -5.83573,5.49449 -5.88623,6.30249 -0.051,0.81515 0.0259,4.21997 0.0259,4.21997 m -0.0309,4.55985 c -2.3612,0.23999 -2.34788,4.27356 0.38185,4.21239 2.4759,-0.0555 2.37672,-4.18551 -0.35853,-4.20755" inkscape:label="?" sodipodi:nodetypes="cscssccsc" /> <path style="fill:none;stroke:#bd0000;stroke-width:1.04172" d="m 6.4159012,149.32369 903.1843688,0.0323" id="path14-8" sodipodi:nodetypes="cc" inkscape:label="baseline" /> </g> <g inkscape:groupmode="layer" id="layer3" inkscape:label="line1" style="display:inline"> <path style="fill:none;stroke:#be0000;stroke-opacity:1" d="m 11.967395,23.007784 c 2.61359,-2.874923 3.887512,-4.245289 6.912684,-8.118672 l -0.450732,30.062492" id="path1" sodipodi:nodetypes="ccc" inkscape:label="1" /> <path style="fill:none;stroke:#be0000;stroke-opacity:1" d="m 33.346864,23.668578 c 0,0 -0.227017,-5.056692 2.308045,-6.809194 2.535062,-1.752503 4.036106,-1.999117 5.691944,-2.08323 1.655838,-0.08411 4.926118,0.452053 6.180988,2.079486 1.25487,1.627434 1.845047,4.003162 1.905315,5.241873 0.136518,2.805897 -1.28132,4.919132 -2.50974,6.213357 -1.360561,1.433445 -6.59781,4.257178 -7.588891,4.779031 -0.471083,0.248048 -2.467467,1.797839 -3.260592,2.667837 -1.953757,2.143121 -5.029279,7.443134 -2.980068,7.445327 3.909497,0.0042 17.658678,-0.05791 17.658678,-0.05791" id="path2" sodipodi:nodetypes="cssssssssc" inkscape:label="2" /> <path style="fill:none;stroke:#be0000;stroke-opacity:1" d="m 57.489073,22.727701 c 0,0 -0.260926,-7.441804 7.109536,-8.114488 7.370461,-0.672685 8.11735,5.805562 8.112946,6.868866 -0.0044,1.063303 -0.266211,4.330281 -2.577999,5.693925 -2.311788,1.363645 -6.78167,1.365626 -6.78167,1.365626 0,0 4.629521,-0.920399 6.718916,1.147417 2.089394,2.067816 3.385,3.332375 3.369807,6.980944 -0.01519,3.648569 -2.119341,5.072986 -3.436966,6.120656 -1.317624,1.04767 -5.475496,2.096 -8.334679,1.2901 -2.859183,-0.8059 -5.180219,-5.276883 -4.991075,-7.64482" id="path3" inkscape:label="3" /> <path style="fill:none;stroke:#be0000;stroke-opacity:1" d="M 99.943268,35.57542 79.804796,35.393322 94.179542,14.248796 94.020344,45.309855" id="path4" inkscape:label="4" /> <path style="fill:none;stroke:#be0000;stroke-opacity:1" d="m 122.22112,15.825806 -13.89033,-0.01057 -1.49972,14.341496 c 0,0 1.86282,-4.175707 6.88648,-3.901128 5.02367,0.274578 6.77459,2.448804 7.74171,4.277215 1.40054,2.64784 1.95192,7.122319 0.0834,9.749848 -1.87808,2.64104 -5.49862,3.891 -7.73268,3.943626 -2.23406,0.05262 -8.10304,-1.817899 -8.34106,-6.611683" id="path5" sodipodi:nodetypes="cccssssc" inkscape:label="5" /> <path style="fill:none;stroke:#be0000;stroke-opacity:1" d="m 146.30013,20.761833 c 0,0 0.27832,-3.901128 -5.22051,-5.874262 -5.49884,-1.973134 -9.11768,3.63866 -9.32422,4.378283 -0.20654,0.739622 -2.08829,5.359014 -1.75977,11.546829 0.32853,6.187815 0.73082,9.082229 2.40867,11.127805 1.67786,2.045577 4.10107,2.730367 5.67763,2.720904 2.11744,-0.01271 4.72446,-0.708427 6.62028,-3.209508 1.88452,-2.486179 2.58145,-6.227776 1.56688,-9.503234 -1.14053,-3.682121 -3.1502,-4.705471 -6.73808,-5.20334 -4.98733,-0.692061 -8.08652,3.445993 -9.4625,5.354611" id="path6" sodipodi:nodetypes="cssssssssc" inkscape:label="6" /> <path style="fill:none;stroke:#be0000;stroke-opacity:1" d="m 152.67775,15.782648 19.38234,-0.01938 -2.11626,3.82274 c 0,0 -5.40834,7.72497 -6.04051,9.585806 -0.63217,1.860836 -5.93701,13.618609 -5.24055,15.545502" id="path7" inkscape:label="7" /> <path style="fill:none;stroke:#be0000;stroke-opacity:1" d="m 186.41149,14.730354 c 0,0 -3.52753,0.0192 -5.45215,2.552898 -1.37803,1.814132 -1.47215,2.723654 -1.53364,4.706588 -0.0741,2.389606 0.87416,3.611357 1.85203,4.557518 0.97787,0.946162 3.20048,1.972474 4.96355,2.034347 1.76308,0.06187 5.00011,0.494109 6.35318,1.929756 1.35308,1.435647 2.35781,2.953206 2.45778,5.310793 0.1,2.357588 -1.22603,4.981387 -2.20236,5.978633 -0.97632,0.997246 -4.04733,2.481996 -5.83396,2.504235 -1.78663,0.02224 -4.30166,-0.251678 -5.64527,-1.680279 -1.3436,-1.428601 -2.89287,-3.751399 -2.91225,-5.803361 -0.0194,-2.051962 0.52384,-4.072437 1.3784,-5.147851 0.85456,-1.075414 4.28404,-3.241436 6.66827,-3.169653 2.38423,0.07178 5.70186,-1.638884 6.18429,-2.742923 0.48244,-1.104039 1.47176,-3.127376 1.35836,-4.422101 -0.11339,-1.294724 -0.84619,-4.042271 -2.61058,-5.27314 -1.7644,-1.230869 -5.02565,-1.33546 -5.02565,-1.33546 z" id="path8" inkscape:label="8" sodipodi:nodetypes="csssssssssssssssc" /> <path style="fill:none;stroke:#be0000;stroke-opacity:1" d="m 218.67184,26.522348 c 0,0 -3.17648,4.64053 -6.67972,4.671357 -3.50325,0.03083 -4.91678,-0.06175 -6.76308,-1.649103 -1.84631,-1.587359 -2.66828,-3.986123 -2.69757,-5.909273 -0.0293,-1.92315 0.8222,-5.145649 2.28933,-6.45909 1.46714,-1.313441 3.24628,-2.332926 5.58581,-2.297696 2.33954,0.03523 4.40427,0.52912 5.84102,1.994933 1.43674,1.465813 2.41307,3.276225 2.39942,5.838151 -0.0137,2.561925 0.12331,10.030372 0.12331,10.030372 -0.0297,1.403094 -0.50537,4.852017 -1.42904,6.535276 -1.7164,3.127886 -3.83826,4.712785 -6.21424,5.060215 -1.80074,0.263315 -3.91742,-0.04712 -5.36936,-1.49664 -1.45195,-1.449519 -2.3413,-3.622146 -2.3849,-4.795765" id="path9" sodipodi:nodetypes="cssssssccsssc" inkscape:label="9" /> <path style="display:inline;fill:none;stroke:#be0000;stroke-opacity:1" d="m 235.19967,14.398927 c 0,0 -2.85416,-0.157182 -4.96598,2.242424 -2.02556,2.301592 -3.03599,6.153276 -2.9964,9.006807 0.0452,3.257794 0.14966,8.354914 0.3066,9.436492 0.17038,1.774671 0.74503,4.354767 2.10682,6.407292 1.30298,1.96389 2.62558,3.053886 5.10218,3.267952 2.54238,0.219751 4.16168,-1.030889 5.40429,-2.31139 1.31267,-1.352693 3.17929,-4.546846 3.19217,-8.856271 0.0101,-3.384605 0.20854,-9.458336 -0.49632,-11.845247 -0.54897,-1.85902 -1.0696,-3.425905 -2.87371,-5.510969 -1.6484,-1.905108 -4.77965,-1.83709 -4.77965,-1.83709 z" id="path10" sodipodi:nodetypes="csscssssssc" inkscape:label="0" /> <path style="display:inline;fill:none;stroke:#be0000;stroke-opacity:1" d="m 249.34146,32.605978 10.28084,0.0252" id="path11" inkscape:label="-" /> <path id="path13" style="display:inline;fill:none;stroke:#be0000;stroke-opacity:1" d="m 263.9896,38.587064 21.24657,-8.18e-4 m -21.24866,-7.289175 21.23371,0.0012" inkscape:label="=" sodipodi:nodetypes="cccc" /> <path id="path15" style="display:inline;fill:none;stroke:#be0000;stroke-opacity:1" d="m 294.69403,41.599487 c -0.50007,0.0095 -0.97866,0.505346 -0.99422,1.349917 -0.0143,0.777254 0.52729,1.249983 1.04823,1.26373 0.64137,0.01693 1.05254,-0.475175 1.06542,-1.27787 0.0133,-0.825553 -0.52502,-1.304503 -1.11943,-1.335777 z m 0.0635,-28.774292 -0.0745,20.901367" inkscape:label="!" sodipodi:nodetypes="csssccc" /> <path style="fill:none;stroke:#be0000;stroke-opacity:1" d="m 327.91461,30.117005 c -0.0815,-0.369873 -1.46686,-6.022767 -4.91681,-6.339905 -3.44995,-0.317139 -6.07202,1.968261 -7.26831,3.109863 -1.19629,1.141601 -2.1687,3.368896 -2.36328,5.436279 -0.10578,1.123915 0.0196,2.681071 0.4208,4.069087 0.33675,1.165167 0.84955,2.32907 2.18679,3.21863 1.38417,0.920779 3.77032,1.086071 5.12361,0.520877 1.69407,-0.707518 4.83716,-3.546631 5.36084,-4.956543 0.52368,-1.409912 3.34717,-11.900147 3.34717,-11.900147 l -3.81397,14.846924 c 0,0 0.59815,2.493164 2.66675,2.732666 2.06861,0.239502 6.86914,-2.687011 7.46387,-3.706787 0.59473,-1.019775 2.93408,-4.016845 2.93774,-8.283691 0.002,-1.851059 -1.23998,-7.299072 -3.5166,-9.361572 -1.84451,-1.671035 -5.03951,-4.473068 -10.39453,-5.465577 -3.58332,-0.664139 -7.09155,-0.523193 -11.74585,2.09668 -3.22735,1.816652 -7.53784,4.925293 -9.10571,10.220215 -1.15058,3.885666 -2.32706,9.760475 0.13501,13.986816 2.59427,4.453283 7.17554,7.107178 10.84644,8.405518 3.6709,1.29834 14.50707,-0.535889 14.50707,-0.535889" id="path16" sodipodi:nodetypes="csssssssccsssssssssc" inkscape:label="@" /> <path id="path20" style="fill:none;stroke:#be0000;stroke-opacity:1" d="m 344.75342,35.716309 21.29467,-0.183106 m -19.75317,-11.035156 20.8103,-0.05347 m -3.60351,-9.622556 -5.66284,31.031739 m -3.30494,-31.282715 -5.66381,31.270996" inkscape:label="#" /> <path id="path22" style="fill:none;stroke:#be0000;stroke-opacity:1" d="m 380.63772,11.606566 -0.12353,38.949707 m 8.49487,-28.891845 c 0,0 -1.06714,-4.048096 -3.23559,-5.019532 -2.16846,-0.971435 -6.23877,-2.193603 -9.06324,-0.751464 -2.82446,1.442138 -4.22412,3.522461 -4.15991,6.447265 0.0642,2.924805 2.62256,5.620117 4.39307,6.331543 1.7705,0.711426 7.31469,0.915283 9.80981,2.802735 2.49512,1.887451 2.91968,3.905761 2.89527,5.938476 -0.0244,2.032715 -1.38672,4.165039 -2.66431,5.414795 -1.27759,1.249756 -4.74365,2.137207 -6.47437,2.101807 -1.73071,-0.0354 -4.69775,-0.411621 -6.51757,-2.155274 -1.81983,-1.743652 -2.40308,-5.654052 -2.32496,-6.232422" inkscape:label="$" /> <path style="fill:none;stroke:#bd0000" d="m 7.573792,45.509327 405.042048,0.0065" id="path12" inkscape:label="baseline" sodipodi:nodetypes="cc" /> </g> <g inkscape:groupmode="layer" id="layer4" inkscape:label="line2" style="display:inline"> <path id="path24" style="fill:none;stroke:#be0000;stroke-opacity:1" d="M 32.799805,66.117432 15.622314,97.936523 m 13.694814,-8.084319 c -0.286173,8.780678 11.904147,8.656096 11.68042,0.923829 -0.225845,-7.805472 -11.446895,-8.089076 -11.68042,-0.923829 z M 7.8666992,73.92456 C 7.5805258,82.705238 19.770846,82.580656 19.547119,74.848389 19.321274,67.042917 8.1002236,66.759313 7.8666992,73.92456 Z" inkscape:label="%" /> <path style="fill:none;stroke:#be0000;stroke-opacity:1" d="M 47.163086,82.683838 53.901123,66.541504 60.72168,83.028808" id="path25" inkscape:label="^" /> <path style="fill:none;stroke:#be0000;stroke-opacity:1" d="m 89.716064,97.023193 c -5.9882,-7.491781 -17.619206,-20.841191 -17.964599,-22.475342 0,0 -0.91455,-2.955968 1.595947,-5.284912 1.377844,-1.278202 2.294498,-1.51781 3.89917,-1.506347 2.899311,0.02071 4.778808,1.511568 5.299072,3.164795 0.544494,1.730224 0.894069,5.16746 -2.739258,7.264648 -3.605294,2.081007 -7.828758,4.728183 -9.37048,6.181068 0,0 -2.090213,1.654625 -1.909061,4.76278 0.181153,3.108154 1.972289,6.545415 5.485048,7.04321 2.6247,0.371948 6.704507,-1.250279 8.133849,-2.476804 1.560547,-1.339112 5.529053,-4.581299 5.279053,-10.836914" id="path26" sodipodi:nodetypes="ccsssscsssc" inkscape:label="&amp;" /> <path id="path30" style="display:inline;fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 101.4165,71.350302 3.20575,5.136428 m -3.18996,-11.281398 0.0143,6.159704 -2.983228,5.011586 m -2.713472,-6.335502 5.62483,1.319179 5.8906,-1.271585" sodipodi:nodetypes="cccccccc" inkscape:label="*" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 121.56299,64.957031 c 0,0 -4.51014,9.079181 -5.52246,12.836914 -0.57564,2.136763 -0.75749,4.0441 -0.77124,6.836426 0.0361,2.665527 -0.009,5.906235 0.69311,8.85376 0.67041,2.814178 3.69605,10.432619 5.40113,12.570559" id="path27" sodipodi:nodetypes="cscsc" inkscape:label="(" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 127.64116,64.791047 c 0,0 4.51014,9.079181 5.52246,12.836914 0.57564,2.136763 0.75749,4.0441 0.77124,6.836426 -0.0361,2.665527 0.009,5.906235 -0.69311,8.85376 -0.67041,2.814178 -3.69605,10.432623 -5.40113,12.570563" id="path27-0" sodipodi:nodetypes="cscsc" inkscape:label=")" /> <path style="display:inline;fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 138.04199,104.08618 25.73511,-0.0784" id="path28" inkscape:label="_" /> <path id="path29" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 176.04077,97.909668 0.14209,-20.865479 m -10.4126,10.408203 20.52808,-0.06518" inkscape:label="+" /> <path style="display:inline;fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 208.7868,78.678576 c -0.91712,-1.232036 -4.61253,-4.014824 -7.84173,-4.165881 -3.44194,-0.161008 -5.22522,0.937629 -7.09786,3.831374 -1.18079,1.824647 -1.41948,4.331956 -1.50322,6.912278 -0.0837,2.580323 0.57194,5.821403 1.80321,7.682418 1.49933,2.266161 2.64013,3.00433 5.20019,3.375488 2.44983,0.355175 5.65581,-1.24427 7.57033,-3.404341 1.05524,-1.190579 1.72559,-2.866699 1.72681,-3.966065 0.001,-1.099365 0.13355,-14.554687 0.13355,-14.554687 l 0.0288,32.42969" id="path31" sodipodi:nodetypes="cssssssccc" inkscape:label="q" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 215.32056,74.176269 6.72802,22.8396 6.57447,-23.09082 6.78564,23.341552 6.51221,-23.172119" id="path32" inkscape:label="w" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 248.20215,85.351074 16.46704,-0.08716 c 0,0 0.2478,-5.550781 -1.34546,-7.717041 -1.59326,-2.16626 -3.50171,-2.911621 -6.23853,-2.947754 -2.73681,-0.03613 -4.7096,0.391911 -6.81201,3.120117 -1.22751,1.592887 -2.57397,5.343262 -2.54394,7.670166 0.03,2.326904 0.72048,4.761811 1.47339,6.481933 0.54364,1.242037 1.30414,2.102111 2.17026,2.845608 1.37751,1.182495 2.97677,1.857933 4.45632,1.899388 2.42237,0.06787 4.54285,-0.572379 5.73816,-1.868531 1.19531,-1.296142 2.45313,-3.29663 2.46533,-4.130371" id="path33" sodipodi:nodetypes="ccssssssssc" inkscape:label="e" /> <path id="path35" style="display:inline;fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 273.07901,79.988159 c 0,0 1.04499,-2.835709 2.61288,-4.170776 2.0387,-1.735962 3.73047,-1.169678 6.021,-1.194336 m -8.59814,-0.70752 -0.0462,23.029053" inkscape:label="r" sodipodi:nodetypes="csccc" /> <path id="path37" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 284.76807,75.761963 10.04711,-0.110596 m -5.2583,-7.641602 0.20093,26.3667 c 0,0 -0.47851,2.3125 4.89258,2.196533" inkscape:label="t" /> <path id="path39" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 315.25415,74.343505 c -2.82705,10.228658 -7.08053,27.176805 -11.11499,29.526365 0,0 -1.11914,0.96167 -5.21411,0.83277 m 0.18042,-30.423588 9.44946,22.024902" inkscape:label="y" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 323.58552,74.510015 c 0.0942,1.179861 -0.41725,17.606635 0.59714,18.838489 1.45509,2.575717 2.41057,3.368392 4.82808,3.439338 6.05991,0.17784 9.13221,-5.950928 9.13221,-5.950928 l -0.214,-16.796631 0.3003,22.844971" id="path40" inkscape:label="u" sodipodi:nodetypes="ccsccc" /> <path id="path42" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 347.82918,65.282611 c -2.3612,0.239993 -2.34788,4.273557 0.38185,4.212392 2.4759,-0.05548 2.36201,-4.185821 -0.37324,-4.207862 m -0.0296,8.659552 0.14812,23.166033" inkscape:label="i" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 364.14773,74.756516 c -5.91057,-0.01187 -7.53459,4.850415 -7.68343,11.014782 -0.1177,4.87503 2.55805,10.502631 7.52583,10.70044 2.90176,0.115544 8.9488,-1.25483 9.02768,-9.847631 0.0965,-10.503583 -4.49933,-11.973841 -8.87007,-11.867591 z" id="path43" inkscape:label="o" sodipodi:nodetypes="cssscc" /> <path id="path45" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 380.75809,81.270639 c 2.17334,-5.015784 5.64092,-6.477134 8.94943,-6.295602 4.22125,0.231612 7.82609,3.480303 8.01311,8.734252 0.18749,5.267343 -1.38124,12.403889 -7.27719,12.550973 -5.89595,0.147084 -9.56156,-4.474833 -9.55828,-7.35246 m -0.11023,-14.775356 0.25619,32.192864" sodipodi:nodetypes="csssccc" inkscape:label="p" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 411.80225,66.396484 -6.29712,0.01416 0.0864,37.842046 6.31104,0.0933" id="path46" inkscape:label="[" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 414.39409,66.493162 6.29712,0.01416 -0.0864,37.842038 -6.31104,0.0933" id="path46-9" inkscape:label="]" /> <path style="display:inline;fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 426.27295,65.082519 10.22583,32.802246" id="path47" inkscape:label="\\" /> <path id="path49" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 456.42913,90.696045 c 0,0 -1.00896,6.4104 4.07026,6.066772 M 442.6499,79.693115 c 0,0 0.0328,-5.123535 6.33899,-5.078735 6.30615,0.0448 7.49207,2.588501 7.51782,6.022949 0.0258,3.434448 -0.0797,10.060669 -0.0797,10.060669 0,0 -2.31897,5.10437 -7.43237,5.523682 -5.11341,0.419311 -6.1991,-1.421509 -6.58911,-1.977662 -0.39002,-0.556152 -1.18836,-3.570068 -0.36084,-5.67395 0.82751,-2.103882 4.23852,-3.241699 6.42675,-3.323974 2.18824,-0.08228 7.07203,-0.291504 7.948,-2.354615" sodipodi:nodetypes="cccsscssssc" inkscape:label="a" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 479.2865,79.865777 c 0,0 -0.72609,-5.456772 -6.21774,-5.433811 -5.49164,0.02296 -6.98924,3.672259 -7.01185,5.035546 -0.0226,1.363287 0.43383,5.623881 6.83732,5.910107 6.4035,0.286227 7.12815,2.773757 7.17361,4.837881 0.0542,2.462037 -1.36691,6.173029 -6.45424,6.317696 -5.42897,0.154382 -8.12086,-2.933561 -8.19388,-6.202894" id="path50" inkscape:label="s" sodipodi:nodetypes="csssssc" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 503.32422,80.675293 c 0,0 -3.22502,-6.242926 -8.39624,-6.20459 -4.82966,0.0358 -8.19392,4.988522 -8.12036,9.812012 0.0895,5.8692 2.40954,11.864077 7.54639,12.23291 6.03921,0.433623 9.13329,-7.362549 9.16674,-8.206543 0.0334,-0.843994 -0.11816,-23.436524 -0.11816,-23.436524 l 0.36914,32.189209" id="path51" inkscape:label="d" sodipodi:nodetypes="csssscc" /> <path id="path53" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 509.18628,75.643066 9.66064,-0.04712 m 0.0532,-8.934081 c 0,0 -5.2898,-1.034912 -5.31031,2.885742 -0.0205,3.920655 0.19654,27.60083 0.19654,27.60083" inkscape:label="f" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 539.16211,81.009277 c 0,0 -3.12826,-5.82215 -7.49813,-5.791388 -4.36987,0.03076 -7.87297,4.455633 -7.82817,10.456978 0.0316,4.235355 2.40909,9.921928 7.49031,9.527539 5.81555,-0.451385 7.35819,-6.591903 7.54569,-7.704452 0.1875,-1.112549 0.33595,-12.164475 0.33595,-12.164475 -0.20459,8.680583 0.10865,18.211171 -0.74091,24.54726 -0.81269,2.860731 -2.44723,5.284331 -6.87899,5.133871 -4.43231,-0.15048 -6.61643,-1.74972 -7.25266,-4.90499" id="path54" sodipodi:nodetypes="cssssccsc" inkscape:label="g" /> <path id="path56" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 548.54468,80.712646 c 0.13858,0.05306 3.64656,-6.327608 8.20581,-6.089599 3.91131,0.204183 6.03223,2.763672 6.19214,4.430664 0.17962,1.872472 0.23097,18.107666 0.23097,18.107666 m -14.74294,-32.295166 -0.0808,32.147705" inkscape:label="h" sodipodi:nodetypes="cssccc" /> <path id="path58" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 572.72766,65.110474 c 0,0 -1.39795,0.08228 -1.41724,1.807861 -0.0193,1.725586 0.5044,2.490356 1.3346,2.519653 0.8302,0.0293 1.72766,-0.769653 1.58288,-2.226074 -0.14477,-1.456421 -0.13867,-2.108398 -1.50024,-2.10144 z m -0.01,8.978881 0.023,28.038335 c 0,0 0.39478,2.78173 -5.54565,2.76757" inkscape:label="j" /> <path id="path61" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 587.67336,81.704166 9.73278,15.401828 m -1.8073,-23.031898 -13.38939,12.888946 m -0.19872,-21.764379 0.023,31.890758" inkscape:label="k" sodipodi:nodetypes="cccccc" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 604.58435,64.978027 -0.0194,31.968506" id="path62" inkscape:label="l" sodipodi:nodetypes="cc" /> <path id="path64" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 616.39429,75.287353 c 0,0 -1.09156,0.04834 -1.15772,1.098877 -0.0662,1.050537 0.97095,1.185547 1.29517,1.128662 0.32422,-0.05688 1.38647,-0.364013 1.29419,-1.141113 -0.0923,-0.777099 -1.43164,-1.086426 -1.43164,-1.086426 z m 0.81166,18.954085 c -4.2e-4,-3.08e-4 -0.0403,1.190396 -0.27535,2.71311 -0.32519,2.106713 -1.02392,4.848942 -2.50846,5.951812" inkscape:label=";" sodipodi:nodetypes="csssccsc" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 625.97827,66.056152 -0.0395,10.588135" id="path65" inkscape:label="'" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 632.38501,75.349365 15.75659,0.172363 -16.04468,19.765625 17.53467,-0.06445" id="path66" inkscape:label="z" /> <path id="path68" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 670.42602,74.154785 -15.9038,22.883789 m 0.48754,-22.845215 15.17847,22.775879" inkscape:label="x" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 691.43091,80.671875 c 0,0 -0.51953,-6.237549 -6.66138,-6.261475 -6.14185,-0.02393 -8.86295,7.365235 -8.39091,12.306623 0.383,4.009229 1.30274,8.631787 6.95222,9.008336 6.68592,0.44563 8.20016,-3.207293 8.41379,-6.436541" id="path69" inkscape:label="c" sodipodi:nodetypes="csssc" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 696.80021,73.917863 8.10446,23.304485 8.61026,-23.137376" id="path70" inkscape:label="v" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 720.46236,80.675168 c 0,0 3.22502,-6.242926 8.39624,-6.20459 4.82966,0.0358 8.19392,4.988522 8.12036,9.812012 -0.0895,5.8692 -2.40954,11.864077 -7.54639,12.23291 -6.03921,0.433623 -9.13329,-7.362549 -9.16674,-8.206543 -0.0334,-0.843994 0.11816,-23.436524 0.11816,-23.436524 l -0.36914,32.189209" id="path51-7" inkscape:label="b" sodipodi:nodetypes="csssscc" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 759.87904,96.549237 c -0.0942,-1.179861 0.41725,-17.606635 -0.59714,-18.838489 -1.45509,-2.575717 -2.41057,-3.368392 -4.82808,-3.439338 -6.05991,-0.17784 -9.13221,5.950928 -9.13221,5.950928 l 0.214,16.796631 -0.3003,-22.844971" id="path40-9" inkscape:label="n" sodipodi:nodetypes="ccsccc" /> <path id="path71" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 782.65588,79.120411 c 0,0 2.09851,-4.507008 7.13613,-4.699667 5.03762,-0.192659 6.13436,3.662247 6.12417,4.154598 -0.0102,0.492351 0.18731,18.396861 0.18731,18.396861 m -13.24226,-0.201789 c -0.0942,-1.179861 0.21786,-16.896593 -0.2914,-18.708841 -1.45509,-2.575717 -2.88669,-3.338527 -5.3042,-3.409473 -6.05991,-0.17784 -7.99784,5.769318 -7.99784,5.769318 l 0.214,16.796631 -0.3003,-22.844971" inkscape:label="m" sodipodi:nodetypes="csscccsccc" /> <path id="path64-3" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 808.11567,93.704665 c -4.2e-4,-3.1e-4 -0.0403,1.19039 -0.27535,2.71311 -0.32519,2.10671 -1.02392,4.848935 -2.50846,5.951805" inkscape:label="," sodipodi:nodetypes="csc" /> <path id="path42-3" style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="m 818.76297,92.590252 c -2.3612,0.239993 -2.34788,4.273557 0.38185,4.212392 2.4759,-0.05548 2.36201,-4.185821 -0.37324,-4.207862" inkscape:label="." sodipodi:nodetypes="csc" /> <path style="fill:none;stroke:#bd0000;stroke-width:1;stroke-dasharray:none;stroke-opacity:1" d="M 836.36818,64.951279 826.16761,97.952588" id="path72" inkscape:label="/" /> <path style="fill:none;stroke:#bd0000" d="m 7.02824,97.441137 832.08327,0.03229" id="path14" sodipodi:nodetypes="cc" inkscape:label="baseline" /> </g> </svg>`);

    {% for stamp_name, stamp_contents in stamps.items() %}
    const {{ stamp_name }} = parseSvg(`{{ stamp_contents }}`);
    {% endfor %}

    global.StampLib = {
        getAtd: getAtd,
        writeAllAt: writeAllAt,
        undoLastWriteAll: undoLastWriteAll,
        clearPage: clearPage,
        setPenColorHex: setPenColorHex,
        setHighlighter: setHighlighter,
        setPenSettings: setPenSettings,
        getWriteAllDimensions: getWriteAllDimensions,
        getWriteStampDimensions: getWriteStampDimensions,
        writeStampAt: writeStampAt,
        unlockPage: unlockPage,
        makeHD: makeHD,
        makeSD: makeSD,
        stamps: {
            "All": [
                youCanDoIt,
                excellentWorkStreaked,
                keepGoingYouveGotThis,
                keepGoingYouveGotThisRainbow,
                youGotThisStars,
                greatJobStamp,
                wow,
                rocketKeepUpTheGoodWork,
                keepUpTheGoodWorkFireworks,
                justKeepGoingYouGotThis,
                youAreDoingGreat,
                greatWorkKeepItUp,
                stickGoodJob,
                stickGreatJobClap,
                stickGreatJobStarEyes,
                stickGreatWorkStarEyes,
                stickGoodJobThumb,
                stickGreatWorkStrong,
                stickSoProud,
                congrats,
                newLevel,
                axolotlStamp,
                cuteAxolotl,
                cuteAxolotl2,
                cuteAxolotl2colored,
                christmasAxolotl2,
                cuteAxolotl4,
                cuteAxolotl4noshadow,
                christmasCuteAxolotl4,
                tealessAxolotl,
                christmasTealessAxolotl,
                cuteCat,
                cuteCrab,
                cuteFish,
                cuteHorse,
                cuteTurtle,
                puppy,
                shibaPuppyOutlined,
                christmasShiba,
                poodle,
                halloweenCuteCatFilled,
                christmasCat,
                halloweenCuteCatHat,
                halloweenCuteCatHat3,
                halloweenCuteCatHat2,
                adelineCatGreatJob,
                adelineStar,
                karthikaBootifulWorkGhost,
                karthikaBananamon,
                karthikaEggcellentWork,
                karthikaAmazingHeart,
                faboolousWork,
                bootifulWork,
                zombie,
                zombieChristmas,
                cake,
                cakeSprinkles,
                candle,
                cobwebCornerLeft,
                cobwebCornerLeftSpider,
                cobwebCornerLeftMediumSpider,
                cobwebCornerLeftBigSpider,
                cobwebCornerRight,
                cobwebCornerRightSpider,
                cobwebCornerRightMediumSpider,
                cobwebCornerRightBigSpider,
                happyHalloween1,
                happyHalloween1safe,
                happyHalloween2,
                happyHalloween2safe,
                happyHalloweenHorizontal,
                //"tanjiro": tanjiro,
                //"thinkingFace": thinkingFace,
            ],
            "Motivation": [
                youCanDoIt,
                keepGoingYouveGotThis,
                keepGoingYouveGotThisRainbow,
                youGotThisStars,
                greatWorkKeepItUp,
                rocketKeepUpTheGoodWork,
                keepUpTheGoodWorkFireworks,
                justKeepGoingYouGotThis,
                youAreDoingGreat,
            ],
            "Praise": [
                excellentWorkStreaked,
                greatJobStamp,
                wow,
                rocketKeepUpTheGoodWork,
                keepUpTheGoodWorkFireworks,
                youAreDoingGreat,
                greatWorkKeepItUp,
                stickGoodJob,
                stickGreatJobClap,
                stickGreatJobStarEyes,
                stickGreatWorkStarEyes,
                stickGoodJobThumb,
                stickGreatWorkStrong,
                stickSoProud,
                congrats,
                newLevel,
                faboolousWork,
                bootifulWork,
                adelineCatGreatJob,
                adelineStar,
                karthikaBootifulWorkGhost,
                karthikaBananamon,
                karthikaEggcellentWork,
                karthikaAmazingHeart,
            ],
            "Animals": [
                axolotlStamp,
                cuteAxolotl,
                cuteAxolotl2,
                cuteAxolotl2colored,
                christmasAxolotl2,
                cuteAxolotl4,
                cuteAxolotl4noshadow,
                christmasCuteAxolotl4,
                tealessAxolotl,
                christmasTealessAxolotl,
                cuteCat,
                cuteCrab,
                cuteFish,
                cuteHorse,
                cuteTurtle,
                puppy,
                shibaPuppyOutlined,
                christmasShiba,
                poodle,
                halloweenCuteCatFilled,
                christmasCat,
                halloweenCuteCatHat,
                halloweenCuteCatHat3,
                halloweenCuteCatHat2,
            ],
            "Student-drawn": [
                adelineCatGreatJob,
                adelineStar,
                karthikaBootifulWorkGhost,
                karthikaBananamon,
                karthikaEggcellentWork,
                karthikaAmazingHeart,
            ],
            "Christmas": [
                christmasCat,
                christmasAxolotl2,
                christmasCuteAxolotl4,
                christmasTealessAxolotl,
                christmasShiba,
                zombieChristmas,
            ],
            "Halloween": [
                halloweenCuteCatFilled,
                halloweenCuteCatHat,
                halloweenCuteCatHat3,
                halloweenCuteCatHat2,
                faboolousWork,
                bootifulWork,
                zombie,
                zombieChristmas,
                cobwebCornerLeft,
                cobwebCornerLeftSpider,
                cobwebCornerLeftMediumSpider,
                cobwebCornerLeftBigSpider,
                cobwebCornerRight,
                cobwebCornerRightSpider,
                cobwebCornerRightMediumSpider,
                cobwebCornerRightBigSpider,
                happyHalloween1,
                happyHalloween1safe,
                happyHalloween2,
                happyHalloween2safe,
                happyHalloweenHorizontal,
            ],
            "Birthday": [
                cake,
                cakeSprinkles,
                candle,
            ],
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
