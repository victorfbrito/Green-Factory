# Factory Visualization Glossary

This glossary defines the core spatial concepts used by the factory visualization system.

The goal is to keep terminology consistent across:
- procedural generation
- pathfinding/navigation
- rendering
- debugging

All layout generation should follow this conceptual hierarchy:

Factory → District → Block → Compound → Cell

**Territory** is derived from placement (compound-driven), not the other way around.


--------------------------------------------------
Cell
--------------------------------------------------

The smallest spatial unit of the world grid.

The map is represented as a fixed grid:

GRID_SIZE × GRID_SIZE cells  
Each cell has size CELL_SIZE in world coordinates.

Cells are used for:
- territory growth
- building placement
- navigation/pathfinding
- service lanes

Cells are **never partially occupied**.


--------------------------------------------------
District
--------------------------------------------------

A District represents a language in the user's Duolingo progress.

Each district corresponds to one entry in `FactoryResponse.languages`.

A district contains:
- an anchor position
- a territory
- several blocks
- compounds inside those blocks

District size is determined by:
- sector_tier
- xp_share


--------------------------------------------------
Territory
--------------------------------------------------

A district **envelope** derived from block placement. Territory **depends on compounds**, not the opposite.

Territory expands to fit compounds when compounds grow. The pipeline is compound-driven:

1. Compound count (from language) → block grouping
2. Block placement (uses any available grid cell, avoids other districts)
3. Territory = blocks + lanes (output of placement)

Territory:
- is derived FROM block placement, not a pre-constraint
- equals the set of cells containing blocks and lanes
- must not consider roads, service lanes, navigation, or render geometry
- districts never touch: always 1 cell apart (including diagonal)

Block placement and compound packing define the actual layout; territory is the envelope that results from that layout.


--------------------------------------------------
Compound
--------------------------------------------------

A Compound is a single rectangular building mass.

It is the smallest building unit used by layout generation.

Properties:
- rectangular shape
- occupies multiple cells
- deterministic size based on seed and district mass

Compounds represent individual buildings or factory structures.

Compounds are **not roads** and must never be modified by pathfinding.


--------------------------------------------------
Block
--------------------------------------------------

A Block is a cluster of **1 to 4 Compounds** grouped together.

Blocks represent a small industrial parcel or campus area.

Characteristics:
- contains 1–4 compounds
- compounds inside the same block are spatially close
- different blocks are separated by roads or service lanes
- blocks are the primary structural unit of district layout
- blocks never touch: always 1 cell apart (including diagonal)

Blocks help create a planned factory campus layout rather than a single continuous mass of buildings. Block topology (the connected graph of blocks and lanes) guarantees compound placement inside a planned internal layout.


--------------------------------------------------
Building Layer
--------------------------------------------------

The building layer represents **all occupied building cells**.

It is created from all compounds across all blocks.

Uses:
- obstacle source for pathfinding
- navigation grid generation
- collision detection for roads

The building layer must not be modified by:
- paths
- service lanes


--------------------------------------------------
Navigation Grid
--------------------------------------------------

A read-only grid used for pathfinding.

The navigation grid is built from:
- building layer (blocked cells)
- empty cells (walkable)

Paths are computed on this grid.

The navigation grid **must never modify buildings**.


--------------------------------------------------
Path
--------------------------------------------------

A Path is a main road connecting:

Hub ↔ District entrance

Characteristics:
- generated using A* pathfinding
- routes around buildings
- can reuse existing path cells
- spans across the map

Paths are the **main campus roads**.


--------------------------------------------------
District Entrance
--------------------------------------------------

The cell where a Path connects to a district.

The entrance is typically chosen from a district's perimeter cells near buildings.

Each district normally has one entrance used by the main Path.


--------------------------------------------------
Service Lane
--------------------------------------------------

A Service Lane is a short internal road inside a district.

Characteristics:
- starts at the district entrance
- extends a few cells into the district interior
- uses existing empty cells only
- never removes or modifies buildings

Service lanes typically run between Blocks and provide internal access.


--------------------------------------------------
Parcel
--------------------------------------------------

A temporary helper shape used during territory growth (when territory growth is used).

Examples:
- 2×1
- 2×2
- 3×2

In the compound-driven pipeline, territory is derived from block placement, so parcels may not be used. Parcels remain available for alternative territory-generation strategies.

Parcels are **not visible structures**.


--------------------------------------------------
Block vs Compound
--------------------------------------------------

Compound = one building mass.

Block = cluster of compounds (1–4).

Example:

Block
 ├─ Compound A
 ├─ Compound B
 └─ Compound C

Roads or service lanes separate different Blocks.


--------------------------------------------------
Generation Pipeline
--------------------------------------------------

The factory environment is generated in the following order (compound-driven):

FactoryResponse  
→ Scene layout (district anchors)  
→ Compound count from language  
→ Block grouping (split compounds into blocks)  
→ Block placement (connected graph, 1-cell lanes; uses available grid cells)  
→ Territory (derived from placement: blocks + lanes)  
→ Compound packing (inside each block)  
→ Building layer creation  
→ Navigation grid  
→ Paths (hub ↔ district entrance)  
→ Service lanes (internal access)  
→ Render model

Territory expands to fit compounds; it is an output of placement, not a pre-constraint.


--------------------------------------------------
Determinism
--------------------------------------------------

All procedural stages must be deterministic.

Inputs:
- FactoryResponse
- seed_key
- stable ordering

Same inputs must always produce the same:
- territories
- compounds
- blocks
- paths
- service lanes