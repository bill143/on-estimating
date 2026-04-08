import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BriefcastSegment } from '../types';

interface AudioPlayerProps {
  transcript: BriefcastSegment[];
  durationSec: number;
  title: string;
}

export function AudioPlayer({ transcript, durationSec, title }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeSegmentIdx, setActiveSegmentIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= durationSec) {
            setIsPlaying(false);
            return durationSec;
          }
          return prev + 0.5;
        });
      }, 500);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, durationSec]);

  useEffect(() => {
    const idx = transcript.findIndex(
      (seg) => currentTime >= seg.startSec && currentTime < seg.endSec,
    );
    if (idx >= 0 && idx !== activeSegmentIdx) {
      setActiveSegmentIdx(idx);
      // Auto-scroll to active segment
      const el = document.getElementById(`briefcast-seg-${idx}`);
      if (el && transcriptRef.current) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTime, transcript, activeSegmentIdx]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const skipBack = () => setCurrentTime(Math.max(0, currentTime - 10));
  const skipForward = () => setCurrentTime(Math.min(durationSec, currentTime + 10));
  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    setCurrentTime(pct * durationSec);
  };

  const progress = durationSec > 0 ? (currentTime / durationSec) * 100 : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Player controls */}
      <div className="bg-gradient-to-b from-orange-50 to-white border-b border-zinc-200 px-6 py-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg">
            <Volume2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900">{title}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Echo Briefcast — {transcript.length} segments, {formatTime(durationSec)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="relative h-2 bg-zinc-200 rounded-full cursor-pointer group"
          onClick={seekTo}
        >
          <div
            className="absolute inset-y-0 left-0 bg-orange-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-orange-500 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progress}% - 8px)` }}
          />
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-zinc-400 tabular-nums">{formatTime(currentTime)}</span>
          <span className="text-[10px] text-zinc-400 tabular-nums">{formatTime(durationSec)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mt-3">
          <button
            onClick={skipBack}
            className="p-2 rounded-full hover:bg-zinc-100 transition-colors"
            title="Back 10s"
          >
            <SkipBack className="w-4 h-4 text-zinc-600" />
          </button>
          <button
            onClick={() => {
              if (currentTime >= durationSec) setCurrentTime(0);
              setIsPlaying(!isPlaying);
            }}
            className="w-12 h-12 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow-md transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>
          <button
            onClick={skipForward}
            className="p-2 rounded-full hover:bg-zinc-100 transition-colors"
            title="Forward 10s"
          >
            <SkipForward className="w-4 h-4 text-zinc-600" />
          </button>
        </div>
      </div>

      {/* Transcript */}
      <div ref={transcriptRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          Transcript
        </h4>
        {transcript.map((seg, idx) => (
          <div
            key={seg.id}
            id={`briefcast-seg-${idx}`}
            className={cn(
              'p-3 rounded-lg transition-all cursor-pointer',
              idx === activeSegmentIdx
                ? 'bg-orange-50 border border-orange-200'
                : 'hover:bg-zinc-50',
            )}
            onClick={() => {
              setCurrentTime(seg.startSec);
              setIsPlaying(true);
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white',
                  seg.speaker === 'host_a' ? 'bg-orange-500' : 'bg-blue-500',
                )}
              >
                {seg.speakerName[0]}
              </div>
              <span className="text-xs font-semibold text-zinc-700">{seg.speakerName}</span>
              <span className="text-[10px] text-zinc-400 tabular-nums">
                {formatTime(seg.startSec)}
              </span>
            </div>
            <p className={cn(
              'text-sm leading-relaxed ml-8',
              idx === activeSegmentIdx ? 'text-zinc-900' : 'text-zinc-600',
            )}>
              {seg.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
