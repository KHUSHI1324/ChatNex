import React, { useState } from 'react';
import axios from 'axios';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import GroupsIcon from '@mui/icons-material/Groups';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CircularProgress from '@mui/material/CircularProgress';
import { createGroupRoute } from '../utils/APIRoutes';
import { getAvatarSrc } from '../utils/avatarHelper';
import AvatarStudioModal from './AvatarStudioModal';

export default function GroupsPanel({
  contacts = [],
  groups = [],
  currentUser,
  onSelectContact,
  onGroupCreated,
  socket,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupAvatar, setGroupAvatar] = useState('');
  const [showGroupAvatarStudio, setShowGroupAvatarStudio] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [successPopupData, setSuccessPopupData] = useState(null); // { group, memberCount }
  const [errorPopup, setErrorPopup] = useState(null); // { title, message }

  const toggleMember = (contactId) => {
    setSelectedMembers((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    );
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || !currentUser?._id) return;

    try {
      setIsCreating(true);
      const payload = {
        name: groupName.trim(),
        members: selectedMembers,
        admin: currentUser._id,
        groupImage: groupAvatar || undefined,
      };

      const response = await axios.post(createGroupRoute, payload);
      const createdGroup = response.data.group;

      // Broadcast to other group members in real-time via socket
      if (socket?.current) {
        socket.current.emit('create-group', {
          group: createdGroup,
          creator: currentUser,
        });
      }

      if (onGroupCreated) {
        onGroupCreated(createdGroup);
      }

      // Close create modal and open Success In-App Popup
      setShowCreateModal(false);
      setSuccessPopupData({
        group: createdGroup,
        name: groupName.trim(),
        memberCount: selectedMembers.length + 1, // members + admin
      });

      setGroupName('');
      setGroupAvatar('');
      setSelectedMembers([]);
      setMemberSearchQuery('');
    } catch (err) {
      console.error('Error creating group:', err);
      const errMsg = err.response?.data?.msg || err.message || 'Failed to create group';
      setErrorPopup({
        title: 'Group Creation Failed',
        message: `${errMsg}.\nPlease make sure the backend server is running.`,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const filteredGroups = groups.filter((g) =>
    (g.name || g.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContactsForModal = contacts.filter((c) =>
    c.username.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  return (
    <div
      className="groups-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: '#111b21',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Success Popup Modal */}
      {successPopupData && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setSuccessPopupData(null)}
        >
          <div
            style={{
              backgroundColor: '#202c33',
              borderRadius: '14px',
              padding: '24px 20px',
              width: '320px',
              maxWidth: '90%',
              textAlign: 'center',
              boxShadow: '0 12px 36px rgba(0,0,0,0.7)',
              border: '1px solid rgba(0, 168, 132, 0.3)',
              transform: 'scale(1)',
              animation: 'popIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 168, 132, 0.15)',
                color: '#00a884',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <CheckCircleOutlineIcon style={{ fontSize: '42px' }} />
            </div>

            <h3 style={{ margin: '0 0 8px 0', color: '#e9edef', fontSize: '18px', fontWeight: '700' }}>
              Group Created!
            </h3>

            <p style={{ color: '#8696a0', fontSize: '13.5px', margin: '0 0 20px 0', lineHeight: '1.4' }}>
              Group <strong style={{ color: '#00a884' }}>"{successPopupData.name}"</strong> has been created with{' '}
              <strong>{successPopupData.memberCount} members</strong>. It is now visible to all members!
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setSuccessPopupData(null)}
                style={{
                  flex: 1,
                  backgroundColor: '#111b21',
                  color: '#8696a0',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onSelectContact && successPopupData.group) {
                    onSelectContact(successPopupData.group);
                  }
                  setSuccessPopupData(null);
                }}
                style={{
                  flex: 1.2,
                  backgroundColor: '#00a884',
                  color: '#111b21',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,168,132,0.4)',
                }}
              >
                Open Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          padding: '14px 16px 8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#111b21',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
          <span style={{ color: '#00a884', fontWeight: '800', fontSize: '20px', letterSpacing: '-0.01em', lineHeight: '1.1' }}>
            ChatNex
          </span>
          <span style={{ color: '#8696a0', fontSize: '17px', fontWeight: '600', letterSpacing: '0.2px', marginTop: '2px', lineHeight: '1.2' }}>
            Groups
          </span>
        </div>
        <div
          title="New Group"
          onClick={() => setShowCreateModal(true)}
          style={{
            cursor: 'pointer',
            color: '#00a884',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0,168,132,0.1)',
            transition: 'background 0.2s',
          }}
        >
          <GroupAddIcon style={{ fontSize: '20px' }} />
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ padding: '8px 12px', backgroundColor: '#111b21' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#202c33',
            borderRadius: '8px',
            padding: '5px 10px',
            gap: '8px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <SearchIcon style={{ color: '#8696a0', fontSize: '20px' }} />
          <input
            type="text"
            placeholder="Search groups"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#e9edef',
              fontSize: '13.5px',
            }}
          />
          {searchQuery && (
            <span
              onClick={() => setSearchQuery('')}
              style={{ color: '#8696a0', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
            >
              ✕
            </span>
          )}
        </div>
      </div>

      {/* New Group Action Banner */}
      <div
        onClick={() => setShowCreateModal(true)}
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          backgroundColor: '#182229',
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#202c33')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#182229')}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            backgroundColor: '#00a884',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#111b21',
            flexShrink: 0,
          }}
        >
          <GroupAddIcon style={{ fontSize: '22px' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#e9edef', fontSize: '15px', fontWeight: '500' }}>New Group</div>
          <div style={{ color: '#8696a0', fontSize: '12.5px' }}>Create a group with your contacts</div>
        </div>
      </div>

      {/* Section Title */}
      <div
        style={{
          padding: '12px 16px 6px 16px',
          color: '#8696a0',
          fontSize: '12px',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Your Groups {groups.length > 0 && `(${groups.length})`}
      </div>

      {/* Groups List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {filteredGroups.length > 0 ? (
          filteredGroups.map((group) => {
            const memberCount = group.members ? group.members.length : 0;
            const lastMsgPreview = group.latestMessage?.message || `${memberCount} members`;

            return (
              <div
                key={group._id}
                onClick={() => onSelectContact && onSelectContact(group)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  gap: '12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'background 0.15s',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#202c33')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                {/* Group Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img
                    src={getAvatarSrc(group.avtarImage)}
                    alt={group.name}
                    style={{
                      width: '45px',
                      height: '45px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      display: 'block',
                      border: '1px solid rgba(0, 168, 132, 0.3)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      backgroundColor: '#00a884',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#111b21',
                    }}
                  >
                    <GroupsIcon style={{ fontSize: '12px' }} />
                  </div>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        color: '#e9edef',
                        fontSize: '15.5px',
                        fontWeight: '600',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {group.name || group.username}
                    </span>
                    <span style={{ color: '#8696a0', fontSize: '11px' }}>
                      {memberCount} members
                    </span>
                  </div>
                  <span
                    style={{
                      color: '#8696a0',
                      fontSize: '13px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {lastMsgPreview}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '36px 16px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#202c33',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8696a0',
                marginBottom: '14px',
              }}
            >
              <GroupsIcon style={{ fontSize: '36px' }} />
            </div>
            <h4 style={{ color: '#e9edef', margin: '0 0 6px 0', fontSize: '16px' }}>Stay connected with Groups</h4>
            <p style={{ color: '#8696a0', fontSize: '13px', margin: '0 0 16px 0', maxWidth: '240px', lineHeight: '1.4' }}>
              Groups make it easy to talk, share media, and organize with multiple people.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              style={{
                backgroundColor: '#00a884',
                color: '#111b21',
                border: 'none',
                borderRadius: '20px',
                padding: '8px 18px',
                fontWeight: '600',
                fontSize: '13.5px',
                cursor: 'pointer',
              }}
            >
              Create New Group
            </button>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => !isCreating && setShowCreateModal(false)}
        >
          <div
            style={{
              backgroundColor: '#202c33',
              borderRadius: '12px',
              width: '400px',
              maxWidth: '92vw',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GroupsIcon style={{ color: '#00a884', fontSize: '24px' }} />
                <h3 style={{ margin: 0, color: '#e9edef', fontSize: '18px' }}>Create New Group</h3>
              </div>
              <span
                onClick={() => !isCreating && setShowCreateModal(false)}
                style={{ color: '#8696a0', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}
              >
                ✕
              </span>
            </div>

            <form onSubmit={handleCreateGroup}>
              {/* Group Avatar Picker */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                <div
                  onClick={() => setShowGroupAvatarStudio(true)}
                  style={{
                    position: 'relative',
                    width: '76px',
                    height: '76px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    border: '2.5px solid #00a884',
                    backgroundColor: '#111b21',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0, 168, 132, 0.3)',
                    transition: 'transform 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  title="Click to choose 3D avatar, create with AI, or upload group picture"
                >
                  {groupAvatar ? (
                    <img
                      src={getAvatarSrc(groupAvatar)}
                      alt="Group Avatar"
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <GroupsIcon style={{ fontSize: '38px', color: '#00a884' }} />
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      backgroundColor: '#00a884',
                      color: '#111b21',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #202c33',
                    }}
                  >
                    <PhotoCameraIcon style={{ fontSize: '14px' }} />
                  </div>
                </div>
              </div>

              {/* Group Name Input */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ color: '#8696a0', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                  Group Name
                </label>
                <input
                  type="text"
                  placeholder="Enter group subject..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                  disabled={isCreating}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    backgroundColor: '#111b21',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Members Selection */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ color: '#8696a0', fontSize: '12px' }}>
                    Select Members ({selectedMembers.length} selected)
                  </label>
                  {selectedMembers.length > 0 && (
                    <span
                      onClick={() => setSelectedMembers([])}
                      style={{ color: '#00a884', fontSize: '11.5px', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Clear all
                    </span>
                  )}
                </div>

                {/* Member filter input */}
                <input
                  type="text"
                  placeholder="Search contacts to add..."
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    backgroundColor: '#111b21',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '12.5px',
                    outline: 'none',
                    marginBottom: '8px',
                    boxSizing: 'border-box',
                  }}
                />

                <div
                  style={{
                    maxHeight: '190px',
                    overflowY: 'auto',
                    backgroundColor: '#111b21',
                    borderRadius: '6px',
                    padding: '6px',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {filteredContactsForModal.length > 0 ? (
                    filteredContactsForModal.map((c) => {
                      const isSelected = selectedMembers.includes(c._id);
                      return (
                        <div
                          key={c._id}
                          onClick={() => toggleMember(c._id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? 'rgba(0,168,132,0.15)' : 'transparent',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {/* Modern WhatsApp Circle Checkbox */}
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: isSelected ? '#00a884' : 'transparent',
                              border: isSelected ? '2px solid #00a884' : '2px solid rgba(255, 255, 255, 0.25)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              boxShadow: isSelected ? '0 0 8px rgba(0,168,132,0.4)' : 'none',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {isSelected && (
                              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="#111b21" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <img
                            src={getAvatarSrc(c.avtarImage)}
                            alt={c.username}
                            style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: isSelected ? '1.5px solid #00a884' : '1.5px solid rgba(255,255,255,0.1)' }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: '#e9edef', fontSize: '13.5px', fontWeight: isSelected ? '600' : '400', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {c.username}
                            </div>
                            {c.email && (
                              <div style={{ color: '#8696a0', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {c.email}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#8696a0', fontSize: '12px' }}>
                      No contacts found
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    color: '#8696a0',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !groupName.trim()}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: '#00a884',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#111b21',
                    fontSize: '13.5px',
                    fontWeight: '600',
                    cursor: isCreating || !groupName.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isCreating ? <CircularProgress size={16} style={{ color: '#111b21' }} /> : null}
                  {isCreating ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Avatar Studio Modal */}
      {showGroupAvatarStudio && (
        <AvatarStudioModal
          isOpen={showGroupAvatarStudio}
          onClose={() => setShowGroupAvatarStudio(false)}
          currentImage={groupAvatar}
          title="Group Avatar Studio"
          subtitle="Choose a 3D icon, generate with AI, or upload a custom group picture"
          saveButtonText="Select for Group"
          onSelectAvatar={(img) => {
            setGroupAvatar(img);
            setShowGroupAvatarStudio(false);
          }}
        />
      )}

      {/* In-App Error Popup Modal */}
      {errorPopup && (
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
          onClick={() => setErrorPopup(null)}
        >
          <div
            style={{
              backgroundColor: '#202c33',
              borderRadius: '12px',
              width: '380px',
              maxWidth: '90vw',
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.7)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(234, 134, 143, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ea868f',
                  fontSize: '18px',
                  flexShrink: 0,
                }}
              >
                ⚠️
              </div>
              <h3 style={{ margin: 0, color: '#e9edef', fontSize: '17px', fontWeight: '600' }}>
                {errorPopup.title || 'Notice'}
              </h3>
            </div>

            <p style={{ margin: 0, color: '#8696a0', fontSize: '13.5px', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
              {errorPopup.message}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setErrorPopup(null)}
                style={{
                  backgroundColor: '#00a884',
                  border: 'none',
                  color: '#111b21',
                  fontWeight: '600',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13.5px',
                  transition: 'background 0.2s',
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
