import React from 'react';
import LockIcon from '@mui/icons-material/Lock';
import ForumIcon from '@mui/icons-material/Forum';
import BoltIcon from '@mui/icons-material/Bolt';

export default function Welcome({ currentUser }) {
  const username = currentUser?.username || 'User';

  return (
    <div className="welcome-container">
      {/* Centered Main Hero Content */}
      <div className="welcome-content">
        {/* Animated Floating Robot Illustration */}
        <div className="bot-stage">
          {/* Floating Speech Bubble */}
          <div className="bot-bubble">
            <span>Hello {username}! 👋</span>
          </div>

          {/* Dynamic Vector Robot */}
          <svg
            className="animated-robot"
            viewBox="0 0 200 200"
            width="170"
            height="170"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Antenna */}
            <line x1="100" y1="52" x2="100" y2="28" stroke="#00a884" strokeWidth="4" strokeLinecap="round" />
            <circle cx="100" cy="24" r="7" fill="#00a884" className="antenna-glow" />

            {/* Left Ear */}
            <rect x="50" y="76" width="8" height="20" rx="4" fill="#00a884" opacity="0.8" />
            {/* Right Ear */}
            <rect x="142" y="76" width="8" height="20" rx="4" fill="#00a884" opacity="0.8" />

            {/* Head Body */}
            <rect x="56" y="48" width="88" height="74" rx="28" fill="#1f2c34" stroke="#00a884" strokeWidth="3" />

            {/* Screen Visor */}
            <rect x="65" y="58" width="70" height="42" rx="14" fill="#111b21" stroke="rgba(0,168,132,0.4)" strokeWidth="1.5" />

            {/* Left Eye */}
            <circle cx="82" cy="78" r="7" fill="#00e676" className="robot-eye" />
            <circle cx="84" cy="76" r="2.5" fill="#ffffff" />

            {/* Right Eye */}
            <circle cx="118" cy="78" r="7" fill="#00e676" className="robot-eye" />
            <circle cx="120" cy="76" r="2.5" fill="#ffffff" />

            {/* Smile */}
            <path d="M90 91 Q100 97 110 91" stroke="#00e676" strokeWidth="2.5" strokeLinecap="round" fill="none" />

            {/* Neck */}
            <rect x="92" y="122" width="16" height="8" rx="3" fill="#00a884" opacity="0.9" />

            {/* Body */}
            <path d="M70 130 C70 130 80 128 100 128 C120 128 130 130 130 130 C138 130 144 138 144 148 L142 168 C142 176 134 182 124 182 L76 182 C66 182 58 176 58 168 L56 148 C56 138 62 130 70 130 Z" fill="#1f2c34" stroke="#00a884" strokeWidth="2.5" />

            {/* Chest Heart/Icon */}
            <circle cx="100" cy="154" r="11" fill="#111b21" stroke="#00a884" strokeWidth="1.5" />
            <path d="M96 154 L100 149 L100 159 L104 154" stroke="#00e676" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Left Arm (Resting) */}
            <path d="M58 142 C50 146 44 156 46 166 C47 172 52 176 56 172 C58 168 58 160 62 154" stroke="#00a884" strokeWidth="4" strokeLinecap="round" />

            {/* Right Arm (Waving animation) */}
            <g className="waving-arm">
              <path d="M142 142 C152 136 160 124 164 114 C166 108 162 104 157 107 C152 110 148 118 142 126" stroke="#00a884" strokeWidth="4" strokeLinecap="round" />
              <circle cx="163" cy="110" r="5" fill="#00e676" />
            </g>
          </svg>

          {/* Dynamic Ground Shadow */}
          <div className="bot-shadow" />
        </div>

        {/* Typography */}
        <h1 className="welcome-title">
          Welcome to <span style={{ color: '#00a884' }}>ChatNex</span>, {username}!
        </h1>
        <p className="welcome-subtitle">
          Send and receive messages with rich media, GIFs, voice and video calls.
        </p>

        {/* Feature Highlights Pills */}
        <div className="welcome-highlights">
          <div className="highlight-pill">
            <ForumIcon style={{ fontSize: '16px', color: '#00a884' }} />
            <span>Real-time Chat</span>
          </div>
          <div className="highlight-pill">
            <BoltIcon style={{ fontSize: '16px', color: '#00a884' }} />
            <span>Instant Media & GIFs</span>
          </div>
        </div>
      </div>

      {/* Encrypted Lock Footer */}
      <div className="welcome-footer">
        <LockIcon style={{ fontSize: '13px', color: '#8696a0' }} />
        <span>End-to-end encrypted</span>
      </div>
    </div>
  );
}
