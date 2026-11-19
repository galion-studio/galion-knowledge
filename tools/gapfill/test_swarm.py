#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Galion Labs
"""Offline tests for the gap-fill swarm.

A threaded http.server stands in for the loopback gateway. Nothing here calls
the network. Run from anywhere:

    python3 tools/gapfill/test_swarm.py
"""
import json
import os
import re
import sys
import tempfile
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from io import StringIO
from contextlib import redirect_stdout

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import gapfill
import swarm

# Captured before any test wraps Budget, so the budget test can sit under the
# swarm's reservation tracker instead of calling a previous wrapper.
_REAL_RESERVE = gapfill.Budget.reserve_slot
_REAL_COMMIT = gapfill.Budget.commit


def card_sse(cid, cost):
    # Must pass gapfill.validate_card (v2/data/schema.json); verify_card is faked per test.
    card = {
        "id": cid,
        "title": "Test card",
        "section": "world",
        "category": "mathematics",
        "summary": "A summary stated on the page.",
        "body": "stated on the page",
        "claim_type": "fact",
        "sources": [{
            "title": "Test source",
            "url": "https://example.org/source",
            "author": "Test Author",
            "date": "2000",
            "accessed": "2026-11-19",
        }],
        "evidence_strength": "strong",
        "said_by": "Test Author",
        "as_of_date": "2000",
        "status": "sourced - needs review",
        "contested_views": [],
        "related": [],
        "tags": ["core-pack", "area:math", "mathematics"],
    }
    chunk = {
        "choices": [{"delta": {"content": json.dumps(card, ensure_ascii=False)}}],
        "usage": {"cost": cost},
    }
    payload = "data: " + json.dumps(chunk, ensure_ascii=False) + "\n\ndata: [DONE]\n\n"
    return payload.encode("utf-8")


class Gateway:
    """Fake Galion Research gateway. Records concurrency and can fail on purpose."""

    def __init__(self):
        self.lock = threading.Lock()
        self.inflight = 0
        self.max_inflight = 0
        self.parallel = threading.Event()
        self.parallel_target = 0
        self.hold = 0.0
        self.cost = 0.01
        self.fail_first = 0
        self.fail_status = 503
        self.counts = {}
        self.requests = 0
        self.cids = []
        self.prompts = []
        self.spend_path = ""
        self.httpd = None
        self.thread = None

    @property
    def url(self):
        host, port = self.httpd.server_address
        return f"http://{host}:{port}"

    def start(self):
        gateway = self

        class Handler(BaseHTTPRequestHandler):
            protocol_version = "HTTP/1.1"

            def do_POST(self):
                length = int(self.headers.get("Content-Length", "0") or 0)
                raw = self.rfile.read(length) if length else b""
                sid = self.headers.get("X-Hermes-Session-Id", "")
                gateway.enter()
                try:
                    status, payload = gateway.respond(sid, raw)
                    self.send_response(status)
                    ctype = "text/event-stream" if status == 200 else "text/plain"
                    self.send_header("Content-Type", ctype)
                    self.send_header("Content-Length", str(len(payload)))
                    self.end_headers()
                    self.wfile.write(payload)
                finally:
                    gateway.leave()

            def log_message(self, fmt, *args):
                return

        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.httpd.daemon_threads = True
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()

    def stop(self):
        if self.httpd:
            self.httpd.shutdown()
            self.httpd.server_close()

    def enter(self):
        with self.lock:
            self.inflight += 1
            self.max_inflight = max(self.max_inflight, self.inflight)
            if self.parallel_target and self.inflight >= self.parallel_target:
                self.parallel.set()

    def leave(self):
        with self.lock:
            self.inflight -= 1

    def respond(self, sid, raw):
        try:
            req = json.loads(raw.decode("utf-8"))
            # gapfill.py sends a JSON-only system message first; the topic is in the user turn.
            users = [m for m in req["messages"] if m.get("role") == "user"] or req["messages"]
            prompt = users[-1]["content"]
        except Exception:
            prompt = raw.decode("utf-8", "replace")
        with self.lock:
            self.prompts.append(prompt)
            n = self.counts.get(sid, 0)
            self.counts[sid] = n + 1
            self.requests += 1
        if self.parallel_target:
            self.parallel.wait(2.0)
        if n < self.fail_first:
            return self.fail_status, b"unavailable"
        if self.hold:
            time.sleep(self.hold)
        match = re.search(r"Card id to use:\s*(\S+)", prompt)
        cid = match.group(1) if match else "unknown"
        with self.lock:
            self.cids.append(cid)
        if self.spend_path and self.cost:
            self.add_cost(sid, self.cost)
        return 200, card_sse(cid, self.cost)

    def add_cost(self, sid, usd):
        with self.lock:
            try:
                data = json.loads(open(self.spend_path, encoding="utf-8").read())
            except Exception:
                data = {"sessions": {}}
            sessions = data.setdefault("sessions", {})
            sessions[sid] = round(float(sessions.get(sid, 0.0)) + float(usd), 6)
            tmp = self.spend_path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as handle:
                json.dump(data, handle)
            os.replace(tmp, self.spend_path)


class SwarmCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.state = os.path.join(self.tmp.name, "state")
        self.spend = os.path.join(self.tmp.name, "spend.json")
        self.env = os.path.join(self.tmp.name, "env")
        os.makedirs(self.state, exist_ok=True)
        with open(self.spend, "w", encoding="utf-8") as handle:
            json.dump({"sessions": {}}, handle)
        with open(self.env, "w", encoding="utf-8") as handle:
            handle.write("API_SERVER_KEY=test-key\n")
        self.topics = os.path.join(self.tmp.name, "topics")
        os.makedirs(self.topics, exist_ok=True)
        self.gw = Gateway()
        self.gw.spend_path = self.spend
        self.gw.start()
        self._saved = {
            "GW": gapfill.GW,
            "STATE": gapfill.STATE,
            "BUDGET": gapfill.BUDGET,
            "SPEND": gapfill.SPEND,
            "ENVF": gapfill.ENVF,
            "ask": gapfill.ask,
            "verify": gapfill.verify_card,
            "sleep": gapfill.time.sleep,
        }
        real_sleep = gapfill.time.sleep

        def fast_sleep(seconds):
            if seconds >= 0.4:
                return
            real_sleep(seconds)

        gapfill.time.sleep = fast_sleep

        def fake_verify(card, existing):
            if "bad" in str(card.get("id", "")):
                return False, ["quote not found on any opened source: مثال"], []
            return True, [], [{"url": "https://example.test/doc", "ok": True}]

        gapfill.verify_card = fake_verify

    def tearDown(self):
        self.gw.stop()
        gapfill.GW = self._saved["GW"]
        gapfill.STATE = self._saved["STATE"]
        gapfill.BUDGET = self._saved["BUDGET"]
        gapfill.SPEND = self._saved["SPEND"]
        gapfill.ENVF = self._saved["ENVF"]
        gapfill.ask = self._saved["ask"]
        gapfill.verify_card = self._saved["verify"]
        gapfill.time.sleep = self._saved["sleep"]
        if hasattr(gapfill, "_swarm_orig_ask"):
            delattr(gapfill, "_swarm_orig_ask")
        self.tmp.cleanup()

    def write_topics(self, rows, name="batch.jsonl"):
        path = os.path.join(self.topics, name)
        with open(path, "w", encoding="utf-8") as handle:
            for row in rows:
                handle.write(json.dumps(row, ensure_ascii=False) + "\n")
        return path

    def argv(self, run, **extra):
        args = [
            "--topics", self.topics,
            "--run", run,
            "--state", self.state,
            "--env", self.env,
            "--spend", self.spend,
            "--gateway", self.gw.url,
            "--no-review",
            "--revisions", "0",
            "--backoff-initial", "0",
            "--backoff-cap", "0",
            "--timeout", "30",
        ]
        for key, value in extra.items():
            flag = "--" + key.replace("_", "-")
            args.extend([flag, str(value)])
        return args

    def run_swarm(self, run, **extra):
        buf = StringIO()
        with redirect_stdout(buf):
            code = swarm.main(self.argv(run, **extra))
        return code, buf.getvalue()

    def budget(self):
        path = os.path.join(self.state, "budget.json")
        with open(path, encoding="utf-8") as handle:
            return json.load(handle)


