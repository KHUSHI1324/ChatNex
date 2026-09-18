import React, { useState } from 'react';
import CallIcon from '@mui/icons-material/Call';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import SearchIcon from '@mui/icons-material/Search';
import PhoneForwardedIcon from '@mui/icons-material/PhoneForwarded';
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback';
import PhoneMissedIcon from '@mui/icons-material/PhoneMissed';
import AddIcCallIcon from '@mui/icons-material/AddIcCall';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { getAvatarSrc } from '../utils/avatarHelper';

export default function CallsPanel({
  contacts = [],
  currentUser,
  callLogs = [],
  selectedContact = null,
  onStartCall,
  onSelectContact,
  onClearCallLogs,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'missed'
  const [showNewCallModal, setShowNewCallModal] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);

  // Format call timestamp into user-friendly text
  const formatCallTime = (isoString) => {
    if (!isoString) return 'Recent';
    const date = new Date(isoString);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today, ${timeStr}`;

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) return `Yesterday, ${timeStr}`;

    return `${date.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${timeStr}`;
  };

  const formatDurationShort = (secs) => {
    if (!secs || secs === 0) return '';
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    if (mins === 0) return `${rem}s`;
    return `${mins}m ${rem}s`;
  };

  // Filter logs by search query and missed filter
  const filteredLogs = callLogs.filter((log) => {
    const matchesSearch = (log.contact?.username || '')
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || log.status === 'missed' || log.direction === 'missed';
    return matchesSearch && matchesFilter;
  });

  const [newCallSearch, setNewCallSearch] = useState('');

  const modalContacts = contacts.filter((c) =>
    c.username.toLowerCase().includes(newCallSearch.toLowerCase())
  );

  return (
    <div
      className="calls-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: '#111b21',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
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
          Calls
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {callLogs.length > 0 && (
            <button
              type="button"
              title="Clear call history"
              onClick={() => setShowClearConfirmModal(true)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#8696a0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px',
                borderRadius: '50%',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ea4335')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#8696a0')}
            >
              <DeleteOutlineIcon style={{ fontSize: '20px' }} />
            </button>
          )}

          <div
            title="Start new call"
            onClick={() => setShowNewCallModal(true)}
            style={{
              cursor: 'pointer',
              color: '#00a884',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0,168,132,0.12)',
            }}
          >
            <AddIcCallIcon style={{ fontSize: '20px' }} />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ padding: '8px 12px 4px 12px', backgroundColor: '#111b21' }}>
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
            placeholder="Search call logs or contacts"
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
              style={{
                color: '#8696a0',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                padding: '0 4px',
              }}
            >
              ✕
            </span>
          )}
        </div>
      </div>

      {/* Filter Tabs: [ All ] | [ Missed ] */}
      <div style={{ display: 'flex', gap: '8px', padding: '6px 14px 10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button
          type="button"
          onClick={() => setFilterType('all')}
          style={{
            backgroundColor: filterType === 'all' ? '#00a884' : '#202c33',
            color: filterType === 'all' ? '#111b21' : '#8696a0',
            border: 'none',
            borderRadius: '16px',
            padding: '4px 14px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setFilterType('missed')}
          style={{
            backgroundColor: filterType === 'missed' ? '#ea4335' : '#202c33',
            color: filterType === 'missed' ? '#fff' : '#8696a0',
            border: 'none',
            borderRadius: '16px',
            padding: '4px 14px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          Missed
        </button>
      </div>

      {/* Section Title */}
      <div style={{ padding: '10px 16px 4px 16px', color: '#8696a0', fontSize: '11.5px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {filterType === 'missed' ? 'Missed Calls' : 'Recent Call History'}
      </div>

      {/* Call History List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {filteredLogs.length === 0 ? (
          <div style={{ padding: '36px 16px', textAlign: 'center', color: '#8696a0', fontSize: '13px', lineHeight: '1.5' }}>
            {filterType === 'missed' ? 'No missed calls found.' : 'No call history yet. Start a call with any contact!'}
          </div>
        ) : (
          filteredLogs.map((log, idx) => {
            const isMissed = log.status === 'missed' || log.direction === 'missed';
            const isIncoming = log.direction === 'incoming';
            const isVideo = log.type === 'video';
            const isSelected = selectedContact && (selectedContact._id === log.contact?._id || selectedContact.username === log.contact?.username);

            return (
              <div
                key={log.id || idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '11px 16px',
                  gap: '12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                  transition: 'background 0.15s',
                  backgroundColor: isSelected ? '#2a3942' : 'transparent',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = '#202c33';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onClick={() => onSelectContact && onSelectContact(log.contact)}
              >
                {/* Contact Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img
                    src={getAvatarSrc(log.contact?.avtarImage)}
                    alt={log.contact?.username}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      display: 'block',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  />
                </div>

                {/* Contact & Call Metadata - Clean 2-Row WhatsApp Layout */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {/* Top Row: Username + Timestamp */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        color: isMissed ? '#ea4335' : '#e9edef',
                        fontSize: '15px',
                        fontWeight: '500',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {log.contact?.username || 'Unknown Contact'}
                    </span>
                    <span style={{ color: isMissed ? '#ea4335' : '#8696a0', fontSize: '11.5px', whiteSpace: 'nowrap', marginLeft: '6px' }}>
                      {formatCallTime(log.timestamp)}
                    </span>
                  </div>

                  {/* Bottom Row: Direction + Call Type + Duration + Redial Action */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#8696a0', fontSize: '12px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {isMissed ? (
                        <PhoneMissedIcon style={{ fontSize: '14px', color: '#ea4335', flexShrink: 0 }} />
                      ) : isIncoming ? (
                        <PhoneCallbackIcon style={{ fontSize: '14px', color: '#00a884', flexShrink: 0 }} />
                      ) : (
                        <PhoneForwardedIcon style={{ fontSize: '14px', color: '#00a884', flexShrink: 0 }} />
                      )}

                      <span style={{ color: isMissed ? '#ea4335' : '#8696a0' }}>
                        {isMissed ? 'Missed' : isIncoming ? 'Incoming' : 'Outgoing'}
                      </span>
                      <span>•</span>
                      <span>{isVideo ? 'Video' : 'Voice'}</span>
                      {!isMissed && log.duration > 0 && (
                        <span style={{ color: '#00a884' }}>
                          ({formatDurationShort(log.duration)})
                        </span>
                      )}
                    </div>

                    {/* Quick 1-Click Redial Icon */}
                    <div style={{ display: 'flex', alignItems: 'center', marginLeft: '6px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        title={isVideo ? `Video call ${log.contact?.username}` : `Voice call ${log.contact?.username}`}
                        onClick={() => onStartCall && onStartCall(log.contact, log.type || 'audio')}
                        style={{
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#00a884',
                          cursor: 'pointer',
                          padding: '3px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#00e676';
                          e.currentTarget.style.transform = 'scale(1.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#00a884';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        {isVideo ? <VideoCallIcon style={{ fontSize: '18px' }} /> : <CallIcon style={{ fontSize: '17px' }} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Start New Call Modal */}
      {showNewCallModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(11, 20, 26, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => {
            setShowNewCallModal(false);
            setNewCallSearch('');
          }}
        >
          <div
            style={{
              backgroundColor: '#202c33',
              borderRadius: '16px',
              width: '400px',
              maxWidth: '92vw',
              padding: '22px',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.7)',
              maxHeight: '82vh',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', color: '#e9edef', fontSize: '19px', fontWeight: '600' }}>
                  Start a New Call
                </h3>
                <p style={{ margin: 0, color: '#8696a0', fontSize: '12.5px' }}>
                  Select a contact to begin a voice or video call
                </p>
              </div>
              <span
                onClick={() => {
                  setShowNewCallModal(false);
                  setNewCallSearch('');
                }}
                style={{
                  color: '#8696a0',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  padding: '4px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#8696a0')}
              >
                ✕
              </span>
            </div>

            {/* Modal Search Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#111b21',
                borderRadius: '8px',
                padding: '6px 10px',
                gap: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
                marginBottom: '14px',
              }}
            >
              <SearchIcon style={{ color: '#8696a0', fontSize: '18px' }} />
              <input
                type="text"
                placeholder="Search contacts..."
                value={newCallSearch}
                onChange={(e) => setNewCallSearch(e.target.value)}
                style={{
                  flex: 1,
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#e9edef',
                  fontSize: '13px',
                }}
              />
              {newCallSearch && (
                <span
                  onClick={() => setNewCallSearch('')}
                  style={{
                    color: '#8696a0',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    padding: '0 2px',
                  }}
                >
                  ✕
                </span>
              )}
            </div>

            {/* Contacts List */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '280px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {modalContacts.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#8696a0', padding: '24px 10px', fontSize: '13px' }}>
                  No contacts found matching "{newCallSearch}"
                </div>
              ) : (
                modalContacts.map((c) => (
                  <div
                    key={c._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: 'transparent',
                      transition: 'background 0.15s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#111b21')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img
                        src={getAvatarSrc(c.avtarImage)}
                        alt={c.username}
                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                      <span style={{ color: '#e9edef', fontSize: '14.5px', fontWeight: '500' }}>
                        {c.username}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        title="Voice Call"
                        onClick={() => {
                          setShowNewCallModal(false);
                          setNewCallSearch('');
                          onStartCall && onStartCall(c, 'audio');
                        }}
                        style={{
                          backgroundColor: '#202c33',
                          border: '1px solid rgba(0,168,132,0.3)',
                          color: '#00a884',
                          borderRadius: '50%',
                          width: '36px',
                          height: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#00a884';
                          e.currentTarget.style.color = '#111b21';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#202c33';
                          e.currentTarget.style.color = '#00a884';
                        }}
                      >
                        <CallIcon style={{ fontSize: '18px' }} />
                      </button>

                      <button
                        type="button"
                        title="Video Call"
                        onClick={() => {
                          setShowNewCallModal(false);
                          setNewCallSearch('');
                          onStartCall && onStartCall(c, 'video');
                        }}
                        style={{
                          backgroundColor: '#202c33',
                          border: '1px solid rgba(0,168,132,0.3)',
                          color: '#00a884',
                          borderRadius: '50%',
                          width: '36px',
                          height: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#00a884';
                          e.currentTarget.style.color = '#111b21';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#202c33';
                          e.currentTarget.style.color = '#00a884';
                        }}
                      >
                        <VideoCallIcon style={{ fontSize: '20px' }} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* In-App Confirmation Modal for Clearing Call History */}
      {showClearConfirmModal && (
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
          onClick={() => setShowClearConfirmModal(false)}
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
                  flexShrink: 0,
                }}
              >
                <DeleteOutlineIcon style={{ fontSize: '20px' }} />
              </div>
              <h3 style={{ margin: 0, color: '#e9edef', fontSize: '17px', fontWeight: '600' }}>
                Clear call log?
              </h3>
            </div>

            <p style={{ margin: 0, color: '#8696a0', fontSize: '13.5px', lineHeight: '1.5' }}>
              Do you want to clear your entire call history? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#8696a0',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13.5px',
                  transition: 'background 0.2s',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowClearConfirmModal(false);
                  onClearCallLogs && onClearCallLogs();
                }}
                style={{
                  backgroundColor: '#ea868f',
                  border: 'none',
                  color: '#111b21',
                  fontWeight: '600',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13.5px',
                  transition: 'background 0.2s',
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
