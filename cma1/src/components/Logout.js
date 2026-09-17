import React from 'react';
import { BiPowerOff } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';

export default function Logout() {
  const navigate = useNavigate();
  const handleClick = async () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <button
      type="button"
      title="Click to logout"
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        backgroundColor: '#ea4335',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        padding: '8px 18px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        width: '100%',
        transition: 'background-color 0.2s, transform 0.1s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#d93025')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ea4335')}
    >
      <BiPowerOff style={{ fontSize: '18px' }} />
      <span>Log Out</span>
    </button>
  );
}

