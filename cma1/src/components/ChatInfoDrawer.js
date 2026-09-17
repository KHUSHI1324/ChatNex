import React, { useState, useRef } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import CallIcon from '@mui/icons-material/Call';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import MessageIcon from '@mui/icons-material/Message';
import GroupsIcon from '@mui/icons-material/Groups';
import SearchIcon from '@mui/icons-material/Search';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import EmailIcon from '@mui/icons-material/Email';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { getAvatarSrc } from '../utils/avatarHelper';

export default function ChatInfoDrawer({
  chat,
  currentUser,
  contacts = [],
  onClose,
  onOpenDirectChat,
  onStartCall,
  onAddMembersToGroup,
  onRemoveMemberFromGroup,
  onMakeAdmin,
  onDismissAdmin,
  onUpdateGroupAvatar,
  onLeaveGroup,
  onDeleteGroup,
}) {
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedNewMembers, setSelectedNewMembers] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null); // { type: 'leave' | 'delete' | 'remove_member', title, message, targetMember }
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
  const fileInputRef = useRef(null);

  if (!chat) return null;

  const isGroup = Boolean(chat.isGroup);
  const members = chat.members || [];
  const adminId = (chat.admin?._id || chat.admin || '').toString();
  const currentUserIdStr = (currentUser?._id || '').toString();
  const isCurrentUserAdmin =
    adminId === currentUserIdStr ||
    (Array.isArray(chat?.admins) &&
      chat.admins.some((a) => (a?._id || a || '').toString() === currentUserIdStr));

  const isCurrentMember = isGroup ? (
    chat.isCurrentMember !== undefined
      ? chat.isCurrentMember
      : members.some((m) => (m._id || m).toString() === currentUserIdStr) || isCurrentUserAdmin
  ) : true;

  const filteredMembers = members.filter((m) =>
    (m.username || '').toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  // Available contacts that are not yet in the group
  const existingMemberIds = new Set(members.map((m) => (m._id || m).toString()));
  const availableToAdd = contacts.filter(
    (c) => !c.isGroup && !existingMemberIds.has((c._id || c).toString())
  );

  const toggleNewMember = (id) => {
    setSelectedNewMembers((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirmAddMembers = () => {
    if (selectedNewMembers.length === 0) return;
    if (onAddMembersToGroup) {
      onAddMembersToGroup(chat._id, selectedNewMembers);
    }
    setShowAddMemberModal(false);
    setSelectedNewMembers([]);
  };

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (onUpdateGroupAvatar && isGroup) {
        onUpdateGroupAvatar(chat._id, result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmAction = () => {
    if (!confirmDialog) return;
    if (confirmDialog.type === 'leave') {
      if (onLeaveGroup) onLeaveGroup(chat._id);
    } else if (confirmDialog.type === 'delete') {
      if (onDeleteGroup) onDeleteGroup(chat._id);
    } else if (confirmDialog.type === 'remove_member') {
      if (onRemoveMemberFromGroup && confirmDialog.targetMember) {
        onRemoveMemberFromGroup(chat._id, confirmDialog.targetMember._id);
      }
    } else if (confirmDialog.type === 'make_admin') {
      if (onMakeAdmin && confirmDialog.targetMember) {
        onMakeAdmin(chat._id, confirmDialog.targetMember._id);
      }
    } else if (confirmDialog.type === 'dismiss_admin') {
      if (onDismissAdmin && confirmDialog.targetMember) {
        onDismissAdmin(chat._id, confirmDialog.targetMember._id);
      }
    }
    setConfirmDialog(null);
  };


  return (
    <div
      className="chat-info-drawer"
      style={{
        width: '380px',
        minWidth: '320px',
        height: '100%',
        backgroundColor: '#111b21',
        borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 30,
        boxSizing: 'border-box',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      {/* Hidden file input for updating group avatar */}
      {isGroup && (
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleAvatarFileChange}
        />
      )}

      {/* Drawer Header */}
      <div
        style={{
          height: '60px',
          minHeight: '60px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '0 18px',
          backgroundColor: '#202c33',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          boxSizing: 'border-box',
        }}
      >
        <div
          onClick={onClose}
          style={{
            cursor: 'pointer',
            color: '#8696a0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            borderRadius: '50%',
            transition: 'background 0.2s',
          }}
          title="Close details"
        >
          <CloseIcon style={{ fontSize: '20px' }} />
        </div>
        <h3 style={{ margin: 0, color: '#e9edef', fontSize: '17px', fontWeight: '600' }}>
          {isGroup ? 'Group info' : 'Contact info'}
        </h3>
      </div>

      {/* Scrollable Content Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          padding: '16px 0',
        }}
      >
        {/* Profile Card Section */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: '#111b21',
            padding: '16px 20px 24px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            textAlign: 'center',
          }}
        >
          <div
            style={{ position: 'relative', marginBottom: '14px', cursor: isGroup ? 'pointer' : 'default' }}
            onMouseEnter={() => setIsHoveringAvatar(true)}
            onMouseLeave={() => setIsHoveringAvatar(false)}
            onClick={() => {
              if (isGroup && fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
            title={isGroup ? 'Click to change group picture' : undefined}
          >
            <img
              src={getAvatarSrc(chat.avtarImage)}
              alt={chat.name || chat.username}
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid rgba(0, 168, 132, 0.4)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              }}
            />

            {/* Hover Camera Overlay for Group */}
            {isGroup && isHoveringAvatar && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0, 0, 0, 0.65)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  gap: '4px',
                  animation: 'fadeIn 0.15s ease-in-out',
                }}
              >
                <PhotoCameraIcon style={{ fontSize: '28px' }} />
                <span style={{ fontSize: '11px', fontWeight: '500' }}>Change Photo</span>
              </div>
            )}

            {isGroup && !isHoveringAvatar && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  right: '4px',
                  backgroundColor: '#00a884',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#111b21',
                  border: '2px solid #111b21',
                }}
              >
                <GroupsIcon style={{ fontSize: '18px' }} />
              </div>
            )}
          </div>

          <h2 style={{ margin: '0 0 6px 0', color: '#e9edef', fontSize: '20px', fontWeight: '600' }}>
            {chat.name || chat.username}
          </h2>

          <span style={{ color: '#8696a0', fontSize: '13px', marginBottom: '18px' }}>
            {isGroup
              ? `Group • ${members.length} member${members.length !== 1 ? 's' : ''}`
              : chat.email || 'ChatNex User'}
          </span>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div
              onClick={() => onStartCall && onStartCall(chat, 'audio')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
              title="Voice call"
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#202c33',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00a884',
                  border: '1px solid rgba(255,255,255,0.08)',
                  transition: 'background 0.2s',
                }}
              >
                <CallIcon style={{ fontSize: '20px' }} />
              </div>
              <span style={{ color: '#00a884', fontSize: '12px', fontWeight: '500' }}>Audio</span>
            </div>

            <div
              onClick={() => onStartCall && onStartCall(chat, 'video')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
              title="Video call"
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#202c33',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00a884',
                  border: '1px solid rgba(255,255,255,0.08)',
                  transition: 'background 0.2s',
                }}
              >
                <VideoCallIcon style={{ fontSize: '22px' }} />
              </div>
              <span style={{ color: '#00a884', fontSize: '12px', fontWeight: '500' }}>Video</span>
            </div>

            {isGroup && (
              <div
                onClick={() => setShowAddMemberModal(true)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
                title="Add members"
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: '#202c33',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#00a884',
                    border: '1px solid rgba(255,255,255,0.08)',
                    transition: 'background 0.2s',
                  }}
                >
                  <PersonAddIcon style={{ fontSize: '20px' }} />
                </div>
                <span style={{ color: '#00a884', fontSize: '12px', fontWeight: '500' }}>Add</span>
              </div>
            )}
          </div>
        </div>

        {/* Group Description / 1-on-1 About */}
        <div
          style={{
            backgroundColor: '#111b21',
            padding: '14px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ color: '#8696a0', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600', marginBottom: '6px' }}>
            {isGroup ? 'Group Subject' : 'About & Contact Info'}
          </div>
          <div style={{ color: '#e9edef', fontSize: '14px', lineHeight: '1.4' }}>
            {isGroup ? chat.name : (chat.email ? `Email: ${chat.email}` : 'Hey there! I am using ChatNex.')}
          </div>
          {isGroup && chat.createdAt && (
            <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '8px' }}>
              Created on {new Date(chat.createdAt).toLocaleDateString()} by{' '}
              <strong style={{ color: '#00a884' }}>{chat.admin?.username || 'Admin'}</strong>
            </div>
          )}
        </div>

        {/* Members Section (If Group) */}
        {isGroup && (
          <div style={{ backgroundColor: '#111b21', padding: '14px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
            {/* Header with Search and Member Count */}
            <div style={{ padding: '0 20px 10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#8696a0', fontSize: '12.5px', textTransform: 'uppercase', fontWeight: '600' }}>
                {members.length} Participants
              </span>
              {isCurrentUserAdmin && isCurrentMember && (
                <span
                  onClick={() => setShowAddMemberModal(true)}
                  style={{ color: '#00a884', fontSize: '12.5px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <PersonAddIcon style={{ fontSize: '16px' }} /> Add Member
                </span>
              )}
            </div>

            {/* Member Search input */}
            {members.length > 3 && (
              <div style={{ padding: '0 16px 10px 16px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#202c33',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    gap: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <SearchIcon style={{ color: '#8696a0', fontSize: '18px' }} />
                  <input
                    type="text"
                    placeholder="Search members..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    style={{
                      flex: 1,
                      backgroundColor: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#e9edef',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Members List */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredMembers.map((member) => {
                const memberIdStr = (member._id || member).toString();
                const isCurrentUser = memberIdStr === currentUserIdStr;
                const isAdmin =
                  memberIdStr === adminId ||
                  (Array.isArray(chat?.admins) &&
                    chat.admins.some((a) => (a?._id || a || '').toString() === memberIdStr));

                return (
                  <div
                    key={memberIdStr}
                    onClick={() => {
                      if (!isCurrentUser && onOpenDirectChat) {
                        onOpenDirectChat(member);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 20px',
                      gap: '12px',
                      cursor: isCurrentUser ? 'default' : 'pointer',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrentUser) e.currentTarget.style.backgroundColor = '#202c33';
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrentUser) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {/* Member Avatar */}
                    <img
                      src={getAvatarSrc(member.avtarImage)}
                      alt={member.username}
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                    />

                    {/* Member info */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#e9edef', fontSize: '14.5px', fontWeight: '500' }}>
                          {isCurrentUser ? 'You' : member.username}
                        </span>
                        {isAdmin && (
                          <span
                            style={{
                              backgroundColor: 'rgba(0,168,132,0.15)',
                              color: '#00a884',
                              border: '1px solid rgba(0,168,132,0.3)',
                              borderRadius: '4px',
                              padding: '1px 6px',
                              fontSize: '11px',
                              fontWeight: '600',
                            }}
                          >
                            Group Admin
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          color: '#8696a0',
                          fontSize: '12px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {member.email || (!isCurrentUser ? 'Click to direct chat' : 'Online')}
                      </span>
                    </div>

                    {/* Single Call & Message Quick Actions on Member row */}
                    {!isCurrentUser && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {/* Audio Call */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onStartCall) onStartCall(member, 'audio');
                          }}
                          style={{
                            color: '#8696a0',
                            padding: '6px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'color 0.2s, background 0.2s',
                          }}
                          title={`Voice call ${member.username}`}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#00a884';
                            e.currentTarget.style.backgroundColor = 'rgba(0,168,132,0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#8696a0';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <CallIcon style={{ fontSize: '18px' }} />
                        </div>

                        {/* Video Call */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onStartCall) onStartCall(member, 'video');
                          }}
                          style={{
                            color: '#8696a0',
                            padding: '6px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'color 0.2s, background 0.2s',
                          }}
                          title={`Video call ${member.username}`}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#00a884';
                            e.currentTarget.style.backgroundColor = 'rgba(0,168,132,0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#8696a0';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <VideoCallIcon style={{ fontSize: '18px' }} />
                        </div>

                        {/* Direct Chat */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenDirectChat) onOpenDirectChat(member);
                          }}
                          style={{
                            color: '#8696a0',
                            padding: '6px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'color 0.2s, background 0.2s',
                          }}
                          title={`Chat with ${member.username}`}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#00a884';
                            e.currentTarget.style.backgroundColor = 'rgba(0,168,132,0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#8696a0';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <MessageIcon style={{ fontSize: '18px' }} />
                        </div>

                        {/* Admin Promote / Dismiss Button */}
                        {isCurrentUserAdmin && isCurrentMember && (
                          isAdmin ? (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDialog({
                                  type: 'dismiss_admin',
                                  targetMember: member,
                                  title: `Dismiss ${member.username} as admin?`,
                                  message: `Are you sure you want to remove admin privileges from ${member.username}?`,
                                });
                              }}
                              style={{
                                color: '#f39c12',
                                padding: '6px',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'color 0.2s, background 0.2s',
                              }}
                              title={`Dismiss ${member.username} as admin`}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#e67e22';
                                e.currentTarget.style.backgroundColor = 'rgba(243, 156, 18, 0.15)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#f39c12';
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <AdminPanelSettingsIcon style={{ fontSize: '18px' }} />
                            </div>
                          ) : (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDialog({
                                  type: 'make_admin',
                                  targetMember: member,
                                  title: `Make ${member.username} group admin?`,
                                  message: `Are you sure you want to promote ${member.username} to Group Admin? They will be able to manage members.`,
                                });
                              }}
                              style={{
                                color: '#8696a0',
                                padding: '6px',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'color 0.2s, background 0.2s',
                              }}
                              title={`Make ${member.username} group admin`}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#00a884';
                                e.currentTarget.style.backgroundColor = 'rgba(0, 168, 132, 0.15)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#8696a0';
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <AdminPanelSettingsIcon style={{ fontSize: '18px' }} />
                            </div>
                          )
                        )}

                        {/* Admin Remove Member Button */}
                        {isCurrentUserAdmin && isCurrentMember && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDialog({
                                type: 'remove_member',
                                targetMember: member,
                                title: `Remove ${member.username}?`,
                                message: `Are you sure you want to remove ${member.username} from "${chat.name}"?`,
                              });
                            }}
                            style={{
                              color: '#ea868f',
                              padding: '6px',
                              borderRadius: '50%',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              transition: 'color 0.2s, background 0.2s',
                            }}
                            title={`Remove ${member.username} from group`}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#ff4d4f';
                              e.currentTarget.style.backgroundColor = 'rgba(255, 77, 79, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#ea868f';
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <PersonRemoveIcon style={{ fontSize: '18px' }} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Exit & Delete Group Options (for Group) */}
        {isGroup && (
          <div style={{ backgroundColor: '#111b21', display: 'flex', flexDirection: 'column' }}>
            {/* Exit Group Button (if active member) */}
            {isCurrentMember && (
              <div
                onClick={() =>
                  setConfirmDialog({
                    type: 'leave',
                    title: 'Exit group?',
                    message: `Are you sure you want to leave "${chat.name}"? You will not be able to participate unless added again.`,
                  })
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '16px 20px',
                  cursor: 'pointer',
                  color: '#ea868f',
                  transition: 'background 0.2s',
                  borderBottom: isCurrentUserAdmin ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(234, 134, 143, 0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <ExitToAppIcon style={{ fontSize: '22px' }} />
                <span style={{ fontSize: '15px', fontWeight: '500' }}>Exit group</span>
              </div>
            )}

            {/* Delete Group Button (Admin only if active, OR anyone if already exited) */}
            {(isCurrentUserAdmin || !isCurrentMember) && (
              <div
                onClick={() =>
                  setConfirmDialog({
                    type: 'delete',
                    title: 'Delete group?',
                    message: isCurrentMember
                      ? `Are you sure you want to permanently delete "${chat.name}"? This action cannot be undone and will delete the group for all participants.`
                      : `Are you sure you want to delete "${chat.name}" from your chats?`,
                  })
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '16px 20px',
                  cursor: 'pointer',
                  color: '#ea868f',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(234, 134, 143, 0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <DeleteOutlineIcon style={{ fontSize: '22px' }} />
                <span style={{ fontSize: '15px', fontWeight: '500' }}>Delete group</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Members Modal Overlay */}
      {showAddMemberModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowAddMemberModal(false)}
        >
          <div
            style={{
              backgroundColor: '#202c33',
              borderRadius: '12px',
              width: '380px',
              maxWidth: '92vw',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PersonAddIcon style={{ color: '#00a884', fontSize: '22px' }} />
                <h3 style={{ margin: 0, color: '#e9edef', fontSize: '17px' }}>Add members to group</h3>
              </div>
              <span
                onClick={() => setShowAddMemberModal(false)}
                style={{ color: '#8696a0', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}
              >
                ✕
              </span>
            </div>

            <div
              style={{
                maxHeight: '220px',
                overflowY: 'auto',
                backgroundColor: '#111b21',
                borderRadius: '6px',
                padding: '6px',
                border: '1px solid rgba(255,255,255,0.1)',
                marginBottom: '16px',
              }}
            >
              {availableToAdd.length > 0 ? (
                availableToAdd.map((c) => {
                  const isSelected = selectedNewMembers.includes(c._id);
                  return (
                    <div
                      key={c._id}
                      onClick={() => toggleNewMember(c._id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? 'rgba(0,168,132,0.2)' : 'transparent',
                      }}
                    >
                      <input type="checkbox" checked={isSelected} readOnly style={{ accentColor: '#00a884' }} />
                      <img
                        src={getAvatarSrc(c.avtarImage)}
                        alt={c.username}
                        style={{ width: '30px', height: '30px', borderRadius: '50%' }}
                      />
                      <span style={{ color: '#e9edef', fontSize: '13.5px' }}>{c.username}</span>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '16px', textAlign: 'center', color: '#8696a0', fontSize: '12.5px' }}>
                  All contacts are already in this group!
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#8696a0',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAddMembers}
                disabled={selectedNewMembers.length === 0}
                style={{
                  backgroundColor: '#00a884',
                  border: 'none',
                  color: '#111b21',
                  fontWeight: 'bold',
                  padding: '7px 16px',
                  borderRadius: '6px',
                  cursor: selectedNewMembers.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  opacity: selectedNewMembers.length === 0 ? 0.6 : 1,
                }}
              >
                Add {selectedNewMembers.length > 0 ? `(${selectedNewMembers.length})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Modal (Exit / Delete) */}
      {confirmDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            zIndex: 100001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setConfirmDialog(null)}
        >
          <div
            style={{
              backgroundColor: '#202c33',
              borderRadius: '12px',
              width: '380px',
              maxWidth: '90vw',
              padding: '24px',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 12px 36px rgba(0,0,0,0.7)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px 0', color: '#e9edef', fontSize: '18px' }}>
              {confirmDialog.title}
            </h3>
            <p style={{ margin: '0 0 24px 0', color: '#8696a0', fontSize: '14px', lineHeight: '1.5' }}>
              {confirmDialog.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#8696a0',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13.5px',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                style={{
                  backgroundColor:
                    confirmDialog.type === 'make_admin'
                      ? '#00a884'
                      : '#ea868f',
                  border: 'none',
                  color: '#111b21',
                  fontWeight: 'bold',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13.5px',
                }}
              >
                {confirmDialog.type === 'delete'
                  ? 'Delete'
                  : confirmDialog.type === 'remove_member'
                  ? 'Remove'
                  : confirmDialog.type === 'make_admin'
                  ? 'Make Admin'
                  : confirmDialog.type === 'dismiss_admin'
                  ? 'Dismiss'
                  : 'Exit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

