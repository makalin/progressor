//! Minimal voice-leading: semitone distance between chord roots (proxy for smoothness).

use crate::harmony::{root_index, Chord, CIRCLE_OF_FIFTHS};

/// Semitone distance between two roots (0–6, symmetric).
#[allow(dead_code)]
pub fn semitone_distance(root_a: &str, root_b: &str) -> Option<u8> {
    let i = root_index(root_a)?;
    let j = root_index(root_b)?;
    let d = (i as i32 - j as i32).abs().min(12 - (i as i32 - j as i32).abs());
    Some(d as u8)
}

/// Best inversion hint: prefer roots that are close in semitones (piano/guitar).
#[allow(dead_code)]
pub fn smoothness_score(from: &Chord, to: &Chord) -> u32 {
    semitone_distance(&from.root, &to.root)
        .map(|d| d as u32)
        .unwrap_or(12)
}

/// Roots ordered by voice-leading proximity to the given root.
pub fn roots_by_proximity(from_root: &str) -> Vec<String> {
    let idx = match root_index(from_root) {
        Some(i) => i,
        None => return CIRCLE_OF_FIFTHS.iter().map(|s| s.to_string()).collect(),
    };
    let mut out: Vec<(String, u8)> = CIRCLE_OF_FIFTHS
        .iter()
        .enumerate()
        .map(|(i, &r)| {
            let d = (i as i32 - idx as i32).abs().min(12 - (i as i32 - idx as i32).abs());
            (r.to_string(), d as u8)
        })
        .collect();
    out.sort_by_key(|(_, d)| *d);
    out.into_iter().map(|(s, _)| s).collect()
}
