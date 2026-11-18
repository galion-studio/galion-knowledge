// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Galion Labs

use std::time::Duration;

/// What a live check should record. `None` means the URL answered in the success range.
pub fn finding_for_status(code: u16) -> Option<&'static str> {
    match code {
        200..=399 => None,
        401 | 403 | 429 => Some("url_blocked"),
        404 | 410 => Some("url_missing"),
        _ => Some("url_unchecked"),
    }
}

pub enum Probe {
    Status(u16),
    Transport(String),
}

pub fn probe(url: &str, timeout: Duration) -> Probe {
    let agent = ureq::AgentBuilder::new()
        .timeout(timeout)
        .redirects(4)
        .build();
    match call(&agent, "HEAD", url) {
        Probe::Status(405) | Probe::Status(501) => call(&agent, "GET", url),
        other => other,
    }
}

fn call(agent: &ureq::Agent, method: &str, url: &str) -> Probe {
    match agent
        .request(method, url)
        .set("User-Agent", "galion-truth-gate/0.1")
        .call()
    {
        Ok(response) => Probe::Status(response.status()),
        Err(ureq::Error::Status(code, _)) => Probe::Status(code),
        Err(err) => Probe::Transport(err.to_string()),
    }
}
