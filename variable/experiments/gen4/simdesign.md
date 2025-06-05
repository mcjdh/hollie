# Simulation Design: 64x64 Worlds

This document outlines a simple approach for generating 64x64 tile worlds that can be used to test small neural network agents in the browser. The intention is to keep the simulation lightweight so that HTML and a small amount of JavaScript can drive both the world and the agents.

## World Representation

- The world is a 64×64 grid where each cell is a tile. Tiles are stored as integers in a two‑dimensional array.
- Keep the tile set small (e.g. empty, wall, food, agent start). More tile types can be added later, but a minimal set encourages fast rendering.
- Use a seeded pseudo‑random number generator so worlds can be reproduced from a seed value.

## Basic Generation Steps

1. **Seed** – Initialize the PRNG with the world seed.
2. **Base Terrain** – Fill the grid with a default tile (usually empty or floor).
3. **Structure Placement** – Randomly scatter walls or obstacles using the seed. A simple approach is to iterate through the grid and place a wall if `random() < obstacleChance`.
4. **Resource Distribution** – Place food or other collectible items with a separate probability or noise pattern.
5. **Spawn Points** – Choose one or more tiles for the agent starting positions.

The algorithm can be as simple as uniform random placement or can include noise functions (Perlin/Simplex) to create regions of interest.

## Rendering in HTML

- Use a `<canvas>` element sized to 64×64 pixels or scale it up with the CSS `image-rendering: pixelated` property for crisp pixels.
- Each tile is drawn as a single pixel or a small colored square. An off-screen buffer can be used to update only changed tiles.
- Because the world is tiny, rendering can be done entirely with JavaScript without heavy frameworks.

## Agents with Small Neural Weights

- Agents operate on the grid and receive a limited local view (e.g. 3×3 neighborhood around them).
- A small neural network can be implemented with plain arrays and matrix multiplies in JavaScript.
- The input layer encodes tile types in the local view. The output layer selects an action such as move, rotate, or interact with a tile.
- Keeping weight matrices small (e.g. <500 parameters) ensures that multiple agents can run simultaneously in the browser.

## Example Pseudocode

```javascript
function generateWorld(seed) {
  const rng = new RNG(seed);
  const world = [];
  for (let y = 0; y < 64; y++) {
    world[y] = [];
    for (let x = 0; x < 64; x++) {
      world[y][x] = rng.random() < 0.1 ? WALL : EMPTY;
    }
  }
  // Add resources and spawn points here
  return world;
}
```

This pseudocode uses a simple obstacle check (`0.1` probability) to place walls. The same RNG can be used to place food or other features.

## Summary

The goal is a deterministic, reproducible 64×64 grid world that can be generated quickly in the browser. Agents with small neural networks can interact with these worlds for experimentation or visualization. This folder will hold future simulation files and examples based on this design.

