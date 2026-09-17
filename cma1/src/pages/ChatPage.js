import React, { useEffect, useState, useRef } from 'react';
import '../App.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styled from 'styled-components';
import Contacts from '../components/Contacts';
import ChatContainer from '../components/ChatContainer';
import { contactsWithLastMessageRoute, markReadRoute, host } from '../utils/APIRoutes';
import Welcome from '../components/Welcome';
import Chats from '../components/Chats';
import Call from '../components/Call';
import { io } from 'socket.io-client';
import Profile from '../components/Profile'; 
import logo from '../images/wa.png';
import FitbitIcon from '@mui/icons-material/Fitbit';
function ChatPage() {
  const socket = useRef();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [currentUser, setCurrentUser] = useState(undefined);
  const [currentChat, setCurrentChat] = useState(undefined);
  const [arrivalMessage, setArrivalMessage] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);

  const currentChatRef = useRef(currentChat);
  useEffect(() => {
    currentChatRef.current = currentChat;
  }, [currentChat]);

  useEffect(() => {
    async function fetchData() {
      if (!localStorage.getItem('chat-app-user')) {
        navigate('/login');
      } else {
        setCurrentUser(await JSON.parse(localStorage.getItem('chat-app-user')));
        setIsLoaded(true);
      }
    }
    fetchData();
  }, []);

  const formatPreviewMessage = (msgText, imgpath) => {
    let preview = msgText || "";
    if (imgpath) {
      if (msgText && msgText !== "📷 Photo") {
        const isFilename = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(msgText.trim());
        if (isFilename) {
          preview = "📷 Photo";
        } else if (msgText.startsWith("📷 Photo: ")) {
          preview = msgText;
        } else {
          preview = `📷 Photo: ${msgText}`;
        }
      } else {
        preview = "📷 Photo";
      }
    }
    return preview;
  };

  const updateContactLastMessage = (targetContactId, msgText, imgpath, senderId, timestamp = new Date().toISOString()) => {
    if (!targetContactId) return;
    const preview = formatPreviewMessage(msgText, imgpath);

    setContacts((prevContacts) => {
      const updatedContacts = prevContacts.map((contact) => {
        if (contact._id?.toString() === targetContactId?.toString()) {
          return {
            ...contact,
            latestMessage: {
              message: preview,
              imgpath: imgpath,
              timestamp: timestamp,
              sender: senderId,
            },
            lastMessageTimestamp: timestamp,
          };
        }
        return contact;
      });

      return [...updatedContacts].sort((a, b) => {
        const timeA = new Date(a.lastMessageTimestamp || 0).getTime();
        const timeB = new Date(b.lastMessageTimestamp || 0).getTime();
        return timeB - timeA;
      });
    });
  };

  useEffect(() => {
    if (currentUser) {
      socket.current = io(host);

      socket.current.on("connect", () => {
        console.log(`[FRONTEND] Socket connected (${socket.current.id}). Emitting add-user for:`, currentUser._id);
        socket.current.emit('add-user', currentUser._id);
      });

      if (socket.current.connected) {
        socket.current.emit('add-user', currentUser._id);
      }

      socket.current.on("msg-recieve", (data) => {
        console.log("[FRONTEND] msg-recieve event received at ChatPage:", data);
        const senderId = typeof data === "object" ? data.from : null;
        const msgText = typeof data === "object" ? (data.message || data.msg) : data;
        const imgpath = typeof data === "object" ? data.imgpath : null;
        const timestamp = new Date().toISOString();

        // Check if message is from the active open chat
        if (currentChatRef.current && senderId === currentChatRef.current._id) {
          setArrivalMessage({
            fromSelf: false,
            message: msgText,
            imgpath: imgpath,
            timestamp,
          });
          // Mark immediately as read in DB if currently viewing this chat
          if (currentUser && senderId) {
            axios.put(markReadRoute, { from: senderId, to: currentUser._id }).catch(console.error);
          }
        } else {
          // Message is from another contact or Welcome screen is open
          if (senderId) {
            setUnreadMessages((prev) => ({
              ...prev,
              [senderId]: (prev[senderId] || 0) + 1,
            }));
          }
        }

        // Live update sidebar contact's latestMessage preview and re-sort list to top
        if (senderId) {
          updateContactLastMessage(senderId, msgText, imgpath, senderId, timestamp);
        }
      });

      return () => {
        socket.current.disconnect();
      };
    }
  }, [currentUser]);

  useEffect(() => {
    async function fetchData() {
      if (currentUser) {
        if (currentUser.isAvtarImageSet) {
          const data = await axios.get(`${contactsWithLastMessageRoute}/${currentUser._id}`);
          setContacts(data.data);
        } else {
          navigate('/avtar');
        }
      }
    }
    fetchData();
  }, [currentUser]);

  const handleChatChange = async (chat) => {
    setCurrentChat(chat);
    if (chat && currentUser) {
      // Clear live unread state
      setUnreadMessages((prev) => {
        const updated = { ...prev };
        delete updated[chat._id];
        return updated;
      });

      // Clear DB-loaded unread count in contacts state
      setContacts((prevContacts) =>
        prevContacts.map((c) =>
          c._id === chat._id ? { ...c, unreadCount: 0 } : c
        )
      );

      // Persist read status in database
      try {
        await axios.put(markReadRoute, {
          from: chat._id,
          to: currentUser._id,
        });
      } catch (err) {
        console.error("Error marking messages as read:", err);
      }
    }
  };

  return (
    <div className='chats'>
      <Containerss>
        <div className='container'>
          <div className='name'>
            <div className="img"><FitbitIcon /></div>
          <h3>ChatNex</h3></div>
        <Chats contacts={contacts} changeChat={handleChatChange}/>
           <Call contacts={contacts}/>  
         <Profile/>
          <div className='full'>
            <Contacts contacts={contacts} currentUser={currentUser} changeChat={handleChatChange} unreadMessages={unreadMessages} />
            {isLoaded && currentChat === undefined ? (
              <Welcome currentUser={currentUser} />
            ) : (
              <ChatContainer currentChat={currentChat} currentUser={currentUser} socket={socket} arrivalMessage={arrivalMessage} onMessageSent={updateContactLastMessage} />
            )}
          </div>
        </div>
      </Containerss>
    </div>
  );
}

