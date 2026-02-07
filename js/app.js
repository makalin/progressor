/**
 * PROGRESSOR — frontend: WASM init, UI bindings, progression state.
 */

import init, {
  suggestNext,
  getDiatonicMajor,
  getDiatonicMinor,
  getCircleOfFifths,
  rootsByProximity,
  chordToDegree,
  getModalInterchange,
  exportProgression,
  exportAsRustStruct,
} from "../pkg/progressor.js";

const THEMES = [
  { id: "terminal", name: "Terminal" },
  { id: "oscilloscope", name: "Oscilloscope" },
  { id: "parchment", name: "Parchment" },
  { id: "neon", name: "Neon" },
  { id: "ember", name: "Ember" },
  { id: "stealth", name: "Stealth" },
  { id: "ocean", name: "Ocean" },
  { id: "forest", name: "Forest" },
  { id: "sunset", name: "Sunset" },
  { id: "ink", name: "Ink" },
  { id: "lime", name: "Lime" },
  { id: "rose", name: "Rose" },
  { id: "polar", name: "Polar" },
];

const SHORTCUTS = [
  { keys: ["1", "2", "3", "4", "5", "6", "7", "8"], action: "Set current chord to suggestion 1–8 (Play tab)" },
  { keys: ["Enter", "Space"], action: "Add current chord to progression" },
  { keys: ["Backspace"], action: "Remove last chord from progression" },
  { keys: ["C"], action: "Clear progression (when not typing in input)" },
  { keys: ["M"], action: "Mutate: add a suggested variation" },
  { keys: ["Q", "W", "E"], action: "Quality: Maj / Min / 7" },
  { keys: ["F1"], action: "Open Info tab" },
  { keys: ["F2"], action: "Open Play tab" },
  { keys: ["F3"], action: "Open Theory tab" },
  { keys: ["F4"], action: "Open Tools tab" },
  { keys: ["F5"], action: "Open Setup tab" },
];

const PRESETS = [
  { name: "I – V – vi – IV", degrees: [0, 4, 5, 3] },
  { name: "ii – V – I", degrees: [1, 4, 0] },
  { name: "I – vi – IV – V", degrees: [0, 5, 3, 4] },
  { name: "I – IV – V", degrees: [0, 3, 4] },
  { name: "vi – IV – I – V", degrees: [5, 3, 0, 4] },
];

const GENRES = [
  { id: "pop", name: "Pop", progressions: [
    { name: "I – V – vi – IV", degrees: [0, 4, 5, 3] },
    { name: "I – vi – IV – V", degrees: [0, 5, 3, 4] },
    { name: "vi – IV – I – V", degrees: [5, 3, 0, 4] },
  ]},
  { id: "jazz", name: "Jazz", progressions: [
    { name: "ii – V – I", degrees: [1, 4, 0] },
    { name: "ii – V – I – vi", degrees: [1, 4, 0, 5] },
    { name: "I – vi – ii – V", degrees: [0, 5, 1, 4] },
  ]},
  { id: "blues", name: "Blues", progressions: [
    { name: "I – IV – V", degrees: [0, 3, 4] },
    { name: "12-bar (I I IV I…)", degrees: [0, 0, 3, 0, 4, 4, 0, 0, 3, 3, 0, 4] },
  ]},
  { id: "rock", name: "Rock", progressions: [
    { name: "I – IV – V", degrees: [0, 3, 4] },
    { name: "I – V – IV", degrees: [0, 4, 3] },
    { name: "I – V – vi – IV", degrees: [0, 4, 5, 3] },
  ]},
  { id: "folk", name: "Folk", progressions: [
    { name: "I – V", degrees: [0, 4] },
    { name: "I – IV – V", degrees: [0, 3, 4] },
    { name: "I – vi – IV – V", degrees: [0, 5, 3, 4] },
  ]},
  { id: "rnb", name: "R&B", progressions: [
    { name: "I – iii – iv – IV", degrees: [0, 2, 3, 3] },
    { name: "I – IV – V", degrees: [0, 3, 4] },
    { name: "ii – V – I", degrees: [1, 4, 0] },
  ]},
  { id: "latin", name: "Latin", progressions: [
    { name: "I – IV – iv – IV", degrees: [0, 3, 3, 3] },
    { name: "ii – V – I", degrees: [1, 4, 0] },
    { name: "I – vi – ii – V", degrees: [0, 5, 1, 4] },
  ]},
  { id: "classical", name: "Classical", progressions: [
    { name: "I – IV – V – I", degrees: [0, 3, 4, 0] },
    { name: "I – ii – V – I", degrees: [0, 1, 4, 0] },
    { name: "I – vi – IV – V", degrees: [0, 5, 3, 4] },
  ]},
];

