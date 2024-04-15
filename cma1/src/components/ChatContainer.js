// ChatContainer.js
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import io from "socket.io-client";
import ChatInput from "./ChatInput";
import CallIcon from '@mui/icons-material/Call';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import vc from "../images/vcc.png";
import search from "../images/search.png";
import watsapp_dark from '../images/Add.png';
import FindInPageIcon from '@mui/icons-material/FindInPage';
import { sendMessageRoute, getAllMessagesRoute } from "../utils/APIRoutes";
import { v4 as uuidv4 } from "uuid";
export default function ChatContainer({ currentChat, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [arrivalMessage, setArrivalMessage] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Map()); // New state for online/offline status
  const [hoveredMessageIndex, setHoveredMessageIndex] = useState(null);
  const [showSearchInputBar, setShowSearchInputBar] = useState(false); // State to track search input bar visibility
 const [option,setOption] = useState();
  const socketRef = useRef();
  const scrollRef = useRef();
  const [searchTerm, setSearchTerm] = useState(""); // State to track the search term
 
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ transition: "smooth" });
  }, [messages]);

  useEffect(() => {
    const socket = io("http://localhost:1000");
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("add-user", currentUser._id);
    });

    // Update online status based on socket events
    socket.on("user-status", (userId, status) => {
      setOnlineUsers(new Map(onlineUsers.set(userId, status)));
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser]);

  useEffect(() => {
    async function fetchData() {
      if (currentChat && currentUser && currentUser._id) {
        const response = await axios.post(getAllMessagesRoute, {
          from: currentUser._id,
          to: currentChat._id,
        });
        setMessages(response.data);
      }
    }
    fetchData();
  }, [currentChat, currentUser]);

  const handleSendMsg = async (msg) => {
    if (!currentUser || !currentUser._id) {
      return;
    }
    await axios.post(sendMessageRoute, {
      from: currentUser._id,
      to: currentChat._id,
      message: msg,
    });
    socketRef.current.emit("send-msg", {
      from: currentUser._id,
      to: currentChat._id,
      message: msg,
    });
    const timestamp = new Date().toISOString(); // Update timestamp to current time
    const newMessage = { fromSelf: true, message: msg, timestamp };
    setMessages([...messages, newMessage]);
  };

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.on("msg-recieve", (msg) => {
        const timestamp = new Date().toISOString(); // Update timestamp to current time
        const newMessage = { fromSelf: false, message: msg, timestamp };
        setArrivalMessage(newMessage);
      });
    }
  }, []);

  useEffect(() => {
    arrivalMessage && setMessages((prev) => [...prev, arrivalMessage]);
  }, [arrivalMessage]);

  const getDay = (timestamp) => {
    const currentDate = new Date();
    const messageDate = new Date(timestamp);
    currentDate.setHours(0, 0, 0, 0);
    messageDate.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(currentDate - messageDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays === 0) {
      return "Today";
    } else if (diffDays <= 7) {
      return messageDate.toLocaleDateString("en-US", { weekday: "long" });
    } else {
      const diffWeeks = Math.ceil(diffDays / 7);
      return `${diffWeeks} weeks ago`;
    }
  };

  const handleContentMouseEnter = (index) => {
    setHoveredMessageIndex(index);
  };

  const handleContentMouseLeave = () => {
    setHoveredMessageIndex(null);
  };

  const handleSearchClick = () => {
    setShowSearchInputBar(!showSearchInputBar); // Toggle search input bar visibility
  };
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value); // Update the search term
  };

  const highlightSearchTerm = (message) => {
    if (searchTerm.trim() === "") {
      return message.message;
    } else {
      const regex = new RegExp(`(${searchTerm})`, "gi");
      const parts = message.message.split(regex);
      return parts.map((part, index) =>
        regex.test(part) ? <span className="highlight" key={index}>{part}</span> : part
      );
    }
  };

  
  return (
    <>
      {currentChat && (
        
        <div className="chat-container">          
          <div className="chat-header">
            
            <div className="user-details">
              <div className="avtar">
                <img
                  src={`data:image/svg+xml;base64,${currentChat.avtarImage}`}
                  alt="avtar"
                />
              </div>
              <div className="username">
                <h3>{currentChat.username}</h3>
                {onlineUsers.has(currentChat._id) ? (
                  <span>Online</span>
                ) : (
                  <span>Offline</span>
                )}
              </div>
            </div>
            <div className="call-options">
              <div className="box" id="box">
                <div className="call">
                  <CallIcon />
                </div>
                <div className="vc">
                  < VideoCallIcon />

                </div>
              </div>
              <div className="search">
              <FindInPageIcon   onClick={handleSearchClick} />
              </div>
            
              {showSearchInputBar && (
                <input type="text" placeholder="Search..."  onChange={handleSearchChange}
                /> // Render search input bar
              )}
              
            </div>
          </div>
{/* 
           <div className="image">
           <img src={watsapp_dark} alt="watsapp_dark"/>
          </div>  */}


         


          <div className="chat-messages">
            {messages.map((message, index) => (
              <div
                ref={scrollRef}
                key={uuidv4()}
                className={`message${
                  message.fromSelf ? " sended" : " recieved"
                }`}
              >
                {index === hoveredMessageIndex && (
                  <div className="reaction-icons">
                    <p>
                      <span>&#x263A;</span>
                      <span>^</span>
                    </p>
                  </div>
                )}
                {index === 0 ||
                getDay(message.timestamp) !==
                  getDay(messages[index - 1].timestamp) ? (
                  <div className="day">{getDay(message.timestamp)}</div>
                ) : null}
                <div
                  className="content"
                  onClick={()=>handleContentMouseEnter(index)}
                  onDoubleClick={()=>handleContentMouseLeave(index)}       
                  // onMouseEnter={() => handleContentMouseEnter(index)}
                  // onMouseLeave={handleContentMouseLeave}
                          
                >
                  <p>
                    {/* {message.message} */}
                    {highlightSearchTerm(message)}
                    <br />
                    <span>
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
              <ChatInput handleSendMsg={handleSendMsg} />
        </div>
      )}
    </>
  );
}
