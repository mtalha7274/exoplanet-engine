export const WONDER_STANDOFF = 0.4

export function approachFlight(system, standoff = WONDER_STANDOFF) {
  const star = [system.x, system.y, system.z]
  const range = Math.hypot(...star)
  const heading = range > 0
    ? [star[0] / range, star[1] / range, star[2] / range]
    : [0, 0, 1]

  return {
    pos: [
      star[0] - heading[0] * standoff,
      star[1] - heading[1] * standoff,
      star[2] - heading[2] * standoff
    ],
    yaw: Math.atan2(-heading[0], heading[2]),
    pitch: Math.asin(Math.max(-1, Math.min(1, heading[1]))),
    speed: 0
  }
}
