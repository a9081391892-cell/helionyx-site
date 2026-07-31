#!/usr/bin/env python3
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
article = root / "articles" / "pochemu-9800-mah-ne-byvaet-v-akkumulyatore-pylesosa" / "index.html"
text = article.read_text(encoding="utf-8")

START = "<!-- HELIONYX_CAPACITY_VISUALS_START -->"
END = "<!-- HELIONYX_CAPACITY_VISUALS_END -->"
text = re.sub(re.escape(START) + r".*?" + re.escape(END), "", text, flags=re.DOTALL)
text = re.sub(r'\s*<p class="capacity-story">.*?</p>', "", text, flags=re.DOTALL)
text = text.replace('<link rel="stylesheet" href="../../assets/capacity-visuals.css">\n', '')

figures = [
    ('          <h2 id="cells">', '''          <figure class="article-image">
            <img src="../../assets/articles/capacity-fake-vs-helionyx.webp" alt="Сравнение аккумулятора с неподтверждёнными 9800 мАч и аккумулятора HELIONYX с реальной ёмкостью" loading="lazy" width="640" height="480">
            <figcaption>Заявленные 9800 мАч в корпусе 4S2P не сходятся с возможностями серийных элементов 18650.</figcaption>
          </figure>\n\n          <h2 id="cells">'''),
    ('          <h2 id="why-works">', '''          <figure class="article-image">
            <img src="../../assets/articles/helionyx-quality-and-safety.webp" alt="Аккумулятор HELIONYX: сертификаты, UN38.3, испытания, защита и понятная цена" loading="lazy" width="640" height="480">
            <figcaption>Надёжность складывается из проверенных элементов, защиты, документов, испытаний и ответственной гарантии.</figcaption>
          </figure>\n\n          <h2 id="why-works">'''),
    ('          <h2 id="checklist">', '''          <figure class="article-image">
            <img src="../../assets/articles/cheap-battery-fire-risk.webp" alt="Риск перегрева и возгорания подозрительно дешёвого аккумулятора без подтверждённых испытаний" loading="lazy" width="640" height="480">
            <figcaption>Фантастическая ёмкость, неизвестные элементы и отсутствие документов — серьёзные предупреждающие признаки.</figcaption>
          </figure>\n\n          <h2 id="checklist">'''),
]
for marker, block in figures:
    if marker not in text:
        raise SystemExit(f"Не найден маркер: {marker}")
    text = text.replace(marker, block, 1)

style = '''\n<style>
.article-image{margin:34px 0}.article-image img{display:block;width:100%;height:auto;border-radius:20px;border:1px solid #dfe7f1;box-shadow:0 14px 38px rgba(21,51,91,.13)}.article-image figcaption{margin:10px 6px 0;color:#66758a;font-size:14px;line-height:1.55;text-align:center}
</style>\n'''
if '.article-image{' not in text:
    text = text.replace('</head>', style + '</head>', 1)

article.write_text(text, encoding="utf-8")
print("Три одобренных изображения установлены, негативный кейс с HELIONYX удалён.")
