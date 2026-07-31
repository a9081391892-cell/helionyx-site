#!/usr/bin/env python3
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
article = root / "articles" / "pochemu-9800-mah-ne-byvaet-v-akkumulyatore-pylesosa" / "index.html"
text = article.read_text(encoding="utf-8")

text, count = re.subn(
    r'\s*<p class="capacity-story">.*?</p>',
    "",
    text,
    count=1,
    flags=re.DOTALL,
)

article.write_text(text, encoding="utf-8")
print(f"Удалён негативный кейс с упоминанием HELIONYX: {count}")
