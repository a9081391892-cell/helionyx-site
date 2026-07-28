#!/usr/bin/env python3
import os
import re
import shutil
import sys

INCLUDE_PATH = "/etc/nginx/snippets/helionyx-api.conf"
INCLUDE = f"    include {INCLUDE_PATH};\n"


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


def is_helionyx_server(block):
    has_domain = re.search(
        r"\bserver_name\b[^;]*(?:\bhelionyx\.store\b|\bwww\.helionyx\.store\b)",
        block,
    )
    has_web_root = re.search(r"\broot\s+/var/www/helionyx(?:/[^;\s]*)?\s*;", block)
    return bool(has_domain or has_web_root)


def update(path):
    real_path = os.path.realpath(path)
    with open(real_path, "r", encoding="utf-8") as handle:
        text = handle.read()

    matched = False
    insertions = []
    for match in re.finditer(r"\bserver\s*\{", text):
        opening = text.find("{", match.start())
        closing = block_end(text, opening)
        block = text[match.start():closing + 1]
        if not is_helionyx_server(block):
            continue
        matched = True
        if INCLUDE_PATH not in block:
            insertions.append(closing)

    if not insertions:
        return matched, False

    shutil.copy2(real_path, real_path + ".helionyx-api.bak")
    for closing in reversed(insertions):
        text = text[:closing] + INCLUDE + text[closing:]

    with open(real_path, "w", encoding="utf-8") as handle:
        handle.write(text)
    return True, True


if __name__ == "__main__":
    matched_any = False
    changed_any = False
    seen = set()

    for filename in sys.argv[1:]:
        if not os.path.exists(filename):
            continue
        real_path = os.path.realpath(filename)
        if real_path in seen:
            continue
        seen.add(real_path)
        matched, changed = update(real_path)
        matched_any = matched_any or matched
        changed_any = changed_any or changed

    if not matched_any:
        print("HELIONYX nginx server block was not found", file=sys.stderr)
        raise SystemExit(1)

    if changed_any:
        print("HELIONYX API include installed")
    else:
        print("HELIONYX API include already present")
