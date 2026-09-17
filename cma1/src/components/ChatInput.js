import React, { useState, useEffect, useRef } from 'react';
import Picker from 'emoji-picker-react';
import { IoMdSend } from 'react-icons/io';
import { BsEmojiSmileFill } from 'react-icons/bs';
import AttachFileIcon from '@mui/icons-material/AttachFile';

const POPULAR_GIF_CATEGORIES = [
  "Trending", "Thank You", "Laugh", "Happy", "Love", "Yes", "No", "Dance", "Bye", "Wow", "Cat"
];

const GIF_DATABASE = {
  trending: [
    { id: "t1", title: "Excited Dance", url: "https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif" },
    { id: "t2", title: "Happy Cat", url: "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" },
    { id: "t3", title: "Mind Blown", url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif" },
    { id: "t4", title: "Popcorn Watching", url: "https://media.giphy.com/media/gl0mkIZOW6Nwc/giphy.gif" },
    { id: "t5", title: "Thumbs Up", url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif" },
    { id: "t6", title: "Shocked", url: "https://media.giphy.com/media/PUBxelw8HF4o8/giphy.gif" },
    { id: "t7", title: "Applause", url: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif" },
    { id: "t8", title: "Dance Move", url: "https://media.giphy.com/media/l3vRlT2k2L35Cnn5C/giphy.gif" },
  ],
  "thank you": [
    { id: "th1", title: "Thank You So Much", url: "https://media.giphy.com/media/3oEdva9BUHPIs2SkGk/giphy.gif" },
    { id: "th2", title: "Grateful Bow", url: "https://media.giphy.com/media/26gsjCZpPolPr3sBy/giphy.gif" },
    { id: "th3", title: "Thanks A Lot", url: "https://media.giphy.com/media/osjgQPWRx3cac/giphy.gif" },
    { id: "th4", title: "Appreciate It", url: "https://media.giphy.com/media/xUPGcxpCV81ebKh7Vu/giphy.gif" },
    { id: "th5", title: "Big Thanks", url: "https://media.giphy.com/media/l4pTdcifPZLpDjL1e/giphy.gif" },
    { id: "th6", title: "Minions Thank You", url: "https://media.giphy.com/media/3oz8xIsloV7zOmt81G/giphy.gif" },
    { id: "th7", title: "Warm Thanks", url: "https://media.giphy.com/media/3o6ZsUJ44ffpngvZvG/giphy.gif" },
    { id: "th8", title: "Thank You Heart", url: "https://media.giphy.com/media/KJ1f5iK807Vx6/giphy.gif" },
  ],
  laugh: [
    { id: "l1", title: "ROFL Laughing", url: "https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif" },
    { id: "l2", title: "Hysterical Laugh", url: "https://media.giphy.com/media/Z9OGuQyrfHAE8/giphy.gif" },
    { id: "l3", title: "Crying Laugh", url: "https://media.giphy.com/media/3oEjHAUOqG3lSS0f1C/giphy.gif" },
    { id: "l4", title: "Giggle", url: "https://media.giphy.com/media/ltIFdjNAasOwVvKhvx/giphy.gif" },
    { id: "l5", title: "Kangaroo Laugh", url: "https://media.giphy.com/media/26tP4gFBQewkLnMv6/giphy.gif" },
    { id: "l6", title: "Funny Laugh", url: "https://media.giphy.com/media/13cptIwW9bgzk6UVyr/giphy.gif" },
    { id: "l7", title: "Chuckling", url: "https://media.giphy.com/media/dC9DTdqPmRnlS/giphy.gif" },
    { id: "l8", title: "Cat Laugh", url: "https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif" },
  ],
  happy: [
    { id: "h1", title: "Super Happy", url: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif" },
    { id: "h2", title: "Happy Dance", url: "https://media.giphy.com/media/l3vRlT2k2L35Cnn5C/giphy.gif" },
    { id: "h3", title: "Joy Jump", url: "https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif" },
    { id: "h4", title: "Puppy Joy", url: "https://media.giphy.com/media/rdma0nDFZMR32/giphy.gif" },
    { id: "h5", title: "Celebration", url: "https://media.giphy.com/media/IwAZ6dvvvaTtdI8SD5/giphy.gif" },
    { id: "h6", title: "Smiling Big", url: "https://media.giphy.com/media/11sBLVxNs7v6WA/giphy.gif" },
  ],
  love: [
    { id: "lv1", title: "Heart Love", url: "https://media.giphy.com/media/26BRv0ThflsDTjDUs/giphy.gif" },
    { id: "lv2", title: "Blowing Kiss", url: "https://media.giphy.com/media/l41JWw65TcBGjPpZ6/giphy.gif" },
    { id: "lv3", title: "Heart Eyes", url: "https://media.giphy.com/media/M90mJvfWfd5mbUuULX/giphy.gif" },
    { id: "lv4", title: "Big Hug", url: "https://media.giphy.com/media/l8ooT55UMbTGinIDEc/giphy.gif" },
    { id: "lv5", title: "Cute Love", url: "https://media.giphy.com/media/3oEjHV0z8S7WM4MwnK/giphy.gif" },
    { id: "lv6", title: "I Love You", url: "https://media.giphy.com/media/3o7TKoWXm3okO1kgHC/giphy.gif" },
  ],
  yes: [
    { id: "y1", title: "Agree Nod", url: "https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif" },
    { id: "y2", title: "Oh Yes", url: "https://media.giphy.com/media/n4WpP39mwWrmg/giphy.gif" },
    { id: "y3", title: "Definitely Yes", url: "https://media.giphy.com/media/26gsvAm8UPaczzXz2/giphy.gif" },
    { id: "y4", title: "Thumbs Up Yes", url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif" },
    { id: "y5", title: "Yes Cheering", url: "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif" },
    { id: "y6", title: "Nodding Head", url: "https://media.giphy.com/media/6cFcUiCG5eONW/giphy.gif" },
  ],
  no: [
    { id: "n1", title: "No Way", url: "https://media.giphy.com/media/12XMGIWtrHBl5e/giphy.gif" },
    { id: "n2", title: "Head Shake No", url: "https://media.giphy.com/media/gnE4FFhtFoLKM/giphy.gif" },
    { id: "n3", title: "Disapproval", url: "https://media.giphy.com/media/3o7TKwmnDgQb5jemjK/giphy.gif" },
    { id: "n4", title: "Never No", url: "https://media.giphy.com/media/STfLOU64vhcbnEw343/giphy.gif" },
    { id: "n5", title: "No Disagree", url: "https://media.giphy.com/media/AoBgxayGMHlIs/giphy.gif" },
    { id: "n6", title: "Stop No", url: "https://media.giphy.com/media/vyTnNTrs3wqQ0UIvwE/giphy.gif" },
  ],
  dance: [
    { id: "d1", title: "Groovy Dance", url: "https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif" },
    { id: "d2", title: "Party Dancing", url: "https://media.giphy.com/media/l3vRlT2k2L35Cnn5C/giphy.gif" },
    { id: "d3", title: "Carlton Dance", url: "https://media.giphy.com/media/pa37AAGzKXoek/giphy.gif" },
    { id: "d4", title: "Happy Feet", url: "https://media.giphy.com/media/13hxeOYjoTWtK8/giphy.gif" },
    { id: "d5", title: "Disco Move", url: "https://media.giphy.com/media/4oMoIbIQrvCjm/giphy.gif" },
    { id: "d6", title: "Salsa Fun", url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif" },
  ],
  bye: [
    { id: "b1", title: "Bye Wave", url: "https://media.giphy.com/media/3o7btUg31OCi0NXdkY/giphy.gif" },
    { id: "b2", title: "Goodbye", url: "https://media.giphy.com/media/m9eG1qVjvNsfYHryRz/giphy.gif" },
    { id: "b3", title: "See You Later", url: "https://media.giphy.com/media/xT5LMPj8P20jjOqZ5C/giphy.gif" },
    { id: "b4", title: "Fade Away Bye", url: "https://media.giphy.com/media/Ru9sLV2AQnlNn4NBGL/giphy.gif" },
    { id: "b5", title: "Leaving", url: "https://media.giphy.com/media/w89ak63KNl0nJl80ig/giphy.gif" },
    { id: "b6", title: "Peace Out", url: "https://media.giphy.com/media/3oEjI80DSa1grNPTDq/giphy.gif" },
  ],
  wow: [
    { id: "w1", title: "Mind Blown Wow", url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif" },
    { id: "w2", title: "Shocked Cat", url: "https://media.giphy.com/media/PUBxelw8HF4o8/giphy.gif" },
    { id: "w3", title: "Amazing Wow", url: "https://media.giphy.com/media/udmx3pgdiD7gK1VQKI/giphy.gif" },
    { id: "w4", title: "Unbelievable", url: "https://media.giphy.com/media/vQqeT3AYg8S5O/giphy.gif" },
    { id: "w5", title: "Eyes Wide Wow", url: "https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif" },
    { id: "w6", title: "Applause Wow", url: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif" },
  ],
  cat: [
    { id: "c1", title: "Typing Cat", url: "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" },
    { id: "c2", title: "Surprised Kitten", url: "https://media.giphy.com/media/PUBxelw8HF4o8/giphy.gif" },
    { id: "c3", title: "Cute Cat Sleep", url: "https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif" },
    { id: "c4", title: "Vibing Cat", url: "https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.gif" },
    { id: "c5", title: "Dancing Cat", url: "https://media.giphy.com/media/BzyTuYCmvSORqs1ABM/giphy.gif" },
    { id: "c6", title: "Cat Hug", url: "https://media.giphy.com/media/Nm8ZPAGOwZUic/giphy.gif" },
  ],
};

export default function ChatInput({ handleSendMsg }) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeTab, setActiveTab] = useState("emoji"); // "emoji" | "gif"
  const [msg, setMsg] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [gifQuery, setGifQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Trending');
  const [gifList, setGifList] = useState(GIF_DATABASE.trending);
  const [gifLoading, setGifLoading] = useState(false);
  const [sendingGif, setSendingGif] = useState(false);
  const [popupAlert, setPopupAlert] = useState(null); // { title, message }
  const emojiPickerRef = useRef(null);
  const gifCache = useRef({ ...GIF_DATABASE });
  const activeRequestId = useRef(0);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
        setGifQuery('');
        setSelectedCategory('Trending');
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Fetch GIFs with instant cache (0ms latency) and race-condition prevention
  const fetchGifs = async (searchTerm = "") => {
    const q = (searchTerm || "").trim().toLowerCase();
    const normalizedKey = q === "" || q === "trending" ? "trending" : q;

    // 1. Instant Cache Hit (0ms latency, zero repeated requests!)
    if (gifCache.current[normalizedKey] && gifCache.current[normalizedKey].length > 0) {
      setGifList(gifCache.current[normalizedKey]);
      setGifLoading(false);
      return;
    }

    // 2. Keyword library match (instant 0ms fallback!)
    let matchedKey = null;
    if (normalizedKey.includes("thank") || normalizedKey.includes("thx") || normalizedKey.includes("shukriya")) matchedKey = "thank you";
    else if (normalizedKey.includes("laugh") || normalizedKey.includes("lol") || normalizedKey.includes("haha") || normalizedKey.includes("fun") || normalizedKey.includes("joke") || normalizedKey.includes("haso")) matchedKey = "laugh";
    else if (normalizedKey.includes("happy") || normalizedKey.includes("khush") || normalizedKey.includes("smile") || normalizedKey.includes("joy") || normalizedKey.includes("cheer")) matchedKey = "happy";
    else if (normalizedKey.includes("love") || normalizedKey.includes("pyar") || normalizedKey.includes("heart") || normalizedKey.includes("kiss") || normalizedKey.includes("hug")) matchedKey = "love";
    else if (normalizedKey.includes("yes") || normalizedKey.includes("ha") || normalizedKey.includes("agree") || normalizedKey.includes("nod") || normalizedKey.includes("ok")) matchedKey = "yes";
    else if (normalizedKey.includes("no") || normalizedKey.includes("na") || normalizedKey.includes("nahi") || normalizedKey.includes("disagree") || normalizedKey.includes("reject")) matchedKey = "no";
    else if (normalizedKey.includes("dance") || normalizedKey.includes("nach") || normalizedKey.includes("party") || normalizedKey.includes("disco")) matchedKey = "dance";
    else if (normalizedKey.includes("bye") || normalizedKey.includes("alvida") || normalizedKey.includes("wave") || normalizedKey.includes("tata")) matchedKey = "bye";
    else if (normalizedKey.includes("wow") || normalizedKey.includes("shock") || normalizedKey.includes("omg") || normalizedKey.includes("amaze")) matchedKey = "wow";
    else if (normalizedKey.includes("cat") || normalizedKey.includes("billi") || normalizedKey.includes("kitten") || normalizedKey.includes("pet")) matchedKey = "cat";

    if (matchedKey && GIF_DATABASE[matchedKey]) {
      gifCache.current[normalizedKey] = GIF_DATABASE[matchedKey];
      setGifList(GIF_DATABASE[matchedKey]);
      setGifLoading(false);
      return;
    }

    // 3. For any other term, query live API with requestId tracking to prevent race conditions
    const reqId = ++activeRequestId.current;
    setGifLoading(true);

    try {
      const endpoint = `https://api.giphy.com/v1/gifs/search?api_key=dc6zaTOxFJmzC&q=${encodeURIComponent(normalizedKey)}&limit=24&rating=g`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (data?.data?.length > 0 && reqId === activeRequestId.current) {
          const formatted = data.data
            .map((item) => ({
              id: item.id,
              title: item.title || "GIF",
              url: item.images?.fixed_height?.url || item.images?.original?.url || item.images?.downsized?.url,
            }))
            .filter((item) => Boolean(item.url));

          if (formatted.length > 0) {
            gifCache.current[normalizedKey] = formatted;
            setGifList(formatted);
            setGifLoading(false);
            return;
          }
        }
      }
    } catch (err) {
      console.warn("Live GIF search error:", err);
    }

    if (reqId === activeRequestId.current) {
      const fallback = GIF_DATABASE.trending;
      gifCache.current[normalizedKey] = fallback;
      setGifList(fallback);
      setGifLoading(false);
    }
  };

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    const searchVal = cat === "Trending" ? "" : cat;
    setGifQuery(searchVal);
    fetchGifs(cat);
  };

  const handleClearSearch = () => {
    setGifQuery("");
    setSelectedCategory("Trending");
    fetchGifs("trending");
  };

  const handleEmojiPickerHideShow = () => {
    if (!showEmojiPicker) {
      // Opening picker -> reset to fresh trending
      setGifQuery("");
      setSelectedCategory("Trending");
      fetchGifs("trending");
    }
    setShowEmojiPicker(!showEmojiPicker);
  };

  const handleEmojiClick = (emojiData, event) => {
    const emojiChar = emojiData?.emoji || (typeof emojiData === "string" ? emojiData : event?.emoji) || "";
    if (emojiChar) {
      setMsg((prevMsg) => prevMsg + emojiChar);
    }
  };

  const handleSendGif = async (gif) => {
    if (sendingGif) return;
    setSendingGif(true);
    try {
      const response = await fetch(gif.url);
      const blob = await response.blob();
      const safeTitle = (gif.title || "animated").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
      const gifFile = new File([blob], `${safeTitle}.gif`, { type: "image/gif" });

      handleSendMsg(msg.trim(), [gifFile]);
      setMsg('');
      setShowEmojiPicker(false);
    } catch (err) {
      console.error("Error preparing GIF file:", err);
      setPopupAlert({
        title: "Failed to Send GIF",
        message: "Failed to prepare this GIF. Please try another one.",
      });
    } finally {
      setSendingGif(false);
    }
  };

  const handleFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check max files limit (10 total)
    if (selectedFiles.length + files.length > 10) {
      setPopupAlert({
        title: "Attachment Limit",
        message: "You can only attach up to 10 files per message.",
      });
      return;
    }

    // Check individual file size limit (50MB for video, 15MB for other)
    const oversized = files.filter((f) => {
      const isVid = f.type.startsWith("video/");
      const limit = isVid ? 50 * 1024 * 1024 : 15 * 1024 * 1024;
      return f.size > limit;
    });

    if (oversized.length > 0) {
      setPopupAlert({
        title: "File Size Limit Exceeded",
        message: `The following file(s) exceed the size limit (50MB for video, 15MB for documents/photos):\n${oversized.map((f) => `• ${f.name}`).join("\n")}`,
      });
      return;
    }

    setSelectedFiles((prev) => [...prev, ...files]);
    e.target.value = ""; // Reset input so same file can be chosen again if needed
  };

  const removeFile = (indexToRemove) => {
    setSelectedFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const sendChat = async (e) => {
    e.preventDefault();
    if (msg.trim().length > 0 || selectedFiles.length > 0) {
      handleSendMsg(msg.trim(), selectedFiles);
      setMsg('');
      setSelectedFiles([]);
    }
  };

  const getFileIcon = (file) => {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (file.type.startsWith('video/') || ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext)) {
      return '🎥';
    }
    if (file.type === 'image/gif' || ext === 'gif') {
      return '👾';
    }
    if (file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'svg', 'bmp'].includes(ext)) {
      return '📷';
    }
    if (file.type === 'application/pdf' || ext === 'pdf') {
      return '📄';
    }
    if (['doc', 'docx'].includes(ext) || file.type.includes('word')) {
      return '📝';
    }
    if (['xls', 'xlsx', 'csv'].includes(ext) || file.type.includes('sheet') || file.type.includes('excel') || file.type.includes('csv')) {
      return '📊';
    }
    return '📎';
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className='chat-input-wrapper'>
      {/* File Preview Chips Tray */}
      {selectedFiles.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'flex-start',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            backgroundColor: 'rgb(24, 34, 40)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            width: '100%',
            boxSizing: 'border-box',
            maxHeight: '130px',
            overflowY: 'auto',
          }}
        >
          {selectedFiles.map((file, idx) => {
            const isImg = file.type.startsWith('image/');
            const isVid = file.type.startsWith('video/');
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#202c33',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#e9edef',
                  maxWidth: '220px',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                {isImg ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt="preview"
                    style={{ width: '22px', height: '22px', objectFit: 'cover', borderRadius: '4px', marginRight: '6px' }}
                  />
                ) : (
                  <span style={{ marginRight: '6px', fontSize: '14px' }}>
                    {getFileIcon(file)}
                  </span>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '130px', fontWeight: '500' }}>{file.name}</span>
                  <span style={{ fontSize: '10px', color: '#8696a0' }}>
                    {isVid ? "Video • " : ""}{formatFileSize(file.size)}
                  </span>
                </div>
                <span
                  onClick={() => removeFile(idx)}
                  style={{
                    cursor: 'pointer',
                    marginLeft: '8px',
                    color: '#ff6b6b',
                    fontWeight: 'bold',
                    padding: '0 4px',
                  }}
                  title="Remove file"
                >
                  ✕
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Input Bar */}
      <div className='chat-Input'>
        <div className="button-container">
          <div className='head'>
            <div className="emoji" ref={emojiPickerRef}>
              <BsEmojiSmileFill onClick={handleEmojiPickerHideShow} title="Emojis & GIFs" />
              {showEmojiPicker && (
                <div
                  className='emoji-picker-react'
                  style={{
                    position: 'absolute',
                    bottom: '45px',
                    left: '0px',
                    zIndex: 1000,
                    backgroundColor: '#202c33',
                    borderRadius: '10px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    width: '320px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  {/* WhatsApp-Style Tab Bar */}
                  <div
                    style={{
                      display: 'flex',
                      backgroundColor: '#111b21',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveTab("emoji")}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        backgroundColor: activeTab === "emoji" ? '#202c33' : 'transparent',
                        color: activeTab === "emoji" ? '#00a884' : '#8696a0',
                        border: 'none',
                        borderBottom: activeTab === "emoji" ? '2px solid #00a884' : '2px solid transparent',
                        fontWeight: '600',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>😊</span> EMOJIS
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("gif")}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        backgroundColor: activeTab === "gif" ? '#202c33' : 'transparent',
                        color: activeTab === "gif" ? '#00a884' : '#8696a0',
                        border: 'none',
                        borderBottom: activeTab === "gif" ? '2px solid #00a884' : '2px solid transparent',
                        fontWeight: '600',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>👾</span> GIFs
                    </button>
                  </div>

                  {/* Tab Content */}
                  {activeTab === "emoji" ? (
                    <Picker onEmojiClick={handleEmojiClick} theme="dark" />
                  ) : (
                    <div
                      style={{
                        height: '350px',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#202c33',
                        padding: '10px',
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* Search Bar with Clear Button */}
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', alignItems: 'center' }}>
                        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <input
                            type="text"
                            placeholder="Search GIFs (e.g. thank you, laugh, bye)..."
                            value={gifQuery}
                            onChange={(e) => setGifQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                fetchGifs(gifQuery);
                              }
                            }}
                            style={{
                              width: '100%',
                              padding: '7px 28px 7px 10px',
                              backgroundColor: '#111b21',
                              border: '1px solid rgba(255,255,255,0.15)',
                              borderRadius: '6px',
                              color: '#fff',
                              fontSize: '12px',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                          {gifQuery.length > 0 && (
                            <span
                              onClick={handleClearSearch}
                              title="Clear search"
                              style={{
                                position: 'absolute',
                                right: '8px',
                                color: '#8696a0',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 'bold',
                                userSelect: 'none',
                              }}
                            >
                              ✕
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => fetchGifs(gifQuery)}
                          style={{
                            backgroundColor: '#00a884',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '7px 12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          Find
                        </button>
                      </div>

                      {/* Category Pills with hidden scrollbar */}
                      <div
                        className="gif-category-pills"
                        style={{
                          display: 'flex',
                          gap: '6px',
                          overflowX: 'auto',
                          paddingBottom: '6px',
                          marginBottom: '6px',
                          scrollbarWidth: 'none',
                          msOverflowStyle: 'none',
                        }}
                      >
                        {POPULAR_GIF_CATEGORIES.map((cat) => {
                          const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => handleCategorySelect(cat)}
                              style={{
                                backgroundColor: isSelected ? '#00a884' : '#111b21',
                                color: isSelected ? '#fff' : '#e9edef',
                                border: isSelected ? '1px solid #00a884' : '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                padding: '4px 10px',
                                fontSize: '11px',
                                fontWeight: isSelected ? '600' : '400',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                              }}
                            >
                              {cat}
                            </button>
                          );
                        })}
                      </div>

                      {/* GIF Grid */}
                      <div
                        style={{
                          flex: 1,
                          overflowY: 'auto',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '6px',
                          paddingRight: '2px',
                        }}
                      >
                        {gifLoading ? (
                          <div style={{ gridColumn: 'span 2', textAlign: 'center', color: '#8696a0', padding: '30px 0', fontSize: '12px' }}>
                            Loading GIFs...
                          </div>
                        ) : gifList.length === 0 ? (
                          <div style={{ gridColumn: 'span 2', textAlign: 'center', color: '#8696a0', padding: '30px 0', fontSize: '12px' }}>
                            No GIFs found. Try searching something else!
                          </div>
                        ) : (
                          gifList.map((g) => (
                            <div
                              key={g.id}
                              onClick={() => handleSendGif(g)}
                              title={`Click to send: ${g.title}`}
                              style={{
                                height: '95px',
                                borderRadius: '6px',
                                overflow: 'hidden',
                                cursor: sendingGif ? 'wait' : 'pointer',
                                backgroundColor: '#111b21',
                                border: '1px solid rgba(255,255,255,0.05)',
                                position: 'relative',
                              }}
                            >
                              <img
                                src={g.url}
                                alt={g.title}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  display: 'block',
                                }}
                              />
                            </div>
                          ))
                        )}
                      </div>

                      {sendingGif && (
                        <div style={{ textAlign: 'center', color: '#00a884', fontSize: '11px', paddingTop: '4px', fontWeight: '500' }}>
                          Sending GIF...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <input
              type='file'
              multiple
              style={{ display: "none" }}
              id='file'
              name='files'
              onChange={handleFilesChange}
              accept="image/*,video/*,.mp4,.webm,.mov,.mkv,.avi,.pdf,.doc,.docx,.xls,.xlsx,.csv"
            />
            <label
              htmlFor='file'
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: 'rotate(45deg)',
                color: '#8696a0',
                transition: 'color 0.2s',
              }}
              title="Attach photos, videos, or documents"
              onMouseEnter={(e) => (e.currentTarget.style.color = '#00a884')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#8696a0')}
            >
              <AttachFileIcon style={{ fontSize: '24px' }} />
            </label>
          </div>
        </div>
        <form className='input-container' onSubmit={sendChat}>
          <input
            type='text'
            placeholder={selectedFiles.length > 0 ? `Add a caption for ${selectedFiles.length} file(s)...` : 'Type your message'}
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
          />
          <button className='submit'>
            <IoMdSend />
          </button>
        </form>
      </div>

      {/* In-App Popup Modal (No browser alerts) */}
      {popupAlert && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setPopupAlert(null)}
        >
          <div
            style={{
              backgroundColor: '#202c33',
              borderRadius: '12px',
              width: '380px',
              maxWidth: '90vw',
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.7)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(234, 134, 143, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ea868f',
                  fontSize: '18px',
                  flexShrink: 0,
                }}
              >
                ⚠️
              </div>
              <h3 style={{ margin: 0, color: '#e9edef', fontSize: '17px', fontWeight: '600' }}>
                {popupAlert.title || 'Notice'}
              </h3>
            </div>

            <p style={{ margin: 0, color: '#8696a0', fontSize: '13.5px', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
              {popupAlert.message}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setPopupAlert(null)}
                style={{
                  backgroundColor: '#00a884',
                  border: 'none',
                  color: '#111b21',
                  fontWeight: '600',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13.5px',
                  transition: 'background 0.2s',
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