const state = {
  currentRoot: "C",
  currentQuality: "",
  progression: [],
  wasmReady: false,
  history: [],
  diatonicMode: "major",
  midiAccess: null,
  songParts: { verse: [], chorus: [], bridge: [], intro: [], outro: [] },
  audioContext: null,
  selectedGenres: [],
  previewTimer: null,
};

const MAX_HISTORY = 24;

const $ = (id) => document.getElementById(id);
const statusEl = () => $("wasmStatus");
const currentChordEl = () => $("currentChord");
const suggestionListEl = () => $("suggestionList");
const progressionBarEl = () => $("progressionBar");
const degreesRowEl = () => $("degreesRow");
const diatonicListEl = () => $("diatonicList");
const keyInputEl = () => $("keyInput");
const circleEl = () => $("circleOfFifths");
const proximityListEl = () => $("proximityList");
const modalListEl = () => $("modalList");
const historyListEl = () => $("historyList");
const circleSvgEl = () => $("circleSvg");
const chordFlowEl = () => $("chordFlowDiagram");
const secondaryListEl = () => $("secondaryList");
const songStructureEl = () => $("songStructure");
const pianoWrapEl = () => $("pianoWrap");
const partSelectEl = () => $("partSelect");
const genreCheckboxesEl = () => $("genreCheckboxes");
const genreProgressionsEl = () => $("genreProgressions");
const previewBpmEl = () => $("previewBpm");
const previewBeatsEl = () => $("previewBeats");
const previewStyleEl = () => $("previewStyle");

function setStatus(text, ok = true) {
  const el = statusEl();
  if (!el) return;
  el.textContent = text;
  el.className = ok ? "ok" : "err";
}

function currentChordLabel() {
  const q = state.currentQuality === "m" ? "m" : state.currentQuality === "7" ? "7" : "";
  return state.currentRoot + q;
}

function setCurrentChord(root, quality) {
  state.currentRoot = root;
  state.currentQuality = quality || "";
  pushHistory(currentChordLabel());
  renderCurrentChord();
  renderSuggestions();
  renderProximity();
  renderCircleActive();
  renderPianoHighlight();
}

function pushHistory(label) {
  state.history = [label, ...state.history.filter((c) => c !== label)].slice(0, MAX_HISTORY);
  renderHistory();
}

function renderCurrentChord() {
  currentChordEl().textContent = currentChordLabel();
}

function renderSuggestions() {
  if (!state.wasmReady) return;
  const list = suggestionListEl();
  list.innerHTML = "";
  const suggestions = suggestNext(state.currentRoot, state.currentQuality || "major", 8);
  for (const s of suggestions) {
    const li = document.createElement("li");
    const chordSpan = document.createElement("span");
    chordSpan.className = "chord";
    chordSpan.textContent = s.chord;
    chordSpan.style.cursor = "pointer";
    chordSpan.addEventListener("click", () => setCurrentFromLabel(s.chord));
    const weightSpan = document.createElement("span");
    weightSpan.className = "weight";
    weightSpan.textContent = "w:" + s.weight;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "add";
    btn.addEventListener("click", () => addToProgression(s.chord));
    li.appendChild(chordSpan);
    li.appendChild(weightSpan);
    li.appendChild(btn);
    list.appendChild(li);
  }
}

function setCurrentFromLabel(label) {
  const root = label.replace(/m$|7$|dim$|aug$|m7b5$/i, "").trim();
  let quality = "";
  if (/m7b5/.test(label)) quality = "m7b5";
  else if (/dim/.test(label)) quality = "dim";
  else if (/aug/.test(label)) quality = "aug";
  else if (/m(?!aj)/i.test(label) || label.endsWith("m")) quality = "m";
  else if (/7/.test(label)) quality = "7";
  setCurrentChord(root, quality);
}

function addToProgression(chord) {
  state.progression.push(chord);
  pushHistory(chord);
  renderProgression();
}

function renderProgression() {
  const bar = progressionBarEl();
  bar.innerHTML = "";
  state.progression.forEach((chord) => {
    const chip = document.createElement("span");
    chip.className = "chord-chip";
    chip.textContent = chord;
    chip.style.cursor = "pointer";
    chip.addEventListener("click", () => setCurrentFromLabel(chord));
    bar.appendChild(chip);
  });
  renderDegrees();
}

