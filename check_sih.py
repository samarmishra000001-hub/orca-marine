import os
import re

p = 'frontend/sih_snapshot/assets/index-BYWwPH-2.js'
if os.path.exists(p):
    data = open(p, errors='ignore').read()
    print("Length:", len(data))
    # Look for button texts, headers, titles
    phrases = re.findall(r'>([^<]{4,50})<', data)
    print("Found HTML phrases in JS:")
    for phr in phrases[:40]:
        print("  -", phr)
