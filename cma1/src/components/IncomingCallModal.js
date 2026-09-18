import React, { useEffect, useRef, useState } from 'react';
import CallIcon from '@mui/icons-material/Call';
import CallEndIcon from '@mui/icons-material/CallEnd';
import VideocamIcon from '@mui/icons-material/Videocam';
import { getAvatarSrc } from '../utils/avatarHelper';

const RING_TIMEOUT_SECONDS = 30;

// Synthesized ringtone using Web Audio API
function useRingtone(active) {
  const ctxRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const ctx = new AudioContext();
      ctxRef.current = ctx;

      const playBeep = (freq1, freq2, duration, delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq1, ctx.currentTime + delay);
        osc.frequency.setValueAtTime(freq2, ctx.currentTime + delay + 0.1);
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + delay + 0.02);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + delay + duration - 0.05);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + duration);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + duration);
      };

      const ring = () => {
        playBeep(880, 1100, 0.15, 0);
        playBeep(880, 1100, 0.15, 0.2);
      };

      ring();
      intervalRef.current = setInterval(ring, 2000);
    } catch (e) {
      console.warn('[Ringtone] Audio error:', e.message);
    }

    return () => {
      clearInterval(intervalRef.current);
      try { ctxRef.current?.close(); } catch (_) {}
    };
  }, [active]);
}

export default function IncomingCallModal({ callData, onAccept, onDecline }) {
  // All hooks MUST be called before any early return (Rules of Hooks)
  useRingtone(!!callData);

  const [timeLeft, setTimeLeft] = useState(RING_TIMEOUT_SECONDS);
  useEffect(() => {
    if (!callData) return;
    setTimeLeft(RING_TIMEOUT_SECONDS); // reset on new call
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { onDecline(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callData, onDecline]);

  if (!callData) return null;

  const { callerName, callerAvatar, callType, isGroup } = callData;
  const isVideo = callType === 'video';


  return (
    <div
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 99999,
        backgroundColor: '#111b21',
        border: '1px solid rgba(0, 168, 132, 0.4)',
        borderRadius: '16px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.8), 0 0 20px rgba(0,168,132,0.2)',
        animation: 'slideInRight 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        maxWidth: '380px',
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes ringPulse {
          0% { box-shadow: 0 0 0 0 rgba(0, 168, 132, 0.7); }
          70% { box-shadow: 0 0 0 14px rgba(0, 168, 132, 0); }
          100% { box-shadow: 0 0 0 0 rgba(0, 168, 132, 0); }
        }
        .call-ring-anim {
          animation: ringPulse 1.5s infinite;
        }
      `}</style>

      {/* Caller Avatar */}
      <div style={{ position: 'relative' }}>
        <img
          src={getAvatarSrc(callerAvatar)}
          alt={callerName}
          className="call-ring-anim"
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid #00a884',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-2px',
            right: '-2px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: '#00a884',
            color: '#111b21',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isVideo ? <VideocamIcon style={{ fontSize: '13px' }} /> : <CallIcon style={{ fontSize: '13px' }} />}
        </div>
      </div>

      {/* Caller Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{ margin: '0 0 3px 0', fontSize: '15px', color: '#e9edef', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {callerName || 'Unknown Caller'}
        </h4>
        <p style={{ margin: 0, fontSize: '12px', color: '#00a884', fontWeight: '500' }}>
          Incoming {isVideo ? 'Video' : 'Voice'} Call {isGroup ? '(Group)' : ''} • {timeLeft}s
        </p>
      </div>

      {/* Accept & Decline Buttons */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="button"
          onClick={onDecline}
          title="Decline"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#f15c6d',
            color: '#fff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(241,92,109,0.4)',
          }}
        >
          <CallEndIcon style={{ fontSize: '20px' }} />
        </button>

        <button
          type="button"
          onClick={onAccept}
          title="Accept"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#00a884',
            color: '#111b21',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,168,132,0.4)',
          }}
        >
          {isVideo ? <VideocamIcon style={{ fontSize: '20px' }} /> : <CallIcon style={{ fontSize: '20px' }} />}
        </button>
      </div>
    </div>
  );
}
