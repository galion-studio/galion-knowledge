#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Galion Labs
"""Galion Research gap-fill runner (knowledge.galion.app core cards).

Sends one topic per Galion Research (hermes-rs, loopback :8642) session,
collects the card JSON it writes, verifies every source independently
(Crossref/DataCite for DOIs, an https fetch for URLs, quoted text on the page)
and keeps only cards whose sources all check out.

The final message has to be one JSON object. A JSON-only system prompt is
always sent. response_format json_object is sent when the gateway accepts it,
and dropped for the rest of the process if the gateway rejects it. One retry
repeats the parse error, then the topic is failed.

Budget: ONE shared ledger (/var/lib/galion-gapfill/budget.json, flock) for
every worker and every run. Each gateway call, including the JSON retry, is
its own ledger line. The cost is the spend-file delta for that session
(sessions[<session id>], so delegated tool calls count) or the usage cost
when the spend file has not moved yet. A later spend-file update does not
count that usage again. A worker refuses to start a request when spent +
reserve would pass stop_at.

Per call the stream stops at card_cap (default $0.08) or max_tokens. Per
topic every call stops once topic_cap (default $0.10) is reached. The gateway
allows 3 concurrent runs; further calls wait. Wikipedia and Wikipedia-derived
hosts are rejected. verify_card still runs before a card is kept.
"""
import argparse, fcntl, json, os, re, subprocess, time, threading, uuid, datetime, html
import urllib.parse

STATE = os.environ.get("GAPFILL_STATE", "/var/lib/galion-gapfill")
BUDGET = os.path.join(STATE, "budget.json")
RUNS = os.path.join(STATE, "gateway-runs.json")
SPEND = os.environ.get("GAPFILL_SPEND", "/var/lib/hermes-rs/rs-spend.json")
ENVF = "/opt/galion/hermes/.env"
GW = "http://127.0.0.1:8642"
UA = "GalionResearch-gapfill/1.0 (mailto:research@galion.app)"
BANNED = ["wikipedia", "wikimedia", "wikidata", "wikiwand", "wikiless", "dbpedia", "everipedia",
          "thefullwiki", "wiki2.org", "justapedia", "everybodywiki"]
REQUIRED = ["id", "title", "section", "category", "summary", "body", "claim_type", "sources",
            "evidence_strength", "said_by", "as_of_date", "status", "contested_views", "related"]
CARD_CAP = 0.08   # USD per author/revision call; above this the stream is cut
TOPIC_CAP = 0.10  # USD per topic, all calls (author, retry, reviews, revision)
RUN_LIMIT = 3     # hermes-rs max_concurrent_runs
RUN_STALE = 1200
RUN_POLL = 2.0
TOPIC_FLOOR = 0.005
REVIEW_SOURCE_CHARS = 20000  # per source, sent to the fact-check reviewer
JSON_OBJECT = {"type": "json_object"}
_GATEWAY = {"json_object": True, "max_tokens": True}
_GATEWAY_LOCK = threading.Lock()
_SCHEMA = None

def today():
    from zoneinfo import ZoneInfo
    return datetime.datetime.now(ZoneInfo("Europe/Zagreb")).date().isoformat()

def now(): return datetime.datetime.now().astimezone().isoformat(timespec="seconds")

def _wait_spend():
    """Give the gateway a moment to flush rs-spend.json after a call."""
    time.sleep(0.5)

