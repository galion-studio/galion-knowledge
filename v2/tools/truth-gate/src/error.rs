// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Galion Labs

use std::fmt;

/// A failure of the tool itself: a missing file, a broken schema, a bad config.
/// Card problems are findings, not this error.
#[derive(Debug)]
pub enum GateError {
    Io(std::io::Error),
    Json(serde_json::Error),
    Toml(toml::de::Error),
    Schema(String),
    Config(String),
}

impl fmt::Display for GateError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            GateError::Io(err) => write!(f, "{err}"),
            GateError::Json(err) => write!(f, "schema or card JSON: {err}"),
            GateError::Toml(err) => write!(f, "config: {err}"),
            GateError::Schema(err) => write!(f, "schema: {err}"),
            GateError::Config(err) => write!(f, "config: {err}"),
        }
    }
}

impl std::error::Error for GateError {}

impl From<std::io::Error> for GateError {
    fn from(err: std::io::Error) -> Self {
        GateError::Io(err)
    }
}

impl From<serde_json::Error> for GateError {
    fn from(err: serde_json::Error) -> Self {
        GateError::Json(err)
    }
}

impl From<toml::de::Error> for GateError {
    fn from(err: toml::de::Error) -> Self {
        GateError::Toml(err)
    }
}

pub type Result<T> = std::result::Result<T, GateError>;
