import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import treeUrl from '../../assets/tree.svg'
import carLeftUrl from '../../assets/vehicles/car/car-left.svg'
import carRightUrl from '../../assets/vehicles/car/car-right.svg'

import type { DistrictPlacement, CompoundDrawable, PathCell, Block } from '../../lib/procedural'
import { autotileRoadNetwork, cellKey, CELL_SIZE, GRID_SIZE, MAP_SIZE } from '../../lib/procedural'
import { getLanguageTheme } from '../../lib/theme/duolingoLanguageThemes'
import type { FactoryViewMode } from './factoryViewMode'
import { grassBaseTextureUrl, groundRoadTextureUrl } from './groundRoadAssets'
import { PATH_COLOR } from './constants'

// True isometric camera direction.
export const CAMERA_X = 900
export const CAMERA_Y = 900
export const CAMERA_Z = 900

const BLOCK_BORDER_COLOR = '#f97316'
const ROAD_DIRS: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]]

interface CarSpriteState {
  mesh: THREE.Mesh
  label: THREE.Sprite
  carId: 'A' | 'B'
  currentKey: string
  previousKey: string | null
  nextKey: string
  progress: number
  speedCellsPerSecond: number
  stepCount: number
  laneIndex: 0 | 1
  laneOffset: THREE.Vector3
}

function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash
}

function parseCellKey(key: string): [number, number] {
  const [cx, cy] = key.split(',').map(Number)
  return [cx, cy]
}

function getConnectedRoadComponents(cells: PathCell[]): string[][] {
  const roadSet = new Set(cells.map((cell) => cellKey(cell.cx, cell.cy)))
  const visited = new Set<string>()
  const components: string[][] = []

  for (const key of roadSet) {
    if (visited.has(key)) continue
    const component: string[] = []
    const queue = [key]
    visited.add(key)

    while (queue.length > 0) {
      const current = queue.shift()!
      component.push(current)
      const [cx, cy] = parseCellKey(current)
      for (const [dx, dy] of ROAD_DIRS) {
        const neighborKey = cellKey(cx + dx, cy + dy)
        if (!roadSet.has(neighborKey) || visited.has(neighborKey)) continue
        visited.add(neighborKey)
        queue.push(neighborKey)
      }
    }

    component.sort()
    components.push(component)
  }

  components.sort((a, b) => b.length - a.length)
  return components
}

function getRoadNeighbors(key: string, roadSet: Set<string>): string[] {
  const [cx, cy] = parseCellKey(key)
  return ROAD_DIRS
    .map(([dx, dy]) => cellKey(cx + dx, cy + dy))
    .filter((neighborKey) => roadSet.has(neighborKey))
    .sort()
}

function getRoadWorldPosition(key: string, centerOffset: number): THREE.Vector3 {
  const [cx, cy] = parseCellKey(key)
  return new THREE.Vector3(
    cx * CELL_SIZE + CELL_SIZE / 2 - centerOffset,
    0,
    cy * CELL_SIZE + CELL_SIZE / 2 - centerOffset
  )
}

function chooseNextRoadNeighbor(
  currentKey: string,
  previousKey: string | null,
  roadSet: Set<string>,
  variantSeed: string
): string {
  const neighbors = getRoadNeighbors(currentKey, roadSet)
  const forwardOptions = neighbors.filter((neighborKey) => neighborKey !== previousKey)
  const options = forwardOptions.length > 0 ? forwardOptions : neighbors
  if (options.length === 0) return currentKey
  const nextIndex = hashString(variantSeed) % options.length
  return options[nextIndex]!
}

function getRoadAxis(currentKey: string, nextKey: string): 'x' | 'z' {
  const [currentX, currentY] = parseCellKey(currentKey)
  const [nextX, nextY] = parseCellKey(nextKey)
  return currentX !== nextX ? 'x' : currentY !== nextY ? 'z' : 'x'
}

function getLaneOffset(currentKey: string, nextKey: string, laneDepth: number): THREE.Vector3 {
  const [currentX, currentY] = parseCellKey(currentKey)
  const [nextX, nextY] = parseCellKey(nextKey)
  const dx = Math.sign(nextX - currentX)
  const dz = Math.sign(nextY - currentY)
  return new THREE.Vector3(-dz * laneDepth, 0, dx * laneDepth)
}

