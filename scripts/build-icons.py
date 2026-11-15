"""Buduje podzbior fontu Bootstrap Icons z ikon uzywanych w serwisie.

Wymaga: pip install fonttools brotli. Uruchomienie: npm run icons
Skrypt szuka klas bi-* w src/, public/locales/, index.html i embed/.
Ikony wpisywane tylko w bazie danych dopisz do EXTRA.
"""
import json
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = ROOT / "node_modules/bootstrap-icons/font"
EXTRA = []

HEADER = """/* Podzbior Bootstrap Icons (MIT): tylko ikony uzywane w serwisie.
   Plik generowany przez scripts/build-icons.py (npm run icons). */
@font-face {
  font-display: block;
  font-family: "msk-icons";
  src: url("/fonts/msk-icons.woff2") format("woff2");
}

.bi::before,
[class^="bi-"]::before,
[class*=" bi-"]::before {
  display: inline-block;
  font-family: "msk-icons" !important;
  font-style: normal;
  font-weight: normal !important;
  font-variant: normal;
  text-transform: none;
  line-height: 1;
  vertical-align: -0.125em;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

"""


def used_icons():
    names = set(EXTRA)
    files = [ROOT / "index.html", *ROOT.glob("embed/*.html"), *ROOT.glob("public/locales/*.json")]
    files += [p for p in (ROOT / "src").rglob("*") if p.suffix in {".js", ".jsx"}]
    for path in files:
        names.update(re.findall(r"\bbi-([a-z0-9-]+)", path.read_text(encoding="utf8")))
    return sorted(names)


def main():
    codepoints = json.loads((SOURCE / "bootstrap-icons.json").read_text())
    icons = [name for name in used_icons() if name in codepoints]
    subprocess.run(
        [
            "pyftsubset",
            str(SOURCE / "fonts/bootstrap-icons.woff2"),
            "--unicodes=" + ",".join(f"U+{codepoints[name]:X}" for name in icons),
            "--flavor=woff2",
            "--no-layout-closure",
            f"--output-file={ROOT / 'public/fonts/msk-icons.woff2'}",
        ],
        check=True,
    )
    rules = "".join(f'.bi-{name}::before {{\n  content: "\\{codepoints[name]:x}";\n}}\n' for name in icons)
    (ROOT / "src/style/icons.css").write_text(HEADER + rules, encoding="utf8")
    print(f"Ikony: {len(icons)}")


if __name__ == "__main__":
    main()
