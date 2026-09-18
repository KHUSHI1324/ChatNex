import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import GroupsIcon from '@mui/icons-material/Groups';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getAvatarSrc } from '../utils/avatarHelper';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
};

// Creates a 1x1 black video track for devices without a physical camera
function createDummyVideoTrack() {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#111b21';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  const stream = canvas.captureStream ? canvas.captureStream(10) : null;
  const track = stream ? stream.getVideoTracks()[0] : null;
  if (track) track.enabled = false;
  return track;
}

// Creates a silent audio track for devices without a physical microphone
function createSilentAudioTrack() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    const ctx = new AudioContext();
    const dest = ctx.createMediaStreamDestination();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0; // completely silent
    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    const track = dest.stream.getAudioTracks()[0];
    if (track) track.enabled = false;
    return track;
  } catch (e) {
    return null;
  }
}

// Robust getUserMedia that gracefully falls back if camera or mic is missing
async function acquireMediaStream(wantsVideo) {
  let stream = null;

  // 1. Try full requested media (audio + video)
  if (wantsVideo && navigator.mediaDevices?.getUserMedia) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      return { stream, hasCamera: true, hasMic: true };
    } catch (err) {
      console.warn('[WebRTC] Video+Audio capture failed (no camera or permission denied), attempting audio-only fallback:', err.message);
    }
  }

  // 2. Try audio-only if video failed or not requested
  if (navigator.mediaDevices?.getUserMedia) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      // If user wanted video, add a dummy black video track so WebRTC SDP negotiates video capability
      if (wantsVideo) {
        const dummyVideo = createDummyVideoTrack();
        if (dummyVideo) stream.addTrack(dummyVideo);
      }
      return { stream, hasCamera: false, hasMic: true };
    } catch (err) {
      console.warn('[WebRTC] Audio-only capture failed, attempting synthetic stream fallback:', err.message);
    }
  }

  // 3. Synthetic stream fallback (if no hardware mic/camera exists)
  const syntheticStream = new MediaStream();
  const silentAudio = createSilentAudioTrack();
  if (silentAudio) syntheticStream.addTrack(silentAudio);

  if (wantsVideo) {
    const dummyVideo = createDummyVideoTrack();
    if (dummyVideo) syntheticStream.addTrack(dummyVideo);
  }

  return { stream: syntheticStream, hasCamera: false, hasMic: false };
}

