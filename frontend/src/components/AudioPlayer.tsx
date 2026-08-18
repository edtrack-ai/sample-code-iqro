import React, { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface AudioPlayerProps {
  url: string;
  name?: string;
  sizeBytes?: number;
  duration?: number;
  compact?: boolean;
}

export function AudioPlayer({ url, name, sizeBytes, duration, compact = false }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [metadataDuration, setMetadataDuration] = useState<number>(duration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;

    const setAudioData = () => {
      if (audio.duration && audio.duration !== Infinity && !duration) {
        setMetadataDuration(audio.duration);
      }
    };

    const setAudioTime = () => {
      if (audio.duration) {
        setProgress(audio.currentTime / audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener("loadedmetadata", setAudioData);
    audio.addEventListener("timeupdate", setAudioTime);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", setAudioData);
      audio.removeEventListener("timeupdate", setAudioTime);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
    };
  }, [url, duration]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds === Infinity) return "00:00";
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Generate generic bars for waveform visualization
  const waveformBars = Array.from({ length: 30 }).map((_, i) => {
    // Determine height based on progress to show played vs unplayed state
    const isPlayed = i / 30 <= progress;
    // creating a simple pseudo-random looking wave shape
    const height = 20 + Math.sin(i * 0.5) * 10 + Math.random() * 5; 
    
    return (
      <div 
        key={i} 
        style={{ height: `${height}%` }}
        className={`w-1 rounded-full mx-[1px] transition-colors duration-150 ${isPlayed ? 'bg-primary' : 'bg-primary/30'}`}
      />
    );
  });

  return (
    <div className={`flex items-center gap-3 bg-primary/5 rounded-2xl p-2.5 max-w-[320px] shadow-sm border border-primary/10 ${compact ? 'flex-1 min-w-[200px]' : 'w-full'}`}>
      <button 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePlay(); }}
        className="w-10 h-10 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shadow-md"
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
      </button>

      <div className="flex flex-col gap-1 w-full min-w-0">
        <div className="flex items-center h-5 w-full">
          {waveformBars}
        </div>
        
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
          <span>{formatTime(metadataDuration)}</span>
          {sizeBytes ? (
            <>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
              <span>{formatSize(sizeBytes)}</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
