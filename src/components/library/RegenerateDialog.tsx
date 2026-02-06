import { useState } from "react";
import { RefreshCw, Loader2, Check, ImageIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { BackgroundImage } from "@/hooks/useBackgroundImages";

const PROMPT_SUGGESTIONS = [
  "Change the model pose to reading a book",
  "Show a close-up of the fabric texture",
  "Make the model wear a dupatta with the kurti",
  "Change to a festive / wedding setting",
  "Show the model in a casual everyday look",
];

interface RegenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isRegenerating: boolean;
  backgrounds: BackgroundImage[];
  onConfirm: (customPrompt: string, backgroundUrl: string | null) => void;
}

const RegenerateDialog = ({
  open,
  onOpenChange,
  isRegenerating,
  backgrounds,
  onConfirm,
}: RegenerateDialogProps) => {
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedBgUrl, setSelectedBgUrl] = useState<string | null>(null);
  const [useStudio, setUseStudio] = useState(false);

  const handleConfirm = () => {
    const bgUrl = useStudio ? null : selectedBgUrl;
    onConfirm(customPrompt.trim(), bgUrl);
    setCustomPrompt("");
    setSelectedBgUrl(null);
    setUseStudio(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setCustomPrompt((prev) =>
      prev ? `${prev}. ${suggestion}` : suggestion
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Customize Regeneration</DialogTitle>
          <DialogDescription>
            Choose a background and describe how you'd like the AI to regenerate this content.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-1">
          {/* Background selection */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-primary" />
              Background Image
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[160px] overflow-y-auto">
              {/* Studio option */}
              <button
                type="button"
                onClick={() => {
                  setUseStudio(true);
                  setSelectedBgUrl(null);
                }}
                className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all flex items-center justify-center bg-muted ${
                  useStudio
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <Sparkles className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground font-medium">Studio</span>
                </div>
                {useStudio && (
                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </button>

              {backgrounds.map((bg) => (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => {
                    setSelectedBgUrl(bg.image_url);
                    setUseStudio(false);
                  }}
                  className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all hover:scale-[1.02] ${
                    selectedBgUrl === bg.image_url && !useStudio
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <img
                    src={bg.image_url}
                    alt={bg.file_name}
                    className="w-full h-full object-cover"
                  />
                  {selectedBgUrl === bg.image_url && !useStudio && (
                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {backgrounds.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                No backgrounds uploaded. Upload from the Background Images tab.
              </p>
            )}
          </div>

          {/* Custom prompt */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">
              Custom Instructions (optional)
            </p>
            <Textarea
              placeholder="e.g. Show the model in a park setting, reading a book, with warm sunlight..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Quick suggestions */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Quick suggestions
            </p>
            <div className="flex flex-wrap gap-2">
              {PROMPT_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSuggestionClick(s)}
                  className="text-xs px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRegenerating}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isRegenerating}>
            {isRegenerating ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1" />
            )}
            Regenerate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RegenerateDialog;
