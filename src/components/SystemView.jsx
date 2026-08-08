import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { orbitRadius, orbitSpeed, displayRadius, starDisplayRadius } from '../lib/orbits.js'
import { planetTextureCanvas } from '../lib/texture.js'
import { matchesFilter } from '../lib/filters.js'
import { hashString } from '../lib/seed.js'

function starSpriteTexture(size = 64) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const c = size / 2
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.3, 'rgba(255,255,255,1)')
  grad.addColorStop(0.42, 'rgba(255,255,255,0.55)')
  grad.addColorStop(0.62, 'rgba(255,255,255,0.16)')
  grad.addColorStop(0.84, 'rgba(255,255,255,0.03)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  return texture
}

export default function SystemView({ system, filter, selected, onSelectPlanet, onSelectStar }) {
  const mountRef = useRef(null)
  const selectRef = useRef(onSelectPlanet)
  const starRef = useRef(onSelectStar)
  const bodiesRef = useRef([])

  selectRef.current = onSelectPlanet
  starRef.current = onSelectStar

  useEffect(() => {
    const mount = mountRef.current
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(52, mount.clientWidth / mount.clientHeight, 0.1, 3000)
    camera.position.set(0, 18, 34)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)

    const starColor = new THREE.Color(system.starColor)
    const starRadius = starDisplayRadius(system.srad)
    const orbitBase = starRadius + 3.2
    const star = new THREE.Mesh(
      new THREE.SphereGeometry(starRadius, 48, 48),
      new THREE.MeshBasicMaterial({ color: starColor })
    )
    scene.add(star)

    const starHitGeo = new THREE.SphereGeometry(Math.max(starRadius * 1.25, 1.2), 16, 16)
    const starHit = new THREE.Mesh(starHitGeo, new THREE.MeshBasicMaterial())
    starHit.visible = false
    starHit.userData.star = true
    star.add(starHit)

    scene.add(new THREE.PointLight(starColor, 900, 0, 2))
    scene.add(new THREE.AmbientLight(0x223046, 1.1))

    const glowCanvas = document.createElement('canvas')
    glowCanvas.width = 128
    glowCanvas.height = 128
    const gctx = glowCanvas.getContext('2d')
    const grad = gctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    grad.addColorStop(0, `#${starColor.getHexString()}`)
    grad.addColorStop(0.3, `#${starColor.getHexString()}88`)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    gctx.fillStyle = grad
    gctx.fillRect(0, 0, 128, 128)
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(glowCanvas),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true
    }))
    glow.scale.setScalar(starRadius * 6)
    scene.add(glow)

    const field = new Float32Array(1500 * 3)
    for (let i = 0; i < field.length; i++) field[i] = (Math.random() - 0.5) * 1200
    const fieldGeo = new THREE.BufferGeometry()
    fieldGeo.setAttribute('position', new THREE.BufferAttribute(field, 3))
    const fieldTexture = starSpriteTexture()
    scene.add(new THREE.Points(fieldGeo, new THREE.PointsMaterial({
      size: 2.4, map: fieldTexture, color: 0x8fa3c8, transparent: true, opacity: 0.8, depthWrite: false
    })))

    const bodies = []
    const disposables = [star.geometry, starHitGeo, fieldGeo, fieldTexture]
    const ordered = [...system.planets].sort((a, b) => (a.smax ?? 99) - (b.smax ?? 99))

    ordered.forEach((planet, index) => {
      const radius = orbitRadius(planet.smax, index, orbitBase)
      const tilt = ((hashString(planet.name) % 100) / 100 - 0.5) * 0.28

      const ringPoints = []
      for (let a = 0; a <= 128; a++) {
        const t = (a / 128) * Math.PI * 2
        ringPoints.push(new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius))
      }
      const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPoints)
      const ring = new THREE.Line(ringGeo, new THREE.LineBasicMaterial({
        color: 0x3d5a80, transparent: true, opacity: 0.4
      }))
      ring.rotation.x = tilt
      scene.add(ring)
      disposables.push(ringGeo)

      const texture = new THREE.CanvasTexture(planetTextureCanvas(planet))
      texture.colorSpace = THREE.SRGBColorSpace
      const drawn = displayRadius(planet.rade)
      const geo = new THREE.SphereGeometry(drawn, 40, 40)
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
        map: texture, roughness: 0.85, metalness: 0.05, transparent: true
      }))
      mesh.userData.planet = planet
      scene.add(mesh)
      disposables.push(geo)

      const hitGeo = new THREE.SphereGeometry(Math.max(drawn * 4, 0.75), 12, 12)
      const hit = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial())
      hit.visible = false
      hit.userData.planet = planet
      mesh.add(hit)
      disposables.push(hitGeo)

      bodies.push({
        planet,
        mesh,
        hit,
        ring,
        radius,
        tilt,
        angle: (hashString(planet.name) % 628) / 100,
        speed: orbitSpeed(planet.period)
      })
    })

    bodiesRef.current = bodies

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 6
    controls.maxDistance = 320
    const span = bodies.length > 0 ? bodies[bodies.length - 1].radius : 12
    camera.position.set(0, span * 0.42 + 4, span * 1.2 + 7)

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()

    function pick(event) {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects([...bodies.map(b => b.hit), starHit])
      return hits.length > 0 ? hits[0].object.userData : null
    }

    function onClick(event) {
      const target = pick(event)
      if (target?.planet) selectRef.current(target.planet)
      else if (target?.star) starRef.current?.()
    }

    function onMove(event) {
      renderer.domElement.style.cursor = pick(event) ? 'pointer' : 'grab'
    }

    renderer.domElement.addEventListener('click', onClick)
    renderer.domElement.addEventListener('pointermove', onMove)

    function onResize() {
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }
    window.addEventListener('resize', onResize)

    const clock = new THREE.Clock()
    let frame = 0
    function animate() {
      frame = requestAnimationFrame(animate)
      const dt = Math.min(0.05, clock.getDelta())
      for (const b of bodies) {
        b.angle += b.speed * dt * 0.35
        const x = Math.cos(b.angle) * b.radius
        const z = Math.sin(b.angle) * b.radius
        b.mesh.position.set(x, Math.sin(b.tilt) * z, z)
        b.mesh.rotation.y += dt * 0.25
      }
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('click', onClick)
      renderer.domElement.removeEventListener('pointermove', onMove)
      controls.dispose()
      renderer.dispose()
      for (const d of disposables) d.dispose()
      mount.removeChild(renderer.domElement)
      bodiesRef.current = []
    }
  }, [system])

  useEffect(() => {
    for (const b of bodiesRef.current) {
      const match = matchesFilter(b.planet, filter)
      const isSelected = selected != null && selected.name === b.planet.name
      b.mesh.material.opacity = match ? 1 : 0.18
      b.ring.material.opacity = match ? (isSelected ? 0.85 : 0.4) : 0.08
      b.ring.material.color.set(isSelected ? 0x7dd3fc : 0x3d5a80)
      b.mesh.scale.setScalar(isSelected ? 1.35 : 1)
    }
  }, [filter, selected, system])

  return <div className="viewport" ref={mountRef} />
}
