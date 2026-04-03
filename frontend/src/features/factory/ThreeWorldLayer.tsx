import { useEffect, useRef } from 'react'
import * as THREE from 'three'

import type { DistrictPlacement, CompoundDrawable, PathCell, Block } from '../../lib/procedural'
import { autotileRoadNetwork, cellKey, CELL_SIZE, GRID_SIZE, MAP_SIZE } from '../../lib/procedural'
import { getLanguageTheme } from '../../lib/theme/duolingoLanguageThemes'
import type { FactoryViewMode } from './factoryViewMode'
import { grassBaseTextureUrl, groundRoadTextureUrl } from './groundRoadAssets'
import { PATH_COLOR, SERVICE_LANE_COLOR } from './constants'

// True isometric camera direction.
export const CAMERA_X = 900
export const CAMERA_Y = 900
export const CAMERA_Z = 900

const BLOCK_BORDER_COLOR = '#f97316'

interface ThreeWorldLayerProps {
  districts: DistrictPlacement[]
  compoundDrawables: CompoundDrawable[][]
  blockLists: Block[][]
  paths: PathCell[][]
  serviceLaneCells: PathCell[]
  /** live = SVG ground tiles for roads/lanes; x-ray = solid debug tiles (previous behavior). */
  viewMode: FactoryViewMode
  topDownView: boolean
}

export function ThreeWorldLayer({
  districts,
  compoundDrawables,
  blockLists,
  paths,
  serviceLaneCells,
  viewMode,
  topDownView,
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
    const serviceLaneMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(SERVICE_LANE_COLOR),
      roughness: 0.9,
      metalness: 0.05,
    })

    let cancelled = false
    let disposeLiveRoads: (() => void) | undefined

    const render = () => renderer.render(scene, camera)

    const addRoadsXRay = () => {
      for (const path of paths) {
        for (const cell of path) {
          const worldX = cell.cx * CELL_SIZE + CELL_SIZE / 2 - centerOffset
          const worldZ = cell.cy * CELL_SIZE + CELL_SIZE / 2 - centerOffset
          const pathMesh = new THREE.Mesh(pathGeometry, pathMaterial)
          pathMesh.position.set(worldX, pathHeight / 2 + 0.05, worldZ)
          scene.add(pathMesh)
        }
      }
      for (const cell of serviceLaneCells) {
        const worldX = cell.cx * CELL_SIZE + CELL_SIZE / 2 - centerOffset
        const worldZ = cell.cy * CELL_SIZE + CELL_SIZE / 2 - centerOffset
        const laneMesh = new THREE.Mesh(pathGeometry, serviceLaneMaterial)
        laneMesh.position.set(worldX, pathHeight / 2 + 0.06, worldZ)
        scene.add(laneMesh)
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

    const addRoadsLive = async () => {
      const LIVE_ROAD_Y = 0.1
      const LIVE_GRASS_Y = 0

      const roadCells = new Set(paths.flat().map((c) => cellKey(c.cx, c.cy)))
      const serviceLaneCellKeys = new Set(serviceLaneCells.map((c) => cellKey(c.cx, c.cy)))
      const seedKey = districts[0]?.language?.seed_key ?? 'factory'
      const { descriptors } = autotileRoadNetwork({
        roadCells,
        serviceLaneCells: serviceLaneCellKeys,
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
  }, [districts, compoundDrawables, blockLists, paths, serviceLaneCells, topDownView, viewMode])

  return (
    <div className="factory-map__three-wrapper">
      <div ref={containerRef} className="factory-map__three" />
    </div>
  )
}