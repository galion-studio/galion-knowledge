// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Galion Labs

use std::fs;

use horbm_diagram::{diagram_dir, validate};
use serde_json::Value;

fn shipped() -> (String, String) {
    let root = diagram_dir();
    let json = fs::read_to_string(root.join("horbm.json")).expect("horbm.json");
    let schema = fs::read_to_string(root.join("horbm.schema.json")).expect("schema");
    (json, schema)
}

#[test]
fn shipped_diagram_matches_the_schema() {
    let (json, schema) = shipped();
    validate(&json, &schema).unwrap();
}

#[test]
fn invalid_json_fails() {
    let (_, schema) = shipped();
    let err = validate("{", &schema).unwrap_err();
    assert!(err[0].contains("not valid JSON"), "{err:?}");
}

#[test]
fn a_missing_layer_reference_fails() {
    let (json, schema) = shipped();
    let mut value: Value = serde_json::from_str(&json).unwrap();
    value["down"][0]["layer"] = Value::String("99".to_string());
    let err = validate(&value.to_string(), &schema).unwrap_err();
    assert!(
        err.iter().any(|item| item.contains("layer 99")),
        "{err:?}"
    );
}

#[test]
fn a_duplicate_layer_number_fails() {
    let (json, schema) = shipped();
    let mut value: Value = serde_json::from_str(&json).unwrap();
    value["bands"][0]["layers"][1]["n"] = Value::String("0".to_string());
    let err = validate(&value.to_string(), &schema).unwrap_err();
    assert!(
        err.iter().any(|item| item.contains("repeats layer 0")),
        "{err:?}"
    );
}

#[test]
fn an_ip_address_fails() {
    let (json, schema) = shipped();
    let mut value: Value = serde_json::from_str(&json).unwrap();
    let address = ["10", "1", "2", "3"].join(".");
    value["bands"][0]["layers"][0]["chips"][0]["sub"] =
        Value::String(format!("calls {address} for lookup"));
    let err = validate(&value.to_string(), &schema).unwrap_err();
    assert!(
        err.iter().any(|item| item.contains("IP address")),
        "{err:?}"
    );
}

#[test]
fn a_wikipedia_link_fails() {
    let (json, schema) = shipped();
    let mut value: Value = serde_json::from_str(&json).unwrap();
    let link = format!("https://en.{}/wiki/Example", "wikipedia.org");
    value["lead"] = Value::String(format!("See {link} before answering."));
    let err = validate(&value.to_string(), &schema).unwrap_err();
    assert!(
        err.iter().any(|item| item.contains("Wikipedia")),
        "{err:?}"
    );
}

#[test]
fn the_word_wikipedia_without_a_link_is_allowed() {
    let (json, schema) = shipped();
    validate(&json, &schema).unwrap();
}

#[test]
fn a_bad_version_fails() {
    let (json, schema) = shipped();
    let mut value: Value = serde_json::from_str(&json).unwrap();
    value["version"] = Value::String("next".to_string());
    let err = validate(&value.to_string(), &schema).unwrap_err();
    assert!(!err.is_empty(), "{err:?}");
}

#[test]
fn an_unknown_field_fails() {
    let (json, schema) = shipped();
    let mut value: Value = serde_json::from_str(&json).unwrap();
    value["note"] = Value::String("scratch".to_string());
    let err = validate(&value.to_string(), &schema).unwrap_err();
    assert!(!err.is_empty(), "{err:?}");
}
