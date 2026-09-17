import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Profile from './Profile';
import Search from './Search';
import GroupsIcon from '@mui/icons-material/Groups';
import { getAvatarSrc } from '../utils/avatarHelper';

export default function Contacts({ contacts, currentUser, changeChat, unreadMessages }) {
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
          height: '60px',
          minHeight: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          backgroundColor: '#111b21',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          boxSizing: 'border-box',
        }}
      >
        <h2 style={{ margin: 0, color: '#e9edef', fontSize: '20px', fontWeight: '700', letterSpacing: '0.3px' }}>
          Chats
        </h2>
      </div>

      {/* Search Bar */}
      <Search contacts={contacts} changeChat={changeChat} />

      {/* Contacts List */}
      <div
        className='contacts-scroll-list'
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {contacts && contacts.length > 0 ? (
          contacts.map((contact, index) => {
            const isSelected = contact._id === currentSelected;
            const unread = (contact.unreadCount || 0) + (unreadMessages?.[contact._id] || 0);
            const latest = latestMessages[contact._id];

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