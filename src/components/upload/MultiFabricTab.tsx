import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, Loader2, Layers, ShirtIcon, ImageIcon, Check, Eye, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMultiFabric, DetectedLabels, MultiFabricResult } from "@/hooks/useMultiFabric";
import { useMannequinImages } from "@/hooks/useMannequinImages";
import { useBackgroundImages } from "@/hooks/useBackgroundImages";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const MultiFabricTab = () => {
  const { toast } = useToast();
  const {
    jobs,
    detecting,
    generating,
    detectLabels,
    generateMannequins,
    fetchResultsForJob,
    deleteJob,
  } = useMultiFabric();
  const { mannequinImages } = useMannequinImages();
  const { backgroundImages } = useBackgroundImages();

  const [dragActive, setDragActive] = useState(false);

  // Wizard state
  const [step, setStep] = useState<"upload" | "review" | "select" | "results">("upload");
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [detectedLabels, setDetectedLabels] = useState<DetectedLabels | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);

  // Selection state
  const [selectedMannequinUrl, setSelectedMannequinUrl] = useState<string | null>(null);
  const [selectedBgUrl, setSelectedBgUrl] = useState<string | null>(null);
  const [colorOutputMode, setColorOutputMode] = useState<"separate" | "combined">("separate");

  // Results state
  const [results, setResults] = useState<MultiFabricResult[]>([]);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [viewingResults, setViewingResults] = useState<MultiFabricResult[]>([]);

  const handleFileUpload = async (file: File) => {
    const result = await detectLabels(file);
    if (result) {
      setCurrentJobId(result.jobId);
      setDetectedLabels(result.detectedLabels);
      setStep("review");
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length > 0) handleFileUpload(files[0]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = "";
  };

  const handleProceedToSelect = () => {
    setStep("select");
  };

  const handleGenerate = async () => {
    if (!currentJobId) return;
    const genResults = await generateMannequins(currentJobId, selectedMannequinUrl, selectedBgUrl, colorOutputMode);
    if (genResults) {
      setResults(genResults);
      setStep("results");
    }
  };

  const handleReset = () => {
    setStep("upload");
    setCurrentJobId(null);
    setDetectedLabels(null);
    setSourceImageUrl(null);
    setSelectedMannequinUrl(null);
    setSelectedBgUrl(null);
    setColorOutputMode("separate");
    setResults([]);
  };

  const handleViewResults = async (jobId: string) => {
    try {
      const r = await fetchResultsForJob(jobId);
      setViewingResults(r);
      setResultsDialogOpen(true);
    } catch {
      toast({ title: "Failed to load results", variant: "destructive" });
    }
  };

  const hasColorVariants = (detectedLabels?.color_variants?.length || 0) > 0;

  return (
    <div className="space-y-6">
      {/* Help text */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-4 border-l-4 border-l-primary"
      >
        <p className="text-sm text-foreground leading-relaxed">
          💡 Upload a single image containing labeled fabric pieces (T=Top, D=Dupatta, B=Bottom, C=Color variant). The AI will detect the labels automatically and generate mannequin images for each sample.
        </p>
      </motion.div>

      {/* Step: Upload */}
      {step === "upload" && (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
              dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
            }`}
          >
            {detecting ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-foreground font-medium">Analyzing fabric image...</p>
                <p className="text-sm text-muted-foreground">AI is detecting T/D/B/C labels in your image</p>
              </div>
            ) : (
              <>
                <Layers className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-medium mb-1">Drop your labeled fabric image here</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload one image with T, D, B, C labels. Supports JPG, PNG, WebP.
                </p>
                <label>
                  <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  <Button variant="outline" asChild>
                    <span className="cursor-pointer">Browse Files</span>
                  </Button>
                </label>
              </>
            )}
          </div>

          {/* Past jobs */}
          {jobs.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Previous Jobs</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobs.map((job) => (
                  <div key={job.id} className="glass-card rounded-xl p-4 space-y-2">
                    <img src={job.source_image_url} alt="Source" className="w-full aspect-square object-cover rounded-lg" />
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        job.status === "completed" ? "bg-green-500/20 text-green-400" :
                        job.status === "failed" ? "bg-red-500/20 text-red-400" :
                        "bg-yellow-500/20 text-yellow-400"
                      }`}>
                        {job.status}
                      </span>
                      <div className="flex gap-1">
                        {job.status === "completed" && (
                          <Button size="sm" variant="ghost" onClick={() => handleViewResults(job.id)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => deleteJob(job.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Step: Review detected labels */}
      {step === "review" && detectedLabels && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Detected Fabric Pieces</h3>
          <p className="text-sm text-muted-foreground">{detectedLabels.summary}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {detectedLabels.pieces.map((piece, idx) => (
              <div key={idx} className="glass-card rounded-xl p-4 flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shrink-0 ${
                  piece.label === "T" ? "bg-blue-500/20 text-blue-400" :
                  piece.label === "D" ? "bg-purple-500/20 text-purple-400" :
                  piece.label === "B" ? "bg-green-500/20 text-green-400" :
                  "bg-orange-500/20 text-orange-400"
                }`}>
                  {piece.label}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {piece.label === "T" ? "Top" : piece.label === "D" ? "Dupatta" : piece.label === "B" ? "Bottom" : "Color Variant"}
                  </p>
                  <p className="text-xs text-muted-foreground">{piece.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="glass-card rounded-xl p-4 space-y-2">
            <p className="text-sm"><strong>Samples to generate:</strong> {detectedLabels.sample_count}</p>
            <p className="text-sm"><strong>Has bottom fabric:</strong> {detectedLabels.has_bottom ? "Yes" : "No (plain bottom)"}</p>
            {hasColorVariants && (
              <p className="text-sm"><strong>Color variants:</strong> {detectedLabels.color_variants.join(", ")}</p>
            )}
          </div>

          {/* Color output mode (only if there are color variants) */}
          {hasColorVariants && (
            <div className="glass-card rounded-xl p-4 space-y-3">
              <Label className="text-sm font-medium">Color variant output</Label>
              <RadioGroup value={colorOutputMode} onValueChange={(v) => setColorOutputMode(v as "separate" | "combined")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="separate" id="separate" />
                  <Label htmlFor="separate" className="text-sm">Separate images (one mannequin per variant)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="combined" id="combined" />
                  <Label htmlFor="combined" className="text-sm">Combined image (all mannequins side by side)</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>Cancel</Button>
            <Button onClick={handleProceedToSelect}>Next: Select Mannequin & Background →</Button>
          </div>
        </motion.div>
      )}

      {/* Step: Select mannequin & background */}
      {step === "select" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Mannequin selection */}
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
              <ShirtIcon className="w-5 h-5 text-primary" />
              Choose a Mannequin
            </h3>
            {mannequinImages.length === 0 ? (
              <div className="text-center py-6 glass-card rounded-xl">
                <ShirtIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No mannequin images. Upload from Mannequin Library tab.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {mannequinImages.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMannequinUrl(m.image_url)}
                    className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.02] ${
                      selectedMannequinUrl === m.image_url
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <img src={m.image_url} alt={m.file_name} className="w-full h-full object-cover" />
                    {selectedMannequinUrl === m.image_url && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-5 h-5 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Background selection */}
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
              <ImageIcon className="w-5 h-5 text-primary" />
              Choose a Background
            </h3>
            {backgroundImages.length === 0 ? (
              <div className="text-center py-6 glass-card rounded-xl">
                <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No backgrounds. Upload from Backgrounds tab.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {backgroundImages.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setSelectedBgUrl(bg.image_url)}
                    className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.02] ${
                      selectedBgUrl === bg.image_url
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <img src={bg.image_url} alt={bg.file_name} className="w-full h-full object-cover" />
                    {selectedBgUrl === bg.image_url && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-5 h-5 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep("review")}>← Back</Button>
            <Button variant="outline" onClick={() => { setSelectedBgUrl(null); handleGenerate(); }}>
              <Sparkles className="w-4 h-4 mr-1" />
              Studio Background
            </Button>
            <Button onClick={handleGenerate} disabled={generating || !selectedMannequinUrl}>
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Generate Mannequin Images
                </>
              )}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Step: Results */}
      {step === "results" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Generated Mannequin Images</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((r) => (
              <div key={r.id} className="glass-card rounded-xl overflow-hidden">
                {r.generated_image_url ? (
                  <img src={r.generated_image_url} alt={r.label} className="w-full aspect-[3/4] object-cover" />
                ) : (
                  <div className="w-full aspect-[3/4] bg-muted flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">{r.status === "failed" ? "Failed" : "Generating..."}</p>
                  </div>
                )}
                <div className="p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground capitalize">{r.label.replace("_", " ")}</span>
                    {r.color_variant && <span className="text-xs text-muted-foreground">({r.color_variant})</span>}
                  </div>
                  {r.caption_english && <p className="text-xs text-muted-foreground line-clamp-2">{r.caption_english}</p>}
                </div>
              </div>
            ))}
          </div>
          <Button onClick={handleReset}>← Start New</Button>
        </motion.div>
      )}

      {/* Results dialog for past jobs */}
      <Dialog open={resultsDialogOpen} onOpenChange={setResultsDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Generated Results</DialogTitle>
            <DialogDescription>Mannequin images from this job</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto pr-1 max-h-[60vh]">
            {viewingResults.map((r) => (
              <div key={r.id} className="glass-card rounded-xl overflow-hidden">
                {r.generated_image_url ? (
                  <img src={r.generated_image_url} alt={r.label} className="w-full aspect-[3/4] object-cover" />
                ) : (
                  <div className="w-full aspect-[3/4] bg-muted flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">{r.status}</p>
                  </div>
                )}
                <div className="p-3 space-y-1">
                  <span className="text-xs font-medium capitalize">{r.label.replace("_", " ")}</span>
                  {r.caption_english && <p className="text-xs text-muted-foreground line-clamp-2">{r.caption_english}</p>}
                  {r.caption_hindi && <p className="text-xs text-muted-foreground line-clamp-2">{r.caption_hindi}</p>}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResultsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MultiFabricTab;
