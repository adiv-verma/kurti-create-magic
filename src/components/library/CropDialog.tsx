import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Crop as CropIcon, RotateCcw } from "lucide-react";

interface CropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  isSaving: boolean;
  onSave: (pixelCrop: PixelCrop) => void;
}

const ASPECT_OPTIONS = [
  { label: "Free", value: undefined },
  { label: "Portrait (3:4)", value: 3 / 4 },
  { label: "Tall (2:3)", value: 2 / 3 },
  { label: "Story (9:16)", value: 9 / 16 },
  { label: "Square (1:1)", value: 1 },
  { label: "Landscape (4:3)", value: 4 / 3 },
] as const;

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 80 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

const CropDialog = ({
  open,
  onOpenChange,
  imageUrl,
  isSaving,
  onSave,
}: CropDialogProps) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight } = e.currentTarget;
      // Default: select 80% center crop, free aspect
      if (aspect) {
        setCrop(centerAspectCrop(naturalWidth, naturalHeight, aspect));
      } else {
        setCrop(
          centerCrop(
            { unit: "%", width: 80, height: 80, x: 0, y: 0 },
            naturalWidth,
            naturalHeight
          )
        );
      }
    },
    [aspect]
  );

  const handleAspectChange = (newAspect: number | undefined) => {
    setAspect(newAspect);
    if (imgRef.current) {
      const { naturalWidth, naturalHeight } = imgRef.current;
      if (newAspect) {
        setCrop(centerAspectCrop(naturalWidth, naturalHeight, newAspect));
      } else {
        setCrop(
          centerCrop(
            { unit: "%", width: 80, height: 80, x: 0, y: 0 },
            naturalWidth,
            naturalHeight
          )
        );
      }
    }
  };

  const handleReset = () => {
    setAspect(undefined);
    if (imgRef.current) {
      const { naturalWidth, naturalHeight } = imgRef.current;
      setCrop(
        centerCrop(
          { unit: "%", width: 80, height: 80, x: 0, y: 0 },
          naturalWidth,
          naturalHeight
        )
      );
    }
  };

  const handleSave = () => {
    if (completedCrop && completedCrop.width > 0 && completedCrop.height > 0 && imgRef.current) {
      const { naturalWidth, naturalHeight, width, height } = imgRef.current;
      const scaleX = naturalWidth / width;
      const scaleY = naturalHeight / height;
      const scaledCrop: PixelCrop = {
        unit: 'px',
        x: Math.round(completedCrop.x * scaleX),
        y: Math.round(completedCrop.y * scaleY),
        width: Math.round(completedCrop.width * scaleX),
        height: Math.round(completedCrop.height * scaleY),
      };
      onSave(scaledCrop);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setCrop(undefined);
      setCompletedCrop(undefined);
      setAspect(undefined);
    }
    onOpenChange(isOpen);
  };

  if (!imageUrl) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[95vh] p-0 gap-0 bg-background border-border overflow-hidden flex flex-col">
        <DialogHeader className="p-4 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CropIcon className="w-5 h-5" />
            Crop Image
          </DialogTitle>
          <DialogDescription className="text-xs">
            Drag edges or corners to resize. Drag inside to reposition.
          </DialogDescription>
        </DialogHeader>

        {/* Aspect ratio presets */}
        <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
          {ASPECT_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => handleAspectChange(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                aspect === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>

        {/* Crop area */}
        <div className="flex-1 min-h-[50vh] overflow-auto flex items-center justify-center bg-muted p-4">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
            className="max-h-[65vh]"
          >
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Crop preview"
              onLoad={onImageLoad}
              crossOrigin="anonymous"
              className="max-h-[65vh] w-auto object-contain"
            />
          </ReactCrop>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 pt-2 border-t border-border shrink-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !completedCrop?.width || !completedCrop?.height}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <CropIcon className="w-4 h-4 mr-1" />
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
