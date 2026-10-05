# InkStep 🖋️📐

> **XY Writing Studio & Stepper Motion Simulator**  
> A browser-based CAD/CAM environment for pen plotters, robotic drawing machines, and digital handwriting synthesis.

---

## Overview

**InkStep** is a web-based studio and kinematic motion simulator designed for XY pen plotters and drawing machines. Unlike conventional CNC tools that rely on absolute coordinate systems or complex G-code dialects, InkStep is built on a simple hardware-level philosophy: **stepper motors do not store coordinates—they only count pulses.**

InkStep bridges the gap between digital drawing, custom handwriting digitization, raster-to-vector tracing, and hardware-accurate stepper motor pulse generation. It compiles vector paths into an interpretable pulse instruction stream, verifies replay accuracy down to individual motor steps, and provides real-time head-motion simulation.

---

## Key Features

### 1. 🎨 Vector Studio & Paper Workspace
* **Multiple Drawing Tools**:
  * **Ink**: Freehand pen sketching and natural handwriting input.
  * **Path**: Point-to-point polyline drafting with live preview and enter-to-commit.
  * **Cell**: Discrete cell-center painting for grid-based plotting.
  * **Erase**: Distance-based hit testing for precise stroke removal.
* **Intelligent Snapping**: Switch dynamically between `Free`, `Grid Intersections`, and `Cell Centers`.
* **Configurable Grid Spacing**: 1 mm, 2 mm, 5 mm, and 10 mm intervals.
* **Paper Profiles**: Standard paper presets (A5, A4, A3, US Letter, US Legal) with dual source/destination support.
* **Proportional Scaling**: `Fit` (preserve aspect ratio), `Fill` (crop-fill), or `Stretch` (independent axis scaling).

### 2. ✍️ Handwriting Digitization & Typography Engine
* **Glyph Capture**: Draw letters (`a-z`, `A-Z`, punctuation) directly inside a guided baseline box.
* **Ligatures & Word Samples**: Record complete joined words (e.g. *the*, *and*, *with*) to capture natural cursive flow and letter connections.
* **Handwriting Profiles**: Create and manage multiple distinct handwriting styles and switch between them.
* **Interactive Typewriter**: Type arbitrary text to automatically synthesize continuous handwritten plotter paths, prioritizing multi-letter word ligatures before falling back to individual glyphs.

### 3. 🖼️ Raster Image Tracing & Overlay
* **Image Import**: Load PNG, JPEG, WebP, and GIF references directly onto the paper.
* **Monochrome Conversion**: Adjustable luminance thresholding with inversion toggle.
* **Reference Overlay**: Semi-transparent tracing guide for manual pen reproduction.
* **Automatic Vector Tracing**:
  * **Walk**: Contour-following line tracer for outline and contour vectorization.
  * **Hatch**: Horizontal scanline hatching for shaded and solid-fill art.

### 4. ⚙️ Machine Pulse Compiler & Language
* **Minimalist Pulse Architecture**: Compiles drawings into a lightweight relative-step language.
* **Integer Quantization**: Maps continuous millimeter geometry to discrete motor steps using Bresenham's line algorithm with consecutive step collapsing.
* **Real-time Code Editor**: Inspect, edit, and validate instruction scripts with immediate feedback on instruction count, move segments, and total pulse volume.

### 5. 🕹️ Kinematic Simulator & Divergence Replay
* **Pulse-by-Pulse Simulation**: Step-accurate virtual machine head rendering with pen up/down state tracking.
* **Interactive Playback**: Play, pause, jog single pulses, and scrub with adjustable pulse frequency (1–40×).
* **Ghost vs. Ink Comparison**: Overlays the ideal source geometry against actual quantized stepper paths.
* **Verification Engine**: Automatically calculates maximum step deviation and alerts if the compiled program diverges from the drawn design.

### 6. 📏 Calibration & Limits
* **Interactive Jog Calibration**: Command test pulse batches from origin $(0,0)$, measure real-world distance in millimeters, and automatically calibrate `steps/mm` per axis.
* **Machine Bounds & Travel Limits**: Independent X/Y travel limits with overtravel prevention.

