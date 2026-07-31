#!/usr/bin/env python3
from pathlib import Path

root = Path(__file__).resolve().parents[1]
article = root / "articles" / "pochemu-9800-mah-ne-byvaet-v-akkumulyatore-pylesosa" / "index.html"
text = article.read_text(encoding="utf-8")

old_title = "Аккумулятор 9800 мАч для робота-пылесоса: почему такая ёмкость часто нереальна"
new_title = "9800 мАч за копейки: чудо-аккумулятор или обман?"
old_h1 = "Аккумулятор 9800 мАч для робота-пылесоса: почему цифра часто не соответствует реальности"

text = text.replace(f"<title>{old_title} | HELIONYX</title>", f"<title>{new_title} | HELIONYX</title>")
text = text.replace(f'content="{old_title}"', f'content="{new_title}"')
text = text.replace(f'\"headline\":\"{old_title}\"', f'\"headline\":\"{new_title}\"')
text = text.replace(f"<h1>{old_h1}</h1>", f"<h1>{new_title}</h1>")

style = """
<style>
.article-image{margin:34px 0}.article-image img{display:block;width:100%;height:auto;border-radius:20px;border:1px solid #dfe7f1;box-shadow:0 14px 38px rgba(21,51,91,.13);background:#fff}.article-image figcaption{margin:10px 6px 0;color:#66758a;font-size:14px;line-height:1.55;text-align:center}
</style>
"""
if ".article-image{" not in text:
    text = text.replace("</head>", style + "</head>", 1)

figures = [
    (
        '          <h2 id="cells">',
        '''          <figure class="article-image">
            <img src="../../assets/articles/9800-mah-obman.jpg" alt="Сравнение заявленной ёмкости 9800 мАч с реальными возможностями аккумуляторных элементов" loading="lazy">
            <figcaption>Громкая цифра на этикетке ещё не доказывает реальную ёмкость аккумулятора.</figcaption>
          </figure>\n\n          <h2 id="cells">''',
        "9800-mah-obman.jpg",
    ),
    (
        '          <h2 id="why-works">',
        '''          <figure class="article-image">
            <img src="../../assets/articles/chestnyy-akkumulyator.jpg" alt="Честный аккумулятор HELIONYX с подтверждёнными характеристиками" loading="lazy">
            <figcaption>Надёжный аккумулятор — это реальные элементы, защита, испытания и понятная гарантия.</figcaption>
          </figure>\n\n          <h2 id="why-works">''',
        "chestnyy-akkumulyator.jpg",
    ),
    (
        '          <h2 id="checklist">',
        '''          <figure class="article-image">
            <img src="../../assets/articles/deshevo-ne-bezopasno.jpg" alt="Риск покупки подозрительно дешёвого аккумулятора с неподтверждёнными характеристиками" loading="lazy">
            <figcaption>Слишком низкая цена вместе с фантастической ёмкостью — повод проверить товар особенно внимательно.</figcaption>
          </figure>\n\n          <h2 id="checklist">''',
        "deshevo-ne-bezopasno.jpg",
    ),
]

for marker, block, filename in figures:
    if filename not in text:
        if marker not in text:
            raise SystemExit(f"Не найден маркер для {filename}: {marker}")
        text = text.replace(marker, block, 1)

article.write_text(text, encoding="utf-8")
print("Заголовок обновлён, три исходных JPEG вставлены в статью без изменения файлов.")
