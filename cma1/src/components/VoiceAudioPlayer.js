import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import MicIcon from '@mui/icons-material/Mic';
import DescriptionIcon from '@mui/icons-material/Description';
import { getAvatarSrc } from '../utils/avatarHelper';
import { aiTranscribeRoute } from '../utils/APIRoutes';

// Preset pseudo-frequency heights for authentic WhatsApp waveform look
const WAVEFORM_HEIGHTS = [
  25, 45, 75, 35, 90, 60, 40, 85, 100, 70, 50, 80, 95, 40, 65, 85, 30, 90, 75, 55,
  100, 60, 45, 80, 95, 35, 70, 85, 50, 40, 65, 30, 55, 70, 45, 25
];

export default function VoiceAudioPlayer({
  audioUrl,
  senderAvatar,
  senderName,
  fromSelf = false,
  voiceTranscript = "",
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isReady, setIsReady] = useState(false);
  const [transcript, setTranscript] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const audioRef = useRef(null);
  const progressContainerRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
      setIsReady(true);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn("Audio playback interrupted:", err);
      });
    }
  };

  const handleSeek = (e) => {
    const container = progressContainerRef.current;
    const audio = audioRef.current;
    if (!container || !audio || !duration) return;

    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const fraction = Math.max(0, Math.min(1, clickX / width));
    const newTime = fraction * duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleSpeed = () => {
    const audio = audioRef.current;
    if (!audio) return;

    let nextRate = 1;
    if (playbackRate === 1) nextRate = 1.5;
    else if (playbackRate === 1.5) nextRate = 2;
    else nextRate = 1;

    audio.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const handleTranscribe = async () => {
    if (transcript) {
      setShowTranscript(!showTranscript);
      return;
    }

    if (voiceTranscript && voiceTranscript.trim()) {
      setTranscript(voiceTranscript.trim());
      setShowTranscript(true);
      return;
    }

    setIsTranscribing(true);
    try {
      const res = await axios.post(aiTranscribeRoute, {
        audioUrl,
        voiceTranscript: voiceTranscript || "",
      });

      if (res.data?.status && res.data.transcript) {
        setTranscript(res.data.transcript);
        setShowTranscript(true);
      }
    } catch (err) {
      console.error("Transcription error:", err);
      if (voiceTranscript) {
        setTranscript(voiceTranscript);
        setShowTranscript(true);
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs) || !isFinite(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '6px 4px',
          width: '280px',
          maxWidth: '100%',
          boxSizing: 'border-box',
          userSelect: 'none',
        }}
      >
        <audio ref={audioRef} src={audioUrl} preload="metadata" />

        {/* Sender Avatar with Mic Badge */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <img
            src={getAvatarSrc(senderAvatar)}
            alt={senderName || "User"}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: fromSelf ? '1.5px solid rgba(0, 168, 132, 0.5)' : '1.5px solid rgba(255, 255, 255, 0.15)',
              display: 'block',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              backgroundColor: '#00a884',
              color: '#fff',
              borderRadius: '50%',
              width: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #202c33',
              boxSizing: 'border-box',
            }}
          >
            <MicIcon style={{ fontSize: '10px' }} />
          </div>
        </div>

        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          title={isPlaying ? "Pause" : "Play"}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: fromSelf ? '#00a884' : '#2a3942',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'transform 0.15s ease, background-color 0.2s',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {isPlaying ? (
            <PauseIcon style={{ fontSize: '20px' }} />
          ) : (
            <PlayArrowIcon style={{ fontSize: '22px', marginLeft: '2px' }} />
          )}
        </button>

        {/* Waveform Scrubber & Timer Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
          <div
            ref={progressContainerRef}
            onClick={handleSeek}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2.5px',
              height: '24px',
              cursor: 'pointer',
              padding: '2px 0',
            }}
            title="Click to seek"
          >
            {WAVEFORM_HEIGHTS.map((h, i) => {
              const barFraction = i / WAVEFORM_HEIGHTS.length;
              const currentFraction = duration > 0 ? currentTime / duration : 0;
              const isPlayed = barFraction <= currentFraction;

              return (
                <span
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}%`,
                    minHeight: '4px',
                    maxHeight: '22px',
                    backgroundColor: isPlayed
                      ? (fromSelf ? '#00e676' : '#00a884')
                      : 'rgba(255, 255, 255, 0.25)',
                    borderRadius: '2px',
                    transition: 'background-color 0.1s ease',
                    display: 'inline-block',
                  }}
                />
              );
            })}
          </div>

          {/* Timers, Speed pill & Transcribe button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: 'rgba(233, 237, 239, 0.7)', fontWeight: '500' }}>
              {isPlaying || currentTime > 0 ? formatTime(currentTime) : (duration > 0 ? formatTime(duration) : "Voice Note")}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={handleTranscribe}
                title="Voice to Text"
                disabled={isTranscribing}
                style={{
                  backgroundColor: showTranscript ? 'rgba(0, 168, 132, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                  color: showTranscript ? '#00e676' : '#8696a0',
                  border: showTranscript ? '1px solid #00a884' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '10px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <span>{isTranscribing ? "⏳ Transcribing..." : "📝 Text"}</span>
              </button>

              <button
                type="button"
                onClick={toggleSpeed}
                title="Change playback speed"
                style={{
                  backgroundColor: playbackRate > 1 ? '#00a884' : 'rgba(255, 255, 255, 0.1)',
                  color: playbackRate > 1 ? '#111b21' : '#e9edef',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  letterSpacing: '0.3px',
                  transition: 'all 0.2s',
                }}
              >
                {playbackRate}x
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transcription Output Bubble */}
      {showTranscript && transcript && (
        <div
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            borderLeft: '3px solid #00a884',
            borderRadius: '6px',
            padding: '6px 10px',
            marginTop: '2px',
            fontSize: '12.5px',
            color: '#e9edef',
            lineHeight: '1.4',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span style={{ fontSize: '10.5px', color: '#00a884', fontWeight: 'bold', letterSpacing: '0.3px' }}>
              📝 VOICE TRANSCRIPT (AI)
            </span>
            <span
              onClick={() => setShowTranscript(false)}
              style={{ fontSize: '12px', color: '#8696a0', cursor: 'pointer', padding: '0 2px' }}
              title="Hide transcript"
            >
              ✕
            </span>
          </div>
          <span style={{ fontStyle: 'italic', color: '#d1d7db' }}>"{transcript}"</span>
        </div>
      )}
    </div>
  );
}
