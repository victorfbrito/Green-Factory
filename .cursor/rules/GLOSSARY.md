Grid
* Cell – One unit on the shared 60×60 grid (14px). Everything is aligned to cells.
Layout
* District – One language zone (e.g. French, German). Has an anchor (x, y) and a radius; no direct shape on the canvas.
* Territory – The set of cells belonging to a district. Grown from the anchor (orthogonal/parcel, noise-biased). Defines where that district can build.
Buildings
* Compound – One placed cluster of cells: a rectangle only (2×1, 2×2, 3×1, 3×2, 3×3). Minimum size is 2 when possible; single-cell is rare.
* Block – The thing drawn for a compound: one rectangle in world coords. Compounds and blocks are 1:1 (one compound → one block).
* Compound outline – Red border drawn only along the boundary of each compound (not per cell). One outline per compound.
Roads
* Path – Sequence of walkable cells (hub ↔ district entry). Post-process; pathfinding avoids building cells. Rendered as road tiles.
Other
* Parcel – Shape used only during territory growth (2×1, 2×2, …). Not a visible layer; only affects district territory shape.
* Service lane – Short 1-cell-wide lane from district entrance into the district (empty cells only). Separate from main paths.
So: grid → territory (per district) → compounds (rectangles only) → blocks (how compounds are drawn) + compound outlines (red) + paths and service lanes.