function renderDegrees() {
  if (!state.wasmReady) return;
  const key = keyInputEl().value.trim() || "C";
  const row = degreesRowEl();
  row.innerHTML = "";
  state.progression.forEach((chord) => {
    const deg = chordToDegree(key, chord);
    const span = document.createElement("span");
    span.className = "degree-chip";
    span.textContent = deg != null && String(deg) !== "" ? deg : "—";
    row.appendChild(span);
  });
}

function renderCircleOfFifths() {
  if (!state.wasmReady) return;
  const roots = getCircleOfFifths();
  const wrap = circleEl();
  wrap.innerHTML = "";
  roots.forEach((root) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "circle-btn";
    btn.textContent = root;
    btn.addEventListener("click", () => {
      keyInputEl().value = root;
      setCurrentChord(root, state.currentQuality);
      renderDiatonic();
      renderModal();
    });
    wrap.appendChild(btn);
  });
  renderCircleActive();
}

function renderCircleActive() {
  const key = keyInputEl().value.trim() || "C";
  circleEl().querySelectorAll(".circle-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.textContent === key);
  });
}

function renderProximity() {
  if (!state.wasmReady) return;
  const roots = rootsByProximity(state.currentRoot);
  const list = proximityListEl();
  list.innerHTML = "";
  roots.forEach((root) => {
    const li = document.createElement("li");
    li.textContent = root;
    li.addEventListener("click", () => setCurrentChord(root, state.currentQuality));
    list.appendChild(li);
  });
}

function renderDiatonic() {
  if (!state.wasmReady) return;
  const key = keyInputEl().value.trim() || "C";
  const list = diatonicListEl();
  list.innerHTML = "";
  const diatonic = state.diatonicMode === "minor" ? getDiatonicMinor(key) : getDiatonicMajor(key);
  for (const row of diatonic) {
    const li = document.createElement("li");
    li.textContent = row.chord;
    li.style.cursor = "pointer";
    li.addEventListener("click", () => setCurrentFromLabel(row.chord));
    list.appendChild(li);
  }
}

function renderModal() {
  if (!state.wasmReady) return;
  const key = keyInputEl().value.trim() || "C";
  const borrowed = getModalInterchange(key);
  const list = modalListEl();
  list.innerHTML = "";
  borrowed.forEach(([chord, label]) => {
    const li = document.createElement("li");
    const chordBtn = document.createElement("span");
    chordBtn.className = "modal-chord";
    chordBtn.textContent = chord;
    chordBtn.addEventListener("click", () => setCurrentFromLabel(chord));
    const labelSpan = document.createElement("span");
    labelSpan.className = "modal-label";
    labelSpan.textContent = label;
    li.appendChild(chordBtn);
    li.appendChild(labelSpan);
    list.appendChild(li);
  });
}

