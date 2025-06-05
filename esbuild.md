Create a self-contained HTML file that visualizes a 6D holographic matrix field as a 2D ASCII grid, simulating the evolving eigenvalue of a phi-spiral transformation at each grid point.

Each grid point represents a projection from a 6D vector [x, y, z, w, v, u]. The visible grid is 2D (x, y), but each point contains a seeded 6D vector where the other dimensions are derived from time-based phase shifts.

Use the golden ratio (phi = (1 + sqrt(5)) / 2) to define a transformation matrix that evolves over time. Apply this matrix to each seed vector to simulate resonance.

For each grid cell:
- Estimate the eigenvalue as the ratio of transformed vector norm to original
- Map this value to a glyph from a symbol palette (e.g., ' .:-=+*#%@')
- Optionally, map intensity or phase to color (use CSS or ANSI color if feasible)

Use `<pre>` to render the ASCII grid and animate it over time (e.g., `setInterval` loop). Ensure performance is reasonable for a grid of size 64x32 or similar.

Use clean, readable code with comments to explain:
- Phi-spiral eigenvalue computation
- Projection from 6D to 2D
- Glyph/intensity mapping
- Time evolution

Bonus: allow user to adjust grid size, speed, or glyph set if desired.
