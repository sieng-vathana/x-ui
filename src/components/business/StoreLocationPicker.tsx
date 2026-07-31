import { memo, useEffect, useRef, useState } from 'react'
import { Icon } from '../ui/Icon'

type Coordinates = { latitude: string; longitude: string }

type MapTilerSdk = {
  config: { apiKey: string }
  Map: new (options: Record<string, unknown>) => MapInstance
  Marker: new (options: Record<string, unknown>) => MarkerInstance
  MapStyle: { STREETS: unknown }
}

type MapPoint = { lng: number; lat: number }

type MapInstance = {
  on: (event: string, handler: (event: { lngLat: MapPoint }) => void) => void
  remove: () => void
}

type MarkerInstance = {
  addTo: (map: MapInstance) => MarkerInstance
  getLngLat: () => MapPoint
  on: (event: string, handler: () => void) => void
  setLngLat: (point: [number, number] | MapPoint) => MarkerInstance
}

declare global {
  interface Window {
    maptilersdk?: MapTilerSdk
  }
}

const SCRIPT_ID = 'maptiler-sdk'
const STYLE_ID = 'maptiler-sdk-style'
const DEFAULT_CENTER: [number, number] = [104.9282, 11.5564]
const SDK_URL = 'https://cdn.maptiler.com/maptiler-sdk-js/v3.6.1/maptiler-sdk.umd.min.js'
const SDK_STYLE_URL = 'https://cdn.maptiler.com/maptiler-sdk-js/v3.6.1/maptiler-sdk.css'

let sdkPromise: Promise<MapTilerSdk> | undefined

function loadMapTilerSdk(): Promise<MapTilerSdk> {
  if (window.maptilersdk) return Promise.resolve(window.maptilersdk)
  if (sdkPromise) return sdkPromise

  sdkPromise = new Promise((resolve, reject) => {
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('link')
      style.id = STYLE_ID
      style.rel = 'stylesheet'
      style.href = SDK_STYLE_URL
      document.head.appendChild(style)
    }

    const ready = () => window.maptilersdk ? resolve(window.maptilersdk) : reject(new Error('MapTiler did not load.'))
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', ready, { once: true })
      existing.addEventListener('error', () => reject(new Error('MapTiler could not load.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SDK_URL
    script.async = true
    script.addEventListener('load', ready, { once: true })
    script.addEventListener('error', () => reject(new Error('MapTiler could not load.')), { once: true })
    document.head.appendChild(script)
  })

  return sdkPromise
}

function isCoordinatePair(latitude: string, longitude: string) {
  return Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))
}

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
  const mapRef = useRef<MapInstance | null>(null)
  const markerRef = useRef<MarkerInstance | null>(null)
  const onChangeRef = useRef(onChange)
  const initialCoordinatesRef = useRef<Coordinates>({ latitude, longitude })
  const [coordinates, setCoordinates] = useState<Coordinates>(() => initialCoordinatesRef.current)
  const [status, setStatus] = useState('Click the map or drag the pin to set your store location.')
  const apiKey = import.meta.env.VITE_MAPTILER_KEY as string | undefined

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!apiKey || !targetRef.current) return

    let disposed = false

    void loadMapTilerSdk()
      .then((sdk) => {
        if (disposed || !targetRef.current || mapRef.current) return

        sdk.config.apiKey = apiKey
        const initialCoordinates = initialCoordinatesRef.current
        const center = isCoordinatePair(initialCoordinates.latitude, initialCoordinates.longitude)
          ? [Number(initialCoordinates.longitude), Number(initialCoordinates.latitude)] as [number, number]
          : DEFAULT_CENTER

        const map = new sdk.Map({
          container: targetRef.current,
          style: sdk.MapStyle.STREETS,
          center,
          zoom: 12,
        })
        const marker = new sdk.Marker({ draggable: true }).setLngLat(center).addTo(map)
        const selectPoint = (point: MapPoint) => {
          const nextCoordinates = {
            latitude: point.lat.toFixed(6),
            longitude: point.lng.toFixed(6),
          }
          setCoordinates(nextCoordinates)
          onChangeRef.current(nextCoordinates)
        }

        map.on('click', (event) => {
          marker.setLngLat(event.lngLat)
          selectPoint(event.lngLat)
        })
        marker.on('dragend', () => selectPoint(marker.getLngLat()))
        mapRef.current = map
        markerRef.current = marker
      })
      .catch((reason: unknown) => {
        if (!disposed) setStatus(reason instanceof Error ? reason.message : 'The map is unavailable. Enter coordinates manually.')
      })

    return () => {
      disposed = true
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [apiKey])

  const selectCoordinates = (nextCoordinates: Coordinates) => {
    setCoordinates(nextCoordinates)
    if (markerRef.current && isCoordinatePair(nextCoordinates.latitude, nextCoordinates.longitude)) {
      markerRef.current.setLngLat([Number(nextCoordinates.longitude), Number(nextCoordinates.latitude)])
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
        <p className="mt-1 mb-0 text-[13px] leading-5 text-vpos-muted">Set the exact location for your default store. It is used for receipts, delivery zones, and future reporting.</p>
      </div>

      {apiKey ? (
        <div ref={targetRef} className="h-72 overflow-hidden rounded-xl border border-vpos-line bg-vpos-subtle" />
      ) : (
        <div className="grid h-40 place-items-center rounded-xl border border-dashed border-vpos-line bg-vpos-subtle p-5 text-center text-[13px] leading-5 text-vpos-muted">
          MapTiler is not configured. Enter latitude and longitude below to continue.
        </div>
      )}

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
}, (previous, next) => previous.onChange === next.onChange)

function CoordinateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-2 block text-[12px] font-[750] text-vpos-primary-2">{label} <b className="text-vpos-red">*</b></span>
      <input required inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-lg border border-vpos-line bg-white px-3 text-[14px] text-vpos-text outline-none transition focus:border-vpos-primary focus:shadow-[0_0_0_3px_rgb(22_112_91_/_0.12)]" />
    </label>
  )
}
