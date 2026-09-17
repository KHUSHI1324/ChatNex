import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import ChatInput from "./ChatInput";
import ChatInfoDrawer from "./ChatInfoDrawer";
import CallIcon from '@mui/icons-material/Call';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import FindInPageIcon from '@mui/icons-material/FindInPage';
import { sendMessageRoute, getAllMessagesRoute, imageapi, host } from "../utils/APIRoutes";
import { getAvatarSrc } from "../utils/avatarHelper";
import { v4 as uuidv4 } from "uuid";

export default function ChatContainer({
  currentChat,
  currentUser,
  contacts = [],
  socket,
  arrivalMessage,
  onMessageSent,
  onStartCall,
  onOpenDirectChat,
  onAddMembersToGroup,
  onRemoveMemberFromGroup,
  onMakeAdminInGroup,
  onDismissAdminInGroup,
  onUpdateGroupAvatar,
  onLeaveGroup,
  onDeleteGroup,
}) {
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Map()); // New state for online/offline status
  const [hoveredMessageIndex, setHoveredMessageIndex] = useState(null);
  const [showSearchInputBar, setShowSearchInputBar] = useState(false); // State to track search input bar visibility
  const [showInfoDrawer, setShowInfoDrawer] = useState(false); // State to toggle WhatsApp-style info drawer
  const [option, setOption] = useState();
  const scrollRef = useRef();
  const messagesEndRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState(""); // State to track the search term
  const [errorPopup, setErrorPopup] = useState(null); // { title, message }

  const formatSystemMessage = (text, currentUserName) => {
    if (!text) return "";
    let res = text;
    if (currentUserName) {
      const escaped = currentUserName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const regexStart = new RegExp(`^${escaped}\\b`, 'i');
      res = res.replace(regexStart, 'You');

      const regexAdded = new RegExp(`(\\badded\\s+)${escaped}\\b`, 'i');
      res = res.replace(regexAdded, '$1you');

      const regexRemoved = new RegExp(`(\\bremoved\\s+)${escaped}\\b`, 'i');
      res = res.replace(regexRemoved, '$1you');
    }
    return res;
  };

  const isGroupChat = Boolean(currentChat?.isGroup);
  const isCurrentMember = isGroupChat ? (
    currentChat.isCurrentMember !== undefined
      ? currentChat.isCurrentMember
      : (currentChat.members || []).some(
          (m) => (m._id || m).toString() === (currentUser?._id || '').toString()
        ) || (currentChat.admin?._id || currentChat.admin || '').toString() === (currentUser?._id || '').toString()
  ) : true;


  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom("auto");
    const timer = setTimeout(() => {
      scrollToBottom("smooth");
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, currentChat]);

  useEffect(() => {
    if (socket?.current) {
      const handleUserStatus = (userId, status) => {
        setOnlineUsers((prev) => new Map(prev.set(userId, status)));
      };
      socket.current.on("user-status", handleUserStatus);

      return () => {
        socket.current.off("user-status", handleUserStatus);
      };
    }
  }, [socket]);

  useEffect(() => {
    async function fetchData() {
      if (currentChat && currentUser && currentUser._id) {
        const response = await axios.post(getAllMessagesRoute, {
          from: currentUser._id,
          to: currentChat._id,
          isGroup: Boolean(currentChat.isGroup),
          groupId: currentChat.isGroup ? currentChat._id : null,
        });
        setMessages(response.data);
      }
    }
    fetchData();
  }, [currentChat, currentUser]);

  const handleSendMsg = async (msg, attachedFiles) => {
    if (!currentUser || !currentUser._id) {
      return;
    }

    const filesList = Array.isArray(attachedFiles) ? attachedFiles : (attachedFiles ? [attachedFiles] : []);
    const isGroupChat = Boolean(currentChat.isGroup);
    const memberIds = isGroupChat && currentChat.members
      ? currentChat.members.map((m) => (m._id || m).toString())
      : [currentUser._id, currentChat._id];

    if (filesList.length > 0) {
      const formData = new FormData();
      filesList.forEach((file) => {
        formData.append("files", file);
      });
      formData.append("from", currentUser._id);
      formData.append("to", currentChat._id);
      formData.append("message", msg || "");
      if (isGroupChat) {
        formData.append("isGroup", "true");
        formData.append("groupId", currentChat._id);
      }

      console.log("[FRONTEND UPLOAD PAYLOAD]", {
        filesCount: filesList.length,
        from: currentUser._id,
        to: currentChat._id,
        isGroup: isGroupChat,
        message: msg || "",
      });

      try {
        const { data } = await axios.post(imageapi, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const imgpath = data.imgpath || data.finaldata?.message?.imgpath;
        const uploadedFiles = data.files || data.finaldata?.message?.files || [];
        const timestamp = new Date().toISOString();

        // Immediately update sender's own sidebar preview & top-ranking
        if (onMessageSent) {
          onMessageSent(currentChat._id, msg, imgpath, currentUser._id, timestamp, uploadedFiles);
        }

        if (socket?.current) {
          let defaultPreview = "📷 Photo";
          if (uploadedFiles.length > 1) {
            const allImg = uploadedFiles.every(f => f.fileType === "image" || (!f.fileType && /\.(png|jpe?g|webp|bmp|svg)$/i.test(f.url || f.filename || "")));
            defaultPreview = allImg ? `📷 ${uploadedFiles.length} photos` : `📎 ${uploadedFiles.length} files`;
          } else if (uploadedFiles.length === 1) {
            const single = uploadedFiles[0];
            const singleExt = (single.filename || single.url || "").split(".").pop().toLowerCase();
            if (single.fileType === "video" || /\.(mp4|webm|mov|mkv|avi|ogg)$/i.test(single.url || single.filename || "")) {
              defaultPreview = "🎥 Video";
            } else if (single.fileType === "gif" || singleExt === "gif") {
              defaultPreview = "👾 GIF";
            } else if (single.fileType === "image" || /\.(png|jpe?g|webp|bmp|svg)$/i.test(single.url || single.filename || "")) {
              defaultPreview = "📷 Photo";
            } else if (single.fileType === "pdf" || singleExt === "pdf" || single.fileType === "doc" || ["doc", "docx"].includes(singleExt)) {
              defaultPreview = "📄 Document";
            } else if (single.fileType === "sheet" || ["xls", "xlsx", "csv"].includes(singleExt)) {
              defaultPreview = "📊 Spreadsheet";
            } else {
              defaultPreview = "📎 File";
            }
          } else if (imgpath) {
            const ext = (imgpath.split(".").pop() || "").toLowerCase();
            if (["mp4", "webm", "mov", "mkv", "avi"].includes(ext)) defaultPreview = "🎥 Video";
            else if (ext === "gif") defaultPreview = "👾 GIF";
            else if (["pdf", "doc", "docx"].includes(ext)) defaultPreview = "📄 Document";
            else if (["xls", "xlsx", "csv"].includes(ext)) defaultPreview = "📊 Spreadsheet";
          }

          socket.current.emit("send-msg", {
            from: currentUser._id,
            to: currentChat._id,
            message: msg || defaultPreview,
            imgpath: imgpath,
            files: uploadedFiles,
            isGroup: isGroupChat,
            groupId: isGroupChat ? currentChat._id : null,
            members: memberIds,
            senderName: currentUser.username,
            senderAvatar: currentUser.avtarImage,
            groupName: currentChat.name || currentChat.username,
          });
        }

        const newMessage = {
          fromSelf: true,
          message: msg,
          imgpath: imgpath,
          files: uploadedFiles,
          read: false,
          timestamp,
          senderName: currentUser.username,
          isGroup: isGroupChat,
        };
        setMessages((prev) => [...prev, newMessage]);
      } catch (err) {
        console.error("Error uploading media message:", err);
        const errMsg = err.response?.data?.error || err.message || "Failed to upload files";
        setErrorPopup({
          title: "Upload Failed",
          message: `Upload failed: ${errMsg}.\nPlease make sure the backend server ('node index.js') is running.`,
        });
      }
    } else {
      await axios.post(sendMessageRoute, {
        from: currentUser._id,
        to: currentChat._id,
        message: msg,
        isGroup: isGroupChat,
        groupId: isGroupChat ? currentChat._id : null,
      });

      const timestamp = new Date().toISOString();

      // Immediately update sender's own sidebar preview & top-ranking
      if (onMessageSent) {
        onMessageSent(currentChat._id, msg, null, currentUser._id, timestamp, []);
      }

      if (socket?.current) {
        socket.current.emit("send-msg", {
          from: currentUser._id,
          to: currentChat._id,
          message: msg,
          files: [],
          isGroup: isGroupChat,
          groupId: isGroupChat ? currentChat._id : null,
          members: memberIds,
          senderName: currentUser.username,
          senderAvatar: currentUser.avtarImage,
          groupName: currentChat.name || currentChat.username,
        });
      }
      const newMessage = {
        fromSelf: true,
        message: msg,
        read: false,
        timestamp,
        senderName: currentUser.username,
        isGroup: isGroupChat,
      };
      setMessages((prev) => [...prev, newMessage]);
    }
  };

  useEffect(() => {
    if (socket?.current) {
      const handleMsgRead = (data) => {
        console.log("[FRONTEND] msg-read received:", data);
        if (currentChat && currentChat._id === data.readerId) {
          setMessages((prev) =>
            prev.map((m) => (m.fromSelf ? { ...m, read: true } : m))
          );
        }
      };

      socket.current.on("msg-read", handleMsgRead);
      return () => {
        socket.current.off("msg-read", handleMsgRead);
      };
    }
  }, [socket, currentChat]);

  useEffect(() => {
    if (arrivalMessage) {
      setMessages((prev) => [...prev, arrivalMessage]);
    }
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

  const renderDocumentCard = (file, fileIndex) => {
    const ext = (file.filename || file.url || "").split(".").pop().toLowerCase();
    let icon = "📄";
    let badgeColor = "#e53935"; // Red for PDF
    let typeLabel = "PDF";

    if (file.fileType === "pdf" || ext === "pdf") {
      icon = "📄";
      badgeColor = "#e53935";
      typeLabel = "PDF";
    } else if (file.fileType === "doc" || ["doc", "docx"].includes(ext)) {
      icon = "📝";
      badgeColor = "#1976d2";
      typeLabel = "DOC";
    } else if (file.fileType === "sheet" || ["xls", "xlsx", "csv"].includes(ext)) {
      icon = "📊";
      badgeColor = "#388e3c";
      typeLabel = ext.toUpperCase();
    } else {
      icon = "📎";
      badgeColor = "#607d8b";
      typeLabel = ext.toUpperCase() || "FILE";
    }

    const formatSize = (bytes) => {
      if (!bytes || bytes === 0) return "";
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
      <div
        key={fileIndex}
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "rgba(0, 0, 0, 0.25)",
          borderRadius: "8px",
          padding: "6px 10px",
          marginBottom: "4px",
          gap: "8px",
          width: "240px",
          boxSizing: "border-box",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: badgeColor,
            color: "#fff",
            borderRadius: "6px",
            width: "32px",
            height: "32px",
            fontSize: "16px",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: "12px",
              color: "#fff",
              fontWeight: "500",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={file.filename}
          >
            {file.filename || "Document"}
          </span>
          <span style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.6)" }}>
            {typeLabel} {file.size ? `• ${formatSize(file.size)}` : ""}
          </span>
        </div>
        <a
          href={`${host}/${file.url}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            backgroundColor: "#00a884",
            color: "#fff",
            padding: "3px 8px",
            borderRadius: "4px",
            fontSize: "11px",
            textDecoration: "none",
            fontWeight: "bold",
            flexShrink: 0,
            cursor: "pointer",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          Open
        </a>
      </div>
    );
  };

  const renderAttachmentsSection = (messageFiles) => {
    if (!messageFiles || messageFiles.length === 0) return null;

    const getFileUrl = (url) => {
      if (!url) return "";
      return url.startsWith("http://") || url.startsWith("https://") ? url : `${host}/${url}`;
    };

    const videos = messageFiles.filter(
      (f) => f.fileType === "video" || (f.mimeType && f.mimeType.startsWith("video/")) || /\.(mp4|webm|mov|mkv|avi|ogg|m4v)$/i.test(f.url || f.filename || "")
    );
    const gifs = messageFiles.filter(
      (f) => !videos.includes(f) && (f.fileType === "gif" || /\.(gif)$/i.test(f.url || f.filename || ""))
    );
    const images = messageFiles.filter(
      (f) => !videos.includes(f) && !gifs.includes(f) && (f.fileType === "image" || (f.mimeType && f.mimeType.startsWith("image/")) || /\.(png|jpe?g|webp|bmp|svg)$/i.test(f.url || f.filename || ""))
    );
    const docs = messageFiles.filter((f) => !videos.includes(f) && !gifs.includes(f) && !images.includes(f));

    return (
      <div className="message-attachments" style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "4px" }}>
        {/* Videos Section */}
        {videos.map((vid, vIdx) => (
          <div
            key={`vid-${vIdx}`}
            style={{
              maxWidth: "280px",
              borderRadius: "8px",
              overflow: "hidden",
              backgroundColor: "#000",
              marginBottom: "4px",
            }}
          >
            <video
              controls
              preload="metadata"
              style={{
                width: "100%",
                maxHeight: "260px",
                display: "block",
                borderRadius: "8px",
                outline: "none",
                backgroundColor: "#000",
              }}
              src={getFileUrl(vid.url)}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        ))}

        {/* GIFs Section */}
        {gifs.map((gif, gIdx) => (
          <div
            key={`gif-${gIdx}`}
            style={{
              maxWidth: "240px",
              borderRadius: "8px",
              overflow: "hidden",
              cursor: "pointer",
              backgroundColor: "#182229",
              marginBottom: "4px",
              position: "relative",
            }}
            onClick={() => window.open(getFileUrl(gif.url), "_blank")}
          >
            <img
              src={getFileUrl(gif.url)}
              alt={gif.filename || "GIF"}
              style={{
                width: "100%",
                maxHeight: "220px",
                objectFit: "contain",
                display: "block",
              }}
            />
            <span
              style={{
                position: "absolute",
                bottom: "6px",
                left: "6px",
                backgroundColor: "rgba(0,0,0,0.65)",
                color: "#fff",
                fontSize: "10px",
                fontWeight: "bold",
                padding: "2px 5px",
                borderRadius: "4px",
                letterSpacing: "0.5px",
              }}
            >
              GIF
            </span>
          </div>
        ))}

        {/* Images Grid / Card */}
        {images.length === 1 && (
          <div
            style={{
              width: "220px",
              height: "160px",
              borderRadius: "8px",
              overflow: "hidden",
              cursor: "pointer",
              backgroundColor: "#1f2c34",
            }}
            onClick={() => window.open(getFileUrl(images[0].url), "_blank")}
          >
            <img
              src={getFileUrl(images[0].url)}
              alt={images[0].filename || "attachment"}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
        )}

        {images.length > 1 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 110px)",
              gap: "4px",
              maxWidth: "228px",
            }}
          >
            {images.map((img, i) => (
              <div
                key={i}
                style={{
                  width: "110px",
                  height: "110px",
                  borderRadius: "6px",
                  overflow: "hidden",
                  cursor: "pointer",
                  backgroundColor: "#1f2c34",
                }}
                onClick={() => window.open(getFileUrl(img.url), "_blank")}
                title={img.filename || "View image"}
              >
                <img
                  src={getFileUrl(img.url)}
                  alt={img.filename || "attachment"}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Documents List */}
        {docs.map((doc, dIdx) => renderDocumentCard(doc, dIdx))}
      </div>
    );
  };

  const isGenericPreviewText = (text) => {
    if (!text) return true;
    const trimmed = text.trim();
    return (
      trimmed === "📷 Photo" ||
      trimmed === "🎥 Video" ||
      trimmed === "👾 GIF" ||
      trimmed === "📄 Document" ||
      trimmed === "📊 Spreadsheet" ||
      trimmed === "📎 File" ||
      trimmed === "📎 Attachment" ||
      trimmed.toLowerCase().endsWith(".gif") ||
      trimmed.toLowerCase().endsWith(".png") ||
      trimmed.toLowerCase().endsWith(".jpg") ||
      trimmed.toLowerCase().endsWith(".jpeg") ||
      trimmed.toLowerCase().endsWith(".mp4") ||
      trimmed.toLowerCase().endsWith(".webm") ||
      trimmed.toLowerCase().endsWith(".mov") ||
      trimmed.toLowerCase().endsWith(".webp") ||
      trimmed.toLowerCase().endsWith(".pdf") ||
      trimmed.toLowerCase().endsWith(".docx") ||
      trimmed.toLowerCase().endsWith(".xlsx") ||
      /^📎 \d+ files?$/i.test(trimmed) ||
      /^📷 \d+ photos?$/i.test(trimmed)
    );
  };

  const getEmojiOnlyInfo = (text, hasAttachments) => {
    if (hasAttachments || !text || typeof text !== "string") return null;
    const trimmed = text.trim();
    if (!trimmed) return null;

    try {
      const nonEmoji = trimmed.replace(
        /[\p{Extended_Pictographic}\p{Emoji_Presentation}\u200d\ufe0f\u{1F3FB}-\u{1F3FF}\s]/gu,
        ""
      );
      if (nonEmoji.length > 0) return null;

      const segments = Array.from(
        trimmed.match(/(\p{Extended_Pictographic}[\u200d\ufe0f\u{1F3FB}-\u{1F3FF}\p{Extended_Pictographic}]*)/gu) || []
      );
      const count = segments.length;
      if (count === 0 || count > 6) return null;

      if (count === 1) return { fontSize: "3.2rem" };
      if (count === 2) return { fontSize: "2.6rem" };
      if (count === 3) return { fontSize: "2.1rem" };
      return { fontSize: "1.7rem" };
    } catch (e) {
      return null;
    }
  };

  const renderTicks = (message) => {
    if (!message.fromSelf) return null;
    const isRead = Boolean(message.read);

    if (isRead) {
      return (
        <span className="msg-tick seen" title="Read" style={{ display: "inline-flex", alignItems: "center", color: "#53bdeb", marginLeft: "4px" }}>
          <svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.15 0.85L4.5 6.5 2.15 4.15L0.75 5.55L4.5 9.3 11.55 2.25L10.15 0.85Z" fill="currentColor"/>
            <path d="M14.65 0.85L9 6.5 8.1 5.6 6.7 7 9 9.3 16.05 2.25L14.65 0.85Z" fill="currentColor"/>
          </svg>
        </span>
      );
    }

    return (
      <span className="msg-tick sent" title="Sent" style={{ display: "inline-flex", alignItems: "center", color: "rgba(233, 237, 239, 0.6)", marginLeft: "4px" }}>
        <svg width="12" height="11" viewBox="0 0 12 11" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10.15 0.85L4.5 6.5 2.15 4.15L0.75 5.55L4.5 9.3 11.55 2.25L10.15 0.85Z" fill="currentColor"/>
        </svg>
      </span>
    );
  };

  return (
    <>
      {currentChat && (
        <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
          <div className="chat-container" style={{ flex: 1, minWidth: 0 }}>
            <div className="chat-header">
              <div
                className="user-details"
                onClick={() => setShowInfoDrawer(!showInfoDrawer)}
                style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}
                title="Click to view info & members"
              >
                <div className="avtar" style={{ position: "relative", flexShrink: 0 }}>
                  <img
                    src={getAvatarSrc(currentChat.avtarImage)}
                    alt="avtar"
                  />
                </div>
                <div className="username" style={{ minWidth: 0 }}>
                  <h3 style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {currentChat.name || currentChat.username}
                  </h3>
                  {currentChat.isGroup ? (
                    <span
                      style={{
                        color: "#8696a0",
                        fontSize: "12px",
                        maxWidth: "280px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        display: "block",
                      }}
                      title={
                        currentChat.members
                          ? currentChat.members
                              .map((m) => (m._id === currentUser?._id ? "You" : m.username || "Member"))
                              .join(", ")
                          : "Group chat"
                      }
                    >
                      {currentChat.members && currentChat.members.length > 0
                        ? currentChat.members
                            .map((m) => (m._id === currentUser?._id ? "You" : m.username || "Member"))
                            .join(", ")
                        : "Group chat"}
                    </span>
                  ) : onlineUsers.has(currentChat._id) ? (
                    <span className="online" style={{ color: "#00a884", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px" }}>
                      <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#00a884", display: "inline-block" }}></span>
                      Online
                    </span>
                  ) : (
                    <span style={{ color: "#8696a0", fontSize: "12px" }}>Offline</span>
                  )}
                </div>
              </div>

              <div className="call-options">
                <div className="box" id="box">
                  <div
                    className="call"
                    title={currentChat.isGroup ? "Group Voice Call" : "Voice Call"}
                    onClick={() => onStartCall && onStartCall(currentChat, 'audio')}
                  >
                    <CallIcon />
                  </div>
                  <div
                    className="vc"
                    title={currentChat.isGroup ? "Group Video Call" : "Video Call"}
                    onClick={() => onStartCall && onStartCall(currentChat, 'video')}
                  >
                    <VideoCallIcon />
                  </div>
                </div>

                <div className="search" title="Search in chat">
                  <FindInPageIcon onClick={handleSearchClick} />
                </div>

                {showSearchInputBar && (
                  <input
                    type="text"
                    placeholder="Search in chat..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    style={{
                      backgroundColor: "#111b21",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      fontSize: "12px",
                      outline: "none",
                    }}
                  />
                )}
              </div>
            </div>

          <div className="chat-messages">
            {messages.map((message, index) => {
              const messageFiles = message.files && message.files.length > 0 ? message.files : (message.imgpath ? [{ url: message.imgpath, filename: message.imgpath.split("/").pop(), fileType: "image" }] : []);
              const emojiOnlyInfo = getEmojiOnlyInfo(message.message, messageFiles.length > 0);
              const showDay = index === 0 || getDay(message.timestamp) !== getDay(messages[index - 1]?.timestamp);
              const isGroupMsg = currentChat.isGroup || message.isGroup;

              const isSystemMsg = Boolean(message.isSystem) || (
                typeof message.message === 'string' &&
                (
                  /created group/i.test(message.message) ||
                  /\badded\b/i.test(message.message) ||
                  /\bleft\b/i.test(message.message) ||
                  /\bremoved\b/i.test(message.message)
                )
              );

              if (isSystemMsg) {
                return (
                  <React.Fragment key={message._id || uuidv4()}>
                    {showDay && (
                      <div className="chat-day-divider">
                        <span>{getDay(message.timestamp)}</span>
                      </div>
                    )}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        margin: '10px 0',
                        width: '100%',
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: '#182229',
                          color: '#8696a0',
                          fontSize: '12.5px',
                          fontWeight: '500',
                          padding: '5px 14px',
                          borderRadius: '8px',
                          textAlign: 'center',
                          maxWidth: '85%',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                          border: '1px solid rgba(255,255,255,0.05)',
                          lineHeight: '1.4',
                        }}
                      >
                        {formatSystemMessage(message.message, currentUser?.username)}
                      </div>
                    </div>
                  </React.Fragment>
                );
              }

              return (
                <React.Fragment key={message._id || uuidv4()}>
                  {showDay && (
                    <div className="chat-day-divider">
                      <span>{getDay(message.timestamp)}</span>
                    </div>
                  )}
                  <div
                    ref={scrollRef}
                    className={`message${message.fromSelf ? " sended" : " recieved"
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
                    <div
                      className="content"
                      onClick={() => handleContentMouseEnter(index)}
                      onDoubleClick={() => handleContentMouseLeave(index)}
                      style={emojiOnlyInfo ? { background: "transparent", boxShadow: "none", padding: "0 4px" } : undefined}
                    >
                      {/* Group sender name tag for received messages */}
                      {isGroupMsg && !message.fromSelf && (
                        <div
                          style={{
                            color: "#00a884",
                            fontSize: "12px",
                            fontWeight: "600",
                            marginBottom: "3px",
                            letterSpacing: "0.2px",
                          }}
                        >
                          {message.senderName || "Member"}
                        </div>
                      )}

                      {renderAttachmentsSection(messageFiles)}
                      {message.message && !isGenericPreviewText(message.message) && (
                        emojiOnlyInfo ? (
                          <div
                            style={{
                              fontSize: emojiOnlyInfo.fontSize,
                              lineHeight: "1.15",
                              padding: "2px 4px",
                              display: "inline-block",
                              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.35))",
                            }}
                          >
                            {message.message}
                          </div>
                        ) : (
                          <div className="message-text">
                            {highlightSearchTerm(message)}
                          </div>
                        )
                      )}
                      <div className="message-meta">
                        <span className="message-time">
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {renderTicks(message)}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* ChatInput or Read-Only Notice if user exited/removed */}
          {isGroupChat && !isCurrentMember ? (
            <div
              style={{
                padding: '16px 20px',
                backgroundColor: '#111b21',
                color: '#8696a0',
                textAlign: 'center',
                fontSize: '13.5px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 -2px 10px rgba(0,0,0,0.2)',
              }}
            >
              You can't send messages to this group because you're no longer a participant.
            </div>
          ) : (
            <ChatInput handleSendMsg={handleSendMsg} />
          )}
        </div>

        {showInfoDrawer && (
          <ChatInfoDrawer
            chat={currentChat}
            currentUser={currentUser}
            contacts={contacts}
            onClose={() => setShowInfoDrawer(false)}
            onOpenDirectChat={(member) => {
              setShowInfoDrawer(false);
              if (onOpenDirectChat) {
                onOpenDirectChat(member);
              }
            }}
            onStartCall={onStartCall}
            onAddMembersToGroup={onAddMembersToGroup}
            onRemoveMemberFromGroup={onRemoveMemberFromGroup}
            onMakeAdmin={onMakeAdminInGroup}
            onDismissAdmin={onDismissAdminInGroup}
            onUpdateGroupAvatar={onUpdateGroupAvatar}
            onLeaveGroup={onLeaveGroup}
            onDeleteGroup={onDeleteGroup}
          />
        )}

        {/* In-App Error Popup Modal */}
        {errorPopup && (
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
            onClick={() => setErrorPopup(null)}
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
                  {errorPopup.title || 'Notice'}
                </h3>
              </div>

              <p style={{ margin: 0, color: '#8696a0', fontSize: '13.5px', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                {errorPopup.message}
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setErrorPopup(null)}
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
    )}
  </>
);
}
