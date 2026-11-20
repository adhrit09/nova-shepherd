#!/bin/bash
set -e
cd "$(dirname "$0")"
rm -rf dist && mkdir -p dist/fonts
cp style.css dist/ && cp fonts/fredoka-latin.woff2 fonts/OFL.txt dist/fonts/
python3 - <<'PY'
import re
g=open('js/game.js').read()
g=re.sub(r'  // @debug-start.*?  // @debug-end\n', '', g, flags=re.S)
open('/tmp/nova-bundle.js','w').write('\n'.join(open('js/'+f).read() for f in ['audio.js','sdk.js','data.js'])+'\n'+g)
h=open('index.html').read()
h=re.sub(r'<script src="js/audio.js"></script>.*?<script src="js/game.js"></script>', '<script src="game.min.js"></script>', h, flags=re.S)
open('dist/index.html','w').write(h)
PY
terser /tmp/nova-bundle.js -c passes=2 -m -o dist/game.min.js
grep -q __nova dist/game.min.js && { echo "debug hook leaked"; exit 1; } || true
(cd dist && rm -f ../nova-shepherd.zip && zip -qr ../nova-shepherd.zip .)
du -sh dist nova-shepherd.zip; find dist -type f | wc -l