const ROOT_SEMI = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
const ROOT_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function chordToNoteNames(label) {
  const root = (label.match(/^([A-G]#?b?)/) || [])[1];
  if (!root || ROOT_SEMI[root] === undefined) return [];
  const semi = ROOT_SEMI[root];
  let intervals = [0, 4, 7];
  if (/m7b5|dim/.test(label)) intervals = [0, 3, 6];
  else if (/m(?!aj)/i.test(label) || label.endsWith("m")) intervals = [0, 3, 7];
  else if (/7/.test(label)) intervals = [0, 4, 7, 10];
  else if (/aug/.test(label)) intervals = [0, 4, 8];
  const names = [];
  for (const i of intervals) {
    const s = (semi + i) % 12;
    names.push(ROOT_NAMES[s] + "4");
  }
  return names;
}

function chordToMidiNotes(label) {
  const root = (label.match(/^([A-G]#?b?)/) || [])[1];
  if (!root || ROOT_SEMI[root] === undefined) return [];
  const semi = ROOT_SEMI[root];
  let intervals = [0, 4, 7];
  if (/m7b5|dim/.test(label)) intervals = [0, 3, 6];
  else if (/m(?!aj)/i.test(label) || label.endsWith("m")) intervals = [0, 3, 7];
  else if (/7/.test(label)) intervals = [0, 4, 7, 10];
  else if (/aug/.test(label)) intervals = [0, 4, 8];
  return intervals.map((i) => 60 + (semi + i) % 12);
}

function renderSongStructure() {
  const el = songStructureEl();
  if (!el) return;
  const parts = [];
  ["intro", "verse", "chorus", "bridge", "outro"].forEach((key) => {
    const chords = state.songParts[key];
    if (chords && chords.length) parts.push({ name: key, chords });
  });
  if (parts.length === 0) {
    el.textContent = "No parts saved yet.";
    return;
  }
  el.innerHTML = parts.map((p) => '<span class="part-block"><span class="part-name">' + p.name + "</span>: <span class=\"part-chords\">" + p.chords.join(" ") + "</span></span>").join(" | ");
}

function savePart() {
  const part = partSelectEl()?.value || "verse";
  if (!state.songParts[part]) state.songParts[part] = [];
  state.songParts[part] = [...state.progression];
  renderSongStructure();
}

function loadPart() {
  const part = partSelectEl()?.value || "verse";
  const chords = state.songParts[part];
  if (chords && chords.length) {
    state.progression = [...chords];
    renderProgression();
  }
}

function buildPiano() {
  const wrap = pianoWrapEl();
  if (!wrap) return;
  wrap.innerHTML = "";
  const whiteOrder = [0, 2, 4, 5, 7, 9, 11];
  const blackOff = [1, 3, null, 6, 8, 10, null];
  const startMidi = 48;
  const endMidi = 73;
  for (let midi = startMidi; midi < endMidi; midi++) {
    const pc = midi % 12;
    const isBlack = [1, 3, 6, 8, 10].indexOf(pc) >= 0;
    const key = document.createElement("div");
    key.className = "piano-key " + (isBlack ? "black" : "white");
    key.setAttribute("data-midi", midi);
    key.setAttribute("data-note", ROOT_NAMES[pc] + Math.floor(midi / 12));
    key.textContent = isBlack ? "" : ROOT_NAMES[pc];
    key.addEventListener("mousedown", (e) => {
      e.preventDefault();
      playPianoNote(midi);
      key.classList.add("playing");
    });
    key.addEventListener("mouseup", () => key.classList.remove("playing"));
    key.addEventListener("mouseleave", () => key.classList.remove("playing"));
    wrap.appendChild(key);
  }
  renderPianoHighlight();
}

function renderPianoHighlight() {
  const names = chordToNoteNames(currentChordLabel());
  pianoWrapEl()?.querySelectorAll(".piano-key").forEach((key) => {
    const note = key.getAttribute("data-note");
    key.classList.toggle("highlight", names.indexOf(note) >= 0);
  });
}

function playPianoNote(midi) {
  if (!state.audioContext) state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const ctx = state.audioContext;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
  osc.type = "sine";
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
}

function renderGenreCheckboxes() {
  const wrap = genreCheckboxesEl();
  if (!wrap) return;
  wrap.innerHTML = "";
  GENRES.forEach((g) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = g.id;
    input.checked = state.selectedGenres.includes(g.id);
    input.addEventListener("change", () => {
      if (input.checked) state.selectedGenres.push(g.id);
      else state.selectedGenres = state.selectedGenres.filter((id) => id !== g.id);
      renderGenreProgressions();
    });
    label.appendChild(input);
    label.appendChild(document.createTextNode(" " + g.name));
    wrap.appendChild(label);
  });
}

function renderGenreProgressions() {
  const wrap = genreProgressionsEl();
  if (!wrap) return;
  wrap.innerHTML = "";
  const ids = state.selectedGenres.length ? state.selectedGenres : GENRES.map((g) => g.id);
  GENRES.filter((g) => ids.includes(g.id)).forEach((genre) => {
    genre.progressions.forEach((prog) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "genre-prog-btn";
      btn.textContent = genre.name + ": " + prog.name;
      btn.addEventListener("click", () => loadGenreProgression(prog.degrees));
      wrap.appendChild(btn);
    });
  });
  if (wrap.children.length === 0) wrap.innerHTML = "<span class=\"pane-desc\">Select genres above</span>";
}

function loadGenreProgression(degrees) {
  if (!state.wasmReady) return;
  applyPreset(degrees);
}

function playChordAtTime(ctx, chordLabel, startTime, durationSec, style) {
  const notes = chordToMidiNotes(chordLabel);
  if (!notes.length) return;
  const isArp = style.startsWith("arpeggio");
  const step = isArp ? Math.min(0.08, durationSec / notes.length) : 0;
  const order = style === "arpeggio-down" ? [...notes].reverse() : notes;
  order.forEach((midi, i) => {
    const t = startTime + (isArp ? i * step : 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
    osc.type = "sine";
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, t + durationSec);
    osc.start(t);
    osc.stop(t + durationSec);
  });
}

function startPreview() {
  const chords = state.progression.length ? [...state.progression] : [];
  if (!chords.length) return;
  if (!state.audioContext) state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const ctx = state.audioContext;
  if (ctx.state === "suspended") ctx.resume();
  const bpm = Math.max(40, Math.min(240, parseInt(previewBpmEl()?.value || "120", 10)));
  const beatsPerChord = Math.max(1, Math.min(8, parseInt(previewBeatsEl()?.value || "2", 10)));
  const style = previewStyleEl()?.value || "block";
  const chordDurationSec = (60 / bpm) * beatsPerChord;
  let index = 0;
  $("btnPreviewPlay").disabled = true;
  $("btnPreviewStop").disabled = false;
  function tick() {
    if (index >= chords.length) {
      index = 0;
    }
    const chord = chords[index];
    playChordAtTime(ctx, chord, ctx.currentTime, chordDurationSec, style);
    index++;
    state.previewTimer = setTimeout(tick, chordDurationSec * 1000);
  }
  tick();
}

function stopPreview() {
  if (state.previewTimer) {
    clearTimeout(state.previewTimer);
    state.previewTimer = null;
  }
  $("btnPreviewPlay").disabled = false;
  $("btnPreviewStop").disabled = true;
}

function exportMidi() {
  const bpm = 120;
  const ticksPerBeat = 480;
  const beatsPerChord = 2;
  const deltaPerChord = ticksPerBeat * beatsPerChord;
  const events = [];
  let time = 0;
  state.progression.forEach((chord) => {
    const notes = chordToMidiNotes(chord);
    notes.forEach((n) => {
      events.push({ delta: time, on: true, note: n, vel: 80 });
      events.push({ delta: time + deltaPerChord, on: false, note: n, vel: 0 });
    });
    time += deltaPerChord;
  });
  events.sort((a, b) => a.delta - b.delta);
  let lastDelta = 0;
  const buf = [];
  function writeVar(v) {
    let x = v;
    const out = [];
    out.push(x & 0x7f);
    while ((x >>= 7)) out.unshift((x & 0x7f) | 0x80);
    out.forEach((b) => buf.push(b));
  }
  events.forEach((e) => {
    writeVar(e.delta - lastDelta);
    lastDelta = e.delta;
    buf.push(e.on ? 0x90 : 0x80, e.note, e.vel);
  });
  const header = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0x01, 0xe0];
  const trackLen = buf.length;
  const track = [0x4d, 0x54, 0x72, 0x6b, (trackLen >> 24) & 255, (trackLen >> 16) & 255, (trackLen >> 8) & 255, trackLen & 255].concat(buf);
  const blob = new Blob([new Uint8Array(header.concat(track))], { type: "audio/midi" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "progression.mid";
  a.click();
  URL.revokeObjectURL(a.href);
}

function renderHistory() {
  const list = historyListEl();
  if (!list) return;
  list.innerHTML = "";
  state.history.slice(0, MAX_HISTORY).forEach((chord) => {
    const li = document.createElement("li");
    li.textContent = chord;
    li.addEventListener("click", () => setCurrentFromLabel(chord));
    list.appendChild(li);
  });
}

function renderCircleSvg() {
  if (!state.wasmReady) return;
  const roots = getCircleOfFifths();
  const key = keyInputEl().value.trim() || "C";
  const svg = circleSvgEl();
  if (!svg) return;
  svg.innerHTML = "";
  const cx = 110;
  const cy = 110;
  const R = 85;
  const r = 18;
  const ns = "http://www.w3.org/2000/svg";
  const ring = document.createElementNS(ns, "circle");
  ring.setAttribute("class", "ring");
  ring.setAttribute("cx", cx);
  ring.setAttribute("cy", cy);
  ring.setAttribute("r", R + r + 4);
  svg.appendChild(ring);
  roots.forEach((root, i) => {
    const angle = (-90 + i * 30) * (Math.PI / 180);
    const x = cx + R * Math.cos(angle);
    const y = cy + R * Math.sin(angle);
    const g = document.createElementNS(ns, "g");
    const circle = document.createElementNS(ns, "circle");
    circle.setAttribute("class", "node" + (root === key ? " active" : ""));
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", r);
    circle.setAttribute("data-root", root);
    circle.addEventListener("click", () => {
      keyInputEl().value = root;
      setCurrentChord(root, state.currentQuality);
      renderDiatonic();
      renderModal();
      renderCircleSvg();
      renderSecondaryDominants();
    });
    const text = document.createElementNS(ns, "text");
    text.setAttribute("x", x);
    text.setAttribute("y", y);
    text.textContent = root;
    g.appendChild(circle);
    g.appendChild(text);
    svg.appendChild(g);
  });
}

function renderChordFlow() {
  if (!state.wasmReady) return;
  const container = chordFlowEl();
  if (!container) return;
  container.innerHTML = "";
  const cur = currentChordLabel();
  const spanCur = document.createElement("span");
  spanCur.className = "chord-flow-node current";
  spanCur.textContent = cur;
  spanCur.addEventListener("click", () => switchTab("play"));
  container.appendChild(spanCur);
  const suggestions = suggestNext(state.currentRoot, state.currentQuality || "major", 6);
  suggestions.forEach((s) => {
    const arrow = document.createElement("span");
    arrow.className = "chord-flow-arrow";
    arrow.textContent = "→";
    container.appendChild(arrow);
    const node = document.createElement("span");
    node.className = "chord-flow-node";
    node.textContent = s.chord + " (w:" + s.weight + ")";
    node.addEventListener("click", () => {
      setCurrentFromLabel(s.chord);
      switchTab("play");
    });
    container.appendChild(node);
  });
}

function getSecondaryDominants(key) {
  if (!state.wasmReady) return [];
  const diatonic = getDiatonicMajor(key);
  if (diatonic.length < 7) return [];
  const roots = getCircleOfFifths();
  const labels = ["V/V", "V/ii", "V/vi", "V/iii", "V/vii°", "V/IV"];
  const degreeIndices = [1, 2, 3, 4, 5, 6];
  const result = [];
  for (let i = 0; i < degreeIndices.length; i++) {
    const chordLabel = diatonic[degreeIndices[i]].chord;
    const root = (chordLabel.match(/^([A-G]#?b?)/) || [chordLabel.slice(0, 2)])[1];
    const rootIdx = roots.indexOf(root);
    if (rootIdx === -1) continue;
    const fifthIdx = (rootIdx + 1) % 12;
    result.push([roots[fifthIdx] + "7", labels[i]]);
  }
  return result;
}

function renderSecondaryDominants() {
  const key = keyInputEl().value.trim() || "C";
  const list = secondaryListEl();
  if (!list) return;
  list.innerHTML = "";
  const sec = getSecondaryDominants(key);
  sec.forEach(([chord, label]) => {
    const li = document.createElement("li");
    const btn = document.createElement("span");
    btn.className = "sec-chord";
    btn.textContent = chord;
    btn.addEventListener("click", () => setCurrentFromLabel(chord));
    const lbl = document.createElement("span");
    lbl.className = "sec-label";
    lbl.textContent = label;
    li.appendChild(btn);
    li.appendChild(lbl);
    list.appendChild(li);
  });
}

function bindQualityTabs() {
  document.querySelectorAll(".quality-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".quality-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.currentQuality = btn.dataset.quality || "";
      renderCurrentChord();
      renderSuggestions();
    });
  });
}

function bindKeyInput() {
  const keyEl = keyInputEl();
  if (!keyEl) return;
  const onKeyChange = () => {
    renderDiatonic();
    renderModal();
    renderDegrees();
    renderCircleActive();
    renderCircleSvg();
    renderSecondaryDominants();
  };
  keyEl.addEventListener("input", onKeyChange);
  keyEl.addEventListener("change", onKeyChange);
}

function bindDiatonicTabs() {
  document.querySelectorAll(".diatonic-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".diatonic-tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.diatonicMode = btn.dataset.mode || "major";
      renderDiatonic();
    });
  });
}

function switchTab(tabId) {
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.remove("active");
    panel.hidden = true;
  });
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
    btn.setAttribute("aria-selected", "false");
  });
  const panel = $("tab-" + tabId);
  const btn = document.querySelector('.tab-btn[data-tab="' + tabId + '"]');
  if (panel) {
    panel.classList.add("active");
    panel.hidden = false;
  }
  if (btn) {
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
  }
  if (tabId === "play") renderCircleActive();
  if (tabId === "theory") {
    renderCircleSvg();
    renderChordFlow();
    renderSecondaryDominants();
  }
}

function bindTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
}

function applyTheme(themeId) {
  document.documentElement.setAttribute("data-theme", themeId || "terminal");
  try {
    localStorage.setItem("progressor-theme", themeId || "terminal");
  } catch (_) {}
}

function applyChordSize(size) {
  const el = currentChordEl();
  if (!el) return;
  el.classList.remove("size-xlarge", "size-huge");
  if (size === "xlarge") el.classList.add("size-xlarge");
  if (size === "huge") el.classList.add("size-huge");
  try {
    localStorage.setItem("progressor-chord-size", size || "large");
  } catch (_) {}
}

function initSetup() {
  const grid = $("themeGrid");
  if (!grid) return;
  grid.innerHTML = "";
  THEMES.forEach((t) => {
    const label = document.createElement("label");
    label.className = "theme-opt";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "theme";
    input.value = t.id;
    input.checked = document.documentElement.getAttribute("data-theme") === t.id;
    const swatch = document.createElement("span");
    swatch.className = "theme-swatch " + t.id;
    label.appendChild(input);
    label.appendChild(swatch);
    label.appendChild(document.createTextNode(" " + t.name));
    label.addEventListener("change", () => {
      if (input.checked) applyTheme(t.id);
    });
    grid.appendChild(label);
  });
  const size = localStorage.getItem("progressor-chord-size") || "large";
  const sizeRadio = document.querySelector('input[name="chordSize"][value="' + size + '"]');
  if (sizeRadio) sizeRadio.checked = true;
  applyChordSize(size);
  document.querySelectorAll('input[name="chordSize"]').forEach((radio) => {
    radio.addEventListener("change", () => applyChordSize(radio.value));
  });
}

