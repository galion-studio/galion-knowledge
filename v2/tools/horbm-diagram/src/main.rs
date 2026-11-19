// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Galion Labs

use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::ExitCode;

use horbm_diagram::{diagram_dir, validate};

fn main() -> ExitCode {
    let args: Vec<String> = env::args().skip(1).collect();
    if args.iter().any(|arg| arg == "--help" || arg == "-h") {
        println!("Usage: horbm-diagram [horbm.json] [horbm.schema.json]");
        println!("Checks the HORBM diagram. With no arguments, checks v2/src/horbm/interactive/.");
        return ExitCode::SUCCESS;
    }
    if args.len() > 2 {
        eprintln!("Usage: horbm-diagram [horbm.json] [horbm.schema.json]");
        return ExitCode::from(2);
    }

    let root = diagram_dir();
    let json_path = args
        .first()
        .map(PathBuf::from)
        .unwrap_or_else(|| root.join("horbm.json"));
    let schema_path = args
        .get(1)
        .map(PathBuf::from)
        .unwrap_or_else(|| root.join("horbm.schema.json"));

    let json_text = match fs::read_to_string(&json_path) {
        Ok(text) => text,
        Err(err) => {
            eprintln!("Could not read {}: {err}", json_path.display());
            return ExitCode::from(1);
        }
    };
    let schema_text = match fs::read_to_string(&schema_path) {
        Ok(text) => text,
        Err(err) => {
            eprintln!("Could not read {}: {err}", schema_path.display());
            return ExitCode::from(1);
        }
    };

    match validate(&json_text, &schema_text) {
        Ok(()) => {
            println!("{} matches the diagram schema.", json_path.display());
            ExitCode::SUCCESS
        }
        Err(errors) => {
            eprintln!("{} failed.", json_path.display());
            for error in errors {
                eprintln!("- {error}");
            }
            ExitCode::from(1)
        }
    }
}