class RestartCodeTest(unittest.TestCase):
    def test_restart_codes(self):
        self.assertTrue(swarm.is_restart_code("503"))
        self.assertTrue(swarm.is_restart_code("502"))
        self.assertTrue(swarm.is_restart_code("504"))
        self.assertTrue(swarm.is_restart_code("err:RemoteDisconnected"))
        self.assertTrue(swarm.is_restart_code("err:ConnectionResetError"))
        self.assertFalse(swarm.is_restart_code("500"))
        self.assertFalse(swarm.is_restart_code("429"))
        self.assertFalse(swarm.is_restart_code("200"))
        self.assertFalse(swarm.is_restart_code("cap"))

    def test_default_workers_leave_one_slot(self):
        args = swarm.parse_args(["--run", "defaults", "--topics", "topics"])
        self.assertEqual(args.workers, 2)
        self.assertEqual(args.gateway_concurrency, 3)
        self.assertEqual(args.owner_slots, 1)
        self.assertEqual(swarm.inflight_limit(args.workers, args.gateway_concurrency, args.owner_slots), 2)
        self.assertEqual(swarm.inflight_limit(16, 3, 1), 2)
        self.assertEqual(args.session_cap, 5.0)
        self.assertEqual(args.daily_cap, 21.50)
        self.assertEqual(args.max_calls, 2000)
        with self.assertRaises(SystemExit):
            swarm.parse_args(["--run", "x", "--owner-slots", "3", "--gateway-concurrency", "3"])


class ConcurrencyTest(SwarmCase):
    def test_workers_above_the_gateway_limit_queue(self):
        rows = []
        for i in range(6):
            rows.append({
                "cid": f"world.core.test.conc-{i}",
                "topic": "素数は無限にある" if i == 0 else f"claim {i}",
                "category": "mathematics",
                "area": "math",
            })
        self.write_topics(rows)
        self.gw.hold = 0.25
        self.gw.parallel_target = 2
        self.gw.cost = 0.01
        code, out = self.run_swarm(
            "conc", workers=8, gateway_concurrency=3, owner_slots=1, reserve=0.30,
        )
        self.assertEqual(code, 0, out)
        self.assertIn("extra workers queue instead of erroring", out)
        self.assertLessEqual(self.gw.max_inflight, 2)
        self.assertGreaterEqual(self.gw.max_inflight, 2)
        self.assertRegex(out, r"progress done=6 kept=6 dropped=0 failed=0 skipped=0 spent=\$[0-9.]+")
        self.assertTrue(any("素数は無限にある" in prompt for prompt in self.gw.prompts))
        kept = os.path.join(self.state, "runs", "conc", "kept")
        self.assertEqual(len(os.listdir(kept)), 6)