function applyPreset(degrees) {
  if (!state.wasmReady) return;
  const key = keyInputEl().value.trim() || "C";
  const diatonic = getDiatonicMajor(key);
  if (diatonic.length < 7) return;
  state.progression = degrees.map((d) => diatonic[d].chord);
  renderProgression();
  pushHistory(state.progression[state.progression.length - 1]);
  switchTab("play");
}

function bindPresets() {
  const wrap = $("presetButtons");
  if (!wrap) return;
  wrap.innerHTML = "";
  PRESETS.forEach((preset) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset-btn";
    btn.textContent = preset.name;
    btn.addEventListener("click", () => applyPreset(preset.degrees));
    wrap.appendChild(btn);
  });
}

function doRandomProgression() {
  if (!state.wasmReady) return;
  state.progression = [];
  let root = state.currentRoot;
  let quality = state.currentQuality || "major";
  for (let i = 0; i < 4; i++) {
    const suggestions = suggestNext(root, quality, 4);
    if (suggestions.length === 0) break;
    const pick = suggestions[Math.floor(Math.random() * suggestions.length)];
    state.progression.push(pick.chord);
    const nextRoot = pick.chord.replace(/m$|7$|dim$|aug$|m7b5$/gi, "").trim();
    const nextQ = /m7b5|dim|aug/.test(pick.chord) ? "" : /m(?!aj)/i.test(pick.chord) || pick.chord.endsWith("m") ? "m" : /7/.test(pick.chord) ? "7" : "";
    root = nextRoot;
    quality = nextQ || "major";
  }
  renderProgression();
  if (state.progression.length) pushHistory(state.progression[state.progression.length - 1]);
  switchTab("play");
}

