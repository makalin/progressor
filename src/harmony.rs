//! Harmonic logic engine: circle of fifths, transition weights, modal interchange.

use serde::Serialize;

/// Circle of fifths order (C, G, D, A, E, B, F#/Gb, Db, Ab, Eb, Bb, F).
pub const CIRCLE_OF_FIFTHS: [&str; 12] = [
    "C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F",
];

/// Chord quality for weighting (diatonic vs borrowed).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Quality {
    Major,
    Minor,
    Dominant,
    Diminished,
    HalfDiminished,
    Augmented,
}

/// A chord in the graph.
#[derive(Clone, Debug, Serialize)]
pub struct Chord {
    pub root: String,
    pub quality: Quality,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bass: Option<String>,
}

impl Chord {
    pub fn new(root: impl Into<String>, quality: Quality) -> Self {
        Self {
            root: root.into(),
            quality,
            bass: None,
        }
    }

    #[allow(dead_code)]
    pub fn with_bass(mut self, bass: impl Into<String>) -> Self {
        self.bass = Some(bass.into());
        self
    }

    pub fn label(&self) -> String {
        let q = match self.quality {
            Quality::Major => "",
            Quality::Minor => "m",
            Quality::Dominant => "7",
            Quality::Diminished => "dim",
            Quality::HalfDiminished => "m7b5",
            Quality::Augmented => "aug",
        };
        if let Some(ref b) = self.bass {
            format!("{}{}/{}", self.root, q, b)
        } else {
            format!("{}{}", self.root, q)
        }
    }
}

/// Index of root in circle of fifths (0 = C, 1 = G, ...).
pub fn root_index(root: &str) -> Option<usize> {
    let n: &str = match root {
        "C" | "B#" => "C",
        "G" => "G",
        "D" => "D",
        "A" => "A",
        "E" => "E",
        "B" | "Cb" => "B",
        "F#" | "Gb" => "F#",
        "Db" | "C#" => "Db",
        "Ab" => "Ab",
        "Eb" => "Eb",
        "Bb" | "A#" => "Bb",
        "F" | "E#" => "F",
        _ => return None,
    };
    CIRCLE_OF_FIFTHS.iter().position(|&r| r == n)
}

/// Distance along circle of fifths (0 = same, 1 = fifth up, etc.).
#[inline]
pub fn circle_distance(from: usize, to: usize) -> usize {
    let d = (to as i32 - from as i32).rem_euclid(12);
    d as usize
}

/// Weight for transition: lower = smoother. Based on fifth distance + quality change.
pub fn transition_weight(from: &Chord, to: &Chord) -> u32 {
    let i_from = match root_index(&from.root) {
        Some(i) => i,
        None => return 1000,
    };
    let i_to = match root_index(&to.root) {
        Some(i) => i,
        None => return 1000,
    };
    let dist = circle_distance(i_from, i_to);
    let quality_penalty = if from.quality == to.quality { 0 } else { 2 };
    (dist as u32).saturating_mul(2).saturating_add(quality_penalty)
}

/// Suggested next chords from a given chord (weighted by smoothness).
pub fn suggest_next_chords(current: &Chord, count: usize) -> Vec<(Chord, u32)> {
    let roots_qualities: [(&str, Quality); 12] = [
        ("C", Quality::Major),
        ("G", Quality::Major),
        ("D", Quality::Minor),
        ("A", Quality::Minor),
        ("E", Quality::Minor),
        ("B", Quality::Minor),
        ("F#", Quality::Major),
        ("Db", Quality::Major),
        ("Ab", Quality::Major),
        ("Eb", Quality::Major),
        ("Bb", Quality::Major),
        ("F", Quality::Major),
    ];
    let mut candidates: Vec<(Chord, u32)> = roots_qualities
        .iter()
        .map(|(r, q)| {
            let c = Chord::new(*r, *q);
            (c.clone(), transition_weight(current, &c))
        })
        .collect();
    candidates.sort_by_key(|(_, w)| *w);
    candidates.truncate(count);
    candidates
}

/// Diatonic chords in major (I ii iii IV V vi vii°).
pub fn diatonic_major(tonic: &str) -> Vec<Chord> {
    let idx = match root_index(tonic) {
        Some(i) => i,
        None => return vec![],
    };
    let qualities = [
        Quality::Major,
        Quality::Minor,
        Quality::Minor,
        Quality::Major,
        Quality::Major,
        Quality::Minor,
        Quality::Diminished,
    ];
    (0..7)
        .map(|i| {
            let root_idx = (idx + i) % 12;
            Chord::new(CIRCLE_OF_FIFTHS[root_idx].to_string(), qualities[i])
        })
        .collect()
}

