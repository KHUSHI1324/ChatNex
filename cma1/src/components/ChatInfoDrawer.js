import React, { useState, useRef, useMemo } from 'react';
import axios from 'axios';
import CloseIcon from '@mui/icons-material/Close';
import CallIcon from '@mui/icons-material/Call';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import MessageIcon from '@mui/icons-material/Message';
import GroupsIcon from '@mui/icons-material/Groups';
import SearchIcon from '@mui/icons-material/Search';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import BlockIcon from '@mui/icons-material/Block';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import SecurityIcon from '@mui/icons-material/Security';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import LinkIcon from '@mui/icons-material/Link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { getAvatarSrc } from '../utils/avatarHelper';
import { blockUserRoute, unblockUserRoute, host } from '../utils/APIRoutes';

const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  return `${host}/${url.replace(/^\/+/, '')}`;
};

export default function ChatInfoDrawer({
  chat,
  currentUser,
  contacts = [],
  onlineUsers,
  messages = [],
  socket,
  onClose,
  onOpenDirectChat,
  onStartCall,
  onAddMembersToGroup,
  onRemoveMemberFromGroup,
  onMakeAdmin,
  onDismissAdmin,
  onUpdateGroupAvatar,
  onUpdateGroupDetails,
  onCreateSimilarGroup,
  onLeaveGroup,
  onDeleteGroup,
  onUpdateCurrentUser,
  onOpenSearch,
  showToast,
}) {
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedNewMembers, setSelectedNewMembers] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
  const [showDropdownMenu, setShowDropdownMenu] = useState(false);
  
  // Sub-view: 'main' | 'media_view'
  const [activeSubView, setActiveSubView] = useState('main');
  const [mediaActiveTab, setMediaActiveTab] = useState('media'); // 'media' | 'docs' | 'links'
  const [previewMediaModal, setPreviewMediaModal] = useState(null); // image/video preview

  // Edit Modals
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showEditDescModal, setShowEditDescModal] = useState(false);
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [groupPermissions, setGroupPermissions] = useState({
    sendMessages: 'everyone',
    editGroupInfo: 'everyone',
  });
  const [showSimilarGroupModal, setShowSimilarGroupModal] = useState(false);
  const [similarGroupName, setSimilarGroupName] = useState('');
  const [similarGroupSelectedMembers, setSimilarGroupSelectedMembers] = useState([]);
  const [similarGroupSearchQuery, setSimilarGroupSearchQuery] = useState('');
  const [showAdminAssignModal, setShowAdminAssignModal] = useState(false);

  const fileInputRef = useRef(null);

  // Extract all media, docs, and links from chat messages
  const { mediaList, docsList, linksList } = useMemo(() => {
    const media = [];
    const docs = [];
    const links = [];

    const urlRegex = /(https?:\/\/[^\s]+)/gi;

    (messages || []).forEach((msg) => {
      if (!msg || msg.isDeleted || msg.isSystem) return;

      // Extract files
      const files = Array.isArray(msg.files) ? msg.files : [];
      if (files.length > 0) {
        files.forEach((f) => {
          const rawUrl = f.url || f.imgpath || '';
          if (!rawUrl) return;
          const url = resolveMediaUrl(rawUrl);
          const filename = f.filename || rawUrl.split('/').pop() || 'File';
          const ext = (filename.split('.').pop() || '').toLowerCase();
          const fType = f.fileType || '';

          if (
            fType === 'image' ||
            fType === 'video' ||
            fType === 'gif' ||
            ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'mov', 'webm', 'mkv'].includes(ext)
          ) {
            media.push({
              _id: msg._id,
              url,
              filename,
              fileType: fType === 'video' || ['mp4', 'mov', 'webm', 'mkv'].includes(ext) ? 'video' : 'image',
              timestamp: msg.timestamp || msg.createdAt,
              senderName: msg.senderName,
            });
          } else {
            docs.push({
              _id: msg._id,
              url,
              filename,
              fileType: fType || ext || 'doc',
              size: f.size || 0,
              timestamp: msg.timestamp || msg.createdAt,
              senderName: msg.senderName,
            });
          }
        });
      } else if (msg.imgpath) {
        const rawUrl = msg.imgpath;
        const url = resolveMediaUrl(rawUrl);
        const filename = rawUrl.split('/').pop() || 'Media';
        const ext = (filename.split('.').pop() || '').toLowerCase();
        if (['mp4', 'mov', 'webm', 'mkv'].includes(ext)) {
          media.push({
            _id: msg._id,
            url,
            filename,
            fileType: 'video',
            timestamp: msg.timestamp || msg.createdAt,
            senderName: msg.senderName,
          });
        } else if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
          media.push({
            _id: msg._id,
            url,
            filename,
            fileType: 'image',
            timestamp: msg.timestamp || msg.createdAt,
            senderName: msg.senderName,
          });
        } else {
          docs.push({
            _id: msg._id,
            url,
            filename,
            fileType: ext || 'doc',
            size: 0,
            timestamp: msg.timestamp || msg.createdAt,
            senderName: msg.senderName,
          });
        }
      }

      // Extract URLs from message text
      if (msg.message && typeof msg.message === 'string') {
        const matches = msg.message.match(urlRegex);
        if (matches) {
          matches.forEach((u) => {
            links.push({
              _id: `${msg._id}-${u}`,
              url: u,
              timestamp: msg.timestamp || msg.createdAt,
              senderName: msg.senderName,
            });
          });
        }
      }
    });

    return {
      mediaList: media.reverse(),
      docsList: docs.reverse(),
      linksList: links.reverse(),
    };
  }, [messages]);

  // All candidates for similar group (current group members + contacts, excluding currentUser & groups)
  const allCandidateUsers = useMemo(() => {
    const currentUserId = (currentUser?._id || '').toString();
    const map = new Map();
    const groupMembers = chat?.members || [];

    // 1. Add all members of current group
    (groupMembers || []).forEach((m) => {
      if (!m) return;
      const mId = (m._id || m).toString();
      if (mId && mId !== currentUserId) {
        map.set(mId, {
          _id: mId,
          username: m.username || 'Member',
          email: m.email || '',
          avtarImage: m.avtarImage,
        });
      }
    });

    // 2. Add all non-group contacts
    (contacts || []).forEach((c) => {
      if (!c || c.isGroup) return;
      const cId = (c._id || c).toString();
      if (cId && cId !== currentUserId) {
        if (!map.has(cId)) {
          map.set(cId, {
            _id: cId,
            username: c.name || c.username || 'User',
            email: c.email || '',
            avtarImage: c.avtarImage,
          });
        }
      }
    });

    return Array.from(map.values());
  }, [chat?.members, contacts, currentUser]);

  if (!chat) return null;

  const isGroup = Boolean(chat?.isGroup);
  const members = chat?.members || [];
  const adminId = (chat?.admin?._id || chat?.admin || '').toString();
  const currentUserIdStr = (currentUser?._id || '').toString();
  const isCurrentUserAdmin =
    adminId === currentUserIdStr ||
    (Array.isArray(chat?.admins) &&
      chat.admins.some((a) => (a?._id || a || '').toString() === currentUserIdStr));

  const isCurrentMember = isGroup ? (
    members.some((m) => (m._id || m).toString() === currentUserIdStr) ||
    isCurrentUserAdmin
  ) : true;

  // Can edit group name/description/avatar: only admin, OR if permission is 'everyone'
  const canEditGroupInfo = isGroup && isCurrentMember && (
    isCurrentUserAdmin || (chat.permissions?.editGroupInfo !== 'admins')
  );

  const filteredMembers = members.filter((m) =>
    (m.username || '').toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  // Available contacts not yet in group (for Add Member modal)
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

  const isContactBlocked = !isGroup && currentUser?.blockedUsers?.some(
    (b) => (b._id || b).toString() === (chat._id || '').toString()
  );

  const handleToggleBlock = async () => {
    if (!currentUser?._id || !chat?._id || isGroup) return;
    try {
      const endpoint = isContactBlocked ? unblockUserRoute : blockUserRoute;
      const res = await axios.post(endpoint, {
        userId: currentUser._id,
        targetUserId: chat._id,
      });
      if (res.data?.status) {
        if (onUpdateCurrentUser) {
          const updatedUser = {
            ...currentUser,
            blockedUsers: res.data.blockedUsers || [],
          };
          onUpdateCurrentUser(updatedUser);
          localStorage.setItem('chat-app-user', JSON.stringify(updatedUser));
        }
        if (socket?.current) {
          socket.current.emit(isContactBlocked ? "user-unblocked" : "user-blocked", {
            userId: currentUser._id,
            targetUserId: chat._id,
          });
        }
        showToast?.(
          'success',
          isContactBlocked ? 'Contact Unblocked' : 'Contact Blocked',
          isContactBlocked
            ? `${chat.username} has been unblocked.`
            : `${chat.username} is now blocked and cannot call or message you.`
        );
      }
    } catch (err) {
      console.error('Error toggling block contact:', err);
      showToast?.('error', 'Error', 'Failed to update block status.');
    }
  };

  // Export Chat to Text File
  const handleExportChat = () => {
    try {
      let exportText = `=========================================\n`;
      exportText += ` ChatNex Export: ${chat.name || chat.username}\n`;
      exportText += ` Export Date: ${new Date().toLocaleString()}\n`;
      exportText += ` Total Messages: ${messages.length}\n`;
      exportText += `=========================================\n\n`;

      messages.forEach((msg) => {
        const time = new Date(msg.timestamp || msg.createdAt).toLocaleString();
        const sender = msg.fromSelf ? 'You' : (msg.senderName || 'Contact');
        const text = msg.isDeleted ? '[Message deleted]' : (msg.message || (msg.imgpath ? '[Media attachment]' : ''));
        exportText += `[${time}] ${sender}: ${text}\n`;
      });

      const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `ChatNex-${(chat.name || chat.username || 'Chat').replace(/\s+/g, '_')}-${Date.now()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast?.('success', 'Chat Exported', 'Chat transcript downloaded successfully.');
      setShowDropdownMenu(false);
    } catch (err) {
      console.error('Error exporting chat:', err);
      showToast?.('error', 'Export Failed', 'Could not export chat.');
    }
  };

  const handleSaveGroupName = async () => {
    if (!newGroupName.trim() || newGroupName.trim() === chat.name) {
      setShowEditNameModal(false);
      return;
    }
    if (onUpdateGroupDetails) {
      onUpdateGroupDetails({ groupId: chat._id, name: newGroupName.trim() });
    }
    setShowEditNameModal(false);
  };

  const handleSaveGroupDesc = async () => {
    if (onUpdateGroupDetails) {
      onUpdateGroupDetails({ groupId: chat._id, description: newGroupDesc.trim() });
    }
    setShowEditDescModal(false);
  };

  const handleSavePermissions = async () => {
    if (onUpdateGroupDetails) {
      onUpdateGroupDetails({ groupId: chat._id, permissions: groupPermissions });
    }
    setShowPermissionsModal(false);
  };

  const handleCreateSimilar = () => {
    if (!similarGroupName.trim()) return;
    if (onCreateSimilarGroup) {
      onCreateSimilarGroup({
        name: similarGroupName.trim(),
        members: similarGroupSelectedMembers,
      });
    }
    setShowSimilarGroupModal(false);
    setSimilarGroupName('');
    setSimilarGroupSelectedMembers([]);
    setSimilarGroupSearchQuery('');
    setShowDropdownMenu(false);
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
    } else if (confirmDialog.type === 'block') {
      handleToggleBlock();
    }
    setConfirmDialog(null);
  };

  // Helper for document icon
  const getDocIcon = (fileType = '') => {
    const t = fileType.toLowerCase();
    if (t.includes('pdf')) return <PictureAsPdfIcon style={{ color: '#f15c6d', fontSize: '26px' }} />;
    if (t.includes('sheet') || t.includes('xls') || t.includes('csv'))
      return <TableChartIcon style={{ color: '#00a884', fontSize: '26px' }} />;
    if (t.includes('doc') || t.includes('word'))
      return <DescriptionIcon style={{ color: '#53bdeb', fontSize: '26px' }} />;
    return <InsertDriveFileIcon style={{ color: '#8696a0', fontSize: '26px' }} />;
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
        position: 'relative',
      }}
    >
      <style>{`
        .chatnex-drawer-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: transform 0.15s;
        }
        .chatnex-drawer-btn:hover {
          transform: translateY(-2px);
        }
        .chatnex-drawer-btn .btn-circle {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background-color: #202c33;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #00a884;
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: background 0.2s;
        }
        .chatnex-drawer-btn:hover .btn-circle {
          background-color: #2a3942;
        }
        .menu-dropdown-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          color: #e9edef;
          font-size: 13.5px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .menu-dropdown-item:hover {
          background-color: rgba(255, 255, 255, 0.06);
        }
        .media-tab-btn {
          flex: 1;
          padding: 12px;
          text-align: center;
          font-size: 13.5px;
          font-weight: 500;
          color: #8696a0;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }
        .media-tab-btn.active {
          color: #00a884;
          border-bottom: 2px solid #00a884;
          font-weight: 600;
        }
      `}</style>

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
          justifyContent: 'space-between',
          padding: '0 16px',
          backgroundColor: '#202c33',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            onClick={() => {
              if (activeSubView === 'media_view') {
                setActiveSubView('main');
              } else {
                onClose();
              }
            }}
            style={{
              cursor: 'pointer',
              color: '#8696a0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: '50%',
            }}
            title={activeSubView === 'media_view' ? 'Back' : 'Close details'}
          >
            {activeSubView === 'media_view' ? (
              <ArrowBackIcon style={{ fontSize: '20px' }} />
            ) : (
              <CloseIcon style={{ fontSize: '20px' }} />
            )}
          </div>
          <h3 style={{ margin: 0, color: '#e9edef', fontSize: '16.5px', fontWeight: '600' }}>
            {activeSubView === 'media_view'
              ? 'Media, links, and docs'
              : isGroup
              ? 'Group info'
              : 'Contact info'}
          </h3>
        </div>

        {/* 3-Dots Menu Button */}
        {isGroup && activeSubView === 'main' && (
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowDropdownMenu(!showDropdownMenu)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8696a0',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="More options"
            >
              <MoreVertIcon style={{ fontSize: '20px' }} />
            </button>

            {/* Dropdown Popup */}
            {showDropdownMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '6px',
                  width: '210px',
                  backgroundColor: '#202c33',
                  borderRadius: '8px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  zIndex: 100,
                  overflow: 'hidden',
                  animation: 'fadeIn 0.15s ease-out',
                }}
              >
                {isCurrentUserAdmin && isCurrentMember && (
                  <>
                    <div
                      className="menu-dropdown-item"
                      onClick={() => {
                        setShowDropdownMenu(false);
                        setShowAddMemberModal(true);
                      }}
                    >
                      <PersonAddIcon style={{ fontSize: '18px', color: '#00a884' }} />
                      <span>Add members</span>
                    </div>

                    <div
                      className="menu-dropdown-item"
                      onClick={() => {
                        setShowDropdownMenu(false);
                        setNewGroupName(chat.name || '');
                        setShowEditNameModal(true);
                      }}
                    >
                      <EditIcon style={{ fontSize: '18px', color: '#53bdeb' }} />
                      <span>Edit group name</span>
                    </div>

                    <div
                      className="menu-dropdown-item"
                      onClick={() => {
                        setShowDropdownMenu(false);
                        setNewGroupDesc(chat.description || '');
                        setShowEditDescModal(true);
                      }}
                    >
                      <DescriptionIcon style={{ fontSize: '18px', color: '#ffd166' }} />
                      <span>Edit description</span>
                    </div>

                    <div
                      className="menu-dropdown-item"
                      onClick={() => {
                        setShowDropdownMenu(false);
                        setGroupPermissions(chat.permissions || { sendMessages: 'everyone', editGroupInfo: 'everyone' });
                        setShowPermissionsModal(true);
                      }}
                    >
                      <SecurityIcon style={{ fontSize: '18px', color: '#00a884' }} />
                      <span>Group permissions</span>
                    </div>
                  </>
                )}

                <div
                  className="menu-dropdown-item"
                  onClick={() => {
                    setShowDropdownMenu(false);
                    setSimilarGroupName(`${chat.name || 'Group'} (Copy)`);
                    setSimilarGroupSearchQuery('');
                    const currentUserId = (currentUser?._id || '').toString();
                    const existingIds = (chat.members || [])
                      .map((m) => (m._id || m).toString())
                      .filter((id) => id !== currentUserId);
                    setSimilarGroupSelectedMembers(existingIds);
                    setShowSimilarGroupModal(true);
                  }}
                >
                  <GroupsIcon style={{ fontSize: '18px', color: '#aebac1' }} />
                  <span>Create similar group</span>
                </div>

                <div
                  className="menu-dropdown-item"
                  onClick={() => {
                    setShowDropdownMenu(false);
                    onOpenSearch?.();
                  }}
                >
                  <SearchIcon style={{ fontSize: '18px', color: '#aebac1' }} />
                  <span>Search in chat</span>
                </div>

                <div
                  className="menu-dropdown-item"
                  onClick={handleExportChat}
                >
                  <FileDownloadIcon style={{ fontSize: '18px', color: '#aebac1' }} />
                  <span>Export chat</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Drawer Content */}
      {activeSubView === 'main' ? (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            backgroundColor: '#0c1317',
          }}
          onClick={() => {
            if (showDropdownMenu) setShowDropdownMenu(false);
          }}
        >
          {/* Profile Card Section */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: '#111b21',
              padding: '20px 20px 24px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              textAlign: 'center',
            }}
          >
            <div
              style={{ position: 'relative', marginBottom: '14px', cursor: canEditGroupInfo ? 'pointer' : 'default' }}
              onMouseEnter={() => canEditGroupInfo && setIsHoveringAvatar(true)}
              onMouseLeave={() => setIsHoveringAvatar(false)}
              onClick={() => {
                if (canEditGroupInfo && fileInputRef.current) {
                  fileInputRef.current.click();
                }
              }}
              title={canEditGroupInfo ? 'Click to change group picture' : undefined}
            >
              <img
                src={getAvatarSrc(chat.avtarImage)}
                alt={chat.name || chat.username}
                style={{
                  width: '110px',
                  height: '110px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid rgba(0, 168, 132, 0.4)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                }}
              />

              {canEditGroupInfo && isHoveringAvatar && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '110px',
                    height: '110px',
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
                  <PhotoCameraIcon style={{ fontSize: '26px' }} />
                  <span style={{ fontSize: '10.5px', fontWeight: '500' }}>Change Photo</span>
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
                    width: '26px',
                    height: '26px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#111b21',
                    border: '2px solid #111b21',
                  }}
                >
                  <GroupsIcon style={{ fontSize: '16px' }} />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h2 style={{ margin: 0, color: '#e9edef', fontSize: '19px', fontWeight: '600' }}>
                {chat.name || chat.username}
              </h2>
              {canEditGroupInfo && (
                <EditIcon
                  style={{ fontSize: '16px', color: '#8696a0', cursor: 'pointer' }}
                  onClick={() => {
                    setNewGroupName(chat.name || '');
                    setShowEditNameModal(true);
                  }}
                  titleAccess="Edit group name"
                />
              )}
            </div>

            <span style={{ color: '#8696a0', fontSize: '13px', marginBottom: '18px' }}>
              {isGroup
                ? `Group • ${members.length} member${members.length !== 1 ? 's' : ''}`
                : chat.email || 'ChatNex User'}
            </span>

            {/* Quick Action Buttons: Audio, Video, Add, Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <div
                className="chatnex-drawer-btn"
                onClick={() => onStartCall && onStartCall(chat, 'audio')}
                title="Voice call"
              >
                <div className="btn-circle">
                  <CallIcon style={{ fontSize: '20px' }} />
                </div>
                <span style={{ color: '#00a884', fontSize: '12px', fontWeight: '500' }}>Audio</span>
              </div>

              <div
                className="chatnex-drawer-btn"
                onClick={() => onStartCall && onStartCall(chat, 'video')}
                title="Video call"
              >
                <div className="btn-circle">
                  <VideoCallIcon style={{ fontSize: '22px' }} />
                </div>
                <span style={{ color: '#00a884', fontSize: '12px', fontWeight: '500' }}>Video</span>
              </div>

              {isGroup && (
                <div
                  className="chatnex-drawer-btn"
                  onClick={() => setShowAddMemberModal(true)}
                  title="Add members"
                >
                  <div className="btn-circle">
                    <PersonAddIcon style={{ fontSize: '20px' }} />
                  </div>
                  <span style={{ color: '#00a884', fontSize: '12px', fontWeight: '500' }}>Add</span>
                </div>
              )}

              <div
                className="chatnex-drawer-btn"
                onClick={() => onOpenSearch?.()}
                title="Search in chat"
              >
                <div className="btn-circle">
                  <SearchIcon style={{ fontSize: '20px' }} />
                </div>
                <span style={{ color: '#00a884', fontSize: '12px', fontWeight: '500' }}>Search</span>
              </div>
            </div>
          </div>

          {/* Group Description / About */}
          <div
            style={{
              backgroundColor: '#111b21',
              padding: '14px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ color: '#8696a0', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600' }}>
                {isGroup ? 'Group Description' : 'About & Contact Info'}
              </span>
              {canEditGroupInfo && (
                <EditIcon
                  style={{ fontSize: '15px', color: '#8696a0', cursor: 'pointer' }}
                  onClick={() => {
                    setNewGroupDesc(chat.description || '');
                    setShowEditDescModal(true);
                  }}
                  titleAccess="Edit description"
                />
              )}
            </div>
            <div style={{ color: '#e9edef', fontSize: '13.5px', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
              {isGroup
                ? chat.description || <span style={{ color: '#8696a0', fontStyle: 'italic' }}>Add group description...</span>
                : chat.email ? `Email: ${chat.email}` : 'Hey there! I am using ChatNex.'}
            </div>
            {isGroup && chat.createdAt && (
              <div style={{ color: '#8696a0', fontSize: '11.5px', marginTop: '8px' }}>
                Created on {new Date(chat.createdAt).toLocaleDateString()} by{' '}
                <strong style={{ color: '#00a884' }}>{chat.admin?.username || 'Admin'}</strong>
              </div>
            )}
          </div>

          {/* Media, Links & Docs Preview Card (WhatsApp Style) */}
          <div
            onClick={() => setActiveSubView('media_view')}
            style={{
              backgroundColor: '#111b21',
              padding: '14px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ color: '#8696a0', fontSize: '12.5px', textTransform: 'uppercase', fontWeight: '600' }}>
                Media, links, and docs
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8696a0', fontSize: '12.5px' }}>
                <span>{mediaList.length + docsList.length + linksList.length}</span>
                <ArrowForwardIosIcon style={{ fontSize: '12px' }} />
              </div>
            </div>

            {/* Thumbnail Strip */}
            {mediaList.length > 0 ? (
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                {mediaList.slice(0, 4).map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: '74px',
                      height: '74px',
                      borderRadius: '6px',
                      backgroundColor: '#202c33',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    {m.fileType === 'video' ? (
                      <video src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <img src={m.url} alt="media" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#8696a0', fontSize: '13px' }}>
                No media, links, or documents shared yet
              </div>
            )}
          </div>

          {/* Group Permissions Item (For Admins) */}
          {isGroup && isCurrentUserAdmin && isCurrentMember && (
            <div
              onClick={() => {
                setGroupPermissions(chat.permissions || { sendMessages: 'everyone', editGroupInfo: 'everyone' });
                setShowPermissionsModal(true);
              }}
              style={{
                backgroundColor: '#111b21',
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <SecurityIcon style={{ color: '#00a884', fontSize: '20px' }} />
                <div>
                  <div style={{ color: '#e9edef', fontSize: '14px', fontWeight: '500' }}>Group permissions</div>
                  <div style={{ color: '#8696a0', fontSize: '12px' }}>Control who can send messages or edit info</div>
                </div>
              </div>
              <ArrowForwardIosIcon style={{ fontSize: '12px', color: '#8696a0' }} />
            </div>
          )}

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

              {/* Member List */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filteredMembers.map((member) => {
                  const memberIdStr = (member._id || member).toString();
                  const isThisUserAdmin =
                    adminId === memberIdStr ||
                    (Array.isArray(chat?.admins) &&
                      chat.admins.some((a) => (a?._id || a || '').toString() === memberIdStr));
                  const isMe = memberIdStr === currentUserIdStr;

                  // Online status check: SHOW ONLY GREEN BADGE FOR ONLINE, NO BADGE FOR OFFLINE
                  // For "You", we do not show an online badge. For others, show green badge ONLY if in onlineUsers.
                  const isMemberOnline = !isMe && Boolean(
                    onlineUsers && (
                      onlineUsers instanceof Set
                        ? onlineUsers.has(memberIdStr)
                        : Boolean(onlineUsers.get?.(memberIdStr))
                    )
                  );

                  return (
                    <div
                      key={memberIdStr}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 20px',
                        transition: 'background 0.15s',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0, cursor: isMe ? 'default' : 'pointer' }}
                        onClick={() => {
                          if (!isMe && onOpenDirectChat) {
                            onOpenDirectChat(member);
                          }
                        }}
                      >
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <img
                            src={getAvatarSrc(member.avtarImage)}
                            alt={member.username}
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                            }}
                          />
                          {/* Green Online Badge: ONLY when other member is online */}
                          {isMemberOnline && (
                            <span
                              style={{
                                position: 'absolute',
                                bottom: '1px',
                                right: '1px',
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                backgroundColor: '#00a884',
                                border: '2px solid #111b21',
                              }}
                              title="Online"
                            />
                          )}
                        </div>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                color: '#e9edef',
                                fontSize: '14px',
                                fontWeight: '500',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {isMe ? 'You' : member.username || 'Member'}
                            </span>
                          </div>
                          <div style={{ fontSize: '11.5px', color: isMemberOnline ? '#00a884' : '#8696a0' }}>
                            {isMe ? (isThisUserAdmin ? 'Group Admin' : member.email || '') : (isMemberOnline ? 'online' : member.email || '')}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        {isThisUserAdmin && (
                          <span
                            style={{
                              backgroundColor: 'rgba(0, 168, 132, 0.15)',
                              color: '#00a884',
                              border: '1px solid rgba(0, 168, 132, 0.4)',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '10.5px',
                              fontWeight: '600',
                            }}
                          >
                            Group Admin
                          </span>
                        )}

                        {!isMe && isCurrentMember && (
                          <>
                            <div
                              onClick={() => onStartCall && onStartCall(member, 'audio')}
                              style={{ cursor: 'pointer', color: '#8696a0', padding: '4px' }}
                              title="Voice Call"
                            >
                              <CallIcon style={{ fontSize: '17px' }} />
                            </div>
                            <div
                              onClick={() => onStartCall && onStartCall(member, 'video')}
                              style={{ cursor: 'pointer', color: '#8696a0', padding: '4px' }}
                              title="Video Call"
                            >
                              <VideoCallIcon style={{ fontSize: '19px' }} />
                            </div>
                            <div
                              onClick={() => onOpenDirectChat && onOpenDirectChat(member)}
                              style={{ cursor: 'pointer', color: '#8696a0', padding: '4px' }}
                              title="Message"
                            >
                              <MessageIcon style={{ fontSize: '17px' }} />
                            </div>
                          </>
                        )}

                        {isCurrentUserAdmin && !isMe && isCurrentMember && (
                          <div
                            onClick={() =>
                              setConfirmDialog({
                                type: 'remove_member',
                                title: 'Remove Member',
                                message: `Remove ${member.username} from this group?`,
                                targetMember: member,
                              })
                            }
                            style={{ cursor: 'pointer', color: '#ea868f', padding: '4px' }}
                            title="Remove from Group"
                          >
                            <PersonRemoveIcon style={{ fontSize: '18px' }} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Danger Zone Actions */}
          <div style={{ backgroundColor: '#111b21', padding: '10px 0', marginTop: 'auto' }}>
            {isGroup ? (
              <>
                {isCurrentMember ? (
                  <div
                    onClick={() =>
                      setConfirmDialog({
                        type: 'leave',
                        title: 'Exit Group?',
                        message: 'Are you sure you want to leave this group?',
                      })
                    }
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 20px',
                      color: '#ea868f',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(234, 134, 143, 0.08)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <ExitToAppIcon style={{ fontSize: '20px' }} />
                    Exit group
                  </div>
                ) : (
                  <div
                    onClick={() =>
                      setConfirmDialog({
                        type: 'delete',
                        title: 'Delete Group?',
                        message: 'Permanently delete this group and all its messages from your chats?',
                      })
                    }
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 20px',
                      color: '#ea868f',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(234, 134, 143, 0.08)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <DeleteOutlineIcon style={{ fontSize: '20px' }} />
                    Delete group from chats
                  </div>
                )}
              </>
            ) : (
              <div
                onClick={() =>
                  setConfirmDialog({
                    type: 'block',
                    title: isContactBlocked ? 'Unblock Contact?' : 'Block Contact?',
                    message: isContactBlocked
                      ? `Unblock ${chat.username}? They will be able to send you messages and call you.`
                      : `Block ${chat.username}? Blocked contacts will no longer be able to call you or send you messages.`,
                  })
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 20px',
                  color: isContactBlocked ? '#00a884' : '#ea868f',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = isContactBlocked
                    ? 'rgba(0, 168, 132, 0.08)'
                    : 'rgba(234, 134, 143, 0.08)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <BlockIcon style={{ fontSize: '20px' }} />
                {isContactBlocked ? `Unblock ${chat.username}` : `Block ${chat.username}`}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Sub-View: Media, Links & Docs 3-Tab Viewer */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#111b21', overflow: 'hidden' }}>
          {/* 3 Tabs Header */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: '#202c33' }}>
            <div
              className={`media-tab-btn ${mediaActiveTab === 'media' ? 'active' : ''}`}
              onClick={() => setMediaActiveTab('media')}
            >
              Media ({mediaList.length})
            </div>
            <div
              className={`media-tab-btn ${mediaActiveTab === 'docs' ? 'active' : ''}`}
              onClick={() => setMediaActiveTab('docs')}
            >
              Docs ({docsList.length})
            </div>
            <div
              className={`media-tab-btn ${mediaActiveTab === 'links' ? 'active' : ''}`}
              onClick={() => setMediaActiveTab('links')}
            >
              Links ({linksList.length})
            </div>
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
            {/* Media Tab (Photos & Videos Grid) */}
            {mediaActiveTab === 'media' && (
              <div>
                {mediaList.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {mediaList.map((m, idx) => (
                      <div
                        key={idx}
                        onClick={() => setPreviewMediaModal(m)}
                        style={{
                          aspectRatio: '1',
                          backgroundColor: '#202c33',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          position: 'relative',
                        }}
                      >
                        {m.fileType === 'video' ? (
                          <>
                            <video src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div
                              style={{
                                position: 'absolute',
                                bottom: '4px',
                                left: '4px',
                                backgroundColor: 'rgba(0,0,0,0.6)',
                                padding: '2px 4px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                color: '#fff',
                              }}
                            >
                              🎥 Video
                            </div>
                          </>
                        ) : (
                          <img src={m.url} alt="media" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: '#8696a0', padding: '40px 10px', fontSize: '13px' }}>
                    No photos or videos shared in this chat.
                  </div>
                )}
              </div>
            )}

            {/* Docs Tab */}
            {mediaActiveTab === 'docs' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {docsList.length > 0 ? (
                  docsList.map((doc, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        backgroundColor: '#202c33',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                        {getDocIcon(doc.fileType)}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              color: '#e9edef',
                              fontSize: '13.5px',
                              fontWeight: '500',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={doc.filename}
                          >
                            {doc.filename}
                          </div>
                          <div style={{ color: '#8696a0', fontSize: '11px', marginTop: '2px' }}>
                            {new Date(doc.timestamp).toLocaleDateString()} • {doc.senderName || 'Member'}
                          </div>
                        </div>
                      </div>

                      <a
                        href={doc.url}
                        download={doc.filename}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: '#00a884',
                          padding: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                        }}
                        title="Download Document"
                      >
                        <FileDownloadIcon style={{ fontSize: '20px' }} />
                      </a>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', color: '#8696a0', padding: '40px 10px', fontSize: '13px' }}>
                    No documents or files shared in this chat.
                  </div>
                )}
              </div>
            )}

            {/* Links Tab */}
            {mediaActiveTab === 'links' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {linksList.length > 0 ? (
                  linksList.map((linkItem, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        backgroundColor: '#202c33',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(0,168,132,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#00a884',
                            flexShrink: 0,
                          }}
                        >
                          <LinkIcon style={{ fontSize: '20px' }} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <a
                            href={linkItem.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              color: '#53bdeb',
                              fontSize: '13px',
                              fontWeight: '500',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'block',
                              textDecoration: 'none',
                            }}
                          >
                            {linkItem.url}
                          </a>
                          <div style={{ color: '#8696a0', fontSize: '11px', marginTop: '2px' }}>
                            {new Date(linkItem.timestamp).toLocaleDateString()} • {linkItem.senderName || 'Member'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(linkItem.url);
                          showToast?.('info', 'Link Copied', 'URL copied to clipboard.');
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#8696a0',
                          cursor: 'pointer',
                          padding: '6px',
                        }}
                        title="Copy Link"
                      >
                        <ContentCopyIcon style={{ fontSize: '16px' }} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', color: '#8696a0', padding: '40px 10px', fontSize: '13px' }}>
                    No web links shared in this chat.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Members Modal */}
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
                        gap: '12px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? 'rgba(0,168,132,0.18)' : 'transparent',
                        border: isSelected ? '1px solid rgba(0,168,132,0.4)' : '1px solid transparent',
                        marginBottom: '4px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          border: isSelected ? '2px solid #00a884' : '2px solid #8696a0',
                          backgroundColor: isSelected ? '#00a884' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isSelected && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="#111b21" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <img
                        src={getAvatarSrc(c.avtarImage)}
                        alt={c.username}
                        style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#e9edef', fontSize: '13.5px', fontWeight: '500' }}>{c.username}</div>
                        <div style={{ color: '#8696a0', fontSize: '11.5px' }}>{c.email || ''}</div>
                      </div>
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

      {/* Edit Group Name Modal */}
      {showEditNameModal && (
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
          onClick={() => setShowEditNameModal(false)}
        >
          <div
            style={{
              backgroundColor: '#202c33',
              borderRadius: '12px',
              width: '360px',
              maxWidth: '90vw',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 14px 0', color: '#e9edef', fontSize: '17px' }}>Edit Group Name</h3>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Enter new group name..."
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: '#111b21',
                border: '1px solid #00a884',
                borderRadius: '6px',
                color: '#e9edef',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '16px',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowEditNameModal(false)}
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
                onClick={handleSaveGroupName}
                style={{
                  backgroundColor: '#00a884',
                  border: 'none',
                  color: '#111b21',
                  fontWeight: 'bold',
                  padding: '7px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group Description Modal */}
      {showEditDescModal && (
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
          onClick={() => setShowEditDescModal(false)}
        >
          <div
            style={{
              backgroundColor: '#202c33',
              borderRadius: '12px',
              width: '380px',
              maxWidth: '90vw',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 14px 0', color: '#e9edef', fontSize: '17px' }}>Edit Group Description</h3>
            <textarea
              rows={4}
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
              placeholder="Add group description..."
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: '#111b21',
                border: '1px solid #00a884',
                borderRadius: '6px',
                color: '#e9edef',
                fontSize: '13.5px',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical',
                marginBottom: '16px',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowEditDescModal(false)}
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
                onClick={handleSaveGroupDesc}
                style={{
                  backgroundColor: '#00a884',
                  border: 'none',
                  color: '#111b21',
                  fontWeight: 'bold',
                  padding: '7px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Permissions Modal */}
      {showPermissionsModal && (
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
          onClick={() => setShowPermissionsModal(false)}
        >
          <div
            style={{
              backgroundColor: '#202c33',
              borderRadius: '12px',
              width: '380px',
              maxWidth: '90vw',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <SecurityIcon style={{ color: '#00a884', fontSize: '22px' }} />
              <h3 style={{ margin: 0, color: '#e9edef', fontSize: '17px' }}>Group Permissions</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#8696a0', display: 'block', marginBottom: '6px' }}>
                  Who can edit group info (Subject & Description):
                </label>
                <select
                  value={groupPermissions.editGroupInfo}
                  onChange={(e) => setGroupPermissions({ ...groupPermissions, editGroupInfo: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#111b21',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    color: '#e9edef',
                    fontSize: '13.5px',
                    outline: 'none',
                  }}
                >
                  <option value="everyone">All participants</option>
                  <option value="admins">Only admins</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: '#8696a0', display: 'block', marginBottom: '6px' }}>
                  Who can send messages in this group:
                </label>
                <select
                  value={groupPermissions.sendMessages}
                  onChange={(e) => setGroupPermissions({ ...groupPermissions, sendMessages: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#111b21',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    color: '#e9edef',
                    fontSize: '13.5px',
                    outline: 'none',
                  }}
                >
                  <option value="everyone">All participants</option>
                  <option value="admins">Only admins</option>
                </select>
              </div>

              {/* Edit Group Admins */}
              <div
                onClick={() => {
                  setShowPermissionsModal(false);
                  setShowAdminAssignModal(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  backgroundColor: '#111b21',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.08)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1a2730')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#111b21')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AdminPanelSettingsIcon style={{ color: '#00a884', fontSize: '20px' }} />
                  <div>
                    <div style={{ color: '#e9edef', fontSize: '13.5px', fontWeight: '500' }}>Edit group admins</div>
                    <div style={{ color: '#8696a0', fontSize: '11.5px' }}>Choose who can manage this group</div>
                  </div>
                </div>
                <ArrowForwardIosIcon style={{ fontSize: '12px', color: '#8696a0' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowPermissionsModal(false)}
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
                onClick={handleSavePermissions}
                style={{
                  backgroundColor: '#00a884',
                  border: 'none',
                  color: '#111b21',
                  fontWeight: 'bold',
                  padding: '7px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Assignment Modal */}
      {showAdminAssignModal && (
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
          onClick={() => setShowAdminAssignModal(false)}
        >
          <div
            style={{
              backgroundColor: '#202c33',
              borderRadius: '12px',
              width: '400px',
              maxWidth: '92vw',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid rgba(255,255,255,0.1)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <AdminPanelSettingsIcon style={{ color: '#00a884', fontSize: '22px' }} />
              <h3 style={{ margin: 0, color: '#e9edef', fontSize: '17px' }}>Edit Group Admins</h3>
            </div>
            <p style={{ margin: '0', padding: '10px 20px 6px 20px', color: '#8696a0', fontSize: '12.5px' }}>
              Toggle admin status for group members. The group creator cannot be demoted.
            </p>

            {/* Member list */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {members.map((member) => {
                const memberIdStr = (member._id || member).toString();
                const isMe = memberIdStr === currentUserIdStr;
                const isCreator = adminId === memberIdStr;
                const isMemberAdmin =
                  isCreator ||
                  (Array.isArray(chat?.admins) &&
                    chat.admins.some((a) => (a?._id || a || '').toString() === memberIdStr));

                return (
                  <div
                    key={memberIdStr}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 20px',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img
                        src={getAvatarSrc(member.avtarImage)}
                        alt={member.username}
                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ color: '#e9edef', fontSize: '14px', fontWeight: '500' }}>
                          {isMe ? 'You' : member.username || 'Member'}
                        </div>
                        <div style={{ color: '#8696a0', fontSize: '11.5px' }}>
                          {isCreator ? 'Group Creator' : isMemberAdmin ? 'Admin' : 'Member'}
                        </div>
                      </div>
                    </div>

                    {isCreator ? (
                      <span
                        style={{
                          backgroundColor: 'rgba(0,168,132,0.12)',
                          color: '#00a884',
                          border: '1px solid rgba(0,168,132,0.3)',
                          borderRadius: '4px',
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: '600',
                        }}
                      >
                        Creator
                      </span>
                    ) : isMe ? null : (
                      <button
                        type="button"
                        onClick={() => {
                          if (isMemberAdmin) {
                            setConfirmDialog({
                              type: 'dismiss_admin',
                              title: 'Dismiss as Admin',
                              message: `Dismiss ${member.username} as group admin?`,
                              targetMember: member,
                            });
                          } else {
                            setConfirmDialog({
                              type: 'make_admin',
                              title: 'Make Group Admin',
                              message: `Make ${member.username} an admin of this group?`,
                              targetMember: member,
                            });
                          }
                          setShowAdminAssignModal(false);
                        }}
                        style={{
                          backgroundColor: isMemberAdmin ? 'rgba(234,134,143,0.12)' : 'rgba(0,168,132,0.12)',
                          color: isMemberAdmin ? '#ea868f' : '#00a884',
                          border: `1px solid ${isMemberAdmin ? 'rgba(234,134,143,0.3)' : 'rgba(0,168,132,0.3)'}`,
                          borderRadius: '6px',
                          padding: '5px 10px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        {isMemberAdmin ? 'Dismiss Admin' : 'Make Admin'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowAdminAssignModal(false)}
                style={{
                  backgroundColor: '#00a884',
                  border: 'none',
                  color: '#111b21',
                  fontWeight: 'bold',
                  padding: '7px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Similar Group Modal */}
      {showSimilarGroupModal && (() => {
        const query = similarGroupSearchQuery.trim().toLowerCase();
        const filteredCandidates = allCandidateUsers.filter((u) => {
          if (!query) return true;
          return (
            (u.username || '').toLowerCase().includes(query) ||
            (u.email || '').toLowerCase().includes(query)
          );
        });

        const selectedUsers = filteredCandidates.filter((u) =>
          similarGroupSelectedMembers.includes(u._id)
        );
        const unselectedUsers = filteredCandidates.filter(
          (u) => !similarGroupSelectedMembers.includes(u._id)
        );

        const toggleUserSelection = (userId) => {
          setSimilarGroupSelectedMembers((prev) =>
            prev.includes(userId)
              ? prev.filter((id) => id !== userId)
              : [...prev, userId]
          );
        };

        return (
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
            onClick={() => {
              setShowSimilarGroupModal(false);
              setSimilarGroupSelectedMembers([]);
              setSimilarGroupSearchQuery('');
            }}
          >
            <div
              style={{
                backgroundColor: '#202c33',
                borderRadius: '12px',
                width: '450px',
                maxWidth: '92vw',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 12px 36px rgba(0,0,0,0.7)',
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ padding: '18px 20px 12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, color: '#e9edef', fontSize: '17px', fontWeight: '600' }}>
                    Create Similar Group
                  </h3>
                  <div
                    onClick={() => {
                      setShowSimilarGroupModal(false);
                      setSimilarGroupSelectedMembers([]);
                      setSimilarGroupSearchQuery('');
                    }}
                    style={{ cursor: 'pointer', color: '#8696a0', display: 'flex', alignItems: 'center', padding: '2px' }}
                  >
                    <CloseIcon style={{ fontSize: '20px' }} />
                  </div>
                </div>
                <p style={{ margin: '0 0 12px 0', color: '#8696a0', fontSize: '12.5px' }}>
                  Choose members to include in your new group.
                </p>

                {/* Group Name Input */}
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ color: '#8696a0', fontSize: '11.5px', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
                    Group Subject
                  </div>
                  <input
                    type="text"
                    value={similarGroupName}
                    onChange={(e) => setSimilarGroupName(e.target.value)}
                    placeholder="Enter new group name..."
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      backgroundColor: '#111b21',
                      border: '1px solid #00a884',
                      borderRadius: '6px',
                      color: '#e9edef',
                      fontSize: '13.5px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Search Users Input */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#111b21',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    gap: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <SearchIcon style={{ color: '#8696a0', fontSize: '17px' }} />
                  <input
                    type="text"
                    placeholder="Search user..."
                    value={similarGroupSearchQuery}
                    onChange={(e) => setSimilarGroupSearchQuery(e.target.value)}
                    style={{
                      flex: 1,
                      backgroundColor: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#e9edef',
                      fontSize: '12.5px',
                    }}
                  />
                  {similarGroupSearchQuery && (
                    <CloseIcon
                      onClick={() => setSimilarGroupSearchQuery('')}
                      style={{ color: '#8696a0', fontSize: '16px', cursor: 'pointer' }}
                    />
                  )}
                </div>
              </div>

              {/* Scrollable Members List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* 1. Selected Users Section */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 6px 6px 6px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                      marginBottom: '6px',
                    }}
                  >
                    <span style={{ color: '#00a884', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Selected users ({similarGroupSelectedMembers.length})
                    </span>
                    <span style={{ color: '#8696a0', fontSize: '11px' }}>
                      Click to uncheck
                    </span>
                  </div>

                  {selectedUsers.length === 0 ? (
                    <div style={{ color: '#8696a0', fontSize: '12px', fontStyle: 'italic', padding: '8px 6px' }}>
                      {query ? 'No matching selected users' : 'No users selected yet'}
                    </div>
                  ) : (
                    selectedUsers.map((u) => {
                      const isOnline = Boolean(
                        onlineUsers && (
                          onlineUsers instanceof Set
                            ? onlineUsers.has(u._id)
                            : Boolean(onlineUsers.get?.(u._id))
                        )
                      );
                      return (
                        <div
                          key={u._id}
                          onClick={() => toggleUserSelection(u._id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '8px 8px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <img
                              src={getAvatarSrc(u.avtarImage)}
                              alt={u.username}
                              style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                            {isOnline && (
                              <span
                                style={{
                                  position: 'absolute',
                                  bottom: '1px',
                                  right: '1px',
                                  width: '9px',
                                  height: '9px',
                                  borderRadius: '50%',
                                  backgroundColor: '#00a884',
                                  border: '2px solid #202c33',
                                }}
                              />
                            )}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: '#e9edef', fontSize: '13.5px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {u.username}
                            </div>
                            <div style={{ color: isOnline ? '#00a884' : '#8696a0', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {isOnline ? 'online' : u.email || ''}
                            </div>
                          </div>

                          {/* Green Checked Circle Checkbox */}
                          <div
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              backgroundColor: '#00a884',
                              border: '2px solid #00a884',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              boxShadow: '0 0 6px rgba(0,168,132,0.4)',
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="#111b21" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 2. Select User Section (Unselected) */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 6px 6px 6px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                      marginBottom: '6px',
                    }}
                  >
                    <span style={{ color: '#8696a0', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Select user ({unselectedUsers.length})
                    </span>
                    <span style={{ color: '#8696a0', fontSize: '11px' }}>
                      Click to check & add
                    </span>
                  </div>

                  {unselectedUsers.length === 0 ? (
                    <div style={{ color: '#8696a0', fontSize: '12px', fontStyle: 'italic', padding: '8px 6px' }}>
                      {query ? 'No matching users found' : 'All available users are selected'}
                    </div>
                  ) : (
                    unselectedUsers.map((u) => {
                      const isOnline = Boolean(
                        onlineUsers && (
                          onlineUsers instanceof Set
                            ? onlineUsers.has(u._id)
                            : Boolean(onlineUsers.get?.(u._id))
                        )
                      );
                      return (
                        <div
                          key={u._id}
                          onClick={() => toggleUserSelection(u._id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '8px 8px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <img
                              src={getAvatarSrc(u.avtarImage)}
                              alt={u.username}
                              style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                            {isOnline && (
                              <span
                                style={{
                                  position: 'absolute',
                                  bottom: '1px',
                                  right: '1px',
                                  width: '9px',
                                  height: '9px',
                                  borderRadius: '50%',
                                  backgroundColor: '#00a884',
                                  border: '2px solid #202c33',
                                }}
                              />
                            )}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: '#e9edef', fontSize: '13.5px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {u.username}
                            </div>
                            <div style={{ color: isOnline ? '#00a884' : '#8696a0', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {isOnline ? 'online' : u.email || ''}
                            </div>
                          </div>

                          {/* Unchecked Empty Circle Checkbox */}
                          <div
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              border: '2px solid #8696a0',
                              backgroundColor: 'transparent',
                              flexShrink: 0,
                              transition: 'border-color 0.15s',
                            }}
                          />
                        </div>
                      );
                    })
                  )}
                </div>

              </div>

              {/* Footer buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#111b21' }}>
                <div style={{ color: '#8696a0', fontSize: '12.5px' }}>
                  <span style={{ color: '#00a884', fontWeight: '600' }}>{similarGroupSelectedMembers.length}</span> user{similarGroupSelectedMembers.length === 1 ? '' : 's'} selected
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSimilarGroupModal(false);
                      setSimilarGroupSelectedMembers([]);
                      setSimilarGroupSearchQuery('');
                    }}
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
                    type="button"
                    onClick={handleCreateSimilar}
                    disabled={!similarGroupName.trim()}
                    style={{
                      backgroundColor: '#00a884',
                      border: 'none',
                      color: '#111b21',
                      fontWeight: 'bold',
                      padding: '8px 18px',
                      borderRadius: '6px',
                      cursor: similarGroupName.trim() ? 'pointer' : 'not-allowed',
                      fontSize: '13px',
                      opacity: similarGroupName.trim() ? 1 : 0.6,
                    }}
                  >
                    Create Group
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Lightbox / Media Preview Modal */}
      {previewMediaModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.92)',
            zIndex: 100005,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setPreviewMediaModal(null)}
        >
          <div
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              display: 'flex',
              gap: '12px',
              zIndex: 10,
            }}
          >
            <a
              href={previewMediaModal.url}
              download={previewMediaModal.filename}
              target="_blank"
              rel="noreferrer"
              style={{
                color: '#fff',
                backgroundColor: 'rgba(255,255,255,0.2)',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={(e) => e.stopPropagation()}
              title="Download"
            >
              <FileDownloadIcon style={{ fontSize: '20px' }} />
            </a>
            <div
              style={{
                color: '#fff',
                backgroundColor: 'rgba(255,255,255,0.2)',
                padding: '8px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={() => setPreviewMediaModal(null)}
              title="Close"
            >
              <CloseIcon style={{ fontSize: '20px' }} />
            </div>
          </div>

          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '80vh' }}>
            {previewMediaModal.fileType === 'video' ? (
              <video src={previewMediaModal.url} controls autoPlay style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '8px' }} />
            ) : (
              <img src={previewMediaModal.url} alt="preview" style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px' }} />
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog Modal (Exit / Delete / Admin) */}
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
                  : confirmDialog.type === 'block'
                  ? (isContactBlocked ? 'Unblock' : 'Block')
                  : 'Exit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
