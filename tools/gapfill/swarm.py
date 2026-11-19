#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Galion Labs
"""Swarm runner for the Galion Research gap-fill.

Workers pull topics from JSONL files and call gapfill.run_topic. The shared
budget ledger is gapfill.Budget (one file, fcntl lock) so concurrent workers
cannot reserve past the cap. The gateway allows max_concurrent_runs of 3 and
that setting is fixed, so the default is 2 workers: one run slot stays free
for the owner's chats. Extra workers block on a semaphore and queue; they are
not an error.

A call cut off by a gateway restart (connection drop, 502, 503, 504) is
retried once and is not counted as a failure. 429 and other 5xx responses
back off and retry. Per-topic state files make a crash resumable: done and
failed topics are skipped, a topic left "running" is tried again.

Stdlib only. Topics and cards are UTF-8 and may be in any language.
"""
import argparse
import datetime
import fcntl
import json
import os
import queue
import random
import sys
import threading
import time

import gapfill

# Gateway config on Titan is max_concurrent_runs: 3 and is not editable.
# One slot is left for the owner's own chats.
DEFAULT_GATEWAY_CONCURRENCY = 3
DEFAULT_OWNER_SLOTS = 1
DEFAULT_WORKERS = 2
DEFAULT_SESSION_CAP = 5.0
DEFAULT_DAILY_CAP = 21.50
DEFAULT_MAX_CALLS = 2000

TERMINAL = {"kept", "dropped", "failed", "skipped"}
RESULT_STATUS = {"kept": "kept", "dropped": "dropped", "fail": "failed", "skip": "skipped"}
# A restart drops the socket or the proxy answers 502/503/504. 500 is an
# application error: back off, but it is not a restart.
RESTART_HTTP = {"502", "503", "504"}
RESTART_ERRORS = {
    "err:ConnectionError",
    "err:RemoteDisconnected",
    "err:ConnectionResetError",
    "err:ConnectionAbortedError",
    "err:BrokenPipeError",
    "err:IncompleteRead",
    "err:BadStatusLine",
    "err:OSError",
    "err:ConnectionRefusedError",
    "err:TimeoutError",
}
LIMIT_REASONS = {"daily_calls", "daily_usd"}
# A 200 reply with no model output (gapfill.GATEWAY_ERROR_CODES) is retried this
# many times with backoff; after this many topics in a row end that way the run
# pauses (the topics stay pending) instead of burning through the queue.
DEFAULT_GATEWAY_RETRIES = 3
DEFAULT_MAX_GATEWAY_ERRORS = 3
DEFAULT_GATEWAY_ATTEMPTS = 3   # a topic is marked failed after this many gateway-error attempts
# hermes-rs HERMES_RS_DAILY_CALL_CAP on Titan (counts every provider call,
# tool steps included, per Zagreb day). Calls kept free for the owner's chats.
DEFAULT_GATEWAY_CALL_CAP = 2000
DEFAULT_GATEWAY_CALL_RESERVE = 200
HERE = os.path.dirname(os.path.abspath(__file__))


def utf8_stdio():
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if not reconfigure:
            continue
        try:
            reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass


def inflight_limit(workers, gateway_concurrency, owner_slots):
    """How many gateway runs this process may hold at once.

    workers may be larger than the gateway allows. The extra workers queue.
    """
    slots = gateway_concurrency - owner_slots
    if slots < 1:
        raise SystemExit("owner slots leave no gateway run for workers")
    return max(1, min(workers, slots))


def is_restart_code(code):
    if code in RESTART_HTTP:
        return True
    if code in RESTART_ERRORS:
        return True
    return isinstance(code, str) and code.startswith("err:") and "Reset" in code


def is_5xx(code):
    return isinstance(code, str) and code.isdigit() and 500 <= int(code) <= 599


def zagreb_day(at):
    if not at:
        return ""
    text = str(at)
    try:
        dt = datetime.datetime.fromisoformat(text)
    except ValueError:
        return text[:10]
    if dt.tzinfo is None:
        dt = dt.astimezone()
    from zoneinfo import ZoneInfo
    return dt.astimezone(ZoneInfo("Europe/Zagreb")).date().isoformat()


