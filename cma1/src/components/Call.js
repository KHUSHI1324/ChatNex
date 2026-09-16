import React, { useState } from 'react';
import styled from 'styled-components';
import call from '../images/call.png';
import CallIcon from '@mui/icons-material/Call';

export default function Call({ contacts }) {
  const [showNewPage, setShowNewPage] = useState(false);

  const toggleNewPage = () => {
    setShowNewPage(prevState => !prevState);
  };

  return (
    <div>
      <div className='img2' title='Make a calls' onClick={toggleNewPage}>
        <div className="img"><CallIcon /></div>
      </div>
      {showNewPage && (
        <NewPage onClick={toggleNewPage}>
            <p>Calls</p>
          {/* Render all contacts */}
          {contacts.map((contact, index) => (
            <div title='Contact' className='contact' key={index}>
              <img src={`data:image/svg+xml;base64,${contact.avtarImage}`} alt='Avatar' />
              <p>{contact.username}</p>
            </div>
          ))}
        </NewPage>
      )}
    </div>
  );
}

const NewPage = styled.div`
  position: fixed;
  top: 15%;
  left: 3.5%;
  right: 74%;
  height: 80%;
  background-color: rgba(33,44,50);
  z-index: 999;
  border: 1.5px solid  white;

  border-radius: 0rem 0.5rem 0.5rem 0.5rem;
  cursor: pointer; /* Add cursor pointer to indicate clickable */
  
  &::-webkit-scrollbar {
    width: 0.2rem;

    &-thumb {
      background-color: #131324;
      width: 0.1rem;
      border-radius: 1rem;
    }
  }
  p{
    // alien-item:center;
    // display:flex;
    margin:6px 0px 0px 20px;
    color:white;
  }
  .contact {
    display: flex;
    align-items: center;
    padding: 10px;
    margin:6px;
    gap:1rem;
    // border-bottom: 1px solid #ccc;
    &:hover {
        background-color: rgba(226, 226, 224, 0.884);
        box-shadow: 2px 3px 9px black;
        border-color: black;
        border-radius: 0.5rem;
      }
  }

  .contact img {
    
          height: 3rem;
          border: 1.5px solid whitesmoke;
          border-radius: 5rem;
        //   gap:1rem;
        }
  }

  .contact p {
    margin: 0;
    font-size: 16px;
    font-weight: bold;
  }
`;