---

## The InkStep Pulse Language

InkStep motion programs use a human-readable, relative instruction format. Programs begin with machine and paper configuration headers, followed by relative motion pulses:

```text
# InkStep v1
# machine desktop-xy steps_per_mm_x=80 steps_per_mm_y=80
# paper_source a4 210 297
# paper_dest a4 210 297
# scale fit

HOME
PEN UP
STEP 800 400
PEN DOWN
STEP 160 0
STEP 0 160
STEP -160 0
STEP 0 -160
PEN UP
HOME
```

### Instruction Set

| Instruction | Parameters | Description |
| :--- | :--- | :--- |
| `HOME` | None | Returns the machine to the physical origin $(0,0)$. |
| `PEN` | `UP` \| `DOWN` | Actuates the pen servo/solenoid mechanism. |
| `STEP` | `dx dy` (integers) | Relative motor step count along X and Y axes. |
| `WAIT` | `ms` (integer) | Dwell pause in milliseconds (e.g. pen settle delay). |

---

## Tech Stack

* **UI Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
* **Build System & Dev Server**: [Vite 7](https://vitejs.dev/)
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
* **Typography**: IBM Plex Sans & IBM Plex Mono via Google Fonts
* **Rendering**: Native HTML5 Canvas 2D with HiDPI support and custom camera transforms
* **Test Suite**: [Vitest 3](https://vitest.dev/) with JSDOM and `@testing-library/react`

---

## Project Structure

```text
inkstep/
├── index.html              # HTML shell & font definitions
├── src/
│   ├── main.tsx            # Application entry point
│   ├── App.tsx             # Root layout and view router
│   ├── index.css           # Global theme variables & Tailwind styles
│   ├── components/         # React UI panels and controls
│   │   ├── AppHeader.tsx           # Navigation & machine summary banner
│   │   ├── StudioCanvas.tsx        # Interactive HTML5 drawing canvas
│   │   ├── ToolRail.tsx            # Drawing tools, snap & grid selectors
│   │   ├── HandwritingPanel.tsx    # Glyph/word capture & typing studio
│   │   ├── ImageReferencePanel.tsx # Image loader & vectorizer
│   │   ├── Inspector.tsx           # Paper setup, machine specs & calibration
│   │   ├── ProgramPanel.tsx        # Motion language editor & code generator
│   │   ├── SimulatorPanel.tsx      # Pulse replay player & motion head
│   │   └── StatusBar.tsx           # Status & coordinate readout
│   ├── engine/             # Core computational engine & algorithms
│   │   ├── bresenham.ts            # Discrete line rasterization
│   │   ├── calibration.ts          # Step-to-mm ratio calculation
│   │   ├── compare.ts              # Replay vs. source geometry diffing
│   │   ├── compiler.ts             # Stroke-to-instruction compiler
│   │   ├── handwriting.ts          # Glyph extraction, tokenization & layout
│   │   ├── image-trace.ts          # Monochrome thresholding, walking & hatching
│   │   ├── interpreter.ts          # Machine state execution engine
│   │   ├── language.ts             # Parser & serializer for pulse language
│   │   ├── machine.ts              # Kinematic conversions & travel boundaries
│   │   ├── paper.ts                # Aspect scaling & coordinate mapping
│   │   └── quantize.ts             # Point-to-step conversion & reduction
│   ├── lib/                # Canvas drawing, camera maths & utility hooks
│   └── state/              # Global state management & persistence
└── vitest.config.ts        # Test runner configuration
```

---

## Getting Started

### Prerequisites

* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher

### Installation

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd inkstep
npm install
```

### Development

Run the local development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Running Tests

Execute the comprehensive unit and integration test suite:

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with code coverage report
npm run test:coverage
```

### Type Checking & Production Build

Verify TypeScript types and build the production bundle:

```bash
# Type check without emitting files
npm run typecheck

# Build optimized production bundle to dist/
npm run build

# Preview production build locally
npm run preview
```

---

## License

This project is open source and available under the [MIT License](LICENSE).
