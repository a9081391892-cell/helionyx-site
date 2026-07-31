#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTICLE = ROOT / "articles" / "pochemu-9800-mah-ne-byvaet-v-akkumulyatore-pylesosa" / "index.html"
ARTICLES_INDEX = ROOT / "articles" / "index.html"
HOME = ROOT / "index.html"

START = "<!-- HELIONYX_CAPACITY_VISUALS_START -->"
END = "<!-- HELIONYX_CAPACITY_VISUALS_END -->"
TITLE = "9800 мАч за копейки: где обман и чем опасен дешёвый аккумулятор"
META = "Почему дешёвый аккумулятор с надписью 9800 мАч может оказаться обманом: проверяем 4S2P, элементы 18650, документы, безопасность и риск перегрева."

VISUAL_1 = r'''<!-- HELIONYX_CAPACITY_VISUALS_START -->
<figure class="capacity-visual capacity-visual--compare" aria-labelledby="capacity-visual-one-title">
  <h3 class="capacity-visual__title" id="capacity-visual-one-title">9800 мАч? Проверяем, а не верим</h3>
  <span class="capacity-visual__subtitle">Как отличить реальную ёмкость от красивой цифры</span>
  <div class="capacity-visual__split">
    <div class="capacity-visual__side capacity-visual__side--danger">
      <div class="capacity-visual__label">✕ ПАЛЁНЫЙ ТОВАР</div>
      <div class="capacity-visual__battery">
        <img src="../../assets/products/xiaomi-1c-5200/01.webp" alt="Аккумулятор с неподтверждённой маркировкой ёмкости" loading="lazy">
        <strong class="capacity-visual__fake-number">9800 мАч</strong>
      </div>
      <ul class="capacity-visual__list">
        <li>Завышенная ёмкость на этикетке</li>
        <li>Неизвестные элементы внутри</li>
        <li>Нет понятных тестов и документов</li>
        <li>Быстрый износ под нагрузкой</li>
      </ul>
    </div>
    <div class="capacity-visual__side capacity-visual__side--safe">
      <div class="capacity-visual__label">✓ ЧЕСТНЫЙ ТОВАР</div>
      <div class="capacity-visual__real-number">5200–6400 мАч</div>
      <div class="capacity-visual__battery">
        <img src="../../assets/products/xiaomi-1c-6400/01.webp" alt="Аккумулятор HELIONYX BAT1C6500 с реальными характеристиками" loading="lazy">
      </div>
      <ul class="capacity-visual__list">
        <li>Известные элементы EVE 18650</li>
        <li>Реальные мАч и ватт-часы</li>
        <li>BMS и защитные функции</li>
        <li>UN38.3 и гарантия 12 месяцев</li>
      </ul>
    </div>
  </div>
  <div class="capacity-visual__brand">HELIONYX <em>•</em> НАДЁЖНОСТЬ</div>
  <figcaption>В батарее 4S2P заявленные 9800 мАч требуют 4900 мАч от каждой банки 18650 — известные серийные элементы такого значения не подтверждают.</figcaption>
</figure>
<!-- HELIONYX_CAPACITY_VISUALS_END -->'''

