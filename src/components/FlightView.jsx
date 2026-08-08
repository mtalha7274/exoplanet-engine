import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { buildShip } from './ship.js'
import {
  createFlight,
  stepFlight,
  distanceFromEarth,
  nearestSystem,
  pickStar,
  orientationEuler,
  bankTarget,
  throttleGlow,
  homeExaggeration,
  ARRIVAL_PC,
  CAM_OFFSET,
  FLIGHT_FOV,
  SOL_POSITION,
  EARTH_POSITION
} from '../lib/flight.js'

const NEAR_FIELD_PC = 6
const HUD_INTERVAL = 100

const STAR_WORLD_SIZE = 0.09
const STAR_MIN_PX = 3.4
const STAR_MAX_PX = 64

const SOL_RADIUS = 0.11
const SOL_GLOW = 0.95
const SOL_KEEP_PC = 10
const EARTH_RADIUS = 0.085
const EARTH_KEEP_PC = 25
const EARTH_SPIN = 0.07
const LABEL_ANGULAR = 0.055
const NOTE_ANGULAR = 0.036
const HOME_LABEL_PC = 60

const KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'Space']

const EXAGGERATION = (Math.round(homeExaggeration() / 1000) * 1000).toLocaleString('en-US')

const NOTE_STYLE = {
  position: 'absolute',
  right: '1.6rem',
  bottom: '1.4rem',
  zIndex: 6,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.3rem',
  maxWidth: '17rem',
  padding: '0.5rem 0.75rem',
  background: 'rgba(11, 16, 32, 0.86)',
  border: '1px solid var(--line)',
  color: 'var(--muted)',
  fontSize: '0.5rem',
  letterSpacing: '0.18em',
  lineHeight: 1.7,
  textAlign: 'right',
  pointerEvents: 'none'
}

const NOTE_HEAD_STYLE = { color: 'var(--accent)', fontWeight: 400, letterSpacing: '0.22em' }

const starVertexShader = `
attribute vec3 starTint;
uniform float pointScale;
uniform float worldSize;
uniform float minPixels;
uniform float maxPixels;
varying vec3 vTint;
void main() {
  vTint = starTint;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(worldSize * pointScale / max(-mv.z, 0.001), minPixels, maxPixels);
}
`

const starFragmentShader = `
uniform sampler2D map;
varying vec3 vTint;
void main() {
  vec4 texel = texture2D(map, gl_PointCoord);
  if (texel.a < 0.02) discard;
  gl_FragColor = vec4(vTint * texel.rgb, texel.a);
}
`

function glowTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.22, 'rgba(255,255,255,0.6)')
  g.addColorStop(0.6, 'rgba(255,255,255,0.14)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(canvas)
}

function pointTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const c = size / 2
  const g = ctx.createRadialGradient(c, c, 0, c, c, c)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.42, 'rgba(255,255,255,1)')
  g.addColorStop(0.54, 'rgba(255,255,255,0.85)')
  g.addColorStop(0.66, 'rgba(255,255,255,0.16)')
  g.addColorStop(0.82, 'rgba(255,255,255,0.03)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(c, c, c, 0, Math.PI * 2)
  ctx.fill()
  const tex = new THREE.CanvasTexture(canvas)
  tex.generateMipmaps = false
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  return tex
}

function labelSprite(text, color) {
  const font = '600 40px ui-monospace, "SF Mono", Menlo, monospace'
  const probe = document.createElement('canvas').getContext('2d')
  probe.font = font
  const width = Math.ceil(probe.measureText(text).width) + 40
  const height = 64
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.font = font
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.fillText(text, width / 2, height / 2)
  const tex = new THREE.CanvasTexture(canvas)
  tex.generateMipmaps = false
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, transparent: true, depthWrite: false
  }))
  sprite.renderOrder = 12
  sprite.userData.aspect = width / height
  sprite.userData.texture = tex
  return sprite
}

