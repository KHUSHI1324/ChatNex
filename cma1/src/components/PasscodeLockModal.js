import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { verifyPasscodeRoute } from '../utils/APIRoutes';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined';
import SecurityIcon from '@mui/icons-material/Security';

export default function PasscodeLockModal({ currentUser, onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [shake, setShake] = useState(false);

  const handleVerify = useCallback(async (pinToTest) => {
    if (isVerifying || pinToTest.length !== 4) return;
    setIsVerifying(true);
    setError('');

    try {
      const res = await axios.post(verifyPasscodeRoute, {
        userId: currentUser?._id,
        passcode: pinToTest,
      });

      if (res.data?.status) {
        onUnlock();
      } else {
        setError(res.data?.msg || 'Incorrect PIN. Try again.');
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setPin('');
      }
    } catch (err) {
      console.error('Passcode verification error:', err);
      setError('Connection error. Please try again.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  }, [currentUser?._id, isVerifying, onUnlock]);

  const handleKeyPress = useCallback((num) => {
    if (pin.length < 4 && !isVerifying) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError('');
      if (nextPin.length === 4) {
        handleVerify(nextPin);
      }
    }
  }, [pin, isVerifying, handleVerify]);

  const handleBackspace = useCallback(() => {
    if (!isVerifying) {
      setPin((prev) => prev.slice(0, -1));
      setError('');
    }
  }, [isVerifying]);

  // Physical keyboard listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress, handleBackspace]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: '#0c1317',
        backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(0,168,132,0.12) 0%, rgba(12,19,23,0.98) 70%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        fontFamily: 'Segoe UI, Helvetica Neue, Helvetica, Lucida Grande, Arial, sans-serif',
      }}
    >
      <style>{`
        @keyframes lockShake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-12px); }
          40%, 80% { transform: translateX(12px); }
        }
        .pin-shake {
          animation: lockShake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
        .pin-key-btn {
          width: 68px;
          height: 68px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.05);
          color: #e9edef;
          font-size: 24px;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
          user-select: none;
        }
        .pin-key-btn:hover {
          background: rgba(0, 168, 132, 0.25);
          border-color: #00a884;
          transform: scale(1.06);
        }
        .pin-key-btn:active {
          transform: scale(0.95);
          background: rgba(0, 168, 132, 0.4);
        }
      `}</style>

      <div
        className={shake ? 'pin-shake' : ''}
        style={{
          width: '100%',
          maxWidth: '380px',
          padding: '30px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* App Lock Avatar / Icon */}
        <div
          style={{
            position: 'relative',
            marginBottom: '16px',
          }}
        >
          {currentUser?.avtarImage ? (
            <img
              src={currentUser.avtarImage}
              alt={currentUser.username}
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                border: '3px solid #00a884',
                objectFit: 'cover',
                boxShadow: '0 0 25px rgba(0,168,132,0.35)',
              }}
            />
          ) : (
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0,168,132,0.15)',
                border: '2px solid #00a884',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00a884',
              }}
            >
              <SecurityIcon style={{ fontSize: '38px' }} />
            </div>
          )}

          <div
            style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              backgroundColor: '#00a884',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#111b21',
              boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
            }}
          >
            <LockOutlinedIcon style={{ fontSize: '15px' }} />
          </div>
        </div>

        <h2 style={{ color: '#e9edef', fontSize: '20px', fontWeight: '600', margin: '0 0 6px 0' }}>
          ChatNex App Locked
        </h2>
        <p style={{ color: '#8696a0', fontSize: '13.5px', margin: '0 0 24px 0' }}>
          Enter your 4-digit PIN for <strong>{currentUser?.username || 'User'}</strong>
        </p>

        {/* 4-Digit Dot Indicators */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '24px',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: `2px solid ${isFilled ? '#00a884' : 'rgba(255,255,255,0.2)'}`,
                  backgroundColor: isFilled ? '#00a884' : 'transparent',
                  transform: isFilled ? 'scale(1.15)' : 'scale(1)',
                  boxShadow: isFilled ? '0 0 10px rgba(0,168,132,0.6)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              />
            );
          })}
        </div>

        {/* Error / Status Message */}
        <div style={{ height: '22px', marginBottom: '20px' }}>
          {error ? (
            <span style={{ color: '#f15c6d', fontSize: '13px', fontWeight: '500' }}>
              ⚠️ {error}
            </span>
          ) : isVerifying ? (
            <span style={{ color: '#00a884', fontSize: '13px' }}>
              Verifying PIN...
            </span>
          ) : null}
        </div>

        {/* Numeric Keypad */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '18px',
            justifyItems: 'center',
            marginBottom: '16px',
          }}
        >
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              className="pin-key-btn"
              onClick={() => handleKeyPress(digit)}
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            className="pin-key-btn"
            style={{ fontSize: '13px', color: '#8696a0', letterSpacing: '0.5px' }}
            onClick={() => setPin('')}
          >
            CLEAR
          </button>
          <button
            type="button"
            className="pin-key-btn"
            onClick={() => handleKeyPress('0')}
          >
            0
          </button>
          <button
            type="button"
            className="pin-key-btn"
            onClick={handleBackspace}
          >
            <BackspaceOutlinedIcon style={{ fontSize: '20px' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