class BudgetTest(SwarmCase):
    def test_concurrent_reservations_never_pass_the_cap(self):
        reserve = 0.25
        cap = 0.50
        rows = [
            {"cid": f"world.core.test.budget-{i}", "topic": f"budget claim {i}", "category": "mathematics", "area": "math"}
            for i in range(6)
        ]
        self.write_topics(rows)
        # Cost is reported on the SSE usage line. Writing it into the spend file
        # before the body makes gapfill.ask cut the stream: its first read treats
        # a session already over CARD_CAP ($0.08) as a cap hit and drops the card.
        self.gw.spend_path = ""
        self.gw.cost = reserve
        self.gw.hold = 0.05
        observations = []
        orig_reserve = _REAL_RESERVE
        orig_commit = _REAL_COMMIT
        path = os.path.join(self.state, "budget.json")

        def observe(tag):
            try:
                data = json.loads(open(path, encoding="utf-8").read())
            except Exception:
                return
            spent = float(data.get("spent_usd") or 0.0)
            inflight = len(data.get("inflight") or {})
            observations.append((tag, spent, spent + reserve * inflight))

        def tracing_reserve(self, sid):
            ok, spent = orig_reserve(self, sid)
            observe("reserve" if ok else "refuse")
            return ok, spent

        def tracing_commit(self, sid, usd, meta):
            total = orig_commit(self, sid, usd, meta)
            observe("commit")
            return total

        gapfill.Budget.reserve_slot = tracing_reserve
        gapfill.Budget.commit = tracing_commit
        try:
            code, out = self.run_swarm(
                "budget",
                workers=4,
                gateway_concurrency=4,
                owner_slots=0,
                cap=cap,
                stop_at=cap,
                reserve=reserve,
            )
        finally:
            gapfill.Budget.reserve_slot = orig_reserve
            gapfill.Budget.commit = orig_commit
        self.assertEqual(code, 0, out)
        self.assertTrue(observations, out)
        for tag, spent, committed in observations:
            self.assertLessEqual(spent, cap + 1e-6, f"{tag} spent {spent}")
            self.assertLessEqual(committed, cap + 1e-6, f"{tag} committed {committed}")
        data = self.budget()
        self.assertLessEqual(float(data["spent_usd"]), cap + 1e-6)
        self.assertEqual(float(data["spent_usd"]), cap)
        kept = os.listdir(os.path.join(self.state, "runs", "budget", "kept"))
        self.assertEqual(len(kept), 2, out)
        self.assertIn("stopped budget", out)
        self.assertRegex(out, r"failed=0")
        refused = [item for item in observations if item[0] == "refuse"]
        self.assertTrue(refused, "the cap was never refused under contention")


class ResumeTest(SwarmCase):
    def test_resume_skips_done_and_failed_and_retries_interrupted(self):
        rows = [
            {"cid": "world.core.test.done", "topic": "already done", "category": "mathematics", "area": "math"},
            {"cid": "world.core.test.failed", "topic": "already failed", "category": "mathematics", "area": "math"},
            {"cid": "world.core.test.interrupted", "topic": "قطع ثم استئناف", "category": "mathematics", "area": "math"},
        ]
        self.write_topics(rows)
        budget_path = os.path.join(self.state, "budget.json")
        with open(budget_path, "w", encoding="utf-8") as handle:
            json.dump({
                "cap_usd": 25.0,
                "stop_at_usd": 24.0,
                "spent_usd": 0.0,
                "entries": [],
                "inflight": {
                    "gapfill-resume-stale": "2026-01-01T00:00:00+00:00",
                    "gapfill-other-live": "2026-01-01T00:00:00+00:00",
                },
            }, handle)
        code, out = self.run_swarm("resume", workers=3, gateway_concurrency=3, owner_slots=0)
        self.assertEqual(code, 0, out)
        self.assertEqual(self.gw.requests, 3, out)
        data = self.budget()
        self.assertNotIn("gapfill-resume-stale", data.get("inflight", {}))
        self.assertIn("gapfill-other-live", data.get("inflight", {}))
        self.assertRegex(out, r"progress done=3 kept=3 dropped=0 failed=0")

        after_first = self.gw.requests
        code, out = self.run_swarm("resume", workers=3, gateway_concurrency=3, owner_slots=0)
        self.assertEqual(code, 0, out)
        self.assertEqual(self.gw.requests, after_first, out)
        self.assertIn("resume kept=3", out)

        run_dir = os.path.join(self.state, "runs", "resume")
        os.remove(os.path.join(run_dir, "kept", "world.core.test.failed.json"))
        os.remove(os.path.join(run_dir, "kept", "world.core.test.interrupted.json"))
        state_dir = os.path.join(run_dir, "state")
        with open(os.path.join(state_dir, "world.core.test.failed.json"), "w", encoding="utf-8") as handle:
            json.dump({"cid": "world.core.test.failed", "status": "failed", "attempts": 1}, handle)
        with open(os.path.join(state_dir, "world.core.test.interrupted.json"), "w", encoding="utf-8") as handle:
            json.dump({"cid": "world.core.test.interrupted", "status": "running", "attempts": 1}, handle)
        code, out = self.run_swarm("resume", workers=3, gateway_concurrency=3, owner_slots=0)
        self.assertEqual(code, 0, out)
        self.assertEqual(self.gw.requests, after_first + 1, out)
        self.assertEqual(self.gw.cids[-1], "world.core.test.interrupted")
        self.assertTrue(any("قطع ثم استئناف" in prompt for prompt in self.gw.prompts))
        resume_line = next(line for line in out.splitlines() if line.startswith("resume "))
        self.assertIn("interrupted=1", resume_line)
        self.assertIn("failed=1", resume_line)
        kept = os.path.join(run_dir, "kept", "world.core.test.interrupted.json")
        self.assertTrue(os.path.isfile(kept))
        failed_kept = os.path.join(run_dir, "kept", "world.core.test.failed.json")
        self.assertFalse(os.path.isfile(failed_kept))


