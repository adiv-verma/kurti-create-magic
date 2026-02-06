import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface ImageLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  label?: string;
}

const ImageLightbox = ({ open, onOpenChange, imageUrl, label }: ImageLightboxProps) => {
  if (!imageUrl) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[90vw] p-2 bg-background/95 backdrop-blur-sm border-border">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-foreground/70 text-background hover:bg-foreground/90 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        {label && (
          <p className="text-sm font-medium text-muted-foreground px-2 pt-1">{label}</p>
        )}
        <img
          src={imageUrl}
          alt={label || "Preview"}
          className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
        />
      </DialogContent>
    </Dialog>
  );
};

export default ImageLightbox;
