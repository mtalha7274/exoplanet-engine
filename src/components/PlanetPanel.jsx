import { useEffect, useRef, useState } from 'react'
import { discPixels } from '../lib/disc.js'
import { classInfo } from '../lib/classify.js'
import { planetStats } from '../lib/format.js'

const DISC = 220

export default function PlanetPanel({ planet, survey, onClose }) {
  const canvasRef = useRef(null)
  const [report, setReport] = useState('')
  const [typed, setTyped] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const image = ctx.createImageData(DISC, DISC)
    image.data.set(discPixels(planet, DISC))
    ctx.clearRect(0, 0, DISC, DISC)
    ctx.putImageData(image, 0, 0)
  }, [planet])

  useEffect(() => {
    let cancelled = false
    setReport('')
    setTyped(0)
    survey.getReport(planet).then(text => {
      if (!cancelled) setReport(text)
    })
    return () => { cancelled = true }
  }, [planet, survey])

  useEffect(() => {
    if (!report) return
    const id = setInterval(() => {
      setTyped(n => {
        if (n >= report.length) {
          clearInterval(id)
          return n
        }
        return n + 4
      })
    }, 12)
    return () => clearInterval(id)
  }, [report])

  const info = classInfo(planet.cls)
  const done = report.length > 0 && typed >= report.length

  return (
    <aside className="panel">
      <button className="panel-close" onClick={onClose} aria-label="Close survey">×</button>

      <div className="panel-hero">
        <canvas ref={canvasRef} width={DISC} height={DISC} className="planet-disc" />
        <div>
          <h2>{planet.name}</h2>
          <p className="panel-class" style={{ color: info.palette[info.palette.length - 2] }}>
            {info.label.toUpperCase()}
          </p>
          <p className="panel-host">HOST · {planet.host}</p>
        </div>
      </div>

      <dl className="stat-grid">
        {planetStats(planet).map(stat => (
          <div key={stat.label} className="stat">
            <dt>{stat.label}</dt>
            <dd>{stat.value}</dd>
          </div>
        ))}
      </dl>

      <div className="report">
        <div className="report-head">
          <span>SURVEY REPORT</span>
          <span className={done ? 'status done' : 'status'}>{done ? 'COMPLETE' : 'SURVEYING…'}</span>
        </div>
        <pre>{report.slice(0, typed)}{!done && <span className="caret">▊</span>}</pre>
      </div>
    </aside>
  )
}
