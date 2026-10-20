"""One-time helper: download the site fonts (Anton, Inter, JetBrains Mono; SIL Open Font License)
from Google Fonts into fonts/ so the site serves them itself (faster, no layout shift).
Usage: python tools/fetch_fonts.py"""
import os, re, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "fonts")
os.makedirs(OUT, exist_ok=True)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
FAMILIES = {
    "anton": "https://fonts.googleapis.com/css2?family=Anton&display=swap",
    "inter": "https://fonts.googleapis.com/css2?family=Inter:wght@400..800&display=swap",
    "jetbrains-mono": "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500..600&display=swap",
}
for name, url in FAMILIES.items():
    css = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA})).read().decode()
    blocks = re.findall(r"/\* (\S+) \*/\s*@font-face \{(.*?)\}", css, re.S)
    for subset, body in blocks:
        if subset != "latin":
            continue
        src = re.search(r"url\((https://[^)]+\.woff2)\)", body).group(1)
        data = urllib.request.urlopen(urllib.request.Request(src, headers={"User-Agent": UA})).read()
        open(os.path.join(OUT, f"{name}-latin.woff2"), "wb").write(data)
        print(name, len(data) // 1024, "KB")
