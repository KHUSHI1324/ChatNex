import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { viewStatusRoute, deleteStatusRoute, sendMessageRoute } from '../utils/APIRoutes';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SendIcon from '@mui/icons-material/Send';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

export default function StatusViewerModal({
  stories = [],
  user = {},
  currentUser = {},
  initialIndex = 0,
  onClose,
  onStatusDeleted,
  socket,
  showToast,
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showViewersList, setShowViewersList] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const progressIntervalRef = useRef(null);

  const currentStory = stories[currentIndex] || {};
  const isMyStory = (user?._id || currentStory?.user?._id || currentStory?.user)?.toString() === currentUser?._id?.toString();

  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  // Mark status as viewed in backend
  useEffect(() => {
    if (currentStory?._id && !isMyStory && currentUser?._id) {
      axios
        .post(viewStatusRoute, {
          statusId: currentStory._id,
          viewerId: currentUser._id,
        })
        .catch((e) => console.error('Error marking status viewed:', e));
    }
  }, [currentStory?._id, isMyStory, currentUser?._id]);

  // Timer Progress management (5 seconds per story)
  useEffect(() => {
    if (isPaused || showViewersList) {
      clearInterval(progressIntervalRef.current);
      return;
    }

    const stepMs = 50;
    const totalMs = 5000;
    const increment = (stepMs / totalMs) * 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + increment;
      });
    }, stepMs);

    return () => clearInterval(progressIntervalRef.current);
  }, [currentIndex, isPaused, showViewersList, handleNext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'Escape') onClose();
      else if (e.key === ' ') {
        e.preventDefault();
        setIsPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  const handleDeleteStory = async () => {
    if (!currentStory?._id) return;
    try {
      const res = await axios.delete(`${deleteStatusRoute}/${currentStory._id}`, {
        data: { userId: currentUser._id },
      });
      if (res.data?.status) {
        showToast?.('info', 'Status Deleted', 'Your story was removed.');
        onStatusDeleted?.(currentStory._id);
        if (stories.length <= 1) {
          onClose();
        } else {
          handleNext();
        }
      }
    } catch (err) {
      console.error('Error deleting status:', err);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || isSendingReply) return;
    try {
      setIsSendingReply(true);
      const recipientId = user?._id || currentStory?.user?._id;
      const res = await axios.post(sendMessageRoute, {
        from: currentUser._id,
        to: recipientId,
        message: `Replied to story: "${replyText.trim()}"`,
      });

      if (res.data?.status) {
        socket?.current?.emit('send-msg', {
          to: recipientId,
          from: currentUser._id,
          message: `Replied to story: "${replyText.trim()}"`,
        });
        showToast?.('success', 'Reply Sent', 'Direct message sent to story owner.');
        setReplyText('');
      }
    } catch (err) {
      console.error('Error sending story reply:', err);
    } finally {
      setIsSendingReply(false);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        backgroundColor: '#0c1317',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          height: '100%',
          maxHeight: '740px',
          backgroundColor:
            currentStory.mediaType === 'text'
              ? currentStory.backgroundColor || '#00a884'
              : '#0b141a',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px rgba(0,0,0,0.8)',
        }}
      >
        {/* Multi-story Segmented Progress Bars */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            right: '12px',
            zIndex: 30,
            display: 'flex',
            gap: '4px',
          }}
        >
          {stories.map((s, idx) => {
            let widthPercent = 0;
            if (idx < currentIndex) widthPercent = 100;
            else if (idx === currentIndex) widthPercent = progress;

            return (
              <div
                key={s._id || idx}
                style={{
                  flex: 1,
                  height: '3px',
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${widthPercent}%`,
                    backgroundColor: '#ffffff',
                    transition: idx === currentIndex ? 'none' : 'width 0.2s',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Story Header */}
        <div
          style={{
            position: 'absolute',
            top: '24px',
            left: '12px',
            right: '12px',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 8px',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src={user?.avtarImage || currentStory?.user?.avtarImage || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
              alt={user?.username || 'User'}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                border: '2px solid #00a884',
                objectFit: 'cover',
              }}
            />
            <div>
              <div style={{ color: '#fff', fontSize: '14.5px', fontWeight: '600' }}>
                {isMyStory ? 'My Status' : user?.username || 'Contact'}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11.5px' }}>
                {formatTime(currentStory?.createdAt)}
              </div>
            </div>
          </div>

          {/* Controls: Pause / Play, Delete, Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setIsPaused((p) => !p)}
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: 'none',
                color: '#fff',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isPaused ? <PlayArrowIcon style={{ fontSize: '18px' }} /> : <PauseIcon style={{ fontSize: '18px' }} />}
            </button>

            {isMyStory && (
              <button
                onClick={handleDeleteStory}
                title="Delete Status"
                style={{
                  background: 'rgba(241,92,109,0.3)',
                  border: '1px solid #f15c6d',
                  color: '#f15c6d',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <DeleteOutlineIcon style={{ fontSize: '18px' }} />
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: 'none',
                color: '#fff',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CloseIcon style={{ fontSize: '18px' }} />
            </button>
          </div>
        </div>

        {/* Story Content & Tap navigation areas */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            padding: '60px 16px 80px 16px',
          }}
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Left tap zone */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: '35%',
              zIndex: 20,
              cursor: 'pointer',
            }}
          />

          {/* Right tap zone */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: '35%',
              zIndex: 20,
              cursor: 'pointer',
            }}
          />

          {currentStory.mediaType === 'text' ? (
            <div
              style={{
                color: '#fff',
                fontSize: '24px',
                fontWeight: '600',
                textAlign: 'center',
                lineHeight: 1.4,
                padding: '20px',
                wordBreak: 'break-word',
              }}
            >
              {currentStory.caption}
            </div>
          ) : currentStory.mediaType === 'video' ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <video
                src={currentStory.mediaUrl}
                autoPlay
                playsInline
                style={{ maxHeight: '80%', maxWidth: '100%', borderRadius: '8px' }}
              />
              {currentStory.caption && (
                <div style={{ color: '#fff', fontSize: '15px', marginTop: '12px', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: '6px 14px', borderRadius: '16px' }}>
                  {currentStory.caption}
                </div>
              )}
            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={currentStory.mediaUrl}
                alt="Story"
                style={{ maxHeight: '80%', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px' }}
              />
              {currentStory.caption && (
                <div style={{ color: '#fff', fontSize: '15px', marginTop: '12px', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: '6px 14px', borderRadius: '16px' }}>
                  {currentStory.caption}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Area: Viewers Counter (My Story) OR Reply Bar (Other's Story) */}
        {isMyStory ? (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 30,
              padding: '16px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            onClick={() => setShowViewersList((v) => !v)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '14px', fontWeight: '500' }}>
              <VisibilityIcon style={{ fontSize: '18px' }} />
              <span>{currentStory?.viewers?.length || 0} views</span>
            </div>
          </div>
        ) : (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 30,
              padding: '14px 16px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
              placeholder={`Reply to ${user?.username || 'contact'}...`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendReply();
              }}
              style={{
                flex: 1,
                padding: '10px 16px',
                backgroundColor: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '20px',
                color: '#fff',
                fontSize: '13.5px',
                outline: 'none',
              }}
            />
            <button
              onClick={handleSendReply}
              disabled={!replyText.trim() || isSendingReply}
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
                cursor: replyText.trim() ? 'pointer' : 'default',
                opacity: replyText.trim() ? 1 : 0.5,
              }}
            >
              <SendIcon style={{ fontSize: '18px', transform: 'rotate(-30deg) translate(1px, -1px)' }} />
            </button>
          </div>
        )}

        {/* Viewers Bottom Drawer */}
        {showViewersList && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: '320px',
              backgroundColor: '#111b21',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px 16px 0 0',
              zIndex: 40,
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '600' }}>
                Viewed by {currentStory?.viewers?.length || 0}
              </div>
              <button
                onClick={() => setShowViewersList(false)}
                style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}
              >
                <CloseIcon style={{ fontSize: '18px' }} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {currentStory?.viewers?.length === 0 ? (
                <div style={{ color: '#8696a0', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                  No views yet
                </div>
              ) : (
                currentStory?.viewers?.map((v, i) => (
                  <div
                    key={v.user?._id || i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img
                        src={v.user?.avtarImage || 'https://api.dicebear.com/7.x/bottts/svg?seed=viewer'}
                        alt={v.user?.username || 'Viewer'}
                        style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div style={{ color: '#e9edef', fontSize: '13.5px', fontWeight: '500' }}>
                        {v.user?.username || 'Contact'}
                      </div>
                    </div>
                    <div style={{ color: '#8696a0', fontSize: '12px' }}>
                      {formatTime(v.viewedAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
