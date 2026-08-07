import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { systemMatches } from '../lib/select.js'
import { fmtDistance, fmtValue } from '../lib/format.js'

function starSprite() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.65)')
  g.addColorStop(0.55, 'rgba(255,255,255,0.18)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(canvas)
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
    const camera = new THREE.PerspectiveCamera(58, mount.clientWidth / mount.clientHeight, 0.5, 40000)
    camera.position.set(0, 420, 900)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)

    const count = systems.length
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const base = []
    const color = new THREE.Color()
    for (let i = 0; i < count; i++) {
      const s = systems[i]
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

    const points = new THREE.Points(geometry, new THREE.PointsMaterial({
      size: 14,
      map: starSprite(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    }))
    scene.add(points)

    const sol = new THREE.Mesh(
      new THREE.SphereGeometry(3, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff4ea })
    )
    scene.add(sol)

    const dust = new Float32Array(2400 * 3)
    for (let i = 0; i < dust.length; i++) dust[i] = (Math.random() - 0.5) * 9000
    const dustGeo = new THREE.BufferGeometry()
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dust, 3))
    scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({
      size: 3, color: 0x334155, transparent: true, opacity: 0.5, depthWrite: false
    })))

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.rotateSpeed = 0.5
    controls.minDistance = 30
    controls.maxDistance = 6000

    const raycaster = new THREE.Raycaster()
    raycaster.params.Points.threshold = 12
    const pointer = new THREE.Vector2()
    let hoverIndex = -1
    let warp = null
    let frame = 0

    function indexAt(event) {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObject(points)
      return hits.length > 0 ? hits[0].index : -1
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
      const target = new THREE.Vector3(system.x, system.y, system.z)
      const offset = camera.position.clone().sub(target).normalize().multiplyScalar(46)
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
