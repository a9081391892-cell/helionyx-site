#!/usr/bin/env python3
"""Add Yandex Metrika content analytics JSON-LD fields to HELIONYX articles."""

from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTICLES_ROOT = ROOT / "articles"

ARTICLE_BLOCK_RE = re.compile(
    r'(?P<open><article\b[^>]*class=["\'][^"\']*\barticle-copy\b[^"\']*["\'][^>]*>)'
    r'(?P<body>.*?)'
    r'(?P<close></article>)',
    flags=re.IGNORECASE | re.DOTALL,
)
JSON_LD_RE = re.compile(
    r'<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>(?P<json>.*?)</script>',
    flags=re.IGNORECASE | re.DOTALL,
)


def clean_text(fragment: str) -> str:
    # Exclude the commercial call-to-action from the measured article text.
    fragment = re.sub(
        r'<div\b[^>]*class=["\'][^"\']*\barticle-cta\b[^"\']*["\'][^>]*>.*?</div>',
        ' ',
        fragment,
        flags=re.IGNORECASE | re.DOTALL,
    )
    fragment = re.sub(
        r'<(?:script|style|noscript)\b[^>]*>.*?</(?:script|style|noscript)>',
        ' ',
        fragment,
        flags=re.IGNORECASE | re.DOTALL,
    )
    fragment = re.sub(r'<br\s*/?>', ' ', fragment, flags=re.IGNORECASE)
    fragment = re.sub(r'</(?:p|li|h[1-6]|div|tr|td|th|ol|ul|table|figure|figcaption)>', ' ', fragment, flags=re.IGNORECASE)
    fragment = re.sub(r'<[^>]+>', ' ', fragment)
    fragment = html.unescape(fragment)
    return re.sub(r'\s+', ' ', fragment).strip()


def extract_first(pattern: str, source: str) -> str | None:
    match = re.search(pattern, source, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        return None
    return clean_text(match.group(1))


def is_article_node(value: object) -> bool:
    if not isinstance(value, dict):
        return False
    node_type = value.get('@type')
    if isinstance(node_type, str):
        return node_type in {'Article', 'NewsArticle', 'BlogPosting'}
    if isinstance(node_type, list):
        return any(item in {'Article', 'NewsArticle', 'BlogPosting'} for item in node_type)
    return False


def find_article_node(value: object) -> dict | None:
    if is_article_node(value):
        return value  # type: ignore[return-value]
    if isinstance(value, dict):
        graph = value.get('@graph')
        if isinstance(graph, list):
            for item in graph:
                if is_article_node(item):
                    return item
    if isinstance(value, list):
        for item in value:
            if is_article_node(item):
                return item
    return None


def update_page(page: Path) -> tuple[bool, int]:
    source = page.read_text(encoding='utf-8')
    article_match = ARTICLE_BLOCK_RE.search(source)
    if not article_match:
        raise RuntimeError(f'{page.relative_to(ROOT)}: не найден <article class="article-copy">')

    opening = article_match.group('open')
    if not re.search(r'\bid=["\']article["\']', opening, flags=re.IGNORECASE):
        opening = opening[:-1] + ' id="article">'
        source = source[:article_match.start('open')] + opening + source[article_match.end('open'):]
        article_match = ARTICLE_BLOCK_RE.search(source)
        if not article_match:
            raise RuntimeError(f'{page.relative_to(ROOT)}: не удалось повторно найти блок статьи')

    article_text = clean_text(article_match.group('body'))
    if len(article_text) < 500:
        raise RuntimeError(
            f'{page.relative_to(ROOT)}: текст статьи слишком короткий для полной аналитики ({len(article_text)} символов)'
        )

    canonical_match = re.search(
        r'<link\b[^>]*rel=["\']canonical["\'][^>]*href=["\']([^"\']+)["\'][^>]*>',
        source,
        flags=re.IGNORECASE,
    )
    if not canonical_match:
        canonical_match = re.search(
            r'<link\b[^>]*href=["\']([^"\']+)["\'][^>]*rel=["\']canonical["\'][^>]*>',
            source,
            flags=re.IGNORECASE,
        )
    if not canonical_match:
        raise RuntimeError(f'{page.relative_to(ROOT)}: не найден canonical URL')

    canonical = canonical_match.group(1).strip()
    content_url = canonical + '#article'
    headline = extract_first(r'<h1\b[^>]*>(.*?)</h1>', source)
    if not headline:
        raise RuntimeError(f'{page.relative_to(ROOT)}: не найден заголовок h1')

    changed = False
    output = source
    for match in JSON_LD_RE.finditer(source):
        raw_json = html.unescape(match.group('json')).strip()
        try:
            data = json.loads(raw_json)
        except json.JSONDecodeError:
            continue
        node = find_article_node(data)
        if node is None:
            continue

        node['@id'] = content_url
        node['headline'] = headline
        node['url'] = content_url
        node['mainEntityOfPage'] = {'@type': 'WebPage', '@id': canonical}
        node['text'] = article_text
        node['articleBody'] = article_text
        node['wordCount'] = len(article_text.split())
        node['inLanguage'] = 'ru-RU'

        replacement = '<script type="application/ld+json">' + json.dumps(
            data,
            ensure_ascii=False,
            separators=(',', ':'),
        ) + '</script>'
        output = source[:match.start()] + replacement + source[match.end():]
        changed = output != source
        break
    else:
        raise RuntimeError(f'{page.relative_to(ROOT)}: не найден JSON-LD с типом Article')

    if changed:
        page.write_text(output, encoding='utf-8')
    return changed, len(article_text)


def main() -> None:
    pages = sorted(ARTICLES_ROOT.glob('*/index.html'))
    if not pages:
        raise SystemExit('Страницы статей не найдены')

    updated = 0
    for page in pages:
        changed, text_length = update_page(page)
        updated += int(changed)
        print(f'{page.relative_to(ROOT)}: {text_length} символов, JSON-LD готов')

    print(f'Контентная аналитика: обработано {len(pages)} статей, обновлено {updated}.')


if __name__ == '__main__':
    main()
