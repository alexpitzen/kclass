from contextlib import contextmanager
import json
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
    # print(sys.argv)

    if len(sys.argv) == 1:
        print("Specify input file")
        exit(1)

    input_file = sys.argv[1]

    with open(input_file, "r") as f:
        strokes = json.load(f)

    # print(strokes)

    with getOutputFile() as output_file:
        write_drawing(output_file, strokes)