class RestartTest(SwarmCase):
    def test_gateway_restart_is_retried_once_and_not_a_failure(self):
        self.write_topics([
            {"cid": "world.core.test.restart", "topic": "restart me", "category": "mathematics", "area": "math"},
        ])
        self.gw.fail_first = 1
        self.gw.fail_status = 503
        code, out = self.run_swarm("restart", workers=2, test=1)
        self.assertEqual(code, 0, out)
        self.assertEqual(self.gw.requests, 2, out)
        self.assertRegex(out, r"failed=0")
        self.assertRegex(out, r"restarts=1")
        self.assertIn("PASS  world.core.test.restart", out)
        self.assertIn("result: PASS", out)

    def test_429_backs_off_and_is_not_a_failure(self):
        self.write_topics([
            {"cid": "world.core.test.rate", "topic": "slow down", "category": "mathematics", "area": "math"},
        ])
        self.gw.fail_first = 2
        self.gw.fail_status = 429
        code, out = self.run_swarm("rate", workers=4, test=1)
        self.assertEqual(code, 0, out)
        self.assertEqual(self.gw.requests, 3, out)
        self.assertRegex(out, r"restarts=0")
        self.assertRegex(out, r"failed=0")
        self.assertIn("result: PASS", out)

    def test_a_second_restart_is_a_failure_and_is_not_retried_again(self):
        self.write_topics([
            {"cid": "world.core.test.down", "topic": "stay down", "category": "mathematics", "area": "math"},
        ])
        self.gw.fail_first = 10
        self.gw.fail_status = 503
        code, out = self.run_swarm("down", workers=2, test=1)
        self.assertEqual(code, 1, out)
        self.assertEqual(self.gw.requests, 2, out)
        self.assertRegex(out, r"failed=1")
        self.assertRegex(out, r"restarts=1")
        self.assertIn("FAIL  world.core.test.down", out)
        self.assertNotIn("truth gate:", out)


class TruthGateTest(SwarmCase):
    def test_batch_exits_nonzero_when_a_card_fails_the_truth_gate(self):
        self.write_topics([
            {"cid": "world.core.test.good", "topic": "a sourced claim", "category": "mathematics", "area": "math"},
            {"cid": "world.core.test.bad", "topic": "an unsourced claim", "category": "mathematics", "area": "math"},
        ])
        code, out = self.run_swarm("gate", workers=2, test=20)
        self.assertEqual(code, 1, out)
        self.assertIn("PASS  world.core.test.good  truth gate passed", out)
        self.assertIn("FAIL  world.core.test.bad  truth gate:", out)
        self.assertIn("result: FAIL (truth gate)", out)
        self.assertRegex(out, r"progress done=2 kept=1 dropped=1 failed=0 skipped=0 spent=\$[0-9.]+")


