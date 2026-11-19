// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Galion Labs

use std::collections::BTreeMap;
use std::sync::OnceLock;

use jsonschema::Draft;
use regex::Regex;
use serde_json::Value;

pub fn validate(json_text: &str, schema_text: &str) -> Result<(), Vec<String>> {
    let instance: Value = serde_json::from_str(json_text).map_err(|err| {
        vec![format!("horbm.json is not valid JSON ({err}).")]
    })?;
    let schema: Value = serde_json::from_str(schema_text).map_err(|err| {
        vec![format!("horbm.schema.json is not valid JSON ({err}).")]
    })?;

    let validator = jsonschema::options()
        .with_draft(Draft::Draft202012)
        .build(&schema)
        .map_err(|err| vec![format!("The diagram schema could not be compiled ({err}).")])?;

    let mut errors = Vec::new();
    for error in validator.iter_errors(&instance) {
        if errors.len() == 30 {
            errors.push("Further schema errors were omitted.".to_string());
            break;
        }
        errors.push(error.to_string());
    }
    if errors.is_empty() {
        walk_strings(&instance, "$", &mut errors);
        check_layers(&instance, &mut errors);
    }
    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}

fn ip_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r"\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b")
            .expect("ip pattern")
    })
}

fn walk_strings(value: &Value, path: &str, errors: &mut Vec<String>) {
    match value {
        Value::String(text) => {
            if ip_re().is_match(text) {
                errors.push(format!("{path} contains an IP address."));
            }
            let lower = text.to_ascii_lowercase();
            if lower.contains("wikipedia.org") || lower.contains("wikipedia.com") {
                errors.push(format!("{path} contains a Wikipedia link."));
            }
        }
        Value::Array(items) => {
            for (index, item) in items.iter().enumerate() {
                walk_strings(item, &format!("{path}[{index}]"), errors);
            }
        }
        Value::Object(map) => {
            for (key, item) in map {
                let child = if path == "$" {
                    format!("$.{key}")
                } else {
                    format!("{path}.{key}")
                };
                walk_strings(item, &child, errors);
            }
        }
        _ => {}
    }
}

fn check_layers(value: &Value, errors: &mut Vec<String>) {
    let mut layers: BTreeMap<String, String> = BTreeMap::new();
    let Some(bands) = value.get("bands").and_then(Value::as_array) else {
        return;
    };
    for (band_index, band) in bands.iter().enumerate() {
        let Some(rows) = band.get("layers").and_then(Value::as_array) else {
            continue;
        };
        for (layer_index, layer) in rows.iter().enumerate() {
            let Some(number) = layer.get("n").and_then(Value::as_str) else {
                continue;
            };
            let path = format!("$.bands[{band_index}].layers[{layer_index}]");
            if let Some(previous) = layers.insert(number.to_string(), path.clone()) {
                errors.push(format!(
                    "{path} repeats layer {number}, already used at {previous}."
                ));
            }
        }
    }

    let mut seen_refs = false;
    if let Some(steps) = value.get("down").and_then(Value::as_array) {
        seen_refs = true;
        check_step_list(steps, "down", &layers, errors);
    }
    if let Some(steps) = value.get("up").and_then(Value::as_array) {
        seen_refs = true;
        check_step_list(steps, "up", &layers, errors);
    }
    if let Some(items) = value
        .pointer("/after/items")
        .and_then(Value::as_array)
    {
        for (index, item) in items.iter().enumerate() {
            if let Some(layer) = item.get("layer").and_then(Value::as_str) {
                seen_refs = true;
                if !layers.contains_key(layer) {
                    errors.push(format!(
                        "$.after.items[{index}].layer points at layer {layer}, which is not in bands."
                    ));
                }
            }
        }
    }
    if seen_refs && layers.is_empty() {
        errors.push("The diagram has no layers.".to_string());
    }
}

fn check_step_list(
    steps: &[Value],
    side: &str,
    layers: &BTreeMap<String, String>,
    errors: &mut Vec<String>,
) {
    for (index, step) in steps.iter().enumerate() {
        let Some(layer) = step.get("layer").and_then(Value::as_str) else {
            continue;
        };
        if !layers.contains_key(layer) {
            errors.push(format!(
                "$.{side}[{index}].layer points at layer {layer}, which is not in bands."
            ));
        }
    }
}

pub fn diagram_dir() -> std::path::PathBuf {
    std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../src/horbm/interactive")
}
