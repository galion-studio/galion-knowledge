// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Galion Labs

use std::path::PathBuf;
use std::process::ExitCode;
use std::time::Duration;

use clap::Parser;
use truth_gate::{run, Options};

#[derive(Parser)]
#[command(
    name = "truth-gate",
    about = "Check Galion Knowledge cards before they are published."
)]
struct Cli {
    /// Directory of card files, with world/, horbm/, and diary/ inside it.
    #[arg(long, default_value = "v2/data/cards")]
    cards: PathBuf,
    /// Card JSON Schema.
    #[arg(long, default_value = "v2/data/schema.json")]
    schema: PathBuf,
    /// Gate config: banned hosts, source classes, and thresholds.
    #[arg(long, default_value = "v2/tools/truth-gate/truth-gate.toml")]
    config: PathBuf,
    /// Catalog of section and category ids. Omit with --no-catalog.
    #[arg(long, default_value = "v2/data/catalog.json")]
    catalog: PathBuf,
    /// Skip the catalog check.
    #[arg(long)]
    no_catalog: bool,
    /// Write the JSON report here.
    #[arg(long)]
    json: Option<PathBuf>,
    /// Write the Markdown report here.
    #[arg(long)]
    markdown: Option<PathBuf>,
    /// Request each source URL. Off by default so a run needs no network.
    #[arg(long)]
    check_urls: bool,
    /// Per-URL timeout, in seconds, for --check-urls.
    #[arg(long, default_value_t = 8)]
    timeout_secs: u64,
}

fn main() -> ExitCode {
    let cli = Cli::parse();
    let report = match run(&Options {
        cards_dir: cli.cards,
        schema_path: cli.schema,
        config_path: cli.config,
        catalog_path: if cli.no_catalog {
            None
        } else {
            Some(cli.catalog)
        },
        check_urls: cli.check_urls,
        timeout: Duration::from_secs(cli.timeout_secs),
    }) {
        Ok(report) => report,
        Err(err) => {
            eprintln!("truth-gate: {err}");
            return ExitCode::from(2);
        }
    };
    if let Some(path) = &cli.json {
        if let Err(err) = report.write_json(path) {
            eprintln!("truth-gate: writing {}: {err}", path.display());
            return ExitCode::from(2);
        }
    }
    if let Some(path) = &cli.markdown {
        if let Err(err) = report.write_markdown(path) {
            eprintln!("truth-gate: writing {}: {err}", path.display());
            return ExitCode::from(2);
        }
    }
    println!("{}", report.summary());
    ExitCode::from(report.exit_code() as u8)
}
