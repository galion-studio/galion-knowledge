import re, html
SRC='/workspace/horbm/horbm-layers-diagram.html'
OUT='/workspace/horbm/horbm-layers-twoway.html'
s=open(SRC).read()
css=re.search(r'<style>(.*?)</style>',s,re.S).group(1)
lines=s.split('\n')
bands='\n'.join(lines[110:315])  # lines 111..315
assert bands.strip().startswith('<div class="bands">') and bands.strip().endswith('</div>')
E=html.escape

# ---------------- path data ----------------
# part: (text, refs, status)  status: B built, A accepted, R recommended, C conditional
DOWN=[
 dict(n='1',t='Voice and senses',k='main',parts=[
   ('Ear: VAD on each 80 ms frame, Vosk streaming speech recognition','(6)','B'),
   ('Feeling read from the voice every 80 ms','(7)','A'),
   ('Conductor handles turn-taking and barge-in','(8)','A'),
   ('Stable partial words start the lookup while you still talk','(6)(36)','R')]),
 dict(n='2',t='Persona and inner life',k='skip',note='Passed, not a step. The persona card is loaded at boot (15). Its rules act at layer 4 and on the way up (18).'),
 dict(n='3',t='Empathy',k='main',parts=[
   ('Mood point: arousal, valence, dominance, every 80 ms','(23)','A'),
   ('Query rewrite: "him" becomes the name, before lookup','(22)','R'),
   ('Intent: chat, ask, task, vent or goodbye','(24)','R'),
   ('Open wants list: open, met, dropped','(25)','R')]),
 dict(n='5',t='Core chat engine: router',k='main',parts=[
   ('HORBM answers first; S0 fills gaps as marked guesses; Galion Research takes deep questions, 3 s cap. Router not built yet','(35)','A')]),
 dict(n='7',t='Memory and relationship',k='main',tagline='one query with layer 8',parts=[
   ('Lane A: one query over memory and cards, at most 4 hits, under 10 ms','(36)','B'),
   ('Working memory: the last 32 turns of this call','(52)','B'),
   ('Ranked by relevance, recency and importance, pins boosted','(55)','B')]),
 dict(n='8',t='Knowledge and truth',k='main',tagline='same query as layer 7',parts=[
   ('Cards: the core pack plus at most 3 shards','(40)(62)','B'),
   ('No card means "I don\'t know"; the miss joins the gap queue','(65)','B')]),
 dict(n='4',t='Dialogue manager and policy',k='rec',parts=[
   ('State tracker holds this call','(28)','B'),
   ('Legal-move filter: persona and truth gate drop bad moves, e.g. a cite with no evidence','(30)','R'),
   ('Policy picks one move: answer, cite, abstain, ask_one, comfort, offer_topic, stop','(29)(31)','R'),
   ('Topic manager: at most one new topic, at a lull','(32)','R')]),
 dict(n='6',t='Skills',k='cond',tagline='only if the move needs a lookup or an action',parts=[
   ('Galion Research on the 3 s side band','(46)','B'),
   ('Eureka Moment Pipelines chain retrieved claims there','(44)','A'),
   ('Tools run in agentic sandboxes, off the 80 ms clock','(47)','A')]),
 dict(n='9',t='Safety and ethics',k='skip',note='Not on the way down. It checks the reply on the way up.'),
 dict(n='10',t='Evals and metrics',k='skip',note='Off the hot path. Nothing is logged during the turn (R4); scoring comes after.'),
 dict(n='11',t='Machines and infrastructure',k='main',parts=[
   ('Core map: lookup on core 0, ASR on 1, reasoning on 2 to 5','(82)','A'),
   ('CPU-only mode calls no API model','(83)','A'),
   ('Titan, only if layer 6 ran: the Galion Research gateway','(84)','C')]),
]
UP=[  # in time order, bottom to top
 dict(n='11',t='Machines and infrastructure',k='main',parts=[
   ('Reasoning cores 2 to 5 hand back the candidates; voices sit on cores 6 and 7','(82)','A')]),
 dict(n='6',t='Skills',k='cond',tagline='only if layer 6 ran on the way down',parts=[
   ('Galion Research answer arrives as a later clause, within 3 s','(46)','B'),
   ('Eureka result is spoken only after the checks pass','(44)','A')]),
 dict(n='8',t='Knowledge and truth',k='skip',note='Not passed again: card facts already sit in the candidates. The truth gate (63) checks cards at publication, not per turn.'),
 dict(n='5',t='Core chat engine: ranker and reply builder',k='rec',parts=[
   ('Ranker: boosted tree on stored and truth features','(41)','R'),
   ('Reply builder: slot filling, "On {date}, {who} said {span}"','(42)','R'),
   ('S0 lines stay marked as guesses','(43)','A')]),
 dict(n='9',t='Safety and ethics',k='main',parts=[
   ('Every world claim: cited with source, date and who, said as a guess, or not said','(70)','A'),
   ('Harm limits','(71)','R'),
   ('Says it is an AI when asked','(72)','R')]),
 dict(n='2',t='Persona and inner life',k='rec',parts=[
   ('Persona filter in front of every reply','(18)','R'),
   ('Character: warm, curious, honest, dry humour','(17)','R')]),
 dict(n='3',t='Empathy',k='main',parts=[
   ('Empathy is a weight: it changes how it sounds, no scripted lines','(26)','A'),
   ('Names a feeling only when invited','(27)','R')]),
 dict(n='1',t='Voice and senses',k='main',parts=[
   ('Intent message to the mouth','(20)','A'),
   ('Mouth MnE V2; interim voice is our custom Piper on CPU','(10)(11)','A'),
   ('Conductor: you can cut in, silence within 200 ms','(8)','A')]),
]
AFTER=[  # after it speaks, off the hot path
 ('4','State tracker adds the turn to the 32-turn ring','(28)','B'),
 ('7','Memory write: stated facts and pins; a contradiction becomes a revision; credentials never kept','(53)(54)(73)','A'),
 ('7','Moment records: outcome written back as counts and weights','(39)','R'),
 ('10','Evals score after the call: quality turns, truth rate, good endings','(77)(78)(79)','R'),
]
STLBL={'B':'Built','A':'Accepted','R':'Recommended','C':'If needed'}
def part(p):
  t,r,st=p
  return f'<div class="pt pt-{st}"><div class="ptx">{E(t)}</div><div class="ptr"><span class="pref">{r}</span><span class="ptag">{STLBL[st]}</span></div></div>'
