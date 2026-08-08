import * as THREE from 'three'

const SHIP_SCALE = 0.85
const HULL = 0x2a3a52
const PLATE = 0x4a6183
const GLASS = 0x9fd8f5
const FLAME = 0x7dd3fc

function engineSprite() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(220,245,255,1)')
  g.addColorStop(0.3, 'rgba(125,211,252,0.7)')
  g.addColorStop(1, 'rgba(125,211,252,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(canvas)
}

export function buildShip() {
  const ship = new THREE.Group()
  ship.scale.setScalar(SHIP_SCALE)
  const disposables = []

  function add(geo, mat, place) {
    const mesh = new THREE.Mesh(geo, mat)
    place(mesh)
    ship.add(mesh)
    disposables.push(geo, mat)
    return mesh
  }

  const hullMat = new THREE.MeshStandardMaterial({ color: HULL, roughness: 0.55, metalness: 0.5 })
  const plateMat = new THREE.MeshStandardMaterial({ color: PLATE, roughness: 0.4, metalness: 0.65 })

  const nose = new THREE.ConeGeometry(0.075, 0.34, 14)
  add(nose, hullMat, m => {
    m.rotation.x = Math.PI / 2
    m.position.z = 0.22
  })

  const body = new THREE.CylinderGeometry(0.075, 0.055, 0.32, 14)
  add(body, hullMat, m => {
    m.rotation.x = Math.PI / 2
    m.position.z = -0.1
  })

  const canopy = new THREE.SphereGeometry(0.045, 14, 12, 0, Math.PI * 2, 0, Math.PI / 2)
  add(canopy, new THREE.MeshStandardMaterial({
    color: GLASS, roughness: 0.15, metalness: 0.2, emissive: 0x1b3b52, emissiveIntensity: 0.6
  }), m => {
    m.rotation.x = -Math.PI / 12
    m.position.set(0, 0.045, 0.12)
  })

  const wing = new THREE.BoxGeometry(0.34, 0.012, 0.16)
  for (const side of [-1, 1]) {
    add(wing.clone(), plateMat, m => {
      m.position.set(side * 0.2, -0.01, -0.09)
      m.rotation.z = side * 0.22
      m.rotation.y = side * -0.18
    })
  }
  disposables.push(wing)

  const fin = new THREE.BoxGeometry(0.012, 0.14, 0.13)
  add(fin, plateMat, m => m.position.set(0, 0.08, -0.19))

  const nacelle = new THREE.CylinderGeometry(0.028, 0.034, 0.2, 10)
  for (const side of [-1, 1]) {
    add(nacelle.clone(), plateMat, m => {
      m.rotation.x = Math.PI / 2
      m.position.set(side * 0.16, -0.012, -0.14)
    })
  }
  disposables.push(nacelle)

  const glowTex = engineSprite()
  const glows = []
  for (const offset of [[0, 0, -0.28], [-0.16, -0.012, -0.25], [0.16, -0.012, -0.25]]) {
    const mat = new THREE.SpriteMaterial({
      map: glowTex, color: FLAME, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
    })
    const sprite = new THREE.Sprite(mat)
    sprite.position.set(...offset)
    sprite.scale.setScalar(0.16)
    ship.add(sprite)
    glows.push(sprite)
    disposables.push(mat)
  }

  ship.userData.setThrust = t => {
    const scale = 0.055 + t * 0.2
    for (const g of glows) {
      g.scale.setScalar(scale)
      g.material.opacity = 0.4 + t * 0.55
    }
  }

  ship.userData.dispose = () => {
    for (const d of disposables) d.dispose()
    glowTex.dispose()
  }

  return ship
}
