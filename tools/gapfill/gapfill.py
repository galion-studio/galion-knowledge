#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Galion Labs
"""Galion Research gap-fill runner (knowledge.galion.app core cards).

Sends one topic per Galion Research (hermes-rs, loopback :8642) session,
collects the card JSON it writes, verifies every source independently
(Crossref/DataCite for DOIs, an https fetch for URLs, quoted text on the page)
and keeps only cards whose sources all check out.

Budget: ONE shared ledger (/var/lib/galion-gapfill/budget.json, flock) for
every worker and every run. The cost of a card is read from the gateway's own
spend file (sessions[<session id>]), so delegated helpers count too. A worker
refuses to start a request when spent + reserve would pass stop_at.
"""
import argparse, fcntl, json, os, re, subprocess, sys, time, threading, uuid, datetime, html
import urllib.parse

STATE = os.environ.get("GAPFILL_STATE", "/var/lib/galion-gapfill")
BUDGET = os.path.join(STATE, "budget.json")
SPEND = "/var/lib/hermes-rs/rs-spend.json"
ENVF = "/opt/galion/hermes/.env"
GW = "http://127.0.0.1:8642"
UA = "GalionResearch-gapfill/1.0 (mailto:research@galion.app)"
BANNED = ["wikipedia", "wikimedia", "wikidata", "wikiwand", "wikiless", "dbpedia", "everipedia",
          "thefullwiki", "wiki2.org", "justapedia", "everybodywiki"]
REQUIRED = ["id", "title", "section", "category", "summary", "body", "claim_type", "sources",
            "evidence_strength", "said_by", "as_of_date", "status", "contested_views", "related"]

def today():
    from zoneinfo import ZoneInfo
    return datetime.datetime.now(ZoneInfo("Europe/Zagreb")).date().isoformat()

def now(): return datetime.datetime.now().astimezone().isoformat(timespec="seconds")

