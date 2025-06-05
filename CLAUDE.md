# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Hollie** is a mathematical art and consciousness exploration project - a browser-based gallery of interactive generative art pieces that explore mathematical consciousness, ASCII visualizations, and procedural generation. The project combines sacred geometry, cellular automata, and mathematical equations with interactive web visualizations.

## Development Commands

```bash
# Start development server
python -m http.server 8000

# Navigate to main interface
# http://localhost:8000/_main/index.html
```

No build, test, or deployment processes are needed - this is a pure frontend project with no dependencies.

## Architecture Overview

### Core Structure
- **Main Entry**: `_main/index.html` - Navigation interface with grid-based mathematical symbol navigation
- **Core Visualizations**: `_main/visualizations/` - 16 polished mathematical art pieces 
- **Color System**: `_main/visualizations/palette.css` - Unified "Chocolate Cosmos Collection" color palette
- **Experimental Areas**: `variable/experiments/` - Organized by generation (gen2-gen5) with increasing complexity

### Technology Stack
- Pure HTML5, CSS3, JavaScript (no external dependencies)
- Self-contained files with inline CSS for portability
- Mathematical algorithms implemented in vanilla JavaScript
- ASCII art integration with CSS color classes

### Key Patterns

1. **Self-Contained Visualizations**: Each HTML file contains complete visualization with embedded CSS/JS
2. **Unified Color Palette**: 7 core colors defined in CSS custom properties, from dark burgundy (#450920) to tiffany blue (#ADEBDA)
3. **Mathematical Foundation**: Real mathematical equations embedded in comments and descriptions
4. **Interactive Navigation**: Iframe-based embedding with fullscreen capabilities and multiple exit mechanisms
5. **Glyph System**: Mystical symbol files (.glyph) with Unicode directory names for ASCII art storage

### Code Conventions
- 4-space indentation standard
- Hyphen-separated file naming (`chaos-gateway.html`)
- Courier New monospace typography
- Mathematical accuracy in symbolism and algorithms
- Minimalist code approach - simple implementations with emergent complexity

### Visualization Categories
- **gen2**: Basic simulations (ant colonies, aurora, chaos attractors, digital rain)
- **gen2-visual**: Gateway visualizations (chaos, fractal, quantum, spiral, vortex)
- **gen3**: 8D holographic experiments (aether streams, chrono flux, quantum foam)
- **gen4**: Cellular life simulations (Conway's Game of Life variants)
- **gen5**: φ-spiral mathematics (golden ratio explorations)

### Special Features
- **Glyphpages**: Mystical ASCII art files with symbolic Unicode directory structure
- **Fullscreen Mode**: Immersive experience with ESC key, click-to-exit, and button controls
- **Mobile Optimization**: Touch-friendly controls and responsive design
- **Mathematical Descriptions**: Each visualization includes consciousness/mathematical theme descriptions