VISUAL_2 = r'''<!-- HELIONYX_CAPACITY_VISUALS_START -->
<figure class="capacity-visual capacity-visual--quality" aria-labelledby="capacity-visual-two-title">
  <h3 class="capacity-visual__title" id="capacity-visual-two-title">Честный аккумулятор — это не просто цифра</h3>
  <span class="capacity-visual__subtitle">Почему надёжный аккумулятор стоит своих денег</span>
  <div class="capacity-quality__body">
    <div class="capacity-quality__cards">
      <div class="capacity-quality__card"><div class="capacity-quality__icon">✓</div><div><b>Сертификаты и документы</b><span>Понятная модель, производитель и характеристики</span></div></div>
      <div class="capacity-quality__card"><div class="capacity-quality__icon">✈</div><div><b>UN38.3</b><span>Пройдены транспортные испытания литиевой батареи</span></div></div>
      <div class="capacity-quality__card"><div class="capacity-quality__icon">⚗</div><div><b>Пройденные тесты</b><span>Ёмкость, температура, вибрация и безопасность</span></div></div>
    </div>
    <div class="capacity-quality__product">
      <img src="../../assets/products/xiaomi-1c-6400/01.webp" alt="Надёжный аккумулятор HELIONYX с документами и испытаниями" loading="lazy">
    </div>
    <div class="capacity-quality__cards">
      <div class="capacity-quality__card"><div class="capacity-quality__icon">🛡</div><div><b>Безопасность</b><span>Защита от перегрева, КЗ, перезаряда и переразряда</span></div></div>
      <div class="capacity-quality__card"><div class="capacity-quality__icon">H</div><div><b>Известное имя</b><span>Бренд HELIONYX и ответственная гарантия</span></div></div>
      <div class="capacity-quality__card"><div class="capacity-quality__icon">12</div><div><b>Гарантия</b><span>12 месяцев поддержки после покупки</span></div></div>
    </div>
  </div>
  <div class="capacity-price">
    <h3>Из чего складывается честная цена</h3>
    <div class="capacity-price__formula">
      <span class="capacity-price__item">Качественные элементы</span><span class="capacity-price__plus">+</span>
      <span class="capacity-price__item">Налог</span><span class="capacity-price__plus">+</span>
      <span class="capacity-price__item">Доставка</span><span class="capacity-price__plus">+</span>
      <span class="capacity-price__item">Упаковка</span><span class="capacity-price__plus">+</span>
      <span class="capacity-price__item">Честная прибыль</span>
    </div>
  </div>
  <div class="capacity-visual__brand">HELIONYX <em>•</em> НАДЁЖНОСТЬ</div>
  <figcaption>Цена аккумулятора складывается не из надписи на этикетке, а из элементов, защиты, сборки, испытаний, логистики, налогов и гарантии.</figcaption>
</figure>
<!-- HELIONYX_CAPACITY_VISUALS_END -->'''

VISUAL_3 = r'''<!-- HELIONYX_CAPACITY_VISUALS_START -->
<figure class="capacity-visual capacity-visual--risk" aria-labelledby="capacity-visual-three-title">
  <h3 class="capacity-visual__title" id="capacity-visual-three-title">Дёшево — не значит безопасно</h3>
  <span class="capacity-visual__subtitle">Слишком низкая цена может обойтись слишком дорого</span>
  <div class="capacity-visual__split">
    <div class="capacity-visual__side capacity-visual__side--danger">
      <div class="capacity-visual__label">✕ ПАЛЁНЫЙ ТОВАР</div>
      <div class="capacity-visual__battery">
        <img src="../../assets/products/xiaomi-1c-5200/01.webp" alt="Дешёвый аккумулятор с риском перегрева" loading="lazy">
        <strong class="capacity-visual__fake-number">ПОДОЗРИТЕЛЬНО ДЁШЕВО</strong>
      </div>
      <ul class="capacity-visual__list">
        <li>Неизвестные или перемаркированные элементы</li>
        <li>Нет подтверждённых испытаний</li>
        <li>Риск сильного нагрева</li>
        <li>Риск повреждения техники и возгорания</li>
      </ul>
      <p class="capacity-story"><strong>Реальный тревожный случай:</strong> у знакомых владельца HELIONYX дешёвый аккумулятор начал сильно нагреваться и едва не стал причиной пожара в квартире. Это частный случай, но он показывает цену экономии на элементах и защите.</p>
    </div>
    <div class="capacity-visual__side capacity-visual__side--safe">
      <div class="capacity-visual__label">✓ НАДЁЖНЫЙ ВЫБОР</div>
      <div class="capacity-visual__battery">
        <img src="../../assets/products/xiaomi-1c-6400/01.webp" alt="Безопасный аккумулятор HELIONYX с проверенными элементами" loading="lazy">
      </div>
      <ul class="capacity-visual__list">
        <li>Реальная заявленная ёмкость</li>
        <li>Проверенные элементы</li>
        <li>Сертификаты безопасности</li>
        <li>Пройденные тесты и гарантия</li>
      </ul>
    </div>
  </div>
  <div class="capacity-visual__brand">HELIONYX <em>•</em> НАДЁЖНОСТЬ</div>
  <figcaption>Низкая цена сама по себе не доказывает опасность, но вместе с фантастической ёмкостью, неизвестными элементами и отсутствием документов становится серьёзным предупреждением.</figcaption>
</figure>
<!-- HELIONYX_CAPACITY_VISUALS_END -->'''


