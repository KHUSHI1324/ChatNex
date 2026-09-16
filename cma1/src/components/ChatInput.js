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
    console.log(emojiObject);
    const newMsg = msg + emojiObject.emoji;
    // setMsg(prevMsg =>prevMsg+emojiObject.emoji);
    setMsg(newMsg);
  };

  const handleImageChange = (e) => {
    const selectedImage = e.target.files[0];
    setImage(selectedImage);
   
    const name=e.target.files[0].name;
    setMsg(name);
 
  };

  const sendChat = async(e) => {
    e.preventDefault();
    if (msg.trim().length > 0 || image ) { // Check if there's a message or an image
      handleSendMsg(msg,image); // Pass the image to the send message function
      setMsg('');
      setImage(null);  // Clear the selected image after sending
      var formData = new FormData();
      formData.append('photo',image);
    }

    const config = {
      headers:{
        'Content-Type':'multipart/form-data'
      }
    }

    // const res = await axios.post(imageapi,formData,config); 
    // console.log(res);
  }

  return (
    <div className='chat-Input'>
        <div className="button-container">
          <div className='head'>
            {/* <span>hi</span> */}
        <div className="emoji">
          <BsEmojiSmileFill onClick={handleEmojiPickerHideShow}/>
         { showEmojiPicker && (
          <div className='emoji-picker-react'>
            <Picker onEmojiClick={handleEmojiClick}/>
             </div>
            )}
        </div>
        <input type='file' style={{display:"none"}} id='file' name='photo'  onChange={handleImageChange} accept="image/*"/>
        <label htmlFor='file'>
            <img src={Attach} alt='Attach'/>
        </label>
        </div>
        </div>
       <form className='input-container' onSubmit={sendChat}>
        <input type='text' placeholder='Type your message' value={msg} onChange={(e)=>setMsg(e.target.value)}/>
        <button className='submit'>
            <IoMdSend/>
            {/* <SendIcon/> */}
        </button>
       </form>
    </div>
  )
}
