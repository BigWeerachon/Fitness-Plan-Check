# สร้างหน้าเว็บ Privacy/Terms/References (HTML นิ่ง) จาก docs/legal/*.md ลงโฟลเดอร์ site/
# ใช้: npm run legal:export && pip install markdown && python3 scripts/build-legal-site.py
import markdown, html, os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC=os.path.join(ROOT,'docs','legal')
OUT=os.path.join(ROOT,'site')
os.makedirs(OUT,exist_ok=True)
md=lambda f: markdown.markdown(open(os.path.join(SRC,f),encoding='utf-8').read(),extensions=['sane_lists'])
CSS='''
:root{--bg:#fff;--fg:#1c1c1e;--mut:#6b6b70;--line:#e3e3e8;--acc:#b0307a}
@media(prefers-color-scheme:dark){:root{--bg:#121214;--fg:#ececf0;--mut:#9a9aa3;--line:#2a2a30;--acc:#ff7ac6}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:17px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans Thai","Sarabun",Roboto,sans-serif}
main{max-width:760px;margin:0 auto;padding:24px 16px 72px}
h1{font-size:1.9rem;line-height:1.25;margin:.2em 0 .1em}h2{font-size:1.25rem;margin:1.8em 0 .4em}
a{color:var(--acc)}em{color:var(--mut)}nav.lang{display:flex;gap:12px;margin:8px 0 20px;flex-wrap:wrap}
nav.lang a{padding:10px 16px;border:1px solid var(--line);border-radius:999px;text-decoration:none;min-height:44px;display:inline-flex;align-items:center}
section{padding-top:8px;border-top:1px solid var(--line);margin-top:36px}section:first-of-type{border-top:0;margin-top:0}
footer{margin-top:48px;color:var(--mut);font-size:.9rem}ul{padding-left:1.2em}
'''
def page(title,body,desc):
    return f'<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(title)}</title><meta name="description" content="{html.escape(desc)}"><style>{CSS}</style></head><body><main>{body}</main></body></html>'
def bilingual(name,title,desc):
    th=md(f'{name}.th.md'); en=md(f'{name}.en.md')
    body=f'<nav class="lang"><a href="#th">ไทย</a><a href="#en">English</a><a href="/">Fitnese</a></nav><section id="th" lang="th">{th}</section><section id="en" lang="en">{en}</section><footer>Fitnese · Weerachon Kammoon · weerachon.work@gmail.com</footer>'
    open(os.path.join(OUT,f'{name}.html'),'w',encoding='utf-8').write(page(title,body,desc))
bilingual('privacy','Fitnese — นโยบายความเป็นส่วนตัว / Privacy Policy','Fitnese Privacy Policy (Thai and English)')
bilingual('terms','Fitnese — ข้อกำหนดการใช้งาน / Terms of Use','Fitnese Terms of Use (Thai and English)')
ref=md('references.md')
open(os.path.join(OUT,'references.html'),'w',encoding='utf-8').write(page('Fitnese — แหล่งอ้างอิง / References',f'<nav class="lang"><a href="/">Fitnese</a></nav>{ref}','Sources for the formulas used in Fitnese'))
idx='<h1>Fitnese</h1><p>แอปวางแผนและบันทึกการฝึกด้วยน้ำหนัก ทำงานออฟไลน์ ข้อมูลอยู่ในเครื่องของคุณ<br>A weight-training planner and logger that works offline. Your data stays on your device.</p><nav class="lang"><a href="/privacy">นโยบายความเป็นส่วนตัว / Privacy Policy</a><a href="/terms">ข้อกำหนดการใช้งาน / Terms of Use</a><a href="/references">แหล่งอ้างอิง / References</a></nav><footer>Contact: weerachon.work@gmail.com</footer>'
open(os.path.join(OUT,'index.html'),'w',encoding='utf-8').write(page('Fitnese',idx,'Fitnese weight-training app'))
open(os.path.join(OUT,'vercel.json'),'w').write('{"cleanUrls":true,"trailingSlash":false}')
