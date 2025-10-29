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
        collapseToolbar();
    }

    function collapseToolbar() {
        document.querySelector(".grading-toolbar-box").dispatchEvent(
            new MouseEvent("mouseleave"),
            {
                bubbles: true,
            },
        );
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
            this.hasFill = this.strokes.some((stroke) => stroke.doFill());
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
        return InkTool.InkCanvasLib.List[document.querySelector(".worksheet-container.selected stroke .stroke[id*='-red-comment-']")?.id];
    }

    function getStudentDrawing() {
        return InkTool.InkCanvasLib.List[document.querySelector(".worksheet-container.selected stroke .stroke[id*='-study-stroke-']")?.id]?.currentDrawing?.is;
    }

    function unlockPage() {
        let atd = getAtd();
        atd.drawingMode = 1;
    }

    // map[atd:list[{startIndex, numLines}]]
    var writeStrokes = {}
    // map[atd:list[{startIndex, numLines}]]
    var operateBufferStrokes = {}
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
        let currentOperateBufferIndex = 0;
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
            currentOperateBufferIndex = atd.operateBuffer.countDrawItems();
            setPenColorHex(color);
            previousAlpha = atd.pen.col.A;
            previousWidth = atd.pen.w;
        }
        let stampDimensions = stamp.getDimensions(scale);
        pos = {
            x: pos.x - stampDimensions.min.x,
            y: pos.y - stampDimensions.min.y,
        };
        console.log("stampDimensions:");
        console.log(stampDimensions);
        let penScale = stamp.hasFill ? getPenScale(stampDimensions) : 1;
        if (!dryRun) {
            atd.pen.col.A = alpha;
            atd.pen.w = width;
            let pointer = InkTool.InkCanvasLib.PointerTraceList[0];
            writeAt(stamp, pos, scale, atd, pointer, {
                    usePredefinedColor: usePredefinedColor,
                    rainbowSpeed: rainbow && rainbowSpeed,
                    rainbowFill: rainbowFill,
                    penScale: penScale,
                }
            );
            saveDrawing(atd, pointer);
            if (!(atd in writeStrokes)) {
                writeStrokes[atd] = []
            }
            if (!(atd in operateBufferStrokes)) {
                operateBufferStrokes[atd] = []
            }
            writeStrokes[atd].push({startIndex: currentDrawIndex, numLines: newDrawCounter});
            operateBufferStrokes[atd].push({startIndex: currentOperateBufferIndex, numLines: newDrawCounter + 2});
            atd.pen.col.A = previousAlpha;
            atd.pen.w = previousWidth;
        }
        return {
            width: (stampDimensions.max.x - stampDimensions.min.x) * zoomRatio,
            height: (stampDimensions.max.y - stampDimensions.min.y) * zoomRatio,
        };
    }

    function getPenScale(stampDimensions) {
        let smallerDimension = Math.min(
            stampDimensions.max.x - stampDimensions.min.x,
            stampDimensions.max.y - stampDimensions.min.y,
        );
        let largerDimension = Math.max(
            stampDimensions.max.x - stampDimensions.min.x,
            stampDimensions.max.y - stampDimensions.min.y,
        );
        let dimension = 2*smallerDimension/3 + largerDimension/3;
        let penScale = Math.max(1, Math.floor(dimension / 55)) / 2;
        console.log(`penScale: ${penScale}`);
        return penScale;
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
        let currentOperateBufferIndex = atd.operateBuffer.countDrawItems();
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
            if (!(atd in operateBufferStrokes)) {
                operateBufferStrokes[atd] = []
            }
            writeStrokes[atd].push({startIndex: currentDrawIndex, numLines: newDrawCounter});
            operateBufferStrokes[atd].push({startIndex: currentOperateBufferIndex, numLines: newDrawCounter + 2});
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
        if (!atd) return;
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
        target?.querySelectorAll("stroke .stroke")?.forEach(stroke => {
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
        let lastOperateBufferWriteInfo = operateBufferStrokes[atd].pop();
        let numOperateBufferItems = atd.operateBuffer.countDrawItems()
        for (let i = lastOperateBufferWriteInfo.startIndex; i < Math.min(lastOperateBufferWriteInfo.startIndex + lastOperateBufferWriteInfo.numLines, numOperateBufferItems); i++) {
            removeFromOperateBuffer(atd, lastOperateBufferWriteInfo.startIndex);
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

    function removeFromOperateBuffer(atd, index) {
        var maxnum = atd.operateBuffer.countDrawItems();
        if (maxnum <= index) return false;
        atd.operateBuffer.deleteDrawItem(index);
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
        if (atd.operateBuffer != null) {
            atd.operateBuffer.addDrawItem(atd.currentStroke);
        }

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
        strokeWidth /= 1.1;
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
            rainbowFill = options.rainbowFill || false,
            penScale = options.penScale || 1;
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

        atd.pen.w *= penScale;
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
                    if (atd.operateBuffer != null) {
                        atd.operateBuffer.addDrawItem(atd.currentStroke);
                    }

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
                    if (atd.operateBuffer != null) {
                        atd.operateBuffer.addDrawItem(atd.currentStroke);
                    }

                    newDrawCounter++;
                    if (rainbowSpeed > 0) {
                        _incrementRainbow(atd.pen.col, rainbowSpeed, rainbowInfo);
                        changedColor = true;
                    }
                }
            }
        }
        atd.pen.w /= penScale;
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

    // {#- comment combination to fool lsp into thinking the first block is uncommented, but the second block is actually the real code
    const HELVETICANT = parseFont("");
    /* #}
    const HELVETICANT = parseFont(`{{ helveticant }}`);
    //*/

    // {#- comment combination to fool lsp into thinking the next block is commented
    /* #}
    {% for stamp_name, stamp_contents in stamps.items() %}
    const {{ stamp_name }} = parseSvg(`{{ stamp_contents }}`);
    {%- endfor %}
    //*/

    global.StampLib = {
        getAtd: getAtd,
        getStudentDrawing: getStudentDrawing,
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
        expandToolbar: expandToolbar,
        collapseToolbar: collapseToolbar,
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
                pvPanda,
                pvHamster2,
                halloweenCuteCatFilled,
                christmasCat,
                halloweenCuteCatHat,
                halloweenCuteCatHat3,
                halloweenCuteCatHat2,
                koala,
                orca1,
                orca2,
                axolotlWizardGreenHead,
                axolotlWizardGreenNormal,
                axolotlWizardGreen,
                axolotlWizardPink,
                axolotlWizardPinkGreen,
                axolotlWizardBlue,
                adelineCatGreatJob,
                adelineStar,
                karthikaBootifulWorkGhost,
                karthikaBananamon,
                karthikaEggcellentWork,
                karthikaAmazingHeart,
                willowHi,
                willowAlex,
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
                pvPanda,
                pvHamster2,
                halloweenCuteCatFilled,
                christmasCat,
                halloweenCuteCatHat,
                halloweenCuteCatHat3,
                halloweenCuteCatHat2,
                koala,
                orca1,
                orca2,
                axolotlWizardGreenHead,
                axolotlWizardGreenNormal,
                axolotlWizardGreen,
                axolotlWizardPink,
                axolotlWizardPinkGreen,
                axolotlWizardBlue,
            ],
            "Student-drawn": [
                adelineCatGreatJob,
                adelineStar,
                karthikaBootifulWorkGhost,
                karthikaBananamon,
                karthikaEggcellentWork,
                karthikaAmazingHeart,
                karthikaPurrfect,
                willowHi,
                willowAlex,
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
            getOperateBufferStrokes: function() {return operateBufferStrokes;},
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
