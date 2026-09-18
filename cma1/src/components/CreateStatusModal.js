import React, { useState, useRef } from 'react';
import axios from 'axios';
import { createStatusRoute } from '../utils/APIRoutes';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import ColorLensIcon from '@mui/icons-material/ColorLens';

const BG_COLORS = [
  '#00a884',
  '#6b52ae',
  '#c43f3f',
  '#d35400',
  '#2980b9',
  '#1e272e',
  '#e84393',
  '#16a085',
  '#8e44ad',
];

export default function CreateStatusModal({ currentUser, onClose, onStatusCreated, socket }) {
  const [mode, setMode] = useState('text'); // 'text' | 'media'
  const [text, setText] = useState('');
  const [bgColorIndex, setBgColorIndex] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const handleCycleColor = () => {
    setBgColorIndex((prev) => (prev + 1) % BG_COLORS.length);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setFilePreview(url);
    setMode('media');
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (mode === 'text' && !text.trim()) {
      return;
    }
    if (mode === 'media' && !selectedFile) {
      return;
    }

    try {
      setIsSubmitting(true);

      if (mode === 'text') {
        const res = await axios.post(createStatusRoute, {
          userId: currentUser._id,
          mediaType: 'text',
          caption: text.trim(),
          backgroundColor: BG_COLORS[bgColorIndex],
        });

        if (res.data?.status) {
          onStatusCreated?.(res.data.newStatus);
          socket?.current?.emit('status-updated', { userId: currentUser._id });
          onClose();
        }
      } else {
        const formData = new FormData();
        formData.append('userId', currentUser._id);
        formData.append('media', selectedFile);
        formData.append('caption', caption.trim());
        formData.append(
          'mediaType',
          selectedFile.type.startsWith('video/') ? 'video' : 'image'
        );

        const res = await axios.post(createStatusRoute, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (res.data?.status) {
          onStatusCreated?.(res.data.newStatus);
          socket?.current?.emit('status-updated', { userId: currentUser._id });
          onClose();
        }
      }
    } catch (err) {
      console.error('Error creating status:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(11, 20, 26, 0.95)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          height: '620px',
          backgroundColor: mode === 'text' ? BG_COLORS[bgColorIndex] : '#111b21',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.1)',
          transition: 'background-color 0.3s ease',
        }}
      >
        {/* Header Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            zIndex: 10,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CloseIcon style={{ fontSize: '20px' }} />
          </button>

          {/* Mode Switchers */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                setMode('text');
                setSelectedFile(null);
                setFilePreview(null);
              }}
              style={{
                background: mode === 'text' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                borderRadius: '20px',
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <TextFieldsIcon style={{ fontSize: '16px' }} />
              Text
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: mode === 'media' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                borderRadius: '20px',
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <PhotoCameraIcon style={{ fontSize: '16px' }} />
              Photo / Video
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {mode === 'text' && (
              <button
                onClick={handleCycleColor}
                title="Change Background Color"
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ColorLensIcon style={{ fontSize: '20px' }} />
              </button>
            )}
          </div>
        </div>

        {/* Story Body */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            position: 'relative',
          }}
        >
          {mode === 'text' ? (
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a status update..."
              maxLength={400}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '24px',
                fontWeight: '600',
                textAlign: 'center',
                outline: 'none',
                resize: 'none',
                fontFamily: 'Segoe UI, Helvetica Neue, Helvetica, Lucida Grande, Arial, sans-serif',
                lineHeight: 1.4,
              }}
              rows={6}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {selectedFile?.type?.startsWith('video/') ? (
                <video
                  src={filePreview}
                  controls
                  autoPlay
                  style={{ maxHeight: '100%', maxWidth: '100%', borderRadius: '8px' }}
                />
              ) : (
                <img
                  src={filePreview}
                  alt="Story Preview"
                  style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px' }}
                />
              )}
            </div>
          )}
        </div>

        {/* Footer / Send Action */}
        <div
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {mode === 'media' && (
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              style={{
                flex: 1,
                padding: '12px 16px',
                backgroundColor: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '24px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          )}

          <div style={{ flex: mode === 'text' ? 1 : 0, textAlign: 'right' }}>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || (mode === 'text' && !text.trim()) || (mode === 'media' && !selectedFile)}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#00a884',
                color: '#111b21',
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isSubmitting ? 'wait' : 'pointer',
                opacity: (mode === 'text' && !text.trim()) || (mode === 'media' && !selectedFile) ? 0.5 : 1,
                boxShadow: '0 4px 12px rgba(0,168,132,0.4)',
              }}
            >
              <SendIcon style={{ fontSize: '20px', transform: 'rotate(-30deg) translate(2px, -2px)' }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