function doCopyProgression() {
  const text = state.progression.length ? state.progression.join(" ") : "";
  const feedback = $("copyFeedback");
  if (!navigator.clipboard || !navigator.clipboard.writeText) {
    if (feedback) feedback.textContent = "Clipboard not available";
    return;
  }
  navigator.clipboard.writeText(text).then(() => {
    if (feedback) {
      feedback.textContent = "Copied.";
      setTimeout(() => { feedback.textContent = ""; }, 2000);
    }
  }).catch(() => {
    if (feedback) feedback.textContent = "Failed";
  });
}

function bindKeyboard() {
  document.addEventListener("keydown", (e) => {
    const target = e.target;
    const isInput = /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
    const activeTab = document.querySelector(".tab-panel.active");
    const tabId = activeTab ? activeTab.id.replace("tab-", "") : "";

    if (e.key >= "F1" && e.key <= "F5") {
      const tabs = ["info", "play", "theory", "tools", "setup"];
      const i = parseInt(e.key.slice(1), 10) - 1;
      if (tabs[i]) switchTab(tabs[i]);
      e.preventDefault();
      return;
    }

    if (isInput && target.getAttribute("type") !== "number") return;

    const digit = e.key >= "1" && e.key <= "8" ? parseInt(e.key, 10) - 1 : -1;
    if (digit >= 0 && tabId === "play" && suggestionListEl()) {
      const items = suggestionListEl().querySelectorAll(".chord");
      if (items[digit]) {
        items[digit].click();
        e.preventDefault();
      }
      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      if (tabId === "play" && $("btnAdd")) {
        addToProgression(currentChordLabel());
        e.preventDefault();
      }
      return;
    }

    if (e.key === "Backspace" && tabId === "play") {
      if (state.progression.length) {
        state.progression.pop();
        renderProgression();
        e.preventDefault();
      }
      return;
    }

    if (e.key === "c" && !e.ctrlKey && !e.metaKey && tabId === "play") {
      state.progression = [];
      renderProgression();
      e.preventDefault();
      return;
    }

    if (e.key === "m" && !e.ctrlKey && !e.metaKey && tabId === "play" && $("btnMutate")) {
      $("btnMutate").click();
      e.preventDefault();
      return;
    }

    if ((e.key === "q" || e.key === "w" || e.key === "e") && !e.ctrlKey && !e.metaKey && tabId === "play") {
      const q = { q: "", w: "m", e: "7" }[e.key];
      state.currentQuality = q;
      document.querySelectorAll(".quality-btn").forEach((b) => b.classList.remove("active"));
      const btn = document.querySelector('.quality-btn[data-quality="' + q + '"]');
      if (btn) btn.classList.add("active");
      renderCurrentChord();
      renderSuggestions();
      e.preventDefault();
    }
  });
}