class FileLock:
    """fcntl lock. Each thread owns its own descriptor, so one FileLock object
    can be entered from several workers without closing another worker's fd."""

    def __init__(self, path):
        self.path = path
        self._local = threading.local()

    def __enter__(self):
        parent = os.path.dirname(self.path)
        if parent:
            os.makedirs(parent, exist_ok=True)
        handle = open(self.path, "a+")
        try:
            fcntl.flock(handle, fcntl.LOCK_EX)
        except Exception:
            handle.close()
            raise
        self._local.handle = handle
        return handle

    def __exit__(self, *exc):
        handle = self._local.handle
        self._local.handle = None
        try:
            fcntl.flock(handle, fcntl.LOCK_UN)
        finally:
            handle.close()


def atomic_write(path, text):
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(text)
    os.replace(tmp, path)


class CallLedger:
    """Daily gateway call count, shared across workers via the same file lock."""

    def __init__(self, path, max_calls):
        self.path = path
        self.max_calls = max_calls

    def _read(self):
        try:
            with open(self.path, encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            data = {}
        day = gapfill.today()
        if data.get("date") != day or not isinstance(data.get("n"), int):
            return {"date": day, "n": 0}
        return data

    def _write(self, data):
        atomic_write(self.path, json.dumps(data, indent=1) + "\n")

    def remaining(self):
        with FileLock(self.path + ".lock"):
            return self.max_calls - self._read()["n"]

    def try_increment(self):
        with FileLock(self.path + ".lock"):
            data = self._read()
            if data["n"] >= self.max_calls:
                return False
            data["n"] += 1
            self._write(data)
            return True


class TopicState:
    def __init__(self, directory):
        self.directory = directory
        os.makedirs(directory, exist_ok=True)
        self._guard = FileLock(os.path.join(directory, ".lock"))

    def path(self, cid):
        return os.path.join(self.directory, cid + ".json")

    def read(self, cid):
        try:
            with open(self.path(cid), encoding="utf-8") as f:
                data = json.load(f)
        except FileNotFoundError:
            return None
        except Exception:
            return None
        return data if isinstance(data, dict) else None

    def update(self, cid, **fields):
        with self._guard:
            cur = self.read(cid) or {"cid": cid, "attempts": 0}
            cur.update(fields)
            cur["cid"] = cid
            cur["updated"] = gapfill.now()
            atomic_write(self.path(cid), json.dumps(cur, ensure_ascii=False, indent=2) + "\n")
            return cur


def safe_cid(cid):
    if not cid or cid in (".", ".."):
        return False
    if os.path.basename(cid) != cid:
        return False
    if "\x00" in cid:
        return False
    return True


def load_topics(path):
    """Load topic objects from one JSONL file or every *.jsonl in a directory."""
    if os.path.isdir(path):
        files = [
            os.path.join(path, name)
            for name in sorted(os.listdir(path))
            if name.endswith(".jsonl")
        ]
    elif os.path.isfile(path):
        files = [path]
    else:
        raise SystemExit(f"topics path not found: {path}")
    topics = []
    seen = set()
    for fp in files:
        with open(fp, encoding="utf-8") as f:
            for lineno, line in enumerate(f, 1):
                if not line.strip():
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError as exc:
                    print(f"warning: {fp}:{lineno}: {exc}", file=sys.stderr)
                    continue
                if not isinstance(obj, dict):
                    print(f"warning: {fp}:{lineno}: expected an object", file=sys.stderr)
                    continue
                cid = str(obj.get("cid") or "").strip()
                if not safe_cid(cid) or "topic" not in obj:
                    print(f"warning: {fp}:{lineno}: need a safe cid and a topic", file=sys.stderr)
                    continue
                if cid in seen:
                    continue
                seen.add(cid)
                obj["cid"] = cid
                obj["topic"] = str(obj["topic"])
                topics.append(obj)
    return topics


def topic_disposition(out_dir, state, cid):
    """Return kept, dropped, failed, skipped, interrupted, or pending.

    A card file on disk wins over a stale 'running' state: the write of the
    card is the commit point, and a crash after that is still done.
    """
    kept = os.path.join(out_dir, "kept", cid + ".json")
    dropped = os.path.join(out_dir, "dropped", cid + ".json")
    st = state.read(cid) or {}
    status = st.get("status") or ""
    if os.path.isfile(kept) or status == "kept":
        return "kept"
    if os.path.isfile(dropped) or status == "dropped":
        return "dropped"
    if status in ("failed", "skipped"):
        return status
    if status == "running":
        return "interrupted"
    return "pending"


def configure_paths(args):
    os.makedirs(args.state, exist_ok=True)
    gapfill.STATE = args.state
    gapfill.BUDGET = os.path.join(args.state, "budget.json")
    if args.gateway:
        gapfill.GW = args.gateway
    if args.env:
        gapfill.ENVF = args.env
    if args.spend:
        gapfill.SPEND = args.spend


def align_limits(budget, cap, stop_at):
    stop_at = min(float(stop_at), float(cap))
    with budget._lock() as b:
        b["cap_usd"] = float(cap)
        b["stop_at_usd"] = stop_at
        b.setdefault("spent_usd", 0.0)
        b.setdefault("entries", [])
        b.setdefault("inflight", {})
    return stop_at


def release_stale_inflight(budget, run):
    """Drop reservations from a previous process of this same run.

    A crash between reserve_slot and commit would otherwise hold `reserve`
    until the cap looks full. Other run names are left alone.
    """
    prefix = f"gapfill-{run}-"
    with budget._lock() as b:
        inflight = b.get("inflight") or {}
        stale = [k for k in list(inflight) if str(k).startswith(prefix)]
        for key in stale:
            inflight.pop(key, None)
        b["inflight"] = inflight
    return stale


def ledger_room(budget, daily_cap):
    """'ok', 'wait' (inflight reservations fill the cap), or 'hard'."""
    with budget._lock() as b:
        spent = float(b.get("spent_usd") or 0.0)
        reserve = float(budget.reserve)
        n = len(b.get("inflight") or {})
        stop = min(float(b.get("stop_at_usd")), float(b.get("cap_usd")))
        day = gapfill.today()
        today = 0.0
        for entry in b.get("entries") or []:
            if zagreb_day(entry.get("at")) == day:
                today += float(entry.get("usd") or 0.0)
    if spent + reserve > stop or today + reserve > daily_cap:
        return "hard"
    if spent + reserve * (n + 1) > stop or today + reserve * (n + 1) > daily_cap:
        return "wait"
    return "ok"


def gateway_calls_today(spend_path=None):
    """Provider calls the gateway counted today (Zagreb day), from its spend file.

    None when the file is missing or written for another day."""
    try:
        with open(spend_path or gapfill.SPEND, encoding="utf-8") as handle:
            data = json.load(handle)
    except Exception:
        return None
    if not isinstance(data, dict) or data.get("day") != gapfill.today():
        return None
    try:
        return int(data.get("day_calls") or 0)
    except (TypeError, ValueError):
        return None


def gateway_call_room(cap, reserve, spend_path=None):
    """False when the gateway's own daily provider call cap (minus the owner's
    reserve) is used up. cap 0 turns the check off."""
    if not cap:
        return True
    used = gateway_calls_today(spend_path)
    if used is None:
        return True
    return used < max(1, cap - reserve)


def spent_today(budget):
    with budget._lock() as b:
        day = gapfill.today()
        total = 0.0
        for entry in b.get("entries") or []:
            if zagreb_day(entry.get("at")) == day:
                total += float(entry.get("usd") or 0.0)
        return total


class GatewayGuard:
    """Backoff, caps, and one restart retry around gapfill.ask.

    The worker holds the concurrency semaphore for the whole topic, so this
    wrapper does not take it again (that would deadlock when the limit is 1).
    """

    def __init__(self, run, calls, session_cap, daily_cap, backoff_initial, backoff_cap,
                 gateway_retries=DEFAULT_GATEWAY_RETRIES):
        self.gateway_retries = gateway_retries
        self.run = run
        self.calls = calls
        self.session_cap = session_cap
        self.daily_cap = daily_cap
        self.backoff_initial = backoff_initial
        self.backoff_cap = backoff_cap

    def pause(self, attempt):
        base = self.backoff_initial * (2 ** min(attempt, 6))
        delay = min(self.backoff_cap, base)
        if delay > 0:
            delay *= 0.5 + random.random() * 0.5
        time.sleep(delay)

    def _blocked(self, sid):
        try:
            session_spent = gapfill.session_usd(sid)
        except Exception:
            session_spent = 0.0
        if session_spent >= self.session_cap:
            return "cap", None, {"reason": "session"}
        if spent_today(self.run.budget) >= self.daily_cap:
            return "cap", None, {"reason": "daily_usd"}
        return None

    def call(self, orig, key, model, prompt, sid, timeout, cap, **kw):
        restarts = 0
        transient = 0
        gw_errors = 0
        while True:
            blocked = self._blocked(sid)
            if blocked:
                return blocked
            if not self.calls.try_increment():
                return "cap", None, {"reason": "daily_calls"}
            code, txt, usage = orig(key, model, prompt, sid, timeout, cap=cap, **kw)
            if code in gapfill.GATEWAY_ERROR_CODES:
                reason = (usage or {}).get("reason")
                if reason in LIMIT_REASONS:
                    # The gateway's own daily cap: retrying cannot help today.
                    return "cap", txt, dict(usage or {}, reason=reason)
                if reason == "session":
                    return code, txt, usage
                gw_errors += 1
                if gw_errors > self.gateway_retries:
                    return code, txt, usage
                self.pause(gw_errors)
                continue
            if code == "429":
                transient += 1
                if transient > 40:
                    return code, txt, usage
                self.pause(transient)
                continue
            if is_restart_code(code):
                if restarts >= 1:
                    return code, txt, usage
                restarts += 1
                with self.run.lock:
                    self.run.restarts += 1
                self.pause(0)
                continue
            if is_5xx(code):
                transient += 1
                if transient > 3:
                    return code, txt, usage
                self.pause(transient)
                continue
            return code, txt, usage


def install_guard(guard):
    if getattr(gapfill.ask, "_swarm", False):
        orig = gapfill._swarm_orig_ask
    else:
        gapfill._swarm_orig_ask = gapfill.ask
        orig = gapfill.ask

    def wrapped(key, model, prompt, sid, timeout, cap=None, **kw):
        return guard.call(orig, key, model, prompt, sid, timeout, cap, **kw)

    wrapped._swarm = True
    gapfill.ask = wrapped
    return wrapped


class Reservations:
    """Session ids this worker reserved and has not committed yet.

    gapfill reserves a slot before the gateway call and commits the real cost
    after it. If the worker dies in between, that reservation stays in the
    ledger and every other worker waits until the cap looks full. release_open
    commits whatever the session actually cost and drops the reservation.
    """

    def __init__(self):
        self._local = threading.local()

    def note_reserve(self, sid, ok):
        if not ok:
            return
        sids = getattr(self._local, "sids", None)
        if sids is None:
            self._local.sids = sids = []
        sids.append(sid)

    def note_commit(self, sid):
        sids = getattr(self._local, "sids", None)
        if sids and sid in sids:
            sids.remove(sid)

    def release_open(self, budget):
        sids = list(getattr(self._local, "sids", None) or ())
        self._local.sids = []
        for sid in sids:
            try:
                usd = gapfill.session_cost(sid)
            except Exception:
                usd = 0.0
            budget.commit(sid, usd, {"what": "worker abort"})


_budget_holder = {"tracker": None}


def install_budget_tracker(tracker):
    """Count reservations around gapfill.Budget without editing gapfill.py.

    Re-installs if a test replaced the methods. The wrappers call whatever
    methods are current, so a test double can sit underneath.
    """
    _budget_holder["tracker"] = tracker
    if getattr(gapfill.Budget.reserve_slot, "_swarm_budget", False):
        return
    orig_reserve = gapfill.Budget.reserve_slot
    orig_commit = gapfill.Budget.commit

    def reserve(self, sid):
        ok, spent = orig_reserve(self, sid)
        active = _budget_holder["tracker"]
        if active is not None:
            active.note_reserve(sid, ok)
        return ok, spent

    def commit(self, sid, usd, meta):
        total = orig_commit(self, sid, usd, meta)
        active = _budget_holder["tracker"]
        if active is not None:
            active.note_commit(sid)
        return total

    reserve._swarm_budget = True
    commit._swarm_budget = True
    gapfill.Budget.reserve_slot = reserve
    gapfill.Budget.commit = commit


class Progress:
    def __init__(self):
        self.done = 0
        self.kept = 0
        self.dropped = 0
        self.failed = 0
        self.skipped = 0

    def add(self, result):
        self.done += 1
        if result == "kept":
            self.kept += 1
        elif result == "dropped":
            self.dropped += 1
        elif result == "skip":
            self.skipped += 1
        else:
            self.failed += 1

    def line(self, spent, restarts, topic="", result=""):
        text = (
            f"progress done={self.done} kept={self.kept} dropped={self.dropped} "
            f"failed={self.failed} skipped={self.skipped} spent=${spent:.4f} restarts={restarts}"
        )
        if topic:
            text += f" topic={topic} result={result}"
        return text


class Swarm:
    def __init__(self, args, budget, calls, guard):
        self.args = args
        self.budget = budget
        self.calls = calls
        self.guard = guard
        self.out = os.path.join(args.state, "runs", args.run)
        self.state = TopicState(os.path.join(self.out, "state"))
        os.makedirs(os.path.join(self.out, "kept"), exist_ok=True)
        os.makedirs(os.path.join(self.out, "dropped"), exist_ok=True)
        self.logf = open(os.path.join(self.out, "log.jsonl"), "a", encoding="utf-8")
        self.lock = threading.Lock()
        self.stop = threading.Event()
        self.stop_reason = ""
        self.queue = queue.Queue()
        self.progress = Progress()
        self.results = []
        self.last = {}
        self.restarts = 0
        self.gateway_streak = 0
        self.reservations = Reservations()
        self.existing = set()
        self.key = ""
        limit = inflight_limit(args.workers, args.gateway_concurrency, args.owner_slots)
        self.limit = limit
        self.slots = threading.Semaphore(limit)

    def close(self):
        try:
            self.logf.close()
        except Exception:
            pass

    def log(self, rec):
        line = json.dumps(rec, ensure_ascii=False) + "\n"
        with self.lock:
            self.logf.write(line)
            self.logf.flush()
            topic = rec.get("topic")
            if topic:
                self.last[topic] = rec

    def note_stop(self, reason):
        with self.lock:
            if not self.stop_reason:
                self.stop_reason = reason
        self.stop.set()

    def record(self, topic, result, rec):
        cid = topic["cid"]
        status = RESULT_STATUS.get(result, "failed")
        if result not in RESULT_STATUS:
            result = "fail"
        problems = rec.get("problems") or []
        if not isinstance(problems, list):
            problems = [str(problems)]
        self.state.update(
            cid,
            status=status,
            result=rec.get("result") or result,
            http=rec.get("http"),
            usd=rec.get("usd"),
            why=rec.get("why"),
            problems=[str(p)[:300] for p in problems[:8]],
        )
        row = {
            "cid": cid,
            "result": result,
            "detail": rec.get("result") or result,
            "why": rec.get("why") or "",
            "problems": [str(p) for p in problems[:8]],
            "http": rec.get("http"),
        }
        spent = self.budget.spent()
        with self.lock:
            self.progress.add(result)
            self.results.append(row)
            text = self.progress.line(spent, self.restarts, cid, result)
        print(text, flush=True)

    def handle(self, topic):
        """Run one topic. Return 'wait', 'halt', or 'done'.

        The caller owns the gateway slot and releases it around a wait.
        """
        cid = topic["cid"]
        if not gateway_call_room(self.args.gateway_call_cap, self.args.gateway_call_reserve):
            self.queue.put(topic)
            self.note_stop("daily_calls")
            return "halt"
        if self.calls.remaining() < 1:
            self.queue.put(topic)
            self.note_stop("daily_calls")
            return "halt"
        room = ledger_room(self.budget, self.args.daily_cap)
        if room == "hard":
            self.queue.put(topic)
            self.note_stop("budget")
            return "halt"
        if room == "wait":
            self.queue.put(topic)
            return "wait"
        prev = self.state.read(cid) or {}
        self.state.update(cid, status="running", attempts=int(prev.get("attempts") or 0) + 1)
        try:
            result = gapfill.run_topic(
                self.args, self.key, self.budget, topic, self.existing, self.out, self.log
            )
        except Exception as exc:
            self.reservations.release_open(self.budget)
            self.record(topic, "fail", {"result": "error", "http": "err:" + type(exc).__name__, "problems": [str(exc)]})
            return "done"
        rec = {}
        with self.lock:
            rec = dict(self.last.get(cid) or {})
        if result == "stop":
            self.state.update(cid, status="pending")
            kind = ledger_room(self.budget, self.args.daily_cap)
            self.queue.put(topic)
            if kind == "hard":
                self.note_stop("budget")
                return "halt"
            return "wait"
        usage = rec.get("usage") if isinstance(rec.get("usage"), dict) else {}
        reason = usage.get("reason")
        if result == "fail" and reason in LIMIT_REASONS:
            self.state.update(cid, status="pending", note=reason)
            self.note_stop(reason)
            return "halt"
        if result == "fail" and rec.get("result") == "gateway_error":
            attempts = int((self.state.read(cid) or {}).get("attempts") or 1)
            with self.lock:
                self.gateway_streak += 1
                streak = self.gateway_streak
            if attempts < self.args.gateway_attempts:
                self.state.update(cid, status="pending", note="gateway_error",
                                  why=str(rec.get("why") or "")[:300])
                self.queue.put(topic)
                if streak >= self.args.max_gateway_errors:
                    self.note_stop("gateway_errors")
                    return "halt"
                return "wait"
            self.record(topic, result, rec)
            if streak >= self.args.max_gateway_errors:
                self.note_stop("gateway_errors")
                return "halt"
            return "done"
        with self.lock:
            self.gateway_streak = 0
        self.record(topic, result, rec)
        return "done"

    def worker(self):
        while not self.stop.is_set():
            try:
                topic = self.queue.get_nowait()
            except queue.Empty:
                return
            if self.stop.is_set():
                self.queue.put(topic)
                return
            self.slots.acquire()
            action = "done"
            try:
                if self.stop.is_set():
                    self.queue.put(topic)
                    return
                try:
                    action = self.handle(topic)
                except Exception as exc:
                    self.reservations.release_open(self.budget)
                    self.record(topic, "fail", {
                        "result": "error",
                        "http": "err:" + type(exc).__name__,
                        "problems": [str(exc)],
                    })
                    action = "done"
            finally:
                self.slots.release()
            if action == "halt":
                return
            if action == "wait":
                self.guard.pause(0)

    def summary_exit(self, requested):
        fails = 0
        print("=== test batch ===", flush=True)
        for row in self.results:
            mark, detail = batch_mark(row)
            if mark == "FAIL":
                fails += 1
            print(f"{mark}  {row['cid']}  {detail}", flush=True)
        spent = self.budget.spent()
        with self.lock:
            restarts = self.restarts
            text = self.progress.line(spent, restarts)
        print(text, flush=True)
        incomplete = self.progress.done < requested
        truth = any(row["result"] == "dropped" for row in self.results)
        no_card = any(row["result"] == "fail" for row in self.results)
        if fails or incomplete:
            why = []
            if truth:
                why.append("truth gate")
            if no_card:
                why.append("no card")
            if incomplete:
                why.append(self.stop_reason or "batch incomplete")
            print("result: FAIL (" + "; ".join(why) + ")", flush=True)
            return 1
        print("result: PASS", flush=True)
        return 0


def batch_mark(row):
    result = row["result"]
    if result == "kept":
        return "PASS", "truth gate passed"
    if result == "dropped":
        probs = "; ".join(str(p)[:180] for p in (row.get("problems") or []))
        return "FAIL", "truth gate: " + (probs or "rejected")
    if result == "skip":
        return "SKIP", "agent skip: " + str(row.get("why") or "")
    detail = row.get("detail") or result
    http = row.get("http")
    if http:
        detail = f"{detail} http={http}"
    return "FAIL", "no card: " + str(detail)


def positive_int(text):
    try:
        value = int(text)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("integer required") from exc
    if value < 1:
        raise argparse.ArgumentTypeError("must be >= 1")
    return value


def non_negative_int(text):
    try:
        value = int(text)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("integer required") from exc
    if value < 0:
        raise argparse.ArgumentTypeError("must be >= 0")
    return value


def parse_args(argv=None):
    ap = argparse.ArgumentParser(description="Swarm runner for Galion Research gap-fill")
    ap.add_argument(
        "--topics",
        default=os.path.join(HERE, "topics"),
        help="JSONL file, or a directory of JSONL files (default: tools/gapfill/topics)",
    )
    ap.add_argument("--run", required=True, help="run name; state lives under the state dir")
    ap.add_argument("--workers", type=positive_int, default=DEFAULT_WORKERS,
                    help="worker threads (default 2). May be 16 or more; extras queue")
    ap.add_argument("--gateway-concurrency", type=positive_int, default=DEFAULT_GATEWAY_CONCURRENCY,
                    help="gateway max_concurrent_runs (default 3, locked on the gateway)")
    ap.add_argument("--owner-slots", type=non_negative_int, default=DEFAULT_OWNER_SLOTS,
                    help="run slots left free for the owner's chats (default 1)")
    ap.add_argument("--gateway", default="", help="gateway base URL (default http://127.0.0.1:8642)")
    ap.add_argument("--model", default="deepseek-ai/DeepSeek-V4.1-Flash-1017")
    ap.add_argument("--review-model", default="zai-org/GLM-5.3-Flash")
    ap.add_argument("--timeout", type=positive_int, default=900)
    ap.add_argument("--cap", type=float, default=25.0, help="shared ledger cap in USD")
    ap.add_argument("--stop-at", type=float, default=24.0, help="stop reserving at this USD total")
    ap.add_argument("--reserve", type=float, default=0.30, help="USD reserved before each topic")
    ap.add_argument("--session-cap", type=float, default=DEFAULT_SESSION_CAP, help="USD per gateway session")
    ap.add_argument("--daily-cap", type=float, default=DEFAULT_DAILY_CAP, help="USD per Zagreb day")
    ap.add_argument("--max-calls", type=positive_int, default=DEFAULT_MAX_CALLS, help="gateway calls per Zagreb day")
    ap.add_argument("--gateway-retries", type=non_negative_int, default=DEFAULT_GATEWAY_RETRIES,
                    help="retries with backoff for a 200 reply with no model output (default 3)")
    ap.add_argument("--max-gateway-errors", type=positive_int, default=DEFAULT_MAX_GATEWAY_ERRORS,
                    help="pause the run after this many topics in a row end in a gateway error (default 3)")
    ap.add_argument("--gateway-attempts", type=positive_int, default=DEFAULT_GATEWAY_ATTEMPTS,
                    help="mark a topic failed after this many gateway-error attempts (default 3)")
    ap.add_argument("--gateway-call-cap", type=non_negative_int, default=DEFAULT_GATEWAY_CALL_CAP,
                    help="gateway HERMES_RS_DAILY_CALL_CAP, read against day_calls in the spend file; 0 = off")
    ap.add_argument("--gateway-call-reserve", type=non_negative_int, default=DEFAULT_GATEWAY_CALL_RESERVE,
                    help="gateway calls per day left for the owner's chats (default 200)")
    ap.add_argument("--revisions", type=int, default=1)
    ap.add_argument("--no-review", action="store_true")
    ap.add_argument("--existing-ids", default="", help="file of card ids already in the pack")
    ap.add_argument("--state", default=os.environ.get("GAPFILL_STATE", "/var/lib/galion-gapfill"))
    ap.add_argument("--env", default="", help="env file with API_SERVER_KEY (default: the gateway env)")
    ap.add_argument("--spend", default="", help="gateway spend JSON (default: the live spend file)")
    ap.add_argument("--test", type=positive_int, default=0,
                    help="run at most N pending topics, print a pass/fail summary, exit non-zero on a truth-gate failure")
    ap.add_argument("--backoff-initial", type=float, default=1.0, help="first backoff delay in seconds")
    ap.add_argument("--backoff-cap", type=float, default=15.0, help="maximum backoff delay in seconds")
    args = ap.parse_args(argv)
    if args.owner_slots >= args.gateway_concurrency:
        ap.error("--owner-slots must be lower than --gateway-concurrency so a worker can run")
    if args.cap <= 0 or args.stop_at <= 0 or args.reserve <= 0:
        ap.error("--cap, --stop-at, and --reserve must be positive")
    if args.session_cap <= 0 or args.daily_cap <= 0:
        ap.error("--session-cap and --daily-cap must be positive")
    if args.revisions < 0:
        ap.error("--revisions must be >= 0")
    return args


def run(args):
    utf8_stdio()
    configure_paths(args)
    topics = load_topics(args.topics)
    budget = gapfill.Budget(args.cap, min(args.stop_at, args.cap), args.reserve)
    align_limits(budget, args.cap, args.stop_at)
    stale = release_stale_inflight(budget, args.run)
    calls = CallLedger(os.path.join(args.state, "calls.json"), args.max_calls)
    swarm = Swarm(args, budget, calls, guard=None)
    install_budget_tracker(swarm.reservations)
    guard = GatewayGuard(
        swarm, calls, args.session_cap, args.daily_cap, args.backoff_initial, args.backoff_cap,
        gateway_retries=args.gateway_retries,
    )
    swarm.guard = guard
    install_guard(guard)
    try:
        return _run(args, swarm, topics, stale)
    finally:
        swarm.close()


def _run(args, swarm, topics, stale):
    counts = {"kept": 0, "dropped": 0, "failed": 0, "skipped": 0, "interrupted": 0, "pending": 0}
    pending = []
    for topic in topics:
        kind = topic_disposition(swarm.out, swarm.state, topic["cid"])
        counts[kind] = counts.get(kind, 0) + 1
        if kind in TERMINAL:
            continue
        pending.append(topic)
    if args.test:
        pending = pending[: args.test]
    limit = swarm.limit
    print(
        f"swarm run={args.run} queued={len(pending)} workers={args.workers} "
        f"gateway_concurrency={args.gateway_concurrency} owner_slots={args.owner_slots} "
        f"inflight_limit={limit} cap=${args.cap:.2f} stop_at=${min(args.stop_at, args.cap):.2f}",
        flush=True,
    )
    if args.workers > limit:
        print(
            f"workers={args.workers} exceeds inflight_limit={limit}; "
            "extra workers queue instead of erroring",
            flush=True,
        )
    print(
        "resume "
        + " ".join(f"{k}={v}" for k, v in counts.items())
        + f" stale_inflight={len(stale)}",
        flush=True,
    )
    if not pending:
        spent = swarm.budget.spent()
        print(swarm.progress.line(spent, 0), flush=True)
        print("spent_total", spent, flush=True)
        if args.test and not topics:
            print("result: FAIL (no topics)", flush=True)
            return 1
        return 0
    if args.existing_ids:
        with open(args.existing_ids, encoding="utf-8") as f:
            swarm.existing = set(f.read().split())
    swarm.key = gapfill.api_key()
    for topic in pending:
        swarm.queue.put(topic)
    n_threads = max(1, min(args.workers, len(pending)))
    threads = [threading.Thread(target=swarm.worker, name=f"gapfill-{i}") for i in range(n_threads)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    spent = swarm.budget.spent()
    with swarm.lock:
        final = swarm.progress.line(spent, swarm.restarts)
    print(final, flush=True)
    print("spent_total", spent, flush=True)
    if swarm.stop_reason:
        print(f"stopped {swarm.stop_reason}", flush=True)
    if args.test:
        return swarm.summary_exit(len(pending))
    return 0


def main(argv=None):
    args = parse_args(argv)
    return run(args)


if __name__ == "__main__":
    sys.exit(main())
