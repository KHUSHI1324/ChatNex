import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import SearchIcon from '@mui/icons-material/Search';
import GroupsIcon from '@mui/icons-material/Groups';
import { getAvatarSrc } from '../utils/avatarHelper';

export default function Search({ contacts = [], changeChat }) {
  const [searchInput, setSearchInput] = useState('');

  const filteredContacts = searchInput.trim() === ''
    ? []
    : contacts.filter((contact) =>
        (contact.username || contact.name || '').toLowerCase().includes(searchInput.toLowerCase())
      );

  const handleClick = (contact) => {
    changeChat(contact);
    setSearchInput('');
  };

  return (
    <div className='sidebar-search-container' style={{ padding: '8px 12px', backgroundColor: '#111b21' }}>
      <div
        className='search-pill-box'
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
          type='text'
          placeholder='Search or start new chat'
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#e9edef',
            fontSize: '13.5px',
          }}
        />
        {searchInput && (
          <span
            onClick={() => setSearchInput('')}
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

      {searchInput.trim() !== '' && (
        <div
          className='search-results-dropdown'
          style={{
            marginTop: '6px',
            backgroundColor: '#111b21',
            borderRadius: '6px',
            overflow: 'hidden',
          }}
        >
          {filteredContacts.length === 0 ? (
            <p style={{ color: '#8696a0', fontSize: '12px', padding: '8px 12px', margin: 0 }}>
              No chats or groups found
            </p>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact._id}
                onClick={() => handleClick(contact)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#202c33')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div style={{ position: 'relative' }}>
                  <img
                    src={getAvatarSrc(contact.avtarImage)}
                    alt='avatar'
                    style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                  />
                  {contact.isGroup && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '-2px',
                        right: '-2px',
                        backgroundColor: '#00a884',
                        borderRadius: '50%',
                        width: '14px',
                        height: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#111b21',
                      }}
                    >
                      <GroupsIcon style={{ fontSize: '10px' }} />
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h4 style={{ margin: 0, color: '#e9edef', fontSize: '14px', fontWeight: '500' }}>
                    {contact.username || contact.name}
                  </h4>
                  {contact.isGroup && (
                    <span style={{ fontSize: '11px', color: '#8696a0' }}>Group</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
