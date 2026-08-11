import { memo, useEffect, useRef, useState } from 'react'
import L, { type Map as LeafletMap, type Marker as LeafletMarker } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Icon } from '../ui/Icon'

type Coordinates = { latitude: string; longitude: string }
type MapPoint = { lat: number; lng: number }

const DEFAULT_CENTER: [number, number] = [11.5564, 104.9282]
const STORE_MARKER = L.divIcon({
  className: 'vpos-store-map-marker',
  html: '<span style="display:block;width:20px;height:20px;border:3px solid #fff;border-radius:9999px;background:#16705b;box-shadow:0 2px 6px rgba(0,0,0,.35)"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

function isCoordinatePair(latitude: string, longitude: string) {
  if (!latitude.trim() || !longitude.trim()) return false
  const lat = Number(latitude)
  const lng = Number(longitude)
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= -90 && lat <= 90
    && lng >= -180 && lng <= 180
}

/**
 * A bundled Leaflet picker backed by OpenStreetMap. No MapTiler SDK, key, or
 * style endpoint is required, so the map remains available in every store form.
 */
export const StoreLocationPicker = memo(function StoreLocationPicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude: string
  longitude: string
  onChange: (value: Coordinates) => void
}) {
  const targetRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRef = useRef<LeafletMarker | null>(null)
  const onChangeRef = useRef(onChange)
  const initialCoordinatesRef = useRef<Coordinates>({ latitude, longitude })
  const [coordinates, setCoordinates] = useState<Coordinates>(() => initialCoordinatesRef.current)
  const [status, setStatus] = useState('Click the map or drag the pin to set your store location.')

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    const nextCoordinates = { latitude, longitude }
    setCoordinates((current) => current.latitude === latitude && current.longitude === longitude
      ? current
      : nextCoordinates)
    if (markerRef.current && isCoordinatePair(latitude, longitude)) {
      const point: [number, number] = [Number(latitude), Number(longitude)]
      markerRef.current.setLatLng(point)
      mapRef.current?.panTo(point)
    }
  }, [latitude, longitude])

  useEffect(() => {
    if (!targetRef.current || mapRef.current) return

    const initialCoordinates = initialCoordinatesRef.current
    const center: [number, number] = isCoordinatePair(initialCoordinates.latitude, initialCoordinates.longitude)
      ? [Number(initialCoordinates.latitude), Number(initialCoordinates.longitude)]
      : DEFAULT_CENTER
    const map = L.map(targetRef.current, { scrollWheelZoom: true }).setView(center, 12)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    const marker = L.marker(center, { draggable: true, icon: STORE_MARKER }).addTo(map)
    const selectPoint = (point: MapPoint) => {
      const nextCoordinates = {
        latitude: point.lat.toFixed(6),
        longitude: point.lng.toFixed(6),
      }
      setCoordinates(nextCoordinates)
      onChangeRef.current(nextCoordinates)
    }

    map.on('click', (event: L.LeafletMouseEvent) => {
      marker.setLatLng(event.latlng)
      selectPoint(event.latlng)
    })
    marker.on('dragend', () => selectPoint(marker.getLatLng()))
    mapRef.current = map
    markerRef.current = marker

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  const selectCoordinates = (nextCoordinates: Coordinates) => {
    setCoordinates(nextCoordinates)
    if (markerRef.current && isCoordinatePair(nextCoordinates.latitude, nextCoordinates.longitude)) {
      const point: [number, number] = [Number(nextCoordinates.latitude), Number(nextCoordinates.longitude)]
      markerRef.current.setLatLng(point)
      mapRef.current?.panTo(point)
    }
    onChangeRef.current(nextCoordinates)
  }

  const useCurrentLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      (position) => {
        selectCoordinates({
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        })
        setStatus('Current device location selected. Drag the pin to refine it.')
      },
      () => setStatus('Location permission was unavailable. Choose a point on the map instead.'),
    )
  }

  return (
    <section aria-labelledby="store-location-heading" className="space-y-4">
      <div>
        <p id="store-location-heading" className="m-0 text-[12px] font-extrabold tracking-[.12em] text-vpos-primary">STORE LOCATION</p>
        <p className="mt-1 mb-0 text-[13px] leading-5 text-vpos-muted">Click the map, drag the pin, or use your device location.</p>
      </div>

      <div ref={targetRef} aria-label="Store location map" className="h-72 overflow-hidden rounded-xl border border-vpos-line bg-vpos-subtle" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={useCurrentLocation} className="inline-flex h-9 items-center gap-2 rounded-lg border border-vpos-line bg-white px-3 text-[12px] font-bold text-vpos-primary transition-colors hover:border-vpos-primary/40 hover:bg-vpos-sand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vpos-primary">
          <Icon name="crosshair-2-line" />
          Use my location
        </button>
        <p aria-live="polite" className="m-0 text-[12px] text-vpos-muted">{status}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <CoordinateField label="Latitude" value={coordinates.latitude} onChange={(value) => selectCoordinates({ latitude: value, longitude: coordinates.longitude })} />
        <CoordinateField label="Longitude" value={coordinates.longitude} onChange={(value) => selectCoordinates({ latitude: coordinates.latitude, longitude: value })} />
      </div>
    </section>
  )
}, (previous, next) => previous.onChange === next.onChange
  && previous.latitude === next.latitude
  && previous.longitude === next.longitude)

function CoordinateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-2 block text-[12px] font-[750] text-vpos-primary-2">{label} <b className="text-vpos-red">*</b></span>
      <input required inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-lg border border-vpos-line bg-white px-3 text-[14px] text-vpos-text outline-none transition focus:border-vpos-primary focus:shadow-[0_0_0_3px_rgb(22_112_91_/_0.12)]" />
    </label>
  )
}
