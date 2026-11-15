#!/usr/bin/env python3
"""Validate local image references, generated dimensions, hashes and transparency."""
import hashlib
import json
import re
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'docs/image-assets.json').read_text())
class References(HTMLParser):
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        urls = []
        if tag in ('img', 'script', 'link'):
            for key in ('src', 'href'):
                if attrs.get(key): urls.append(attrs[key])
            urls += [x.strip().split()[0] for x in attrs.get('srcset', '').split(',') if x.strip()]
        for url in urls:
            if urlsplit(url).scheme or url.startswith('//') or url.startswith('#'): continue
            path = ROOT / unquote(urlsplit(url).path).lstrip('/')
            assert path.exists(), f'{self.page}: missing {url}'
        if tag == 'img' and 'images/optimized/' in attrs.get('src', ''):
            assert attrs.get('alt') and attrs.get('sizes') and attrs.get('srcset')
for page in ROOT.glob('*.html'):
    parser = References(); parser.page = page.name; parser.feed(page.read_text())
for src, entry in manifest.items():
    with Image.open(ROOT / src) as source:
        for variant in entry['variants']:
            path = ROOT / variant['url']
            assert hashlib.sha256(path.read_bytes()).hexdigest()[:12] in path.name
            with Image.open(path) as image:
                assert image.size == (variant['width'], variant['height'])
                assert image.width <= source.width
                if 'A' in source.getbands() and source.getchannel('A').getextrema()[0] < 255:
                    assert 'A' in image.getbands(), path
print('PASS: all HTML asset references, responsive attributes, hashes, dimensions and alpha channels')
for page in ['team.html', 'services.html', 'about.html', 'appointment.html', 'index.html']:
    text = (ROOT / page).read_text()
    used = set(re.findall(r'<img\b[^>]*src="([^"]+)"',text))
    before = sum(entry['source_bytes'] for entry in manifest.values() if any(v['url'] in used for v in entry['variants']))
    after = sum((ROOT/u).stat().st_size for u in used if u.startswith('images/optimized/'))
    print(page, 'distinct default img src bytes', before, '->', after)
