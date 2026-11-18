// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Galion Labs

use std::collections::VecDeque;

/// One turn in the short-term ring. It lives in RAM and dies with the
/// process, unless the caller later passes the same words to `remember`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Turn {
    pub id: String,
    pub text: String,
    pub said_by: String,
    pub date: String,
}

/// Fixed-capacity ring. Pushing past `cap` drops the oldest turn.
#[derive(Clone, Debug)]
pub struct SessionRing {
    cap: usize,
    seq: u64,
    turns: VecDeque<Turn>,
}

impl SessionRing {
    pub fn new(cap: usize) -> Self {
        Self {
            cap: cap.max(1),
            seq: 0,
            turns: VecDeque::new(),
        }
    }

    pub fn push(
        &mut self,
        text: impl Into<String>,
        said_by: impl Into<String>,
        date: impl Into<String>,
    ) -> Turn {
        self.seq += 1;
        let turn = Turn {
            id: format!("session-{}", self.seq),
            text: text.into(),
            said_by: said_by.into(),
            date: date.into(),
        };
        if self.turns.len() == self.cap {
            self.turns.pop_front();
        }
        self.turns.push_back(turn.clone());
        turn
    }

    /// Drop the turns held in this process. They were never stored.
    pub fn clear(&mut self) {
        self.turns.clear();
    }

    pub fn len(&self) -> usize {
        self.turns.len()
    }

    pub fn is_empty(&self) -> bool {
        self.turns.is_empty()
    }

    pub fn turns(&self) -> impl Iterator<Item = &Turn> {
        self.turns.iter()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn drops_the_oldest() {
        let mut ring = SessionRing::new(2);
        ring.push("one", "a", "2026-11-18");
        ring.push("two", "a", "2026-11-18");
        ring.push("three", "a", "2026-11-18");
        let texts: Vec<_> = ring.turns().map(|t| t.text.as_str()).collect();
        assert_eq!(texts, ["two", "three"]);
    }
}
