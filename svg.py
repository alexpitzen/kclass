def write_drawing(output_file, strokes):
    output_file.write(
        f"""<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg
    version="1.0"
    width="768pt"
    height="1270pt"
    viewBox="0 0 768 1270"
    preserveAspectRatio="xMidYMid meet"
    id="svg4"
    xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
    xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:svg="http://www.w3.org/2000/svg"
>
    <defs id="defs4" />
    <rect width="100%" height="100%" fill="white" />
    <g
        fill="none"
        stroke="#000000"
        id="g1">"""
    )
    for stroke in strokes:
        w = stroke["st"]["w"]
        col = "#ffffff" if stroke["st"]["tp"] == 203 else "#000000"
        if stroke["st"]["tp"] == 203:
            col = "#ffffff"
        else:
            c = stroke["st"]["col"]
            col = f"#{hex(c["R"])[2:]}{hex(c["G"])[2:]}{hex(c["B"])[2:]}"
        cs = stroke["cs"]
        output_file.write(
            f"""
        <path stroke-width="{w}" stroke="{col}" d="M"""
        )
        for c in cs:
            output_file.write(f" {c['x']} {c['y']}")
        output_file.write("""" />""")
    output_file.write(
        """
    </g>
</svg>"""
    )

