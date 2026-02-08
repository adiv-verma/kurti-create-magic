import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  Download,
  CheckCircle,
  Volume2,
  VolumeX,
  Music,
  Mic,
  Loader2,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import type { ReelData } from "@/hooks/useReelGeneration";

interface ReelPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reel: ReelData | null;
  onApprove: () => void;
}

const ReelPreviewDialog = ({
  open,
  onOpenChange,
  reel,
  onApprove,
}: ReelPreviewDialogProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.3);
  const [voiceVolume, setVoiceVolume] = useState(1.0);
  const [musicMuted, setMusicMuted] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const voiceRef = useRef<HTMLAudioElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);

  // Initialize audio elements
  useEffect(() => {
    if (!reel) return;

    const voice = new Audio(reel.voiceoverUrl);
    const music = new Audio(reel.musicUrl);

    voice.volume = voiceVolume;
    music.volume = musicVolume;
    music.loop = true;

    voice.addEventListener("loadedmetadata", () => {
      setDuration(Math.max(voice.duration, 15));
    });

    voice.addEventListener("ended", () => {
      setIsPlaying(false);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    });

    voiceRef.current = voice;
    musicRef.current = music;

    return () => {
      voice.pause();
      music.pause();
      voice.src = "";
      music.src = "";
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [reel]);

  // Update volumes
  useEffect(() => {
    if (voiceRef.current) voiceRef.current.volume = voiceMuted ? 0 : voiceVolume;
  }, [voiceVolume, voiceMuted]);

  useEffect(() => {
    if (musicRef.current) musicRef.current.volume = musicMuted ? 0 : musicVolume;
  }, [musicVolume, musicMuted]);

  const updateTime = useCallback(() => {
    if (voiceRef.current) {
      setCurrentTime(voiceRef.current.currentTime);
    }
    animationRef.current = requestAnimationFrame(updateTime);
  }, []);

  const togglePlay = () => {
    if (!voiceRef.current || !musicRef.current) return;

    if (isPlaying) {
      voiceRef.current.pause();
      musicRef.current.pause();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    } else {
      voiceRef.current.play();
      musicRef.current.play();
      animationRef.current = requestAnimationFrame(updateTime);
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const time = value[0];
    if (voiceRef.current) {
      voiceRef.current.currentTime = time;
    }
    if (musicRef.current) {
      musicRef.current.currentTime = time;
    }
    setCurrentTime(time);
  };

  const handleDownloadAssets = async () => {
    if (!reel) return;
    setIsDownloading(true);

    try {
      // Download each asset individually
      const downloads = [
        { url: reel.modelImageUrl, name: "reel-image.png" },
        { url: reel.voiceoverUrl, name: "voiceover.mp3" },
        { url: reel.musicUrl, name: "background-music.mp3" },
      ];

      for (const { url, name } of downloads) {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = name;
        a.click();
        URL.revokeObjectURL(blobUrl);
        // Small delay between downloads
        await new Promise((r) => setTimeout(r, 500));
      }

      // Also create a caption text file
      const captionText = `Instagram Caption:\n\n${reel.captionEnglish}\n\n---\n\nHindi Voiceover Script:\n${reel.captionHindi}`;
      const captionBlob = new Blob([captionText], { type: "text/plain" });
      const captionUrl = URL.createObjectURL(captionBlob);
      const a = document.createElement("a");
      a.href = captionUrl;
      a.download = "reel-captions.txt";
      a.click();
      URL.revokeObjectURL(captionUrl);
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      // Stop playback on close
      voiceRef.current?.pause();
      musicRef.current?.pause();
      setIsPlaying(false);
      setCurrentTime(0);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
    onOpenChange(isOpen);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!reel) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[95vh] p-0 gap-0 bg-background border-border overflow-hidden flex flex-col">
        <DialogHeader className="p-4 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            Reel Preview
          </DialogTitle>
          <DialogDescription className="text-xs">
            Preview your reel with voiceover and music. Download assets to post on Instagram.
          </DialogDescription>
        </DialogHeader>

        {/* Video Preview Area */}
        <div className="relative bg-black mx-4 rounded-xl overflow-hidden" style={{ aspectRatio: "9/16", maxHeight: "50vh" }}>
          <img
            src={reel.modelImageUrl}
            alt="Reel preview"
            className="w-full h-full object-cover transition-transform duration-[15000ms] ease-linear"
            style={{
              transform: isPlaying
                ? `scale(1.15) translateY(-3%)`
                : "scale(1)",
            }}
          />

          {/* Play/Pause overlay */}
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors group"
          >
            {isPlaying ? (
              <Pause className="w-16 h-16 text-white opacity-0 group-hover:opacity-80 transition-opacity drop-shadow-lg" />
            ) : (
              <Play className="w-16 h-16 text-white opacity-80 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
            )}
          </button>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div
              className="h-full bg-primary transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Time display */}
          <div className="absolute bottom-2 right-2 text-xs text-white/80 bg-black/50 px-2 py-0.5 rounded">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* Audio Controls */}
        <div className="px-4 py-3 space-y-3">
          {/* Seek */}
          <Slider
            value={[currentTime]}
            max={duration || 1}
            step={0.1}
            onValueChange={handleSeek}
            className="w-full"
          />

          {/* Volume controls */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2 flex-1">
              <button onClick={() => setVoiceMuted(!voiceMuted)} className="text-muted-foreground hover:text-foreground">
                <Mic className={`w-4 h-4 ${voiceMuted ? "opacity-40" : ""}`} />
              </button>
              <span className="text-xs text-muted-foreground w-14">Voice</span>
              <Slider
                value={[voiceMuted ? 0 : voiceVolume]}
                max={1}
                step={0.05}
                onValueChange={(v) => { setVoiceVolume(v[0]); setVoiceMuted(false); }}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <button onClick={() => setMusicMuted(!musicMuted)} className="text-muted-foreground hover:text-foreground">
                <Music className={`w-4 h-4 ${musicMuted ? "opacity-40" : ""}`} />
              </button>
              <span className="text-xs text-muted-foreground w-14">Music</span>
              <Slider
                value={[musicMuted ? 0 : musicVolume]}
                max={1}
                step={0.05}
                onValueChange={(v) => { setMusicVolume(v[0]); setMusicMuted(false); }}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* Caption Preview */}
        <div className="px-4 pb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Instagram Caption</p>
          <p className="text-sm text-foreground leading-relaxed line-clamp-3">{reel.captionEnglish}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 pt-2 border-t border-border shrink-0">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleDownloadAssets}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-1" />
            )}
            Download Assets
          </Button>
          <Button
            className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
            onClick={() => {
              onApprove();
              handleClose(false);
            }}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Approve & Post
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReelPreviewDialog;