/// Diatonic chords in natural minor (i ii° III iv v VI VII).
pub fn diatonic_minor(tonic: &str) -> Vec<Chord> {
    let idx = match root_index(tonic) {
        Some(i) => i,
        None => return vec![],
    };
    let qualities = [
        Quality::Minor,
        Quality::Diminished,
        Quality::Major,
        Quality::Minor,
        Quality::Minor,
        Quality::Major,
        Quality::Major,
    ];
    (0..7)
        .map(|i| {
            let root_idx = (idx + i) % 12;
            Chord::new(CIRCLE_OF_FIFTHS[root_idx].to_string(), qualities[i])
        })
        .collect()
}

/// Scale degree in major: circle offset 0=I, 1=V, 2=ii, 3=vi, 4=iii, 5=vii°, 11=IV.
const DEGREE_OFFSETS: [(i32, &str); 7] = [
    (0, "I"),
    (1, "V"),
    (2, "ii"),
    (3, "vi"),
    (4, "iii"),
    (5, "vii°"),
    (11, "IV"),
];

/// Roman numeral for a chord in the given major key (e.g. "C", "G" -> "V").
pub fn chord_to_degree(tonic: &str, chord_root: &str, _is_minor: bool, is_dominant: bool) -> Option<String> {
    let tonic_idx = root_index(tonic)? as i32;
    let chord_idx = root_index(chord_root)? as i32;
    let step = (chord_idx - tonic_idx + 12) % 12;
    let (_, roman) = DEGREE_OFFSETS.iter().find(|(off, _)| *off == step)?;
    let mut s = (*roman).to_string();
    if is_dominant && s == "V" {
        s = "V7".to_string();
    }
    Some(s)
}

/// Borrowed chords from parallel minor (modal interchange): bIII, bVI, bVII, iv, etc.
/// Offsets are circle-of-fifths steps from tonic (C=0 → bIII=Eb=9, bVI=Ab=8, bVII=Bb=10, iv=Fm=11, v=Gm=1, iio=Ddim=2).
pub fn modal_interchange_chords(tonic: &str) -> Vec<(String, String)> {
    let idx = match root_index(tonic) {
        Some(i) => i,
        None => return vec![],
    };
    let borrowed: [((i32, Quality), &str); 6] = [
        ((9, Quality::Major), "bIII"),
        ((8, Quality::Major), "bVI"),
        ((10, Quality::Major), "bVII"),
        ((11, Quality::Minor), "iv"),
        ((1, Quality::Minor), "v"),
        ((2, Quality::Diminished), "ii°"),
    ];
    borrowed
        .iter()
        .map(|((offset, q), label)| {
            let root_idx = (idx as i32 + offset + 12) % 12;
            let root = CIRCLE_OF_FIFTHS[root_idx as usize].to_string();
            let chord = Chord::new(root.clone(), *q);
            (chord.label(), (*label).to_string())
        })
        .collect()
}

/// Circle of fifths as ordered list of root names.
pub fn circle_of_fifths() -> Vec<&'static str> {
    CIRCLE_OF_FIFTHS.to_vec()
}

/// Parse chord label to (root, is_minor, is_dominant). E.g. "Am" -> ("A", true, false), "G7" -> ("G", false, true).
pub fn parse_chord_label(label: &str) -> Option<(String, bool, bool)> {
    let s = label.trim();
    if s.is_empty() {
        return None;
    }
    let mut root_end = 0;
    for (i, c) in s.chars().enumerate() {
        if c == 'm' || c == '7' || c == 'M' || c == '/' {
            break;
        }
        root_end = i + 1;
    }
    let root = s.get(..root_end)?;
    let rest = s.get(root_end..).unwrap_or("");
    let is_minor = rest.starts_with('m');
    let is_dominant = rest.contains('7');
    if root_index(root).is_none() {
        return None;
    }
    Some((root.to_string(), is_minor, is_dominant))
}

/// Roman numeral for a chord label in the given key (e.g. key "C", chord "Am" -> "vi").
pub fn chord_label_to_degree(tonic: &str, chord_label: &str) -> Option<String> {
    let (root, is_minor, is_dominant) = parse_chord_label(chord_label)?;
    chord_to_degree(tonic, &root, is_minor, is_dominant)
}
