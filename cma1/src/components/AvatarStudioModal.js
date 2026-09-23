import React, { useState, useRef } from 'react';
import { MODERN_AVATARS, generateCustomAiAvatar } from '../utils/avatarCollection';
import { getAvatarSrc } from '../utils/avatarHelper';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import DoneIcon from '@mui/icons-material/Done';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CircularProgress from '@mui/material/CircularProgress';

export default function AvatarStudioModal({
  isOpen,
  onClose,
  onSelectAvatar,
  currentImage,
  title = 'Avatar Studio',
  subtitle = 'Choose a modern 3D vector avatar, generate with AI, or upload your photo',
  saveButtonText = 'Set as DP & Save',
  isSaving = false,
  showToast,
}) {
  const [avatarTab, setAvatarTab] = useState('all'); // 'all' | 'male' | 'female' | 'ai' | 'upload'
  const [selectedAvatarImage, setSelectedAvatarImage] = useState(currentImage || MODERN_AVATARS[0]?.image || '');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGeneratedAvatar, setAiGeneratedAvatar] = useState(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedAvatarImage(reader.result);
      showToast?.('info', 'Photo Selected', 'Click save below to apply this picture.');
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAi = async (e) => {
    if (e) e.preventDefault();
    if (!aiPrompt.trim()) {
      showToast?.('info', 'Prompt Required', 'Please enter a description for your AI avatar.');
      return;
    }

    setIsGeneratingAi(true);
    try {
      const generated = await generateCustomAiAvatar(aiPrompt, '3d avatar', aiPrompt);
      setAiGeneratedAvatar(generated);
      setSelectedAvatarImage(generated);
    } catch (err) {
      console.error('Error generating AI avatar:', err);
      showToast?.('error', 'AI Generation Failed', 'Could not generate avatar. Try a different prompt.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSave = () => {
    if (!selectedAvatarImage) return;
    if (onSelectAvatar) {
      onSelectAvatar(selectedAvatarImage);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      <div
        style={{
          backgroundColor: '#182229',
          borderRadius: '18px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          color: '#e9edef',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Studio Header */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#202c33',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(0,168,132,0.3), rgba(0,210,211,0.2))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(0,168,132,0.4)',
              }}
            >
              <AutoAwesomeIcon style={{ color: '#00a884', fontSize: '22px' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#e9edef', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {title}
                <span style={{ fontSize: '10.5px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(0,168,132,0.18)', color: '#00a884', fontWeight: '600', border: '1px solid rgba(0,168,132,0.3)' }}>
                  3D & AI Powered
                </span>
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#8696a0' }}>
                {subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              color: '#8696a0',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)')}
          >
            <CloseIcon style={{ fontSize: '20px' }} />
          </button>
        </div>

        {/* Selected Avatar Live Preview Strip */}
        <div
          style={{
            padding: '12px 22px',
            backgroundColor: '#111b21',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div style={{ position: 'relative' }}>
            <img
              src={getAvatarSrc(selectedAvatarImage) || 'https://api.dicebear.com/7.x/bottts/svg?seed=ChatNex'}
              alt="Avatar Preview"
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2.5px solid #00a884',
                boxShadow: '0 0 14px rgba(0, 168, 132, 0.4)',
                backgroundColor: '#202c33',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                backgroundColor: '#00a884',
                color: '#111b21',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #111b21',
              }}
            >
              <CheckCircleIcon style={{ fontSize: '13px' }} />
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#e9edef' }}>
              Preview Active
            </div>
            <div style={{ fontSize: '12px', color: '#00a884', marginTop: '1px' }}>
              Click save below to apply this profile picture
            </div>
          </div>
        </div>

        {/* Studio Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: '10px 22px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            backgroundColor: '#182229',
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'all', label: '🌟 All 3D' },
            { id: 'male', label: '👦 Boys' },
            { id: 'female', label: '👧 Girls' },
            { id: 'ai', label: '✨ AI Generator' },
            { id: 'upload', label: '📷 Upload Photo' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setAvatarTab(tab.id)}
              style={{
                padding: '7px 14px',
                borderRadius: '20px',
                border: avatarTab === tab.id ? '1px solid #00a884' : '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: avatarTab === tab.id ? 'rgba(0, 168, 132, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                color: avatarTab === tab.id ? '#00a884' : '#8696a0',
                fontSize: '12.5px',
                fontWeight: avatarTab === tab.id ? '600' : '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.18s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Studio Main Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
          {/* 3D Curated Avatars Grid */}
          {avatarTab === 'all' || avatarTab === 'male' || avatarTab === 'female' ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px',
              }}
            >
              {MODERN_AVATARS
                .filter((av) => {
                  if (avatarTab === 'all') return true;
                  if (avatarTab === 'male') return av.category === 'male';
                  if (avatarTab === 'female') return av.category === 'female';
                  return true;
                })
                .map((avatar) => {
                  const isSelected = selectedAvatarImage === avatar.image;
                  return (
                    <div
                      key={avatar.id}
                      onClick={() => setSelectedAvatarImage(avatar.image)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          position: 'relative',
                          width: '84px',
                          height: '84px',
                          borderRadius: '50%',
                          padding: '3px',
                          border: isSelected ? '3px solid #00a884' : '2px solid rgba(255, 255, 255, 0.1)',
                          backgroundColor: isSelected ? 'rgba(0, 168, 132, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                          boxShadow: isSelected ? '0 0 16px rgba(0, 168, 132, 0.55)' : 'none',
                          transform: isSelected ? 'scale(1.06)' : 'scale(1)',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <img
                          src={getAvatarSrc(avatar.image)}
                          alt={avatar.title || avatar.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            objectFit: 'cover',
                          }}
                        />
                        {isSelected && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '-2px',
                              right: '-2px',
                              backgroundColor: '#00a884',
                              color: '#111b21',
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '2px solid #111b21',
                            }}
                          >
                            <CheckCircleIcon style={{ fontSize: '14px' }} />
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '11.5px', color: isSelected ? '#00a884' : '#8696a0', fontWeight: isSelected ? '600' : '400' }}>
                        {avatar.name || avatar.title}
                      </span>
                    </div>
                  );
                })}
            </div>
          ) : avatarTab === 'ai' ? (
            /* AI Avatar Generator Section */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#e9edef', fontWeight: '600' }}>
                  Describe your dream avatar
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#8696a0', lineHeight: '1.4' }}>
                  Type any prompt or pick a preset idea below to generate a one-of-a-kind AI avatar:
                </p>
              </div>

              {/* Preset Prompt Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {[
                  '⚡ Cyberpunk 3D Character',
                  '🌸 Anime Style Character',
                  '🕶️ Cool 3D Character with Shades',
                  '🎨 3D Pixar Style Group Avatar',
                  '👑 Royal Crown Mascot',
                  '🥷 Futuristic Gaming Squad Logo',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAiPrompt(preset.replace(/^[^\w]+/, '').trim())}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '16px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#e9edef',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 168, 132, 0.15)';
                      e.currentTarget.style.borderColor = '#00a884';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* AI Input Row */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. superhero team emblem in neon glow..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleGenerateAi(e);
                  }}
                  style={{
                    flex: 1,
                    padding: '11px 14px',
                    backgroundColor: '#111b21',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    color: '#e9edef',
                    fontSize: '13.5px',
                    outline: 'none',
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleGenerateAi}
                  disabled={isGeneratingAi || !aiPrompt.trim()}
                  style={{
                    padding: '11px 20px',
                    backgroundColor: '#00a884',
                    color: '#111b21',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: isGeneratingAi || !aiPrompt.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isGeneratingAi ? <CircularProgress size={16} style={{ color: '#111b21' }} /> : <AutoAwesomeIcon style={{ fontSize: '17px' }} />}
                  {isGeneratingAi ? 'Creating...' : 'Generate'}
                </button>
              </div>

              {/* AI Preview Result */}
              {aiGeneratedAvatar ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '18px',
                    backgroundColor: '#111b21',
                    borderRadius: '12px',
                    border: '1px solid #00a884',
                    boxShadow: '0 8px 24px rgba(0, 168, 132, 0.25)',
                  }}
                >
                  <img
                    src={getAvatarSrc(aiGeneratedAvatar)}
                    alt="AI Avatar Preview"
                    style={{
                      width: '110px',
                      height: '110px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid #00a884',
                      boxShadow: '0 8px 24px rgba(0, 168, 132, 0.45)',
                    }}
                  />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '13px', color: '#00a884', fontWeight: '600', marginBottom: '4px' }}>
                      ✨ AI Avatar Generated Successfully!
                    </div>
                    <div style={{ fontSize: '12px', color: '#8696a0' }}>
                      "{aiPrompt}"
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateAi}
                    disabled={isGeneratingAi}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '6px',
                      color: '#e9edef',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <RefreshIcon style={{ fontSize: '15px' }} /> Regenerate Variation
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '30px 20px',
                    backgroundColor: '#111b21',
                    borderRadius: '12px',
                    border: '1px dashed rgba(255, 255, 255, 0.1)',
                    gap: '10px',
                    textAlign: 'center',
                  }}
                >
                  <AutoAwesomeIcon style={{ fontSize: '36px', color: '#00a884', opacity: 0.7 }} />
                  <div style={{ fontSize: '13px', color: '#8696a0' }}>
                    Enter a prompt above and click <strong>Generate</strong> to create an instant avatar.
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Upload Photo Section */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '20px 0' }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%',
                  maxWidth: '420px',
                  padding: '36px 20px',
                  border: '2px dashed rgba(0, 168, 132, 0.4)',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(0, 168, 132, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#00a884';
                  e.currentTarget.style.backgroundColor = 'rgba(0, 168, 132, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(0, 168, 132, 0.4)';
                  e.currentTarget.style.backgroundColor = 'rgba(0, 168, 132, 0.04)';
                }}
              >
                <CloudUploadIcon style={{ fontSize: '48px', color: '#00a884' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#e9edef', marginBottom: '4px' }}>
                    Click to upload photo from PC
                  </div>
                  <div style={{ fontSize: '12px', color: '#8696a0' }}>
                    Supports JPG, PNG, WEBP and GIF
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Studio Footer */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            backgroundColor: '#202c33',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              backgroundColor: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              color: '#8696a0',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !selectedAvatarImage}
            style={{
              padding: '9px 24px',
              backgroundColor: '#00a884',
              border: 'none',
              borderRadius: '8px',
              color: '#111b21',
              fontSize: '13.5px',
              fontWeight: '600',
              cursor: isSaving || !selectedAvatarImage ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(0, 168, 132, 0.3)',
            }}
          >
            {isSaving ? <CircularProgress size={16} style={{ color: '#111b21' }} /> : <DoneIcon style={{ fontSize: '18px' }} />}
            {isSaving ? 'Saving...' : saveButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}
