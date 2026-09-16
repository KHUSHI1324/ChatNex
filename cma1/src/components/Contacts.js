import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Profile from './Profile';
import Search from './Search';
import axios from 'axios';
import { getAllMessagesRoute } from '../utils/APIRoutes';
export default function Contacts({ contacts, currentUser, changeChat }) {
  const [currentUserName, setCurrentUserName] = useState(undefined);
  const [currentUserImage, setCurrentUserImage] = useState(undefined);
  const [currentSelected, setCurrentSelected] = useState(undefined);
  const [currentEmail, setCurrentEmail] = useState(undefined);
  const [latestMessages, setLatestMessages] = useState({}); // Store latest messages

  // Function to format timestamps
  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const messageDate = new Date(timestamp);

    // Calculate time difference in milliseconds
    const timeDiff = now - messageDate;
    const oneDay = 24 * 60 * 60 * 1000; // One day in milliseconds
    const twoWeeks = 14 * oneDay; // Two weeks in milliseconds

    if (timeDiff < oneDay) {
      // Today: Show time in hours and minutes
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (timeDiff < twoWeeks) {
      // Within the last two weeks: Show "Yesterday"
      if (now.getDate() - messageDate.getDate() === 1) {
        return 'Yesterday';
      }
      // Otherwise, show the date (e.g., "Mar 1, 2024, 10:15 AM")
      return messageDate.toLocaleString('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        // hour: '2-digit',
        // minute: '2-digit',
      });
    } else {
      // Older than two weeks: Show full date and time
      return messageDate.toLocaleString('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        // hour: '2-digit',
        // minute: '2-digit',
      });
    }
  };

  useEffect(() => {
    // Fetch messages for each contact
    const fetchMessages = async () => {
      const messagesPromises = contacts.map(async (contact) => {
        try {
          const response = await axios.post(getAllMessagesRoute, {
            from: currentUser._id, // Assuming you have a unique user ID
            to: contact._id, // Contact's unique ID
          });
          const messages = response.data; // Assuming the API returns an array of messages
          const latestMessage = messages[messages.length - 1]; // Get the latest message
         latestMessage.timestamp=formatTimestamp(latestMessage.timestamp);
          return { contactId: contact._id, message: latestMessage };
        } catch (error) {
          console.error('Error fetching messages:', error);
          return { contactId: contact._id, message: null };
        }
      });

      const latestMessagesMap = {};
      const latestMessagesArray = await Promise.all(messagesPromises);
      latestMessagesArray.forEach((item) => {
        latestMessagesMap[item.contactId] = item.message;
      });

      setLatestMessages(latestMessagesMap);
    };

    fetchMessages();
  }, [contacts, currentUser]);

 

  useEffect(() => {
    if (currentUser) {
      setCurrentUserImage(currentUser.avtarImage);
      setCurrentUserName(currentUser.username);
      setCurrentEmail(currentUser.email);
    }
  }, [currentUser]);

  const changeCurrentChat = (index, contact) => {
    setCurrentSelected(index);
    changeChat(contact);
  };

  return (
    <Containers>
      {currentUserName && currentUserImage && (
        <div className='brand'>
          <h3> Chats</h3>
        </div>
      )}
      <div>
        <Search contacts={contacts} changeChat={changeChat} />
        <div title='start conv.' className='contacts'>
          {contacts &&
            contacts.map((contact, index) => (
              <div
                className={`contact ${index === currentSelected ? 'selected' : ''}`}
                key={index}
                onClick={() => changeCurrentChat(index, contact)}
              >
                <div className='avtar'>
                  <img
                    src={`data:image/svg+xml;base64,${contact.avtarImage}`}
                    alt='avtar'
                  />
                </div>
                <div>
                  <div className='username'>
                  <p>{contact.username}</p>
                  <span className='timestamp'>
              {latestMessages[contact._id]?.timestamp}
            </span>
            </div>
                <span  className='time-status'>{latestMessages[contact._id]?.message }</span>
           </div>
                
                
             </div>
             
            ))}
        </div>
      </div>
      <Profile
        currentUserName={currentUserName}
        currentUserImage={currentUserImage}
        email={currentEmail}
      />
    </Containers>
  );
}
const Containers = styled.div`
  display: grid;
  grid-template-rows: 10% 75% 15%;
  height: 94vh;
  overflow: hidden;
  background-color: rgb(16,27,32);
  border-width: 1.5px 1.5px 0px 0.5px;
  border-color:whitesmoke;
  border-style: solid;
  border-radius: 10px 0px 0px 0px;

  .brand {
    display: flex;
    margin: 0px 0px 0px 15px;

    h3 {
      color: white;
      text-transform: uppercase;
    }
  }

  .contacts {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: auto;
    gap: 0.2rem;
    &::-webkit-scrollbar {
      width: 0.2rem;

      &-thumb {
        background-color: grey;
        width: 0.1rem;
        border-radius: 0.1rem;
      }
   
    }

    .contact {
      width: 90%;
      cursor: pointer;
      border-radius: 0.2rem;
      padding: 1px 5px 1px 5px;
      gap: 1rem;
      margin: 3px 1px 1px 1px;
      align-items: center;
      display: flex;

      &:hover {
        background-color: rgba(226, 226, 224, 0.884);
        box-shadow: 2px 3px 9px ;
        border-color: whitesmoke;
        border-radius: 0.5rem;
      }

      .avtar {
        img {
          height: 3rem;
          border: 1.5px solid whitesmoke;
          border-radius: 5rem;
        }
      }

      .username {
        display:flex;
         justify-content:center;
        p {
          color: white;
          margin: 0px 0px 0px 0px;
        }
       
        
        .timestamp {
          font-size: 12px; /* Adjust the font size as needed */
          color: grey;
          display:flex;
          margin-left:105px;
          align-items: flex-end;
          justify-content: flex-end;
           margin-right: 1px; /* Add some margin for separation */
        }
      }
    }
    .time-status {
      font-size:12px;
      color: grey;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
    .selected {
      background-color: rgb(43,56,66);
    }
  }
`;