def remove_visuals(text: str) -> str:
    return re.sub(
        re.escape(START) + r".*?" + re.escape(END),
        "",
        text,
        flags=re.DOTALL,
    )


def update_article() -> None:
    text = ARTICLE.read_text(encoding="utf-8")
    text = remove_visuals(text)

    text = re.sub(r"<title>.*?</title>", f"<title>{TITLE} | HELIONYX</title>", text, count=1)
    text = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{META}">', text, count=1)
    text = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{TITLE}">', text, count=1)
    text = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{META}">', text, count=1)
    text = re.sub(r'<h1>.*?</h1>', f'<h1>{TITLE}</h1>', text, count=1, flags=re.DOTALL)

    def update_article_json(match: re.Match[str]) -> str:
        try:
            payload = json.loads(match.group(2))
        except json.JSONDecodeError:
            return match.group(0)
        if payload.get("@type") == "Article":
            payload["headline"] = TITLE
            payload["description"] = META
            payload["dateModified"] = "2026-07-31"
        return match.group(1) + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + match.group(3)

    text = re.sub(
        r'(<script type="application/ld\+json">)(.*?)(</script>)',
        update_article_json,
        text,
        flags=re.DOTALL,
    )

    css = '<link rel="stylesheet" href="../../assets/capacity-visuals.css">'
    if css not in text:
        marker = '<link rel="stylesheet" href="../../assets/article.css">'
        if marker not in text:
            raise SystemExit("Не найден article.css")
        text = text.replace(marker, marker + "\n  " + css, 1)

    insertions = [
        ('          <h2 id="cells">', VISUAL_1 + '\n\n          <h2 id="cells">'),
        ('          <h2 id="why-works">', VISUAL_2 + '\n\n          <h2 id="why-works">'),
        ('          <h2 id="checklist">', VISUAL_3 + '\n\n          <h2 id="checklist">'),
    ]
    for marker, replacement in insertions:
        if marker not in text:
            raise SystemExit(f"Не найден маркер вставки: {marker}")
        text = text.replace(marker, replacement, 1)

    ARTICLE.write_text(text, encoding="utf-8")


def update_listing(path: Path, relative_prefix: str) -> None:
    text = path.read_text(encoding="utf-8")
    old_titles = [
        "Почему аккумулятор 9800 мАч часто оказывается маркетинговой цифрой",
        "Аккумулятор 9800 мАч для робота-пылесоса: почему такая ёмкость часто нереальна",
    ]
    for old in old_titles:
        text = text.replace(old, TITLE)
    text = text.replace(
        "Разбираем конфигурацию 4S2P, возможности элементов 18650, ватт-часы, массу и признаки завышенной ёмкости.",
        "Почему обещанные 9800 мАч не сходятся с конструкцией 4S2P, чем опасна экономия на элементах и как проверить аккумулятор до покупки.",
    )
    text = text.replace(
        "Разбор завышенной ёмкости: 4S2P, элементы 18650, ватт-часы и признаки недостоверной маркировки.",
        "9800 мАч за копейки: проверяем физику, документы, безопасность и признаки палёного товара.",
    )
    path.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    update_article()
    update_listing(ARTICLES_INDEX, "../")
    update_listing(HOME, "")
    print("Статья о 9800 мАч получила новый заголовок и три инфографики HELIONYX.")
