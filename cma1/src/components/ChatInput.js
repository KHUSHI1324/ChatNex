import React, { useState } from 'react'
import Picker from'emoji-picker-react';
import {IoMdSend} from 'react-icons/io';
import {BsEmojiSmileFill} from 'react-icons/bs';
import Attach from'../images/attach.png';
import SendIcon from '@mui/icons-material/Send';

export default function ChatInput({handleSendMsg}) {
  const [showEmojiPicker,setShowEmojiPicker]=useState(false);
  const [msg,setMsg]=useState('');
  const [image, setImage] = useState(null); // New state to store the selected image

  const handleEmojiPickerHideShow = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  const handleEmojiClick = (event, emojiObject) => {
    const newMsg = msg + emojiObject.emoji;
    setMsg(newMsg);
  };

  const handleImageChange = (e) => {
    const selectedImage = e.target.files[0];
    if (selectedImage) {
      setImage(selectedImage);
    }
  };

  const sendChat = async(e) => {
    e.preventDefault();
    if (msg.trim().length > 0 || image) { // Check if there's a message or an image
      handleSendMsg(msg.trim(), image); // Pass the image to the send message function
      setMsg('');
      setImage(null);  // Clear the selected image after sending
    }
  };

  return (
    <div className='chat-Input'>
        <div className="button-container">
          <div className='head'>
        <div className="emoji">
          <BsEmojiSmileFill onClick={handleEmojiPickerHideShow}/>
         { showEmojiPicker && (
          <div className='emoji-picker-react'>
            <Picker onEmojiClick={handleEmojiClick}/>
             </div>
            )}
        </div>
        <input type='file' style={{display:"none"}} id='file' name='photo' onChange={handleImageChange} accept="image/*"/>
        <label htmlFor='file'>
            <img src={Attach} alt='Attach'/>
        </label>
        </div>
        </div>
       <form className='input-container' onSubmit={sendChat}>
        {image && (
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#202c33', padding: '2px 8px', borderRadius: '4px', marginRight: '6px', fontSize: '12px', color: '#00a884', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span>📷 {image.name}</span>
            <span onClick={() => setImage(null)} style={{ cursor: 'pointer', marginLeft: '6px', color: '#ff6b6b', fontWeight: 'bold' }}>✕</span>
          </div>
        )}
        <input type='text' placeholder={image ? 'Add a caption (optional)...' : 'Type your message'} value={msg} onChange={(e)=>setMsg(e.target.value)}/>
        <button className='submit'>
            <IoMdSend/>
        </button>
       </form>
    </div>
  )
}
