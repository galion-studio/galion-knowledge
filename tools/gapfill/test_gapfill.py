#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Galion Labs
"""Offline tests for the gap-fill runner. No gateway and no network."""
import argparse, json, os, sys, tempfile, threading, time, unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gapfill

ROOT = Path(__file__).resolve().parents[2]


def sample_card(**over):
    card = {
        "id": "world.core.math.cantor-1874-uncountable",
        "title": "Cantor 1874",
        "section": "world",
        "category": "mathematics",
        "summary": "The real numbers are not equinumerous with the natural numbers.",
        "body": "Cantor's 1874 paper shows that the real numbers cannot be put in one-to-one correspondence with the natural numbers.",
        "claim_type": "fact",
        "sources": [{
            "title": "Ueber eine Eigenschaft des Inbegriffes aller reellen algebraischen Zahlen",
            "url": "https://doi.org/10.1515/crll.1874.77.258",
            "author": "Georg Cantor",
            "date": "1874",
            "accessed": "2026-11-19",
        }],
        "evidence_strength": "strong",
        "said_by": "Georg Cantor",
        "as_of_date": "1874",
        "status": "sourced - needs review",
        "contested_views": [],
        "related": [],
        "tags": ["core-pack", "area:math", "mathematics"],
    }
    card.update(over)
    return card


def scripted(replies, seen):
    def ask(key, model, prompt, sid, timeout, cap=None, **kw):
        seen.append({"prompt": prompt, "cap": cap, "kw": kw})
        if not replies:
            raise AssertionError("ask called too many times")
        code, text, usage = replies.pop(0)
        return code, text, usage
    return ask


class GapfillTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self._saved = {
            "STATE": gapfill.STATE,
            "BUDGET": gapfill.BUDGET,
            "RUNS": gapfill.RUNS,
            "session_usd": gapfill.session_usd,
            "verify_card": gapfill.verify_card,
            "ask_ready": gapfill.ask_ready,
            "check_url": gapfill.check_url,
            "check_doi": gapfill.check_doi,
            "_wait_spend": gapfill._wait_spend,
            "RUN_LIMIT": gapfill.RUN_LIMIT,
            "RUN_STALE": gapfill.RUN_STALE,
            "RUN_POLL": gapfill.RUN_POLL,
            "gateway": dict(gapfill._GATEWAY),
        }
        gapfill.STATE = self.tmp.name
        gapfill.BUDGET = os.path.join(self.tmp.name, "budget.json")
        gapfill.RUNS = os.path.join(self.tmp.name, "gateway-runs.json")
        gapfill._wait_spend = lambda: None
        gapfill._GATEWAY["json_object"] = True
        gapfill._GATEWAY["max_tokens"] = True
        def _no_network(*a, **k):
            raise AssertionError("network")
        gapfill.check_url = _no_network
        gapfill.check_doi = _no_network

    def tearDown(self):
        for key, value in self._saved.items():
            if key == "gateway":
                gapfill._GATEWAY.clear()
                gapfill._GATEWAY.update(value)
            else:
                setattr(gapfill, key, value)
        self.tmp.cleanup()

    def test_live_caps_stay(self):
        self.assertEqual(gapfill.CARD_CAP, 0.08)
        self.assertEqual(gapfill.TOPIC_CAP, 0.10)
        self.assertEqual(gapfill.RUN_LIMIT, 3)

    def test_prompts_keep_json_contract_and_wikipedia_ban(self):
        self.assertIn("JSON", gapfill.SYSTEM)
        self.assertIn("Wikipedia", gapfill.SYSTEM)
        self.assertIn("UTF-8", gapfill.SYSTEM)
        self.assertIn("NO Wikipedia", gapfill.PROMPT)
        self.assertIn("source_check", gapfill.PROMPT)
        self.assertIn("accessed", gapfill.PROMPT)

    def test_embedded_schema_matches_truth_gate_file(self):
        path = ROOT / "v2" / "data" / "schema.json"
        repo = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(json.loads(gapfill._EMBEDDED_SCHEMA), repo)
        self.assertEqual(gapfill.card_schema()["required"], repo["required"])

    def test_published_card_matches_truth_gate_schema(self):
        path = ROOT / "v2" / "data" / "cards" / "world" / "world.core.money.card-krueger-nj.json"
        card = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(gapfill.validate_card(card), [])
        card = dict(card)
        card["history"] = [{"date": "2026-11-19", "change": "note", "note": "说明"}]
        card["legacy"] = {"note": "旧"}
        self.assertEqual(gapfill.validate_card(card), [])

    def test_unknown_field_is_rejected(self):
        bad = sample_card(confidence="high")
        errs = gapfill.validate_card(bad)
        self.assertTrue(any("confidence" in e for e in errs), errs)

    def test_wikipedia_hosts_are_banned_and_wikisource_is_not(self):
        self.assertTrue(gapfill.banned_host("en.wikipedia.org"))
        self.assertTrue(gapfill.banned_host("ar.wikipedia.org"))
        self.assertTrue(gapfill.banned_host("www.wikidata.org"))
        self.assertTrue(gapfill.banned_host("dbpedia.org"))
        self.assertFalse(gapfill.banned_host("en.wikisource.org"))
        self.assertFalse(gapfill.banned_host("doi.org"))
        self.assertFalse(gapfill.banned_host("arxiv.org"))

    def test_fenced_json(self):
        card = sample_card(title="康托尔")
        text = "```json\n" + json.dumps(card, ensure_ascii=False, indent=2) + "\n```\n"
        got, err = gapfill.parse_card_reply(text)
        self.assertIsNone(err, err)
        self.assertEqual(got["title"], "康托尔")
        self.assertEqual(got["id"], card["id"])

    def test_prose_plus_json(self):
        card = sample_card(body="الأعداد الحقيقية ليست قابلة للعد، وهذا هو الادعاء في هذه البطاقة.")
        text = "I checked the DOI. 说明如下:\n" + json.dumps(card, ensure_ascii=False) + "\nThat is everything."
        got, err = gapfill.parse_card_reply(text)
        self.assertIsNone(err, err)
        self.assertEqual(got["body"], card["body"])

    def test_truncated_non_latin_is_not_a_card(self):
        text = '<think>还在想\n{"id": "world.core.math.cantor-1874-uncountable", "title": "未完成'
        card, err = gapfill.parse_card_reply(text)
        self.assertIsNone(card)
        self.assertIn("truncated", err)
        self.assertIn("未完成", text)

    def test_non_latin_round_trip_and_think_block(self):
        draft = sample_card(title="مسودة داخل التفكير")
        final = sample_card(title="康托尔证明实数不可数", said_by="Георг Кантор")
        text = (
            "<think>\n" + json.dumps(draft, ensure_ascii=False) + "\n</think>\n"
            "```JSON\n" + json.dumps(final, ensure_ascii=False) + "\n```"
        )
        got, err = gapfill.parse_card_reply(text)
        self.assertIsNone(err, err)
        self.assertEqual(got["title"], "康托尔证明实数不可数")
        self.assertEqual(got["said_by"], "Георг Кантор")
        only_think, err = gapfill.parse_card_reply("<think>" + json.dumps(final, ensure_ascii=False) + "</think>")
        self.assertIsNone(only_think)
        self.assertIn("no JSON", err)

    def test_smart_quotes_trailing_comma_and_string_safety(self):
        card = sample_card(title="康托尔", said_by="Георг Кантор")
        raw = json.dumps(card, ensure_ascii=False).replace('"康托尔"', "“康托尔”", 1)
        raw = raw[:-1] + ",}"
        got, err = gapfill.parse_card_reply(raw)
        self.assertIsNone(err, err)
        self.assertEqual(got["title"], "康托尔")
        self.assertEqual(got["said_by"], "Георг Кантор")

        quoted = sample_card(title='He said “hello”')
        broken = json.dumps(quoted, ensure_ascii=False)[:-1] + ",}"
        got, err = gapfill.parse_card_reply(broken)
        self.assertIsNone(err, err)
        self.assertEqual(got["title"], 'He said “hello”')

        body = 'The paper prints ", }" and then continues with the proof of the claim.'
        inner = sample_card(body=body)
        got, err = gapfill.parse_card_reply(json.dumps(inner, ensure_ascii=False)[:-1] + ",}")
        self.assertIsNone(err, err)
        self.assertEqual(got["body"], body)

    def test_small_object_does_not_hide_the_card(self):
        card = sample_card(title="بعد الملاحظة")
        text = 'Note {"step": 1} then\n' + json.dumps(card, ensure_ascii=False)
        got, err = gapfill.parse_card_reply(text)
        self.assertIsNone(err, err)
        self.assertEqual(got["title"], "بعد الملاحظة")

    def test_schema_error_names_the_missing_field(self):
        bad = sample_card()
        del bad["sources"]
        card, err = gapfill.parse_card_reply(json.dumps(bad, ensure_ascii=False))
        self.assertIsNone(card)
        self.assertTrue(err.startswith("card schema:"), err)
        self.assertIn("sources", err)

    def test_skip_is_not_a_schema_failure(self):
        got, err = gapfill.parse_card_reply('{"skip": "没有一次文献"}')
        self.assertIsNone(err)
        self.assertEqual(got["skip"], "没有一次文献")

    def test_review_object_wins_over_an_echoed_card(self):
        text = json.dumps(sample_card(), ensure_ascii=False) + "\n" + json.dumps(
            {"ok": False, "problems": ["التاريخ"]}, ensure_ascii=False)
        verdict = gapfill.extract_json(text, prefer=("ok",))
        self.assertEqual(verdict["problems"], ["التاريخ"])
        self.assertIn("id", gapfill.extract_json(text))

    def test_one_retry_includes_the_parse_error_and_stops(self):
        seen = []
        replies = [("200", "This is prose about Cantor, with no object.", {}), ("200", "Still prose about π.", {})]
        card, err, calls, raw = gapfill.obtain_card(
            scripted(replies, seen), "k", "m", "PROMPT", "sid", 30, 0.08,
            "world.core.math.cantor-1874-uncountable", 4096, gapfill.SYSTEM,
        )
        self.assertIsNone(card)
        self.assertEqual(len(seen), 2)
        self.assertEqual(len(calls), 2)
        self.assertEqual(calls[1]["what"], "author_json_retry")
        self.assertIn("no JSON object found", seen[1]["prompt"])
        self.assertIn("world.core.math.cantor-1874-uncountable", seen[1]["prompt"])
        self.assertIn("Parse error", seen[1]["prompt"])
        self.assertTrue(seen[0]["kw"]["json_mode"])
        self.assertIn("Wikipedia", seen[0]["kw"]["system"])
        self.assertEqual(replies, [])

    def test_schema_retry_quotes_the_field_then_accepts_the_card(self):
        bad = sample_card()
        del bad["sources"]
        good = "```json\n" + json.dumps(sample_card(title="康托尔"), ensure_ascii=False) + "\n```"
        seen = []
        replies = [("200", json.dumps(bad), {"cost": 0.02}), ("200", good, {"cost": 0.01})]
        card, err, calls, raw = gapfill.obtain_card(
            scripted(replies, seen), "k", "m", "PROMPT", "sid", 30, 0.08,
            bad["id"], 4096, gapfill.SYSTEM,
        )
        self.assertIsNone(err, err)
        self.assertEqual(card["title"], "康托尔")
        self.assertIn("$.sources is required", seen[1]["prompt"])
        self.assertEqual(len(seen), 2)

    def test_no_second_retry_when_the_topic_is_out_of_budget(self):
        seen = []
        replies = [("200", "prose only", {}), ("200", "should not be asked", {})]
        card, err, calls, raw = gapfill.obtain_card(
            scripted(replies, seen), "k", "m", "PROMPT", "sid", 30, 0.08,
            "world.core.math.cantor-1874-uncountable", 4096, gapfill.SYSTEM,
            budget_left=lambda: 0.0,
        )
        self.assertIsNone(card)
        self.assertEqual(len(calls), 1)
        self.assertEqual(len(replies), 1)

    def test_plan_array_fenced_with_trailing_comma(self):
        text = '```json\n[{"slug": "cantor-1874", "topic": "康托尔"},]\n```'
        arr = gapfill.parse_plan_array(text)
        self.assertEqual(arr, [{"slug": "cantor-1874", "topic": "康托尔"}])

    def test_sse_keeps_utf8_content_and_drops_reasoning(self):
        payload = json.dumps(
            {"choices": [{"delta": {"content": "康托尔", "reasoning_content": "ignore 中文"}}]},
            ensure_ascii=False,
        ).encode("utf-8")
        event = gapfill.sse_data(b"data: " + payload)
        self.assertEqual(gapfill.delta_text(event), "康托尔")
        self.assertIsNone(gapfill.sse_data(b"data: [DONE]"))
        raw = gapfill.encode_payload({"messages": [{"content": "中文"}]})
        self.assertIn("中文".encode("utf-8"), raw)
        self.assertNotIn(b"\\u4e2d", raw)

    def test_response_format_falls_back_when_the_gateway_rejects_it(self):
        seen = []

        def transport(payload):
            seen.append(payload)
            if payload.get("response_format"):
                return "400", '{"error":"unknown field response_format"}', {}
            return "200", "{}", {"cost": 0.001}

        code, text, usage = gapfill.ask(
            "k", "m", "主题 π", "sid", 30, json_mode=True, max_tokens=4096,
            system=gapfill.SYSTEM, transport=transport,
        )
        self.assertEqual(code, "200")
        self.assertEqual(seen[0]["response_format"], {"type": "json_object"})
        self.assertNotIn("response_format", seen[1])
        self.assertEqual(seen[1]["max_tokens"], 4096)
        self.assertEqual(seen[0]["messages"][0]["role"], "system")
        self.assertIn("主题", seen[0]["messages"][1]["content"])
        self.assertFalse(gapfill._GATEWAY["json_object"])
        self.assertTrue(gapfill._GATEWAY["max_tokens"])
        gapfill.ask("k", "m", "again", "sid2", 30, json_mode=True, max_tokens=128, transport=transport)
        self.assertEqual(len(seen), 3)
        self.assertNotIn("response_format", seen[2])
        self.assertEqual(seen[2]["max_tokens"], 128)

    def test_empty_rejection_retries_once_without_disabling_the_caps(self):
        seen = []

        def transport(payload):
            seen.append(json.loads(json.dumps(payload)))
            if len(seen) == 1:
                return "400", "", {}
            return "200", "{}", {"cost": 0.001}

        code, text, usage = gapfill.ask(
            "k", "m", "hello", "sid", 30, json_mode=True, max_tokens=64, transport=transport,
        )
        self.assertEqual(code, "200")
        self.assertEqual(len(seen), 2)
        self.assertNotIn("response_format", seen[1])
        self.assertNotIn("max_tokens", seen[1])
        self.assertTrue(gapfill._GATEWAY["json_object"])
        self.assertTrue(gapfill._GATEWAY["max_tokens"])

    def test_max_tokens_falls_back_when_rejected(self):
        seen = []

        def transport(payload):
            seen.append(payload)
            if "max_tokens" in payload:
                return "422", "max_tokens is not supported", {}
            return "200", "{}", {}

        code, text, usage = gapfill.ask(
            "k", "m", "hello", "sid", 30, json_mode=False, max_tokens=100, transport=transport,
        )
        self.assertEqual(code, "200")
        self.assertEqual(seen[0]["max_tokens"], 100)
        self.assertNotIn("max_tokens", seen[1])
        self.assertFalse(gapfill._GATEWAY["max_tokens"])

    def test_usage_fallback_is_not_charged_twice(self):
        shown = {"v": 0.0}
        gapfill.session_usd = lambda sid: shown["v"]
        tracker = gapfill.CallCost("s")
        first = tracker.charge({"cost": 0.02})
        shown["v"] = 0.05
        second = tracker.charge({"cost": 0.03})
        self.assertAlmostEqual(first + second, 0.05, places=6)

        shown["v"] = 0.0
        tracker = gapfill.CallCost("tools")
        shown["v"] = 0.05
        self.assertAlmostEqual(tracker.charge({"cost": 0.01}), 0.05, places=6)

    def test_ledger_records_author_and_retry_once_in_utf8(self):
        shown = {}
        gapfill.session_usd = lambda sid: shown.get(sid, 0.0)
        budget = gapfill.Budget(25, 24, 0.3)
        self.assertTrue(budget.reserve_slot("s")[0])
        tracker = gapfill.CallCost("s")
        shown["s"] = 0.02
        first = tracker.charge({"cost": 0.02, "prompt_tokens": 3})
        budget.commit("s", first, {"topic": "world.x", "what": "author", "usage": {"cost": 0.02}, "note": "证明"})
        shown["s"] = 0.03
        second = tracker.charge({"cost": 0.01})
        budget.commit("s", second, {"topic": "world.x", "what": "author_json_retry", "usage": {"cost": 0.01}})
        raw = Path(gapfill.BUDGET).read_text(encoding="utf-8")
        self.assertIn("证明", raw)
        ledger = json.loads(raw)
        self.assertEqual([e["what"] for e in ledger["entries"]], ["author", "author_json_retry"])
        self.assertAlmostEqual(ledger["entries"][0]["usd"], 0.02, places=6)
        self.assertAlmostEqual(ledger["entries"][1]["usd"], 0.01, places=6)
        self.assertAlmostEqual(ledger["spent_usd"], 0.03, places=6)

    def _args(self, **kw):
        base = dict(
            run="unit", model="m", timeout=30, revisions=0, no_review=True,
            review_model="rv", topic_cap=0.04, card_cap=0.08, max_tokens=4096,
            cap=25.0, stop_at=24.0, reserve=0.3,
        )
        base.update(kw)
        return argparse.Namespace(**base)

    def test_run_topic_retries_once_records_both_costs_and_writes_utf8(self):
        costs = {}
        prompts = []
        card = sample_card(
            title="康托尔",
            said_by="Георг Кантор",
            body="الأعداد الحقيقية غير قابلة للعد في هذه البطاقة المختصرة.",
        )
        fenced = "```json\n" + json.dumps(card, ensure_ascii=False) + "\n```"

        def fake_usd(sid):
            return costs.get(sid, 0.0)

        def fake_ask(key, model, prompt, sid, timeout, cap=None, **kw):
            prompts.append((prompt, cap, kw))
            delta = 0.02 if len(prompts) == 1 else 0.01
            costs[sid] = round(costs.get(sid, 0.0) + delta, 6)
            if len(prompts) == 1:
                return "200", "The proof is described in prose, not JSON.", {"cost": delta}
            if len(prompts) == 2:
                return "200", fenced, {"cost": delta}
            raise AssertionError("extra gateway call")

        gapfill.session_usd = fake_usd
        gapfill.ask_ready = fake_ask
        gapfill.verify_card = lambda c, ids: (True, [], [])
        out = Path(self.tmp.name) / "out"
        (out / "kept").mkdir(parents=True)
        (out / "dropped").mkdir()
        logs = []
        topic = {
            "cid": card["id"],
            "topic": "哥德尔 1938 年的一致性证明",
            "category": "mathematics",
            "area": "math",
        }
        result = gapfill.run_topic(self._args(), "key", gapfill.Budget(25, 24, 0.3), topic, set(), str(out), logs.append)
        self.assertEqual(result, "kept")
        self.assertEqual(len(prompts), 2)
        self.assertIn("哥德尔", prompts[0][0])
        self.assertIn("no JSON object found", prompts[1][0])
        self.assertAlmostEqual(prompts[0][1], 0.04, places=6)
        self.assertAlmostEqual(prompts[1][1], 0.02, places=6)
        self.assertTrue(prompts[0][2]["json_mode"])
        ledger = json.loads(Path(gapfill.BUDGET).read_text(encoding="utf-8"))
        self.assertEqual([e["what"] for e in ledger["entries"]], ["author", "author_json_retry"])
        self.assertAlmostEqual(ledger["entries"][0]["usd"], 0.02, places=6)
        self.assertAlmostEqual(ledger["entries"][1]["usd"], 0.01, places=6)
        self.assertAlmostEqual(ledger["spent_usd"], 0.03, places=6)
        raw = (out / "kept" / (card["id"] + ".json")).read_bytes()
        self.assertIn("康托尔".encode(), raw)
        self.assertIn("Георг Кантор".encode(), raw)
        self.assertIn("الأعداد".encode(), raw)
        self.assertNotIn(b"\\u5eb7", raw)
        self.assertEqual(logs[0]["result"], "kept")
        self.assertAlmostEqual(logs[0]["usd"], 0.03, places=6)

    def test_topic_cap_stops_review_and_revision(self):
        costs = {}
        prompts = []
        card = sample_card()

        def fake_ask(key, model, prompt, sid, timeout, cap=None, **kw):
            prompts.append(kw.get("what"))
            costs[sid] = round(costs.get(sid, 0.0) + 0.02, 6)
            return "200", json.dumps(card, ensure_ascii=False), {"cost": 0.02}

        gapfill.session_usd = lambda sid: costs.get(sid, 0.0)
        gapfill.ask_ready = fake_ask
        gapfill.verify_card = lambda c, ids: (True, [], [])
        out = Path(self.tmp.name) / "out"
        (out / "kept").mkdir(parents=True)
        (out / "dropped").mkdir()
        logs = []
        topic = {"cid": card["id"], "topic": "Cantor", "category": "mathematics", "area": "math"}
        result = gapfill.run_topic(
            self._args(topic_cap=0.02, no_review=False, revisions=1),
            "key", gapfill.Budget(25, 24, 0.3), topic, set(), str(out), logs.append,
        )
        self.assertEqual(result, "dropped")
        self.assertEqual(len(prompts), 1)
        self.assertEqual([e["what"] for e in json.loads(Path(gapfill.BUDGET).read_text(encoding="utf-8"))["entries"]], ["author"])
        self.assertTrue(any("cost cap" in p for p in logs[0]["problems"]))
        self.assertFalse((out / "kept" / (card["id"] + ".json")).exists())

    def test_fourth_gateway_run_waits_for_a_free_slot(self):
        tokens = [gapfill.acquire_run_slot(f"c{i}", limit=3, stale_s=30, poll=0.05) for i in range(3)]
        self.assertEqual(tokens, ["c0", "c1", "c2"])
        got = []
        started = threading.Event()

        def fourth():
            started.set()
            got.append(gapfill.acquire_run_slot("c3", limit=3, stale_s=30, poll=0.05))

        th = threading.Thread(target=fourth)
        th.start()
        try:
            self.assertTrue(started.wait(2))
            time.sleep(0.25)
            self.assertEqual(got, [])
            gapfill.release_run_slot(tokens[0])
            th.join(2)
            self.assertEqual(got, ["c3"])
        finally:
            for tok in tokens:
                gapfill.release_run_slot(tok)
            gapfill.release_run_slot("c3")
            th.join(2)

    def test_stale_and_dead_slots_do_not_hold_the_gateway(self):
        gapfill._atomic_json(gapfill.RUNS, {"old": {"pid": os.getpid(), "at": time.time() - 99999}})
        self.assertEqual(gapfill.acquire_run_slot("fresh", limit=1, stale_s=10, poll=0.05), "fresh")
        gapfill.release_run_slot("fresh")
        gapfill._atomic_json(gapfill.RUNS, {"ghost": {"pid": 2 ** 30, "at": time.time()}})
        box = []

        def go():
            box.append(gapfill.acquire_run_slot("live", limit=1, stale_s=100, poll=0.05))

        th = threading.Thread(target=go)
        th.start()
        th.join(2)
        self.assertEqual(box, ["live"])
        gapfill.release_run_slot("live")


if __name__ == "__main__":
    unittest.main()
