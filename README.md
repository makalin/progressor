# PROGRESSOR

### *The Harmonic Orchestrator for Professional Improvisation*

**PROGRESSOR** is a high-performance, web-based harmonic engine designed for musicians who treat improvisation as a science. Built with a **retro-terminal aesthetic**, it provides a distraction-free "Cyberdeck" interface for guitarists and pianists to bridge the gap between music theory and muscle memory.

Unlike standard chord shufflers, **PROGRESSOR** utilizes a weighted **Graph Theory** approach to calculate harmonic tension, suggest modal interchanges, and visualize optimal voice-leading transitions in real-time.

---

## Key Features

* **Harmonic Logic Engine:** Uses a transition matrix to suggest mathematically sound paths based on the Circle of Fifths and Modal Interchange.
* **Voice Leading Optimizer:** Minimizes finger movement by calculating the smoothest inversions for both 24-fret guitar necks and piano keyboards.
* **The Infinite Looper:** A TUI-inspired workspace that subtly mutates progressions every  bars to keep improvisation sessions evolving.
* **MIDI Bridge:** Full **Web MIDI API** integration to sync with external DAWs, hardware synths, or MIDI controllers.
* **Developer-Centric:** Export any progression as a JSON schema or a **Rust** struct for use in generative audio or game development.

---

## Technical Architecture

* **Logic:** **Rust + WASM** core for zero-latency harmonic calculations and high-fidelity DSP.
* **Interface:** Custom-coded CSS focusing on a high-contrast, dark-mode terminal aesthetic—**Strictly No Tailwind**.
* **Performance:** Jitter-free timing handled by a dedicated state machine to ensure professional-grade synchronization.
* **Environment:** Optimized for **macOS** development workflows.

---

## Credits & Author

**PROGRESSOR** is designed and maintained by **Mehmet T. AKALIN**.

* **Website:** [dv.com.tr](https://dv.com.tr)
* **GitHub:** [github.com/makalin](https://github.com/makalin)
* **LinkedIn:** [linkedin.com/in/makalin/](https://www.linkedin.com/in/makalin/)
* **X (Twitter):** [@makalin](https://x.com/makalin)
* **CV:** [dv.com.tr/makalin/](https://dv.com.tr/makalin/)

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/makalin/progressor.git

# Build the WASM core
cargo build --release --target wasm32-unknown-unknown

# Run the local environment using the px toolchain
./px serve

```

**License:** MIT

**Author:** Mehmet T. AKALIN