function renderShortcutRefs() {
  const ref = $("shortcutsRef");
  if (ref) {
    ref.innerHTML = SHORTCUTS.map((s) => "<kbd>" + s.keys.join("</kbd> <kbd>") + "</kbd> → " + s.action).join("<br>");
  }
  const infoList = $("infoShortcuts");
  if (infoList) {
    infoList.innerHTML = SHORTCUTS.map((s) => "<dt><kbd>" + s.keys.join("</kbd> <kbd>") + "</kbd></dt><dd>" + s.action + "</dd>").join("");
  }
}

function bindButtons() {
  $("btnAdd")?.addEventListener("click", () => {
    addToProgression(currentChordLabel());
  });
  $("btnClear")?.addEventListener("click", () => {
    state.progression = [];
    renderProgression();
  });
  $("btnSavePart")?.addEventListener("click", savePart);
  $("btnLoadPart")?.addEventListener("click", loadPart);
  $("btnExportMidi")?.addEventListener("click", exportMidi);
  $("btnPreviewPlay")?.addEventListener("click", startPreview);
  $("btnPreviewStop")?.addEventListener("click", stopPreview);
  $("btnRandom")?.addEventListener("click", doRandomProgression);
  $("btnCopy")?.addEventListener("click", doCopyProgression);
  $("btnExportJson").addEventListener("click", () => {
    if (!state.wasmReady) return;
    const key = keyInputEl().value.trim() || "C";
    const obj = exportProgression(state.progression, key);
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "progression.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $("btnExportRust").addEventListener("click", () => {
    if (!state.wasmReady) return;
    const rust = exportAsRustStruct(state.progression);
    const blob = new Blob([rust], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "progression.rs";
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $("btnMutate").addEventListener("click", () => {
    if (!state.wasmReady) return;
    const last = state.progression.length ? state.progression[state.progression.length - 1] : currentChordLabel();
    setCurrentFromLabel(last);
    const suggestions = suggestNext(state.currentRoot, state.currentQuality || "major", 4);
    if (suggestions.length > 0) {
      const idx = Math.min(1, suggestions.length - 1);
      const next = suggestions[idx].chord;
      addToProgression(next);
      $("looperHint").textContent = "Added " + next + " (variation).";
    } else {
      $("looperHint").textContent = "Mutate suggests a variation of the last chord.";
    }
  });
  $("btnMidi")?.addEventListener("click", async () => {
    try {
      const access = await navigator.requestMIDIAccess();
      state.midiAccess = access;
      const outs = [...access.outputs.values()];
      $("midiStatus").textContent = outs.length ? `Outputs: ${outs.map((o) => o.name).join(", ")}` : "No MIDI outputs.";
      $("midiStatus").classList.add("connected");
    } catch (e) {
      $("midiStatus").textContent = "MIDI unavailable: " + e.message;
      $("midiStatus").classList.remove("connected");
    }
  });
}

async function main() {
  const savedTheme = localStorage.getItem("progressor-theme");
  applyTheme(savedTheme && THEMES.some((t) => t.id === savedTheme) ? savedTheme : "terminal");
  try {
    await init();
    state.wasmReady = true;
    setStatus("WASM ready");
    renderCurrentChord();
    renderSuggestions();
    renderDiatonic();
    renderCircleOfFifths();
    renderProximity();
    renderModal();
    renderHistory();
    bindQualityTabs();
    bindKeyInput();
    bindDiatonicTabs();
    bindTabs();
    bindButtons();
    bindPresets();
    bindKeyboard();
    initSetup();
    renderShortcutRefs();
    applyChordSize(localStorage.getItem("progressor-chord-size") || "large");
    renderCircleSvg();
    renderChordFlow();
    renderSecondaryDominants();
    buildPiano();
    renderSongStructure();
    renderGenreCheckboxes();
    renderGenreProgressions();
  } catch (e) {
    setStatus("WASM failed: " + e.message, false);
    console.error(e);
  }
}

main();
