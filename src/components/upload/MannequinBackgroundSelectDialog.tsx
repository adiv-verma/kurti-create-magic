import { useState } from "react";
import { Check, ImageIcon, ShirtIcon, Sparkles } from "lucide-react";
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
import type { MannequinImage } from "@/hooks/useMannequinImages";

interface MannequinBackgroundSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mannequins: MannequinImage[];
  backgrounds: BackgroundImage[];
  onConfirm: (mannequinUrl: string | null, backgroundUrl: string | null) => void;
}

const MannequinBackgroundSelectDialog = ({
  open,
  onOpenChange,
  mannequins,
  backgrounds,
  onConfirm,
}: MannequinBackgroundSelectDialogProps) => {
  const [step, setStep] = useState<"mannequin" | "background">("mannequin");
  const [selectedMannequinUrl, setSelectedMannequinUrl] = useState<string | null>(null);
  const [selectedBgUrl, setSelectedBgUrl] = useState<string | null>(null);

  const handleReset = () => {
    setStep("mannequin");
    setSelectedMannequinUrl(null);
    setSelectedBgUrl(null);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) handleReset();
    onOpenChange(isOpen);
  };

  const handleNextStep = () => {
    setStep("background");
  };

  const handleConfirm = () => {
    onConfirm(selectedMannequinUrl, selectedBgUrl);
    handleReset();
  };

  const handleSkipBackground = () => {
    onConfirm(selectedMannequinUrl, null);
    handleReset();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {step === "mannequin" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShirtIcon className="w-5 h-5 text-primary" />
                Step 1: Choose a Mannequin
              </DialogTitle>
              <DialogDescription>
                Select a mannequin/dress form to display the garment on. Upload mannequin images from the Mannequin Library tab first.
              </DialogDescription>
            </DialogHeader>

            {mannequins.length === 0 ? (
              <div className="text-center py-8">
                <ShirtIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  No mannequin images uploaded yet.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload mannequin reference images from the Mannequin Library tab first.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto pr-1 max-h-[50vh]">
                {mannequins.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMannequinUrl(m.image_url)}
                    className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.02] ${
                      selectedMannequinUrl === m.image_url
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <img
                      src={m.image_url}
                      alt={m.file_name}
                      className="w-full h-full object-cover"
                    />
                    {selectedMannequinUrl === m.image_url && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-5 h-5 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                    <span className="absolute bottom-1.5 left-1.5 right-1.5 text-[10px] bg-foreground/70 text-background px-2 py-0.5 rounded truncate">
                      {m.file_name}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <DialogFooter className="flex-row gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleNextStep} disabled={!selectedMannequinUrl}>
                Next: Choose Background →
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-primary" />
                Step 2: Choose a Background
              </DialogTitle>
              <DialogDescription>
                Select a background for the mannequin photo, or use a clean studio background.
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
                    onClick={() => setSelectedBgUrl(bg.image_url)}
                    className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.02] ${
                      selectedBgUrl === bg.image_url
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <img
                      src={bg.image_url}
                      alt={bg.file_name}
                      className="w-full h-full object-cover"
                    />
                    {selectedBgUrl === bg.image_url && (
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
              <Button variant="ghost" onClick={() => setStep("mannequin")}>
                ← Back
              </Button>
              <Button variant="outline" onClick={handleSkipBackground}>
                <Sparkles className="w-4 h-4 mr-1" />
                Studio Background
              </Button>
              <Button onClick={handleConfirm} disabled={!selectedBgUrl}>
                <Check className="w-4 h-4 mr-1" />
                Use Selected
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MannequinBackgroundSelectDialog;
