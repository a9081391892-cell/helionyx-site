#!/usr/bin/env python3
from pathlib import Path

MODELS_HTML = """<ul>
          <li>Xiaomi Mi Robot Vacuum-Mop 1C</li>
          <li>Xiaomi Mi Robot Vacuum-Mop Mijia 1C</li>
          <li>Xiaomi Mi 1C (STYTJ01ZHM)</li>
          <li>Mijia 1C Sweeping Vacuum Cleaner</li>
          <li>Mijia Sweeping Robot 1C</li>
          <li>Sweeping Vacuum Cleaner 1C</li>
        </ul>"""

BATTERIES_HTML = """<ul>
          <li>SKV4073CN</li>
          <li>SKV4093GL</li>
          <li>P1904-4S1P-MM</li>
          <li>P1904-4S2P-MM</li>
        </ul>"""

COMMON_COMPATIBILITY = f"""<div class=\"compatibility-copy\">
        <p><strong>Совместимые модели и названия пылесоса:</strong></p>
        {MODELS_HTML}
        <p><strong>Совместимые номера аккумуляторов:</strong></p>
        {BATTERIES_HTML}
        <p>Названия Mi Robot Vacuum-Mop 1C, Xiaomi Mi 1C и Mijia 1C относятся к одной совместимой платформе. Перед заказом всё равно сравните маркировку, форму корпуса, расположение провода и разъём старой батареи.</p>
        </div>"""

PAGES = {
    Path("products/xiaomi-1c-5200/index.html"): {
        "old_description": "Аккумулятор для Xiaomi Vacuum-Mop 1C STYTJ01ZHM: 5200 мАч, 14,4 В. Подходит для P1904-4S1P-MM и SKV4093GL. Гарантия 12 месяцев.",
        "new_description": "Аккумулятор BAT1C5200 5200 мАч для Xiaomi Mi Robot Vacuum-Mop 1C STYTJ01ZHM. Совместим с SKV4073CN, SKV4093GL, P1904-4S1P-MM и P1904-4S2P-MM.",
        "old_paragraph": "<p>Типовая ёмкость составляет 5200 мАч, номинальная — 4800 мАч, напряжение — 14,4 В. Подходит для моделей STYTJ01ZHM и SKV4093GL при совпадении батареи P1904-4S1P-MM.</p>",
        "new_paragraph": "<p>Типовая ёмкость составляет 5200 мАч, номинальная — 4800 мАч, напряжение — 14,4 В. Аккумулятор предназначен для Xiaomi Mi Robot Vacuum-Mop 1C, Xiaomi Mi 1C и Mijia 1C с моделью пылесоса STYTJ01ZHM.</p><p>Подходит для замены батарей с маркировками SKV4073CN, SKV4093GL, P1904-4S1P-MM и P1904-4S2P-MM при совпадении корпуса, разъёма и полярности.</p>",
    },
    Path("products/xiaomi-1c-6400/index.html"): {
        "old_description": "Аккумулятор повышенной ёмкости для Xiaomi Vacuum-Mop 1C STYTJ01ZHM: 6400 мАч, 14,4 В. Для P1904-4S1P-MM, гарантия 12 месяцев.",
        "new_description": "Аккумулятор BAT1C6500 6400 мАч для Xiaomi Mi Robot Vacuum-Mop 1C STYTJ01ZHM. Совместим с SKV4073CN, SKV4093GL, P1904-4S1P-MM и P1904-4S2P-MM.",
        "old_paragraph": "<p>Номинальная ёмкость батареи составляет 6400 мАч, рабочее напряжение — 14,4 В. Подходит для моделей STYTJ01ZHM и SKV4093GL с аккумулятором формата P1904-4S1P-MM.</p>",
        "new_paragraph": "<p>Номинальная ёмкость батареи составляет 6400 мАч, рабочее напряжение — 14,4 В. Аккумулятор предназначен для Xiaomi Mi Robot Vacuum-Mop 1C, Xiaomi Mi 1C и Mijia 1C с моделью пылесоса STYTJ01ZHM.</p><p>Подходит для замены батарей с маркировками SKV4073CN, SKV4093GL, P1904-4S1P-MM и P1904-4S2P-MM при совпадении корпуса, разъёма и полярности.</p>",
    },
}

OLD_COMPATIBILITY = "<p>Xiaomi Mi Robot Vacuum-Mop 1C, STYTJ01ZHM, P1904-4S1P-MM, SKV4093GL</p>"

for path, values in PAGES.items():
    text = path.read_text(encoding="utf-8")

    if values["old_description"] in text:
        text = text.replace(values["old_description"], values["new_description"])
    elif values["new_description"] not in text:
        raise SystemExit(f"Не найдено исходное meta-описание в {path}")

    if values["old_paragraph"] in text:
        text = text.replace(values["old_paragraph"], values["new_paragraph"])
    elif values["new_paragraph"] not in text:
        raise SystemExit(f"Не найден исходный абзац в {path}")

    if OLD_COMPATIBILITY in text:
        text = text.replace(OLD_COMPATIBILITY, COMMON_COMPATIBILITY)
    elif COMMON_COMPATIBILITY not in text:
        raise SystemExit(f"Не найден блок совместимости в {path}")

    path.write_text(text, encoding="utf-8")
    print(f"SEO-совместимости обновлены: {path}")