def api_key():
    with open(ENVF, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("API_SERVER_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("API_SERVER_KEY not found")

def _read_json(path, default=None):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {} if default is None else default

def _atomic_json(path, obj):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=1, ensure_ascii=False)
        f.write("\n")
    os.replace(tmp, path)

def write_json(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
        f.write("\n")

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
            s.f = open(BUDGET + ".lock", "a+", encoding="utf-8"); fcntl.flock(s.f, fcntl.LOCK_EX)
            s.b = _read_json(BUDGET, {})
            return s.b
        def __exit__(s, *a):
            try:
                _atomic_json(BUDGET, s.b)
            finally:
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

def session_usd(sid):
    try:
        with open(SPEND, encoding="utf-8") as f:
            return float(json.load(f).get("sessions", {}).get(sid, 0.0) or 0.0)
    except Exception:
        return 0.0

def session_cost(sid):
    return session_usd(sid)

def usage_cost(usage):
    if not isinstance(usage, dict):
        return 0.0
    for key in ("cost", "cost_usd", "total_cost"):
        if usage.get(key) is None:
            continue
        try:
            return float(usage[key])
        except (TypeError, ValueError):
            continue
    return 0.0

def usage_brief(usage):
    if not isinstance(usage, dict):
        return {}
    out = {}
    for key in ("cost", "cost_usd", "total_cost", "prompt_tokens", "completion_tokens", "total_tokens"):
        if usage.get(key) is not None:
            out[key] = usage[key]
    return out

def merge_usage(a, b):
    """Add token and cost fields. Used when one logical call needed a fallback request."""
    if not isinstance(a, dict):
        a = {}
    if not isinstance(b, dict):
        b = {}
    if not a:
        return dict(b)
    if not b:
        return dict(a)
    out = dict(b)
    for key in ("cost", "cost_usd", "total_cost", "prompt_tokens", "completion_tokens", "total_tokens"):
        if a.get(key) is None and b.get(key) is None:
            continue
        try:
            out[key] = float(a.get(key) or 0) + float(b.get(key) or 0)
        except (TypeError, ValueError):
            pass
    return out

class CallCost:
    """Cost of each call in one gateway session.

    Construct this before the call so file_seen is the pre-call spend-file
    total. charge() after the call books the file delta. If the file has not
    moved, the usage cost is booked instead and remembered, so a later file
    update that includes it is not added a second time.
    """
    def __init__(self, sid):
        self.sid = sid
        self.file_seen = round(session_usd(sid), 6)
        self.fallback = 0.0
        self.booked = 0.0

    def charge(self, usage):
        shown = round(session_usd(self.sid), 6)
        file_delta = round(max(0.0, shown - self.file_seen), 6)
        self.file_seen = shown
        reported = round(max(0.0, usage_cost(usage)), 6)
        if file_delta > 0:
            overlap = min(self.fallback, file_delta)
            self.fallback = round(self.fallback - overlap, 6)
            cost = round(file_delta - overlap, 6)
        else:
            cost = reported
            self.fallback = round(self.fallback + cost, 6)
        self.booked = round(self.booked + cost, 6)
        return cost

def _pid_alive(pid):
    try:
        os.kill(int(pid), 0)
        return True
    except (OSError, ValueError, TypeError):
        return False

def acquire_run_slot(owner, limit=None, stale_s=None, poll=None):
    """Block until fewer than `limit` gateway runs are in flight across processes."""
    limit = RUN_LIMIT if limit is None else limit
    stale_s = RUN_STALE if stale_s is None else stale_s
    poll = RUN_POLL if poll is None else poll
    if limit <= 0:
        return None
    while True:
        try:
            os.makedirs(STATE, exist_ok=True)
            lockf = open(RUNS + ".lock", "a+", encoding="utf-8")
            fcntl.flock(lockf, fcntl.LOCK_EX)
        except OSError:
            return None
        try:
            data = _read_json(RUNS, {})
            tick = time.time()
            live = {}
            for key, val in data.items():
                if not isinstance(val, dict):
                    continue
                if tick - float(val.get("at") or 0) > stale_s:
                    continue
                if not _pid_alive(val.get("pid")):
                    continue
                live[key] = val
            if len(live) < limit:
                live[owner] = {"pid": os.getpid(), "at": tick}
                _atomic_json(RUNS, live)
                return owner
            _atomic_json(RUNS, live)
        finally:
            fcntl.flock(lockf, fcntl.LOCK_UN)
            lockf.close()
        time.sleep(poll)

def release_run_slot(owner):
    if not owner:
        return
    try:
        lockf = open(RUNS + ".lock", "a+", encoding="utf-8")
        fcntl.flock(lockf, fcntl.LOCK_EX)
    except OSError:
        return
    try:
        data = _read_json(RUNS, {})
        data.pop(owner, None)
        _atomic_json(RUNS, data)
    finally:
        fcntl.flock(lockf, fcntl.LOCK_UN)
        lockf.close()

# ---------------- http via curl ----------------
def curl(url, accept="*/*", timeout=30, data=None, headers=(), maxsize=6_000_000):
    cmd = ["curl", "-sS", "-L", "--max-redirs", "8", "--max-time", str(timeout), "--max-filesize", str(maxsize),
           "--compressed", "-A", UA, "-H", "Accept: " + accept, "-w", "\n@@ST@@%{http_code} %{content_type} %{url_effective}"]
    for h in headers: cmd += ["-H", h]
    if data is not None: cmd += ["-H", "Content-Type: application/json; charset=utf-8", "--data-binary", "@-"]
    if not url.startswith(GW): cmd += ["--proto", "=https", "--proto-redir", "=https"]
    raw_in = data.encode("utf-8") if isinstance(data, str) else data
    p = subprocess.run(cmd + [url], input=raw_in, capture_output=True)
    raw = p.stdout; i = raw.rfind(b"\n@@ST@@")
    if i < 0: return 0, "", url, b""
    st = raw[i + 7:].decode("utf-8", errors="replace").split(" ", 2)
    code = int(st[0]) if st[0].isdigit() else 0
    return code, (st[1] if len(st) > 1 else ""), (st[2].strip() if len(st) > 2 else url), raw[:i]

def squash(t): return re.sub(r"\s+", " ", t).strip().lower()
def norm_quotes(t): return t.replace("\u2019", "'").replace("\u2018", "'").replace("\u201c", '"').replace("\u201d", '"').replace("\u2013", "-").replace("\u2014", "-")

def page_text(body, ctype):
    if b"%PDF" == body[:4] or "pdf" in ctype:
        p = subprocess.run(["pdftotext", "-q", "-l", "60", "-", "-"], input=body, capture_output=True)
        return p.stdout.decode("utf-8", errors="replace")
    h = body.decode("utf-8", errors="replace")
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

def banned_host(host):
    h = (host or "").lower()
    return any(b in h for b in BANNED)

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
    if banned_host(host): return {"ok": False, "why": "banned Wikipedia-derived host"}
    code, ctype, final, body = curl(url, "text/html,application/pdf,*/*;q=0.5")
    fhost = re.sub(r"^https://", "", final).split("/")[0].lower()
    if banned_host(fhost): return {"ok": False, "why": "redirects to banned host"}
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
    every = list(card["sources"])
    for cv in card.get("contested_views") or []:
        if isinstance(cv, dict):
            every += [x for x in (cv.get("sources") or []) if isinstance(x, dict)]
    for s in every:
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
SYSTEM = """You are Galion Research, writing one knowledge card for knowledge.galion.app.
Output contract, hard:
- The final message is exactly one JSON object. No prose before it. No prose after it. No markdown fence. No think, thinking, or reasoning block in the final message.
- Do not cite Wikipedia or anything derived from it (Wikimedia, Wikidata, DBpedia, Wikiwand, mirrors).
- Every claim is sourced and dated. Each source has title, an https URL, author, date, and accessed (YYYY-MM-DD).
- If a primary source cannot be verified, the object is exactly {"skip": "reason"}.
- Title, summary, and body may be in any language. Use UTF-8.
"""

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
- If the claim is contested, add each side to contested_views as {{"label": "who holds it", "summary": "what they say and when", "status": "open|minority|refuted-by-source", "sources": [same source shape, verified]}}. Do not pick a winner the sources do not settle.
- Count sources honestly: a whole government (all its ministries, agencies and officials) counts as ONE source, and the whole mainstream media counts as ONE source. Several of them agreeing is still one source.
- If you cannot verify a primary source, output exactly {{"skip": "reason"}}.

Your FINAL message must be exactly one JSON object and nothing else (no prose before or after, no markdown fence), with exactly these fields:
{{"id": "{cid}", "title": "...", "section": "world", "category": "{category}", "summary": "one or two sentences",
 "body": "Markdown, 60-160 words: the claim, who stated/proved it, where and when, and what the source itself says",
 "claim_type": "fact", "sources": [{{"title": "...", "url": "https://...", "author": "...", "date": "YYYY or YYYY-MM-DD (publication date)", "accessed": "{today}"}}],
 "evidence_strength": "strong|moderate|weak", "said_by": "who", "as_of_date": "YYYY or YYYY-MM-DD", "status": "sourced - needs review",
 "contested_views": [], "related": [], "tags": ["core-pack", "area:{area}", "{category}"]}}
evidence_strength: strong only when the card states what the primary document itself says; moderate if it is a primary document that does not settle everything.
"""

FORMAT_REMINDER = """Your last reply was not valid card JSON. Parse error: <<ERROR>>
Do not call any more tools.
Using only the sources you already verified in this session, output NOW exactly one JSON object with the card
(id "<<CID>>", every field the card schema requires), or {"skip": "reason"}. No prose, no markdown fence, no think or reasoning block, nothing before or after the JSON."""

def format_reminder(cid, error):
    err = (error or "no JSON object found").replace("\n", " ")[:800]
    return FORMAT_REMINDER.replace("<<ERROR>>", err).replace("<<CID>>", str(cid))

def encode_payload(payload):
    return json.dumps(payload, ensure_ascii=False).encode("utf-8")

def completion_payload(model, prompt, system=None, max_tokens=None, response_format=None):
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    body = {"model": model, "messages": messages, "stream": True}
    if max_tokens:
        body["max_tokens"] = int(max_tokens)
    if response_format:
        body["response_format"] = response_format
    return body

def delta_text(event):
    """Visible reply text. Reasoning channels are not part of the card."""
    ch = (event.get("choices") or [{}])[0]
    delta = ch.get("delta") or {}
    content = delta.get("content")
    return content if isinstance(content, str) else ""

def sse_data(line):
    """One `data:` line from an OpenAI-style stream, or None for keepalives and [DONE]."""
    if not isinstance(line, (bytes, bytearray)) or not line.startswith(b"data:"):
        return None
    data = line[5:].strip()
    if not data or data == b"[DONE]":
        return None
    try:
        event = json.loads(data.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None
    return event if isinstance(event, dict) else None

def _names_response_format(text):
    blob = (text or "").lower()
    return "response_format" in blob or "json_object" in blob or "response format" in blob

def _names_max_tokens(text):
    blob = (text or "").lower()
    return "max_tokens" in blob or "max_completion_tokens" in blob

CONNECT_TIMEOUT = 15   # seconds to connect and to get response headers
STREAM_TICK = 5.0      # seconds between cap/timeout checks while the stream is idle

def _http_stream(key, payload, sid, timeout, cap):
    """Streamed call. Closing the stream makes the gateway cancel the run, so a
    client timeout or the per-call cost cap really stops spending (a
    non-streamed request keeps running server-side after the client gives up).

    The gateway can be silent for minutes while the agent runs tools. A socket
    read timeout cannot be used for the idle ticks: after one timeout the
    buffered reader raises OSError ("cannot read from timed out object") on
    every later read. So a reader thread does blocking reads and the caller
    polls a queue; on cap or timeout the socket is shut down, which also ends
    the reader."""
    import http.client, queue as _queue, socket
    data = encode_payload(payload)
    u = urllib.parse.urlparse(GW)
    conn = http.client.HTTPConnection(u.hostname, u.port, timeout=CONNECT_TIMEOUT)
    start, base = time.time(), session_usd(sid)
    sock = None
    try:
        conn.request("POST", "/v1/chat/completions", body=data, headers={
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": "Bearer " + key,
            "X-Hermes-Session-Id": sid,
        })
        sock = conn.sock
        r = conn.getresponse()
        if r.status != 200:
            err = r.read(8000).decode("utf-8", errors="replace")
            return str(r.status), err, {}
        if sock is not None:
            sock.settimeout(None)
        lines = _queue.Queue()

        def pump():
            try:
                while True:
                    ln = r.fp.readline()
                    lines.put(ln)
                    if not ln:
                        return
            except Exception as exc:  # socket shut down by the caller, or a real error
                lines.put(exc)

        threading.Thread(target=pump, name="gapfill-stream", daemon=True).start()
        parts, usage, last = [], {}, 0.0
        while True:
            try:
                line = lines.get(timeout=STREAM_TICK)
            except _queue.Empty:
                line = None
            if isinstance(line, Exception):
                raise line
            tick = time.time()
            if line is None or tick - last > 10:
                last = tick
                spent = session_usd(sid) - base
                if spent > cap:
                    return "cap", None, dict(usage, cut_usd=round(spent, 6))
                if tick - start > timeout:
                    return "timeout", None, usage
            if line is None:
                continue
            if not line:
                break
            stripped = line.strip()
            if stripped.startswith(b"data:") and stripped[5:].strip() == b"[DONE]":
                break
            event = sse_data(stripped)
            if event is None:
                continue
            piece = delta_text(event)
            if piece:
                parts.append(piece)
            if isinstance(event.get("usage"), dict):
                usage = event["usage"]
        return "200", "".join(parts), usage
    except Exception as e:
        return "err:" + type(e).__name__, None, {}
    finally:
        if sock is not None:
            try:
                sock.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass
        conn.close()

def _one_call(key, payload, sid, timeout, cap, transport):
    owner = acquire_run_slot(sid + ":" + uuid.uuid4().hex[:8])
    try:
        if transport is not None:
            return transport(payload)
        return _http_stream(key, payload, sid, timeout, cap)
    finally:
        release_run_slot(owner)

def ask(key, model, prompt, sid, timeout, cap=None, system=None, max_tokens=None, json_mode=False, transport=None):
    """One gateway completion. json_mode asks for response_format json_object.
    A 400/422 that rejects that field or max_tokens is retried once without it."""
    limit = CARD_CAP if cap is None else cap

    def send(use_json, use_max):
        fmt = JSON_OBJECT if use_json else None
        payload = completion_payload(model, prompt, system=system, max_tokens=use_max, response_format=fmt)
        return _one_call(key, payload, sid, timeout, limit, transport)

    use_json = bool(json_mode) and _GATEWAY["json_object"]
    use_max = int(max_tokens) if max_tokens and _GATEWAY["max_tokens"] else None
    status, txt, usage = send(use_json, use_max)
    if status not in ("400", "422") or not (use_json or use_max):
        return status, txt, usage or {}
    # Only a named rejection turns the feature off for the process. An empty
    # 400 is retried once without the extra fields, and the next call tries again.
    drop_json = use_json and _names_response_format(txt)
    drop_max = bool(use_max) and _names_max_tokens(txt)
    vague = not (txt or "").strip()
    if not drop_json and not drop_max and not vague:
        return status, txt, usage or {}
    with _GATEWAY_LOCK:
        if drop_json:
            _GATEWAY["json_object"] = False
        if drop_max:
            _GATEWAY["max_tokens"] = False
    status2, txt2, usage2 = send(False if (drop_json or vague) else use_json, None if (drop_max or vague) else use_max)
    return status2, txt2, merge_usage(usage, usage2)

def ask_ready(key, model, prompt, sid, timeout, cap=None, **kw):
    """Repeat while the gateway reports that its 3 run slots are full."""
    code, txt, usage = "429", None, {}
    for _ in range(40):
        code, txt, usage = ask(key, model, prompt, sid, timeout, cap=cap, **kw)
        if code != "429":
            return code, txt, usage
        time.sleep(15)
    return code, txt, usage

# ---------------- JSON extraction and card schema ----------------
_CLOSED_THINK = re.compile(
    r"(?is)<\s*(think|thinking|reasoning|analysis|redacted_thinking|redacted_reasoning)\b[^>]*>"
    r".*?"
    r"<\s*/\s*\1\s*>"
)
_THINK_TAG = re.compile(
    r"(?is)<\s*/?\s*(think|thinking|reasoning|analysis|redacted_thinking|redacted_reasoning)\b[^>]*>"
)
_ALT_THINK = re.compile(r"(?is)<\|think\|>.*?<\|/think\|>|◁think▷.*?◁/think▷|\[think\].*?\[/think\]")
_ALT_TAG = re.compile(r"(?is)<\|/?think\|>|◁/?think▷|\[/?think\]")
_FENCE = re.compile(r"```(?:json|JSON)?")
_SMART = {"\u201c": '"', "\u201d": '"', "\u201e": '"', "\u00ab": '"', "\u00bb": '"'}

def strip_model_wrappers(txt):
    """Drop code fences and closed think/reasoning blocks. Leave the reply text."""
    t = str(txt).replace("\ufeff", "").replace("\u200b", "")
    t = _CLOSED_THINK.sub(" ", t)
    t = _ALT_THINK.sub(" ", t)
    t = _THINK_TAG.sub(" ", t)
    t = _ALT_TAG.sub(" ", t)
    t = _FENCE.sub("", t)
    return t

def _smart_quotes_outside_strings(s):
    out = []
    in_str = False
    esc = False
    for c in s:
        if in_str:
            out.append(c)
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = False
            continue
        if c == '"':
            in_str = True
            out.append(c)
            continue
        out.append(_SMART.get(c, c))
    return "".join(out)

def _strip_trailing_commas(s):
    out = []
    i, n = 0, len(s)
    in_str = False
    esc = False
    while i < n:
        c = s[i]
        if in_str:
            out.append(c)
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = False
            i += 1
            continue
        if c == '"':
            in_str = True
            out.append(c)
            i += 1
            continue
        if c == ",":
            j = i + 1
            while j < n and s[j] in " \t\r\n":
                j += 1
            if j < n and s[j] in "}]":
                i += 1
                continue
        out.append(c)
        i += 1
    return "".join(out)

def repair_json(s):
    """Light repair: smart quotes used as delimiters, then trailing commas."""
    return _strip_trailing_commas(_smart_quotes_outside_strings(s))

def _object_end(s, start):
    """Index one past the object starting at start, or None if the braces never close."""
    depth = 0
    i, n = start, len(s)
    in_str = False
    esc = False
    while i < n:
        c = s[i]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = False
            i += 1
            continue
        if c == '"':
            in_str = True
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return i + 1
            if depth < 0:
                return None
        i += 1
    return None

def collect_objects(txt):
    """First-to-last balanced JSON objects. Repair is only applied to a slice that did not parse."""
    s = strip_model_wrappers(txt or "")
    found, errors = [], []
    i, n = 0, len(s)
    dec = json.JSONDecoder()
    while i < n:
        j = s.find("{", i)
        if j < 0:
            break
        try:
            obj, end = dec.raw_decode(s, j)
        except json.JSONDecodeError:
            endpos = _object_end(s, j)
            if endpos is None:
                errors.append("truncated JSON object (unbalanced braces)")
                i = j + 1
                continue
            try:
                obj = json.loads(repair_json(s[j:endpos]))
            except json.JSONDecodeError as e:
                errors.append(f"JSON decode: {e.msg} at line {e.lineno} column {e.colno}")
                i = j + 1
                continue
            end = endpos
        if not isinstance(end, int) or end <= j:
            i = j + 1
            continue
        if isinstance(obj, dict):
            found.append(obj)
        i = end
    if found:
        # Inner objects (a source, say) can parse while the card around them was cut off.
        cut = [e for e in errors if e.startswith("truncated")]
        return found, (cut[0] if cut else None)
    if errors:
        if all(e.startswith("truncated") for e in errors):
            return [], errors[0]
        return [], errors[-1]
    return [], "no JSON object found"

def extract_json(txt, prefer=("id", "skip")):
    """First object that carries a preferred key, else the largest object."""
    if not txt:
        return None
    objs, _ = collect_objects(txt)
    for key in prefer:
        for obj in objs:
            if key in obj:
                return obj
    if not objs:
        return None
    return max(objs, key=lambda o: len(o))

def _schema_candidates():
    env = os.environ.get("GAPFILL_SCHEMA")
    if env:
        yield env
    here = os.path.dirname(os.path.abspath(__file__))
    yield os.path.normpath(os.path.join(here, "..", "..", "v2", "data", "schema.json"))

def card_schema():
    """The truth-gate card schema. The repo file wins; the embedded copy is the VPS fallback."""
    global _SCHEMA
    if _SCHEMA is not None:
        return _SCHEMA
    for path in _schema_candidates():
        try:
            with open(path, encoding="utf-8") as f:
                _SCHEMA = json.load(f)
                return _SCHEMA
        except OSError:
            continue
    _SCHEMA = json.loads(_EMBEDDED_SCHEMA)
    return _SCHEMA

def _resolve_ref(root, ref):
    node = root
    for part in ref.lstrip("#/").split("/"):
        if not part:
            continue
        node = node[part]
    return node

def _type_ok(instance, expected):
    if expected == "object":
        return isinstance(instance, dict)
    if expected == "array":
        return isinstance(instance, list)
    if expected == "string":
        return isinstance(instance, str)
    if expected == "integer":
        return isinstance(instance, int) and not isinstance(instance, bool)
    if expected == "number":
        return isinstance(instance, (int, float)) and not isinstance(instance, bool)
    if expected == "boolean":
        return isinstance(instance, bool)
    if expected == "null":
        return instance is None
    return True

def validate_instance(instance, schema, root=None, path="$"):
    """The subset of JSON Schema this card file uses: type, enum, required,
    properties, additionalProperties, items, $ref, minLength, pattern, minimum."""
    if root is None:
        root = schema
    if isinstance(schema, dict) and "$ref" in schema:
        return validate_instance(instance, _resolve_ref(root, schema["$ref"]), root, path)
    if not isinstance(schema, dict):
        return []
    expected = schema.get("type")
    if expected and not _type_ok(instance, expected):
        return [f"{path} must be {expected}"]
    errs = []
    if "enum" in schema and instance not in schema["enum"]:
        errs.append(f"{path} must be one of {schema['enum']}")
    if expected == "object":
        props = schema.get("properties") or {}
        for key in schema.get("required") or []:
            if key not in instance:
                errs.append(f"{path}.{key} is required")
        if schema.get("additionalProperties") is False:
            for key in instance:
                if key not in props:
                    errs.append(f"{path}.{key} is not allowed")
        for key, value in instance.items():
            if key in props:
                errs.extend(validate_instance(value, props[key], root, f"{path}.{key}"))
    elif expected == "array":
        item_schema = schema.get("items")
        if item_schema is not None:
            for i, value in enumerate(instance):
                errs.extend(validate_instance(value, item_schema, root, f"{path}[{i}]"))
    elif expected == "string":
        if "minLength" in schema and len(instance) < schema["minLength"]:
            errs.append(f"{path} is shorter than {schema['minLength']}")
        if schema.get("pattern") and re.search(schema["pattern"], instance) is None:
            errs.append(f"{path} does not match {schema['pattern']}")
    elif expected in ("integer", "number") and "minimum" in schema and instance < schema["minimum"]:
        errs.append(f"{path} is below {schema['minimum']}")
    return errs

def validate_card(card):
    return validate_instance(card, card_schema())

def _bare_skip(obj):
    return isinstance(obj, dict) and "skip" in obj and "sources" not in obj and "body" not in obj

def parse_card_reply(txt):
    """Return (card_or_skip, error). A schema-valid card wins. A skip object is
    not a schema failure. Think blocks are ignored. The first balanced object
    that validates is the card."""
    if txt is None or not str(txt).strip():
        return None, "empty reply"
    objs, err = collect_objects(txt)
    if not objs:
        return None, err or "no JSON object found"
    schema = card_schema()
    first_errs = None
    for obj in objs:
        if _bare_skip(obj):
            continue
        errs = validate_instance(obj, schema)
        if not errs:
            return obj, None
        if first_errs is None:
            first_errs = errs
    for obj in objs:
        if "skip" in obj:
            return obj, None
    if first_errs:
        msg = "card schema: " + "; ".join(first_errs[:8])
        if err:  # e.g. the card object itself was cut off; say so in the retry prompt
            msg += "; " + err
        return None, msg
    return None, err or "no JSON object found"

def obtain_card(ask_fn, key, model, prompt, sid, timeout, cap, cid, max_tokens, system, what="author", budget_left=None):
    """One author call, then at most one format retry that quotes the parse error."""
    calls = []

    def once(label, message, tokens):
        code, txt, usage = ask_fn(
            key, model, message, sid, timeout, cap=cap, system=system,
            max_tokens=tokens, json_mode=True, what=label,
        )
        calls.append({"what": label, "code": code, "usage": usage or {}, "text": txt})
        return code, txt

    code, txt = once(what, prompt, max_tokens)
    if code != "200":
        why = "cost cap" if code == "cap" else f"gateway {code}"
        return None, why, calls, txt
    card, err = parse_card_reply(txt)
    if card is not None:
        return card, None, calls, txt
    if budget_left is not None and budget_left() <= TOPIC_FLOOR:
        return None, err, calls, txt
    # Same budget as the author call: a long card (Maori and English texts
    # side by side) cut at 2048 tokens came back as a truncated object.
    retry_tokens = int(max_tokens or 4096)
    code2, txt2 = once(what + "_json_retry", format_reminder(cid, err), retry_tokens)
    if code2 != "200":
        return None, err, calls, txt2
    card2, err2 = parse_card_reply(txt2)
    return card2, err2, calls, txt2

REVIEW_SYSTEM = """You are the fact-check reviewer for one Galion Knowledge card.
Reply with exactly one JSON object and nothing else: {"ok": true or false, "problems": ["short description of each problem"]}.
No prose, no markdown fence, no think or reasoning block. Use only the source texts in the user message. Any language is allowed. UTF-8."""

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
        # 7,000 chars stopped inside the front matter of long papers and judgments
        # (Michelson-Morley, Meselson-Stahl, Pringle), so true sentences were dropped.
        flat = " ".join(txt.split())[:REVIEW_SOURCE_CHARS]
        parts.append(f"=== {url}\n{flat}")
    return "\n\n".join(parts)

def review_card(args, key, card, sid, call_cap):
    prompt = REVIEW.format(card=json.dumps({k: card.get(k) for k in ("title", "summary", "body", "said_by", "as_of_date", "sources")}, ensure_ascii=False, indent=1),
                           sources=source_texts(card))
    tokens = min(int(getattr(args, "max_tokens", 2048)), 2048)
    code, txt, usage = ask_ready(
        key, args.review_model, prompt, sid, 300, cap=call_cap,
        system=REVIEW_SYSTEM, max_tokens=tokens, json_mode=True,
    )
    j = extract_json(txt, prefer=("ok",)) if code == "200" else None
    if not isinstance(j, dict) or "ok" not in j:
        why = "reviewer gave no JSON" if code == "200" else f"reviewer gateway {code}"
        j = {"ok": False, "problems": [why]}
    return j, usage or {}

PLAN = """You are Galion Research planning core cards for the Galion Knowledge base (knowledge.galion.app), area: {area_desc}.
Propose {n} NEW card topics a person needs before the specialist shards: one claim each (a definition, a theorem, a law, a measured constant, an official text's operative sentence, a primary historical document's key sentence).
Each topic must name its primary source precisely (DOI'd paper, standard, statute, official institution page, primary text edition, raw dataset). No Wikipedia or derivatives.
Do NOT repeat any of these existing card titles:
{existing}
Answer ONLY with a JSON array: [{{"slug": "lowercase-hyphen-slug-with-year", "topic": "one sentence naming the claim and its primary source"}}]"""

def jacc(a, b):
    ta = set(re.findall(r"[a-z0-9]{3,}", a.lower())); tb = set(re.findall(r"[a-z0-9]{3,}", b.lower()))
    return len(ta & tb) / max(1, len(ta | tb))

def parse_plan_array(txt):
    t = strip_model_wrappers(txt or "")
    i, j = t.find("["), t.rfind("]")
    if i < 0 or j < i:
        return []
    chunk = t[i:j + 1]
    for cand in (chunk, repair_json(chunk)):
        try:
            arr = json.loads(cand)
        except json.JSONDecodeError:
            continue
        if isinstance(arr, list):
            return arr
    return []

def plan_topics(a, key, budget, area, desc, prefix, category, existing_titles, n):
    sid = f"gapfill-plan-{area}-{uuid.uuid4().hex[:6]}"
    ok, _ = budget.reserve_slot(sid)
    if not ok: return []
    ex = "\n".join("- " + t for t in existing_titles[-400:])
    tracker = CallCost(sid)
    code, txt, usage = ask_ready(
        key, a.model, PLAN.format(area_desc=desc, n=n, existing=ex), sid, 300,
        cap=getattr(a, "card_cap", CARD_CAP), max_tokens=getattr(a, "max_tokens", 4096),
    )
    _wait_spend()
    usd = tracker.charge(usage)
    budget.commit(sid, usd, {"plan": area, "what": "plan", "usage": usage_brief(usage)})
    arr = parse_plan_array(txt) if code == "200" else []
    out = []
    for x in arr:
        if not isinstance(x, dict):
            continue
        slug = re.sub(r"[^a-z0-9-]+", "-", str(x.get("slug", "")).lower()).strip("-")[:60]
        topic = str(x.get("topic", ""))
        if not slug or not topic: continue
        if any(jacc(topic, et) > 0.5 for et in existing_titles): continue
        out.append({"cid": f"{prefix}.{slug}", "topic": topic, "category": category, "area": area})
    return out

def _fail_result(err, calls):
    last = calls[-1]["code"] if calls else None
    if last == "cap":
        return "cost_cap"
    if err and str(err).startswith("card schema:"):
        return "invalid_card"
    return "no_json"

def run_topic(args, key, budget, t, existing, out_dir, log):
    sid = f"gapfill-{args.run}-{t['cid'].split('.')[-1]}-{uuid.uuid4().hex[:6]}"
    ok, spent_now = budget.reserve_slot(sid)
    if not ok:
        log({"topic": t["cid"], "result": "budget_stop", "spent": spent_now}); return "stop"
    model = t.get("model") or args.model
    topic_cap = float(getattr(args, "topic_cap", TOPIC_CAP))
    card_cap = float(getattr(args, "card_cap", CARD_CAP))
    max_tokens = int(getattr(args, "max_tokens", 4096))
    t0 = time.time()
    spent = {"usd": 0.0}
    calls = []
    trackers = {}
    last_total = spent_now

    def begin(call_sid):
        if call_sid not in trackers:
            trackers[call_sid] = CallCost(call_sid)
        return trackers[call_sid]

    def finish(call_sid, usage, what, model_name, http):
        nonlocal last_total
        _wait_spend()
        usd = begin(call_sid).charge(usage)
        spent["usd"] = round(spent["usd"] + usd, 6)
        last_total = budget.commit(call_sid, usd, {
            "topic": t["cid"], "model": model_name, "what": what, "usage": usage_brief(usage),
        })
        calls.append({"what": what, "session": call_sid, "usd": usd, "http": http, "usage": usage_brief(usage)})
        return usd

    def paying_ask(key, model_name, prompt, call_sid, timeout, cap=None, **kw):
        what = kw.pop("what", "call")
        remaining = round(topic_cap - spent["usd"], 6)
        if remaining <= TOPIC_FLOOR:
            return "cap", None, {}
        hard = min(card_cap, remaining)
        if cap is not None:
            hard = min(hard, cap)
        begin(call_sid)
        code, txt, usage = ask_ready(key, model_name, prompt, call_sid, timeout, cap=hard, **kw)
        finish(call_sid, usage, what, model_name, code)
        return code, txt, usage

    prompt = PROMPT.format(topic=t["topic"], cid=t["cid"], category=t.get("category", "mathematics"),
                           area=t.get("area", "math"), today=today())
    card, err, card_calls, raw = obtain_card(
        paying_ask, key, model, prompt, sid, args.timeout, card_cap, t["cid"],
        max_tokens, SYSTEM, what="author", budget_left=lambda: topic_cap - spent["usd"],
    )
    rec = {"topic": t["cid"], "model": model, "session": sid,
           "http": card_calls[-1]["code"] if card_calls else None,
           "usd": round(spent["usd"], 6), "total_usd": last_total,
           "secs": round(time.time() - t0, 1), "calls": calls,
           "usage": calls[-1]["usage"] if calls else {}}
    if card is None:
        rec.update(result=_fail_result(err, card_calls), parse_error=err, raw=(raw or "")[:500],
                   usd_total_incl_review=round(spent["usd"], 6))
        log(rec); return "fail"
    if "skip" in card:
        rec.update(result="skipped_by_agent", why=card.get("skip"),
                   usd_total_incl_review=round(spent["usd"], 6))
        log(rec); return "skip"
    good, probs, evid = verify_card(card, existing)
    rec["rounds"] = []
    for rnd in range(int(getattr(args, "revisions", 1)) + 1):
        if good and not getattr(args, "no_review", False):
            remaining = round(topic_cap - spent["usd"], 6)
            if remaining <= TOPIC_FLOOR:
                good = False
                probs = [f"topic cost cap ${topic_cap:.2f} reached before review"]
            else:
                rv_sid = f"{sid}-rv{rnd}"
                begin(rv_sid)
                rv, usage = review_card(args, key, card, rv_sid, call_cap=min(card_cap, remaining))
                usd = finish(rv_sid, usage, "review", args.review_model, None)
                rec["rounds"].append({"review": rv, "usd": usd})
                if not rv.get("ok"):
                    good = False
                    probs = ["review: " + x for x in (rv.get("problems") or ["reviewer did not confirm"])]
        if good or rnd == args.revisions:
            break
        remaining = round(topic_cap - spent["usd"], 6)
        if remaining < 0.02:
            probs.append(f"topic cost cap ${topic_cap:.2f} reached, no revision")
            break
        fix = ("The checker and the fact-check reviewer found these problems in your card:\n- " + "\n- ".join(probs) +
               "\nFix them: delete or reword every unsupported sentence so that it says only what the cited sources (as fetched) support; "
               "you may verify an extra primary source with source_check and add it. Output ONLY the corrected card JSON (same id), or {\"skip\": \"reason\"}.")
        c2, _, _, _ = obtain_card(
            paying_ask, key, model, fix, sid, args.timeout, min(card_cap, remaining),
            t["cid"], max_tokens, SYSTEM, what="revision",
            budget_left=lambda: topic_cap - spent["usd"],
        )
        if not c2 or "skip" in c2:
            probs.append("revision gave no card" if not c2 else "revision skipped: " + str(c2.get("skip")))
            break
        card = c2
        good, probs, evid = verify_card(card, existing)
    rec["usd"] = round(spent["usd"], 6)
    rec["usd_total_incl_review"] = round(spent["usd"], 6)
    rec["total_usd"] = last_total
    rec["secs"] = round(time.time() - t0, 1)
    rec["calls"] = calls
    rec.update(evidence=evid, problems=probs)
    if good:
        card["id"] = t["cid"]
        write_json(os.path.join(out_dir, "kept", t["cid"] + ".json"), card)
        rec["result"] = "kept"
    else:
        write_json(os.path.join(out_dir, "dropped", t["cid"] + ".json"), {"card": card, "problems": probs})
        rec["result"] = "dropped"
    log(rec); return rec["result"]

def _load_id_set(path):
    if not path:
        return set()
    with open(path, encoding="utf-8") as f:
        return set(f.read().split())

def main():
    global RUN_LIMIT, RUN_STALE
    ap = argparse.ArgumentParser()
    ap.add_argument("--topics", required=True); ap.add_argument("--run", required=True)
    ap.add_argument("--model", default="deepseek-ai/DeepSeek-V4.1-Flash-1017")
    ap.add_argument("--workers", type=int, default=2); ap.add_argument("--timeout", type=int, default=900)
    ap.add_argument("--existing-ids", default=""); ap.add_argument("--cap", type=float, default=25.0)
    ap.add_argument("--stop-at", type=float, default=24.0); ap.add_argument("--reserve", type=float, default=0.30)
    ap.add_argument("--card-cap", type=float, default=CARD_CAP, help="USD cap for one gateway call (default 0.08)")
    ap.add_argument("--topic-cap", type=float, default=TOPIC_CAP, help="USD cap for one topic, all calls (default 0.10)")
    ap.add_argument("--max-tokens", type=int, default=4096, help="max_tokens sent on each gateway completion")
    ap.add_argument("--max-concurrent", type=int, default=3, help="in-flight gateway runs; hermes-rs allows 3")
    ap.add_argument("--reverify", action="store_true", help="re-check dropped cards of this run, no model calls")
    ap.add_argument("--review-model", default="zai-org/GLM-5.3-Flash")
    ap.add_argument("--no-review", action="store_true")
    ap.add_argument("--revisions", type=int, default=1)
    ap.add_argument("--review-only", default="", help="dir of card JSON files: run only the reviewer on them")
    a = ap.parse_args()
    RUN_LIMIT = max(1, a.max_concurrent)
    RUN_STALE = max(60, a.timeout + 300)
    if a.reverify:
        out = os.path.join(STATE, "runs", a.run)
        existing = _load_id_set(a.existing_ids)
        for f in sorted(os.listdir(out + "/dropped")):
            with open(os.path.join(out, "dropped", f), encoding="utf-8") as fh:
                d = json.load(fh)
            good, probs, evid = verify_card(d["card"], existing)
            print(f, "KEPT" if good else "DROP", "; ".join(probs)[:300])
            if good:
                write_json(os.path.join(out, "kept", f), d["card"])
                os.replace(os.path.join(out, "dropped", f), os.path.join(out, "dropped", f + ".reverified-kept"))
        return
    if a.workers > RUN_LIMIT:
        print(f"workers={a.workers}; gateway allows {RUN_LIMIT} concurrent runs; extra workers wait", flush=True)
    key = api_key()
    budget = Budget(a.cap, a.stop_at, a.reserve)
    if a.review_only:
        for f in sorted(os.listdir(a.review_only)):
            if not f.endswith(".json"): continue
            with open(os.path.join(a.review_only, f), encoding="utf-8") as fh:
                c = json.load(fh)
            sid = f"gapfill-{a.run}-rv-{f[:-5].split('.')[-1]}-{uuid.uuid4().hex[:6]}"
            ok, _ = budget.reserve_slot(sid)
            if not ok: print("budget stop"); break
            with budget._lock() as b: b["inflight"].pop(sid, None)
            tracker = CallCost(sid)
            rv, usage = review_card(a, key, c, sid, call_cap=min(a.card_cap, a.topic_cap))
            _wait_spend()
            usd = tracker.charge(usage)
            budget.commit(sid, usd, {"review_of": c.get("id"), "what": "review", "usage": usage_brief(usage)})
            print(json.dumps({"card": f, "usd": round(usd, 5), "review": rv}, ensure_ascii=False))
        return
    out = os.path.join(STATE, "runs", a.run); os.makedirs(out + "/kept", exist_ok=True); os.makedirs(out + "/dropped", exist_ok=True)
    existing = _load_id_set(a.existing_ids)
    with open(a.topics, encoding="utf-8") as fh:
        topics = [json.loads(l) for l in fh if l.strip()]
    lk = threading.Lock(); logf = open(os.path.join(out, "log.jsonl"), "a", encoding="utf-8")
    def log(r):
        with lk:
            logf.write(json.dumps(r, ensure_ascii=False) + "\n"); logf.flush()
            extra = ""
            if r.get("parse_error"):
                extra = " " + str(r["parse_error"]).replace("\n", " ")[:160]
            print(f"{now()} {r.get('topic')} {r.get('model','')} {r.get('result')} ${r.get('usd',0):.4f} total=${r.get('total_usd',r.get('spent',0))}{extra}", flush=True)
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

_EMBEDDED_SCHEMA = r'''{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://knowledge.galion.app/v2/schema.json",
  "title": "Galion Knowledge card",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "id",
    "title",
    "section",
    "category",
    "body",
    "claim_type",
    "sources",
    "evidence_strength",
    "said_by",
    "as_of_date",
    "status",
    "contested_views",
    "related"
  ],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^[a-z0-9]+([.-][a-z0-9]+)*$",
      "description": "Slug. Must match the file name. Hyphens are the usual form. Dots are accepted so an existing draft pack still builds."
    },
    "title": { "type": "string", "minLength": 1 },
    "section": {
      "type": "string",
      "minLength": 1,
      "description": "Use world, horbm, or diary, matching the folder. Another word in an existing draft is accepted and the card is filed under its folder."
    },
    "category": { "type": "string", "minLength": 1 },
    "summary": { "type": "string", "minLength": 1 },
    "body": { "type": "string", "minLength": 1 },
    "claim_type": { "enum": ["fact", "interpretation", "opinion", "contested"] },
    "sources": {
      "type": "array",
      "items": { "$ref": "#/$defs/source" }
    },
    "evidence_strength": { "enum": ["none", "weak", "moderate", "strong"] },
    "said_by": { "type": "string" },
    "as_of_date": {
      "type": "string",
      "pattern": "^$|^-?[0-9]{1,6}(-[0-9]{2}){0,2}$"
    },
    "status": { "type": "string", "minLength": 1 },
    "contested_views": {
      "type": "array",
      "items": { "$ref": "#/$defs/contested" }
    },
    "related": {
      "type": "array",
      "items": { "type": "string", "minLength": 1 }
    },
    "aliases": {
      "type": "array",
      "items": { "type": "string", "minLength": 1 },
      "description": "Other ids for this same card, including dotted ids. The site serves each alias at /article/<alias>/."
    },
    "tags": {
      "type": "array",
      "items": { "type": "string", "minLength": 1 }
    },
    "read_time_min": { "type": "integer", "minimum": 1 },
    "legacy": { "$ref": "#/$defs/legacy" },
    "history": {
      "type": "array",
      "description": "Append-only record of later changes. Do not delete entries. Do not delete the card file.",
      "items": { "$ref": "#/$defs/history" }
    }
  },
  "$defs": {
    "source": {
      "type": "object",
      "additionalProperties": false,
      "required": ["title", "url", "author", "date", "accessed"],
      "properties": {
        "title": { "type": "string", "minLength": 1 },
        "url": {
          "type": "string",
          "pattern": "^$|^https?://[^\\s]+$"
        },
        "author": { "type": "string" },
        "date": { "type": "string" },
        "accessed": {
          "type": "string",
          "pattern": "^$|^[0-9]{4}-[0-9]{2}-[0-9]{2}$"
        },
        "note": { "type": "string" }
      }
    },
    "contested": {
      "type": "object",
      "additionalProperties": false,
      "required": ["label", "summary", "status"],
      "properties": {
        "label": { "type": "string", "minLength": 1 },
        "summary": { "type": "string", "minLength": 1 },
        "status": { "type": "string", "minLength": 1 },
        "sources": {
          "type": "array",
          "items": { "$ref": "#/$defs/source" }
        }
      }
    },
    "legacy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "v1_id": { "type": "string" },
        "v1_article_id": { "type": "string" },
        "v1_slug": { "type": "string" },
        "v1_category": { "type": "string" },
        "v1_truth_score": { "type": "number" },
        "v1_source_count_displayed": { "type": "number" },
        "v1_last_verified_displayed": { "type": "string" },
        "note": { "type": "string" }
      }
    },
    "history": {
      "type": "object",
      "additionalProperties": false,
      "required": ["date", "change", "note"],
      "properties": {
        "date": {
          "type": "string",
          "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}$"
        },
        "change": { "type": "string", "minLength": 1 },
        "from": { "type": "string" },
        "to": { "type": "string" },
        "note": { "type": "string", "minLength": 1 }
      }
    }
  }
}
'''

if __name__ == "__main__":
    main()
