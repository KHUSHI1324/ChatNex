import React, { useEffect, useState, useRef } from 'react';
import '../App.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styled from 'styled-components';
import Contacts from '../components/Contacts';
import ChatContainer from '../components/ChatContainer';
import { allUsersRoute, host } from '../utils/APIRoutes';
import Welcome from '../components/Welcome';
import Chats from '../components/Chats';
import Call from '../components/Call';
import { io } from 'socket.io-client';
import  Profile from '../components/Profile'; 
import logo from '../images/wa.png';
import FitbitIcon from '@mui/icons-material/Fitbit';
function ChatPage() {
  const socket = useRef();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [currentUser, setCurrentUser] = useState(undefined);
  const [currentChat, setCurrentChat] = useState(undefined);
  const [isLoaded, setIsLoaded] = useState(false);

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

  useEffect(() => {
    if (currentUser) {
      socket.current = io(host);
      socket.current.emit('add-user', currentUser._id);
    }
  }, [currentUser]);

  useEffect(() => {
    async function fetchData() {
      if (currentUser) {
        if (currentUser.isAvtarImageSet) {
          const data = await axios.get(`${allUsersRoute}/${currentUser._id}`);
          setContacts(data.data);
        } else {
          navigate('/avtar');
        }
      }
    }
    fetchData();
  }, [currentUser]);

  const handleChatChange = (chat) => {
    setCurrentChat(chat);
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
            <Contacts  contacts={contacts} currentUser={currentUser} changeChat={handleChatChange} />
            {isLoaded && currentChat === undefined ? (
              <Welcome currentUser={currentUser} />
            ) : (
              <ChatContainer currentChat={currentChat} currentUser={currentUser} socket={socket} />
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
