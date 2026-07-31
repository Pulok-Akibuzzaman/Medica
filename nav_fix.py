from pathlib import Path
import re
root = Path('c:/Users/zionb/Downloads/CSE479/Project_Medica/Medica/public')
pattern = re.compile(
    r"<li><a href=\"diseases\.html\".*?</li>\s*<li class=\"nav-dropdown\">.*?</li>\s*<li><a href=\"investigations\.html\".*?</li>",
    re.S,
)
replacement = (
    '        <li class="nav-dropdown"><a onclick="this.parentElement.classList.toggle(\'open\')">More &#9662;</a>\n'
    '          <div class="nav-dropdown-menu">\n'
    '            <a href="diseases.html">Diseases</a>\n'
    '            <a href="guidelines.html">Guidelines</a>\n'
    '            <a href="investigations.html">Investigations</a>\n'
    '          </div>\n'
    '        </li>'
)
count = 0
for path in sorted(root.glob('*.html')):
    text = path.read_text(encoding='utf-8')
    if 'More &#9662;' in text or 'More ▾' in text:
        continue
    new_text = re.sub(pattern, replacement, text)
    if new_text != text:
        path.write_text(new_text, encoding='utf-8')
        count += 1
        print(f'Updated {path.name}')
print(f'Total replacements: {count}')
