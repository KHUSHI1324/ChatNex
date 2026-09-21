import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Profile from './Profile';
import Search from './Search';
import GroupsIcon from '@mui/icons-material/Groups';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { getAvatarSrc } from '../utils/avatarHelper';
import { CHATNEX_AI_BOT, CHATNEX_AI_BOT_ID } from '../utils/aiBotHelper';

export default function Contacts({
  contacts,
  currentUser,
  changeChat,
  unreadMessages,
  onlineUsers,
  loading = false,
  error = null,
  onRetry,
}) {
  const [currentUserName, setCurrentUserName] = useState(undefined);
  const [currentUserImage, setCurrentUserImage] = useState(undefined);
  const [currentSelected, setCurrentSelected] = useState(undefined);
  const [currentEmail, setCurrentEmail] = useState(undefined);
  const [latestMessages, setLatestMessages] = useState({}); // Store latest messages

  // Function to format timestamps
  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const messageDate = new Date(timestamp);

    // Calculate time difference in milliseconds
    const timeDiff = now - messageDate;
    const oneDay = 24 * 60 * 60 * 1000; // One day in milliseconds
    const twoWeeks = 14 * oneDay; // Two weeks in milliseconds

    if (timeDiff < oneDay) {
      // Today: Show time in hours and minutes
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (timeDiff < twoWeeks) {
      // Within the last two weeks: Show "Yesterday"
      if (now.getDate() - messageDate.getDate() === 1) {
        return 'Yesterday';
      }
      // Otherwise, show the date (e.g., "Mar 1, 2024, 10:15 AM")
      return messageDate.toLocaleString('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } else {
      // Older than two weeks: Show full date and time
      return messageDate.toLocaleString('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
  };

  useEffect(() => {
    if (contacts && contacts.length > 0) {
      const latestMessagesMap = {};
      contacts.forEach((contact) => {
        if (contact.latestMessage && (contact.latestMessage.message || contact.latestMessage.imgpath)) {
          latestMessagesMap[contact._id] = {
            ...contact.latestMessage,
            message: contact.latestMessage.message || "",
            timestamp: contact.latestMessage.timestamp ? formatTimestamp(contact.latestMessage.timestamp) : "",
          };
        } else if (contact.isGroup) {
          const count = contact.members ? contact.members.length : 0;
          latestMessagesMap[contact._id] = {
            message: `${count} members`,
            timestamp: contact.lastMessageTimestamp ? formatTimestamp(contact.lastMessageTimestamp) : "",
          };
        } else {
          latestMessagesMap[contact._id] = null;
        }
      });
      setLatestMessages(latestMessagesMap);
    }
  }, [contacts]);



  useEffect(() => {
    if (currentUser) {
      setCurrentUserImage(currentUser.avtarImage);
      setCurrentUserName(currentUser.username);
      setCurrentEmail(currentUser.email);
    }
  }, [currentUser]);

  const changeCurrentChat = (index, contact) => {
    setCurrentSelected(contact._id);
    changeChat(contact);
  };

  const isAiSelected = currentSelected === CHATNEX_AI_BOT_ID;

  return (
    <div
      className='contacts-panel'
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: '#111b21',
        overflow: 'hidden',
      }}
    >
      {/* Chats Header */}
      <div
        className='contacts-header'
        style={{
          padding: '14px 16px 2px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          backgroundColor: '#111b21',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
          <span style={{ color: '#00a884', fontWeight: '800', fontSize: '20px', letterSpacing: '-0.01em', lineHeight: '1.1' }}>
            ChatNex
          </span>
          <span style={{ color: '#8696a0', fontSize: '17px', fontWeight: '600', letterSpacing: '0.2px', marginTop: '2px', lineHeight: '1.2' }}>
            Chats
          </span>
        </div>
      </div>

      {/* WhatsApp Search Input */}
      <Search />

      {/* Scrollable Contacts / Chats List */}
      <div
        className='contacts-list chatnex-custom-scrollbar'
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Pinned 1-on-1 AI Assistant Conversation */}
        <div
          onClick={() => changeCurrentChat('ai_bot', CHATNEX_AI_BOT)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            gap: '12px',
            cursor: 'pointer',
            backgroundColor: isAiSelected
              ? '#2a3942'
              : 'rgba(0, 168, 132, 0.07)',
            borderBottom: '1px solid rgba(0, 168, 132, 0.2)',
            transition: 'all 0.15s ease',
            boxSizing: 'border-box',
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            if (!isAiSelected) e.currentTarget.style.backgroundColor = 'rgba(0, 168, 132, 0.14)';
          }}
          onMouseLeave={(e) => {
            if (!isAiSelected) e.currentTarget.style.backgroundColor = 'rgba(0, 168, 132, 0.07)';
          }}
        >
          {/* AI Vector Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src={CHATNEX_AI_BOT.avtarImage}
              alt="ChatNex AI"
              style={{
                width: '45px',
                height: '45px',
                borderRadius: '50%',
                objectFit: 'cover',
                display: 'block',
                border: '1.5px solid #00a884',
                boxShadow: '0 0 10px rgba(0, 168, 132, 0.55)',
              }}
            />
            {/* Always Active Pulse Dot */}
            <div
              style={{
                position: 'absolute',
                bottom: '0px',
                right: '0px',
                backgroundColor: '#00a884',
                borderRadius: '50%',
                width: '12px',
                height: '12px',
                border: '2px solid #111b21',
                boxShadow: '0 0 8px rgba(0, 168, 132, 1)',
              }}
              title="ChatNex AI (Always Active)"
            />
          </div>

          {/* AI Info Preview */}
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                ChatNex AI
                <span
                  style={{
                    background: 'linear-gradient(135deg, #00a884, #6366f1)',
                    color: '#fff',
                    borderRadius: '6px',
                    padding: '1px 6px',
                    fontSize: '10px',
                    fontWeight: '700',
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  <AutoAwesomeIcon style={{ fontSize: '11px' }} /> AI Bot
                </span>
              </span>
              <span
                style={{
                  color: '#00a884',
                  fontSize: '11px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                }}
              >
                Always Active
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  color: '#aebac1',
                  fontSize: '13px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}
              >
                ✨ 24/7 AI Assistant • Ask anything or /imagine
              </span>
            </div>
          </div>
        </div>

        {/* Loading Skeletons */}
        {loading ? (
          <div style={{ padding: '4px 0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  gap: '12px',
                  opacity: 0.75,
                }}
              >
                <div
                  style={{
                    width: '45px',
                    height: '45px',
                    borderRadius: '50%',
                    backgroundColor: '#202c33',
                    animation: 'pulse 1.4s infinite ease-in-out',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div
                    style={{
                      width: `${45 + (item * 8)}%`,
                      maxWidth: '70%',
                      height: '14px',
                      borderRadius: '4px',
                      backgroundColor: '#202c33',
                      animation: 'pulse 1.4s infinite ease-in-out',
                    }}
                  />
                  <div
                    style={{
                      width: `${75 - (item * 6)}%`,
                      maxWidth: '90%',
                      height: '11px',
                      borderRadius: '4px',
                      backgroundColor: '#182229',
                      animation: 'pulse 1.4s infinite ease-in-out',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State with Retry Button */
          <div
            style={{
              padding: '36px 18px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div style={{ fontSize: '36px' }}>⚠️</div>
            <h4 style={{ margin: 0, color: '#e9edef', fontSize: '15px', fontWeight: '600' }}>
              Failed to load conversations
            </h4>
            <p style={{ margin: 0, color: '#8696a0', fontSize: '12.5px', lineHeight: '1.45', maxWidth: '240px' }}>
              {error}
            </p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                style={{
                  backgroundColor: '#00a884',
                  border: 'none',
                  color: '#111b21',
                  fontWeight: '700',
                  padding: '8px 20px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  marginTop: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(0, 168, 132, 0.4)',
                  transition: 'transform 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <span>🔄</span> Retry Connection
              </button>
            )}
          </div>
        ) : contacts && contacts.length > 0 ? (
          contacts.map((contact, index) => {
            const isSelected = contact._id === currentSelected;
            const unread = (contact.unreadCount || 0) + (unreadMessages?.[contact._id] || 0);
            const latest = latestMessages[contact._id];
            const isOnline = !contact.isGroup && onlineUsers && (
              onlineUsers instanceof Set
                ? onlineUsers.has(contact._id?.toString())
                : Boolean(onlineUsers.get?.(contact._id?.toString()))
            );

            return (
              <div
                key={contact._id || index}
                onClick={() => changeCurrentChat(index, contact)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  gap: '12px',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#2a3942' : 'transparent',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'background 0.15s',
                  boxSizing: 'border-box',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = '#202c33';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img
                    src={getAvatarSrc(contact.avtarImage)}
                    alt={contact.username || contact.name}
                    style={{
                      width: '45px',
                      height: '45px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      display: 'block',
                      border: contact.isGroup ? '1px solid rgba(0, 168, 132, 0.4)' : '1px solid rgba(255,255,255,0.1)',
                    }}
                  />
                  {/* Glowing Green Online Badge */}
                  {isOnline && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '0px',
                        right: '0px',
                        backgroundColor: '#00a884',
                        borderRadius: '50%',
                        width: '12px',
                        height: '12px',
                        border: '2px solid #111b21',
                        boxShadow: '0 0 6px rgba(0, 168, 132, 0.8)',
                      }}
                      title="Online"
                    />
                  )}
                  {contact.isGroup && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '-2px',
                        right: '-2px',
                        backgroundColor: '#00a884',
                        borderRadius: '50%',
                        width: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#111b21',
                      }}
                      title="Group"
                    >
                      <GroupsIcon style={{ fontSize: '11px' }} />
                    </div>
                  )}
                </div>

                {/* Content info */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {/* Row 1: Username + Timestamp */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        color: '#e9edef',
                        fontSize: '15.5px',
                        fontWeight: unread > 0 ? '600' : '500',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {contact.name || contact.username}
                    </span>
                    {latest?.timestamp && (
                      <span
                        style={{
                          color: unread > 0 ? '#25d366' : '#8696a0',
                          fontSize: '11.5px',
                          fontWeight: unread > 0 ? '600' : '400',
                          whiteSpace: 'nowrap',
                          marginLeft: '6px',
                        }}
                      >
                        {latest.timestamp}
                      </span>
                    )}
                  </div>

                  {/* Row 2: Message preview + Unread Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        color: unread > 0 ? '#e9edef' : '#8696a0',
                        fontSize: '13px',
                        fontWeight: unread > 0 ? '500' : '400',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        paddingRight: '6px',
                      }}
                    >
                      {latest?.message || (contact.isGroup ? `${contact.members?.length || 0} members` : "Start a conversation")}
                    </span>
                    {unread > 0 && (
                      <span
                        style={{
                          backgroundColor: '#25d366',
                          color: '#111b21',
                          borderRadius: '10px',
                          padding: '1px 6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          flexShrink: 0,
                          minWidth: '18px',
                          textAlign: 'center',
                          lineHeight: '16px',
                        }}
                      >
                        {unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#8696a0', fontSize: '13px' }}>
            No contacts available
          </div>
        )}
      </div>
    </div>
  );
}