function shouldUseOffsetLane(carId: 'A' | 'B', currentKey: string, nextKey: string): boolean {
  const [currentX, currentY] = parseCellKey(currentKey)
  const [nextX, nextY] = parseCellKey(nextKey)
  const dx = Math.sign(nextX - currentX)
  const dz = Math.sign(nextY - currentY)
  const positiveFlow = dx > 0 || dz < 0
  return carId === 'A' ? positiveFlow : !positiveFlow
}

function getCarPlacementAdjustment(carId: 'A' | 'B', laneDepth: number): THREE.Vector3 {
  if (carId !== 'B') return new THREE.Vector3(0, 0, 0)
  return new THREE.Vector3(laneDepth, 0, laneDepth)
}

function createCarLabelSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 96
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Unable to create 2D context for car label')
  }

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = 'rgba(0, 0, 0, 0.75)'
  context.beginPath()
  context.arc(48, 48, 26, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = '#ffffff'
  context.font = 'bold 36px system-ui, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, 48, 50)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(CELL_SIZE * 1.1, CELL_SIZE * 1.1, 1)
  return sprite
}

interface ThreeWorldLayerProps {
  districts: DistrictPlacement[]
  compoundDrawables: CompoundDrawable[][]
  nextCompoundDrawables: { x: number; y: number; w: number; h: number }[][]
  treeCells: PathCell[]
  blockLists: Block[][]
  paths: PathCell[][]
  serviceLaneCells: PathCell[]
  /** live = SVG ground tiles for roads/lanes; x-ray = solid debug tiles (previous behavior). */
  viewMode: FactoryViewMode
  topDownView: boolean
  showVehicleTags: boolean
}

