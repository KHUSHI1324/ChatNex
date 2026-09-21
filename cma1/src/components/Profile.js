import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import CircularProgress from '@mui/material/CircularProgress';
import axios from 'axios';
import { AvtarRoute, updateProfileRoute } from '../utils/APIRoutes';
import { getAvatarSrc } from '../utils/avatarHelper';
import { MODERN_AVATARS, generateCustomAiAvatar } from '../utils/avatarCollection';
import Logout from './Logout';

export default function Profile({
  currentUser,
  currentUserName,
  currentUserImage,
  email,
  onUpdateAvatar,
  onUpdateCurrentUser,
}) {
  const [showProfile, setShowProfile] = useState(false);
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  // About status state
  const [aboutText, setAboutText] = useState(currentUser?.about || 'Hey there! I am using ChatNex.');
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [isSavingAbout, setIsSavingAbout] = useState(false);

  // AI Modal states
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiPreview, setAiPreview] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  useEffect(() => {
    if (currentUser?.about) {
      setAboutText(currentUser.about);
    }
  }, [currentUser?.about]);

  const fileInputRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    };

    if (showProfile) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfile]);

  const handleClick = () => {
    setShowProfile((prevState) => !prevState);
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?._id) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = reader.result;

        const res = await axios.post(`${AvtarRoute}/${currentUser._id}`, {
          image: result,
        });

        if (res.data?.isSet) {
          const updatedUser = {
            ...currentUser,
            isAvtarImageSet: true,
            avtarImage: res.data.image,
          };
          localStorage.setItem('chat-app-user', JSON.stringify(updatedUser));
          if (onUpdateAvatar) {
            onUpdateAvatar(res.data.image);
          }
          setUploadSuccess(true);
          setTimeout(() => setUploadSuccess(false), 3000);
        }
      } catch (err) {
        console.error('Error updating profile picture:', err);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAiAvatar = async (e) => {
    if (e) e.preventDefault();
    if (!aiPrompt.trim()) return;

    setIsGenerating(true);
    try {
      const seed = currentUser?.username || currentUser?._id || aiPrompt;
      const generated = await generateCustomAiAvatar(aiPrompt, '3d avatar', seed);
      setAiPreview(generated);
      setSelectedPreset(null);
    } catch (err) {
      console.error('Error generating AI avatar in Profile:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyAiOrPresetAvatar = async () => {
    const avatarToApply = aiPreview || selectedPreset;
    if (!avatarToApply || !currentUser?._id) return;

    setIsSavingAvatar(true);
    try {
      const res = await axios.post(`${AvtarRoute}/${currentUser._id}`, {
        image: avatarToApply,
      });

      if (res.data?.isSet) {
        const updatedUser = {
          ...currentUser,
          isAvtarImageSet: true,
          avtarImage: res.data.image,
        };
        localStorage.setItem('chat-app-user', JSON.stringify(updatedUser));
        if (onUpdateAvatar) {
          onUpdateAvatar(res.data.image);
        }
        setShowAiModal(false);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error applying AI avatar:', err);
    } finally {
      setIsSavingAvatar(false);
    }
  };

  return (
    <div className='profile-btn-wrapper' ref={profileRef} style={{ position: 'relative' }}>
      <input
        type='file'
        ref={fileInputRef}
        accept='image/*'
        style={{ display: 'none' }}
        onChange={handleAvatarFileChange}
      />

      {/* Profile Avatar Button on Sidebar Footer */}
      <div
        className='profile-icon-circle'
        title='View your profile'
        onClick={handleClick}
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          border: '1.5px solid rgba(255, 255, 255, 0.25)',
          backgroundColor: '#111b21',
          transition: 'transform 0.15s, border-color 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#00a884')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)')}
      >
        {currentUserImage ? (
          <img
            src={getAvatarSrc(currentUserImage)}
            alt='profile'
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <AccountCircleIcon style={{ width: '100%', height: '100%', color: '#8696a0' }} />
        )}
      </div>

      {/* Profile Popup Card */}
      {showProfile && (
        <ProfilePopup>
          <div className='profile-card-content'>
            <div
              style={{
                position: 'relative',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                cursor: 'pointer',
                marginBottom: '12px',
              }}
              onMouseEnter={() => setIsHoveringAvatar(true)}
              onMouseLeave={() => setIsHoveringAvatar(false)}
              onClick={() => fileInputRef.current?.click()}
              title='Click to change profile picture'
            >
              {currentUserImage ? (
                <img
                  src={getAvatarSrc(currentUserImage)}
                  alt='profile'
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    border: '2px solid #00a884',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <AccountCircleIcon style={{ fontSize: '80px', color: '#00a884' }} />
              )}

              {/* Hover Camera Icon Overlay */}
              {isHoveringAvatar && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                  }}
                >
                  <PhotoCameraIcon style={{ fontSize: '24px' }} />
                  <span style={{ fontSize: '9px', marginTop: '2px' }}>Upload</span>
                </div>
              )}
            </div>

            {uploadSuccess && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#00a884',
                  fontSize: '11.5px',
                  marginBottom: '8px',
                }}
              >
                <CheckCircleIcon style={{ fontSize: '14px' }} /> Profile photo updated!
              </div>
            )}

            {isUploading && (
              <div style={{ color: '#8696a0', fontSize: '11.5px', marginBottom: '8px' }}>
                Updating photo...
              </div>
            )}

            <h3 style={{ margin: '0 0 4px 0', color: '#e9edef', fontSize: '17px', fontWeight: '600' }}>
              {currentUserName || 'User'}
            </h3>
            <p style={{ margin: '0 0 10px 0', color: '#8696a0', fontSize: '12px' }}>
              {email || 'user@chatnex.com'}
            </p>

            {/* About / Status */}
            <div
              style={{
                width: '100%',
                backgroundColor: '#182229',
                borderRadius: '8px',
                padding: '8px 10px',
                marginBottom: '14px',
                border: '1px solid rgba(255,255,255,0.06)',
                boxSizing: 'border-box',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '10.5px', color: '#00a884', fontWeight: '600', textTransform: 'uppercase' }}>
                  About
                </span>
                {!isEditingAbout ? (
                  <EditIcon
                    style={{ fontSize: '14px', color: '#8696a0', cursor: 'pointer' }}
                    onClick={() => setIsEditingAbout(true)}
                    titleAccess="Edit status"
                  />
                ) : (
                  <span
                    onClick={() => setIsEditingAbout(false)}
                    style={{ fontSize: '11px', color: '#8696a0', cursor: 'pointer' }}
                  >
                    Cancel
                  </span>
                )}
              </div>

              {!isEditingAbout ? (
                <div style={{ fontSize: '12px', color: '#d1d7db', lineHeight: '1.3', wordBreak: 'break-word' }}>
                  {aboutText || 'Hey there! I am using ChatNex.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <input
                    type="text"
                    maxLength={150}
                    value={aboutText}
                    onChange={(e) => setAboutText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '5px 8px',
                      backgroundColor: '#111b21',
                      border: '1px solid #00a884',
                      borderRadius: '4px',
                      color: '#e9edef',
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!aboutText.trim() || !currentUser?._id) return;
                      setIsSavingAbout(true);
                      try {
                        const res = await axios.post(updateProfileRoute, {
                          userId: currentUser._id,
                          about: aboutText.trim(),
                        });
                        if (res.data?.status) {
                          setIsEditingAbout(false);
                          const updatedUser = { ...currentUser, about: aboutText.trim() };
                          localStorage.setItem('chat-app-user', JSON.stringify(updatedUser));
                          if (onUpdateCurrentUser) onUpdateCurrentUser(updatedUser);
                        }
                      } catch (err) {
                        console.error('Error saving about:', err);
                      } finally {
                        setIsSavingAbout(false);
                      }
                    }}
                    disabled={isSavingAbout}
                    style={{
                      alignSelf: 'flex-end',
                      padding: '4px 12px',
                      backgroundColor: '#00a884',
                      color: '#111b21',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    {isSavingAbout ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            {/* Quick Actions: Upload Photo & AI Avatar Generator */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginBottom: '14px' }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  color: '#e9edef',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#182229',
                  border: '1px solid rgba(255,255,255,0.08)',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#202c33')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#182229')}
              >
                <PhotoCameraIcon style={{ fontSize: '15px', color: '#8696a0' }} /> Upload Photo
              </div>

              <div
                onClick={() => setShowAiModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  color: '#00a884',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, rgba(0,168,132,0.15), rgba(0,210,211,0.15))',
                  border: '1px solid rgba(0,168,132,0.3)',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#00a884')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(0,168,132,0.3)')}
              >
                <AutoAwesomeIcon style={{ fontSize: '15px' }} /> Create AI Avatar
              </div>
            </div>
          </div>
          <Logout />
        </ProfilePopup>
      )}

      {/* AI Avatar Creator Modal Dialog */}
      {showAiModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setShowAiModal(false)}
        >
          <div
            style={{
              backgroundColor: '#111b21',
              borderRadius: '16px',
              width: '460px',
              maxWidth: '92vw',
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.8)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AutoAwesomeIcon style={{ color: '#00a884', fontSize: '22px' }} />
                <h3 style={{ margin: 0, color: '#e9edef', fontSize: '18px', fontWeight: '600' }}>
                  AI Avatar Creator
                </h3>
              </div>
              <div
                onClick={() => setShowAiModal(false)}
                style={{ cursor: 'pointer', color: '#8696a0', display: 'flex' }}
              >
                <CloseIcon style={{ fontSize: '20px' }} />
              </div>
            </div>

            {/* Prompt Form */}
            <form onSubmit={handleGenerateAiAvatar} style={{ display: 'flex', gap: '8px' }}>
              <input
                type='text'
                placeholder='e.g. "anime girl with purple hair", "cool boy with sunglasses"...'
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                style={{
                  flex: 1,
                  backgroundColor: '#202c33',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  color: '#e9edef',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <button
                type='submit'
                disabled={isGenerating || !aiPrompt.trim()}
                style={{
                  background: 'linear-gradient(135deg, #00a884, #00d2d3)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0 16px',
                  color: '#111b21',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: isGenerating || !aiPrompt.trim() ? 'not-allowed' : 'pointer',
                  opacity: isGenerating || !aiPrompt.trim() ? 0.6 : 1,
                }}
              >
                {isGenerating ? <CircularProgress size={16} style={{ color: '#111b21' }} /> : 'Generate'}
              </button>
            </form>

            {/* Live Preview / Curated Presets */}
            {aiPreview ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px',
                  backgroundColor: '#182229',
                  borderRadius: '10px',
                  border: '1px solid rgba(0,168,132,0.3)',
                }}
              >
                <img
                  src={getAvatarSrc(aiPreview)}
                  alt='AI Generated'
                  style={{ width: '88px', height: '88px', borderRadius: '50%', border: '3px solid #00a884' }}
                />
                <span style={{ color: '#8696a0', fontSize: '12px', fontStyle: 'italic' }}>"{aiPrompt}"</span>
                <button
                  type='button'
                  onClick={handleGenerateAiAvatar}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#00a884',
                    borderRadius: '6px',
                    padding: '4px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <RefreshIcon style={{ fontSize: '14px' }} /> Regenerate Variation
                </button>
              </div>
            ) : (
              <div>
                <span style={{ color: '#8696a0', fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                  Or pick a modern preset:
                </span>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '10px',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    padding: '4px',
                  }}
                >
                  {MODERN_AVATARS.slice(0, 8).map((av) => {
                    const isSelected = selectedPreset === av.image;
                    return (
                      <div
                        key={av.id}
                        onClick={() => {
                          setSelectedPreset(av.image);
                          setAiPreview(null);
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '6px',
                          borderRadius: '8px',
                          backgroundColor: isSelected ? 'rgba(0,168,132,0.2)' : '#182229',
                          border: isSelected ? '2px solid #00a884' : '1px solid transparent',
                          cursor: 'pointer',
                        }}
                      >
                        <img
                          src={getAvatarSrc(av.image)}
                          alt={av.name}
                          style={{ width: '48px', height: '48px', borderRadius: '50%' }}
                        />
                        <span style={{ color: '#e9edef', fontSize: '11px', marginTop: '4px' }}>{av.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button
                type='button'
                onClick={() => setShowAiModal(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#8696a0',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={handleApplyAiOrPresetAvatar}
                disabled={isSavingAvatar || (!aiPreview && !selectedPreset)}
                style={{
                  backgroundColor: '#00a884',
                  border: 'none',
                  color: '#111b21',
                  fontWeight: '600',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  cursor: isSavingAvatar || (!aiPreview && !selectedPreset) ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  opacity: isSavingAvatar || (!aiPreview && !selectedPreset) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isSavingAvatar ? <CircularProgress size={16} style={{ color: '#111b21' }} /> : null}
                {isSavingAvatar ? 'Applying...' : 'Set as DP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ProfilePopup = styled.div`
  position: fixed;
  bottom: 20px;
  left: 65px;
  width: 260px;
  background-color: #202c33;
  z-index: 9999;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  padding: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-sizing: border-box;

  .profile-card-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }
`;
