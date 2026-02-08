import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Crop, RotateCw } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface CropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  isSaving: boolean;
  onSave: (croppedAreaPixels: Area) => void;
}

const ASPECT_OPTIONS = [
  { label: "Free", value: undefined },
  { label: "Portrait (3:4)", value: 3 / 4 },
  { label: "Tall (2:3)", value: 2 / 3 },
  { label: "Story (9:16)", value: 9 / 16 },
  { label: "Square (1:1)", value: 1 },
  { label: "Landscape (4:3)", value: 4 / 3 },
] as const;

const CropDialog = ({
  open,
  onOpenChange,
  imageUrl,
  isSaving,
  onSave,
}: CropDialogProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.8);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [minZoom, setMinZoom] = useState(0.3);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleSave = () => {
    if (croppedAreaPixels) {
      onSave(croppedAreaPixels);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setCrop({ x: 0, y: 0 });
      setZoom(0.8);
      setRotation(0);
      setAspect(undefined);
      setMinZoom(0.3);
      setCroppedAreaPixels(null);
    }
    onOpenChange(isOpen);
  };

  if (!imageUrl) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[95vh] p-0 gap-0 bg-background border-border overflow-hidden flex flex-col">
        <DialogHeader className="p-4 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Crop className="w-5 h-5" />
            Crop Image
          </DialogTitle>
          <DialogDescription className="text-xs">
            Drag to reposition. Use presets below for common aspect ratios like portrait or tall crops.
          </DialogDescription>
        </DialogHeader>

        {/* Aspect ratio presets */}
        <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
          {ASPECT_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setAspect(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                aspect === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Crop area — tall to allow portrait crops */}
        <div className="relative w-full flex-1 min-h-[50vh] bg-muted">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            minZoom={minZoom}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            onMediaLoaded={(mediaSize) => {
              // Allow zooming out enough to see the full image
              const fitZoom = Math.min(
                1,
                Math.min(
                  window.innerWidth * 0.9 / mediaSize.naturalWidth,
                  window.innerHeight * 0.5 / mediaSize.naturalHeight
                )
              );
              const calculatedMin = Math.max(0.1, fitZoom * 0.5);
              setMinZoom(calculatedMin);
              setZoom(Math.max(calculatedMin, 0.8));
            }}
            showGrid
            restrictPosition={false}
            objectFit="contain"
          />
        </div>

        {/* Controls */}
        <div className="p-4 pt-3 space-y-2 border-t border-border shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground w-14">Zoom</span>
            <Slider
              value={[zoom]}
              min={minZoom}
              max={5}
              step={0.02}
              onValueChange={([val]) => setZoom(val)}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground w-14">Rotate</span>
            <Slider
              value={[rotation]}
              min={0}
              max={360}
              step={1}
              onValueChange={([val]) => setRotation(val)}
              className="flex-1"
            />
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 shrink-0"
              onClick={() => setRotation((r) => (r + 90) % 360)}
            >
              <RotateCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 pt-2 border-t border-border shrink-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !croppedAreaPixels}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Crop className="w-4 h-4 mr-1" />
                Save Crop
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CropDialog;
