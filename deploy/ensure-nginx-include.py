#!/usr/bin/env python3
import os
import re
import shutil
import sys

INCLUDE = "    include /etc/nginx/snippets/helionyx-api.conf;\n"


def block_end(text, opening_brace):
    depth = 0
    for index in range(opening_brace, len(text)):
        char = text[index]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return index
    raise RuntimeError("Unclosed nginx server block")


def update(path):
    real_path = os.path.realpath(path)
    with open(real_path, "r", encoding="utf-8") as handle:
        text = handle.read()

    if "/etc/nginx/snippets/helionyx-api.conf" in text:
        return False

    insertions = []
    for match in re.finditer(r"\bserver\s*\{", text):
        opening = text.find("{", match.start())
        closing = block_end(text, opening)
        block = text[match.start():closing + 1]
        if re.search(r"\bserver_name\b[^;]*\bhelionyx\.store\b", block):
            insertions.append(closing)

    if not insertions:
        return False

    shutil.copy2(real_path, real_path + ".helionyx-api.bak")
    for closing in reversed(insertions):
        text = text[:closing] + INCLUDE + text[closing:]

    with open(real_path, "w", encoding="utf-8") as handle:
        handle.write(text)
    return True


if __name__ == "__main__":
    changed = False
    for filename in sys.argv[1:]:
        if os.path.exists(filename):
            changed = update(filename) or changed
    if not changed:
        print("Nginx API include already present or no HELIONYX server block found")
