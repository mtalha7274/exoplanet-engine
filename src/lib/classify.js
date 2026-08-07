export const CLASSES = {
  'temperate-rocky': { label: 'Temperate Rocky', palette: ['#1d4e3f', '#2e6f4e', '#3f8fbf', '#c9d8c5', '#e8f1ee'] },
  'lava': { label: 'Lava World', palette: ['#1a0d0b', '#4a1608', '#8f2500', '#ff4d00', '#ffb347'] },
  'frozen-rocky': { label: 'Frozen Rocky', palette: ['#8fb3d9', '#b3c7e6', '#dfe9f3', '#f5faff'] },
  'hot-rocky': { label: 'Scorched Rocky', palette: ['#4a3423', '#6b4a32', '#a3703f', '#d9a066', '#f2d0a0'] },
  'sub-neptune': { label: 'Sub-Neptune', palette: ['#16324f', '#2a5d8f', '#4a90c2', '#9fc5e8'] },
  'neptunian': { label: 'Neptune-like', palette: ['#123c5c', '#1f6f8b', '#2fa4a9', '#7fd1d1'] },
  'gas-giant': { label: 'Gas Giant', palette: ['#8c6d4f', '#c2a377', '#e0c9a6', '#a67c52', '#d6b088'] },
  'unsurveyed': { label: 'Unsurveyed', palette: ['#3a3f4a', '#565d6b', '#767e8f', '#9aa2b1'] }
}

export function classifyPlanet({ rade, eqt }) {
  if (rade == null) return 'unsurveyed'
  if (rade < 1.6) {
    if (eqt == null) return 'unsurveyed'
    if (eqt > 1000) return 'lava'
    if (eqt < 180) return 'frozen-rocky'
    if (eqt <= 310) return 'temperate-rocky'
    return 'hot-rocky'
  }
  if (rade < 4) return 'sub-neptune'
  if (rade <= 10) return 'neptunian'
  return 'gas-giant'
}

export function classInfo(key) {
  return CLASSES[key] ?? CLASSES.unsurveyed
}
