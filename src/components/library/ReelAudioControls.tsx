import { Mic, Music } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface ReelAudioControlsProps {
  currentTime: number;
  duration: number;
  voiceVolume: number;
  musicVolume: number;
  voiceMuted: boolean;
  musicMuted: boolean;
  onSeek: (value: number[]) => void;
  onVoiceVolumeChange: (value: number) => void;
  onMusicVolumeChange: (value: number) => void;
  onToggleVoiceMute: () => void;
  onToggleMusicMute: () => void;
}

const ReelAudioControls = ({
  currentTime,
  duration,
  voiceVolume,
  musicVolume,
  voiceMuted,
  musicMuted,
  onSeek,
  onVoiceVolumeChange,
  onMusicVolumeChange,
  onToggleVoiceMute,
  onToggleMusicMute,
}: ReelAudioControlsProps) => {
  return (
    <div className="px-4 py-3 space-y-3">
      {/* Seek */}
      <Slider
        value={[currentTime]}
        max={duration || 1}
        step={0.1}
        onValueChange={onSeek}
        className="w-full"
      />

      {/* Volume controls */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2 flex-1">
          <button
            onClick={onToggleVoiceMute}
            className="text-muted-foreground hover:text-foreground"
          >
            <Mic className={`w-4 h-4 ${voiceMuted ? "opacity-40" : ""}`} />
          </button>
          <span className="text-xs text-muted-foreground w-14">Voice</span>
          <Slider
            value={[voiceMuted ? 0 : voiceVolume]}
            max={1}
            step={0.05}
            onValueChange={(v) => onVoiceVolumeChange(v[0])}
            className="flex-1"
          />
        </div>
        <div className="flex items-center gap-2 flex-1">
          <button
            onClick={onToggleMusicMute}
            className="text-muted-foreground hover:text-foreground"
          >
            <Music className={`w-4 h-4 ${musicMuted ? "opacity-40" : ""}`} />
          </button>
          <span className="text-xs text-muted-foreground w-14">Music</span>
          <Slider
            value={[musicMuted ? 0 : musicVolume]}
            max={1}
            step={0.05}
            onValueChange={(v) => onMusicVolumeChange(v[0])}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
};

export default ReelAudioControls;
