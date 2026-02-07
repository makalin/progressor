//! PROGRESSOR — WASM entry and JS bindings.

mod harmony;
mod voice_leading;

use harmony::{
    chord_label_to_degree,
    circle_of_fifths,
    diatonic_major,
    diatonic_minor,
    modal_interchange_chords,
    suggest_next_chords,
    Chord,
    Quality,
};
use serde::Serialize;
use voice_leading::roots_by_proximity;
use wasm_bindgen::prelude::*;

#[derive(Serialize)]
pub struct Suggestion {
    pub chord: String,
    pub weight: u32,
}

#[derive(Serialize)]
pub struct DiatonicRow {
    pub chord: String,
}

#[derive(Serialize)]
pub struct ProgressionExport {
    pub chords: Vec<String>,
    pub key: String,
}

/// Get suggested next chords from a current chord (e.g. "C", "Am").
#[wasm_bindgen(js_name = suggestNext)]
pub fn suggest_next(current_root: &str, quality: &str, count: usize) -> JsValue {
    let q = match quality {
        "m" | "min" | "minor" => Quality::Minor,
        "7" => Quality::Dominant,
        "dim" => Quality::Diminished,
        "m7b5" => Quality::HalfDiminished,
        "aug" => Quality::Augmented,
        _ => Quality::Major,
    };
    let current = Chord::new(current_root, q);
    let suggestions = suggest_next_chords(&current, count.min(10));
    let out: Vec<Suggestion> = suggestions
        .into_iter()
        .map(|(c, w)| Suggestion {
            chord: c.label(),
            weight: w,
        })
        .collect();
    serde_wasm_bindgen::to_value(&out).unwrap()
}

/// Get diatonic chords in major for a tonic (e.g. "C").
#[wasm_bindgen(js_name = getDiatonicMajor)]
pub fn get_diatonic_major(tonic: &str) -> JsValue {
    let chords = diatonic_major(tonic);
    let out: Vec<DiatonicRow> = chords
        .iter()
        .map(|c| DiatonicRow {
            chord: c.label().to_string(),
        })
        .collect();
    serde_wasm_bindgen::to_value(&out).unwrap()
}

/// Get roots ordered by voice-leading proximity to the given root.
#[wasm_bindgen(js_name = rootsByProximity)]
pub fn wasm_roots_by_proximity(root: &str) -> JsValue {
    serde_wasm_bindgen::to_value(&roots_by_proximity(root)).unwrap()
}

/// Export progression as JSON-serializable object (chords + key).
#[wasm_bindgen(js_name = exportProgression)]
pub fn export_progression(chords_js: JsValue, key: &str) -> JsValue {
    let chords: Vec<String> = serde_wasm_bindgen::from_value(chords_js).unwrap_or_default();
    let out = ProgressionExport {
        chords,
        key: key.to_string(),
    };
    serde_wasm_bindgen::to_value(&out).unwrap()
}

/// Export progression as Rust struct string (for generative audio / game dev).
#[wasm_bindgen(js_name = exportAsRustStruct)]
pub fn export_as_rust_struct(chords_js: JsValue) -> String {
    let chords: Vec<String> = serde_wasm_bindgen::from_value(chords_js).unwrap_or_default();
    let list: String = chords
        .iter()
        .map(|c| format!("\"{}\"", c))
        .collect::<Vec<_>>()
        .join(", ");
    format!(
        "pub const PROGRESSION: &[&str] = &[{}];",
        list
    )
}

/// Circle of fifths: ordered array of 12 root names.
#[wasm_bindgen(js_name = getCircleOfFifths)]
pub fn get_circle_of_fifths() -> JsValue {
    serde_wasm_bindgen::to_value(&circle_of_fifths()).unwrap()
}

/// Roman numeral for a chord in the given key (e.g. "C", "Am" -> "vi"). Returns null if not diatonic.
#[wasm_bindgen(js_name = chordToDegree)]
pub fn wasm_chord_to_degree(tonic: &str, chord_label: &str) -> JsValue {
    chord_label_to_degree(tonic, chord_label)
        .map(|s| JsValue::from_str(&s))
        .unwrap_or(JsValue::NULL)
}

/// Modal interchange: borrowed chords from parallel minor.
#[wasm_bindgen(js_name = getModalInterchange)]
pub fn get_modal_interchange(tonic: &str) -> JsValue {
    let list: Vec<(String, String)> = modal_interchange_chords(tonic);
    serde_wasm_bindgen::to_value(&list).unwrap()
}

/// Diatonic chords in natural minor.
#[wasm_bindgen(js_name = getDiatonicMinor)]
pub fn get_diatonic_minor(tonic: &str) -> JsValue {
    let chords = diatonic_minor(tonic);
    let out: Vec<DiatonicRow> = chords
        .iter()
        .map(|c| DiatonicRow {
            chord: c.label().to_string(),
        })
        .collect();
    serde_wasm_bindgen::to_value(&out).unwrap()
}
