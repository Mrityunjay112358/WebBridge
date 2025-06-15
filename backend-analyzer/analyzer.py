# analyzer.py — WebBridge Analyzer Module (Flask Integration)
# ----------------------------------------------------------
# Uses BeautifulSoup and regex to detect accessibility issues server-side.
# Exposes POST /analyze to accept JSON:
#     {
#       "html": "<html>...</html>",
#       "commonWords": ["the","and","to",...]
#     }
# Returns JSON mapping each check to a list of element HTML snippets.
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from bs4 import BeautifulSoup
import re
import math
import json

app = Flask(__name__)
CORS(app)

# --- Helpers and Configuration -----------------------------------------------

def load_common_words(path='common_words_1000.txt'):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return [w.strip() for w in f if w.strip()]
    except FileNotFoundError:
        return [
            'the','and','a','in','to','have','it','I','that','for','you','he',
            'with','on','do','say','this','they','at','but','we','his','from',
            'not','by','she','or','as','what','go','their','can','who','get',
            'if','would','her','all','my','make','about','know','will','up',
            'one','time','there','year','so','think','when','which','them','some',
            'me','people','take','out','into','just','see','him','your','come',
            'could','now','than','like','other','how','then','its','our','two',
            'more','these','want','way','look','first','also','new','because',
            'day','use','no','man','find','here','thing','give'
        ]

COMMON_WORDS = set(load_common_words())

BANNED_TERMS_LIST = [
    'crazy','lame','insane','dumb','retarded','handicapped','crippled','invalid',
    'deaf and dumb','moron','idiot','imbecile','lunatic','nuts','buggy','spastic',
    'gimp','palsy','deformed','handicapable','special needs','the disabled',
    'hearing impaired','vision impaired','epileptic','autistic','cripple'
]
BANNED_PATTERN = re.compile(r"\b(" + "|".join(map(re.escape, BANNED_TERMS_LIST)) + r")\b", re.I)

