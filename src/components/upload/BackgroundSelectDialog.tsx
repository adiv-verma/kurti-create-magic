import { useState } from "react";
import { Check, ImageIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { BackgroundImage } from "@/hooks/useBackgroundImages";

interface BackgroundSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  backgrounds: BackgroundImage[];
  onConfirm: (backgroundUrl: string | null) => void;
}

const BackgroundSelectDialog = ({
  open,
  onOpenChange,
  backgrounds,
  onConfirm,
}: BackgroundSelectDialogProps) => {
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  const handleConfirm = () => {
    onConfirm(selectedUrl);
    setSelectedUrl(null);
  };

  const handleSkip = () => {
    onConfirm(null);
    setSelectedUrl(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            Choose a Background
          </DialogTitle>
          <DialogDescription>
            Select a background image for the AI-generated photo, or skip to use a clean studio background.
          </DialogDescription>
        </DialogHeader>

        {backgrounds.length === 0 ? (
          <div className="text-center py-8">
            <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              No background images uploaded yet.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload backgrounds from the Background Images tab first.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto pr-1 max-h-[50vh]">
            {backgrounds.map((bg) => (
              <button
                key={bg.id}
                type="button"
                onClick={() => setSelectedUrl(bg.image_url)}
                className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.02] ${
                  selectedUrl === bg.image_url
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <img
                  src={bg.image_url}
                  alt={bg.file_name}
                  className="w-full h-full object-cover"
                />
                {selectedUrl === bg.image_url && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-5 h-5 text-primary-foreground" />
                    </div>
                  </div>
                )}
                <span className="absolute bottom-1.5 left-1.5 right-1.5 text-[10px] bg-foreground/70 text-background px-2 py-0.5 rounded truncate">
                  {bg.file_name}
                </span>
              </button>
            ))}
          </div>
        )}

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleSkip}>
            <Sparkles className="w-4 h-4 mr-1" />
            Studio Background
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedUrl}>
            <Check className="w-4 h-4 mr-1" />
            Use Selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BackgroundSelectDialog;
