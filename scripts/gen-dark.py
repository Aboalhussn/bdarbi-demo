"""Generate src/dark.css from src/styles.css.

Every colour in styles.css gets a dark twin picked by what it paints:
fills (background), text (color) or lines (border). Photos, the flag,
maps and QR codes are never touched. Run: python3 scripts/gen-dark.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'src' / 'styles.css'
OUT = ROOT / 'src' / 'dark.css'

PAGE, CARD, FIELD, LINE, MISTLINE = '#0F0D1E', '#17142B', '#201C3B', '#2C2850', '#3A3566'
HERO, PRIMARY, ACCENT = '#1B1653', '#7B6CF6', '#A79BFF'
TEXT, MUTED, FAINT = '#EEEDF7', '#A29EC0', '#7E7A9E'
OK, OK_BG, OK_LINE = '#5AD49F', '#123526', '#1F5A3D'
BAD, BAD_BG, BAD_LINE = '#FF8A9A', '#3A1622', '#5A2433'
WARN, WARN_BG, WARN_LINE = '#F5C761', '#3A2C0E', '#5A4416'

VARS = {
    'navy': '#0B0558', 'navy-2': '#1C1488', 'white': '#FFFFFF', 'ink': '#15122E', 'slate': '#5D5A73',
    'mist': '#B9B5D3', 'lavender': '#8A84B3', 'surface': '#F3F2F7', 'line': '#ECEBF3',
    'success': '#1C6B3E', 'success-bg': '#E6F4EC', 'alert': '#9E2F41', 'alert-bg': '#FBE3E7',
}

BG = {
    '#FFFFFF': CARD, '#F7F6FA': PAGE, '#FAFAFD': '#1B1833', '#F6F5FA': '#1B1833', '#F3F2F7': FIELD,
    '#F3F2FB': FIELD, '#EEEDF8': FIELD, '#EEEDF4': FIELD, '#E9E8F2': FIELD, '#E4E1F5': '#262144',
    '#ECEBF3': LINE, '#E4E2EE': LINE, '#D9D6E6': MISTLINE, '#DCDAE6': '#2E2A4A', '#C9C3E3': MISTLINE, '#B9B5D3': MISTLINE,
    '#8A84B3': '#3A3470', '#0B0558': HERO, '#1C1488': '#2A2470', '#2A1FA0': '#3A3290', '#06033A': '#0A0816',
    '#FDF1D6': WARN_BG, '#FFF8E8': WARN_BG, '#FFF8E6': WARN_BG, '#FFF3D6': WARN_BG, '#FFF4D6': WARN_BG,
    '#E6F4EC': OK_BG, '#F3FBF6': OK_BG, '#F2FBF5': OK_BG,
    '#FBE3E7': BAD_BG, '#F7D9DE': BAD_BG, '#FBEFF1': BAD_BG, '#F3E3E6': BAD_BG, '#F2D3D8': BAD_BG, '#F1CDD4': BAD_BG,
    '#1C6B3E': '#2FA36B', '#9E2F41': '#C8364B',
}
FG = {
    '#0B0558': ACCENT, '#1C1488': ACCENT, '#2A1FA0': ACCENT, '#15122E': TEXT, '#5D5A73': MUTED, '#8F8CA3': FAINT,
    '#B0ADC2': FAINT, '#B9B5D3': FAINT, '#8A84B3': '#8F86C9', '#3A3755': '#CFCBE6',
    '#1C6B3E': OK, '#1F8A4C': OK, '#2FB36B': OK, '#9E2F41': BAD, '#C8364B': BAD, '#B23A4C': BAD, '#8C2A3C': BAD,
    '#7A5200': WARN, '#7A5300': WARN,
}
LN = {
    '#FFFFFF': CARD, '#F7F6FA': PAGE, '#ECEBF3': LINE, '#E4E2EE': LINE, '#EEEDF8': LINE, '#EEEDF4': LINE,
    '#E9E8F2': LINE, '#DCDAE6': MISTLINE, '#C9C3E3': MISTLINE, '#B9B5D3': MISTLINE, '#E4E1F5': LINE,
    '#F3F2F7': LINE, '#0B0558': ACCENT, '#1C1488': ACCENT, '#8A84B3': '#5C5590',
    '#9BD1B1': OK_LINE, '#1C6B3E': OK, '#E9B3BD': BAD_LINE, '#9E2F41': BAD, '#C8364B': BAD,
    '#F3DFA6': WARN_LINE, '#F8D27A': WARN_LINE,
}
# a navy fill on these is a button or a chosen state, not a header
PRIMARY_HINT = re.compile(r'btn|fab|\.on\b|active|sel|chosen|picked|mine|send|seg|toggle|check|dot|badge|switch|map-pin|step|bar\b|fill', re.I)
# white that must stay white: switch knobs, QR tiles, pin rings
KEEP_WHITE = re.compile(r'\.switch i|\.qr|map-pin|knob')
# white fills that are the page itself
PAGE_SEL = re.compile(r'^\.(app|screen|state-screen)$')

HEX = re.compile(r'#[0-9A-Fa-f]{3}(?:[0-9A-Fa-f]{3})?\b|\bwhite\b')
VAR = re.compile(r'var\(--([a-z0-9-]+)\)')


def norm(h):
    h = h.upper()
    if h in ('WHITE', '#FFF'):
        return '#FFFFFF'
    if len(h) == 4:
        h = '#' + ''.join(c * 2 for c in h[1:])
    return h


def kind(prop):
    if prop in ('color', 'caret-color', 'fill', 'stroke', 'text-decoration-color', '-webkit-text-fill-color'):
        return 'fg'
    if prop.startswith('border') or prop.startswith('outline'):
        return 'ln'
    if prop.startswith('background') or prop == 'box-shadow':
        return 'bg'
    return None


def convert(value, k, sel):
    def swap(h):
        h = norm(h)
        if k == 'bg':
            if h == '#0B0558' and PRIMARY_HINT.search(sel):
                return PRIMARY
            if h == '#FFFFFF' and KEEP_WHITE.search(sel):
                return None
            if h == '#FFFFFF' and PAGE_SEL.match(sel.strip()):
                return PAGE
            return BG.get(h)
        if k == 'fg':
            return FG.get(h)
        return LN.get(h)

    changed = False

    def rep_var(m):
        nonlocal changed
        name = m.group(1)
        if name not in VARS:
            return m.group(0)
        new = swap(VARS[name])
        if new:
            changed = True
            return new
        return m.group(0)

    def rep_hex(m):
        nonlocal changed
        new = swap(m.group(0))
        if new:
            changed = True
            return new
        return m.group(0)

    if k == 'bg' and 'gradient' in value and 'rgba(255' in value:
        return None  # soft white sheens over a hero stay
    v = VAR.sub(rep_var, value)
    v = HEX.sub(rep_hex, v)
    return v if changed else None


def main():
    css = SRC.read_text()
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    css = re.sub(r'@import[^;]*;', '', css)
    css = re.sub(r'@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}', '', css)
    css = re.sub(r'@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}', '', css)
    out = []
    for sel, body in re.findall(r'([^{}]+)\{([^{}]*)\}', css):
        sel = ' '.join(sel.split())
        if sel.startswith(':root') or sel.startswith('html.dark'):
            continue
        parts = [s.strip() for s in sel.split(',')]
        decls = []
        for d in body.split(';'):
            if ':' not in d:
                continue
            prop, val = d.split(':', 1)
            prop, val = prop.strip(), val.strip()
            k = kind(prop)
            if not k:
                continue
            # judge each selector separately when they disagree (e.g. ".btn, .hero")
            per = {p: convert(val, k, p) for p in parts}
            for p, nv in per.items():
                if nv:
                    decls.append((p, f'{prop}: {nv}'))
        groups = {}
        for p, d in decls:
            groups.setdefault(p, []).append(d)
        for p, ds in groups.items():
            # :where() keeps the original specificity, so later light rules
            # (.btn.ghost after .btn) still win exactly as they do in light mode
            scoped = ':where(html.dark)' + p[len('html'):] if p.startswith('html') else ':where(html.dark) ' + p
            out.append(f'{scoped} {{ {"; ".join(ds)}; }}')
    head = '/* Generated by scripts/gen-dark.py from styles.css. Edit the palette there, then re-run. */\n'
    OUT.write_text(head + '\n'.join(out) + '\n')
    print(len(out), 'rules')


if __name__ == '__main__':
    main()