const Containerss = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
  align-items: center;
  background-color: rgba(35,48,57);
  &::-webkit-scrollbar{
    background-color: #131324;
    width: 5px;
    &-thumb{
      background-color: #24244a;
    }
   }
  @media screen and (min-width:720px) and(max-width:1080px){
    grid-auto-rows: 15% 70% 15%;
  }
  .container {
    .name{
      position:relative;
      .img{
      position:absolute;
        top:5px;
        height:30px;
        right:99%;
        color:rgba(252, 252, 195, 0.884);
    }
  h3{
    color:white;
    display:flex;
    position:absolute;
    // justify-content:center;
    flex-directiom:start-end;
    margin: 5px 0px 0px 20px;
    font-style:bold;
  }}
  .img{
    position: relative;
    .img{
      color:white;
      position:absolute;
      top:50px;
      height:28px;
      right: 99%;
      background-blend-mode: color-burn;
     
  }}
     
      .img2{
        position: relative;
        .img{
          position:absolute;
          top:90px;
          color:white;
          height:19px;
        right:99%;
        background-blend-mode: color-burn;
        }}
          .last{
            // position: relative;
            img{
              position:absolute;
              bottom:10px;
              height:30px;
              left: 5px;
              background-blend-mode: color-burn;
            }}
  }

  .full {
    height: 94vh;
    width: 97.01vw;
    margin: 2.5% 0% 0% 1.5%;
    display: grid;
    grid-template-columns: 25% 75%;
  }

  h4 {
    position: absolute;
    top: 80px; /* Adjust the top position as needed */
   left: 0px; /* Adjust the left position as needed */
     /* Adjust the font size as needed */
  }
`;
export default ChatPage;