def step(d,i,side):
  k=d['k']
  kt={'main':'','rec':'<span class="ktag ktag-r">Recommended</span>','cond':'<span class="ktag ktag-c">Only if needed</span>','skip':'<span class="ktag ktag-s">Skipped</span>'}[k]
  tl=f'<div class="stl">{E(d["tagline"])}</div>' if d.get('tagline') else ''
  body=''.join(part(p) for p in d['parts']) if k!='skip' else f'<div class="skn">{E(d["note"])}</div>'
  arrow='&#8595;' if side=='down' else '&#8593;'
  return f'''<div class="step sk-{k}"><div class="sbadge"><span class="sn">{i}</span></div><div class="sc">
<div class="sh"><span class="sl">{d["n"]}</span><span class="stt">{E(d["t"])}</span>{kt}</div>{tl}{body}</div></div>'''
def col(steps,side):
  out=[]
  for i,d in enumerate(steps,1):
    out.append(step(d,i,side))
  return out

down_html='\n<div class="gap"></div>\n'.join(col(DOWN,'down'))
up_items=col(UP,'up')
up_html='\n<div class="gap"></div>\n'.join(reversed(up_items))
after_html=''.join(f'<div class="pt pt-{st}"><div class="ptx"><b class="al">{n}</b> {E(t)}</div><div class="ptr"><span class="pref">{r}</span><span class="ptag">{STLBL[st]}</span></div></div>' for n,t,r,st in AFTER)

# step pills on the center layers
dpos={}; upos={}
for i,d in enumerate(DOWN,1): dpos.setdefault(d['n'],[]).append((i,d['k']))
for i,d in enumerate(UP,1): upos.setdefault(d['n'],[]).append((i,d['k']))
for n,_,_,_ in AFTER: upos.setdefault(n,[]).append(('after','main'))
def pills(n):
  h=''
  for i,k in dpos.get(n,[]):
    h+=f'<span class="lpill lp-d lk-{k}">&#8595; {i}</span>'
  seen=set()
  for i,k in upos.get(n,[]):
    if i in seen: continue
    seen.add(i)
    lab='after' if i=='after' else str(i)
    h+=f'<span class="lpill lp-u lk-{k}">&#8593; {lab}</span>'
  if n=='0': h='<span class="lpill lp-g">guide, not a step</span>'
  return f'<div class="lpills">{h}</div>'
def inj(m):
  n=m.group(1)
  return m.group(0)
# insert pills after each head line, in lrow order
parts=re.split(r'(<div class="ln">\d+</div>)',bands)
res=parts[0]
for j in range(1,len(parts),2):
  n=re.search(r'\d+',parts[j]).group(0)
  rest=parts[j+1]
  rest=re.sub(r'(<div class="head">.*?</div></div>)', lambda m: m.group(1)[:-6]+pills(n)+'</div>', rest, count=1)
  res+=parts[j]+rest
bands=res

