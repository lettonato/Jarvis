import sys, re, html
src = open(sys.argv[1], encoding="utf-8").read().split("\n")
def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"`(.+?)`", r"<code>\1</code>", t)
    return t
out, para, i = [], [], 0
def flush():
    global para
    if para: out.append("<p>" + inline(" ".join(para)) + "</p>"); para = []
while i < len(src):
    z = src[i]
    if z.startswith("# "): flush(); out.append(f"<h1>{inline(z[2:])}</h1>")
    elif z.startswith("## "): flush(); out.append(f"<h2>{inline(z[3:])}</h2>")
    elif z.startswith("|"):
        flush()
        rows = []
        while i < len(src) and src[i].startswith("|"):
            rows.append([c.strip() for c in src[i].strip().strip("|").split("|")]); i += 1
        i -= 1
        out.append('<table><thead><tr><th class="k">✓</th>' + "".join(f"<th>{inline(c)}</th>" for c in rows[0]) + "</tr></thead><tbody>")
        for r in rows[2:]:
            out.append('<tr><td class="k"><span class="box"></span></td>' + "".join(f"<td{' class=nr' if n == 0 else ''}>{inline(c)}</td>" for n, c in enumerate(r)) + "</tr>")
        out.append("</tbody></table>")
    elif not z.strip(): flush()
    else: para.append(z.strip())
    i += 1
flush()
css = """
@page { size: A4; margin: 16mm 14mm; }
body { font: 10.5pt/1.45 -apple-system, "Helvetica Neue", Arial, sans-serif; color: #1a1a1a; }
h1 { font-size: 20pt; margin: 0 0 6pt; }
h2 { font-size: 13pt; margin: 18pt 0 6pt; padding-bottom: 3pt; border-bottom: 1.5pt solid #1f4e79; color: #1f4e79; break-after: avoid; }
p { margin: 0 0 7pt; }
table { width: 100%; border-collapse: collapse; margin: 4pt 0 8pt; }
th { text-align: left; font-size: 9pt; color: #555; border-bottom: 1pt solid #999; padding: 4pt 6pt; }
td { vertical-align: top; padding: 6pt; border-bottom: 0.5pt solid #ccc; }
tr { break-inside: avoid; }
.k { width: 16pt; text-align: center; }
.nr { width: 24pt; font-weight: 600; white-space: nowrap; }
.box { display: inline-block; width: 11pt; height: 11pt; border: 1pt solid #333; border-radius: 2pt; margin-top: 1pt; }
code { font: 9.5pt Menlo, monospace; background: #f0f0f0; padding: 0 2pt; border-radius: 2pt; }
"""
print(f'<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Prüfliste für deinen Mac</title><style>{css}</style></head><body>' + "\n".join(out) + "</body></html>")