# Contrast helpers
def hex_to_rgb(hex_str):
    h = hex_str.lstrip('#')
    lv = len(h)
    return tuple(int(h[i:i+lv//3], 16) for i in range(0, lv, lv//3))

def luminance(rgb):
    def adjust(c):
        c = c/255.0
        return c/12.92 if c <= 0.03928 else ((c+0.055)/1.055) ** 2.4
    r, g, b = rgb
    return 0.2126*adjust(r) + 0.7152*adjust(g) + 0.0722*adjust(b)

def contrast_ratio(fg_hex, bg_hex):
    try:
        L1 = luminance(hex_to_rgb(fg_hex))
        L2 = luminance(hex_to_rgb(bg_hex))
        return (max(L1, L2) + 0.05) / (min(L1, L2) + 0.05)
    except:
        return None

def contrast_ratio_any(fg, bg):
    try:
        L1 = luminance(fg)
        L2 = luminance(bg)
        return (max(L1, L2) + 0.05) / (min(L1, L2) + 0.05)
    except:
        return None

# Syllable helper
def count_syllables(word):
    return len(re.findall(r'[aeiouy]{1,2}', word.lower()))

def parse_color(val):
    # Accepts #hex, rgb(), rgba()
    val = val.strip()
    if val.startswith('#'):
        h = val.lstrip('#')
        lv = len(h)
        return tuple(int(h[i:i+lv//3], 16) for i in range(0, lv, lv//3))
    m = re.match(r'rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)', val)
    if m:
        return tuple(int(m.group(i)) for i in range(1, 4))
    m = re.match(r'rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d\.]+)\s*\)', val)
    if m:
        return tuple(int(m.group(i)) for i in range(1, 4))
    return None

def css_path(el):
    path = []
    while el and el.name:
        selector = el.name
        if el.get('id'):
            selector += f"#{el['id']}"
        elif el.get('class'):
            selector += ''.join(f".{c}" for c in el['class'])
        else:
            nth = 1
            sib = el
            while (sib := sib.previous_sibling) is not None:
                if getattr(sib, 'name', None) == el.name:
                    nth += 1
            selector += f":nth-of-type({nth})"
        path.insert(0, selector)
        el = el.parent
    return ' > '.join(path)

# --- Check Functions ---------------------------------------------------------

def check_missing_alt(soup):
    return [css_path(img) for img in soup.find_all('img')
            if not img.get('alt') or not img['alt'].strip()]


def check_low_contrast(soup):
    issues = []
    for el in soup.select('p, span, a, h1, h2, h3, nav, button'):
        style = el.get('style', '')
        fg = re.search(r'color:\s*([^;]+)', style)
        bg = re.search(r'background-color:\s*([^;]+)', style)
        fg_rgb = parse_color(fg.group(1)) if fg else None
        bg_rgb = parse_color(bg.group(1)) if bg else None
        # If not found, try to infer defaults
        if not fg_rgb:
            if el.name == 'a':
                fg_rgb = parse_color('#0000ee')  # default link blue
            else:
                fg_rgb = parse_color('#000')     # default text black
        if not bg_rgb:
            # Try to get from body or html
            body = soup.find('body')
            html = soup.find('html')
            bg_style = (body.get('style', '') if body else '') + (html.get('style', '') if html else '')
            bg_match = re.search(r'background-color:\s*([^;]+)', bg_style)
            bg_rgb = parse_color(bg_match.group(1)) if bg_match else parse_color('#fff')  # default white
        # Heuristic: if element is in nav or has class with 'nav', assume light bg
        if not bg and (el.name == 'nav' or 'nav' in (el.get('class') or [])):
            bg_rgb = parse_color('#fff')
        if fg_rgb and bg_rgb:
            ratio = contrast_ratio_any(fg_rgb, bg_rgb)
            if ratio and ratio < 4.5:
                issues.append(css_path(el))
        else:
            issues.append(f"Warning: Could not determine colors for element: {css_path(el)}")
    return issues


def check_missing_label(soup):
    issues = []
    for el in soup.select('input, textarea, select'):
        has_label = False
        if el.get('id') and soup.find('label', {'for': el['id']}): has_label = True
        if el.find_parent('label'): has_label = True
        if el.get('aria-label'): has_label = True
        if not has_label: issues.append(css_path(el))
    return issues


def check_gunning_fog(soup):
    issues = []
    for p in soup.find_all('p'):
        text = p.get_text()
        sentences = [s for s in re.split(r'[\.\?!]', text) if s.strip()]
        words = re.findall(r'\b\w+\b', text)
        if not sentences or not words: continue
        complex_count = sum(1 for w in words if count_syllables(w) >= 3)
        fog = 0.4 * ((len(words)/len(sentences)) + (100*complex_count/len(words)))
        if fog > 12: issues.append(css_path(p))
    return issues


def check_jargon_ratio(soup):
    issues = []
    for p in soup.find_all('p'):
        words = re.findall(r'\b\w+\b', p.get_text().lower())
        if not words: continue
        uncommon = sum(1 for w in words if w not in COMMON_WORDS)
        if uncommon / len(words) > 0.2: issues.append(css_path(p))
    return issues


def check_inclusive_language(soup):
    issues = []
    for node in soup.find_all(text=BANNED_PATTERN): issues.append(css_path(node.parent))
    return list(dict.fromkeys(issues))


def check_small_touch_targets(soup):
    issues = []
    for el in soup.select('button, a, input, textarea, select'):
        style = el.get('style', '')
        w = re.search(r'width:\s*(\d+)px', style)
        h = re.search(r'height:\s*(\d+)px', style)
        width = int(w.group(1)) if w else None
        height = int(h.group(1)) if h else None
        # Try attributes if style not found
        if width is None and el.has_attr('width'):
            try: width = int(el['width'])
            except: pass
        if height is None and el.has_attr('height'):
            try: height = int(el['height'])
            except: pass
        # If still not found, estimate by text length for <a> and <button>
        if width is None or height is None:
            text = el.get_text(strip=True)
            # More aggressive: flag as too small if text is short or in nav/toolbar
            parent_nav = el.find_parent(['nav', 'header', 'toolbar'])
            if (el.name in ['a', 'button'] and len(text) <= 4) or parent_nav:
                issues.append(f"Likely too small: {css_path(el)} (short text or in nav/toolbar, no size info)")
            elif width is None or height is None:
                issues.append(f"Warning: Could not determine size for element: {css_path(el)}")
        elif width < 44 or height < 44:
            issues.append(css_path(el))
    return issues


def check_passive_voice(soup):
    issues = []
    pattern = re.compile(r'\b(am|is|was|were|be|been|being)\s+\w+ed\b', re.I)
    for el in soup.find_all(['p', 'li']):
        if pattern.search(el.get_text()): issues.append(css_path(el))
    return issues

# --- Flask Routes ------------------------------------------------------------


@app.route('/', methods=['GET'])
def root():
    # Serve x.html with analysis injection
    try:
        return render_template('x.html')
    except FileNotFoundError:
        return "x.html not found", 404

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.get_json() or {}
    html = data.get('html', '')
    custom_common = data.get('commonWords')
    if custom_common:
        global COMMON_WORDS
        COMMON_WORDS = set(w.lower() for w in custom_common)

    soup = BeautifulSoup(html, 'html.parser')
    report = {
        'missingAlt':        check_missing_alt(soup),
        'lowContrast':       check_low_contrast(soup),
        'missingLabel':      check_missing_label(soup),
        'gunningFog':        check_gunning_fog(soup),
        'jargonRatio':       check_jargon_ratio(soup),
        'inclusiveLanguage': check_inclusive_language(soup),
        'smallTouchTargets': check_small_touch_targets(soup),
        'passiveVoice':      check_passive_voice(soup)
    }
    # Save report to JSON file
    with open('accessibility_report.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    return jsonify(report)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
