#!/usr/bin/env python3
from pathlib import Path

root = Path(__file__).resolve().parents[1]
page = root / "index.html"
text = page.read_text(encoding="utf-8")

css_link = '<link rel="stylesheet" href="assets/home-articles.css">'
if css_link not in text:
    main_css = '<link rel="stylesheet" href="assets/site.css">'
    if main_css not in text:
        raise SystemExit("Не найдено подключение assets/site.css в index.html")
    text = text.replace(main_css, main_css + "\n  " + css_link, 1)

articles_nav = '<a href="articles/">Полезные статьи</a>'
if articles_nav not in text:
    catalog_nav = '<a href="catalog/">Каталог</a>'
    if catalog_nav not in text:
        raise SystemExit("Не найден пункт Каталог в верхнем меню")
    text = text.replace(catalog_nav, catalog_nav + "\n          " + articles_nav, 1)

footer_marker = '<div>\n          <h3>Покупателям</h3>'
footer_link = '<a href="articles/">Полезные статьи</a>'
footer_position = text.find(footer_marker)
if footer_position >= 0:
    footer_end = text.find('</div>', footer_position)
    footer_block = text[footer_position:footer_end]
    if footer_link not in footer_block:
        footer_catalog = '<a href="catalog/">Каталог</a>'
        if footer_catalog in footer_block:
            updated = footer_block.replace(footer_catalog, footer_catalog + "\n          " + footer_link, 1)
            text = text[:footer_position] + updated + text[footer_end:]
        else:
            heading = '<h3>Покупателям</h3>'
            updated = footer_block.replace(heading, heading + "\n          " + footer_link, 1)
            text = text[:footer_position] + updated + text[footer_end:]

start_marker = '<!-- HELIONYX_HOME_ARTICLES_START -->'
end_marker = '<!-- HELIONYX_HOME_ARTICLES_END -->'
section = '''<!-- HELIONYX_HOME_ARTICLES_START -->
<section class="section section--soft home-articles" aria-labelledby="home-articles-title">
  <div class="container">
    <div class="section-heading home-articles__heading">
      <div>
        <span class="eyebrow">База знаний HELIONYX</span>
        <h2 id="home-articles-title">Полезно знать об аккумуляторах</h2>
        <p>Практические инструкции без маркетинговых сказок: подбор, замена и проверка реальной ёмкости.</p>
      </div>
      <a href="articles/">Все статьи →</a>
    </div>
    <div class="home-articles__grid">
      <article class="home-article-card">
        <a class="home-article-card__image" href="articles/zamena-akkumulyatora-xiaomi-vacuum-mop-1c/">
          <img src="assets/products/xiaomi-1c-5200/01.webp" alt="Замена аккумулятора Xiaomi Mi Robot Vacuum-Mop 1C" loading="lazy">
        </a>
        <div class="home-article-card__body">
          <span class="eyebrow">Инструкция по замене</span>
          <h3><a href="articles/zamena-akkumulyatora-xiaomi-vacuum-mop-1c/">Как заменить аккумулятор Xiaomi Vacuum-Mop 1C</a></h3>
          <p>Симптомы износа, проверка STYTJ01ZHM и P1904-4S1P-MM, пошаговая замена и выбор между 5200 и 6500 мАч.</p>
          <a class="button button--small button--outline" href="articles/zamena-akkumulyatora-xiaomi-vacuum-mop-1c/">Читать статью</a>
        </div>
      </article>
      <article class="home-article-card">
        <a class="home-article-card__image" href="articles/pochemu-9800-mah-ne-byvaet-v-akkumulyatore-pylesosa/">
          <img src="assets/products/xiaomi-1c-6400/01.webp" alt="Почему заявленная ёмкость 9800 мАч часто нереальна" loading="lazy">
        </a>
        <div class="home-article-card__body">
          <span class="eyebrow">Проверяем цифры</span>
          <h3><a href="articles/pochemu-9800-mah-ne-byvaet-v-akkumulyatore-pylesosa/">Почему аккумулятор 9800 мАч часто оказывается маркетинговой цифрой</a></h3>
          <p>Разбираем конфигурацию 4S2P, возможности элементов 18650, ватт-часы, массу и признаки завышенной ёмкости.</p>
          <a class="button button--small button--outline" href="articles/pochemu-9800-mah-ne-byvaet-v-akkumulyatore-pylesosa/">Разобраться</a>
        </div>
      </article>
    </div>
  </div>
</section>
<!-- HELIONYX_HOME_ARTICLES_END -->'''

if start_marker in text and end_marker in text:
    before, rest = text.split(start_marker, 1)
    _, after = rest.split(end_marker, 1)
    text = before + section + after
else:
    closing_main = '</main>'
    if closing_main not in text:
        raise SystemExit("Не найден закрывающий тег main")
    text = text.replace(closing_main, section + "\n  " + closing_main, 1)

page.write_text(text, encoding="utf-8")
print("На главную добавлены меню, футер и блок полезных статей.")