def api_key():
    for line in open(ENVF):
        line = line.strip()
        if line.startswith("API_SERVER_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("API_SERVER_KEY not found")

# ---------------- shared budget ----------------
class Budget:
    def __init__(self, cap, stop_at, reserve):
        os.makedirs(STATE, exist_ok=True)
        self.reserve = reserve
        with self._lock() as b:
            b.setdefault("cap_usd", cap); b.setdefault("stop_at_usd", stop_at)
            b.setdefault("spent_usd", 0.0); b.setdefault("entries", [])
            b.setdefault("inflight", {})
    class _L:
        def __init__(s): s.f = None; s.b = None
        def __enter__(s):
            s.f = open(BUDGET + ".lock", "a+"); fcntl.flock(s.f, fcntl.LOCK_EX)
            try: s.b = json.load(open(BUDGET))
            except Exception: s.b = {}
            return s.b
        def __exit__(s, *a):
            tmp = BUDGET + ".tmp"; json.dump(s.b, open(tmp, "w"), indent=1); os.replace(tmp, BUDGET)
            fcntl.flock(s.f, fcntl.LOCK_UN); s.f.close()
    def _lock(self): return Budget._L()
    def reserve_slot(self, sid):
        with self._lock() as b:
            committed = b["spent_usd"] + self.reserve * len(b["inflight"])
            if committed + self.reserve > b["stop_at_usd"]:
                return False, b["spent_usd"]
            b["inflight"][sid] = now(); return True, b["spent_usd"]
    def commit(self, sid, usd, meta):
        with self._lock() as b:
            b["inflight"].pop(sid, None)
            b["spent_usd"] = round(b["spent_usd"] + usd, 6)
            b["entries"].append(dict(meta, session=sid, usd=round(usd, 6), at=now()))
            return b["spent_usd"]
    def spent(self):
        with self._lock() as b: return b["spent_usd"]

def session_cost(sid):
    try: return float(json.load(open(SPEND)).get("sessions", {}).get(sid, 0.0))
    except Exception: return 0.0

# ---------------- http via curl ----------------
def curl(url, accept="*/*", timeout=30, data=None, headers=(), maxsize=6_000_000):
    cmd = ["curl", "-sS", "-L", "--max-redirs", "8", "--max-time", str(timeout), "--max-filesize", str(maxsize),
           "--compressed", "-A", UA, "-H", "Accept: " + accept, "-w", "\n@@ST@@%{http_code} %{content_type} %{url_effective}"]
    for h in headers: cmd += ["-H", h]
    if data is not None: cmd += ["-H", "Content-Type: application/json", "--data-binary", "@-"]
    if not url.startswith(GW): cmd += ["--proto", "=https", "--proto-redir", "=https"]
    p = subprocess.run(cmd + [url], input=(data.encode() if data is not None else None), capture_output=True)
    raw = p.stdout; i = raw.rfind(b"\n@@ST@@")
    if i < 0: return 0, "", url, b""
    st = raw[i + 7:].decode(errors="replace").split(" ", 2)
    code = int(st[0]) if st[0].isdigit() else 0
    return code, (st[1] if len(st) > 1 else ""), (st[2].strip() if len(st) > 2 else url), raw[:i]

def squash(t): return re.sub(r"\s+", " ", t).strip().lower()
def norm_quotes(t): return t.replace("\u2019", "'").replace("\u2018", "'").replace("\u201c", '"').replace("\u201d", '"').replace("\u2013", "-").replace("\u2014", "-")

def page_text(body, ctype):
    if b"%PDF" == body[:4] or "pdf" in ctype:
        p = subprocess.run(["pdftotext", "-q", "-l", "60", "-", "-"], input=body, capture_output=True)
        return p.stdout.decode(errors="replace")
    h = body.decode(errors="replace")
    h = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", h)
    h = re.sub(r"(?s)<[^>]+>", " ", h)
    return html.unescape(h)

def doi_of(url):
    m = re.match(r"https?://(dx\.)?doi\.org/(10\.[^\s]+)$", url.strip(), re.I)
    return m.group(2) if m else None

def title_sim(a, b):
    ta = set(re.findall(r"[a-z0-9]+", a.lower())); tb = set(re.findall(r"[a-z0-9]+", b.lower()))
    if not ta or not tb: return 0.0
    return len(ta & tb) / max(1, min(len(ta), len(tb)))

def check_doi(doi, want_title):
    code, _, _, body = curl("https://api.crossref.org/works/" + doi, "application/json")
    reg, title, year, authors, abstract, meta = None, "", "", [], "", {}
    if code == 200:
        m = json.loads(body)["message"]; reg = "crossref"
        title = (m.get("title") or [""])[0]
        dp = (m.get("issued", {}).get("date-parts") or [[None]])[0]; year = str(dp[0] or "")
        authors = [(a.get("given", "") + " " + a.get("family", a.get("name", ""))).strip() for a in m.get("author", [])]
        abstract = m.get("abstract", "") or ""
        dp_full = "-".join(str(x) for x in ((m.get("issued", {}).get("date-parts") or [[]])[0]) if x)
        meta = {"container": (m.get("container-title") or [""])[0], "volume": m.get("volume", ""), "issue": m.get("issue", ""),
                "page": m.get("page", ""), "issued": dp_full, "publisher": m.get("publisher", ""), "type": m.get("type", "")}
    else:
        code, _, _, body = curl("https://api.datacite.org/dois/" + doi, "application/vnd.api+json")
        if code == 200:
            a = json.loads(body)["data"]["attributes"]; reg = "datacite"
            title = (a.get("titles") or [{}])[0].get("title", ""); year = str(a.get("publicationYear", ""))
            authors = [c.get("name", "") for c in a.get("creators", [])]
            meta = {"container": (a.get("container") or {}).get("title", ""), "publisher": str(a.get("publisher", "")), "issued": year,
                    "type": (a.get("types") or {}).get("resourceTypeGeneral", "")}
    if not reg: return {"ok": False, "why": "DOI not registered (Crossref/DataCite)"}
    # OpenAlex abstract for quote checks
    c2, _, _, b2 = curl("https://api.openalex.org/works/doi:" + doi, "application/json")
    if c2 == 200:
        inv = json.loads(b2).get("abstract_inverted_index") or {}
        if inv:
            pos = sorted((p, w) for w, ps in inv.items() for p in ps)
            abstract = abstract + " " + " ".join(w for _, w in pos)
    sim = title_sim(title, want_title)
    return {"ok": sim >= 0.6, "why": "" if sim >= 0.6 else f"title mismatch ({sim:.2f}): registered '{title}'",
            "registry": reg, "title": title, "year": year, "authors": authors[:12], "meta": meta, "text": re.sub(r"<[^>]+>", " ", abstract)}

def check_url(url):
    host = re.sub(r"^https://", "", url).split("/")[0].lower()
    if not url.startswith("https://"): return {"ok": False, "why": "not https"}
    if any(b in host for b in BANNED): return {"ok": False, "why": "banned Wikipedia-derived host"}
    code, ctype, final, body = curl(url, "text/html,application/pdf,*/*;q=0.5")
    fhost = re.sub(r"^https://", "", final).split("/")[0].lower()
    if any(b in fhost for b in BANNED): return {"ok": False, "why": "redirects to banned host"}
    if not (200 <= code < 300): return {"ok": False, "why": f"HTTP {code}"}
    return {"ok": True, "code": code, "final": final, "text": page_text(body, ctype)}

QUOTE_RE = re.compile(r'"([^"]{25,400})"')

def verify_card(card, existing_ids):
    probs = []
    for k in REQUIRED:
        if k not in card: probs.append("missing field " + k)
    if probs: return False, probs, []
    if card["id"] in existing_ids: probs.append("duplicate id")
    if card["section"] != "world": probs.append("section must be world")
    if not card["sources"]: probs.append("no sources")
    evid = []; texts = []
    for s in card["sources"]:
        url = (s.get("url") or "").strip()
        if not url: probs.append("source without url"); continue
        d = doi_of(url)
        r = check_doi(d, s.get("title", "")) if d else check_url(url)
        evid.append({"url": url, "ok": r["ok"], "why": r.get("why", ""), "registered_title": r.get("title"), "year": r.get("year")})
        if not r["ok"]: probs.append(f"source failed: {url}: {r['why']}")
        else:
            texts.append(squash(norm_quotes(" ".join([r.get("title") or "", r.get("text", "")]))))
            if d and r.get("year") and s.get("date") and str(s["date"])[:4] != r["year"]:
                probs.append(f"source date {s['date']} != registered year {r['year']} for {url}")
    hay = " ".join(texts)
    # Pair quote marks left to right; only spans of 25+ chars count as quotes.
    body = norm_quotes(card["body"])
    singles = re.findall(r"(?:(?<=^)|(?<=[\s:(\[]))'([^']{25,600}?)'(?=$|[\s.,;:)\]])", body)
    for q in re.findall(r'"([^"]*)"', body) + singles:
        if len(q.strip()) < 25:
            continue
        qq = squash(q)
        if qq not in hay:
            probs.append("quote not found on any opened source: " + q[:80])
    return not probs, probs, evid

# ---------------- the agent call ----------------
PROMPT = """You are Galion Research writing ONE card for the Galion Knowledge core pack (knowledge.galion.app).
Topic: {topic}
Card id to use: {cid}
Category: {category}

Rules (hard):
- Primary sources only: the peer-reviewed paper (by DOI), the official text, a standards body, an official institution page, raw data. NO Wikipedia and nothing derived from it (no Wikimedia, Wikidata, DBpedia, Wikiwand, mirrors). No blogs, no news if a primary source exists.
- Before you cite anything you MUST verify it with the source_check tool: action=doi for every DOI (cite it as https://doi.org/<doi>, and copy the registered title, authors and year exactly as returned), action=url for every web page (use expect=[...] with the exact sentence you quote). Drop any source that source_check does not confirm. Never invent a DOI, URL, title, author, date or quote.
- Work efficiently: start with source_check (doi first, then the official page), use arxiv_search for preprints; use the browser only when source_check cannot read a page; never use vision_analyze or screenshots. About 12 tool calls should be enough.
- If you quote, the quote in double quotes must appear verbatim on a page or in the abstract you opened; otherwise paraphrase without quotation marks.
- One card = one claim. Say who said it and when. Neutral wording, no loaded words.
- EVERY sentence must be supported by a source you cited and opened in this session. No background facts from memory, no "noted in the literature", no claims about other people's work unless you cite that work too.
- Attribute exactly: a quote from a preprint is the preprint's, not the journal version's; quote notation exactly as printed (or paraphrase without quotation marks). Do not state causal links ("so", "therefore") the source does not state.
- If you cannot verify a primary source, output exactly {{"skip": "reason"}}.

Output ONLY one JSON object, no markdown fence, with exactly these fields:
{{"id": "{cid}", "title": "...", "section": "world", "category": "{category}", "summary": "one or two sentences",
 "body": "Markdown, 60-160 words: the claim, who stated/proved it, where and when, and what the source itself says",
 "claim_type": "fact", "sources": [{{"title": "...", "url": "https://...", "author": "...", "date": "YYYY or YYYY-MM-DD (publication date)", "accessed": "{today}"}}],
 "evidence_strength": "strong|moderate|weak", "said_by": "who", "as_of_date": "YYYY or YYYY-MM-DD", "status": "sourced - needs review",
 "contested_views": [], "related": [], "tags": ["core-pack", "area:{area}", "{category}"]}}
evidence_strength: strong only when the card states what the primary document itself says; moderate if it is a primary document that does not settle everything.
"""

CARD_CAP = 0.08  # USD per author/revision call; above this the run is cut off

def session_usd(sid):
    try: return float(json.load(open(SPEND)).get("sessions", {}).get(sid, 0.0))
    except Exception: return 0.0

def ask(key, model, prompt, sid, timeout):
    """Streamed call. Closing the stream makes the gateway cancel the run, so a
    client timeout or the per-call cost cap really stops spending (a
    non-streamed request keeps running server-side after the client gives up)."""
    import http.client, socket
    body = json.dumps({"model": model, "messages": [{"role": "user", "content": prompt}], "stream": True})
    u = urllib.parse.urlparse(GW)
    conn = http.client.HTTPConnection(u.hostname, u.port, timeout=15)
    start, base = time.time(), session_usd(sid)
    try:
        conn.request("POST", "/v1/chat/completions", body=body, headers={
            "Content-Type": "application/json", "Authorization": "Bearer " + key, "X-Hermes-Session-Id": sid})
        r = conn.getresponse()
        if r.status != 200:
            r.read(); return str(r.status), None, {}
        parts, usage, last = [], {}, 0.0
        while True:
            try: line = r.fp.readline()
            except socket.timeout: line = None
            now = time.time()
            if now - last > 10:
                last = now
                spent = session_usd(sid) - base
                if spent > CARD_CAP: return "cap", None, {"cut_usd": round(spent, 4)}
                if now - start > timeout: return "timeout", None, {}
            if line is None: continue
            if not line: break
            line = line.strip()
            if not line.startswith(b"data: "): continue
            d = line[6:]
            if d == b"[DONE]": break
            try: j = json.loads(d)
            except Exception: continue
            ch = (j.get("choices") or [{}])[0]
            c = (ch.get("delta") or {}).get("content")
            if c: parts.append(c)
            if j.get("usage"): usage = j["usage"]
        return "200", "".join(parts), usage
    except Exception as e:
        return "err:" + type(e).__name__, None, {}
    finally:
        conn.close()

def extract_json(txt):
    if not txt: return None
    t = txt.strip()
    t = re.sub(r"^```(json)?", "", t).strip(); t = re.sub(r"```$", "", t).strip()
    i, j = t.find("{"), t.rfind("}")
    if i < 0 or j < 0: return None
    try: return json.loads(t[i:j + 1])
    except Exception: return None

REVIEW = """You are the fact-check reviewer for one Galion Knowledge card. Below are the card and the text of every source it cites, as fetched just now.
Check every sentence of the card's title, summary and body against the SOURCE TEXTS ONLY (not your memory):
1. Is each factual statement (names, dates, numbers, venues, what was proved/stated) supported by the source texts?
2. Is every quotation verbatim in a source text, and attributed to the document it actually comes from (e.g. preprint vs journal version)?
3. Any causal or logical link ("so", "therefore", "because") the sources do not state?
4. Any statement about another person's work that no cited source supports?
5. Any evaluative or framing phrase (e.g. 'settling the problem', 'landmark', 'parties who have never met') that no source text states?
6. Any quotation whose wording, letter case or notation differs from the source text?
Answer ONLY with JSON: {{"ok": true|false, "problems": ["short description of each unsupported or wrong sentence"]}}. ok=true only if there are no problems. Bibliographic metadata (title, authors, journal, volume, year, DOI) counts as supported when it matches the registry record shown.

CARD:
{card}

SOURCE TEXTS:
{sources}
"""

def source_texts(card):
    parts = []
    for s in card.get("sources", []):
        url = s.get("url", ""); d = doi_of(url)
        r = check_doi(d, s.get("title", "")) if d else check_url(url)
        if d:
            mt = " | ".join(f"{k}={v}" for k, v in (r.get("meta") or {}).items() if v)
            txt = f"REGISTRY RECORD ({r.get('registry')}): title={r.get('title')} | authors={', '.join(r.get('authors') or [])} | {mt}\nABSTRACT: {r.get('text','') or '(none in Crossref/OpenAlex)'}"
        else:
            txt = r.get("text", "")
        flat = " ".join(txt.split())[:7000]
        parts.append(f"=== {url}\n{flat}")
    return "\n\n".join(parts)

def review_card(args, key, card, sid):
    prompt = REVIEW.format(card=json.dumps({k: card.get(k) for k in ("title", "summary", "body", "said_by", "as_of_date", "sources")}, ensure_ascii=False, indent=1),
                           sources=source_texts(card))
    for _ in range(40):
        code, txt, usage = ask(key, args.review_model, prompt, sid, 300)
        if code != 429: break
        time.sleep(15)
    time.sleep(0.5)
    usd = session_cost(sid) or 0.0
    Budget(args.cap, args.stop_at, args.reserve).commit(sid, usd, {"review_of": card.get("id")})
    j = extract_json(txt) or {"ok": False, "problems": ["reviewer gave no JSON"]}
    return j, usd

PLAN = """You are Galion Research planning core cards for the Galion Knowledge base (knowledge.galion.app), area: {area_desc}.
Propose {n} NEW card topics a person needs before the specialist shards: one claim each (a definition, a theorem, a law, a measured constant, an official text's operative sentence, a primary historical document's key sentence).
Each topic must name its primary source precisely (DOI'd paper, standard, statute, official institution page, primary text edition, raw dataset). No Wikipedia or derivatives.
Do NOT repeat any of these existing card titles:
{existing}
Answer ONLY with a JSON array: [{{"slug": "lowercase-hyphen-slug-with-year", "topic": "one sentence naming the claim and its primary source"}}]"""

def jacc(a, b):
    ta = set(re.findall(r"[a-z0-9]{3,}", a.lower())); tb = set(re.findall(r"[a-z0-9]{3,}", b.lower()))
    return len(ta & tb) / max(1, len(ta | tb))

def plan_topics(a, key, budget, area, desc, prefix, category, existing_titles, n):
    sid = f"gapfill-plan-{area}-{uuid.uuid4().hex[:6]}"
    ok, _ = budget.reserve_slot(sid)
    if not ok: return []
    ex = "\n".join("- " + t for t in existing_titles[-400:])
    for _ in range(40):
        code, txt, usage = ask(key, a.model, PLAN.format(area_desc=desc, n=n, existing=ex), sid, 300)
        if code != 429: break
        time.sleep(15)
    time.sleep(0.5)
    budget.commit(sid, session_cost(sid), {"plan": area})
    t = (txt or "").strip(); i, j = t.find("["), t.rfind("]")
    try: arr = json.loads(t[i:j + 1])
    except Exception: return []
    out = []
    for x in arr:
        slug = re.sub(r"[^a-z0-9-]+", "-", str(x.get("slug", "")).lower()).strip("-")[:60]
        topic = str(x.get("topic", ""))
        if not slug or not topic: continue
        if any(jacc(topic, et) > 0.5 for et in existing_titles): continue
        out.append({"cid": f"{prefix}.{slug}", "topic": topic, "category": category, "area": area})
    return out

def run_topic(args, key, budget, t, existing, out_dir, log):
    sid = f"gapfill-{args.run}-{t['cid'].split('.')[-1]}-{uuid.uuid4().hex[:6]}"
    ok, spent = budget.reserve_slot(sid)
    if not ok:
        log({"topic": t["cid"], "result": "budget_stop", "spent": spent}); return "stop"
    model = t.get("model") or args.model
    t0 = time.time()
    prompt = PROMPT.format(topic=t["topic"], cid=t["cid"], category=t.get("category", "mathematics"),
                           area=t.get("area", "math"), today=today())
    for attempt in range(40):
        code, txt, usage = ask(key, model, prompt, sid, args.timeout)
        if code != 429: break
        time.sleep(15)  # gateway run slots full (max_concurrent_runs): wait, do not spend
    time.sleep(0.5)
    usd = session_cost(sid) or float(usage.get("cost") or usage.get("cost_usd") or 0.0)
    total = budget.commit(sid, usd, {"topic": t["cid"], "model": model})
    rec = {"topic": t["cid"], "model": model, "session": sid, "http": code, "usd": round(usd, 6),
           "total_usd": total, "secs": round(time.time() - t0, 1), "usage": usage}
    card = extract_json(txt)
    if card is None:
        rec.update(result="no_json", raw=(txt or "")[:500]); log(rec); return "fail"
    if "skip" in card:
        rec.update(result="skipped_by_agent", why=card["skip"]); log(rec); return "skip"
    good, probs, evid = verify_card(card, existing)
    rec["rounds"] = []
    for rnd in range(args.revisions + 1):
        if good and not args.no_review:
            rv, rusd = review_card(args, key, card, f"{sid}-rv{rnd}")
            rec["rounds"].append({"review": rv, "usd": rusd})
            if not rv.get("ok"):
                good = False
                probs = ["review: " + x for x in (rv.get("problems") or ["reviewer did not confirm"])]
        if good or rnd == args.revisions:
            break
        fix = ("The checker and the fact-check reviewer found these problems in your card:\n- " + "\n- ".join(probs) +
               "\nFix them: delete or reword every unsupported sentence so that it says only what the cited sources (as fetched) support; "
               "you may verify an extra primary source with source_check and add it. Output ONLY the corrected card JSON (same id), or {\"skip\": \"reason\"}.")
        code, txt, usage = ask(key, model, fix, sid, args.timeout)
        c2 = extract_json(txt)
        if not c2 or "skip" in c2:
            probs.append("revision gave no card"); break
        card = c2
        good, probs, evid = verify_card(card, existing)
    usd_total = session_cost(sid) + sum(r["usd"] for r in rec["rounds"])
    rec["usd_total_incl_review"] = round(usd_total, 6)
    extra = session_cost(sid) - usd
    if extra > 0:
        budget.commit(sid + "-rev", extra, {"topic": t["cid"], "model": model, "what": "revision"})
    rec.update(evidence=evid, problems=probs)
    if good:
        card["id"] = t["cid"]
        p = os.path.join(out_dir, "kept", t["cid"] + ".json")
        json.dump(card, open(p, "w"), indent=2, ensure_ascii=False); open(p, "a").write("\n")
        rec["result"] = "kept"
    else:
        p = os.path.join(out_dir, "dropped", t["cid"] + ".json")
        json.dump({"card": card, "problems": probs}, open(p, "w"), indent=2, ensure_ascii=False)
        rec["result"] = "dropped"
    log(rec); return rec["result"]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--topics", required=True); ap.add_argument("--run", required=True)
    ap.add_argument("--model", default="deepseek-ai/DeepSeek-V4.1-Flash-1017")
    ap.add_argument("--workers", type=int, default=2); ap.add_argument("--timeout", type=int, default=900)
    ap.add_argument("--existing-ids", default=""); ap.add_argument("--cap", type=float, default=25.0)
    ap.add_argument("--stop-at", type=float, default=24.0); ap.add_argument("--reserve", type=float, default=0.30)
    ap.add_argument("--reverify", action="store_true", help="re-check dropped cards of this run, no model calls")
    ap.add_argument("--review-model", default="zai-org/GLM-5.3-Flash")
    ap.add_argument("--no-review", action="store_true")
    ap.add_argument("--revisions", type=int, default=1)
    ap.add_argument("--review-only", default="", help="dir of card JSON files: run only the reviewer on them")
    a = ap.parse_args()
    if a.reverify:
        out = os.path.join(STATE, "runs", a.run)
        existing = set(open(a.existing_ids).read().split()) if a.existing_ids else set()
        for f in sorted(os.listdir(out + "/dropped")):
            d = json.load(open(os.path.join(out, "dropped", f)))
            good, probs, evid = verify_card(d["card"], existing)
            print(f, "KEPT" if good else "DROP", "; ".join(probs)[:300])
            if good:
                p = os.path.join(out, "kept", f)
                json.dump(d["card"], open(p, "w"), indent=2, ensure_ascii=False); open(p, "a").write("\n")
                os.replace(os.path.join(out, "dropped", f), os.path.join(out, "dropped", f + ".reverified-kept"))
        return
    key = api_key()
    budget = Budget(a.cap, a.stop_at, a.reserve)
    if a.review_only:
        for f in sorted(os.listdir(a.review_only)):
            if not f.endswith(".json"): continue
            c = json.load(open(os.path.join(a.review_only, f)))
            sid = f"gapfill-{a.run}-rv-{f[:-5].split('.')[-1]}-{uuid.uuid4().hex[:6]}"
            ok, _ = budget.reserve_slot(sid)
            if not ok: print("budget stop"); break
            with budget._lock() as b: b["inflight"].pop(sid, None)
            rv, usd = review_card(a, key, c, sid)
            print(json.dumps({"card": f, "usd": round(usd, 5), "review": rv}, ensure_ascii=False))
        return
    out = os.path.join(STATE, "runs", a.run); os.makedirs(out + "/kept", exist_ok=True); os.makedirs(out + "/dropped", exist_ok=True)
    existing = set(open(a.existing_ids).read().split()) if a.existing_ids else set()
    topics = [json.loads(l) for l in open(a.topics) if l.strip()]
    lk = threading.Lock(); logf = open(os.path.join(out, "log.jsonl"), "a")
    def log(r):
        with lk:
            logf.write(json.dumps(r, ensure_ascii=False) + "\n"); logf.flush()
            print(f"{now()} {r.get('topic')} {r.get('model','')} {r.get('result')} ${r.get('usd',0):.4f} total=${r.get('total_usd',r.get('spent',0))}", flush=True)
    q = list(topics); stop = threading.Event()
    def worker():
        while not stop.is_set():
            with lk:
                if not q: return
                t = q.pop(0)
            if os.path.exists(os.path.join(out, "kept", t["cid"] + ".json")):
                continue
            if run_topic(a, key, budget, t, existing, out, log) == "stop": stop.set()
    ths = [threading.Thread(target=worker) for _ in range(max(1, a.workers))]
    [x.start() for x in ths]; [x.join() for x in ths]
    print("spent_total", budget.spent())

if __name__ == "__main__":
    main()