export default function FlightView({ systems, flightRef, onTelemetry, onSelectStar }) {
  const mountRef = useRef(null)
  const telemetryRef = useRef(onTelemetry)
  const selectRef = useRef(onSelectStar)
  const [hint, setHint] = useState(true)
  const [nearHome, setNearHome] = useState(true)

  telemetryRef.current = onTelemetry
  selectRef.current = onSelectStar

  useEffect(() => {
    const mount = mountRef.current
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      FLIGHT_FOV, mount.clientWidth / mount.clientHeight, 0.01, 60000
    )

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, logarithmicDepthBuffer: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)

    const world = new THREE.Group()
    scene.add(world)

    const count = systems.length
    const positions = new Float32Array(count * 3)
    const tints = new Float32Array(count * 3)
    const color = new THREE.Color()
    for (let i = 0; i < count; i++) {
      const s = systems[i]
      positions[i * 3] = s.x
      positions[i * 3 + 1] = s.y
      positions[i * 3 + 2] = s.z
      color.set(s.starColor)
      tints[i * 3] = color.r
      tints[i * 3 + 1] = color.g
      tints[i * 3 + 2] = color.b
    }

    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    starGeo.setAttribute('starTint', new THREE.BufferAttribute(tints, 3))
    const sprite = glowTexture()
    const point = pointTexture()

    const starMat = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: point },
        pointScale: { value: 1 },
        worldSize: { value: STAR_WORLD_SIZE },
        minPixels: { value: STAR_MIN_PX },
        maxPixels: { value: STAR_MAX_PX }
      },
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
    const stars = new THREE.Points(starGeo, starMat)
    stars.frustumCulled = false
    world.add(stars)

    function syncStarScale() {
      const buffer = renderer.getDrawingBufferSize(new THREE.Vector2())
      const dpr = renderer.getPixelRatio()
      starMat.uniforms.pointScale.value = buffer.y * 0.5
      starMat.uniforms.minPixels.value = STAR_MIN_PX * dpr
      starMat.uniforms.maxPixels.value = STAR_MAX_PX * dpr
    }
    syncStarScale()

    const home = new THREE.Group()
    world.add(home)

    const solCore = new THREE.Mesh(
      new THREE.SphereGeometry(SOL_RADIUS, 32, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff3dc })
    )
    solCore.position.set(...SOL_POSITION)
    home.add(solCore)

    const solGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: sprite, color: 0xffd9a0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
    }))
    solGlow.position.set(...SOL_POSITION)
    home.add(solGlow)

    const sunlight = new THREE.PointLight(0xfff2e0, 2.4, 8, 2)
    sunlight.position.set(...SOL_POSITION)
    home.add(sunlight)

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS, 32, 24),
      new THREE.MeshStandardMaterial({
        color: 0x2f74c8, roughness: 0.85, metalness: 0.05,
        emissive: 0x0b2647, emissiveIntensity: 0.9
      })
    )
    earth.position.set(...EARTH_POSITION)
    home.add(earth)

    const earthHalo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: sprite, color: 0x6fb6ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55
    }))
    earthHalo.position.set(...EARTH_POSITION)
    home.add(earthHalo)

    const gapGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...SOL_POSITION),
      new THREE.Vector3(...EARTH_POSITION)
    ])
    const gapMat = new THREE.LineDashedMaterial({
      color: 0x5f7da6, dashSize: 0.035, gapSize: 0.035, transparent: true, opacity: 0.55, depthWrite: false
    })
    const gapLine = new THREE.Line(gapGeo, gapMat)
    gapLine.computeLineDistances()
    home.add(gapLine)

    const solLabel = labelSprite('SOL', '#ffe6bd')
    const earthLabel = labelSprite('EARTH', '#a8d4ff')
    const scaleLabel = labelSprite('NOT TO SCALE', '#7f9dc4')
    home.add(solLabel, earthLabel, scaleLabel)

    const nearPool = []
    for (let i = 0; i < 10; i++) {
      const mat = new THREE.SpriteMaterial({
        map: sprite, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
      })
      const s = new THREE.Sprite(mat)
      s.visible = false
      world.add(s)
      nearPool.push(s)
    }

    const ship = buildShip()
    scene.add(ship)
    scene.add(new THREE.AmbientLight(0x3d5372, 2.2))
    const key = new THREE.DirectionalLight(0xdff0ff, 2.4)
    key.position.set(0.5, 1, 0.4)
    scene.add(key)

    const input = { turn: 0, pitch: 0, boost: false, halt: false }
    const keys = new Set()

    function refreshInput() {
      input.turn = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0)
      input.pitch = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0)
      input.boost = keys.has('ShiftLeft') || keys.has('ShiftRight')
      input.halt = keys.has('Space')
    }

    function onKeyDown(e) {
      if (!KEYS.includes(e.code)) return
      keys.add(e.code)
      refreshInput()
      setHint(false)
      e.preventDefault()
    }

    function onKeyUp(e) {
      keys.delete(e.code)
      refreshInput()
    }

    function onBlur() {
      keys.clear()
      refreshInput()
    }

    function onClick(e) {
      const rect = renderer.domElement.getBoundingClientRect()
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1
      const ray = new THREE.Vector3(nx, ny, 0.5).unproject(camera).sub(camera.position).normalize()
      const eye = [
        flight.pos[0] + camera.position.x,
        flight.pos[1] + camera.position.y,
        flight.pos[2] + camera.position.z
      ]
      const hit = pickStar(systems, eye, [ray.x, ray.y, ray.z], 0.045)
      if (hit) selectRef.current(hit)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    renderer.domElement.addEventListener('click', onClick)

    function onResize() {
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
      syncStarScale()
    }
    window.addEventListener('resize', onResize)

    let flight = flightRef.current ?? createFlight()
    const clock = new THREE.Clock()
    let frame = 0
    let lastHud = 0
    const camOffset = new THREE.Vector3()
    const quat = new THREE.Quaternion()
    const shipQuat = new THREE.Quaternion()
    const euler = new THREE.Euler(0, 0, 0, 'YXZ')
    const shipEuler = new THREE.Euler(0, 0, 0, 'YXZ')
    const faceForward = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
    let roll = 0

    function sizeLabel(label, height) {
      label.scale.set(height * label.userData.aspect, height, 1)
    }

    function animate() {
      frame = requestAnimationFrame(animate)
      const dt = Math.min(0.05, clock.getDelta())

      flight = stepFlight(flight, input, dt)
      flightRef.current = flight

      euler.set(...orientationEuler(flight.yaw, flight.pitch))
      quat.setFromEuler(euler)

      roll += (bankTarget(input.turn) - roll) * Math.min(1, dt * 5)
      shipEuler.set(...orientationEuler(flight.yaw, flight.pitch, roll))
      shipQuat.setFromEuler(shipEuler)
      ship.quaternion.copy(shipQuat)

      world.position.set(-flight.pos[0], -flight.pos[1], -flight.pos[2])

      camOffset.set(...CAM_OFFSET).applyQuaternion(quat)
      camera.position.copy(camOffset)
      camera.quaternion.copy(quat).multiply(faceForward)

      ship.userData.setThrust(throttleGlow(flight.speed))

      const near = nearestSystem(flight.pos, systems)
      let poolIndex = 0
      if (near) {
        for (const s of systems) {
          if (poolIndex >= nearPool.length) break
          const dx = s.x - flight.pos[0]
          const dy = s.y - flight.pos[1]
          const dz = s.z - flight.pos[2]
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
          if (d > NEAR_FIELD_PC) continue
          const spr = nearPool[poolIndex++]
          spr.visible = true
          spr.position.set(s.x, s.y, s.z)
          spr.material.color.set(s.starColor)
          spr.scale.setScalar(Math.min(0.75, Math.max(0.02, 0.09 / Math.max(d, 0.05)) * d * 1.4 + 0.02))
        }
      }
      for (let i = poolIndex; i < nearPool.length; i++) nearPool[i].visible = false

      const solDist = distanceFromEarth(flight.pos)
      const solLod = Math.max(1, solDist / SOL_KEEP_PC)
      solCore.scale.setScalar(solLod)
      solGlow.scale.setScalar(SOL_GLOW * solLod)

      const earthDist = Math.hypot(
        EARTH_POSITION[0] - flight.pos[0],
        EARTH_POSITION[1] - flight.pos[1],
        EARTH_POSITION[2] - flight.pos[2]
      )
      const earthLod = Math.max(1, earthDist / EARTH_KEEP_PC)
      earth.scale.setScalar(earthLod)
      earth.rotation.y += dt * EARTH_SPIN
      earthHalo.scale.setScalar(EARTH_RADIUS * 4 * earthLod)

      const labelled = solDist < HOME_LABEL_PC
      solLabel.visible = labelled
      earthLabel.visible = labelled
      scaleLabel.visible = labelled
      gapLine.visible = labelled
      if (labelled) {
        const solLabelHeight = Math.min(0.9, solDist * LABEL_ANGULAR)
        const earthLabelHeight = Math.min(0.9, earthDist * LABEL_ANGULAR)
        sizeLabel(solLabel, solLabelHeight)
        sizeLabel(earthLabel, earthLabelHeight)
        sizeLabel(scaleLabel, Math.min(0.7, solDist * NOTE_ANGULAR))
        solLabel.position.set(
          SOL_POSITION[0],
          SOL_POSITION[1] - SOL_RADIUS * solLod - solLabelHeight * 1.4,
          SOL_POSITION[2]
        )
        earthLabel.position.set(
          EARTH_POSITION[0],
          EARTH_POSITION[1] - EARTH_RADIUS * earthLod - earthLabelHeight * 1.4,
          EARTH_POSITION[2]
        )
        scaleLabel.position.set(
          (SOL_POSITION[0] + EARTH_POSITION[0]) / 2,
          (SOL_POSITION[1] + EARTH_POSITION[1]) / 2 - scaleLabel.scale.y * 1.1,
          (SOL_POSITION[2] + EARTH_POSITION[2]) / 2
        )
      }

      const now = performance.now()
      if (now - lastHud > HUD_INTERVAL) {
        lastHud = now
        setNearHome(solDist < HOME_LABEL_PC)
        telemetryRef.current({
          speed: flight.speed,
          boost: input.boost && !input.halt,
          distance: solDist,
          nearest: near ? near.system : null,
          nearestDistance: near ? near.distance : null,
          arrived: near && near.distance <= ARRIVAL_PC ? near.system : null,
          flight
        })
      }

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('click', onClick)
      ship.userData.dispose()
      for (const s of nearPool) s.material.dispose()
      for (const label of [solLabel, earthLabel, scaleLabel]) {
        label.material.dispose()
        label.userData.texture.dispose()
      }
      solCore.geometry.dispose()
      solCore.material.dispose()
      solGlow.material.dispose()
      earth.geometry.dispose()
      earth.material.dispose()
      earthHalo.material.dispose()
      gapGeo.dispose()
      gapMat.dispose()
      sprite.dispose()
      point.dispose()
      starMat.dispose()
      starGeo.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [systems, flightRef])

  return (
    <div className="viewport flight" ref={mountRef}>
      {hint && (
        <div className="flight-hint">
          <span><b>A</b> / <b>D</b> turn</span>
          <span><b>W</b> climb · <b>S</b> dive</span>
          <span><b>shift</b> accelerate</span>
          <span><b>space</b> hold position</span>
          <span className="dim">the engines always cruise — there is no forward key</span>
          <span className="dim">click a star to identify it</span>
        </div>
      )}
      {nearHome && (
        <div style={NOTE_STYLE}>
          <span style={NOTE_HEAD_STYLE}>HOME SYSTEM NOT TO SCALE</span>
          <span>Sol and Earth drawn far apart and far too large to be seen at all — the gap is exaggerated about {EXAGGERATION}×. Every star beyond is true scale.</span>
        </div>
      )}
      <div className="reticle" />
    </div>
  )
}