class CallCapTest(SwarmCase):
    def test_daily_call_cap_stops_without_marking_the_topic_failed(self):
        self.write_topics([
            {"cid": "world.core.test.call-a", "topic": "first", "category": "mathematics", "area": "math"},
            {"cid": "world.core.test.call-b", "topic": "second", "category": "mathematics", "area": "math"},
        ])
        code, out = self.run_swarm("calls", workers=1, max_calls=1, test=2)
        self.assertEqual(code, 1, out)
        self.assertEqual(self.gw.requests, 1, out)
        self.assertRegex(out, r"failed=0")
        self.assertIn("stopped daily_calls", out)
        failed_state = os.path.join(self.state, "runs", "calls", "state", "world.core.test.call-b.json")
        if os.path.isfile(failed_state):
            data = json.loads(open(failed_state, encoding="utf-8").read())
            self.assertNotEqual(data.get("status"), "failed")
        self.assertFalse(os.path.isfile(os.path.join(self.state, "runs", "calls", "kept", "world.core.test.call-b.json")))


class ReservationTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self._saved = (gapfill.STATE, gapfill.BUDGET, gapfill.SPEND)
        gapfill.STATE = self.tmp.name
        gapfill.BUDGET = os.path.join(self.tmp.name, "budget.json")
        gapfill.SPEND = os.path.join(self.tmp.name, "spend.json")
        with open(gapfill.SPEND, "w", encoding="utf-8") as handle:
            json.dump({"sessions": {"gapfill-abort-1": 0.2}}, handle)

    def tearDown(self):
        gapfill.STATE, gapfill.BUDGET, gapfill.SPEND = self._saved
        self.tmp.cleanup()

    def test_stranded_reservation_is_committed_and_does_not_block_the_cap(self):
        budget = gapfill.Budget(1.0, 1.0, 0.4)
        sid = "gapfill-abort-1"
        self.assertTrue(budget.reserve_slot(sid)[0])
        tracker = swarm.Reservations()
        tracker.note_reserve(sid, True)
        tracker.release_open(budget)
        data = json.loads(open(gapfill.BUDGET, encoding="utf-8").read())
        self.assertNotIn(sid, data["inflight"])
        self.assertAlmostEqual(data["spent_usd"], 0.2)
        self.assertTrue(budget.reserve_slot("gapfill-abort-2")[0])


class DispositionTest(unittest.TestCase):
    def test_running_is_interrupted_and_terminal_states_are_skipped(self):
        tmp = tempfile.TemporaryDirectory()
        try:
            out = os.path.join(tmp.name, "run")
            os.makedirs(os.path.join(out, "kept"), exist_ok=True)
            os.makedirs(os.path.join(out, "dropped"), exist_ok=True)
            state = swarm.TopicState(os.path.join(out, "state"))
            state.update("world.core.test.running", status="running")
            state.update("world.core.test.failed", status="failed")
            with open(os.path.join(out, "kept", "world.core.test.kept.json"), "w", encoding="utf-8") as handle:
                handle.write("{}\n")
            self.assertEqual(swarm.topic_disposition(out, state, "world.core.test.running"), "interrupted")
            self.assertEqual(swarm.topic_disposition(out, state, "world.core.test.failed"), "failed")
            self.assertEqual(swarm.topic_disposition(out, state, "world.core.test.kept"), "kept")
            self.assertEqual(swarm.topic_disposition(out, state, "world.core.test.new"), "pending")
            self.assertNotIn("interrupted", swarm.TERMINAL)
            self.assertNotIn("pending", swarm.TERMINAL)
        finally:
            tmp.cleanup()


if __name__ == "__main__":
    unittest.main()
