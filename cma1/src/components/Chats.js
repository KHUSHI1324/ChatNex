import React, { useState } from 'react';
import styled from 'styled-components';
import Msg from '../images/masg.png';
import MessageIcon from '@mui/icons-material/Message';
export default function Chats({ contacts ,changeChat }) {
  const [showNewPage, setShowNewPage] = useState(false);
  const [currentSelected, setCurrentSelected] = useState(undefined);
  
  const toggleNewPage = () => {
    setShowNewPage(prevState => !prevState);
  };

  const changeCurrentChat = (index, contact) => {
    setCurrentSelected(index);
    changeChat(contact);
  };

  return (
    <div>
      <div className='img' title='Start chats' onClick={toggleNewPage}>
        <div className="img">< MessageIcon  /></div>
      </div>
      {showNewPage && (
        <NewPage onClick={toggleNewPage}>
            <p>Contacts :</p>
          <div title='start conv.' className='contacts'>
          {contacts && contacts.map((contact, index) => (
            <div
              className={`contact ${
                index === currentSelected ? 'selected' : ''
              }`}
              key={index}
              onClick={() => changeCurrentChat(index, contact)}
            >
              <div className='avtar'>
                <img
                  src={`data:image/svg+xml;base64,${contact.avtarImage}`}
                  alt='avtar'
                />
              </div>
              <div className='username'>
                <p>{contact.username}</p>
              </div>
            </div>
          ))}
        </div>
      
        </NewPage>
      )}
    </div>
  );
}

const NewPage = styled.div`
  position: fixed;
  top: 9%;
  left: 3.5%;
  right: 74%;
  height: 85%;
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
