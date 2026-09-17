import React, { useState, useEffect } from 'react';
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getAvatarSrc } from '../utils/avatarHelper';

export default function CallModal({
  callData,
  contacts = [],
  currentUser,
  onClose,
  onEndCall,
}) {
  const [callStatus, setCallStatus] = useState('Calling...');
  const [callSeconds, setCallSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callData?.type !== 'video');
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [participants, setParticipants] = useState([]);
  const [justAddedName, setJustAddedName] = useState(null);

  // Initialize participants based on whether it's a group or 1-on-1 call
  useEffect(() => {
    if (callData?.contact) {
      if (callData.contact.isGroup && Array.isArray(callData.contact.members)) {
        const otherMembers = callData.contact.members.filter(
          (m) => (m._id || m).toString() !== (currentUser?._id || '').toString()
        );
        setParticipants(otherMembers.length > 0 ? otherMembers : [callData.contact]);
      } else {
        setParticipants([callData.contact]);
      }
    }
  }, [callData, currentUser]);

  useEffect(() => {
    const ringTimer = setTimeout(() => {
      setCallStatus('Ringing...');
    }, 1200);

    const connectTimer = setTimeout(() => {
      setCallStatus('Connected');
    }, 3000);

    return () => {
      clearTimeout(ringTimer);
      clearTimeout(connectTimer);
    };
  }, []);

  useEffect(() => {
    let interval = null;
    if (callStatus === 'Connected') {
      interval = setInterval(() => {
        setCallSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  };

  const handleEnd = () => {
    if (onEndCall && callData?.contact) {
      onEndCall({
        contact: callData.contact,
        type: callData.type || 'audio',
        direction: 'outgoing',
        status: callStatus === 'Connected' ? 'attended' : 'cancelled',
        duration: callSeconds,
        timestamp: new Date().toISOString(),
      });
    }
    onClose();
  };

  const handleAddParticipant = (contactToAdd) => {
    if (!contactToAdd) return;
    const exists = participants.some(
      (p) => (p._id || p).toString() === (contactToAdd._id || contactToAdd).toString()
    );
    if (!exists) {
      setParticipants((prev) => [...prev, contactToAdd]);
      setJustAddedName(contactToAdd.username || contactToAdd.name);
      setTimeout(() => setJustAddedName(null), 3000);
    }
    setShowAddUserModal(false);
  };

  if (!callData || !callData.contact) return null;

  const { contact, type } = callData;
  const isVideo = type === 'video';
  const isMultiUser = participants.length > 1;

  // Filter contacts available to add
  const currentParticipantIds = new Set(
    participants.map((p) => (p._id || p).toString())
  );
  if (currentUser?._id) {
    currentParticipantIds.add(currentUser._id.toString());
  }

  const availableContactsToAdd = contacts.filter(
    (c) => !c.isGroup && !currentParticipantIds.has((c._id || c).toString()) &&
    ((c.username || c.name || '').toLowerCase().includes(addSearchQuery.toLowerCase()))
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(11, 20, 26, 0.92)',
        backdropFilter: 'blur(10px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: isMultiUser ? '560px' : '400px',
          maxWidth: '94vw',
          backgroundColor: '#111b21',
          borderRadius: '20px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
          boxSizing: 'border-box',
          position: 'relative',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Just Added Alert Banner */}
        {justAddedName && (
          <div
            style={{
              position: 'absolute',
              top: '-40px',
              backgroundColor: '#00a884',
              color: '#111b21',
              fontWeight: '700',
              fontSize: '12.5px',
              padding: '6px 16px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <CheckCircleIcon style={{ fontSize: '16px' }} />
            {justAddedName} joined the call
          </div>
        )}

        {/* Call Type & Participant Count Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '16px' }}>
          <span
            style={{
              color: '#00a884',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: '700',
              backgroundColor: 'rgba(0,168,132,0.12)',
              padding: '3px 10px',
              borderRadius: '12px',
            }}
          >
            {isVideo ? '📹 Video Call' : '📞 Voice Call'}
          </span>
          <span style={{ color: '#8696a0', fontSize: '13px', fontWeight: '500' }}>
            {participants.length + 1} participants in call
          </span>
        </div>

        {/* Single Participant Mode */}
        {!isMultiUser ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            {/* Avatar with pulsing wave effect */}
            <div
              style={{
                position: 'relative',
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  border: '3px solid #00a884',
                  animation: 'pulse 1.8s infinite',
                }}
              />
              <img
                src={getAvatarSrc(participants[0]?.avtarImage || contact.avtarImage)}
                alt={participants[0]?.username || contact.name}
                style={{
                  width: '94px',
                  height: '94px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                }}
              />
            </div>

            <h2 style={{ margin: '0 0 4px 0', color: '#e9edef', fontSize: '20px', fontWeight: '600' }}>
              {participants[0]?.name || participants[0]?.username || contact.name || contact.username}
            </h2>
          </div>
        ) : (
          /* Multi-Participant Grid View */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: participants.length > 2 ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)',
              gap: '12px',
              width: '100%',
              maxHeight: '260px',
              overflowY: 'auto',
              marginBottom: '14px',
            }}
          >
            {/* You tile */}
            <div
              style={{
                backgroundColor: '#182229',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid rgba(255,255,255,0.06)',
                position: 'relative',
              }}
            >
              <img
                src={getAvatarSrc(currentUser?.avtarImage)}
                alt="You"
                style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <span style={{ color: '#e9edef', fontSize: '13px', fontWeight: '600' }}>You (Host)</span>
              <span style={{ color: '#00a884', fontSize: '11px' }}>{isMuted ? 'Muted' : 'Speaking'}</span>
            </div>

            {/* Other participants */}
            {participants.map((p, idx) => (
              <div
                key={p._id || idx}
                style={{
                  backgroundColor: '#182229',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  border: '1px solid rgba(0, 168, 132, 0.2)',
                  position: 'relative',
                }}
              >
                <img
                  src={getAvatarSrc(p.avtarImage)}
                  alt={p.username || p.name}
                  style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <span
                  style={{
                    color: '#e9edef',
                    fontSize: '13px',
                    fontWeight: '500',
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.name || p.username}
                </span>
                <span style={{ color: callStatus === 'Connected' ? '#00a884' : '#8696a0', fontSize: '11px' }}>
                  {callStatus === 'Connected' ? 'Connected' : 'Calling...'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Status / Duration */}
        <p style={{ margin: '0 0 24px 0', color: callStatus === 'Connected' ? '#00a884' : '#8696a0', fontSize: '14.5px', fontWeight: '500' }}>
          {callStatus === 'Connected' ? formatTime(callSeconds) : callStatus}
        </p>

        {/* Action Controls Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Mute Button */}
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Unmute' : 'Mute'}
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: isMuted ? '#ea4335' : '#202c33',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            {isMuted ? <MicOffIcon /> : <MicIcon />}
          </button>

          {/* Video Toggle Button */}
          <button
            type="button"
            onClick={() => setIsVideoOff(!isVideoOff)}
            title={isVideoOff ? 'Turn on video' : 'Turn off video'}
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: isVideoOff ? '#202c33' : '#00a884',
              color: isVideoOff ? '#8696a0' : '#111b21',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            {isVideoOff ? <VideocamOffIcon /> : <VideocamIcon />}
          </button>

          {/* Speaker Button */}
          <button
            type="button"
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            title={isSpeakerOn ? 'Speaker on' : 'Speaker off'}
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: isSpeakerOn ? '#202c33' : '#ea4335',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            {isSpeakerOn ? <VolumeUpIcon /> : <VolumeOffIcon />}
          </button>

          {/* Add User / Participant Button */}
          <button
            type="button"
            onClick={() => setShowAddUserModal(true)}
            title="Add user to call"
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: '#00a884',
              color: '#111b21',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <PersonAddIcon style={{ fontSize: '22px' }} />
          </button>

          {/* End Call Button */}
          <button
            type="button"
            onClick={handleEnd}
            title="End Call"
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: '#ea4335',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(234, 67, 53, 0.4)',
              transition: 'transform 0.15s, background-color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <CallEndIcon style={{ fontSize: '26px' }} />
          </button>
        </div>

        {/* Add Participant Popup Modal */}
        {showAddUserModal && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(11, 20, 26, 0.95)',
              borderRadius: '20px',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              padding: '20px',
              boxSizing: 'border-box',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PersonAddIcon style={{ color: '#00a884', fontSize: '22px' }} />
                <h3 style={{ margin: 0, color: '#e9edef', fontSize: '16px' }}>Add participant to call</h3>
              </div>
              <span
                onClick={() => setShowAddUserModal(false)}
                style={{ color: '#8696a0', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}
              >
                ✕
              </span>
            </div>

            {/* Search Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#202c33',
                borderRadius: '8px',
                padding: '5px 10px',
                gap: '8px',
                marginBottom: '12px',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <SearchIcon style={{ color: '#8696a0', fontSize: '18px' }} />
              <input
                type="text"
                placeholder="Search contact to add..."
                value={addSearchQuery}
                onChange={(e) => setAddSearchQuery(e.target.value)}
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

            {/* Contacts list */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {availableContactsToAdd.length > 0 ? (
                availableContactsToAdd.map((c) => (
                  <div
                    key={c._id}
                    onClick={() => handleAddParticipant(c)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: '#182229',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#202c33')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#182229')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img
                        src={getAvatarSrc(c.avtarImage)}
                        alt={c.username}
                        style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <span style={{ color: '#e9edef', fontSize: '14px', fontWeight: '500' }}>
                        {c.username}
                      </span>
                    </div>

                    <button
                      type="button"
                      style={{
                        backgroundColor: '#00a884',
                        color: '#111b21',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontWeight: '700',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      + Add
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#8696a0', fontSize: '13px' }}>
                  No more contacts available to add
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
