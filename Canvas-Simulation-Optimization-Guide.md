# Canvas Simulation Optimization Guide

A comprehensive guide to optimizing HTML5 canvas-based simulations for better performance, visual quality, and responsiveness.

## Table of Contents
1. [Dynamic Canvas Sizing](#dynamic-canvas-sizing)
2. [Responsive Grid Systems](#responsive-grid-systems)
3. [Complex Simulation Rules](#complex-simulation-rules)
4. [Performance Optimization](#performance-optimization)
5. [Visual Enhancements](#visual-enhancements)
6. [Implementation Examples](#implementation-examples)

---

## Dynamic Canvas Sizing

### Problem
Fixed canvas sizes create black borders and don't utilize the full viewport, especially on different screen aspect ratios.

### Solution
Implement dynamic canvas sizing that adapts to any window size:

```javascript
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let width, height;

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);
resize();
```

### Key Benefits
- ✅ Full viewport utilization
- ✅ No black borders on any screen size
- ✅ Responsive to window resizing
- ✅ Works on all aspect ratios

---

## Responsive Grid Systems

### From Fixed to Flexible

**Before (Fixed):**
```javascript
const gridSize = 100;
const cellSize = 5; // Fixed pixel size
canvas.width = cellSize * gridSize;
canvas.height = cellSize * gridSize;
```

**After (Flexible):**
```javascript
const gridSize = 120;
let cellWidth, cellHeight;

function updateCellSize() {
    cellWidth = width / gridSize;
    cellHeight = height / gridSize;
}

// In render function:
ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth + 1, cellHeight + 1);
```

### Anti-Gap Technique
Add `+1` to cell dimensions to prevent visual gaps:
```javascript
// Prevents gaps between cells
ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth + 1, cellHeight + 1);
```

---

## Complex Simulation Rules

### Multi-Phase Dynamics

Replace simple rules with complex, evolving systems:

```javascript
function step() {
    time += 0.02; // Global time for wave functions
    
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            // Extended neighborhood (5x5 instead of 3x3)
            let sum = 0;
            let activeNeighbors = 0;
            
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    const neighbor = grid[idx(x + dx, y + dy)];
                    const weight = 1 / (1 + dist); // Distance weighting
                    sum += neighbor * weight;
                    if (neighbor > 0.3) activeNeighbors++;
                }
            }
            
            // Multi-phase time-based waves
            const phase1 = Math.sin(time + x * 0.1 + y * 0.1) * 0.1;
            const phase2 = Math.sin(time * 1.3 + x * 0.05) * 0.05;
            const phase3 = Math.cos(time * 0.7 + y * 0.08) * 0.03;
            const timeWave = phase1 + phase2 + phase3;
            
            // Apply complex rules here...
        }
    }
}
```

### Anti-Equilibrium Techniques

Prevent simulations from settling into static patterns:

1. **Time-based oscillations:**
```javascript
const oscillation = Math.sin(time * 2 + x * 0.2 + y * 0.15) * 0.02;
val += oscillation;
```

2. **Periodic seeding:**
```javascript
if (Math.random() < 0.0005) {
    val += Math.random() * 0.3; // Random new "life"
}
```

3. **Age-based effects:**
```javascript
if (self > 0.9) {
    val -= 0.05; // Aging decay
}
```

---

## Performance Optimization

### Efficient Array Access

Use typed arrays and pre-calculated indices:

```javascript
let grid = new Float32Array(gridSize * gridSize);

function idx(x, y) {
    return ((y + gridSize) % gridSize) * gridSize + ((x + gridSize) % gridSize);
}
```

### Selective Updates

Only update cells that need processing:

```javascript
// Track active regions
const activeRegions = new Set();

// Only process active areas
for (const region of activeRegions) {
    // Process only this region
}
```

### Canvas Optimization

Minimize canvas operations:

```javascript
// Batch similar operations
ctx.fillStyle = color;
for (let i = 0; i < batchSize; i++) {
    ctx.fillRect(x[i], y[i], w[i], h[i]);
}
```

---

## Visual Enhancements

### Advanced Color Mapping

Create meaningful color progressions:

```javascript
function getLifeColor(val) {
    let r, g, b;
    
    if (val < 0.2) {
        // Dead/dormant - dark blue to black
        r = Math.floor(val * 50);
        g = Math.floor(val * 30);
        b = Math.floor(val * 100);
    } else if (val < 0.4) {
        // Emerging - blue to cyan
        const t = (val - 0.2) / 0.2;
        r = Math.floor(t * 50);
        g = Math.floor(100 + t * 155);
        b = Math.floor(200 + t * 55);
    } else if (val < 0.6) {
        // Active - cyan to green
        const t = (val - 0.4) / 0.2;
        r = Math.floor(50 - t * 50);
        g = Math.floor(255);
        b = Math.floor(255 - t * 100);
    } else if (val < 0.8) {
        // Thriving - green to yellow
        const t = (val - 0.6) / 0.2;
        r = Math.floor(t * 255);
        g = Math.floor(255);
        b = Math.floor(155 - t * 155);
    } else {
        // Peak - yellow to white
        const t = (val - 0.8) / 0.2;
        r = Math.floor(255);
        g = Math.floor(255);
        b = Math.floor(t * 255);
    }
    
    return `rgb(${r}, ${g}, ${b})`;
}
```

### Smooth Transitions

Use interpolation for smoother visuals:

```javascript
// Linear interpolation
function lerp(a, b, t) {
    return a + (b - a) * t;
}

// Smooth color transitions
const smoothVal = lerp(prevVal, currentVal, 0.1);
```

---

## Implementation Examples

### Complete Responsive Setup

```javascript
// 1. Dynamic canvas setup
function setupCanvas() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        updateCellSize();
    }
    
    window.addEventListener('resize', resize);
    resize();
    
    return { canvas, ctx };
}

// 2. Flexible grid system
function updateCellSize() {
    cellWidth = canvas.width / gridSize;
    cellHeight = canvas.height / gridSize;
}

// 3. Enhanced render loop
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            const val = grid[idx(x, y)];
            const color = getLifeColor(val);
            
            ctx.fillStyle = color;
            ctx.fillRect(
                x * cellWidth, 
                y * cellHeight, 
                cellWidth + 1, 
                cellHeight + 1
            );
        }
    }
}
```

### Common Patterns to Apply

1. **Wave Functions:** Add temporal dynamics
2. **Extended Neighborhoods:** Consider larger areas of influence
3. **Multi-layered Rules:** Combine different behavioral systems
4. **Responsive Sizing:** Always fill the viewport
5. **Anti-stasis Mechanisms:** Prevent static equilibrium

---

## Quick Optimization Checklist

- [ ] Canvas fills entire viewport
- [ ] Cells adapt to window aspect ratio
- [ ] No visual gaps between cells
- [ ] Simulation includes time-based dynamics
- [ ] Extended neighborhood consideration
- [ ] Anti-equilibrium mechanisms
- [ ] Meaningful color progressions
- [ ] Responsive to window resizing
- [ ] Performance optimized arrays
- [ ] Smooth animation loop

---

## Advanced Techniques

### Reaction-Diffusion Systems
Implement activator-inhibitor dynamics for complex pattern formation.

### Multi-Scale Interactions
Different rules at different zoom levels or time scales.

### Emergent Behaviors
Design rules that create unexpected, complex behaviors from simple interactions.

### Adaptive Parameters
Change simulation parameters based on current state or user interaction.

---

*This guide was developed from optimizing the Emergent Life visualization and can be applied to enhance any canvas-based simulation for better visual quality, performance, and user experience.*