export default function CallModal({
  callData,
  contacts = [],
  currentUser,
  socket,
  onClose,
  onEndCall,
}) {
  const [callStatus, setCallStatus] = useState(() =>
    callData?.direction === 'incoming' ? 'Connecting...' : 'Calling...'
  );
  const [callSeconds, setCallSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callData?.type !== 'video');
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [isMinimized, setIsMinimized] = useState(false); // Minimized to header bar
  
  // Multi-party and Conference state
  const [participants, setParticipants] = useState([]);
  const [isConference, setIsConference] = useState(false); // true if conference call
  const [justAddedName, setJustAddedName] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  // Map of userId -> RTCPeerConnection
  const peerConnectionsRef = useRef({});
  // Map of userId -> queue of RTCIceCandidate
  const iceCandidateQueuesRef = useRef({});
  // Map of userId -> boolean
  const remoteDescSetRef = useRef({});

  // Initialize participants from callData
  useEffect(() => {
    if (callData?.contact) {
      if (callData.contact.isGroup && Array.isArray(callData.contact.members)) {
        const otherMembers = callData.contact.members.filter(
          (m) => (m._id || m).toString() !== (currentUser?._id || '').toString()
        );
        setParticipants(
          otherMembers.length > 0
            ? otherMembers.map((m) => ({ ...m, callStatus: 'Connected' }))
            : [{ ...callData.contact, callStatus: 'Connected' }]
        );
        setIsConference(otherMembers.length > 1);
      } else {
        setParticipants([
          {
            ...callData.contact,
            callStatus: callData.direction === 'incoming' ? 'Connected' : 'Calling...',
          },
        ]);
      }
    }
  }, [callData, currentUser]);

  const flushIceCandidates = async (targetId, pc) => {
    const queue = iceCandidateQueuesRef.current[targetId] || [];
    iceCandidateQueuesRef.current[targetId] = [];
    for (const candidate of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn(`[ICE] Queued candidate failed for ${targetId}:`, e.message);
      }
    }
  };

  // Helper to create and configure a peer connection for a target user
  const createPeerForTarget = useCallback(
    (targetId) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionsRef.current[targetId] = pc;
      iceCandidateQueuesRef.current[targetId] = [];
      remoteDescSetRef.current[targetId] = false;

      // Add local tracks to new connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      pc.ontrack = (event) => {
        console.log(`[WebRTC] ontrack received from ${targetId}`);
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setCallStatus('Connected');
        setParticipants((prev) =>
          prev.map((p) => {
            const pId = (p._id || p).toString();
            return pId === targetId ? { ...p, callStatus: 'Connected' } : p;
          })
        );
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socket?.current) {
          socket.current.emit('ice-candidate', {
            to: targetId,
            from: currentUser?._id,
            candidate: event.candidate,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(`[WebRTC] Connection state with ${targetId}:`, pc.connectionState);
        if (pc.connectionState === 'connected') {
          setCallStatus('Connected');
          setParticipants((prev) =>
            prev.map((p) => {
              const pId = (p._id || p).toString();
              return pId === targetId ? { ...p, callStatus: 'Connected' } : p;
            })
          );
        } else if (pc.connectionState === 'failed') {
          console.warn(`[WebRTC] Peer connection failed with ${targetId}`);
        }
      };

      return pc;
    },
    [currentUser, socket]
  );

  // Initial WebRTC Setup with automatic Fallback
  useEffect(() => {
    if (!callData?.contact) return;
    let active = true;
    const direction = callData.direction || 'outgoing';
    const isCallee = direction === 'incoming';
    const targetId = (callData.contact._id || callData.contact).toString();
    const offerSignal = callData.signalData;
    const isVideoCall = callData.type === 'video';

    async function startWebRTC() {
      try {
        // Robust media acquisition (with fallback for no camera/mic)
        const { stream, hasCamera } = await acquireMediaStream(isVideoCall);
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        if (!hasCamera && isVideoCall) {
          setIsVideoOff(true);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const pc = createPeerForTarget(targetId);

        if (!isCallee) {
          // CALLER: create offer
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: isVideoCall,
          });
          await pc.setLocalDescription(offer);

          if (socket?.current && targetId) {
            socket.current.emit('call-user', {
              to: targetId,
              from: currentUser?._id,
              callerName: currentUser?.username,
              callerAvatar: currentUser?.avtarImage,
              callType: callData.type || 'audio',
              signalData: offer,
              isGroup: !!callData.contact.isGroup,
              groupId: callData.contact.isGroup ? targetId : null,
              targetMemberIds: callData.contact.members || [],
            });
          }
        } else {
          // CALLEE: set remote desc (offer) -> create answer -> send
          if (offerSignal) {
            await pc.setRemoteDescription(new RTCSessionDescription(offerSignal));
            remoteDescSetRef.current[targetId] = true;
            await flushIceCandidates(targetId, pc);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            if (socket?.current) {
              socket.current.emit('answer-call', {
                to: targetId,
                from: currentUser?._id,
                signalData: answer,
              });
            }
            setCallStatus('Connected');
          }
        }
      } catch (err) {
        console.warn('[WebRTC] startWebRTC fallback caught error:', err);
      }
    }

    startWebRTC();

    return () => {
      active = false;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      Object.values(peerConnectionsRef.current).forEach((pc) => {
        try {
          pc.close();
        } catch (_) {}
      });
      peerConnectionsRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Socket signaling listeners
  useEffect(() => {
    if (!socket?.current) return;
    const socketRef = socket.current;

    const handleCallAnswered = async (data) => {
      const fromId = (data?.from?._id || data?.from || '').toString();
      console.log(`[FRONTEND] Call answered by ${fromId}:`, data);

      const pc =
        peerConnectionsRef.current[fromId] || Object.values(peerConnectionsRef.current)[0];
      if (pc && data?.signalData) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.signalData));
          if (fromId) remoteDescSetRef.current[fromId] = true;
          await flushIceCandidates(fromId, pc);
        } catch (e) {
          console.error('[WebRTC] setRemoteDescription (answer):', e);
        }
      }

      // Automatically connect user and auto-upgrade to Conference if multiple participants
      setParticipants((prev) => {
        const updated = prev.map((p) => {
          const pId = (p._id || p).toString();
          return pId === fromId ? { ...p, callStatus: 'Connected' } : p;
        });

        const connectedCount = updated.filter((p) => p.callStatus === 'Connected').length;
        if (connectedCount > 1) {
          setIsConference(true);
        }

        // Notify all peers to automatically sync participants without manual merge
        const allMembers = [
          {
            _id: currentUser._id,
            username: currentUser.username,
            avtarImage: currentUser.avtarImage,
          },
          ...updated.map((p) => ({
            _id: p._id,
            username: p.username || p.name,
            avtarImage: p.avtarImage,
            callStatus: p.callStatus,
          })),
        ];
        const targetIds = updated.map((p) => (p._id || p).toString());
        if (socketRef && targetIds.length > 0) {
          socketRef.emit('call-merge', {
            to: targetIds,
            from: currentUser?._id,
            isConference: connectedCount > 1,
            participants: allMembers,
          });
        }

        return updated;
      });
      setCallStatus('Connected');
    };

    const handleIceCandidate = async (data) => {
      if (!data?.candidate) return;
      const fromId = (data?.from?._id || data?.from || '').toString();
      const pc =
        peerConnectionsRef.current[fromId] || Object.values(peerConnectionsRef.current)[0];
      if (!pc) return;

      if (remoteDescSetRef.current[fromId]) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.warn('[ICE] addIceCandidate:', e.message);
        }
      } else {
        if (!iceCandidateQueuesRef.current[fromId]) {
          iceCandidateQueuesRef.current[fromId] = [];
        }
        iceCandidateQueuesRef.current[fromId].push(data.candidate);
      }
    };

    const handleCallMerge = (data) => {
      console.log('[FRONTEND] auto conference sync event received:', data);
      setIsConference(Boolean(data?.isConference));

      const mergedList = data?.participants || [];
      const currentUserId = (currentUser?._id || '').toString();
      const otherParticipants = mergedList.filter(
        (p) => (p._id || p).toString() !== currentUserId
      );
      if (otherParticipants.length > 0) {
        setParticipants(
          otherParticipants.map((p) => ({ ...p, callStatus: p.callStatus || 'Connected' }))
        );
      }
    };

    const handleCallEnded = (data) => {
      const fromId = (data?.from?._id || data?.from || '').toString();
      console.log(`[FRONTEND] call-ended event received from ${fromId}:`, data);

      if (fromId && peerConnectionsRef.current[fromId]) {
        try {
          peerConnectionsRef.current[fromId].close();
        } catch (_) {}
        delete peerConnectionsRef.current[fromId];
      }

      setParticipants((prev) => {
        const remaining = prev.filter((p) => (p._id || p).toString() !== fromId);

        if (remaining.length === 0) {
          setCallStatus('Call Ended');
          setTimeout(() => handleEnd(), 1200);
        } else if (remaining.length === 1) {
          // Exactly 1 remote participant remains -> reset conference title
          setIsConference(false);
        }
        return remaining;
      });
    };

    socketRef.on('call-answered', handleCallAnswered);
    socketRef.on('ice-candidate', handleIceCandidate);
    socketRef.on('call-merge', handleCallMerge);
    socketRef.on('call-ended', handleCallEnded);

    return () => {
      socketRef.off('call-answered', handleCallAnswered);
      socketRef.off('ice-candidate', handleIceCandidate);
      socketRef.off('call-merge', handleCallMerge);
      socketRef.off('call-ended', handleCallEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, currentUser]);

  // Call timer
  useEffect(() => {
    if (callStatus !== 'Connected') return;
    const interval = setInterval(() => setCallSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [callStatus]);

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((prev) => !prev);
  };

  const toggleVideo = async () => {
    const currentVideoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (isVideoOff) {
      // User wants to turn camera ON
      if (currentVideoTrack && currentVideoTrack.label && !currentVideoTrack.label.includes('canvas')) {
        currentVideoTrack.enabled = true;
        setIsVideoOff(false);
      } else {
        // Try to acquire camera stream
        try {
          const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const camTrack = camStream.getVideoTracks()[0];
          if (camTrack && localStreamRef.current) {
            if (currentVideoTrack) {
              localStreamRef.current.removeTrack(currentVideoTrack);
            }
            localStreamRef.current.addTrack(camTrack);
            if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;

            // Replace track on all active peer connections
            Object.values(peerConnectionsRef.current).forEach((pc) => {
              const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');
              if (videoSender) {
                videoSender.replaceTrack(camTrack);
              } else {
                pc.addTrack(camTrack, localStreamRef.current);
              }
            });
            setIsVideoOff(false);
          }
        } catch (e) {
          console.warn('Cannot turn camera on (no camera hardware or permission):', e.message);
        }
      }
    } else {
      // Turn camera OFF
      if (currentVideoTrack) {
        currentVideoTrack.enabled = false;
      }
      setIsVideoOff(true);
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        Object.values(peerConnectionsRef.current).forEach((pc) => {
          const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (videoSender) videoSender.replaceTrack(screenTrack);
        });

        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
        screenTrack.onended = () => {
          setIsScreenSharing(false);
          if (localStreamRef.current && localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
        };
        setIsScreenSharing(true);
      } catch (err) {
        console.warn('Screen share cancelled:', err);
      }
    } else {
      setIsScreenSharing(false);
      const videoTrack = localStreamRef.current?.getVideoTracks()[0];
      Object.values(peerConnectionsRef.current).forEach((pc) => {
        const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (videoSender && videoTrack) videoSender.replaceTrack(videoTrack);
      });
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ADD PARTICIPANT: Directly dial 3rd user without holding existing call; auto-joins directly upon answer
  const handleAddParticipant = async (contactToAdd) => {
    if (!contactToAdd) return;
    const targetId = (contactToAdd._id || contactToAdd).toString();
    const exists = participants.some((p) => (p._id || p).toString() === targetId);
    if (exists) {
      setShowAddUserModal(false);
      return;
    }

    try {
      // 1. Add to participants list in Calling status (existing participants remain completely live and active!)
      setParticipants((prev) => [...prev, { ...contactToAdd, callStatus: 'Calling...' }]);
      setJustAddedName(contactToAdd.username || contactToAdd.name);
      setTimeout(() => setJustAddedName(null), 3500);

      // 2. Create new WebRTC Peer Connection for the added contact
      const pc = createPeerForTarget(targetId);
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callData.type === 'video',
      });
      await pc.setLocalDescription(offer);

      // 3. Emit call-user event to notify the 3rd user with SDP offer
      if (socket?.current) {
        socket.current.emit('call-user', {
          to: targetId,
          from: currentUser?._id,
          callerName: currentUser?.username,
          callerAvatar: currentUser?.avtarImage,
          callType: callData.type || 'audio',
          signalData: offer,
          isGroup: false,
        });
      }
    } catch (err) {
      console.error('Error adding participant to call:', err);
    }

    setShowAddUserModal(false);
  };

  const handleEnd = () => {
    const targetIds = participants.map((p) => (p._id || p).toString());
    if (targetIds.length === 0 && callData?.contact?._id) {
      targetIds.push(callData.contact._id.toString());
    }

    if (socket?.current && targetIds.length > 0) {
      socket.current.emit('end-call', {
        to: targetIds,
        from: currentUser?._id,
        isGroup: !!callData?.contact?.isGroup,
        targetMemberIds: callData?.contact?.members || [],
        reason: 'hangup',
      });
    }

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    Object.values(peerConnectionsRef.current).forEach((pc) => {
      try {
        pc.close();
      } catch (_) {}
    });
    peerConnectionsRef.current = {};

    if (onEndCall && callData?.contact) {
      onEndCall({
        contact: callData.contact,
        type: callData.type || 'audio',
        direction: callData.direction || 'outgoing',
        status: callStatus === 'Connected' ? 'attended' : 'cancelled',
        duration: callSeconds,
        timestamp: new Date().toISOString(),
      });
    }
    onClose();
  };

  if (!callData || !callData.contact) return null;

  const { contact, type } = callData;
  const isVideo = type === 'video';
  const isMultiUser = participants.length > 1;

  const currentParticipantIds = new Set(participants.map((p) => (p._id || p).toString()));
  if (currentUser?._id) currentParticipantIds.add(currentUser._id.toString());

  const availableContactsToAdd = contacts.filter(
    (c) =>
      !c.isGroup &&
      !currentParticipantIds.has((c._id || c).toString()) &&
      (c.username || c.name || '').toLowerCase().includes(addSearchQuery.toLowerCase())
  );

  // Dynamic Header Title:
  let callHeaderTitle = '';
  if (isConference && participants.length > 1) {
    callHeaderTitle = 'Conference Call';
  } else if (participants.length === 1) {
    callHeaderTitle =
      participants[0].username ||
      participants[0].name ||
      contact.username ||
      contact.name ||
      'Call';
  } else if (participants.length > 1) {
    callHeaderTitle = participants.map((p) => p.username || p.name).join(', ');
  } else {
    callHeaderTitle = contact.username || contact.name || 'Call';
  }

  return (
    <>
      {/* 1. MINIMIZED FLOATING TOP HEADER BAR (Allows chatting simultaneously) */}
      {isMinimized && (
        <div
          style={{
            position: 'fixed',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            backgroundColor: '#1f2c34',
            border: '1px solid rgba(0, 168, 132, 0.6)',
            borderRadius: '32px',
            padding: '8px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.8), 0 0 15px rgba(0, 168, 132, 0.25)',
            cursor: 'pointer',
            maxWidth: '92vw',
            animation: 'fadeInDown 0.25s ease-out',
          }}
          onClick={() => setIsMinimized(false)}
          title="Click to expand call screen"
        >
          <style>{`
            @keyframes pulseGreen {
              0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 168, 132, 0.7); }
              70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(0, 168, 132, 0); }
              100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 168, 132, 0); }
            }
            @keyframes fadeInDown {
              from { opacity: 0; transform: translate(-50%, -20px); }
              to { opacity: 1; transform: translate(-50%, 0); }
            }
          `}</style>

          {/* Pulsing indicator + Call Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <span
              style={{
                width: '11px',
                height: '11px',
                borderRadius: '50%',
                backgroundColor: '#00a884',
                animation: 'pulseGreen 1.5s infinite',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                color: '#e9edef',
                fontWeight: '600',
                fontSize: '13.5px',
                whiteSpace: 'nowrap',
              }}
            >
              {callHeaderTitle}
            </span>
            <span
              style={{
                color: '#00a884',
                fontSize: '13px',
                fontWeight: '600',
                marginLeft: '4px',
              }}
            >
              {formatTime(callSeconds)}
            </span>
          </div>

          <span
            style={{
              color: '#8696a0',
              fontSize: '11.5px',
              borderLeft: '1px solid rgba(255,255,255,0.12)',
              paddingLeft: '12px',
              whiteSpace: 'nowrap',
            }}
          >
            Tap to return
          </span>

          {/* Quick controls on minimized bar */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
              style={{
                backgroundColor: isMuted ? '#f15c6d' : '#2a3942',
                color: '#e9edef',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {isMuted ? (
                <MicOffIcon style={{ fontSize: '17px' }} />
              ) : (
                <MicIcon style={{ fontSize: '17px' }} />
              )}
            </button>

            <button
              type="button"
              onClick={handleEnd}
              title="End Call"
              style={{
                backgroundColor: '#f15c6d',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(241,92,109,0.4)',
              }}
            >
              <CallEndIcon style={{ fontSize: '17px' }} />
            </button>
          </div>
        </div>
      )}

      {/* 2. FULL CALL MODAL SCREEN (Shown when isMinimized is false) */}
      {!isMinimized && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(11,20,26,0.94)',
            backdropFilter: 'blur(12px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: isMultiUser || isVideo ? '640px' : '440px',
              maxWidth: '94vw',
              backgroundColor: '#111b21',
              borderRadius: '20px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
              boxSizing: 'border-box',
              position: 'relative',
            }}
          >
            {/* Top Navigation Row: Back to Chat / Minimize button */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <div
                onClick={() => setIsMinimized(true)}
                style={{
                  cursor: 'pointer',
                  color: '#8696a0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)')
                }
                title="Minimize call to chat with others"
              >
                <ArrowBackIcon style={{ fontSize: '17px', color: '#00a884' }} />
                <span style={{ fontSize: '12px', color: '#e9edef', fontWeight: '500' }}>
                  Back to chat
                </span>
              </div>

              <span style={{ color: '#8696a0', fontSize: '12px', fontWeight: '500' }}>
                {participants.length + 1} participant{participants.length > 0 ? 's' : ''}
              </span>
            </div>

            {/* Floating dial toast */}
            {justAddedName && (
              <div
                style={{
                  position: 'absolute',
                  top: '-42px',
                  backgroundColor: '#00a884',
                  color: '#111b21',
                  fontWeight: '700',
                  fontSize: '12.5px',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}
              >
                <CheckCircleIcon style={{ fontSize: '16px' }} /> Dialing {justAddedName}...
              </div>
            )}

            {/* Header Badges */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                marginBottom: '16px',
              }}
            >
              <span
                style={{
                  color: isConference ? '#38bdf8' : '#00a884',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontWeight: '700',
                  backgroundColor: isConference
                    ? 'rgba(56, 189, 248, 0.14)'
                    : 'rgba(0,168,132,0.12)',
                  border: `1px solid ${
                    isConference ? 'rgba(56, 189, 248, 0.3)' : 'rgba(0,168,132,0.25)'
                  }`,
                  padding: '3px 12px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isConference && <GroupsIcon style={{ fontSize: '16px' }} />}
                {isConference
                  ? 'Conference Call'
                  : isVideo
                  ? '📹 WebRTC HD Video'
                  : '📞 HD Voice Call'}
              </span>
            </div>

            {/* Video Mode View */}
            {isVideo && !isVideoOff ? (
              <div
                style={{
                  width: '100%',
                  height: '280px',
                  backgroundColor: '#000',
                  borderRadius: '12px',
                  position: 'relative',
                  overflow: 'hidden',
                  marginBottom: '16px',
                }}
              >
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    width: '100px',
                    height: '75px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '2px solid #00a884',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                  }}
                >
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: 'scaleX(-1)',
                    }}
                  />
                </div>
              </div>
            ) : !isMultiUser ? (
              /* 1-on-1 Audio Mode View */
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                <style>{`@keyframes ringPulse { 0%{box-shadow:0 0 0 0 rgba(0,168,132,0.6)} 70%{box-shadow:0 0 0 16px rgba(0,168,132,0)} 100%{box-shadow:0 0 0 0 rgba(0,168,132,0)} }`}</style>
                <div
                  style={{
                    position: 'relative',
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '14px',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      border: '3px solid #00a884',
                      animation:
                        callStatus !== 'Connected'
                          ? 'ringPulse 1.5s infinite'
                          : 'none',
                    }}
                  />
                  <img
                    src={getAvatarSrc(participants[0]?.avtarImage || contact.avtarImage)}
                    alt={participants[0]?.username || contact.name}
                    style={{
                      width: '86px',
                      height: '86px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid rgba(255,255,255,0.2)',
                    }}
                  />
                </div>
                <h2
                  style={{
                    margin: '0 0 4px 0',
                    color: '#e9edef',
                    fontSize: '20px',
                    fontWeight: '600',
                  }}
                >
                  {callHeaderTitle}
                </h2>
              </div>
            ) : (
              /* Multi-User / Conference Grid View */
              <div style={{ width: '100%', marginBottom: '16px' }}>
                <h2
                  style={{
                    margin: '0 0 12px 0',
                    color: '#e9edef',
                    fontSize: '19px',
                    fontWeight: '600',
                    textAlign: 'center',
                  }}
                >
                  {callHeaderTitle}
                </h2>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      participants.length > 2 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
                    gap: '10px',
                    width: '100%',
                  }}
                >
                  {participants.map((p) => (
                    <div
                      key={p._id || p}
                      style={{
                        backgroundColor: '#202c33',
                        padding: '12px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div style={{ position: 'relative' }}>
                        <img
                          src={getAvatarSrc(p.avtarImage)}
                          alt={p.username || p.name}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                          }}
                        />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <span
                          style={{
                            color: '#e9edef',
                            fontSize: '13.5px',
                            fontWeight: '500',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {p.username || p.name}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            color:
                              p.callStatus === 'Calling...'
                                ? '#38bdf8'
                                : '#00a884',
                            fontWeight: '500',
                          }}
                        >
                          {p.callStatus || 'Connected'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Call Status & Timer */}
            <div style={{ marginTop: '8px', marginBottom: '20px', textAlign: 'center' }}>
              <div
                style={{
                  color:
                    callStatus === 'Connected'
                      ? '#00a884'
                      : '#8696a0',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {callStatus === 'Connected' && (
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#00a884',
                      display: 'inline-block',
                    }}
                  />
                )}
                {callStatus}
              </div>
              {callStatus === 'Connected' && (
                <div
                  style={{
                    color: '#e9edef',
                    fontSize: '16px',
                    fontWeight: '600',
                    marginTop: '4px',
                  }}
                >
                  {formatTime(callSeconds)}
                </div>
              )}
            </div>

            {/* Call Action Buttons */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {[
                {
                  onClick: toggleMute,
                  title: isMuted ? 'Unmute' : 'Mute',
                  bg: isMuted ? '#f15c6d' : '#202c33',
                  color: '#e9edef',
                  icon: isMuted ? (
                    <MicOffIcon style={{ fontSize: '20px' }} />
                  ) : (
                    <MicIcon style={{ fontSize: '20px' }} />
                  ),
                },
                {
                  onClick: toggleVideo,
                  title: isVideoOff ? 'Video On' : 'Video Off',
                  bg: isVideoOff ? '#202c33' : '#00a884',
                  color: isVideoOff ? '#e9edef' : '#111b21',
                  icon: isVideoOff ? (
                    <VideocamOffIcon style={{ fontSize: '20px' }} />
                  ) : (
                    <VideocamIcon style={{ fontSize: '20px' }} />
                  ),
                },
                ...(isVideo
                  ? [
                      {
                        onClick: toggleScreenShare,
                        title: isScreenSharing ? 'Stop Share' : 'Share Screen',
                        bg: isScreenSharing ? '#53bdeb' : '#202c33',
                        color: isScreenSharing ? '#111b21' : '#e9edef',
                        icon: isScreenSharing ? (
                          <StopScreenShareIcon style={{ fontSize: '20px' }} />
                        ) : (
                          <ScreenShareIcon style={{ fontSize: '20px' }} />
                        ),
                      },
                    ]
                  : []),
                {
                  onClick: () => setIsSpeakerOn((p) => !p),
                  title: isSpeakerOn ? 'Speaker Off' : 'Speaker On',
                  bg: '#202c33',
                  color: isSpeakerOn ? '#00a884' : '#8696a0',
                  icon: isSpeakerOn ? (
                    <VolumeUpIcon style={{ fontSize: '20px' }} />
                  ) : (
                    <VolumeOffIcon style={{ fontSize: '20px' }} />
                  ),
                },
                {
                  onClick: () => setShowAddUserModal(true),
                  title: 'Add Person to Call',
                  bg: '#202c33',
                  color: '#00a884',
                  icon: <PersonAddIcon style={{ fontSize: '20px' }} />,
                },
              ].map((btn, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={btn.onClick}
                  title={btn.title}
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    backgroundColor: btn.bg,
                    color: btn.color,
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {btn.icon}
                </button>
              ))}

              <button
                type="button"
                onClick={handleEnd}
                title="End Call"
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#f15c6d',
                  color: '#fff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(241,92,109,0.4)',
                }}
              >
                <CallEndIcon style={{ fontSize: '26px' }} />
              </button>
            </div>

            {/* Add Person Modal Overlay */}
            {showAddUserModal && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(11,20,26,0.96)',
                  borderRadius: '20px',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '20px',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PersonAddIcon style={{ color: '#00a884', fontSize: '22px' }} />
                    <h3 style={{ margin: 0, color: '#e9edef', fontSize: '16px' }}>
                      Add participant
                    </h3>
                  </div>
                  <span
                    onClick={() => setShowAddUserModal(false)}
                    style={{
                      color: '#8696a0',
                      cursor: 'pointer',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      padding: '4px',
                    }}
                  >
                    ✕
                  </span>
                </div>

                <p style={{ margin: '0 0 10px 0', color: '#8696a0', fontSize: '12px' }}>
                  Adding a participant will connect them directly to this call.
                </p>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#202c33',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    gap: '8px',
                    marginBottom: '12px',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <SearchIcon style={{ color: '#8696a0', fontSize: '18px' }} />
                  <input
                    type="text"
                    placeholder="Search contact..."
                    value={addSearchQuery}
                    onChange={(e) => setAddSearchQuery(e.target.value)}
                    autoFocus
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

                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
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
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = '#202c33')
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor = '#182229')
                        }
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={getAvatarSrc(c.avtarImage)}
                            alt={c.username}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                            }}
                          />
                          <div>
                            <div
                              style={{
                                color: '#e9edef',
                                fontSize: '13.5px',
                                fontWeight: '500',
                              }}
                            >
                              {c.username}
                            </div>
                            <div style={{ color: '#8696a0', fontSize: '11px' }}>
                              {c.email || ''}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          style={{
                            backgroundColor: '#00a884',
                            color: '#111b21',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '4px 12px',
                            fontWeight: '700',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          + Call
                        </button>
                      </div>
                    ))
                  ) : (
                    <div
                      style={{
                        padding: '24px 0',
                        textAlign: 'center',
                        color: '#8696a0',
                        fontSize: '13px',
                      }}
                    >
                      No contacts available to add
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