extra_css='''
.wrap{width:2060px;padding:30px 30px 22px;background:radial-gradient(1400px 520px at 90% 0%,#0E2D52 0%,#07172B 58%)}
.lead{max-width:1100px}
.legend{flex:0 0 640px;display:grid;grid-template-columns:1fr 1fr;column-gap:22px;row-gap:7px}
.legnote{grid-column:1 / span 2}
.sw-c{background:#0B1D33;border:2px dashed #58C4FF}
.sw-s{background:transparent;border:2px dotted #4A6480}
.tw{display:grid;grid-template-columns:400px 1fr 400px;gap:22px;margin-top:16px;align-items:stretch}
.side{display:flex;flex-direction:column;position:relative}
.sidehd{background:#0B213B;border:1.5px solid #58C4FF;border-radius:12px;padding:9px 12px;}
.sidehd .k{font-size:10px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#58C4FF}
.sidehd .h{font-size:18px;font-weight:800;color:#fff;margin-top:3px;letter-spacing:-.01em}
.sidehd .d{font-size:11.5px;color:#A9C4DE;margin-top:3px;line-height:1.35}
.guide{font-size:10.5px;color:#7F9BB6;border:1px dotted #4A6480;border-radius:8px;padding:5px 9px;margin:8px 0 0;line-height:1.35}
.guide b{color:#A9C4DE}
.path{flex:1;display:flex;flex-direction:column;position:relative;padding:10px 0 10px 0}
.side.down .path{padding-left:40px;padding-bottom:30px}
.side.up .path{padding-right:40px;padding-top:30px}
.shaftv{position:absolute;top:0;bottom:16px;width:3px;border-radius:2px}
.side.down .shaftv{left:15px;background:linear-gradient(#58C4FF,#2A5D8F)}
.side.up .shaftv{right:15px;top:16px;bottom:0;background:linear-gradient(#58C4FF,#2A5D8F)}
.ahead{position:absolute;width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent}
.side.down .ahead{left:7.5px;bottom:2px;border-top:14px solid #58C4FF}
.side.up .ahead{right:7.5px;top:2px;border-bottom:14px solid #58C4FF}
.gap{flex:1;min-height:10px}
.step{position:relative}
.sbadge{position:absolute;top:8px;width:26px;height:26px;border-radius:8px;background:#58C4FF;color:#07172B;font-weight:800;font-size:12.5px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 4px #07172B;z-index:2}
.side.down .sbadge{left:-37.5px}
.side.up .sbadge{right:-37.5px}
.sc{background:#0B213B;border:1.5px solid #1F4670;border-radius:12px;padding:8px 10px 8px}
.sk-rec .sc{background:#211B10;border:1.5px dashed #F2A93B}
.sk-rec .sbadge{background:#F2A93B}
.sk-cond .sc{background:#0B1D33;border:1.5px dashed #58C4FF}
.sk-cond .sbadge{background:#0B1D33;color:#58C4FF;border:1.5px dashed #58C4FF}
.sk-skip .sc{background:transparent;border:1.5px dotted #4A6480;padding:6px 10px}
.sk-skip .sbadge{background:#2A3B4F;color:#9FB3C8}
.sh{display:flex;align-items:center;gap:8px}
.sl{flex:0 0 auto;min-width:24px;height:22px;padding:0 6px;border-radius:6px;background:#0D2643;border:1px solid #58C4FF;color:#58C4FF;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center}
.sk-skip .sl{border-color:#4A6480;color:#9FB3C8;background:transparent}
.stt{font-size:14px;font-weight:800;color:#fff;line-height:1.2;flex:1}
.sk-skip .stt{color:#9FB3C8}
.ktag{font-size:8.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
.ktag-r{color:#F2A93B}.ktag-c{color:#58C4FF}.ktag-s{color:#9FB3C8}
.stl{font-size:10.5px;color:#7F9BB6;font-style:italic;margin:3px 0 0 32px}
.skn{font-size:11.5px;color:#9FB3C8;line-height:1.35;margin-top:4px}
.pt{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;border-radius:7px;padding:4px 7px;margin-top:5px}
.ptx{font-size:11.5px;line-height:1.3;color:#C8DCEF;flex:1}
.ptr{display:flex;flex-direction:column;align-items:flex-end;flex:0 0 auto;gap:1px}
.pref{font-size:10.5px;font-weight:700;color:#58C4FF;white-space:nowrap}
.ptag{font-size:7.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
.pt-B{background:#1E78D6}.pt-B .ptx{color:#fff}.pt-B .pref{color:#E0F0FF}.pt-B .ptag{color:#CFEAFF}
.pt-A{background:#0D2643;border:1px solid #58C4FF}.pt-A .ptag{color:#58C4FF}
.pt-R{background:#211B10;border:1px dashed #F2A93B}.pt-R .ptag{color:#F2A93B}.pt-R .pref{color:#F2C27B}
.pt-C{background:#0B1D33;border:1px dashed #58C4FF}.pt-C .ptag{color:#58C4FF}
.al{display:inline-block;min-width:18px;text-align:center;border:1px solid #58C4FF;border-radius:5px;color:#58C4FF;font-size:10.5px;padding:0 3px;margin-right:3px}
.afterbox{border:1.5px dashed #58C4FF;border-radius:12px;padding:8px 10px;margin:8px 0 0;background:#0B1D33}
.afterbox .k{font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#58C4FF}
.afterbox .d{font-size:11px;color:#A9C4DE;margin-top:2px}
.side.up .sidehd{margin-top:8px}
.center .bands{padding:0}
.center .bandh{padding-left:54px}
.lpills{display:flex;gap:5px;margin-left:auto;flex:0 0 auto}
.head{align-items:center}
.lpill{font-size:10px;font-weight:800;border-radius:5px;padding:2px 6px;white-space:nowrap;letter-spacing:.02em}
.lp-d,.lp-u{background:#58C4FF;color:#07172B}
.lpill.lk-rec{background:#F2A93B;color:#211B10}
.lpill.lk-cond{background:transparent;color:#58C4FF;border:1px dashed #58C4FF}
.lpill.lk-skip{background:transparent;color:#9FB3C8;border:1px dotted #4A6480}
.lp-g{background:transparent;color:#9FB3C8;border:1px dotted #4A6480}
.chips.n6{grid-template-columns:repeat(3,1fr)}
.lt{font-size:15.5px}
.lp{font-size:11.5px}
'''
legend='''<div class="legend">
      <div class="legrow"><span class="sw sw-b"></span>Built</div>
      <div class="legrow"><span class="sw sw-c"></span>Conditional step: only if needed</div>
      <div class="legrow"><span class="sw sw-a"></span>Accepted by Mate</div>
      <div class="legrow"><span class="sw sw-s"></span>Skipped: the turn passes, nothing runs</div>
      <div class="legrow"><span class="sw sw-r"></span>Recommended, awaiting Mate</div>
      <div class="legrow"><span class="lpill lp-d" style="font-size:10px">&#8595; 4</span><span class="lpill lp-u" style="font-size:10px">&#8593; 2</span>step number on each path</div>
      <div class="legnote">A whole step in dashed gold means its main action is recommended, not yet accepted. Key parts only; the full plate has all 91.</div>
    </div>'''
