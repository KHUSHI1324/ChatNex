import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getStatusRoute } from '../utils/APIRoutes';
import AddIcon from '@mui/icons-material/Add';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CreateStatusModal from './CreateStatusModal';
import StatusViewerModal from './StatusViewerModal';

export default function StatusPanel({ currentUser, socket, showToast }) {
  const [myStatuses, setMyStatuses] = useState([]);
  const [contactStatuses, setContactStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeViewer, setActiveViewer] = useState(null); // { stories, user, initialIndex }

  const fetchStatuses = useCallback(async () => {
    if (!currentUser?._id) return;
    try {
      setLoading(true);
      const res = await axios.get(`${getStatusRoute}/${currentUser._id}`);
      if (res.data?.status) {
        setMyStatuses(res.data.myStatuses || []);
        setContactStatuses(res.data.contactStatuses || []);
      }
    } catch (err) {
      console.error('Error fetching statuses:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?._id]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  // Real-time socket listener for new/updated statuses
  useEffect(() => {
    if (!socket?.current) return;
    const handleStatusFeed = () => {
      fetchStatuses();
    };

    socket.current.on('status-updated-feed', handleStatusFeed);
    return () => {
      socket.current?.off('status-updated-feed', handleStatusFeed);
    };
  }, [socket, fetchStatuses]);

  const handleOpenMyStory = () => {
    if (myStatuses.length > 0) {
      setActiveViewer({
        stories: myStatuses,
        user: currentUser,
        initialIndex: 0,
      });
    } else {
      setIsCreateModalOpen(true);
    }
  };

  const handleOpenContactStory = (group) => {
    setActiveViewer({
      stories: group.stories,
      user: group.user,
      initialIndex: 0,
    });
  };

  const unseenContacts = contactStatuses.filter((c) => c.hasUnseen);
  const seenContacts = contactStatuses.filter((c) => !c.hasUnseen);

  const formatStatusTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return isToday ? `Today, ${time}` : `Yesterday, ${time}`;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#111b21',
        color: '#e9edef',
      }}
    >
      <style>{`
        .status-card {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          cursor: pointer;
          transition: background 0.15s;
          border-radius: 8px;
        }
        .status-card:hover {
          background-color: #202c33;
        }
        .story-ring-unseen {
          box-shadow: 0 0 0 2.5px #00a884;
        }
        .story-ring-seen {
          box-shadow: 0 0 0 2.5px #8696a0;
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          padding: '14px 16px 8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#202c33',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
          <span style={{ color: '#00a884', fontWeight: '800', fontSize: '20px', letterSpacing: '-0.01em', lineHeight: '1.1' }}>
            ChatNex
          </span>
          <span style={{ color: '#8696a0', fontSize: '17px', fontWeight: '600', letterSpacing: '0.2px', marginTop: '2px', lineHeight: '1.2' }}>
            Status
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            title="Create Status"
            style={{
              background: 'rgba(0,168,132,0.15)',
              border: '1px solid #00a884',
              color: '#00a884',
              cursor: 'pointer',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            <PhotoCameraIcon style={{ fontSize: '19px' }} />
          </button>
        </div>
      </div>

      {/* Status List Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {/* My Status Section */}
        <div className="status-card" onClick={handleOpenMyStory}>
          <div style={{ position: 'relative', marginRight: '16px' }}>
            <img
              src={currentUser?.avtarImage || 'https://api.dicebear.com/7.x/bottts/svg?seed=me'}
              alt="My Status"
              className={myStatuses.length > 0 ? 'story-ring-unseen' : ''}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                objectFit: 'cover',
                padding: myStatuses.length > 0 ? '2px' : 0,
              }}
            />
            {myStatuses.length === 0 ? (
              <div
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#00a884',
                  color: '#111b21',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #111b21',
                }}
              >
                <AddIcon style={{ fontSize: '14px', fontWeight: 'bold' }} />
              </div>
            ) : null}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#e9edef' }}>
              My Status
            </div>
            <div style={{ fontSize: '13px', color: '#8696a0' }}>
              {myStatuses.length > 0
                ? `${myStatuses.length} update${myStatuses.length > 1 ? 's' : ''} • ${formatStatusTime(myStatuses[myStatuses.length - 1]?.createdAt)}`
                : 'Tap to add status update'}
            </div>
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.06)', margin: '12px 8px' }} />

        {/* Recent Updates (Unseen) */}
        {unseenContacts.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                fontSize: '12px',
                textTransform: 'uppercase',
                fontWeight: '600',
                color: '#00a884',
                padding: '8px 12px',
                letterSpacing: '0.5px',
              }}
            >
              Recent updates ({unseenContacts.length})
            </div>

            {unseenContacts.map((contact) => (
              <div
                key={contact.user?._id}
                className="status-card"
                onClick={() => handleOpenContactStory(contact)}
              >
                <div style={{ position: 'relative', marginRight: '16px' }}>
                  <img
                    src={contact.user?.avtarImage || 'https://api.dicebear.com/7.x/bottts/svg?seed=status'}
                    alt={contact.user?.username}
                    className="story-ring-unseen"
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      padding: '2px',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#e9edef' }}>
                    {contact.user?.username}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#8696a0' }}>
                    {formatStatusTime(contact.lastUpdated)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Viewed Updates (Seen) */}
        {seenContacts.length > 0 && (
          <div>
            <div
              style={{
                fontSize: '12px',
                textTransform: 'uppercase',
                fontWeight: '600',
                color: '#8696a0',
                padding: '8px 12px',
                letterSpacing: '0.5px',
              }}
            >
              Viewed updates ({seenContacts.length})
            </div>

            {seenContacts.map((contact) => (
              <div
                key={contact.user?._id}
                className="status-card"
                onClick={() => handleOpenContactStory(contact)}
              >
                <div style={{ position: 'relative', marginRight: '16px' }}>
                  <img
                    src={contact.user?.avtarImage || 'https://api.dicebear.com/7.x/bottts/svg?seed=status'}
                    alt={contact.user?.username}
                    className="story-ring-seen"
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      padding: '2px',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: '500', color: '#e9edef' }}>
                    {contact.user?.username}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#8696a0' }}>
                    {formatStatusTime(contact.lastUpdated)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && myStatuses.length === 0 && contactStatuses.length === 0 && (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: '#8696a0',
            }}
          >
            <PhotoCameraIcon style={{ fontSize: '48px', color: 'rgba(255,255,255,0.15)', marginBottom: '12px' }} />
            <h4 style={{ color: '#e9edef', margin: '0 0 6px 0', fontSize: '16px' }}>
              No status updates yet
            </h4>
            <p style={{ margin: 0, fontSize: '13px' }}>
              Tap the camera button above to share photos, videos or text that disappear after 24 hours.
            </p>
          </div>
        )}
      </div>

      {/* Create Story Modal */}
      {isCreateModalOpen && (
        <CreateStatusModal
          currentUser={currentUser}
          onClose={() => setIsCreateModalOpen(false)}
          onStatusCreated={(newStatus) => {
            fetchStatuses();
            showToast?.('success', 'Status Posted', 'Your story is live for 24 hours!');
          }}
          socket={socket}
        />
      )}

      {/* Fullscreen Story Viewer Modal */}
      {activeViewer && (
        <StatusViewerModal
          stories={activeViewer.stories}
          user={activeViewer.user}
          currentUser={currentUser}
          initialIndex={activeViewer.initialIndex}
          onClose={() => {
            setActiveViewer(null);
            fetchStatuses();
          }}
          onStatusDeleted={(deletedId) => {
            fetchStatuses();
          }}
          socket={socket}
          showToast={showToast}
        />
      )}
    </div>
  );
}
