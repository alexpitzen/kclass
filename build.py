import io
import json
from pathlib import Path
import sys

import jinja2

def get_local_stamps():
    local_stamps = {}
    for f in Path("images").rglob("output_*.svg"):
        if not f.is_file():
            continue
        name = f.name[len("output_"):-len(".svg")]
        if name in local_stamps:
            print(f"Warning: {f} is overwriting another image named {name}.", file=sys.stderr)
        try:
            local_stamps[name] = f.read_text().replace("\n", " ")
        except Exception as ex:
            print(f"Failed to load {f}: {ex}", file=sys.stderr)

    return local_stamps

def get_css():
    with io.StringIO() as css:
        for f in Path("css").glob("*.css"):
            if not f.is_file():
                continue
            try:
                css.write("\n")
                css.write(f.read_text())
            except Exception as ex:
                print(f"Failed to read css file {f}: {ex}", file=sys.stderr)

        return css.getvalue()

if __name__ == "__main__":

    with open("all_stamps.json", "r") as f:
        all_stamps = json.loads("".join(f.readlines()))

    local_stamps = get_local_stamps()
    all_stamps.update(local_stamps)

    templates = jinja2.Environment(loader=jinja2.loaders.FileSystemLoader("."))
    main_template = templates.get_template("tampermonkey_info.js")

    output = main_template.render({"stamps": all_stamps, "css": get_css()})

    with open("output_dynamic_scss.js", "w") as f:
        f.write(output)

    with open("all_stamps.json", "w") as f:
        f.write(json.dumps(all_stamps, indent=4))
