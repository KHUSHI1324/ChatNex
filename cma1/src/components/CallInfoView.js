import React, { useState } from 'react';
import CallIcon from '@mui/icons-material/Call';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import MessageIcon from '@mui/icons-material/Message';
import PhoneForwardedIcon from '@mui/icons-material/PhoneForwarded';
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback';
import PhoneMissedIcon from '@mui/icons-material/PhoneMissed';
import SearchIcon from '@mui/icons-material/Search';
import { getAvatarSrc } from '../utils/avatarHelper';

export default function CallInfoView({
  contact,
  callLogs = [],
  onStartCall,
  onOpenChat,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'missed' | 'video' | 'voice'

  if (!contact) {
    return (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#111b21',
          color: '#8696a0',
          padding: '20px',
          boxSizing: 'border-box',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: '#202c33',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#00a884',
            marginBottom: '16px',
          }}
        >
          <CallIcon style={{ fontSize: '40px' }} />
        </div>
        <h3 style={{ margin: '0 0 8px 0', color: '#e9edef', fontSize: '20px' }}>
          Call Details & History
        </h3>
        <p style={{ margin: 0, fontSize: '14px', maxWidth: '360px', lineHeight: '1.5' }}>
          Select a contact from the calls list to view their individual call history timeline, durations, and call stats.
        </p>
      </div>
    );
  }

  // Filter call logs specifically for this contact
  const userLogs = callLogs.filter(
    (log) =>
      log.contact?._id === contact._id ||
      log.contact?.username?.toLowerCase() === contact.username?.toLowerCase()
  );

  const formatDuration = (secs) => {
    if (!secs || secs === 0) return '0s (Not answered)';
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    if (mins === 0) return `${rem} seconds`;
    return `${mins} min ${rem} sec`;
  };

  const formatCallDate = (isoString) => {
    if (!isoString) return 'Today';
    const date = new Date(isoString);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) return 'TODAY';

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) return 'YESTERDAY';

    return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
  };

  // Filter logs by search query & filter type
  const filteredUserLogs = userLogs.filter((log) => {
    const isMissed = log.status === 'missed' || log.direction === 'missed';
    const isVideo = log.type === 'video';
    const isVoice = !isVideo;
    const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase();
    const dateStr = formatCallDate(log.timestamp).toLowerCase();
    const statusStr = isMissed ? 'missed' : log.direction || 'outgoing';
    const typeStr = isVideo ? 'video' : 'voice';

    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      q === '' ||
      timeStr.includes(q) ||
      dateStr.includes(q) ||
      statusStr.includes(q) ||
      typeStr.includes(q);

    let matchesFilter = true;
    if (filterType === 'missed') matchesFilter = isMissed;
    if (filterType === 'video') matchesFilter = isVideo;
    if (filterType === 'voice') matchesFilter = isVoice;

    return matchesSearch && matchesFilter;
  });

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0b141a',
        overflow: 'hidden',
      }}
    >
      {/* Top Header Bar with Live Search */}
      <div
        style={{
          height: '60px',
          minHeight: '60px',
          backgroundColor: '#202c33',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          boxSizing: 'border-box',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ margin: 0, color: '#e9edef', fontSize: '17px', fontWeight: '500' }}>
            Call Info • {contact.username}
          </h3>
        </div>

        {/* Search Bar in Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#111b21',
            borderRadius: '8px',
            padding: '4px 10px',
            gap: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
            width: '240px',
          }}
        >
          <SearchIcon style={{ color: '#8696a0', fontSize: '18px' }} />
          <input
            type="text"
            placeholder="Search in call history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#e9edef',
              fontSize: '12.5px',
            }}
          />
          {searchQuery && (
            <span
              onClick={() => setSearchQuery('')}
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
      </div>

      {/* Main Body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Contact Profile Hero */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: '#111b21',
            borderRadius: '16px',
            padding: '24px',
            width: '100%',
            maxWidth: '520px',
            boxSizing: 'border-box',
            border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: '20px',
          }}
        >
          <img
            src={getAvatarSrc(contact.avtarImage)}
            alt={contact.username}
            style={{
              width: '88px',
              height: '88px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid #00a884',
              marginBottom: '12px',
            }}
          />
          <h2 style={{ margin: '0 0 4px 0', color: '#e9edef', fontSize: '22px', fontWeight: '600' }}>
            {contact.username}
          </h2>
          <span style={{ color: '#8696a0', fontSize: '13.5px', marginBottom: '18px' }}>
            {contact.email || `${contact.username.toLowerCase()}@chatnex.com`}
          </span>

          {/* Action Buttons Row */}
          <div style={{ display: 'flex', gap: '14px' }}>
            <button
              type="button"
              onClick={() => onStartCall && onStartCall(contact, 'audio')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#202c33',
                color: '#00a884',
                border: '1px solid rgba(0,168,132,0.3)',
                borderRadius: '24px',
                padding: '8px 18px',
                fontSize: '13.5px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
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
              <span>Voice Call</span>
            </button>

            <button
              type="button"
              onClick={() => onStartCall && onStartCall(contact, 'video')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#202c33',
                color: '#00a884',
                border: '1px solid rgba(0,168,132,0.3)',
                borderRadius: '24px',
                padding: '8px 18px',
                fontSize: '13.5px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
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
              <span>Video Call</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenChat && onOpenChat(contact)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#202c33',
                color: '#e9edef',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '24px',
                padding: '8px 18px',
                fontSize: '13.5px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2a3942')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#202c33')}
            >
              <MessageIcon style={{ fontSize: '18px' }} />
              <span>Message</span>
            </button>
          </div>
        </div>

        {/* Call Timeline List Section */}
        <div style={{ width: '100%', maxWidth: '520px' }}>
          {/* Section Header & Filter Pills */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ color: '#8696a0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0 }}>
              Call History Timeline ({filteredUserLogs.length})
            </h4>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setFilterType('all')}
                style={{
                  backgroundColor: filterType === 'all' ? '#00a884' : '#202c33',
                  color: filterType === 'all' ? '#111b21' : '#8696a0',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
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
                  borderRadius: '12px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Missed
              </button>
              <button
                type="button"
                onClick={() => setFilterType('video')}
                style={{
                  backgroundColor: filterType === 'video' ? '#00a884' : '#202c33',
                  color: filterType === 'video' ? '#111b21' : '#8696a0',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Video
              </button>
              <button
                type="button"
                onClick={() => setFilterType('voice')}
                style={{
                  backgroundColor: filterType === 'voice' ? '#00a884' : '#202c33',
                  color: filterType === 'voice' ? '#111b21' : '#8696a0',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Voice
              </button>
            </div>
          </div>

          {filteredUserLogs.length === 0 ? (
            <div
              style={{
                backgroundColor: '#111b21',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
                color: '#8696a0',
                fontSize: '13.5px',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {searchQuery ? `No calls matching "${searchQuery}".` : `No ${filterType !== 'all' ? filterType : ''} call logs found with ${contact.username}.`}
            </div>
          ) : (
            filteredUserLogs.map((log, idx) => {
              const isMissed = log.status === 'missed' || log.direction === 'missed';
              const isIncoming = log.direction === 'incoming';
              const isVideo = log.type === 'video';
              const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={log.id || idx}
                  style={{
                    backgroundColor: '#111b21',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    marginBottom: '10px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {/* Call Status Icon */}
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        backgroundColor: isMissed ? 'rgba(234,67,53,0.12)' : 'rgba(0,168,132,0.12)',
                        color: isMissed ? '#ea4335' : '#00a884',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isMissed ? (
                        <PhoneMissedIcon style={{ fontSize: '19px' }} />
                      ) : isIncoming ? (
                        <PhoneCallbackIcon style={{ fontSize: '19px' }} />
                      ) : (
                        <PhoneForwardedIcon style={{ fontSize: '19px' }} />
                      )}
                    </div>

                    {/* Metadata */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: isMissed ? '#ea4335' : '#e9edef', fontSize: '14.5px', fontWeight: '500' }}>
                          {isMissed ? 'Missed Call' : isIncoming ? 'Incoming Call' : 'Outgoing Call'}
                        </span>
                        <span style={{ color: '#8696a0', fontSize: '12px' }}>
                          ({isVideo ? 'Video' : 'Voice'})
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8696a0', fontSize: '12px' }}>
                        <span>{formatCallDate(log.timestamp)}, {timeStr}</span>
                        <span>•</span>
                        <span style={{ color: isMissed ? '#ea4335' : '#00a884' }}>
                          {isMissed ? 'Missed' : formatDuration(log.duration)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Redial Button */}
                  <button
                    type="button"
                    title={isVideo ? 'Redial Video Call' : 'Redial Voice Call'}
                    onClick={() => onStartCall && onStartCall(contact, log.type || 'audio')}
                    style={{
                      backgroundColor: '#202c33',
                      border: 'none',
                      color: '#00a884',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
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
                    {isVideo ? <VideoCallIcon style={{ fontSize: '20px' }} /> : <CallIcon style={{ fontSize: '18px' }} />}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
