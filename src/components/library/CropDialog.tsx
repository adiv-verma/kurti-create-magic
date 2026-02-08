import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

const CropDialog = ({
  open,
  onOpenChange,
  imageUrl,
  isSaving,
  onSave,
}: CropDialogProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
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
      setZoom(1);
      setRotation(0);
      setCroppedAreaPixels(null);
    }
    onOpenChange(isOpen);
  };

  if (!imageUrl) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] p-0 gap-0 bg-background border-border">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Crop className="w-5 h-5" />
            Crop Image
          </DialogTitle>
        </DialogHeader>

        {/* Crop area */}
        <div className="relative w-full h-[60vh] bg-muted">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            showGrid
          />
        </div>

        {/* Controls */}
        <div className="p-4 space-y-3 border-t border-border">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground w-14">Zoom</span>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
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
              className="h-8 w-8"
              onClick={() => setRotation((r) => (r + 90) % 360)}
            >
              <RotateCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <DialogFooter className="p-4 pt-2 border-t border-border">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CropDialog;
