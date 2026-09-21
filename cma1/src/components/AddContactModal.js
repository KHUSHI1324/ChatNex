import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import SearchIcon from '@mui/icons-material/Search';
import ChatIcon from '@mui/icons-material/Chat';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import { getAvatarSrc } from '../utils/avatarHelper';
import { searchUsersRoute, addContactRoute } from '../utils/APIRoutes';

export default function AddContactModal({ isOpen, onClose, currentUser, contacts = [], onContactAdded }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const debounceTimer = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setIsLoading(false);
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await axios.get(searchUsersRoute, {
          params: {
            q: q,
            currentUserId: currentUser?._id,
          },
        });
        if (res.data && Array.isArray(res.data)) {
          setSearchResults(res.data);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.warn('Error searching users:', err);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery, currentUser?._id]);

  if (!isOpen) return null;

  const existingContactIds = new Set(contacts.map((c) => c._id?.toString()));

  const handleAddAndChat = async (user) => {
    setAddingId(user._id);
    try {
      if (currentUser?._id && user?._id) {
        await axios.post(addContactRoute, {
          userId: currentUser._id,
          contactId: user._id,
        });
      }
      onContactAdded(user);
      onClose();
    } catch (err) {
      console.error('Error adding contact:', err);
      onContactAdded(user);
      onClose();
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backdropFilter: 'blur(5px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#111b21',
          width: '420px',
          maxWidth: '95vw',
          maxHeight: '85vh',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            backgroundColor: '#202c33',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 168, 132, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00a884',
              }}
            >
              <PersonAddAlt1Icon style={{ fontSize: '20px' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#e9edef', fontSize: '16px', fontWeight: '600' }}>
                Add Contact
              </h3>
              <span style={{ fontSize: '11.5px', color: '#8696a0' }}>
                Search users by username to start a chat
              </span>
            </div>
          </div>
          <button
            type='button'
            onClick={onClose}
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
          >
            <CloseIcon style={{ fontSize: '20px' }} />
          </button>
        </div>

        {/* Search Input Box */}
        <div style={{ padding: '12px 18px', backgroundColor: '#111b21' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#202c33',
              borderRadius: '8px',
              padding: '8px 12px',
              gap: '10px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <SearchIcon style={{ color: '#8696a0', fontSize: '20px' }} />
            <input
              type='text'
              autoFocus
              placeholder='Search by username...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#e9edef',
                fontSize: '14px',
              }}
            />
            {isLoading && <CircularProgress size={16} style={{ color: '#00a884' }} />}
            {searchQuery && (
              <span
                onClick={() => setSearchQuery('')}
                style={{
                  color: '#8696a0',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  padding: '2px 6px',
                }}
              >
                ✕
              </span>
            )}
          </div>
        </div>

        {/* Results List */}
        <div
          className='chatnex-custom-scrollbar'
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 12px 12px 12px',
            minHeight: '180px',
            maxHeight: '320px',
          }}
        >
          {searchQuery.trim() === '' ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: '#8696a0' }}>
              <PersonAddAlt1Icon style={{ fontSize: '42px', color: '#3b4a54', marginBottom: '8px' }} />
              <p style={{ margin: 0, fontSize: '13.5px' }}>
                Type a username to search registered users
              </p>
            </div>
          ) : searchResults.length === 0 && !isLoading ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: '#8696a0' }}>
              <p style={{ margin: 0, fontSize: '13.5px' }}>
                No user found matching "{searchQuery}"
              </p>
            </div>
          ) : (
            searchResults.map((user) => {
              const isAlreadyInContacts = existingContactIds.has(user._id?.toString());
              return (
                <div
                  key={user._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    marginBottom: '4px',
                    backgroundColor: '#182229',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#202c33')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#182229')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <img
                      src={getAvatarSrc(user.avtarImage)}
                      alt={user.username}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        flexShrink: 0,
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span
                        style={{
                          color: '#e9edef',
                          fontWeight: '600',
                          fontSize: '14.5px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {user.username}
                      </span>
                    </div>
                  </div>

                  <button
                    type='button'
                    disabled={addingId === user._id}
                    onClick={() => handleAddAndChat(user)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: isAlreadyInContacts ? '#2a3942' : '#00a884',
                      color: isAlreadyInContacts ? '#00a884' : '#111b21',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '7px 14px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    {addingId === user._id ? (
                      <CircularProgress size={14} color='inherit' />
                    ) : (
                      <>
                        <ChatIcon style={{ fontSize: '15px' }} />
                        <span>{isAlreadyInContacts ? 'Chat' : 'Add & Chat'}</span>
                      </>
                    )}
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
