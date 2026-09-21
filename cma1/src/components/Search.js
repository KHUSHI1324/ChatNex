import React from 'react';
import SearchIcon from '@mui/icons-material/Search';

export default function Search({ searchQuery = '', setSearchQuery }) {
  return (
    <div className='sidebar-search-container' style={{ padding: '6px 14px 10px 14px', backgroundColor: '#111b21' }}>
      <div
        className='search-pill-box'
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#202c33',
          borderRadius: '8px',
          padding: '6px 12px',
          gap: '10px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <SearchIcon style={{ color: '#8696a0', fontSize: '20px' }} />
        <input
          type='text'
          placeholder='Search chats and groups...'
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
        {searchQuery && (
          <span
            onClick={() => setSearchQuery('')}
            style={{
              color: '#8696a0',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
              padding: '2px 6px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
            }}
            title='Clear'
          >
            ✕
          </span>
        )}
      </div>
    </div>
  );
}
