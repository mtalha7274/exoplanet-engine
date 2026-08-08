import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { systemMatches } from '../lib/select.js'
import { fmtDistance, fmtValue } from '../lib/format.js'

const SPRITE_SIZE = 128
const STAR_SIZE = 46
const STAR_MIN_PX = 4
const STAR_MAX_PX = 60
const STAR_CORE_RATIO = 0.2
const PICK_SLOP_PX = 7
const DUST_EXTENT = 32000
const WARP_STANDOFF = 60
const SOL_MARKER_PX = 18

function starSprite() {
  const canvas = document.createElement('canvas')
  canvas.width = SPRITE_SIZE
  canvas.height = SPRITE_SIZE
  const ctx = canvas.getContext('2d')
  const image = ctx.createImageData(SPRITE_SIZE, SPRITE_SIZE)
  const data = image.data
  const mid = (SPRITE_SIZE - 1) / 2
  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < SPRITE_SIZE; x++) {
      const dx = (x - mid) / mid
      const dy = (y - mid) / mid
      const d = Math.min(1, Math.sqrt(dx * dx + dy * dy))
      const core = Math.exp(-d * d * 52)
      const halo = 0.34 * Math.exp(-d * 7)
      const a = Math.max(0, Math.min(1, (core + halo) * (1 - d * d)))
      const i = (y * SPRITE_SIZE + x) * 4
      data[i] = 255
      data[i + 1] = 255
      data[i + 2] = 255
      data[i + 3] = Math.round(a * 255)
    }
  }
  ctx.putImageData(image, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

export default function GalaxyView({ systems, filter, onWarp, warpTarget }) {
  const mountRef = useRef(null)
  const apiRef = useRef(null)
  const warpRef = useRef(onWarp)
  const [tooltip, setTooltip] = useState(null)

  warpRef.current = onWarp

  useEffect(() => {
    const mount = mountRef.current
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(58, mount.clientWidth / mount.clientHeight, 4, 80000)
    camera.position.set(0, 400, 830)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)

    const count = systems.length
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const mapped = []
    const base = []
    const color = new THREE.Color()
    let sceneRadius = 1
    for (let i = 0; i < count; i++) {
      const s = systems[i]
      const at = new THREE.Vector3(s.x, s.y, s.z)
      mapped.push(at)
      sceneRadius = Math.max(sceneRadius, at.length())
      positions[i * 3] = s.x
      positions[i * 3 + 1] = s.y
      positions[i * 3 + 2] = s.z
      color.set(s.starColor)
      base.push(color.clone())
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const sprite = starSprite()
    const pixelRatio = renderer.getPixelRatio()
    const starMaterial = new THREE.PointsMaterial({
      size: STAR_SIZE,
      map: sprite,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    })
    starMaterial.onBeforeCompile = shader => {
      shader.uniforms.minPointSize = { value: STAR_MIN_PX * pixelRatio }
      shader.uniforms.maxPointSize = { value: STAR_MAX_PX * pixelRatio }
      shader.vertexShader = shader.vertexShader
        .replace('uniform float scale;', 'uniform float scale;\nuniform float minPointSize;\nuniform float maxPointSize;')
        .replace(
          '#include <logdepthbuf_vertex>',
          'gl_PointSize = clamp( gl_PointSize, minPointSize, maxPointSize );\n\t#include <logdepthbuf_vertex>'
        )
    }
    const points = new THREE.Points(geometry, starMaterial)
    scene.add(points)

    const solGeo = new THREE.BufferGeometry()
    solGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3))
    const solMaterial = new THREE.PointsMaterial({
      size: SOL_MARKER_PX,
      map: sprite,
      color: 0xfff4ea,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: false
    })
    scene.add(new THREE.Points(solGeo, solMaterial))

    const dust = new Float32Array(2400 * 3)
    for (let i = 0; i < dust.length; i++) dust[i] = (Math.random() - 0.5) * DUST_EXTENT
    const dustGeo = new THREE.BufferGeometry()
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dust, 3))
    const dustMaterial = new THREE.PointsMaterial({
      size: 2,
      map: sprite,
      color: 0x334155,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      sizeAttenuation: false
    })
    scene.add(new THREE.Points(dustGeo, dustMaterial))

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.rotateSpeed = 0.5
    controls.minDistance = 15
    controls.maxDistance = 7500

    const raycaster = new THREE.Raycaster()
    raycaster.params.Points.threshold = 60
    const pointer = new THREE.Vector2()
    let hoverIndex = -1
    let warp = null
    let frame = 0

    function indexAt(event) {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const focal = rect.height / (2 * Math.tan((camera.fov * Math.PI) / 360))
      const reach = camera.position.length() + sceneRadius
      raycaster.params.Points.threshold = Math.max(8, (PICK_SLOP_PX * reach) / focal)
      const hits = raycaster.intersectObject(points)
      let best = -1
      let bestScore = Infinity
      for (const hit of hits) {
        if (hit.distance <= 0) continue
        const drawn = Math.min(STAR_MAX_PX, Math.max(STAR_MIN_PX, (STAR_SIZE * rect.height * 0.5) / hit.distance))
        const score = (hit.distanceToRay * focal) / hit.distance - drawn * STAR_CORE_RATIO
        if (score < bestScore) {
          bestScore = score
          best = hit.index
        }
      }
      return bestScore <= PICK_SLOP_PX ? best : -1
    }

    function onMove(event) {
      const index = indexAt(event)
      if (index === hoverIndex) return
      hoverIndex = index
      if (index < 0) {
        setTooltip(null)
        renderer.domElement.style.cursor = 'grab'
        return
      }
      const s = systems[index]
      renderer.domElement.style.cursor = 'pointer'
      setTooltip({
        x: event.clientX,
        y: event.clientY,
        host: s.host,
        count: s.planets.length,
        dist: s.dist,
        spectype: s.spectype,
        teff: s.teff,
        color: s.starColor
      })
    }

    function beginWarp(system) {
      const index = systems.indexOf(system)
      const target = index >= 0
        ? mapped[index].clone()
        : new THREE.Vector3(system.x, system.y, system.z)
      const offset = camera.position.clone().sub(target).normalize().multiplyScalar(WARP_STANDOFF)
      warp = {
        t: 0,
        host: system.host,
        fromPos: camera.position.clone(),
        toPos: target.clone().add(offset),
        fromTarget: controls.target.clone(),
        toTarget: target
      }
      controls.enabled = false
      setTooltip(null)
    }

    function onClick(event) {
      const index = indexAt(event)
      if (index >= 0) beginWarp(systems[index])
    }

    renderer.domElement.addEventListener('pointermove', onMove)
    renderer.domElement.addEventListener('click', onClick)

    function onResize() {
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }
    window.addEventListener('resize', onResize)

    function animate() {
      frame = requestAnimationFrame(animate)
      if (warp) {
        warp.t = Math.min(1, warp.t + 0.018)
        const e = warp.t < 0.5 ? 2 * warp.t * warp.t : 1 - Math.pow(-2 * warp.t + 2, 2) / 2
        camera.position.lerpVectors(warp.fromPos, warp.toPos, e)
        controls.target.lerpVectors(warp.fromTarget, warp.toTarget, e)
        if (warp.t >= 1) {
          const host = warp.host
          warp = null
          controls.enabled = true
          warpRef.current(host)
        }
      } else {
        points.rotation.y += 0.00012
      }
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    apiRef.current = { geometry, base, warpTo: beginWarp }

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('pointermove', onMove)
      renderer.domElement.removeEventListener('click', onClick)
      controls.dispose()
      renderer.dispose()
      geometry.dispose()
      dustGeo.dispose()
      solGeo.dispose()
      solMaterial.dispose()
      starMaterial.dispose()
      dustMaterial.dispose()
      sprite.dispose()
      mount.removeChild(renderer.domElement)
      apiRef.current = null
    }
  }, [systems])

  useEffect(() => {
    const api = apiRef.current
    if (!api) return
    const attr = api.geometry.getAttribute('color')
    for (let i = 0; i < systems.length; i++) {
      const c = api.base[i]
      const dim = systemMatches(systems[i], filter) ? 1 : 0.09
      attr.array[i * 3] = c.r * dim
      attr.array[i * 3 + 1] = c.g * dim
      attr.array[i * 3 + 2] = c.b * dim
    }
    attr.needsUpdate = true
  }, [filter, systems])

  useEffect(() => {
    if (warpTarget && apiRef.current) apiRef.current.warpTo(warpTarget)
  }, [warpTarget])

  return (
    <div className="viewport" ref={mountRef}>
      {tooltip && (
        <div className="tooltip" style={{ left: tooltip.x + 16, top: tooltip.y + 16 }}>
          <strong>
            <i className="swatch" style={{ background: tooltip.color }} />
            {tooltip.host}
          </strong>
          <span>{tooltip.count} world{tooltip.count === 1 ? '' : 's'}</span>
          <span>{fmtDistance(tooltip.dist)}</span>
          <span>{tooltip.spectype ?? 'UNSURVEYED'} · {fmtValue(tooltip.teff, 0, 'K')}</span>
        </div>
      )}
    </div>
  )
}
