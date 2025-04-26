from contextlib import contextmanager
import json
from pathlib import Path
import sys

from svg import write_drawing


@contextmanager
def getOutputFile():
    if len(sys.argv) == 2:
        yield sys.stdout
    else:
        try:
            f = open(sys.argv[2], "w")
            yield f
        finally:
            f.close()


if __name__ == "__main__":

    if len(sys.argv) < 3:
        print("Specify input file & output directory", file=sys.stderr)
        exit(1)

    input_file = sys.argv[1]

    output_folder = Path(sys.argv[2])

    if output_folder.exists() and not output_folder.is_dir():
        print("Path exists and is not a directory", file=sys.stderr)
        exit(1)

    if not output_folder.exists():
        output_folder.mkdir()

    with open(input_file, "r") as f:
        all_atds = json.load(f)

    for name, atd in all_atds.items():
        if strokes := atd.get("currentDrawing", {}).get("is", []):
            with open(output_folder / f"{name}.svg", "w") as output_file:
                write_drawing(output_file, strokes)
