import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { Button } from './Button'
import { Modal } from './Modal'

interface CropModalProps {
  open: boolean
  imageUrl: string
  onClose: () => void
  onCrop: (croppedBlob: Blob) => void
}

function createCroppedImage(imageUrl: string, pixelCrop: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas not supported')); return }

      canvas.width = pixelCrop.width
      canvas.height = pixelCrop.height
      ctx.drawImage(
        image,
        pixelCrop.x, pixelCrop.y,
        pixelCrop.width, pixelCrop.height,
        0, 0,
        pixelCrop.width, pixelCrop.height,
      )
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to create blob'))
      }, 'image/jpeg', 0.92)
    }
    image.onerror = () => reject(new Error('Failed to load image'))
    image.src = imageUrl
  })
}

export function CropModal({ open, imageUrl, onClose, onCrop }: CropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [cropping, setCropping] = useState(false)

  const onCropComplete = useCallback(
    (_: Area, croppedPixels: Area) => { setCroppedAreaPixels(croppedPixels) },
    [],
  )

  const handleApply = useCallback(async () => {
    if (!croppedAreaPixels) return
    setCropping(true)
    try {
      const blob = await createCroppedImage(imageUrl, croppedAreaPixels)
      onCrop(blob)
      onClose()
    } catch {
      /* skip */
    } finally {
      setCropping(false)
    }
  }, [croppedAreaPixels, imageUrl, onCrop, onClose])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Crop image"
      description="Drag to reposition. Use the slider to zoom."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleApply} disabled={cropping}>
            {cropping ? 'Cropping…' : 'Crop & Save'}
          </Button>
        </>
      }
    >
      <div className="relative h-[380px] overflow-hidden rounded-xl bg-vpos-subtle">
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="rect"
          showGrid={false}
          onCropChange={setCrop}
          onCropComplete={onCropComplete}
          onZoomChange={setZoom}
        />
      </div>
      <div className="mt-4 flex items-center gap-3 px-1">
        <span className="text-[12px] font-bold text-vpos-muted">Zoom</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="h-1.5 flex-1 appearance-none rounded-full bg-vpos-line accent-vpos-primary"
        />
        <button
          type="button"
          onClick={() => { setCrop({ x: 0, y: 0 }); setZoom(1) }}
          className="rounded-lg border border-vpos-line bg-white px-2.5 py-1 text-[11px] font-bold text-vpos-muted hover:text-vpos-text"
        >
          Reset
        </button>
      </div>
    </Modal>
  )
}
