#!/usr/bin/env python3
"""Load all authoritative HELIONYX battery data chunks and enrich the site."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
MODULE_PATH = HERE / "enrich-battery-catalog.py"

spec = importlib.util.spec_from_file_location("helionyx_catalog_enricher", MODULE_PATH)
if spec is None or spec.loader is None:
    raise SystemExit("Не удалось загрузить модуль обновления каталога")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

common = {}
records = []
for path in sorted(HERE.glob("helionyx-batteries-*.json")):
    payload = json.loads(path.read_text(encoding="utf-8"))
    common.update(payload.get("common") or {})
    records.extend(payload.get("records") or [])

records = [{**common, **record} for record in records]
if len(records) != 17:
    raise SystemExit(f"Ожидалось 17 аккумуляторов, получено: {len(records)}")

by_slug = {record["slug"]: record for record in records}
if len(by_slug) != 17:
    raise SystemExit("В каталоге найдены повторяющиеся slug")

for record in records:
    module.enrich_product_page(record)
module.enrich_search_indexes(by_slug)
print("Готово: 17 карточек и поисковые индексы обновлены из Excel-базы HELIONYX.")
