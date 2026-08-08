import { fmtSpeed, speedInC } from '../lib/flight.js'
import { fmtDistance } from '../lib/format.js'
import { classifyStar } from '../lib/starClass.js'

export default function FlightHUD({ telemetry, onInspect, onEnterSystem }) {
  const { speed, boost, distance, nearest, nearestDistance, arrived } = telemetry
  const c = speedInC(speed)

  return (
    <div className="flight-hud">
      <div className="gauge">
        <dt>VELOCITY</dt>
        <dd className={boost ? 'boosting' : ''}>{fmtSpeed(speed)}</dd>
        <small>{speed > 0 ? `${Math.round(c).toLocaleString('en-US')} × c` : 'engines idle'}</small>
      </div>

      <div className="gauge">
        <dt>FROM EARTH</dt>
        <dd>{fmtDistance(distance)}</dd>
        <small>heliocentric origin</small>
      </div>

      {nearest && (
        <div className="gauge">
          <dt>NEAREST STAR</dt>
          <dd>{nearest.host}</dd>
          <small>
            {nearestDistance.toFixed(2)} pc · {classifyStar(nearest).label}
          </small>
        </div>
      )}

      {arrived && (
        <div className="arrival">
          <div>
            <span className="arrival-tag">ARRIVED</span>
            <strong>{arrived.host}</strong>
          </div>
          <div className="arrival-actions">
            <button onClick={() => onInspect(arrived)}>STAR RECORD</button>
            {arrived.planets.length > 0 && (
              <button className="primary" onClick={() => onEnterSystem(arrived)}>
                ENTER SYSTEM
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
