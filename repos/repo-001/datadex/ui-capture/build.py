"""Static build of the Datadex web UI into .ui-capture/out.

The site (web/) is plain static HTML with no build step; the only thing it loads
from outside is the JetBrains Mono stylesheet from Google Fonts. This script
copies web/ verbatim and, in the *output copy only*, points that stylesheet at a
local copy of the same font (from @fontsource/jetbrains-mono, fetched with npm
into .ui-capture/vendor) so the page renders identically with no network.

Run: python .ui-capture/build.py   (after `npm pack` in .ui-capture/vendor, see notes)
"""

import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
SRC = REPO / "web"
OUT = HERE / "out"
FONT_FILES = HERE / "vendor" / "fontsource" / "package" / "files"

GOOGLE_LINKS = [
    '<link rel="preconnect" href="https://fonts.googleapis.com" />',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
]
GOOGLE_CSS = (
    "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap"
)


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    shutil.copytree(SRC, OUT)

    fonts = OUT / "fonts"
    fonts.mkdir()
    css = []
    for weight in (400, 600, 700):
        name = f"jetbrains-mono-latin-{weight}-normal"
        for ext in ("woff2", "woff"):
            shutil.copy(FONT_FILES / f"{name}.{ext}", fonts / f"{name}.{ext}")
        css.append(
            "@font-face {\n"
            "  font-family: 'JetBrains Mono';\n"
            "  font-style: normal;\n"
            f"  font-weight: {weight};\n"
            "  font-display: swap;\n"
            f"  src: url(/fonts/{name}.woff2) format('woff2'), url(/fonts/{name}.woff) format('woff');\n"
            "}\n"
        )
    (fonts / "jetbrains-mono.css").write_text("".join(css))

    index = OUT / "index.html"
    html = index.read_text()
    assert GOOGLE_CSS in html, "Google Fonts link not found in web/index.html"
    html = html.replace(GOOGLE_CSS, "/fonts/jetbrains-mono.css")
    for link in GOOGLE_LINKS:
        html = html.replace(link, "")
    index.write_text(html)
    print(f"built {OUT}")


if __name__ == "__main__":
    main()
