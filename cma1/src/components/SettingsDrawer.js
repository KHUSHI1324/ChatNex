import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  updatePrivacySettingsRoute,
  getBlockedUsersRoute,
  unblockUserRoute,
  blockUserRoute,
  setPasscodeRoute,
  updateProfileRoute,
} from '../utils/APIRoutes';
import { getAvatarSrc } from '../utils/avatarHelper';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SecurityIcon from '@mui/icons-material/Security';
import LockIcon from '@mui/icons-material/Lock';
import BlockIcon from '@mui/icons-material/Block';
import WallpaperIcon from '@mui/icons-material/Wallpaper';
import DoneIcon from '@mui/icons-material/Done';
import EditIcon from '@mui/icons-material/Edit';

export default function SettingsDrawer({
  currentUser,
  contacts = [],
  onClose,
  onUpdateCurrentUser,
  onLockAppNow,
  showToast,
}) {
  const [activeSection, setActiveSection] = useState('main'); // 'main' | 'profile' | 'privacy' | 'blocked' | 'passcode' | 'wallpaper'
  const [privacySettings, setPrivacySettings] = useState({
    lastSeen: currentUser?.privacySettings?.lastSeen || 'everyone',
    readReceipts: currentUser?.privacySettings?.readReceipts !== false,
    profilePhoto: currentUser?.privacySettings?.profilePhoto || 'everyone',
    email: currentUser?.privacySettings?.email || 'everyone',
    about: currentUser?.privacySettings?.about || 'everyone',
  });
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);

  // Profile About / Status
  const [aboutText, setAboutText] = useState(currentUser?.about || 'Hey there! I am using ChatNex.');
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [isSavingAbout, setIsSavingAbout] = useState(false);

  // Blocked users
  const [blockedList, setBlockedList] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [selectedContactToBlock, setSelectedContactToBlock] = useState('');

  // Passcode settings
  const [isPasscodeEnabled, setIsPasscodeEnabled] = useState(!!currentUser?.isPasscodeEnabled);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [isSavingPasscode, setIsSavingPasscode] = useState(false);

  // Wallpaper settings
  const [selectedWallpaper, setSelectedWallpaper] = useState(
    localStorage.getItem(`chatnex_wallpaper_${currentUser?._id}`) || 'default'
  );

  const fetchBlockedUsers = useCallback(async () => {
    try {
      setLoadingBlocked(true);
      const res = await axios.get(`${getBlockedUsersRoute}/${currentUser._id}`);
      if (res.data?.status) {
        setBlockedList(res.data.blockedUsers || []);
      }
    } catch (err) {
      console.error('Error fetching blocked users:', err);
    } finally {
      setLoadingBlocked(false);
    }
  }, [currentUser?._id]);

  useEffect(() => {
    if (currentUser?._id) {
      fetchBlockedUsers();
      if (currentUser?.about) setAboutText(currentUser.about);
      if (currentUser?.privacySettings) {
        setPrivacySettings({
          lastSeen: currentUser.privacySettings.lastSeen || 'everyone',
          readReceipts: currentUser.privacySettings.readReceipts !== false,
          profilePhoto: currentUser.privacySettings.profilePhoto || 'everyone',
          email: currentUser.privacySettings.email || 'everyone',
          about: currentUser.privacySettings.about || 'everyone',
        });
      }
    }
  }, [currentUser, fetchBlockedUsers]);

  const handleUpdatePrivacy = async (key, val) => {
    const updated = { ...privacySettings, [key]: val };
    setPrivacySettings(updated);
    try {
      setIsSavingPrivacy(true);
      const res = await axios.post(updatePrivacySettingsRoute, {
        userId: currentUser._id,
        privacySettings: updated,
      });
      if (res.data?.status) {
        const updatedUser = {
          ...currentUser,
          privacySettings: updated,
        };
        onUpdateCurrentUser(updatedUser);
        localStorage.setItem('chat-app-user', JSON.stringify(updatedUser));
        showToast?.('success', 'Privacy Updated', 'Your privacy settings were saved.');
      }
    } catch (err) {
      console.error('Error saving privacy settings:', err);
      showToast?.('error', 'Update Failed', 'Could not save privacy settings.');
    } finally {
      setIsSavingPrivacy(false);
    }
  };

  const handleSaveAbout = async (newAbout) => {
    const val = (newAbout !== undefined ? newAbout : aboutText).trim();
    if (!val) return;
    try {
      setIsSavingAbout(true);
      const res = await axios.post(updateProfileRoute, {
        userId: currentUser._id,
        about: val,
      });
      if (res.data?.status) {
        setAboutText(val);
        setIsEditingAbout(false);
        const updatedUser = {
          ...currentUser,
          about: val,
        };
        onUpdateCurrentUser(updatedUser);
        localStorage.setItem('chat-app-user', JSON.stringify(updatedUser));
        showToast?.('success', 'About Updated', 'Your status has been updated.');
      }
    } catch (err) {
      console.error('Error updating about status:', err);
      showToast?.('error', 'Error', 'Failed to update about status.');
    } finally {
      setIsSavingAbout(false);
    }
  };

  const handleUnblock = async (targetUserId) => {
    try {
      const res = await axios.post(unblockUserRoute, {
        userId: currentUser._id,
        targetUserId,
      });
      if (res.data?.status) {
        setBlockedList(res.data.blockedUsers || []);
        if (onUpdateCurrentUser) {
          const updatedUser = {
            ...currentUser,
            blockedUsers: res.data.blockedUsers || [],
          };
          onUpdateCurrentUser(updatedUser);
          localStorage.setItem('chat-app-user', JSON.stringify(updatedUser));
        }
        showToast?.('success', 'User Unblocked', 'Contact has been removed from block list.');
      }
    } catch (err) {
      console.error('Error unblocking user:', err);
      showToast?.('error', 'Error', 'Failed to unblock user.');
    }
  };

  const handleBlockUser = async () => {
    if (!selectedContactToBlock) return;
    try {
      const res = await axios.post(blockUserRoute, {
        userId: currentUser._id,
        targetUserId: selectedContactToBlock,
      });
      if (res.data?.status) {
        setBlockedList(res.data.blockedUsers || []);
        if (onUpdateCurrentUser) {
          const updatedUser = {
            ...currentUser,
            blockedUsers: res.data.blockedUsers || [],
          };
          onUpdateCurrentUser(updatedUser);
          localStorage.setItem('chat-app-user', JSON.stringify(updatedUser));
        }
        setSelectedContactToBlock('');
        showToast?.('info', 'User Blocked', 'Contact added to block list.');
      }
    } catch (err) {
      console.error('Error blocking user:', err);
      showToast?.('error', 'Error', 'Failed to block user.');
    }
  };

  const handleSavePasscode = async () => {
    setPasscodeError('');
    if (isPasscodeEnabled) {
      if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
        setPasscodeError('Please enter a valid 4-digit numeric PIN.');
        return;
      }
      if (newPin !== confirmPin) {
        setPasscodeError('PINs do not match.');
        return;
      }
    }

    try {
      setIsSavingPasscode(true);
      const res = await axios.post(setPasscodeRoute, {
        userId: currentUser._id,
        isPasscodeEnabled: isPasscodeEnabled,
        passcode: isPasscodeEnabled ? newPin : null,
      });

      if (res.data?.status) {
        const updatedUser = {
          ...currentUser,
          isPasscodeEnabled: isPasscodeEnabled,
        };
        onUpdateCurrentUser(updatedUser);
        localStorage.setItem('chat-app-user', JSON.stringify(updatedUser));
        showToast?.(
          'success',
          'Security Updated',
          isPasscodeEnabled ? 'Passcode Lock enabled successfully!' : 'Passcode Lock disabled.'
        );
        setNewPin('');
        setConfirmPin('');
        setActiveSection('main');
      }
    } catch (err) {
      console.error('Error saving passcode:', err);
      setPasscodeError('Failed to update passcode.');
    } finally {
      setIsSavingPasscode(false);
    }
  };

  const handleSelectWallpaper = (wpId) => {
    setSelectedWallpaper(wpId);
    localStorage.setItem(`chatnex_wallpaper_${currentUser?._id}`, wpId);
    window.dispatchEvent(new Event('chatnex_wallpaper_changed'));
    if (onUpdateCurrentUser) {
      onUpdateCurrentUser({
        ...currentUser,
        wallpaper: wpId,
      });
    }
    showToast?.('info', 'Wallpaper Changed', 'Chat background updated.');
  };

  const wallpaperThemes = [
    { id: 'default', name: 'WhatsApp Dark (Default)', preview: '#0b141a' },
    { id: 'doodle', name: 'ChatNex Doodle Pattern', preview: '#111b21' },
    { id: 'emerald', name: 'Emerald Forest', preview: '#062820' },
    { id: 'midnight', name: 'Midnight Navy', preview: '#0d1b2a' },
    { id: 'amethyst', name: 'Deep Purple', preview: '#1a1029' },
    { id: 'sunset', name: 'Warm Charcoal', preview: '#1c1917' },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: '#111b21',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        color: '#e9edef',
        animation: 'slideInLeft 0.25s ease-out',
      }}
    >
      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .settings-item {
          display: flex;
          align-items: center;
          padding: 14px 18px;
          cursor: pointer;
          transition: background 0.15s;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }
        .settings-item:hover {
          background-color: rgba(255, 255, 255, 0.05);
        }
        .radio-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          margin-bottom: 6px;
          border-radius: 8px;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.15s;
        }
        .radio-option:hover {
          background: rgba(0, 168, 132, 0.1);
          border-color: #00a884;
        }
        .radio-option.selected {
          background: rgba(0, 168, 132, 0.18);
          border-color: #00a884;
        }
        
        /* Modern ChatNex Toggle Switch */
        .chatnex-toggle {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
          flex-shrink: 0;
          cursor: pointer;
        }
        .chatnex-toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .chatnex-toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #374248;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 24px;
        }
        .chatnex-toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: #e9edef;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .chatnex-toggle input:checked + .chatnex-toggle-slider {
          background-color: #00a884;
        }
        .chatnex-toggle input:checked + .chatnex-toggle-slider:before {
          transform: translateX(20px);
          background-color: #ffffff;
        }
      `}</style>

      {/* Drawer Header */}
      <div
        style={{
          height: '60px',
          backgroundColor: '#202c33',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: '16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => {
            if (activeSection === 'main') {
              onClose();
            } else {
              setActiveSection('main');
            }
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#aebac1',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowBackIcon style={{ fontSize: '20px' }} />
        </button>
        <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '500', color: '#e9edef' }}>
          {activeSection === 'main' && 'Settings'}
          {activeSection === 'privacy' && 'Privacy'}
          {activeSection === 'blocked' && 'Blocked Contacts'}
          {activeSection === 'passcode' && 'App Lock & PIN'}
          {activeSection === 'wallpaper' && 'Chat Wallpaper'}
        </h3>
      </div>

      {/* Main Settings Menu */}
      {activeSection === 'main' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* User Profile & About Summary Card */}
          <div
            style={{
              padding: '20px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              borderBottom: '8px solid #0c1317',
              backgroundColor: '#111b21',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <img
                src={getAvatarSrc(currentUser?.avtarImage) || 'https://api.dicebear.com/7.x/bottts/svg?seed=ChatNex'}
                alt={currentUser?.username}
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #00a884',
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '17px', color: '#e9edef' }}>
                  {currentUser?.username}
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#8696a0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentUser?.email}
                </p>
              </div>
            </div>

            {/* About / Bio Status Box */}
            <div
              style={{
                backgroundColor: '#202c33',
                borderRadius: '8px',
                padding: '12px 14px',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isEditingAbout ? '10px' : '4px' }}>
                <span style={{ fontSize: '11.5px', color: '#00a884', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  About / Bio
                </span>
                {!isEditingAbout ? (
                  <EditIcon
                    style={{ fontSize: '16px', color: '#8696a0', cursor: 'pointer' }}
                    onClick={() => setIsEditingAbout(true)}
                    titleAccess="Edit About description"
                  />
                ) : (
                  <span
                    onClick={() => setIsEditingAbout(false)}
                    style={{ fontSize: '12px', color: '#8696a0', cursor: 'pointer' }}
                  >
                    Cancel
                  </span>
                )}
              </div>

              {!isEditingAbout ? (
                <div style={{ fontSize: '13.5px', color: '#e9edef', lineHeight: '1.4' }}>
                  {aboutText || 'Hey there! I am using ChatNex.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="text"
                    maxLength={150}
                    value={aboutText}
                    onChange={(e) => setAboutText(e.target.value)}
                    placeholder="Enter your status..."
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: '#111b21',
                      border: '1px solid #00a884',
                      borderRadius: '6px',
                      color: '#e9edef',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    autoFocus
                  />

                  {/* Preset quick status pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {[
                      'Available 💬',
                      'Busy 🔴',
                      'At work 💻',
                      'In a meeting 📅',
                      'Only urgent calls 📞',
                      'Hey there! I am using ChatNex.',
                    ].map((preset, idx) => (
                      <span
                        key={idx}
                        onClick={() => {
                          setAboutText(preset);
                          handleSaveAbout(preset);
                        }}
                        style={{
                          fontSize: '11px',
                          backgroundColor: 'rgba(255, 255, 255, 0.06)',
                          color: '#d1d7db',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 168, 132, 0.2)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)')}
                      >
                        {preset}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSaveAbout()}
                    disabled={isSavingAbout || !aboutText.trim()}
                    style={{
                      alignSelf: 'flex-end',
                      padding: '6px 16px',
                      backgroundColor: '#00a884',
                      color: '#111b21',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: '600',
                      cursor: isSavingAbout || !aboutText.trim() ? 'not-allowed' : 'pointer',
                      opacity: isSavingAbout || !aboutText.trim() ? 0.6 : 1,
                    }}
                  >
                    {isSavingAbout ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Settings Items */}
          <div className="settings-item" onClick={() => setActiveSection('privacy')}>
            <div style={{ color: '#00a884', marginRight: '16px' }}>
              <SecurityIcon />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', color: '#e9edef' }}>Privacy</div>
              <div style={{ fontSize: '12.5px', color: '#8696a0' }}>
                Email, about, last seen, profile photo
              </div>
            </div>
          </div>

          <div className="settings-item" onClick={() => setActiveSection('blocked')}>
            <div style={{ color: '#f15c6d', marginRight: '16px' }}>
              <BlockIcon />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', color: '#e9edef' }}>Blocked Contacts</div>
              <div style={{ fontSize: '12.5px', color: '#8696a0' }}>
                {blockedList.length} contacts blocked
              </div>
            </div>
          </div>

          <div className="settings-item" onClick={() => setActiveSection('passcode')}>
            <div style={{ color: '#00a884', marginRight: '16px' }}>
              <LockIcon />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', color: '#e9edef' }}>App Lock</div>
              <div style={{ fontSize: '12.5px', color: '#8696a0' }}>
                {currentUser?.isPasscodeEnabled ? 'Enabled with 4-digit PIN' : 'Disabled'}
              </div>
            </div>
          </div>

          <div className="settings-item" onClick={() => setActiveSection('wallpaper')}>
            <div style={{ color: '#53bdeb', marginRight: '16px' }}>
              <WallpaperIcon />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', color: '#e9edef' }}>Chat Wallpaper</div>
              <div style={{ fontSize: '12.5px', color: '#8696a0' }}>
                Custom themes & backgrounds
              </div>
            </div>
          </div>

          {/* Quick App Lock Action if PIN is enabled */}
          {currentUser?.isPasscodeEnabled && (
            <div style={{ padding: '24px 18px' }}>
              <button
                type="button"
                onClick={onLockAppNow}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'rgba(241,92,109,0.15)',
                  border: '1px solid #f15c6d',
                  borderRadius: '8px',
                  color: '#f15c6d',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.15s',
                }}
              >
                <LockIcon style={{ fontSize: '18px' }} />
                Lock App Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* Privacy Section */}
      {activeSection === 'privacy' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px' }}>
          {/* Email Privacy */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', color: '#00a884', textTransform: 'uppercase', fontWeight: '600', marginBottom: '10px' }}>
              Who can see my Email
            </div>
            {[
              { id: 'everyone', label: 'Everyone' },
              { id: 'contacts', label: 'My Contacts' },
              { id: 'nobody', label: 'Nobody' },
            ].map((opt) => (
              <div
                key={opt.id}
                className={`radio-option ${privacySettings.email === opt.id ? 'selected' : ''}`}
                onClick={() => handleUpdatePrivacy('email', opt.id)}
              >
                <span style={{ fontSize: '14px' }}>{opt.label}</span>
                {privacySettings.email === opt.id && (
                  <DoneIcon style={{ color: '#00a884', fontSize: '18px' }} />
                )}
              </div>
            ))}
          </div>

          {/* About / Description Privacy */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', color: '#00a884', textTransform: 'uppercase', fontWeight: '600', marginBottom: '10px' }}>
              Who can see my About / Bio
            </div>
            {[
              { id: 'everyone', label: 'Everyone' },
              { id: 'contacts', label: 'My Contacts' },
              { id: 'nobody', label: 'Nobody' },
            ].map((opt) => (
              <div
                key={opt.id}
                className={`radio-option ${privacySettings.about === opt.id ? 'selected' : ''}`}
                onClick={() => handleUpdatePrivacy('about', opt.id)}
              >
                <span style={{ fontSize: '14px' }}>{opt.label}</span>
                {privacySettings.about === opt.id && (
                  <DoneIcon style={{ color: '#00a884', fontSize: '18px' }} />
                )}
              </div>
            ))}
          </div>

          {/* Last Seen */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', color: '#00a884', textTransform: 'uppercase', fontWeight: '600', marginBottom: '10px' }}>
              Who can see my Last Seen & Online
            </div>
            {[
              { id: 'everyone', label: 'Everyone' },
              { id: 'contacts', label: 'My Contacts' },
              { id: 'nobody', label: 'Nobody' },
            ].map((opt) => (
              <div
                key={opt.id}
                className={`radio-option ${privacySettings.lastSeen === opt.id ? 'selected' : ''}`}
                onClick={() => handleUpdatePrivacy('lastSeen', opt.id)}
              >
                <span style={{ fontSize: '14px' }}>{opt.label}</span>
                {privacySettings.lastSeen === opt.id && (
                  <DoneIcon style={{ color: '#00a884', fontSize: '18px' }} />
                )}
              </div>
            ))}
          </div>

          {/* Profile Photo */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', color: '#00a884', textTransform: 'uppercase', fontWeight: '600', marginBottom: '10px' }}>
              Who can see my Profile Photo
            </div>
            {[
              { id: 'everyone', label: 'Everyone' },
              { id: 'contacts', label: 'My Contacts' },
              { id: 'nobody', label: 'Nobody' },
            ].map((opt) => (
              <div
                key={opt.id}
                className={`radio-option ${privacySettings.profilePhoto === opt.id ? 'selected' : ''}`}
                onClick={() => handleUpdatePrivacy('profilePhoto', opt.id)}
              >
                <span style={{ fontSize: '14px' }}>{opt.label}</span>
                {privacySettings.profilePhoto === opt.id && (
                  <DoneIcon style={{ color: '#00a884', fontSize: '18px' }} />
                )}
              </div>
            ))}
          </div>

          {/* Read Receipts */}
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14.5px', fontWeight: '500', color: '#e9edef' }}>Read Receipts (Blue Ticks)</span>
              <label className="chatnex-toggle">
                <input
                  type="checkbox"
                  checked={privacySettings.readReceipts}
                  onChange={(e) => handleUpdatePrivacy('readReceipts', e.target.checked)}
                />
                <span className="chatnex-toggle-slider"></span>
              </label>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#8696a0', lineHeight: '1.4' }}>
              If turned off, you won't send or receive Read receipts. Read receipts are always sent for group chats.
            </p>
          </div>
        </div>
      )}

      {/* Blocked Contacts Section */}
      {activeSection === 'blocked' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px' }}>
          {/* Add contact to block */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', color: '#8696a0', display: 'block', marginBottom: '8px' }}>
              Block a contact:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={selectedContactToBlock}
                onChange={(e) => setSelectedContactToBlock(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  backgroundColor: '#202c33',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  color: '#e9edef',
                  fontSize: '13.5px',
                  outline: 'none',
                }}
              >
                <option value="">Select a contact to block...</option>
                {contacts
                  .filter((c) => !c.isGroup && !blockedList.some((b) => (b._id || b).toString() === c._id.toString()))
                  .map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.username}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={handleBlockUser}
                disabled={!selectedContactToBlock}
                style={{
                  padding: '0 16px',
                  backgroundColor: selectedContactToBlock ? '#f15c6d' : 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: selectedContactToBlock ? 'pointer' : 'not-allowed',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
              >
                Block
              </button>
            </div>
          </div>

          <div style={{ fontSize: '13px', color: '#00a884', textTransform: 'uppercase', fontWeight: '600', marginBottom: '10px' }}>
            Blocked Contacts ({blockedList.length})
          </div>

          {loadingBlocked ? (
            <div style={{ color: '#8696a0', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
              Loading block list...
            </div>
          ) : blockedList.length === 0 ? (
            <div style={{ color: '#8696a0', fontSize: '13px', textAlign: 'center', padding: '30px 10px' }}>
              No blocked contacts. Blocked contacts will not be able to call you or send you messages.
            </div>
          ) : (
            <div>
              {blockedList.map((user) => (
                <div
                  key={user._id || user}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img
                      src={getAvatarSrc(user.avtarImage) || 'https://api.dicebear.com/7.x/bottts/svg?seed=block'}
                      alt={user.username || 'User'}
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontSize: '14.5px', color: '#e9edef', fontWeight: '500' }}>{user.username || 'Contact'}</div>
                      <div style={{ fontSize: '11.5px', color: '#8696a0' }}>{user.email || 'Blocked'}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUnblock(user._id || user)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: 'rgba(0,168,132,0.15)',
                      border: '1px solid #00a884',
                      borderRadius: '6px',
                      color: '#00a884',
                      fontSize: '12.5px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* App Lock & PIN Section */}
      {activeSection === 'passcode' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px' }}>
          <div style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: '500', color: '#e9edef' }}>Enable App Lock</span>
              <label className="chatnex-toggle">
                <input
                  type="checkbox"
                  checked={isPasscodeEnabled}
                  onChange={(e) => setIsPasscodeEnabled(e.target.checked)}
                />
                <span className="chatnex-toggle-slider"></span>
              </label>
            </div>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#8696a0', lineHeight: '1.4' }}>
              When enabled, you'll need to enter a 4-digit PIN every time you open or unlock ChatNex.
            </p>
          </div>

          {isPasscodeEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#8696a0', display: 'block', marginBottom: '6px' }}>
                  {currentUser?.isPasscodeEnabled ? 'Set New 4-Digit PIN:' : 'Enter 4-Digit PIN:'}
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    backgroundColor: '#202c33',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: '#e9edef',
                    fontSize: '18px',
                    letterSpacing: '8px',
                    textAlign: 'center',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: '#8696a0', display: 'block', marginBottom: '6px' }}>
                  Confirm 4-Digit PIN:
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    backgroundColor: '#202c33',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: '#e9edef',
                    fontSize: '18px',
                    letterSpacing: '8px',
                    textAlign: 'center',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}

          {passcodeError && (
            <div style={{ color: '#f15c6d', fontSize: '13px', marginBottom: '16px' }}>
              ⚠️ {passcodeError}
            </div>
          )}

          <button
            type="button"
            onClick={handleSavePasscode}
            disabled={isSavingPasscode}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#00a884',
              color: '#111b21',
              fontWeight: '600',
              fontSize: '14px',
              border: 'none',
              borderRadius: '8px',
              cursor: isSavingPasscode ? 'wait' : 'pointer',
            }}
          >
            {isSavingPasscode ? 'Saving...' : 'Save App Lock Settings'}
          </button>
        </div>
      )}

      {/* Chat Wallpaper Section */}
      {activeSection === 'wallpaper' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px' }}>
          <div style={{ fontSize: '13px', color: '#00a884', textTransform: 'uppercase', fontWeight: '600', marginBottom: '14px' }}>
            Choose Chat Wallpaper
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {wallpaperThemes.map((wp) => (
              <div
                key={wp.id}
                onClick={() => handleSelectWallpaper(wp.id)}
                style={{
                  height: '110px',
                  borderRadius: '10px',
                  backgroundColor: wp.preview,
                  border: selectedWallpaper === wp.id ? '2px solid #00a884' : '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  padding: '10px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.15s',
                }}
              >
                {selectedWallpaper === wp.id && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: '#00a884',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#111b21',
                    }}
                  >
                    <DoneIcon style={{ fontSize: '16px' }} />
                  </div>
                )}
                <span style={{ fontSize: '12px', fontWeight: '500', color: '#e9edef' }}>
                  {wp.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

