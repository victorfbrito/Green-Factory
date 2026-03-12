Grid
* Cell – One unit on the shared 60×60 grid (14px). Everything is aligned to cells.
Layout
* District – One language zone (e.g. French, German). Has an anchor (x, y) and a radius; no direct shape on the canvas.
* Territory – The set of cells belonging to a district. Grown from the anchor (orthogonal/parcel, noise-biased). Defines where that district can build.
* District entrance – Walkable cell adjacent to district buildings, chosen as path endpoint. Used for pathfinding and service lanes.
Buildings
* Compound – One placed cluster of cells: a rectangle only (2×1, 2×2, 3×1, 3×2, 3×3). Minimum size is 2 when possible; single-cell is rare.
* Compound layout – How building mass is split into compounds inside a district. Compact, campus-like. Preserves district mass.
* Block – The thing drawn for a compound: one rectangle in world coords. Compounds and blocks are 1:1 (one compound → one block).
* Compound outline – Red border drawn only along the boundary of each compound (not per cell). One outline per compound.
* Building layer – Occupancy from blocks. Obstacle source for pathfinding. Paths never modify it.
Roads
* Path – Sequence of walkable cells (hub ↔ district entrance). Post-process only; pathfinding reads the map. Never modifies compounds or block counts.
* Path layer – Post-process navigation. Computed after territory, compounds, and blocks exist.
* Navigation grid – Read-only pathfinding grid built from building occupancy. Paths read it; never modify it.
* Service lane – Short 1-cell-wide lane from district entrance into the district (empty cells only). Uses only existing empty cells; never carves new space.
Other
* Parcel – Shape used only during territory growth (2×1, 2×2, …). Not a visible layer; only affects district territory shape.
Pipeline: grid → territory (per district) → compound layout → building layer (blocks) → path layer (navigation grid, paths, service lanes).
