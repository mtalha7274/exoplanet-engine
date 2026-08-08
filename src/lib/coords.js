const DEG = Math.PI / 180

export function compressDistance(dist, threshold = 500) {
  if (dist <= threshold) return dist
  return threshold * (1 + Math.log(dist / threshold))
}

export function raDecToXYZ(ra, dec, dist) {
  const r = ra * DEG
  const d = dec * DEG
  return {
    x: dist * Math.cos(d) * Math.cos(r),
    y: dist * Math.sin(d),
    z: dist * Math.cos(d) * Math.sin(r)
  }
}

export function compressionScale(dist, threshold = 500) {
  if (dist <= 0) return 1
  return compressDistance(dist, threshold) / dist
}

export function toPosition(ra, dec, dist, threshold = 500) {
  return raDecToXYZ(ra, dec, compressDistance(dist, threshold))
}
