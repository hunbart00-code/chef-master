#!/usr/bin/env python3
"""배포 전 실행: 모든 JS·CSS 주소에 ?v=버전 을 붙여 폰·크롬북이 옛날 파일을 쓰지 않게 함.

사용법 (저장소 맨 위 폴더에서):  python3 tools/stamp.py
"""
import pathlib
import re
import time

root = pathlib.Path(__file__).resolve().parent.parent
v = time.strftime('%Y%m%d%H%M%S')

# js 안의 import: from './x.js' / from './x.js?v=…'
imp = re.compile(r"""(from\s+['"]\./[\w.-]+\.js)(\?v=\d+)?(['"])""")
for f in sorted((root / 'js').glob('*.js')):
    s = f.read_text(encoding='utf-8')
    t = imp.sub(lambda m: f"{m.group(1)}?v={v}{m.group(3)}", s)
    if t != s:
        f.write_text(t, encoding='utf-8')

# index.html 의 css·js 주소
html = root / 'index.html'
s = html.read_text(encoding='utf-8')
s = re.sub(r'((?:href|src)="(?:css|js)/[\w.-]+\.(?:css|js))(\?v=\d+)?(")', lambda m: f'{m.group(1)}?v={v}{m.group(3)}', s)
html.write_text(s, encoding='utf-8')
print('version', v)
