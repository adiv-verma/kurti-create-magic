import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
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

const PROMPT_SUGGESTIONS = [
  "Change the model pose to reading a book",
  "Use an outdoor garden background",
  "Show a close-up of the fabric texture",
  "Make the model wear a dupatta with the kurti",
  "Change to a festive / wedding setting",
  "Show the model in a casual everyday look",
];

interface RegenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isRegenerating: boolean;
  onConfirm: (customPrompt: string) => void;
}

const RegenerateDialog = ({
  open,
  onOpenChange,
  isRegenerating,
  onConfirm,
}: RegenerateDialogProps) => {
  const [customPrompt, setCustomPrompt] = useState("");

  const handleConfirm = () => {
    onConfirm(customPrompt.trim());
    setCustomPrompt("");
  };

  const handleSuggestionClick = (suggestion: string) => {
    setCustomPrompt((prev) =>
      prev ? `${prev}. ${suggestion}` : suggestion
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Customize Regeneration</DialogTitle>
          <DialogDescription>
            Describe how you'd like the AI to regenerate this content. Leave
            empty for the default style.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            placeholder="e.g. Show the model in a park setting, reading a book, with warm sunlight..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={4}
            className="resize-none"
          />

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
