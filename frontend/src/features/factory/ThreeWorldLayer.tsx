import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

import type { DistrictPlacement, CompoundDrawable, PathCell, Block } from '../../lib/procedural'
import { CELL_SIZE, MAP_SIZE } from '../../lib/procedural'
import { getLanguageTheme } from '../../lib/theme/duolingoLanguageThemes'
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
}

export function ThreeWorldLayer({ districts, compoundDrawables, blockLists, paths, serviceLaneCells }: ThreeWorldLayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [topDownView, setTopDownView] = useState(true)

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

      renderer.setSize(width, height, false)
    }

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 5000)
    const target = new THREE.Vector3(0, 0, 0)
    const offset = topDownView
      ? new THREE.Vector3(0, 1200, 0)
      : new THREE.Vector3(CAMERA_X, CAMERA_Y, CAMERA_Z)
    camera.position.copy(target.clone().add(offset))
    camera.lookAt(target)
    camera.zoom = 1.1
    camera.updateProjectionMatrix()

    // Soft lighting to avoid harsh flat/pixel-looking edges.
    const ambient = new THREE.AmbientLight(0xffffff, 1.15)
    scene.add(ambient)

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.55)
    dirLight.position.set(900, 1200, 600)
    scene.add(dirLight)

    const groundGeometry = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE)
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 1,
      metalness: 0,
    })

    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    scene.add(ground)

    const gridDivisions = 60
    const gridHelper = new THREE.GridHelper(MAP_SIZE, gridDivisions, 0x3b82f6, 0x1f2937)
    gridHelper.position.y = 0.1
    scene.add(gridHelper)

    const axesSize = 40
    const axesHelper = new THREE.AxesHelper(axesSize)
    const half = MAP_SIZE / 2
    axesHelper.position.set(-half + axesSize, 8, -half + axesSize)
    scene.add(axesHelper)

    const heightScale = 16
    const centerOffset = MAP_SIZE / 2
    const heightMultipliers = [0.8, 1.0, 1.2, 1.4]

    const addCompound = (drawable: CompoundDrawable, districtIndex: number) => {
      const baseHeight = drawable.isLandmark ? heightScale * 1.8 : heightScale
      const level = drawable.heightLevel ?? 0
      const compoundHeight = baseHeight * (heightMultipliers[level] ?? 1)

      const geometry = new THREE.BoxGeometry(drawable.w, compoundHeight, drawable.h)

      const languageCode = districts[districtIndex]?.language?.language_code
      const primaryHex = getLanguageTheme(languageCode).palette.primary
      const base = new THREE.Color(primaryHex)
      const shade = drawable.shade ?? 1
      const color = base.clone().multiplyScalar(shade)

      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.92,
        metalness: 0.02,
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

    // Block borders: orange outlines above compounds (higher z-index via y position)
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

    // Path layer: flat tiles on the ground at each path cell.
    const pathHeight = 0.8
    const pathGeometry = new THREE.BoxGeometry(CELL_SIZE * 0.5, pathHeight, CELL_SIZE * 0.5)
    const pathMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(PATH_COLOR),
      roughness: 0.9,
      metalness: 0.05,
    })
    for (const path of paths) {
      for (const cell of path) {
        const worldX = cell.cx * CELL_SIZE + CELL_SIZE / 2 - centerOffset
        const worldZ = cell.cy * CELL_SIZE + CELL_SIZE / 2 - centerOffset
        const pathMesh = new THREE.Mesh(pathGeometry, pathMaterial)
        pathMesh.position.set(worldX, pathHeight / 2 + 0.05, worldZ)
        scene.add(pathMesh)
      }
    }
    // Service lanes: bright red tiles
    const serviceLaneMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(SERVICE_LANE_COLOR),
      roughness: 0.9,
      metalness: 0.05,
    })
    for (const cell of serviceLaneCells) {
      const worldX = cell.cx * CELL_SIZE + CELL_SIZE / 2 - centerOffset
      const worldZ = cell.cy * CELL_SIZE + CELL_SIZE / 2 - centerOffset
      const laneMesh = new THREE.Mesh(pathGeometry, serviceLaneMaterial)
      laneMesh.position.set(worldX, pathHeight / 2 + 0.06, worldZ)
      scene.add(laneMesh)
    }

    const render = () => renderer.render(scene, camera)

    const MIN_ZOOM = 0.15
    const MAX_ZOOM = 8
    const frustumSize = MAP_SIZE * 1.15

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.12 : 0.12
      camera.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, camera.zoom * (1 + delta)))
      camera.updateProjectionMatrix()
      render()
    }

    let isDragging = false
    let lastClientX = 0
    let lastClientY = 0

    const applyCameraFromTarget = () => {
      camera.position.copy(target.clone().add(offset))
      camera.lookAt(target)
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
  }, [districts, compoundDrawables, blockLists, paths, serviceLaneCells, topDownView])

  return (
    <div className="factory-map__three-wrapper">
      <div ref={containerRef} className="factory-map__three" />
      <div className="factory-map__debug">
        <label>
          <input
            type="checkbox"
            checked={topDownView}
            onChange={(e) => setTopDownView(e.target.checked)}
          />
          View from above
        </label>
      </div>
    </div>
  )
}