import React, { useState, useEffect, useRef } from 'react';
import Picker from 'emoji-picker-react';
import { IoMdSend } from 'react-icons/io';
import { BsEmojiSmileFill } from 'react-icons/bs';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import MicIcon from '@mui/icons-material/Mic';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckIcon from '@mui/icons-material/Check';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import axios from 'axios';
import { aiRewriteRoute } from '../utils/APIRoutes';

const POPULAR_GIF_CATEGORIES = [
  "Trending", "Thank You", "Laugh", "Happy", "Love", "Yes", "No", "Dance", "Bye", "Wow", "Cat"
];

// Official Giphy API key (loaded from environment variable with fallback)
const GIPHY_API_KEY = process.env.REACT_APP_GIPHY_API_KEY || "H1u5HIhVVasmC3CU0h2rHOVGcBKvNQoE";

// Built-in starter fallback GIFs if Giphy API is unreachable
const STARTER_FALLBACK_GIFS = [
  { id: "t1", title: "Excited Dance", url: "https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif" },
  { id: "t2", title: "Happy Cat", url: "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" },
  { id: "t3", title: "Mind Blown", url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif" },
  { id: "t4", title: "Popcorn Watching", url: "https://media.giphy.com/media/gl0mkIZOW6Nwc/giphy.gif" },
  { id: "t5", title: "Thumbs Up", url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif" },
  { id: "t6", title: "Shocked", url: "https://media.giphy.com/media/PUBxelw8HF4o8/giphy.gif" },
  { id: "t7", title: "Applause", url: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif" },
  { id: "t8", title: "Dance Move", url: "https://media.giphy.com/media/l3vRlT2k2L35Cnn5C/giphy.gif" },
];

export default function ChatInput({
  handleSendMsg,
  replyingTo,
  onCancelReply,
  editingMessage,
  onSaveEdit,
  onCancelEdit,
  onTyping,
  onStopTyping,
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeTab, setActiveTab] = useState("emoji"); // "emoji" | "gif"
  const [msg, setMsg] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [gifQuery, setGifQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Trending');
  const [gifList, setGifList] = useState(STARTER_FALLBACK_GIFS);
  const [gifLoading, setGifLoading] = useState(false);
  const [sendingGif, setSendingGif] = useState(false);
  const [popupAlert, setPopupAlert] = useState(null); // { title, message }
  const [showToneMenu, setShowToneMenu] = useState(false);
  const [rewritingTone, setRewritingTone] = useState(false);
  const [previewDialog, setPreviewDialog] = useState(null); // { originalText, rewrittenText, tone, toneName, emoji }
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const emojiPickerRef = useRef(null);
  const toneMenuRef = useRef(null);
  const gifCache = useRef({});
  const activeRequestId = useRef(0);
  const gifSearchDebounceRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const TONE_OPTIONS = [
    { id: "professional", label: "Professional", emoji: "💼", desc: "Polished, clear & corporate" },
    { id: "casual", label: "Casual", emoji: "😂", desc: "Fun, relaxed & friendly" },
    { id: "concise", label: "Concise", emoji: "💡", desc: "Short, punchy & fluff-free" },
    { id: "polite", label: "Polite", emoji: "🤝", desc: "Warm, respectful & courteous" },
    { id: "energetic", label: "Energetic", emoji: "🚀", desc: "Enthusiastic & motivational" },
  ];

  const handleOpenToneMenu = () => {
    if (!msg.trim()) {
      setPopupAlert({
        title: "Magic Tone Rewriter",
        message: "Please type a message in the input box first to rewrite its tone!",
      });
      return;
    }
    setShowToneMenu((prev) => !prev);
  };

  const handleRewriteTone = async (toneObj) => {
    if (!msg.trim()) return;
    setShowToneMenu(false);
    setRewritingTone(true);

    // Immediately open dialog with loading = true
    setPreviewDialog({
      originalText: msg.trim(),
      rewrittenText: "",
      loading: true,
      tone: toneObj.id,
      toneName: toneObj.label,
      emoji: toneObj.emoji,
    });

    try {
      const response = await axios.post(aiRewriteRoute, {
        text: msg.trim(),
        tone: toneObj.id,
      });

      if (response.data && response.data.rewrittenText) {
        setPreviewDialog((prev) => ({
          ...(prev || {}),
          originalText: msg.trim(),
          rewrittenText: response.data.rewrittenText,
          loading: false,
          tone: toneObj.id,
          toneName: toneObj.label,
          emoji: toneObj.emoji,
        }));
      }
    } catch (err) {
      console.error("AI rewrite error:", err);
      setPreviewDialog((prev) => ({
        ...(prev || {}),
        loading: false,
        error: "Failed to rewrite tone. Please try again.",
      }));
    } finally {
      setRewritingTone(false);
    }
  };

  const handleApplyPreview = () => {
    if (previewDialog?.rewrittenText) {
      setMsg(previewDialog.rewrittenText);
      setPreviewDialog(null);
      inputRef.current?.focus();
    }
  };

  const handleCopyPreview = () => {
    if (previewDialog?.rewrittenText) {
      navigator.clipboard.writeText(previewDialog.rewrittenText);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2000);
    }
  };

  // Voice Recording State & Refs
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const speechTranscriptRef = useRef('');

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPopupAlert({
          title: "Voice Notes Unsupported",
          message: "Your browser does not support microphone voice recording.",
        });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      speechTranscriptRef.current = '';

      // Live Speech Recognition in browser (captures real spoken words)
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = navigator.language || 'en-US';
          recognition.onresult = (event) => {
            let fullText = '';
            for (let i = 0; i < event.results.length; ++i) {
              fullText += event.results[i][0].transcript + ' ';
            }
            speechTranscriptRef.current = fullText.trim();
          };
          recognition.onerror = (e) => {
            console.warn("Speech recognition warning:", e.error);
          };
          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch (speechErr) {
          console.warn("Speech recognition init:", speechErr);
        }
      }

      let mimeType = 'audio/webm;codecs=opus';
      if (!window.MediaRecorder || !MediaRecorder.isTypeSupported(mimeType)) {
        if (window.MediaRecorder && MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
        else if (window.MediaRecorder && MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
        else if (window.MediaRecorder && MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else mimeType = '';
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingDuration(0);

      if (onTyping) onTyping();

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      setPopupAlert({
        title: "Microphone Access Required",
        message: "Please allow microphone access in your browser to record and send voice notes.",
      });
    }
  };

  const stopAndSendRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    const recorder = mediaRecorderRef.current;
    clearInterval(recordingTimerRef.current);
    if (onStopTyping) onStopTyping();

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
    }

    const capturedTranscript = speechTranscriptRef.current || '';

    recorder.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      const audioExt = (recorder.mimeType || "").includes("ogg") ? "ogg" : (recorder.mimeType || "").includes("mp4") ? "m4a" : "webm";
      const audioFile = new File([audioBlob], `voice-note-${Date.now()}.${audioExt}`, {
        type: recorder.mimeType || 'audio/webm',
      });

      // Attach recognized speech transcript to file object
      audioFile.voiceTranscript = capturedTranscript;

      if (recorder.stream) {
        recorder.stream.getTracks().forEach((track) => track.stop());
      }

      setIsRecording(false);
      setRecordingDuration(0);
      audioChunksRef.current = [];
      speechTranscriptRef.current = '';

      handleSendMsg("", [audioFile], replyingTo);
      if (replyingTo && onCancelReply) {
        onCancelReply();
      }
    };

    recorder.stop();
  };

  const cancelRecording = () => {
    if (!mediaRecorderRef.current) return;
    clearInterval(recordingTimerRef.current);
    if (onStopTyping) onStopTyping();

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
    }

    const recorder = mediaRecorderRef.current;
    if (recorder.state !== 'inactive') {
      recorder.stop();
    }
    if (recorder.stream) {
      recorder.stream.getTracks().forEach((track) => track.stop());
    }

    setIsRecording(false);
    setRecordingDuration(0);
    audioChunksRef.current = [];
    speechTranscriptRef.current = '';
  };

  const formatRecordingTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMsg(value);

    if (onTyping) {
      onTyping();
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (onStopTyping) {
        onStopTyping();
      }
    }, 2000);
  };

  useEffect(() => {
    if (editingMessage) {
      setMsg(editingMessage.message || "");
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  useEffect(() => {
    if (replyingTo) {
      inputRef.current?.focus();
    }
  }, [replyingTo]);

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

  useEffect(() => {
    const handleToneClickOutside = (event) => {
      if (toneMenuRef.current && !toneMenuRef.current.contains(event.target)) {
        setShowToneMenu(false);
      }
    };

    if (showToneMenu) {
      document.addEventListener('mousedown', handleToneClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleToneClickOutside);
    };
  }, [showToneMenu]);

  // Fetch GIFs via Official GIPHY API with cache and race-condition prevention
  const fetchGifs = async (searchTerm = "") => {
    const q = (searchTerm || "").trim();
    const isTrending = q === "" || q.toLowerCase() === "trending";
    const normalizedKey = isTrending ? "trending" : q.toLowerCase();

    // 1. Instant Cache Hit (0ms latency, saves API quota)
    if (gifCache.current[normalizedKey] && Array.isArray(gifCache.current[normalizedKey])) {
      setGifList(gifCache.current[normalizedKey]);
      setGifLoading(false);
      return;
    }

    const reqId = ++activeRequestId.current;
    setGifLoading(true);

    try {
      const apiKey = GIPHY_API_KEY || "H1u5HIhVVasmC3CU0h2rHOVGcBKvNQoE";
      const endpoint = isTrending
        ? `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=24&rating=g`
        : `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(q)}&limit=24&rating=g`;

      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (reqId === activeRequestId.current) {
          if (data?.data && Array.isArray(data.data)) {
            const formatted = data.data
              .map((item) => ({
                id: item.id,
                title: item.title || "GIF",
                url: item.images?.fixed_height?.url || item.images?.downsized_medium?.url || item.images?.downsized?.url || item.images?.original?.url || item.images?.fixed_width?.url,
              }))
              .filter((item) => Boolean(item.url));

            gifCache.current[normalizedKey] = formatted;
            setGifList(formatted);
            setGifLoading(false);
            return;
          }
        }
      } else {
        console.warn("[GIPHY API] HTTP response error:", res.status, res.statusText);
      }
    } catch (err) {
      console.warn("[GIPHY API] Live fetch error:", err.message);
    }

    // If search returned empty or error occurred:
    if (reqId === activeRequestId.current) {
      if (isTrending) {
        setGifList(STARTER_FALLBACK_GIFS);
      } else {
        gifCache.current[normalizedKey] = [];
        setGifList([]);
      }
      setGifLoading(false);
    }
  };

  const handleGifSearchChange = (e) => {
    const val = e.target.value;
    setGifQuery(val);
    setSelectedCategory(val.trim() === "" ? "Trending" : "");

    if (gifSearchDebounceRef.current) {
      clearTimeout(gifSearchDebounceRef.current);
    }

    gifSearchDebounceRef.current = setTimeout(() => {
      fetchGifs(val);
    }, 350);
  };

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    if (gifSearchDebounceRef.current) {
      clearTimeout(gifSearchDebounceRef.current);
    }
    const searchVal = cat === "Trending" ? "" : cat;
    setGifQuery(searchVal);
    fetchGifs(searchVal);
  };

  const handleClearSearch = () => {
    if (gifSearchDebounceRef.current) {
      clearTimeout(gifSearchDebounceRef.current);
    }
    setGifQuery("");
    setSelectedCategory("Trending");
    fetchGifs("trending");
  };

  const handleEmojiPickerHideShow = () => {
    if (!showEmojiPicker) {
      // Opening picker -> load trending GIFs if not loaded yet
      if (!gifCache.current["trending"]) {
        fetchGifs("trending");
      }
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
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (onStopTyping) {
      onStopTyping();
    }

    if (editingMessage) {
      if (msg.trim().length > 0) {
        if (onSaveEdit) onSaveEdit(editingMessage._id, msg.trim());
        setMsg('');
      }
      return;
    }

    if (msg.trim().length > 0 || selectedFiles.length > 0) {
      handleSendMsg(msg.trim(), selectedFiles, replyingTo);
      setMsg('');
      setSelectedFiles([]);
      if (replyingTo && onCancelReply) {
        onCancelReply();
      }
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
      {/* Quoted Reply Banner */}
      {replyingTo && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#182229',
            borderLeft: '4px solid #00a884',
            padding: '8px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
            <span style={{ color: '#00a884', fontSize: '12px', fontWeight: '600' }}>
              Replying to {replyingTo.senderName || 'Message'}
            </span>
            <span
              style={{
                color: '#8696a0',
                fontSize: '12px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '450px',
              }}
            >
              {replyingTo.text || (replyingTo.fileType ? `📎 ${replyingTo.fileType.toUpperCase()}` : 'Attachment')}
            </span>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8696a0',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '4px',
            }}
            title="Cancel reply"
          >
            ✕
          </button>
        </div>
      )}

      {/* Editing Message Banner */}
      {editingMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#182229',
            borderLeft: '4px solid #f59e0b',
            padding: '8px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: '600' }}>
              ✏️ Edit Message
            </span>
            <span style={{ color: '#8696a0', fontSize: '11.5px' }}>
              Make changes and click checkmark or press Enter to save
            </span>
          </div>
          <button
            type="button"
            onClick={onCancelEdit}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8696a0',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '4px',
            }}
            title="Cancel editing"
          >
            ✕
          </button>
        </div>
      )}

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
                            placeholder="Search GIFs (e.g. dance, cat, laugh, bye)..."
                            value={gifQuery}
                            onChange={handleGifSearchChange}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (gifSearchDebounceRef.current) {
                                  clearTimeout(gifSearchDebounceRef.current);
                                }
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
                          onClick={() => {
                            if (gifSearchDebounceRef.current) {
                              clearTimeout(gifSearchDebounceRef.current);
                            }
                            fetchGifs(gifQuery);
                          }}
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
                            {gifQuery ? `No GIFs found for "${gifQuery}". Try another keyword!` : 'No GIFs found.'}
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

                      {/* GIPHY Official Attribution Badge */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingTop: '6px',
                          borderTop: '1px solid rgba(255,255,255,0.06)',
                          marginTop: '4px',
                        }}
                      >
                        <span style={{ fontSize: '10px', color: '#8696a0', fontWeight: '500', letterSpacing: '0.5px' }}>
                          ⚡ Powered by <strong style={{ color: '#00ff99' }}>GIPHY</strong>
                        </span>
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

            {/* AI Magic Tone Rewriter Button & Popover */}
            <div style={{ position: 'relative' }} ref={toneMenuRef}>
              <button
                type="button"
                onClick={handleOpenToneMenu}
                title="✨ AI Tone Rewriter (Magic Wand)"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: rewritingTone ? '#00a884' : '#8696a0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2px',
                  transition: 'color 0.2s, transform 0.15s',
                  animation: rewritingTone ? 'spin 1.5s linear infinite' : 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#00a884';
                  e.currentTarget.style.transform = 'scale(1.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = rewritingTone ? '#00a884' : '#8696a0';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <AutoFixHighIcon style={{ fontSize: '23px' }} />
              </button>

              {/* Tone Popover Menu */}
              {showToneMenu && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '45px',
                    left: '0px',
                    zIndex: 1000,
                    backgroundColor: '#202c33',
                    borderRadius: '10px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    width: '230px',
                    overflow: 'hidden',
                    animation: 'fadeIn 0.15s ease-out',
                  }}
                >
                  <div
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#111b21',
                      borderBottom: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span style={{ fontSize: '14px' }}>🪄</span>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#e9edef' }}>
                      AI Tone Rewriter
                    </span>
                  </div>

                  <div style={{ padding: '6px 0' }}>
                    {TONE_OPTIONS.map((opt) => (
                      <div
                        key={opt.id}
                        onClick={() => handleRewriteTone(opt)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 14px',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#182229')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <span style={{ fontSize: '17px' }}>{opt.emoji}</span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '13px', color: '#e9edef', fontWeight: '500' }}>
                            {opt.label}
                          </span>
                          <span style={{ fontSize: '10.5px', color: '#8696a0' }}>
                            {opt.desc}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {isRecording ? (
          <div className="voice-recording-bar">
            <div className="recording-blink-dot" />
            <span style={{ color: '#ea868f', fontSize: '13.5px', fontWeight: 'bold', minWidth: '42px', letterSpacing: '0.5px' }}>
              {formatRecordingTime(recordingDuration)}
            </span>

            {/* Visualizer Soundwave Bars */}
            <div className="soundwave-visualizer">
              {[0.2, 0.5, 0.8, 0.3, 0.9, 0.4, 0.7, 0.2, 0.6, 1.0, 0.5, 0.3, 0.8, 0.4, 0.7, 0.9, 0.3, 0.6].map((delay, idx) => (
                <div
                  key={idx}
                  className="soundwave-bar"
                  style={{
                    animationDelay: `${delay}s`,
                    height: `${8 + Math.sin(idx) * 6}px`,
                  }}
                />
              ))}
            </div>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={cancelRecording}
              title="Discard recording"
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#ea868f',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px',
                borderRadius: '50%',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <DeleteOutlineIcon style={{ fontSize: '22px' }} />
            </button>

            {/* Send Voice Note Button */}
            <button
              type="button"
              onClick={stopAndSendRecording}
              title="Send voice note"
              style={{
                backgroundColor: '#00a884',
                border: 'none',
                color: '#111b21',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                fontWeight: 'bold',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                transition: 'transform 0.15s, background-color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <CheckIcon style={{ fontSize: '20px', fontWeight: 'bold' }} />
            </button>
          </div>
        ) : (
          <form className='input-container' onSubmit={sendChat}>
            <input
              ref={inputRef}
              type='text'
              placeholder={selectedFiles.length > 0 ? `Add a caption for ${selectedFiles.length} file(s)...` : (editingMessage ? "Edit your message..." : "Type your message")}
              value={msg}
              onChange={handleInputChange}
            />
            {msg.trim().length > 0 || selectedFiles.length > 0 || editingMessage ? (
              <button className='submit' title={editingMessage ? "Save edit" : "Send"}>
                <IoMdSend />
              </button>
            ) : (
              <button
                type="button"
                className='submit'
                onClick={startRecording}
                title="Record Voice Note"
                style={{
                  color: '#8696a0',
                  transition: 'color 0.2s, transform 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#00a884';
                  e.currentTarget.style.transform = 'scale(1.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#8696a0';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <MicIcon style={{ fontSize: '23px' }} />
              </button>
            )}
          </form>
        )}
      </div>

      {/* In-App AI Tone Rewriter Preview Dialog */}
      {previewDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.78)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setPreviewDialog(null)}
        >
          <div
            style={{
              backgroundColor: '#202c33',
              borderRadius: '12px',
              width: '460px',
              maxWidth: '92vw',
              padding: '22px',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.75)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🪄</span>
                <div>
                  <h3 style={{ margin: 0, color: '#e9edef', fontSize: '16px', fontWeight: '600' }}>
                    AI Tone Rewriter Preview
                  </h3>
                  <span style={{ fontSize: '12px', color: '#00a884', fontWeight: '500' }}>
                    Tone: {previewDialog.emoji} {previewDialog.toneName}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDialog(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8696a0',
                  fontSize: '18px',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Original Draft Box */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11.5px', color: '#8696a0', fontWeight: '600', letterSpacing: '0.3px' }}>
                ORIGINAL DRAFT
              </span>
              <div
                style={{
                  backgroundColor: '#111b21',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '13px',
                  color: '#8696a0',
                  border: '1px solid rgba(255,255,255,0.06)',
                  maxHeight: '80px',
                  overflowY: 'auto',
                }}
              >
                {previewDialog.originalText}
              </div>
            </div>

            {/* Rewritten Draft Box / Loading State */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11.5px', color: '#00a884', fontWeight: '600', letterSpacing: '0.3px' }}>
                ✨ REWRITTEN DRAFT ({previewDialog.toneName?.toUpperCase() || "AI REWRITE"})
              </span>
              {previewDialog.loading ? (
                <div
                  style={{
                    backgroundColor: '#182229',
                    borderRadius: '8px',
                    padding: '24px 16px',
                    fontSize: '13.5px',
                    color: '#00a884',
                    border: '1.5px dashed #00a884',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    minHeight: '100px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px', animation: 'spin 1.5s linear infinite' }}>🪄</span>
                    <span style={{ fontWeight: '600' }}>
                      Rewriting into {previewDialog.emoji} {previewDialog.toneName} tone...
                    </span>
                  </div>
                  <div className="typing-indicator" style={{ background: 'transparent', padding: 0 }}>
                    <span className="typing-dot" style={{ backgroundColor: '#00a884', width: '6px', height: '6px' }}></span>
                    <span className="typing-dot" style={{ backgroundColor: '#00a884', width: '6px', height: '6px' }}></span>
                    <span className="typing-dot" style={{ backgroundColor: '#00a884', width: '6px', height: '6px' }}></span>
                  </div>
                </div>
              ) : previewDialog.error ? (
                <div
                  style={{
                    backgroundColor: 'rgba(234, 134, 143, 0.15)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    fontSize: '13px',
                    color: '#ea868f',
                    border: '1px solid #ea868f',
                  }}
                >
                  ⚠️ {previewDialog.error}
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: '#182229',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    fontSize: '14px',
                    color: '#e9edef',
                    border: '1.5px solid #00a884',
                    boxShadow: '0 0 12px rgba(0, 168, 132, 0.15)',
                    maxHeight: '140px',
                    overflowY: 'auto',
                    lineHeight: '1.45',
                  }}
                >
                  {previewDialog.rewrittenText}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
              <button
                type="button"
                onClick={handleCopyPreview}
                disabled={previewDialog.loading || !previewDialog.rewrittenText}
                style={{
                  backgroundColor: '#2a3942',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: copiedSuccess ? '#00a884' : '#e9edef',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  cursor: (previewDialog.loading || !previewDialog.rewrittenText) ? 'not-allowed' : 'pointer',
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '500',
                  opacity: (previewDialog.loading || !previewDialog.rewrittenText) ? 0.5 : 1,
                  transition: 'background 0.2s, color 0.2s',
                }}
              >
                <ContentCopyIcon style={{ fontSize: '15px' }} />
                <span>{copiedSuccess ? "Copied!" : "Copy"}</span>
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPreviewDialog(null)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#8696a0',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyPreview}
                  disabled={previewDialog.loading || !previewDialog.rewrittenText}
                  style={{
                    backgroundColor: '#00a884',
                    border: 'none',
                    color: '#111b21',
                    fontWeight: '600',
                    padding: '8px 18px',
                    borderRadius: '6px',
                    cursor: (previewDialog.loading || !previewDialog.rewrittenText) ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    boxShadow: '0 2px 8px rgba(0, 168, 132, 0.3)',
                    opacity: (previewDialog.loading || !previewDialog.rewrittenText) ? 0.5 : 1,
                    transition: 'transform 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!previewDialog.loading && previewDialog.rewrittenText) {
                      e.currentTarget.style.transform = 'scale(1.03)';
                    }
                  }}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  Apply to Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