export function ThreeWorldLayer({
  districts,
  compoundDrawables,
  nextCompoundDrawables,
  treeCells,
  blockLists,
  paths,
  serviceLaneCells,
  viewMode,
  topDownView,
  showVehicleTags,
}: ThreeWorldLayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0))
  const cameraZoomRef = useRef(1.1)

  useEffect(() => {
    const container = containerRef.current
    if (!container || districts.length === 0) return

    const scene = new THREE.Scene()

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })

    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    const updateSize = () => {
      const width = container.clientWidth || MAP_SIZE
      const height = container.clientHeight || MAP_SIZE
      const aspect = width / height
      const frustumSize = MAP_SIZE * 1.15

      camera.left = (-frustumSize * aspect) / 2
      camera.right = (frustumSize * aspect) / 2
      camera.top = frustumSize / 2
      camera.bottom = -frustumSize / 2
      camera.updateProjectionMatrix()

      renderer.setSize(width, height)
    }

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 5000)
    const target = cameraTargetRef.current.clone()
    const offset = topDownView
      ? new THREE.Vector3(0, 1200, 0)
      : new THREE.Vector3(CAMERA_X, CAMERA_Y, CAMERA_Z)
    camera.position.copy(target.clone().add(offset))
    camera.lookAt(target)
    camera.zoom = cameraZoomRef.current
    camera.updateProjectionMatrix()

    // Soft lighting to avoid harsh flat/pixel-looking edges.
    const ambient = new THREE.AmbientLight(0xffffff, 1.15)
    scene.add(ambient)

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.55)
    dirLight.position.set(900, 1200, 600)
    scene.add(dirLight)

    let groundMesh: THREE.Mesh | undefined
    if (viewMode === 'x-ray') {
      const groundGeometry = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE)
      const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x111827,
        roughness: 1,
        metalness: 0,
      })
      groundMesh = new THREE.Mesh(groundGeometry, groundMaterial)
      groundMesh.rotation.x = -Math.PI / 2
      scene.add(groundMesh)
    }

    if (viewMode === 'x-ray') {
      const gridDivisions = 60
      const gridHelper = new THREE.GridHelper(MAP_SIZE, gridDivisions, 0x3b82f6, 0x1f2937)
      gridHelper.position.y = 0.1
      scene.add(gridHelper)

      const axesSize = 40
      const axesHelper = new THREE.AxesHelper(axesSize)
      const half = MAP_SIZE / 2
      axesHelper.position.set(-half + axesSize, 8, -half + axesSize)
      scene.add(axesHelper)
    }

    const heightScale = 16
    const centerOffset = MAP_SIZE / 2
    const heightMultipliers = [0.8, 1.0, 1.2, 1.4]

    const addCompound = (drawable: CompoundDrawable, districtIndex: number) => {
      const baseHeight = drawable.isLandmark ? heightScale * 1.8 : heightScale
      const level = drawable.heightLevel ?? 0
      const hints = drawable.visualHints
      const motion = hints?.motionIntensity ?? 0.2
      const currentBoost = drawable.isCurrentDistrict ? 1.35 : 1
      const compoundHeight = baseHeight * (heightMultipliers[level] ?? 1) * (1 + motion * 0.08 * currentBoost)

      const geometry = new THREE.BoxGeometry(drawable.w, compoundHeight, drawable.h)

      const languageCode = districts[districtIndex]?.language?.language_code
      const primaryHex = getLanguageTheme(languageCode).palette.primary
      const base = new THREE.Color(primaryHex)
      const shade = drawable.shade ?? 1
      const color = base.clone().multiplyScalar(shade)

      const emissive =
        ((hints?.hasGlow ? 0.14 : 0) + motion * 0.12) * (drawable.isCurrentDistrict ? 1.5 : 1)
      const metalness = 0.02 + (hints?.hasConveyor || hints?.hasAntenna ? 0.06 : 0)

      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.88,
        metalness,
        emissive: base.clone().multiplyScalar(emissive),
      })

      const mesh = new THREE.Mesh(geometry, material)

      const worldX = drawable.x + drawable.w / 2 - centerOffset
      const worldZ = drawable.y + drawable.h / 2 - centerOffset

      mesh.position.set(worldX, compoundHeight / 2, worldZ)
      scene.add(mesh)
    }

    compoundDrawables.forEach((drawables, i) => {
      drawables.forEach((d) => addCompound(d, i))
    })

    nextCompoundDrawables.forEach((drawables, i) => {
      const languageCode = districts[i]?.language?.language_code
      const primaryHex = getLanguageTheme(languageCode).palette.primary
      drawables.forEach((drawable) => {
        const geometry = new THREE.PlaneGeometry(drawable.w, drawable.h)
        const material = new THREE.MeshBasicMaterial({
          color: new THREE.Color(primaryHex),
          transparent: true,
          opacity: 0.28,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
        const mesh = new THREE.Mesh(geometry, material)
        const worldX = drawable.x + drawable.w / 2 - centerOffset
        const worldZ = drawable.y + drawable.h / 2 - centerOffset
        mesh.rotation.x = -Math.PI / 2
        mesh.position.set(worldX, 0.14, worldZ)
        scene.add(mesh)
      })
    })

    if (viewMode === 'x-ray') {
      const maxCompoundHeight = heightScale * 1.4 * 1.8
      const blockBorderHeight = maxCompoundHeight + 2
      const blockBorderMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(BLOCK_BORDER_COLOR),
        linewidth: 2,
      })
      blockLists.forEach((blocks) => {
        for (const block of blocks) {
          if (block.compounds.length === 0) continue
          const minCx = Math.min(...block.compounds.map((c) => c.cx))
          const minCy = Math.min(...block.compounds.map((c) => c.cy))
          const maxCx = Math.max(...block.compounds.map((c) => c.cx + c.w))
          const maxCy = Math.max(...block.compounds.map((c) => c.cy + c.h))
          const minX = minCx * CELL_SIZE - centerOffset
          const minZ = minCy * CELL_SIZE - centerOffset
          const maxX = maxCx * CELL_SIZE - centerOffset
          const maxZ = maxCy * CELL_SIZE - centerOffset
          const points = [
            new THREE.Vector3(minX, blockBorderHeight, minZ),
            new THREE.Vector3(maxX, blockBorderHeight, minZ),
            new THREE.Vector3(maxX, blockBorderHeight, maxZ),
            new THREE.Vector3(minX, blockBorderHeight, maxZ),
            new THREE.Vector3(minX, blockBorderHeight, minZ),
          ]
          const geometry = new THREE.BufferGeometry().setFromPoints(points)
          const line = new THREE.Line(geometry, blockBorderMaterial)
          scene.add(line)
        }
      })
    }

    const pathHeight = 0.8
    const pathGeometry = new THREE.BoxGeometry(CELL_SIZE * 0.5, pathHeight, CELL_SIZE * 0.5)
    const pathMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(PATH_COLOR),
      roughness: 0.9,
      metalness: 0.05,
    })
    let cancelled = false
    let disposeLiveRoads: (() => void) | undefined
    let disposeTrees: (() => void) | undefined
    let disposeCars: (() => void) | undefined
    let animationFrameId = 0

    const render = () => renderer.render(scene, camera)

    const addRoadsXRay = () => {
      for (const cell of serviceLaneCells) {
        const worldX = cell.cx * CELL_SIZE + CELL_SIZE / 2 - centerOffset
        const worldZ = cell.cy * CELL_SIZE + CELL_SIZE / 2 - centerOffset
        const roadMesh = new THREE.Mesh(pathGeometry, pathMaterial)
        roadMesh.position.set(worldX, pathHeight / 2 + 0.05, worldZ)
        scene.add(roadMesh)
      }
    }

    /** PlaneGeometry lies in XY; rotate to XZ (horizontal), then yaw around world Y. */
    const qGrassHorizontal = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0, 'YXZ'))

    const loadSvgTexture = (url: string) =>
      new Promise<THREE.Texture>((resolve, reject) => {
        const loader = new THREE.TextureLoader()
        loader.load(
          url,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace
            tex.flipY = false
            tex.magFilter = THREE.LinearFilter
            tex.minFilter = THREE.LinearMipmapLinearFilter
            tex.generateMipmaps = true
            resolve(tex)
          },
          undefined,
          reject
        )
      })

    const addTrees = async () => {
      const treeTexture = await loadSvgTexture(treeUrl)
      if (cancelled) {
        treeTexture.dispose()
        return
      }
      treeTexture.flipY = true
      treeTexture.needsUpdate = true

      const treeWidth = CELL_SIZE * 1.3
      const treeHeight = CELL_SIZE * 1.9
      const treeGeometry = new THREE.PlaneGeometry(treeWidth, treeHeight)
      const treeMaterial = new THREE.MeshStandardMaterial({
        map: treeTexture,
        transparent: true,
        alphaTest: 0.15,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
      const treeMeshes: THREE.Mesh[] = []

      for (const cell of treeCells) {
        const mesh = new THREE.Mesh(treeGeometry, treeMaterial)
        const worldX = cell.cx * CELL_SIZE + CELL_SIZE / 2 - centerOffset
        const worldZ = cell.cy * CELL_SIZE + CELL_SIZE / 2 - centerOffset
        mesh.position.set(worldX, treeHeight / 2, worldZ)
        mesh.rotation.y = Math.PI / 4
        scene.add(mesh)
        treeMeshes.push(mesh)
      }

      disposeTrees = () => {
        for (const mesh of treeMeshes) {
          scene.remove(mesh)
        }
        treeGeometry.dispose()
        treeMaterial.dispose()
        treeTexture.dispose()
      }
    }

    const addCars = async () => {
      if (serviceLaneCells.length === 0) return

      const roadSet = new Set(serviceLaneCells.map((cell) => cellKey(cell.cx, cell.cy)))
      const components = getConnectedRoadComponents(serviceLaneCells).filter((component) => component.length > 1)
      if (components.length === 0) return

      const [carLeftTexture, carRightTexture] = await Promise.all([
        loadSvgTexture(carLeftUrl),
        loadSvgTexture(carRightUrl),
      ])
      if (cancelled) {
        carLeftTexture.dispose()
        carRightTexture.dispose()
        return
      }
      carLeftTexture.flipY = true
      carLeftTexture.needsUpdate = true
      carRightTexture.flipY = true
      carRightTexture.needsUpdate = true

      const carSize = CELL_SIZE * 1.1
      const carWidth = carSize
      const carHeight = carSize
      const carGeometry = new THREE.PlaneGeometry(carWidth, carHeight)
      const carLeftMaterial = new THREE.MeshStandardMaterial({
        map: carLeftTexture,
        transparent: true,
        alphaTest: 0.15,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
      const carRightMaterial = new THREE.MeshStandardMaterial({
        map: carRightTexture,
        transparent: true,
        alphaTest: 0.15,
        side: THREE.DoubleSide,
        depthWrite: false,
      })

      const component = components[0]!
      const maxCars = 2
      const carStates: CarSpriteState[] = []

      const startKey = component[hashString(`car:start:${component[0]}`) % component.length]!
      const nextKey = chooseNextRoadNeighbor(startKey, null, roadSet, `car:next:0:${startKey}`)
      const oppositeStartKey = nextKey
      const oppositeNextKey = startKey
      const laneDepth = carSize * 0.25
      const carConfigs = [
        {
          carId: 'A' as const,
          labelText: 'A',
          currentKey: startKey,
          previousKey: null,
          nextKey,
          progress: (hashString(`car:offset:forward:${startKey}`) % 1000) / 1000,
          speedCellsPerSecond: 1.15 + (hashString(`car:speed:forward:${startKey}`) % 60) / 100,
          stepCount: 0,
          laneIndex: 0 as const,
          laneOffset: new THREE.Vector3(0, 0, 0),
        },
        {
          carId: 'B' as const,
          labelText: 'B',
          currentKey: oppositeStartKey,
          previousKey: null,
          nextKey: oppositeNextKey,
          progress: (hashString(`car:offset:reverse:${oppositeStartKey}`) % 1000) / 1000,
          speedCellsPerSecond: 1.15 + (hashString(`car:speed:reverse:${oppositeStartKey}`) % 60) / 100,
          stepCount: 0,
          laneIndex: 1 as const,
          laneOffset: getLaneOffset(oppositeStartKey, oppositeNextKey, laneDepth),
        },
      ] as const

      for (let index = 0; index < maxCars; index++) {
        const config = carConfigs[index]!
        const initialAxis = getRoadAxis(config.currentKey, config.nextKey)
        const mesh = new THREE.Mesh(
          carGeometry,
          initialAxis === 'x' ? carLeftMaterial : carRightMaterial
        )
        mesh.rotation.y = Math.PI / 4
        scene.add(mesh)
        const label = createCarLabelSprite(config.labelText)
        scene.add(label)

        carStates.push({
          mesh,
          label,
          carId: config.carId,
          currentKey: config.currentKey,
          previousKey: config.previousKey,
          nextKey: config.nextKey,
          progress: config.progress,
          speedCellsPerSecond: config.speedCellsPerSecond,
          stepCount: config.stepCount,
          laneIndex: config.laneIndex,
          laneOffset: config.laneOffset.clone(),
        })
      }

      const fromPosition = new THREE.Vector3()
      const toPosition = new THREE.Vector3()
      const currentPosition = new THREE.Vector3()

      const updateCars = (deltaSeconds: number) => {
        for (const car of carStates) {
          let progress = car.progress + deltaSeconds * car.speedCellsPerSecond
          while (progress >= 1) {
            progress -= 1
            car.previousKey = car.currentKey
            car.currentKey = car.nextKey
            car.stepCount += 1
            car.nextKey = chooseNextRoadNeighbor(
              car.currentKey,
              car.previousKey,
              roadSet,
              `car:next:${car.stepCount}:${car.currentKey}:${car.previousKey ?? 'none'}`
            )
          }
          car.progress = progress

          fromPosition.copy(getRoadWorldPosition(car.currentKey, centerOffset))
          toPosition.copy(getRoadWorldPosition(car.nextKey, centerOffset))
          currentPosition.lerpVectors(fromPosition, toPosition, car.progress)
          if (shouldUseOffsetLane(car.carId, car.currentKey, car.nextKey)) {
            car.laneOffset.copy(getLaneOffset(car.currentKey, car.nextKey, laneDepth))
          } else {
            car.laneOffset.set(0, 0, 0)
          }
          car.mesh.material = getRoadAxis(car.currentKey, car.nextKey) === 'x'
            ? carLeftMaterial
            : carRightMaterial
          currentPosition.add(car.laneOffset)
          currentPosition.add(getCarPlacementAdjustment(car.carId, laneDepth))
          car.mesh.position.set(currentPosition.x, carHeight / 2 + 0.03, currentPosition.z)
          car.label.visible = showVehicleTags
          car.label.position.set(currentPosition.x, carHeight + CELL_SIZE * 0.7, currentPosition.z)
        }
      }

      let lastFrameTime = performance.now()
      const animateCars = (now: number) => {
        if (cancelled) return
        const deltaSeconds = Math.min(0.05, (now - lastFrameTime) / 1000)
        lastFrameTime = now
        updateCars(deltaSeconds)
        render()
        animationFrameId = window.requestAnimationFrame(animateCars)
      }

      updateCars(0)
      animationFrameId = window.requestAnimationFrame(animateCars)

      disposeCars = () => {
        window.cancelAnimationFrame(animationFrameId)
        for (const car of carStates) {
          scene.remove(car.mesh)
          scene.remove(car.label)
          car.label.material.dispose()
        }
        carGeometry.dispose()
        carLeftMaterial.dispose()
        carRightMaterial.dispose()
        carLeftTexture.dispose()
        carRightTexture.dispose()
      }
    }

    const addRoadsLive = async () => {
      const LIVE_ROAD_Y = 0.1
      const LIVE_GRASS_Y = 0

      const roadCells = new Set(serviceLaneCells.map((c) => cellKey(c.cx, c.cy)))
      const seedKey = districts[0]?.language?.seed_key ?? 'factory'
      const { descriptors } = autotileRoadNetwork({
        roadCells,
        serviceLaneCells: new Set(),
        seedKey,
      })

      const roadUrls = [...new Set(descriptors.map((d) => groundRoadTextureUrl(d.kind, d.tileType)))]
      const allUrls = [...new Set([grassBaseTextureUrl, ...roadUrls])]
      const textures = await Promise.all(allUrls.map(loadSvgTexture))
      const textureByUrl = new Map(allUrls.map((u, i) => [u, textures[i]!]))

      if (cancelled) {
        for (const t of textureByUrl.values()) t.dispose()
        return
      }

      const grassTexture = textureByUrl.get(grassBaseTextureUrl)
      if (!grassTexture) {
        for (const t of textureByUrl.values()) t.dispose()
        return
      }

      const grassGeometry = new THREE.PlaneGeometry(CELL_SIZE, CELL_SIZE)
      const grassMaterial = new THREE.MeshStandardMaterial({
        map: grassTexture,
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide,
      })
      const grassCount = GRID_SIZE * GRID_SIZE
      const grassInstanced = new THREE.InstancedMesh(grassGeometry, grassMaterial, grassCount)
      const matrix = new THREE.Matrix4()
      const position = new THREE.Vector3()
      const scale = new THREE.Vector3(1, 1, 1)
      let gi = 0
      for (let cy = 0; cy < GRID_SIZE; cy++) {
        for (let cx = 0; cx < GRID_SIZE; cx++) {
          const worldX = cx * CELL_SIZE + CELL_SIZE / 2 - centerOffset
          const worldZ = cy * CELL_SIZE + CELL_SIZE / 2 - centerOffset
          position.set(worldX, LIVE_GRASS_Y, worldZ)
          matrix.compose(position, qGrassHorizontal, scale)
          grassInstanced.setMatrixAt(gi++, matrix)
        }
      }
      grassInstanced.instanceMatrix.needsUpdate = true
      scene.add(grassInstanced)

      const roadPlaneGeometry = new THREE.PlaneGeometry(CELL_SIZE, CELL_SIZE)
      const roadMeshes: THREE.Mesh[] = []
      const roadMaterials: THREE.MeshStandardMaterial[] = []

      for (const d of descriptors) {
        const url = groundRoadTextureUrl(d.kind, d.tileType)
        const tex = textureByUrl.get(url)
        if (!tex) continue

        const mat = new THREE.MeshStandardMaterial({
          map: tex,
          transparent: true,
          alphaTest: 0.01,
          roughness: 1,
          metalness: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
        roadMaterials.push(mat)

        const mesh = new THREE.Mesh(roadPlaneGeometry, mat)
        const worldX = d.x * CELL_SIZE + CELL_SIZE / 2 - centerOffset
        const worldZ = d.y * CELL_SIZE + CELL_SIZE / 2 - centerOffset
        const yawRad = (d.rotation * Math.PI) / 180
        mesh.rotation.order = 'YXZ'
        mesh.rotation.set(-Math.PI / 2, yawRad, 0, 'YXZ')
        mesh.position.set(worldX, LIVE_ROAD_Y, worldZ)
        scene.add(mesh)
        roadMeshes.push(mesh)
      }

      disposeLiveRoads = () => {
        scene.remove(grassInstanced)
        grassGeometry.dispose()
        grassMaterial.dispose()

        for (const m of roadMeshes) {
          scene.remove(m)
        }
        for (const mat of roadMaterials) {
          mat.dispose()
        }
        roadPlaneGeometry.dispose()

        for (const t of textureByUrl.values()) {
          t.dispose()
        }
      }
    }

    if (viewMode === 'x-ray') {
      addRoadsXRay()
    } else {
      void addRoadsLive()
        .then(() => {
          if (cancelled) {
            disposeLiveRoads?.()
            return
          }
          render()
        })
        .catch((err) => {
          console.error('Live road layer: texture load failed', err)
          if (!cancelled) render()
        })
    }

    void addTrees()
      .then(() => {
        if (cancelled) {
          disposeTrees?.()
          return
        }
        render()
      })
      .catch((err) => {
        console.error('Tree layer: texture load failed', err)
        if (!cancelled) render()
      })

    void addCars()
      .then(() => {
        if (cancelled) {
          disposeCars?.()
          return
        }
        render()
      })
      .catch((err) => {
        console.error('Car layer: texture load failed', err)
        if (!cancelled) render()
      })

    const MIN_ZOOM = 0.15
    const MAX_ZOOM = 8
    const frustumSize = MAP_SIZE * 1.15

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.12 : 0.12
      camera.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, camera.zoom * (1 + delta)))
      cameraZoomRef.current = camera.zoom
      camera.updateProjectionMatrix()
      render()
    }

    let isDragging = false
    let lastClientX = 0
    let lastClientY = 0

    const applyCameraFromTarget = () => {
      camera.position.copy(target.clone().add(offset))
      camera.lookAt(target)
      cameraTargetRef.current.copy(target)
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      isDragging = true
      lastClientX = e.clientX
      lastClientY = e.clientY
      renderer.domElement.setPointerCapture(e.pointerId)
      renderer.domElement.style.cursor = 'grabbing'
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return
      const deltaX = e.clientX - lastClientX
      const deltaY = e.clientY - lastClientY
      lastClientX = e.clientX
      lastClientY = e.clientY

      const width = container.clientWidth || 1
      const height = container.clientHeight || 1
      const aspect = width / height
      const scaleX = (frustumSize * aspect) / (camera.zoom * width)
      const scaleY = frustumSize / (camera.zoom * height)

      const viewDir = new THREE.Vector3().subVectors(target, camera.position).normalize()
      const isTopDown = viewDir.y < -0.99

      if (isTopDown) {
        // Camera looking straight down: pan in world XZ. Drag direction matches view movement.
        target.x -= deltaX * scaleX
        target.z -= deltaY * scaleY
      } else {
        const up = new THREE.Vector3(0, 1, 0)
        const right = new THREE.Vector3().crossVectors(up, viewDir)
        right.y = 0
        right.normalize()
        const forward = new THREE.Vector3().crossVectors(right, viewDir)
        forward.y = 0
        forward.normalize()
        // Drag direction should match scene movement: dragging right moves view right, dragging up moves view up.
        target.addScaledVector(right, deltaX * scaleX)
        target.addScaledVector(forward, -deltaY * scaleY)
      }
      applyCameraFromTarget()
      render()
    }

    const onPointerUp = (e: PointerEvent) => {
      if (e.button !== 0) return
      isDragging = false
      renderer.domElement.releasePointerCapture(e.pointerId)
      renderer.domElement.style.cursor = 'grab'
    }

    renderer.domElement.style.cursor = 'grab'
    container.addEventListener('wheel', onWheel, { passive: false })
    container.addEventListener('pointerdown', onPointerDown)
    container.addEventListener('pointermove', onPointerMove)
    container.addEventListener('pointerup', onPointerUp)
    const onPointerLeave = () => {
      if (isDragging) {
        isDragging = false
        renderer.domElement.style.cursor = 'grab'
      }
    }
    container.addEventListener('pointerleave', onPointerLeave)

    updateSize()
    render()

    const resizeObserver = new ResizeObserver(() => {
      updateSize()
      render()
    })

    resizeObserver.observe(container)

    return () => {
      cancelled = true
      cameraTargetRef.current.copy(target)
      cameraZoomRef.current = camera.zoom
      disposeLiveRoads?.()
      disposeTrees?.()
      disposeCars?.()
      container.removeEventListener('wheel', onWheel)
      container.removeEventListener('pointerdown', onPointerDown)
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerup', onPointerUp)
      container.removeEventListener('pointerleave', onPointerLeave)
      resizeObserver.disconnect()
      renderer.dispose()
      scene.clear()

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [districts, compoundDrawables, nextCompoundDrawables, treeCells, blockLists, paths, serviceLaneCells, topDownView, viewMode, showVehicleTags])

  return (
    <div className="factory-map__three-wrapper">
      <div ref={containerRef} className="factory-map__three" />
    </div>
  )
}