doc=f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>HORBM layered architecture: one turn, both ways</title>
<style>{css}{extra_css}</style>
</head>
<body>
<div class="wrap" id="capture">
  <div class="hd">
    <div>
      <div class="kick">Galion Labs · HORBM</div>
      <h1>HORBM layered architecture: one turn, both ways</h1>
      <div class="h2">A conversationalist first, grounded in sourced truth</div>
      <p class="lead">Heuristic Open Retrieval Brain Models. The twelve layers sit in the middle. The left path is your words going down, in the order the turn really reaches each layer. The right path is the reply coming back up. They are not mirror images: the lookup in 7 and 8 runs before the dialogue manager picks a move, because the move filter needs the evidence, and the reply is checked by safety, persona and empathy on the way up. Numbers like (12) match the notes on the full plate. As of 19 Nov 2026, Europe/Zagreb.</p>
    </div>
    {legend}
  </div>

  <div class="tw">
    <div class="side down">
      <div class="sidehd"><div class="k">Input</div><div class="h">Speak or type</div><div class="d">Your words go down through the layers, step by step, to the machines.</div></div>
      <div class="guide"><b>0 North star</b> guides every step; it is not a step.</div>
      <div class="path"><div class="shaftv"></div><div class="ahead"></div>
{down_html}
      </div>
    </div>

    <div class="center">
{bands}
    </div>

    <div class="side up">
      <div class="afterbox"><div class="k">Then, after it speaks</div><div class="d">Off the hot path, so the voice never waits on it.</div>{after_html}</div>
      <div class="sidehd"><div class="k">Output</div><div class="h">Speak or type</div><div class="d">The reply comes back up from the machines and is checked on the way.</div></div>
      <div class="path"><div class="shaftv"></div><div class="ahead"></div>
{up_html}
      </div>
    </div>
  </div>

  <div class="foot">
    <div>Sources: the full HORBM plate and notes (1) to (91); turn order from R3 and R4 (galion-one-voice draft PRs #208 and #207) and the plate's "one turn, end to end" strip. Key parts only. Status as of 19 Nov 2026, Europe/Zagreb.</div>
    <div><b>Galion Labs</b> · MIT licence</div>
  </div>
</div>
</body>
</html>'''
open(OUT,'w').write(doc)
print('ok',len(doc))
