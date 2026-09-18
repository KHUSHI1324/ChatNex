import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import ChatInput from "./ChatInput";
import ChatInfoDrawer from "./ChatInfoDrawer";
import CallIcon from '@mui/icons-material/Call';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import FindInPageIcon from '@mui/icons-material/FindInPage';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import ReplyIcon from '@mui/icons-material/Reply';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import TranslateIcon from '@mui/icons-material/Translate';
import DownloadIcon from '@mui/icons-material/Download';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ForwardIcon from '@mui/icons-material/Forward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import VoiceAudioPlayer from "./VoiceAudioPlayer";
import { LANGUAGES_LIST } from "../utils/languageList";
import { CHATNEX_AI_BOT_ID, CHATNEX_AI_BOT, AI_STARTER_PROMPTS } from "../utils/aiBotHelper";
import ReactMarkdown from "react-markdown";
import {
  sendMessageRoute,
  getAllMessagesRoute,
  imageapi,
  reactMessageRoute,
  editMessageRoute,
  deleteMessageRoute,
  pinMessageRoute,
  starMessageRoute,
  aiChatRoute,
  aiImagineRoute,
  aiTranslateRoute,
  getAISessionsRoute,
  deleteAISessionRoute,
  unblockUserRoute,
  host,
} from "../utils/APIRoutes";
import { getAvatarSrc } from "../utils/avatarHelper";
import { v4 as uuidv4 } from "uuid";

export default function ChatContainer({
  currentChat,
  currentUser,
  contacts = [],
  socket,
  onlineUsers: propOnlineUsers,
  arrivalMessage,
  onMessageSent,
  onStartCall,
  onOpenDirectChat,
  onAddMembersToGroup,
  onRemoveMemberFromGroup,
  onMakeAdminInGroup,
  onDismissAdminInGroup,
  onUpdateGroupAvatar,
  onUpdateGroupDetails,
  onCreateSimilarGroup,
  onLeaveGroup,
  onDeleteGroup,
  onUpdateCurrentUser,
  onBackToChats,
  showToast,
}) {
  const [messages, setMessages] = useState([]);
  const [localOnlineUsers, setLocalOnlineUsers] = useState(new Set());
  const activeOnlineUsers = propOnlineUsers || localOnlineUsers;
  const [hoveredMessageIndex, setHoveredMessageIndex] = useState(null);
  const [showSearchInputBar, setShowSearchInputBar] = useState(false); // State to track search input bar visibility
  const [showInfoDrawer, setShowInfoDrawer] = useState(false); // State to toggle WhatsApp-style info drawer
  const [replyingTo, setReplyingTo] = useState(null); // { messageId, text, senderName, senderId, fileType, imgpath }
  const [editingMessage, setEditingMessage] = useState(null); // { _id, message, ... }
  const [deleteModalMessage, setDeleteModalMessage] = useState(null); // message to delete
  const [forwardModalMessage, setForwardModalMessage] = useState(null); // message to forward
  const [selectedForwardRecipients, setSelectedForwardRecipients] = useState([]); // recipient IDs
  const [forwardSearchQuery, setForwardSearchQuery] = useState("");
  const [isForwarding, setIsForwarding] = useState(false);
  const [currentSearchMatchIndex, setCurrentSearchMatchIndex] = useState(0);
  const [activeSearchMsgId, setActiveSearchMsgId] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Set()); // Users currently typing
  const scrollRef = useRef();
  const messagesEndRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState(""); // State to track the search term
  const [searchDate, setSearchDate] = useState(""); // State to track search date filter
  const [errorPopup, setErrorPopup] = useState(null); // { title, message }
  const [translations, setTranslations] = useState({}); // { [msgId]: { translatedText, targetLangName, isVisible, loading } }
  const [activeTranslateMsgId, setActiveTranslateMsgId] = useState(null);
  const [langSearchQuery, setLangSearchQuery] = useState("");
  const [aiSessionId, setAiSessionId] = useState(null);
  const [aiSessions, setAiSessions] = useState([]);
  const [showAiHistoryDrawer, setShowAiHistoryDrawer] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [loadingAiSessions, setLoadingAiSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [activeWallpaper, setActiveWallpaper] = useState(
    localStorage.getItem(`chatnex_wallpaper_${currentUser?._id}`) || 'default'
  );

  useEffect(() => {
    const handleWpChange = () => {
      setActiveWallpaper(localStorage.getItem(`chatnex_wallpaper_${currentUser?._id}`) || 'default');
    };
    window.addEventListener('chatnex_wallpaper_changed', handleWpChange);
    return () => window.removeEventListener('chatnex_wallpaper_changed', handleWpChange);
  }, [currentUser?._id]);

  const fetchAiSessions = async () => {
    if (!currentUser?._id) return [];
    try {
      setLoadingAiSessions(true);
      const res = await axios.post(getAISessionsRoute, { userId: currentUser._id });
      if (res.data?.status && Array.isArray(res.data.sessions)) {
        setAiSessions(res.data.sessions);
        return res.data.sessions;
      }
    } catch (err) {
      console.error("Error fetching AI sessions:", err);
    } finally {
      setLoadingAiSessions(false);
    }
    return [];
  };

  const handleNewAiChat = () => {
    const newSid = `session_${Date.now()}`;
    setAiSessionId(newSid);
    setMessages([]);
    setShowAiHistoryDrawer(false);
  };

  const handleSelectAiSession = (sid) => {
    setAiSessionId(sid);
    setShowAiHistoryDrawer(false);
  };

  const handleDeleteAiSession = async (sid, e) => {
    if (e) e.stopPropagation();
    try {
      await axios.post(deleteAISessionRoute, { userId: currentUser._id, sessionId: sid });
      setAiSessions((prev) => prev.filter((s) => s.sessionId !== sid));
      if (aiSessionId === sid || (sid === "default" && (!aiSessionId || aiSessionId === "default"))) {
        handleNewAiChat();
      }
    } catch (err) {
      console.error("Error deleting AI session:", err);
    }
  };

  const filteredAiSessions = aiSessions.filter((s) => {
    if (!historySearchQuery.trim()) return true;
    const q = historySearchQuery.toLowerCase();
    return (
      (s.title && s.title.toLowerCase().includes(q)) ||
      (s.lastMessage && s.lastMessage.toLowerCase().includes(q)) ||
      (s.firstPrompt && s.firstPrompt.toLowerCase().includes(q))
    );
  });

  const handleTranslateMessage = async (msgId, text, langCode, langName) => {
    if (!text || !msgId) return;
    setActiveTranslateMsgId(null);
    setLangSearchQuery("");
    setTranslations((prev) => ({
      ...prev,
      [msgId]: { ...(prev[msgId] || {}), loading: true, isVisible: true, targetLangName: langName },
    }));

    try {
      const response = await axios.post(aiTranslateRoute, {
        text,
        targetLanguage: langCode,
        targetLangName: langName,
      });

      if (response.data && response.data.translatedText) {
        setTranslations((prev) => ({
          ...prev,
          [msgId]: {
            translatedText: response.data.translatedText,
            targetLangName: langName || response.data.targetLangName,
            isVisible: true,
            loading: false,
          },
        }));
      }
    } catch (err) {
      console.error("Translation error:", err);
      setTranslations((prev) => ({
        ...prev,
        [msgId]: {
          translatedText: text,
          targetLangName: langName,
          isVisible: true,
          loading: false,
        },
      }));
    }
  };

  const handleToggleTranslation = (msgId) => {
    setTranslations((prev) => {
      if (!prev[msgId]) return prev;
      return {
        ...prev,
        [msgId]: { ...prev[msgId], isVisible: !prev[msgId].isVisible },
      };
    });
  };

  const handleDownloadImage = async (imgUrl, filename) => {
    try {
      const response = await fetch(imgUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename || `chatnex-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      console.warn("Direct blob download failed, falling back to window.open:", err);
      window.open(imgUrl, "_blank");
    }
  };

  useEffect(() => {
    if (arrivalMessage) {
      setMessages((prev) => {
        if (arrivalMessage._id && prev.some((m) => m._id === arrivalMessage._id)) {
          return prev;
        }
        return [...prev, arrivalMessage];
      });
    }
  }, [arrivalMessage]);

  // Dismiss Translate Popover on Outside Click
  useEffect(() => {
    if (!activeTranslateMsgId) return;

    const handleOutsideClick = (e) => {
      if (
        !e.target.closest('.translate-popover') &&
        !e.target.closest('.translate-trigger-btn')
      ) {
        setActiveTranslateMsgId(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [activeTranslateMsgId]);

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

  // In-Chat Search Matching Messages List
  const matchingMessages = React.useMemo(() => {
    if (!searchTerm.trim() && !searchDate) return [];
    return messages.filter((msg) => {
      if (searchDate) {
        const rawTime = msg.timestamp || msg.createdAt;
        if (rawTime) {
          const msgDate = new Date(rawTime).toISOString().slice(0, 10);
          if (msgDate !== searchDate) return false;
        }
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const textMatch = msg.message && typeof msg.message === 'string' && msg.message.toLowerCase().includes(q);
        const senderMatch = msg.senderName && msg.senderName.toLowerCase().includes(q);
        const fileMatch = Array.isArray(msg.files) && msg.files.some(f => (f.filename || '').toLowerCase().includes(q));
        if (!textMatch && !senderMatch && !fileMatch) return false;
      }
      return true;
    });
  }, [messages, searchTerm, searchDate]);

  const scrollToSearchMatch = (msgId) => {
    setActiveSearchMsgId(msgId);
    const el = document.getElementById(`msg_${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  useEffect(() => {
    if (searchTerm.trim() && matchingMessages.length > 0) {
      const target = matchingMessages[currentSearchMatchIndex] || matchingMessages[0];
      if (target && target._id) {
        scrollToSearchMatch(target._id);
      }
    } else if (!searchTerm.trim() && !searchDate) {
      setActiveSearchMsgId(null);
    }
  }, [searchTerm, searchDate, currentSearchMatchIndex, matchingMessages]);

  const handleNextSearchMatch = () => {
    if (matchingMessages.length === 0) return;
    const nextIdx = (currentSearchMatchIndex + 1) % matchingMessages.length;
    setCurrentSearchMatchIndex(nextIdx);
    scrollToSearchMatch(matchingMessages[nextIdx]._id);
  };

  const handlePrevSearchMatch = () => {
    if (matchingMessages.length === 0) return;
    const prevIdx = (currentSearchMatchIndex - 1 + matchingMessages.length) % matchingMessages.length;
    setCurrentSearchMatchIndex(prevIdx);
    scrollToSearchMatch(matchingMessages[prevIdx]._id);
  };

  // Forward Message Execution Handler
  const handleExecuteForward = async () => {
    if (!forwardModalMessage || selectedForwardRecipients.length === 0 || isForwarding) return;
    setIsForwarding(true);

    const fwdText = forwardModalMessage.message || "";
    const fwdFiles = forwardModalMessage.files || [];
    const fwdImgpath = forwardModalMessage.imgpath || "";
    const timestamp = new Date().toISOString();

    try {
      for (const targetId of selectedForwardRecipients) {
        const targetContact = contacts.find((c) => (c._id || c).toString() === targetId.toString());
        const isGroup = Boolean(targetContact?.isGroup);
        const memberIds = isGroup && Array.isArray(targetContact?.members)
          ? targetContact.members.map((m) => (m._id || m).toString())
          : [currentUser._id, targetId];

        const payload = {
          from: currentUser._id,
          to: targetId,
          message: fwdText,
          files: fwdFiles,
          imgpath: fwdImgpath,
          isGroup: isGroup,
          groupId: isGroup ? targetId : null,
          voiceTranscript: forwardModalMessage.voiceTranscript || "",
        };

        const res = await axios.post(sendMessageRoute, payload);
        const savedId = res.data?.data?._id || uuidv4();

        // Broadcast socket event
        if (socket?.current) {
          socket.current.emit("send-msg", {
            _id: savedId,
            from: currentUser._id,
            to: targetId,
            message: fwdText,
            files: fwdFiles,
            imgpath: fwdImgpath,
            isGroup: isGroup,
            groupId: isGroup ? targetId : null,
            members: memberIds,
            senderName: currentUser.username,
            senderAvatar: currentUser.avtarImage,
            groupName: isGroup ? (targetContact.name || targetContact.username) : null,
          });
        }

        if (onMessageSent) {
          onMessageSent(targetId, fwdText, fwdImgpath, currentUser._id, timestamp, fwdFiles);
        }

        // If forwarding to current open chat, append to local messages state
        if (currentChat && currentChat._id?.toString() === targetId.toString()) {
          setMessages((prev) => [
            ...prev,
            {
              _id: savedId,
              fromSelf: true,
              message: fwdText,
              files: fwdFiles,
              imgpath: fwdImgpath,
              reactions: [],
              isEdited: false,
              isDeleted: false,
              isPinned: false,
              read: false,
              timestamp,
              senderName: currentUser.username,
              isGroup: isGroup,
            },
          ]);
        }
      }

      showToast?.('success', 'Message Forwarded', `Forwarded to ${selectedForwardRecipients.length} chat(s)`);
      setForwardModalMessage(null);
      setSelectedForwardRecipients([]);
      setForwardSearchQuery("");
    } catch (err) {
      console.error("Error forwarding message:", err);
      showToast?.('error', 'Forward Failed', 'Failed to forward message. Please try again.');
    } finally {
      setIsForwarding(false);
    }
  };

  const isGroupChat = Boolean(currentChat?.isGroup);
  const isAiChat = currentChat?._id === CHATNEX_AI_BOT_ID || Boolean(currentChat?.isAiBot);
  const isCurrentMember = isGroupChat ? (
    (currentChat.members || []).some(
      (m) => (m._id || m).toString() === (currentUser?._id || '').toString()
    ) ||
    (currentChat.admin?._id || currentChat.admin || '').toString() === (currentUser?._id || '').toString() ||
    (Array.isArray(currentChat.admins) &&
      currentChat.admins.some((a) => (a?._id || a || '').toString() === (currentUser?._id || '').toString()))
  ) : true;

  const [isContactBlockedByThem, setIsContactBlockedByThem] = useState(false);

  const isContactBlockedByMe = !isGroupChat && !isAiChat && Boolean(
    currentUser?.blockedUsers?.some(
      (b) => (b._id || b).toString() === (currentChat?._id || '').toString()
    )
  );

  useEffect(() => {
    setIsContactBlockedByThem(false);
  }, [currentChat?._id]);

  useEffect(() => {
    if (socket?.current) {
      const handleContactBlockUpdate = (data) => {
        if (data && data.blockerId?.toString() === (currentChat?._id || '').toString()) {
          setIsContactBlockedByThem(Boolean(data.isBlocked));
          if (data.isBlocked) {
            showToast?.('warning', 'Notice', `${currentChat.username || 'User'} has blocked you.`);
          } else {
            showToast?.('info', 'Notice', `${currentChat.username || 'User'} has unblocked you.`);
          }
        }
      };
      socket.current.on("contact-blocked-update", handleContactBlockUpdate);
      return () => {
        socket.current.off("contact-blocked-update", handleContactBlockUpdate);
      };
    }
  }, [socket, currentChat?._id, currentChat?.username, showToast]);

  const handleUnblockCurrentChat = async () => {
    if (!currentUser?._id || !currentChat?._id) return;
    try {
      const res = await axios.post(unblockUserRoute, {
        userId: currentUser._id,
        targetUserId: currentChat._id,
      });
      if (res.data?.status) {
        const updatedUser = {
          ...currentUser,
          blockedUsers: res.data.blockedUsers || [],
        };
        if (onUpdateCurrentUser) {
          onUpdateCurrentUser(updatedUser);
        }
        localStorage.setItem('chat-app-user', JSON.stringify(updatedUser));
        if (socket?.current) {
          socket.current.emit("user-unblocked", {
            userId: currentUser._id,
            targetUserId: currentChat._id,
          });
        }
        showToast?.('success', 'User Unblocked', `${currentChat.username || 'Contact'} has been unblocked.`);
      }
    } catch (err) {
      console.error('Error unblocking user:', err);
      showToast?.('error', 'Error', 'Failed to unblock user.');
    }
  };

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

  // Real-time Socket Event Listeners for Phase 2
  useEffect(() => {
    if (socket?.current) {
      const handleOnlineUsersList = (list) => {
        if (Array.isArray(list)) {
          setLocalOnlineUsers(new Set(list.map((id) => id.toString())));
        }
      };

      const handleUserStatus = (arg1, arg2) => {
        let uid, stat;
        if (typeof arg1 === 'object' && arg1 !== null) {
          uid = arg1.userId?.toString();
          stat = Boolean(arg1.status);
        } else {
          uid = arg1?.toString();
          stat = Boolean(arg2);
        }
        if (!uid) return;

        setLocalOnlineUsers((prev) => {
          const nextSet = new Set(prev);
          if (stat) {
            nextSet.add(uid);
          } else {
            nextSet.delete(uid);
          }
          return nextSet;
        });
      };

      const handleUserTyping = (data) => {
        const { from, groupId, username } = data || {};
        if (isGroupChat ? groupId === currentChat?._id : from === currentChat?._id) {
          setTypingUsers((prev) => new Set(prev).add(username || "Someone"));
        }
      };

      const handleUserStopTyping = (data) => {
        const { from, groupId } = data || {};
        if (isGroupChat ? groupId === currentChat?._id : from === currentChat?._id) {
          setTypingUsers(new Set());
        }
      };

      const handleMsgReactionUpdate = (data) => {
        const { messageId, reactions } = data || {};
        if (messageId) {
          setMessages((prev) =>
            prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
          );
        }
      };

      const handleMsgEditedUpdate = (data) => {
        const { messageId, newText } = data || {};
        if (messageId) {
          setMessages((prev) =>
            prev.map((m) =>
              m._id === messageId
                ? { ...m, message: newText, isEdited: true }
                : m
            )
          );
        }
      };

      const handleMsgDeletedUpdate = (data) => {
        const { messageId } = data || {};
        if (messageId) {
          setMessages((prev) =>
            prev.map((m) =>
              m._id === messageId
                ? {
                    ...m,
                    isDeleted: true,
                    message: "🚫 This message was deleted",
                    files: [],
                    imgpath: "",
                  }
                : m
            )
          );
        }
      };

      const handleMsgPinnedUpdate = (data) => {
        const { messageId, isPinned, pinnedAt, pinnedByName } = data || {};
        if (messageId) {
          setMessages((prev) =>
            prev.map((m) =>
              m._id === messageId
                ? { ...m, isPinned, pinnedAt, pinnedByName }
                : m
            )
          );
        }
      };

      socket.current.on("online-users-list", handleOnlineUsersList);
      socket.current.on("user-status", handleUserStatus);
      socket.current.on("user-typing", handleUserTyping);
      socket.current.on("user-stop-typing", handleUserStopTyping);
      socket.current.on("msg-reaction-update", handleMsgReactionUpdate);
      socket.current.on("msg-edited-update", handleMsgEditedUpdate);
      socket.current.on("msg-deleted-update", handleMsgDeletedUpdate);
      socket.current.on("msg-pinned-update", handleMsgPinnedUpdate);

      return () => {
        socket.current.off("online-users-list", handleOnlineUsersList);
        socket.current.off("user-status", handleUserStatus);
        socket.current.off("user-typing", handleUserTyping);
        socket.current.off("user-stop-typing", handleUserStopTyping);
        socket.current.off("msg-reaction-update", handleMsgReactionUpdate);
        socket.current.off("msg-edited-update", handleMsgEditedUpdate);
        socket.current.off("msg-deleted-update", handleMsgDeletedUpdate);
        socket.current.off("msg-pinned-update", handleMsgPinnedUpdate);
      };
    }
  }, [socket, currentChat, isGroupChat]);


  useEffect(() => {
    async function fetchData() {
      if (currentChat?._id && currentUser?._id) {
        setLoadingMessages(true);
        try {
          if (isAiChat) {
            const sessions = await fetchAiSessions();
            let targetSessionId = aiSessionId;

            if (!targetSessionId && sessions && sessions.length > 0) {
              targetSessionId = sessions[0].sessionId;
              setAiSessionId(targetSessionId);
            }

            const response = await axios.post(getAllMessagesRoute, {
              from: currentUser._id,
              to: currentChat._id,
              sessionId: targetSessionId || null,
            });
            setMessages(response.data);
          } else {
            const response = await axios.post(getAllMessagesRoute, {
              from: currentUser._id,
              to: currentChat._id,
              isGroup: Boolean(currentChat.isGroup),
              groupId: currentChat.isGroup ? currentChat._id : null,
            });
            setMessages(response.data);
          }
        } catch (err) {
          console.error("Error fetching messages:", err);
          if (showToast) {
            showToast("error", "Error Loading Messages", "Could not load chat messages from server.");
          }
        } finally {
          setLoadingMessages(false);
        }
      }
    }
    fetchData();
  }, [currentChat?._id, currentUser?._id, aiSessionId]);

  const handleSendMsg = async (msg, attachedFiles, replyData) => {
    if (!currentUser || !currentUser._id) {
      return;
    }

    const filesList = Array.isArray(attachedFiles) ? attachedFiles : (attachedFiles ? [attachedFiles] : []);
    const isGroupChat = Boolean(currentChat.isGroup);
    const memberIds = isGroupChat && currentChat.members
      ? currentChat.members.map((m) => (m._id || m).toString())
      : [currentUser._id, currentChat._id];

    const activeReply = replyData || replyingTo || null;

    if (filesList.length > 0) {
      setIsUploadingMedia(true);
      const formData = new FormData();
      filesList.forEach((file) => {
        formData.append("files", file);
      });
      formData.append("from", currentUser._id);
      formData.append("to", currentChat._id);
      formData.append("message", msg || "");
      if (activeReply) {
        formData.append("replyTo", JSON.stringify(activeReply));
      }
      if (isGroupChat) {
        formData.append("isGroup", "true");
        formData.append("groupId", currentChat._id);
      }
      const voiceTranscript = filesList.find(f => f.voiceTranscript)?.voiceTranscript || "";
      if (voiceTranscript) {
        formData.append("voiceTranscript", voiceTranscript);
      }

      try {
        const { data } = await axios.post(imageapi, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (data?.blocked || data?.status === false) {
          showToast?.('warning', 'Message Not Sent', data?.msg || 'Cannot send media. Contact is blocked.');
          return;
        }

        const imgpath = data.imgpath || data.finaldata?.message?.imgpath;
        const uploadedFiles = data.files || data.finaldata?.message?.files || [];
        const timestamp = new Date().toISOString();
        const savedId = data.finaldata?._id || uuidv4();

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
            _id: savedId,
            from: currentUser._id,
            to: currentChat._id,
            message: msg || defaultPreview,
            imgpath: imgpath,
            files: uploadedFiles,
            voiceTranscript: voiceTranscript || data.voiceTranscript || "",
            replyTo: activeReply,
            isGroup: isGroupChat,
            groupId: isGroupChat ? currentChat._id : null,
            members: memberIds,
            senderName: currentUser.username,
            senderAvatar: currentUser.avtarImage,
            groupName: currentChat.name || currentChat.username,
          });
        }

        const newMessage = {
          _id: savedId,
          fromSelf: true,
          message: msg,
          imgpath: imgpath,
          files: uploadedFiles,
          voiceTranscript: voiceTranscript || data.voiceTranscript || "",
          replyTo: activeReply,
          reactions: [],
          isEdited: false,
          isDeleted: false,
          isPinned: false,
          read: false,
          timestamp,
          senderName: currentUser.username,
          isGroup: isGroupChat,
        };
        setMessages((prev) => {
          const nextList = [...prev, newMessage];
          if (data.aiReply) {
            nextList.push(data.aiReply);
          }
          return nextList;
        });
        setReplyingTo(null);
      } catch (err) {
        console.error("Error uploading media message:", err);
        const errMsg = err.response?.data?.error || err.message || "Failed to upload files";
        setErrorPopup({
          title: "Upload Failed",
          message: `Upload failed: ${errMsg}.\nPlease make sure the backend server ('node index.js') is running.`,
        });
      } finally {
        setIsUploadingMedia(false);
      }
    } else {
      // 1-on-1 Dedicated AI Assistant Chat Handler
      if (isAiChat) {
        const isImagine = /^\/(imagine|generate|draw|art)\s+/i.test(msg);
        const thinkingId = `ai-bot-thinking-${Date.now()}`;
        const userMsgId = uuidv4();
        const timestamp = new Date().toISOString();
        const activeSid = aiSessionId || `session_${Date.now()}`;
        if (!aiSessionId) {
          setAiSessionId(activeSid);
        }

        const userMessage = {
          _id: userMsgId,
          fromSelf: true,
          message: msg,
          replyTo: activeReply,
          reactions: [],
          isEdited: false,
          isDeleted: false,
          isPinned: false,
          read: true,
          timestamp,
          senderName: currentUser.username,
          isGroup: false,
          sessionId: activeSid,
        };

        const thinkingMessage = {
          _id: thinkingId,
          fromSelf: false,
          senderName: "ChatNex AI",
          senderAvatar: CHATNEX_AI_BOT.avtarImage,
          isAi: true,
          isAiThinking: !isImagine,
          isAiImagineLoading: isImagine,
          imaginePrompt: isImagine ? msg.replace(/^\/(imagine|generate|draw|art)\s*/i, "") : "",
          timestamp: new Date().toISOString(),
          isGroup: false,
          sessionId: activeSid,
        };

        setMessages((prev) => [...prev, userMessage, thinkingMessage]);
        setReplyingTo(null);

        try {
          const res = await axios.post(sendMessageRoute, {
            from: currentUser._id,
            to: "chatnex_ai_bot",
            message: msg,
            replyTo: activeReply,
            isGroup: false,
            sessionId: activeSid,
          });

          if (res.data?.aiReply) {
            setMessages((prev) =>
              prev
                .map((m) => (m._id === userMsgId && res.data.data?._id ? { ...m, _id: res.data.data._id } : m))
                .filter((m) => m._id !== thinkingId)
                .concat(res.data.aiReply)
            );

            // Refresh AI sessions list
            fetchAiSessions();

            if (onMessageSent) {
              onMessageSent(
                currentChat._id,
                res.data.aiReply.message || msg,
                res.data.aiReply.imgpath || null,
                currentUser._id,
                new Date().toISOString(),
                res.data.aiReply.files || []
              );
            }
          } else {
            setMessages((prev) => prev.filter((m) => m._id !== thinkingId));
          }
        } catch (err) {
          console.error("Error messaging ChatNex AI bot:", err);
          setMessages((prev) => prev.filter((m) => m._id !== thinkingId));
        }
        return;
      }

      const res = await axios.post(sendMessageRoute, {
        from: currentUser._id,
        to: currentChat._id,
        message: msg,
        replyTo: activeReply,
        isGroup: isGroupChat,
        groupId: isGroupChat ? currentChat._id : null,
      });

      if (res.data?.blocked || res.data?.status === false) {
        showToast?.('warning', 'Message Not Sent', res.data?.msg || 'Cannot send message. Contact is blocked.');
        return;
      }

      const savedId = res.data?.data?._id || uuidv4();
      const timestamp = new Date().toISOString();

      // Immediately update sender's own sidebar preview & top-ranking
      if (onMessageSent) {
        onMessageSent(currentChat._id, msg, null, currentUser._id, timestamp, []);
      }

      if (socket?.current) {
        socket.current.emit("send-msg", {
          _id: savedId,
          from: currentUser._id,
          to: currentChat._id,
          message: msg,
          files: [],
          replyTo: activeReply,
          isGroup: isGroupChat,
          groupId: isGroupChat ? currentChat._id : null,
          members: memberIds,
          senderName: currentUser.username,
          senderAvatar: currentUser.avtarImage,
          groupName: currentChat.name || currentChat.username,
        });
      }
      const newMessage = {
        _id: savedId,
        fromSelf: true,
        message: msg,
        replyTo: activeReply,
        reactions: [],
        isEdited: false,
        isDeleted: false,
        isPinned: false,
        read: false,
        timestamp,
        senderName: currentUser.username,
        isGroup: isGroupChat,
      };
      setMessages((prev) => [...prev, newMessage]);
      setReplyingTo(null);

      // Check for @ai Assistant trigger
      if (msg.trim().match(/^@ai\b/i)) {
        const thinkingId = `ai-thinking-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            _id: thinkingId,
            fromSelf: false,
            senderName: "ChatNex AI",
            senderAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=chatnex-ai-bot",
            isAi: true,
            isAiThinking: true,
            timestamp: new Date().toISOString(),
            isGroup: isGroupChat,
          },
        ]);

        (async () => {
          try {
            const aiRes = await axios.post(aiChatRoute, {
              prompt: msg.trim(),
              username: currentUser.username,
            });
            const aiReplyText = aiRes.data?.text || "I am here to help!";

            const aiSaveRes = await axios.post(sendMessageRoute, {
              from: currentUser._id,
              to: currentChat._id,
              message: aiReplyText,
              isGroup: isGroupChat,
              groupId: isGroupChat ? currentChat._id : null,
            });

            const aiMsgId = aiSaveRes.data?.data?._id || uuidv4();
            const aiTime = new Date().toISOString();

            if (socket?.current) {
              socket.current.emit("send-msg", {
                _id: aiMsgId,
                from: currentUser._id,
                to: currentChat._id,
                message: aiReplyText,
                files: [],
                isAi: true,
                senderName: "ChatNex AI",
                senderAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=chatnex-ai-bot",
                isGroup: isGroupChat,
                groupId: isGroupChat ? currentChat._id : null,
                members: memberIds,
                groupName: currentChat.name || currentChat.username,
              });
            }

            if (onMessageSent) {
              onMessageSent(currentChat._id, aiReplyText, null, currentUser._id, aiTime, []);
            }

            setMessages((prev) =>
              prev.filter((m) => m._id !== thinkingId).concat({
                _id: aiMsgId,
                fromSelf: false,
                message: aiReplyText,
                senderName: "ChatNex AI",
                senderAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=chatnex-ai-bot",
                isAi: true,
                reactions: [],
                isEdited: false,
                isDeleted: false,
                isPinned: false,
                read: true,
                timestamp: aiTime,
                isGroup: isGroupChat,
              })
            );
          } catch (aiErr) {
            console.error("Error executing @ai in chat:", aiErr);
            setMessages((prev) => prev.filter((m) => m._id !== thinkingId));
          }
        })();
      }

      // Check for /imagine image generation trigger
      if (msg.trim().match(/^\/(imagine|generate|draw|art)\b/i)) {
        const imagineLoadingId = `ai-imagine-${Date.now()}`;
        const cleanPrompt = msg.trim().replace(/^\/(imagine|generate|draw|art)\s*/i, "");
        setMessages((prev) => [
          ...prev,
          {
            _id: imagineLoadingId,
            fromSelf: false,
            senderName: "ChatNex AI",
            senderAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=chatnex-ai-bot",
            isAi: true,
            isAiImagineLoading: true,
            imaginePrompt: cleanPrompt,
            timestamp: new Date().toISOString(),
            isGroup: isGroupChat,
          },
        ]);

        (async () => {
          try {
            const imgRes = await axios.post(aiImagineRoute, {
              prompt: cleanPrompt,
            });
            const generatedUrl = imgRes.data?.imageUrl;
            const promptUsed = imgRes.data?.prompt || cleanPrompt;

            const imgSaveRes = await axios.post(sendMessageRoute, {
              from: currentUser._id,
              to: currentChat._id,
              message: `🎨 ${promptUsed}`,
              imgpath: generatedUrl,
              isGroup: isGroupChat,
              groupId: isGroupChat ? currentChat._id : null,
            });

            const imgMsgId = imgSaveRes.data?.data?._id || uuidv4();
            const imgTime = new Date().toISOString();
            const generatedFiles = [{ url: generatedUrl, filename: `ai-image-${Date.now()}.jpg`, fileType: "image" }];

            if (socket?.current) {
              socket.current.emit("send-msg", {
                _id: imgMsgId,
                from: currentUser._id,
                to: currentChat._id,
                message: `🎨 ${promptUsed}`,
                imgpath: generatedUrl,
                files: generatedFiles,
                isAi: true,
                isAiGenerated: true,
                senderName: "ChatNex AI",
                senderAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=chatnex-ai-bot",
                isGroup: isGroupChat,
                groupId: isGroupChat ? currentChat._id : null,
                members: memberIds,
                groupName: currentChat.name || currentChat.username,
              });
            }

            if (onMessageSent) {
              onMessageSent(currentChat._id, `🎨 ${promptUsed}`, null, currentUser._id, imgTime, generatedFiles);
            }

            setMessages((prev) =>
              prev.filter((m) => m._id !== imagineLoadingId).concat({
                _id: imgMsgId,
                fromSelf: false,
                message: `🎨 ${promptUsed}`,
                imgpath: generatedUrl,
                files: generatedFiles,
                senderName: "ChatNex AI",
                senderAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=chatnex-ai-bot",
                isAi: true,
                isAiGenerated: true,
                reactions: [],
                isEdited: false,
                isDeleted: false,
                isPinned: false,
                read: true,
                timestamp: imgTime,
                isGroup: isGroupChat,
              })
            );
          } catch (imgErr) {
            console.error("Error generating AI image:", imgErr);
            setMessages((prev) => prev.filter((m) => m._id !== imagineLoadingId));
          }
        })();
      }
    }
  };

  // 1. Emoji Reaction Handler
  const handleReactToMessage = async (message, emoji) => {
    if (!message?._id || !currentUser?._id) return;
    try {
      const res = await axios.post(reactMessageRoute, {
        messageId: message._id,
        userId: currentUser._id,
        username: currentUser.username,
        emoji,
      });

      if (res.data?.status && res.data.reactions) {
        const updatedReactions = res.data.reactions;
        setMessages((prev) =>
          prev.map((m) => (m._id === message._id ? { ...m, reactions: updatedReactions } : m))
        );

        if (socket?.current) {
          const memberIds = isGroupChat && currentChat.members
            ? currentChat.members.map((m) => (m._id || m).toString())
            : [currentUser._id, currentChat._id];

          socket.current.emit("react-msg", {
            messageId: message._id,
            reactions: updatedReactions,
            from: currentUser._id,
            to: currentChat._id,
            isGroup: isGroupChat,
            targetMemberIds: memberIds,
          });
        }
      }
    } catch (err) {
      console.error("Error reacting to message:", err);
    }
  };

  // 2. Reply to Message
  const handleStartReply = (message) => {
    let previewText = message.message || "";
    let fileType = "";
    if (message.files && message.files.length > 0) {
      fileType = message.files[0].fileType || "file";
      if (!previewText) previewText = `📎 ${fileType.toUpperCase()}`;
    } else if (message.imgpath) {
      fileType = "image";
      if (!previewText) previewText = "📷 Photo";
    }

    setReplyingTo({
      messageId: message._id,
      text: previewText,
      senderName: message.senderName || (message.fromSelf ? "You" : currentChat.name || currentChat.username),
      senderId: message.senderId || "",
      fileType: fileType,
      imgpath: message.imgpath || "",
    });
    setEditingMessage(null);
  };

  // 3. Edit Message
  const handleStartEdit = (message) => {
    if (!message.fromSelf || message.isDeleted) return;
    setEditingMessage(message);
    setReplyingTo(null);
  };

  const handleSaveEdit = async (messageId, newText) => {
    if (!messageId || !newText?.trim() || !currentUser?._id) return;
    try {
      const res = await axios.put(editMessageRoute, {
        messageId,
        userId: currentUser._id,
        newText: newText.trim(),
      });

      if (res.data?.status) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId ? { ...m, message: newText.trim(), isEdited: true } : m
          )
        );
        setEditingMessage(null);

        if (socket?.current) {
          const memberIds = isGroupChat && currentChat.members
            ? currentChat.members.map((m) => (m._id || m).toString())
            : [currentUser._id, currentChat._id];

          socket.current.emit("edit-msg", {
            messageId,
            newText: newText.trim(),
            isEdited: true,
            from: currentUser._id,
            to: currentChat._id,
            isGroup: isGroupChat,
            targetMemberIds: memberIds,
          });
        }
      }
    } catch (err) {
      console.error("Error editing message:", err);
    }
  };

  // 4. Delete Message
  const handleOpenDeleteModal = (message) => {
    setDeleteModalMessage(message);
  };

  const handleConfirmDelete = async (deleteType) => {
    if (!deleteModalMessage?._id || !currentUser?._id) return;
    const msgId = deleteModalMessage._id;
    try {
      const res = await axios.post(deleteMessageRoute, {
        messageId: msgId,
        userId: currentUser._id,
        deleteType,
      });

      if (res.data?.status) {
        if (deleteType === "everyone") {
          setMessages((prev) =>
            prev.map((m) =>
              m._id === msgId
                ? { ...m, isDeleted: true, message: "🚫 This message was deleted", files: [], imgpath: "" }
                : m
            )
          );

          if (socket?.current) {
            const memberIds = isGroupChat && currentChat.members
              ? currentChat.members.map((m) => (m._id || m).toString())
              : [currentUser._id, currentChat._id];

            socket.current.emit("delete-msg", {
              messageId: msgId,
              from: currentUser._id,
              to: currentChat._id,
              isGroup: isGroupChat,
              targetMemberIds: memberIds,
            });
          }
        } else {
          // Delete for me
          setMessages((prev) => prev.filter((m) => m._id !== msgId));
        }
      }
    } catch (err) {
      console.error("Error deleting message:", err);
    } finally {
      setDeleteModalMessage(null);
    }
  };

  // 5. Pin / Unpin Message
  const handlePinMessage = async (message) => {
    if (!message?._id || !currentUser?._id) return;
    const nextPinnedState = !message.isPinned;
    try {
      const res = await axios.put(pinMessageRoute, {
        messageId: message._id,
        userId: currentUser._id,
        isPinned: nextPinnedState,
      });

      if (res.data?.status) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === message._id
              ? { ...m, isPinned: nextPinnedState, pinnedAt: res.data.pinnedAt, pinnedByName: currentUser.username }
              : m
          )
        );

        if (socket?.current) {
          const memberIds = isGroupChat && currentChat.members
            ? currentChat.members.map((m) => (m._id || m).toString())
            : [currentUser._id, currentChat._id];

          socket.current.emit("pin-msg", {
            messageId: message._id,
            isPinned: nextPinnedState,
            pinnedAt: res.data.pinnedAt,
            pinnedByName: currentUser.username,
            from: currentUser._id,
            to: currentChat._id,
            isGroup: isGroupChat,
            targetMemberIds: memberIds,
          });
        }
      }
    } catch (err) {
      console.error("Error pinning message:", err);
    }
  };

  // 6. Star / Unstar Message
  const handleStarMessage = async (message) => {
    if (!message?._id || !currentUser?._id) return;
    try {
      const res = await axios.put(starMessageRoute, {
        messageId: message._id,
        userId: currentUser._id,
      });

      if (res.data?.status) {
        const nextStarred = Boolean(res.data.isStarred);
        setMessages((prev) =>
          prev.map((m) => (m._id === message._id ? { ...m, isStarred: nextStarred } : m))
        );
      }
    } catch (err) {
      console.error("Error starring message:", err);
    }
  };

  const handleEmitTyping = () => {
    if (socket?.current && currentChat && currentUser) {
      const memberIds = isGroupChat && currentChat.members
        ? currentChat.members.map((m) => (m._id || m).toString())
        : [currentUser._id, currentChat._id];
      socket.current.emit("typing", {
        from: currentUser._id,
        to: currentChat._id,
        isGroup: isGroupChat,
        username: currentUser.username,
        targetMemberIds: memberIds,
      });
    }
  };

  const handleEmitStopTyping = () => {
    if (socket?.current && currentChat && currentUser) {
      const memberIds = isGroupChat && currentChat.members
        ? currentChat.members.map((m) => (m._id || m).toString())
        : [currentUser._id, currentChat._id];
      socket.current.emit("stop-typing", {
        from: currentUser._id,
        to: currentChat._id,
        isGroup: isGroupChat,
        targetMemberIds: memberIds,
      });
    }
  };

  const scrollToMessage = (messageId) => {
    const el = document.getElementById(`msg_${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.transition = 'background 0.3s ease';

      const originalBg = el.style.backgroundColor;
      el.style.backgroundColor = 'rgba(0, 168, 132, 0.25)';
      setTimeout(() => {
        el.style.backgroundColor = originalBg;
      }, 1200);
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

  const renderMessageContent = (message) => {
    if (!message || !message.message) return null;
    if (searchTerm && searchTerm.trim() !== "") {
      const regex = new RegExp(`(${searchTerm})`, "gi");
      const parts = message.message.split(regex);
      return parts.map((part, index) =>
        regex.test(part) ? <span className="highlight" key={index}>{part}</span> : part
      );
    }
    return (
      <ReactMarkdown
        components={{
          p: ({ node, children, ...props }) => <p style={{ margin: "0 0 4px 0", lineHeight: "1.4" }} {...props}>{children}</p>,
          strong: ({ node, children, ...props }) => <strong style={{ fontWeight: "700", color: "#ffffff" }} {...props}>{children}</strong>,
          b: ({ node, children, ...props }) => <strong style={{ fontWeight: "700", color: "#ffffff" }} {...props}>{children}</strong>,
          em: ({ node, children, ...props }) => <em style={{ fontStyle: "italic", color: "inherit" }} {...props}>{children}</em>,
          i: ({ node, children, ...props }) => <em style={{ fontStyle: "italic", color: "inherit" }} {...props}>{children}</em>,
          ul: ({ node, children, ...props }) => <ul style={{ margin: "4px 0 6px 0", paddingLeft: "18px" }} {...props}>{children}</ul>,
          ol: ({ node, children, ...props }) => <ol style={{ margin: "4px 0 6px 0", paddingLeft: "18px" }} {...props}>{children}</ol>,
          li: ({ node, children, ...props }) => <li style={{ marginBottom: "2px", lineHeight: "1.35" }} {...props}>{children}</li>,
          h1: ({ node, children, ...props }) => <h3 style={{ margin: "6px 0 4px 0", fontSize: "15px", color: "#00a884", fontWeight: "700" }} {...props}>{children}</h3>,
          h2: ({ node, children, ...props }) => <h4 style={{ margin: "6px 0 4px 0", fontSize: "14.5px", color: "#00a884", fontWeight: "700" }} {...props}>{children}</h4>,
          h3: ({ node, children, ...props }) => <h5 style={{ margin: "4px 0 2px 0", fontSize: "14px", color: "#00a884", fontWeight: "600" }} {...props}>{children}</h5>,
          code: ({ node, inline, className, children, ...props }) => (
            <code
              style={{
                backgroundColor: "rgba(0,0,0,0.35)",
                padding: "2px 5px",
                borderRadius: "4px",
                fontFamily: "Consolas, Monaco, monospace",
                fontSize: "12.5px",
                color: "#53bdeb",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              {...props}
            >
              {children}
            </code>
          ),
          pre: ({ node, children, ...props }) => (
            <pre
              style={{
                backgroundColor: "#111b21",
                borderRadius: "6px",
                padding: "8px 10px",
                margin: "6px 0",
                overflowX: "auto",
                border: "1px solid rgba(255,255,255,0.1)",
                fontFamily: "Consolas, Monaco, monospace",
                fontSize: "12px",
                color: "#e9edef",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
              {...props}
            >
              {children}
            </pre>
          ),
          blockquote: ({ node, children, ...props }) => (
            <blockquote
              style={{
                borderLeft: "3px solid #00a884",
                margin: "4px 0",
                padding: "3px 8px",
                backgroundColor: "rgba(0, 168, 132, 0.08)",
                borderRadius: "0 4px 4px 0",
                color: "#8696a0",
              }}
              {...props}
            >
              {children}
            </blockquote>
          ),
          a: ({ node, children, ...props }) => (
            <a
              style={{ color: "#53bdeb", textDecoration: "underline" }}
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
        }}
      >
        {message.message}
      </ReactMarkdown>
    );
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

  const renderAttachmentsSection = (messageFiles, message = {}) => {
    if (!messageFiles || messageFiles.length === 0) return null;

    const getFileUrl = (url) => {
      if (!url) return "";
      return url.startsWith("http://") || url.startsWith("https://") ? url : `${host}/${url}`;
    };

    const audios = messageFiles.filter(
      (f) =>
        f.fileType === "audio" ||
        (f.mimeType && f.mimeType.startsWith("audio/")) ||
        /\.(mp3|wav|ogg|m4a|aac|opus|weba)$/i.test(f.url || f.filename || "") ||
        (f.url && f.url.includes("voice-note-"))
    );
    const videos = messageFiles.filter(
      (f) =>
        !audios.includes(f) &&
        (f.fileType === "video" ||
          (f.mimeType && f.mimeType.startsWith("video/")) ||
          /\.(mp4|webm|mov|mkv|avi|ogg|m4v)$/i.test(f.url || f.filename || ""))
    );
    const gifs = messageFiles.filter(
      (f) => !audios.includes(f) && !videos.includes(f) && (f.fileType === "gif" || /\.(gif)$/i.test(f.url || f.filename || ""))
    );
    const images = messageFiles.filter(
      (f) =>
        !audios.includes(f) &&
        !videos.includes(f) &&
        !gifs.includes(f) &&
        (f.fileType === "image" ||
          (f.mimeType && f.mimeType.startsWith("image/")) ||
          /\.(png|jpe?g|webp|bmp|svg)$/i.test(f.url || f.filename || ""))
    );
    const docs = messageFiles.filter(
      (f) => !audios.includes(f) && !videos.includes(f) && !gifs.includes(f) && !images.includes(f)
    );

    return (
      <div className="message-attachments" style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "4px" }}>
        {/* Voice Notes & Audio Section */}
        {audios.map((aud, aIdx) => (
          <VoiceAudioPlayer
            key={`aud-${aIdx}`}
            audioUrl={getFileUrl(aud.url)}
            senderAvatar={message.senderAvatar || (message.fromSelf ? currentUser?.avtarImage : currentChat?.avtarImage)}
            senderName={message.senderName || (message.fromSelf ? "You" : currentChat?.name || currentChat?.username)}
            fromSelf={message.fromSelf}
            voiceTranscript={aud.voiceTranscript || message.voiceTranscript || ""}
          />
        ))}

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
              width: "100%",
              maxWidth: "320px",
              height: "240px",
              borderRadius: "8px",
              overflow: "hidden",
              cursor: "pointer",
              backgroundColor: "#1f2c34",
              position: "relative",
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
            {/* AI Generated Badge & 1-Click Download */}
            {(message.isAiGenerated || (images[0].url && images[0].url.includes("ai-gen")) || (images[0].url && images[0].url.includes("pollinations"))) && (
              <span
                style={{
                  position: "absolute",
                  top: "8px",
                  left: "8px",
                  background: "linear-gradient(135deg, rgba(0,168,132,0.95) 0%, rgba(0,210,255,0.95) 100%)",
                  color: "#111b21",
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  letterSpacing: "0.4px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  backdropFilter: "blur(4px)",
                }}
              >
                ✨ AI Generated
              </span>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadImage(getFileUrl(images[0].url), images[0].filename);
              }}
              title="Download image"
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                color: "#fff",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "50%",
                width: "30px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background-color 0.2s, transform 0.15s",
                boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(0, 168, 132, 0.95)";
                e.currentTarget.style.transform = "scale(1.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <DownloadIcon style={{ fontSize: "17px" }} />
            </button>
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
      trimmed === "🎙️ Voice message" ||
      trimmed === "🎙️ Audio" ||
      trimmed.startsWith("🎙️ Voice message") ||
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
      trimmed.toLowerCase().endsWith(".mp3") ||
      trimmed.toLowerCase().endsWith(".wav") ||
      trimmed.toLowerCase().endsWith(".ogg") ||
      trimmed.toLowerCase().endsWith(".m4a") ||
      /^📎 \d+ files?$/i.test(trimmed) ||
      /^📷 \d+ photos?/i.test(trimmed)
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

  const pinnedMessages = messages.filter((m) => m.isPinned && !m.isDeleted);
  const latestPinned = pinnedMessages.length > 0 ? pinnedMessages[pinnedMessages.length - 1] : null;

  const isGroup = Boolean(currentChat?.isGroup);
  const adminId = (currentChat?.admin?._id || currentChat?.admin || '').toString();
  const currentUserIdStr = (currentUser?._id || '').toString();
  const isCurrentUserAdmin =
    adminId === currentUserIdStr ||
    (Array.isArray(currentChat?.admins) &&
      currentChat.admins.some((a) => (a?._id || a || '').toString() === currentUserIdStr));

  return (
    <>
      {currentChat && (
        <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
          <div className="chat-container" style={{ flex: 1, minWidth: 0 }}>
            {/* Header */}
            <div className="chat-header">
              {onBackToChats && (
                <button
                  type="button"
                  className="mobile-back-btn"
                  onClick={onBackToChats}
                  title="Back to chats"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#00a884",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "4px",
                    marginRight: "4px",
                  }}
                >
                  <ArrowBackIcon style={{ fontSize: "22px" }} />
                </button>
              )}

              <div
                className="user-details"
                onClick={() => !isAiChat && setShowInfoDrawer(!showInfoDrawer)}
                style={{ cursor: isAiChat ? "default" : "pointer", display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}
                title={isAiChat ? "ChatNex AI Superpower Assistant" : "Click to view info & members"}
              >
                <div className="avtar" style={{ position: "relative", flexShrink: 0 }}>
                  <img
                    src={isAiChat ? CHATNEX_AI_BOT.avtarImage : getAvatarSrc(currentChat.avtarImage)}
                    alt="avtar"
                    style={
                      isAiChat
                        ? {
                            border: '2px solid #00a884',
                            borderRadius: '50%',
                            boxShadow: '0 0 10px rgba(0, 168, 132, 0.5)',
                          }
                        : {}
                    }
                  />
                  {isAiChat && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '0px',
                        right: '0px',
                        backgroundColor: '#00a884',
                        borderRadius: '50%',
                        width: '10px',
                        height: '10px',
                        border: '2px solid #111b21',
                        boxShadow: '0 0 6px rgba(0, 168, 132, 0.9)',
                      }}
                    />
                  )}
                </div>
                <div className="username" style={{ minWidth: 0 }}>
                  <h3 style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "8px" }}>
                    {isAiChat ? "ChatNex AI" : currentChat.name || currentChat.username}
                    {isAiChat && (
                      <span
                        style={{
                          background: 'linear-gradient(135deg, #00a884, #6366f1)',
                          color: '#fff',
                          borderRadius: '5px',
                          padding: '2px 7px',
                          fontSize: '10px',
                          fontWeight: '700',
                          letterSpacing: '0.4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <AutoAwesomeIcon style={{ fontSize: '11px' }} /> AI SUPERPOWER
                      </span>
                    )}
                  </h3>
                  {isAiChat ? (
                    <span style={{ color: "#00a884", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#00a884", display: "inline-block" }}></span>
                      Online • 24/7 AI Assistant • Ask anything or /imagine
                    </span>
                  ) : typingUsers.size > 0 ? (
                    <span style={{ color: "#00a884", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px", fontWeight: "500" }}>
                      <span>{Array.from(typingUsers).join(", ")} {typingUsers.size > 1 ? "are" : "is"} typing</span>
                      <span className="typing-indicator" style={{ background: "transparent", padding: 0 }}>
                        <span className="typing-dot" style={{ width: "4px", height: "4px" }}></span>
                        <span className="typing-dot" style={{ width: "4px", height: "4px" }}></span>
                        <span className="typing-dot" style={{ width: "4px", height: "4px" }}></span>
                      </span>
                    </span>
                  ) : currentChat.isGroup ? (
                    <span
                      style={{
                        color: "#8696a0",
                        fontSize: "12px",
                        maxWidth: "320px",
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
                      {(() => {
                        const members = currentChat.members || [];
                        const onlineCount = members.filter((m) => {
                          const mId = (m._id || m).toString();
                          return mId !== currentUserIdStr && (
                            activeOnlineUsers instanceof Set
                              ? activeOnlineUsers.has(mId)
                              : Boolean(activeOnlineUsers?.get?.(mId))
                          );
                        }).length;

                        const memberNames = members
                          .map((m) => (m._id === currentUser?._id ? "You" : m.username || "Member"))
                          .join(", ");

                        if (onlineCount > 0) {
                          return `${memberNames} (${onlineCount} online)`;
                        }
                        return memberNames || "Group chat";
                      })()}
                    </span>
                  ) : activeOnlineUsers && (activeOnlineUsers instanceof Set ? activeOnlineUsers.has((currentChat._id || '').toString()) : Boolean(activeOnlineUsers.get?.((currentChat._id || '').toString()))) ? (
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
                {isAiChat ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={handleNewAiChat}
                      style={{
                        background: "linear-gradient(135deg, rgba(0, 168, 132, 0.25), rgba(99, 102, 241, 0.25))",
                        border: "1px solid rgba(0, 168, 132, 0.5)",
                        color: "#ffffff",
                        padding: "6px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        transition: "all 0.2s ease",
                      }}
                      title="Start a fresh AI conversation"
                    >
                      <span style={{ fontSize: "14px", fontWeight: "700" }}>+</span> New Chat
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        fetchAiSessions();
                        setShowAiHistoryDrawer(!showAiHistoryDrawer);
                      }}
                      style={{
                        background: showAiHistoryDrawer ? "#00a884" : "rgba(255, 255, 255, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: showAiHistoryDrawer ? "#111b21" : "#e9edef",
                        padding: "6px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.2s ease",
                      }}
                      title="View past AI chat history"
                    >
                      <span>📜</span> History
                      {aiSessions.length > 0 && (
                        <span
                          style={{
                            backgroundColor: showAiHistoryDrawer ? "#111b21" : "#00a884",
                            color: showAiHistoryDrawer ? "#fff" : "#111b21",
                            borderRadius: "10px",
                            padding: "1px 6px",
                            fontSize: "10px",
                            fontWeight: "700",
                          }}
                        >
                          {aiSessions.length}
                        </span>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="box" id="box">
                    <div
                      className="call"
                      title={
                        isContactBlockedByMe
                          ? "You have blocked this contact"
                          : isContactBlockedByThem
                          ? "Call unavailable"
                          : currentChat.isGroup
                          ? "Group Voice Call"
                          : "Voice Call"
                      }
                      onClick={() => {
                        if (isContactBlockedByMe) {
                          showToast?.('warning', 'Contact Blocked', 'Unblock this contact to make voice calls.');
                          return;
                        }
                        if (isContactBlockedByThem) {
                          showToast?.('warning', 'Call Unavailable', 'You cannot call this contact.');
                          return;
                        }
                        onStartCall && onStartCall(currentChat, 'audio');
                      }}
                      style={
                        isContactBlockedByMe || isContactBlockedByThem
                          ? { opacity: 0.35, cursor: 'not-allowed' }
                          : {}
                      }
                    >
                      <CallIcon />
                    </div>
                    <div
                      className="vc"
                      title={
                        isContactBlockedByMe
                          ? "You have blocked this contact"
                          : isContactBlockedByThem
                          ? "Call unavailable"
                          : currentChat.isGroup
                          ? "Group Video Call"
                          : "Video Call"
                      }
                      onClick={() => {
                        if (isContactBlockedByMe) {
                          showToast?.('warning', 'Contact Blocked', 'Unblock this contact to make video calls.');
                          return;
                        }
                        if (isContactBlockedByThem) {
                          showToast?.('warning', 'Call Unavailable', 'You cannot call this contact.');
                          return;
                        }
                        onStartCall && onStartCall(currentChat, 'video');
                      }}
                      style={
                        isContactBlockedByMe || isContactBlockedByThem
                          ? { opacity: 0.35, cursor: 'not-allowed' }
                          : {}
                      }
                    >
                      <VideoCallIcon />
                    </div>
                  </div>
                )}

                {/* Search in Chat Section: Search Icon + Search Input with Match Counter & Navigation */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div
                    className="search"
                    title={showSearchInputBar ? "Close search" : "Search in chat"}
                    onClick={() => {
                      const nextState = !showSearchInputBar;
                      setShowSearchInputBar(nextState);
                      if (!nextState) {
                        setSearchTerm("");
                        setSearchDate("");
                        setActiveSearchMsgId(null);
                      }
                    }}
                    style={{
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      color: showSearchInputBar ? "#00a884" : "#aebac1",
                      transition: "color 0.2s ease",
                    }}
                  >
                    <FindInPageIcon />
                  </div>

                  {showSearchInputBar && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        backgroundColor: "#111b21",
                        borderRadius: "8px",
                        border: "1px solid rgba(0, 168, 132, 0.4)",
                        padding: "3px 8px",
                        gap: "6px",
                        animation: "fadeIn 0.2s ease-out",
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Search in chat..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentSearchMatchIndex(0);
                        }}
                        style={{
                          backgroundColor: "transparent",
                          color: "#e9edef",
                          border: "none",
                          outline: "none",
                          fontSize: "12.5px",
                          width: "120px",
                        }}
                        autoFocus
                      />

                      {/* Match Count Indicator */}
                      {searchTerm.trim() && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: matchingMessages.length > 0 ? "#00a884" : "#f15c6d",
                            fontWeight: "600",
                            whiteSpace: "nowrap",
                            padding: "0 2px",
                          }}
                        >
                          {matchingMessages.length > 0
                            ? `${currentSearchMatchIndex + 1}/${matchingMessages.length}`
                            : "0 found"}
                        </span>
                      )}

                      {/* Navigation Arrows */}
                      {matchingMessages.length > 1 && (
                        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                          <button
                            type="button"
                            onClick={handlePrevSearchMatch}
                            title="Previous match"
                            style={{
                              background: "none",
                              border: "none",
                              color: "#8696a0",
                              cursor: "pointer",
                              padding: "2px",
                              display: "flex",
                              alignItems: "center",
                              borderRadius: "4px",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#00a884")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#8696a0")}
                          >
                            <ArrowUpwardIcon style={{ fontSize: "15px" }} />
                          </button>
                          <button
                            type="button"
                            onClick={handleNextSearchMatch}
                            title="Next match"
                            style={{
                              background: "none",
                              border: "none",
                              color: "#8696a0",
                              cursor: "pointer",
                              padding: "2px",
                              display: "flex",
                              alignItems: "center",
                              borderRadius: "4px",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#00a884")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#8696a0")}
                          >
                            <ArrowDownwardIcon style={{ fontSize: "15px" }} />
                          </button>
                        </div>
                      )}

                      {/* Date Picker Input */}
                      <input
                        type="date"
                        value={searchDate}
                        onChange={(e) => setSearchDate(e.target.value)}
                        title="Filter messages by date"
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.08)",
                          color: searchDate ? "#00a884" : "#8696a0",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          borderRadius: "4px",
                          padding: "2px 4px",
                          fontSize: "11px",
                          outline: "none",
                          cursor: "pointer",
                          colorScheme: "dark",
                        }}
                      />

                      {(searchTerm || searchDate) && (
                        <CloseIcon
                          style={{ fontSize: "15px", color: "#8696a0", cursor: "pointer" }}
                          onClick={() => {
                            setSearchTerm("");
                            setSearchDate("");
                            setActiveSearchMsgId(null);
                          }}
                          titleAccess="Clear search"
                        />
                      )}
                    </div>
                  )}
                </div>

                {!isAiChat && (
                  <div
                    className="search"
                    title="Menu & Details"
                    onClick={() => setShowInfoDrawer(!showInfoDrawer)}
                    style={{
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      color: showInfoDrawer ? "#00a884" : "#aebac1",
                      transition: "color 0.2s ease",
                    }}
                  >
                    <MoreVertIcon />
                  </div>
                )}
              </div>
            </div>

            {/* Pinned Message Top Banner */}
            {latestPinned && (
              <div
                style={{
                  backgroundColor: "#182229",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  padding: "8px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  zIndex: 5,
                  transition: "background-color 0.2s",
                }}
                onClick={() => scrollToMessage(latestPinned._id)}
                title="Click to jump to pinned message"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                  <PushPinIcon style={{ color: "#00a884", fontSize: "18px", transform: "rotate(45deg)", flexShrink: 0 }} />
                  <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <span style={{ color: "#00a884", fontSize: "11.5px", fontWeight: "600" }}>
                      📌 Pinned Message {latestPinned.pinnedByName ? `• by ${latestPinned.pinnedByName}` : ""}
                    </span>
                    <span
                      style={{
                        color: "#8696a0",
                        fontSize: "12.5px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "500px",
                      }}
                    >
                      <strong style={{ color: "#d1d7db" }}>{latestPinned.senderName || "Member"}: </strong>
                      {latestPinned.message || (latestPinned.files?.length ? `📎 ${latestPinned.files[0].fileType || "Attachment"}` : "📷 Photo")}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  title="Unpin message"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePinMessage(latestPinned);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#8696a0",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    borderRadius: "50%",
                  }}
                >
                  <CloseIcon style={{ fontSize: "16px" }} />
                </button>
              </div>
            )}

            {/* Chat Messages Area with Dynamic Wallpaper Theme */}
            {(() => {
              const wallpaperStyles = {
                default: { backgroundColor: '#0b141a', backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)', backgroundSize: '24px 24px' },
                doodle: { backgroundColor: '#111b21', backgroundImage: 'radial-gradient(circle, rgba(0,168,132,0.08) 1.5px, transparent 1.5px)', backgroundSize: '20px 20px' },
                emerald: { backgroundColor: '#062820', backgroundImage: 'radial-gradient(circle, rgba(0,168,132,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px' },
                midnight: { backgroundColor: '#0d1b2a', backgroundImage: 'radial-gradient(circle, rgba(83,189,235,0.1) 1px, transparent 1px)', backgroundSize: '24px 24px' },
                amethyst: { backgroundColor: '#1a1029', backgroundImage: 'radial-gradient(circle, rgba(175,82,222,0.12) 1px, transparent 1px)', backgroundSize: '24px 24px' },
                sunset: { backgroundColor: '#1c1917', backgroundImage: 'radial-gradient(circle, rgba(245,158,11,0.1) 1px, transparent 1px)', backgroundSize: '24px 24px' },
              };
              const activeWpStyle = wallpaperStyles[activeWallpaper] || wallpaperStyles.default;

              return (
                <div className="chat-messages" style={{ ...activeWpStyle, position: "relative" }}>
                  {loadingMessages ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        minHeight: '280px',
                    gap: '14px',
                    color: '#8696a0',
                  }}
                >
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      border: '3px solid rgba(0, 168, 132, 0.2)',
                      borderTopColor: '#00a884',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  <span style={{ fontSize: '13.5px', color: '#8696a0', fontWeight: '500' }}>
                    Loading conversation...
                  </span>
                </div>
              ) : (
                <>
                  {/* ChatNex AI Bot Welcome Hero Card & Starter Prompts */}
              {isAiChat && messages.filter((m) => !m.isSystem).length === 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px 16px',
                    maxWidth: '680px',
                    margin: '20px auto',
                    textAlign: 'center',
                    animation: 'fadeIn 0.3s ease-in-out',
                  }}
                >
                  <div
                    style={{
                      width: '76px',
                      height: '76px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #00a884, #6366f1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '14px',
                      boxShadow: '0 0 24px rgba(0, 168, 132, 0.45)',
                    }}
                  >
                    <img
                      src={CHATNEX_AI_BOT.avtarImage}
                      alt="ChatNex AI"
                      style={{ width: '68px', height: '68px', borderRadius: '50%' }}
                    />
                  </div>
                  <h2
                    style={{
                      color: '#e9edef',
                      fontSize: '22px',
                      fontWeight: '700',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    Meet{' '}
                    <span
                      style={{
                        background: 'linear-gradient(135deg, #00a884, #6366f1)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      ChatNex AI
                    </span>
                  </h2>
                  <p
                    style={{
                      color: '#8696a0',
                      fontSize: '13.5px',
                      lineHeight: '1.5',
                      maxWidth: '520px',
                      marginBottom: '22px',
                    }}
                  >
                    Your dedicated 24/7 personal AI companion. Ask questions, generate photorealistic images with{' '}
                    <strong style={{ color: '#00a884' }}>/imagine</strong>, write code, draft emails, or brainstorm ideas instantly.
                  </p>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '10px',
                      width: '100%',
                    }}
                  >
                    {AI_STARTER_PROMPTS.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSendMsg(item.prompt, null, null)}
                        style={{
                          backgroundColor: '#202c33',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '12px',
                          padding: '12px 14px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#00a884';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.backgroundColor = '#2a3942';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.backgroundColor = '#202c33';
                        }}
                      >
                        <span style={{ fontSize: '22px', flexShrink: 0 }}>{item.icon}</span>
                        <div>
                          <div
                            style={{
                              color: '#e9edef',
                              fontSize: '13.5px',
                              fontWeight: '600',
                              marginBottom: '3px',
                            }}
                          >
                            {item.title}
                          </div>
                          <div style={{ color: '#8696a0', fontSize: '11.5px', lineHeight: '1.3' }}>
                            {item.desc}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

                if (message.isAiThinking) {
                  return (
                    <div
                      key={message._id || uuidv4()}
                      className="message recieved"
                      style={{ position: "relative", animation: "fadeIn 0.2s ease-out" }}
                    >
                      <div
                        className="content"
                        style={{
                          backgroundColor: "#202c33",
                          border: "1px solid rgba(0, 168, 132, 0.4)",
                          boxShadow: "0 2px 10px rgba(0, 168, 132, 0.15)",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "10px 14px",
                        }}
                      >
                        <span style={{ fontSize: "16px" }}>✨</span>
                        <span style={{ color: "#00a884", fontSize: "13px", fontWeight: "600" }}>
                          ChatNex AI is thinking...
                        </span>
                        <span className="typing-indicator" style={{ background: "transparent", padding: 0 }}>
                          <span className="typing-dot" style={{ backgroundColor: "#00a884" }}></span>
                          <span className="typing-dot" style={{ backgroundColor: "#00a884" }}></span>
                          <span className="typing-dot" style={{ backgroundColor: "#00a884" }}></span>
                        </span>
                      </div>
                    </div>
                  );
                }

                if (message.isAiImagineLoading) {
                  return (
                    <div
                      key={message._id || uuidv4()}
                      className="message recieved"
                      style={{ position: "relative", animation: "fadeIn 0.2s ease-out" }}
                    >
                      <div
                        className="content"
                        style={{
                          backgroundColor: "#202c33",
                          border: "1px solid rgba(0, 168, 132, 0.4)",
                          boxShadow: "0 2px 10px rgba(0, 168, 132, 0.15)",
                          padding: "12px 16px",
                          width: "260px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: "#00a884", fontWeight: "600", fontSize: "13px" }}>
                          <span>🎨</span>
                          <span>Creating AI Image...</span>
                        </div>
                        <div
                          style={{
                            height: "120px",
                            borderRadius: "8px",
                            backgroundColor: "#182229",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#8696a0",
                            fontSize: "12px",
                            textAlign: "center",
                            padding: "10px",
                            boxSizing: "border-box",
                            border: "1px dashed rgba(255,255,255,0.15)",
                          }}
                        >
                          "{message.imaginePrompt}"
                        </div>
                      </div>
                    </div>
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
                      id={`msg_${message._id}`}
                      ref={scrollRef}
                      className={`message${message.fromSelf ? " sended" : " recieved"}`}
                      onMouseEnter={() => handleContentMouseEnter(index)}
                      onMouseLeave={handleContentMouseLeave}
                      style={{ position: "relative" }}
                    >
                      {/* Floating Action Bar on Hover or when Translate Menu is open */}
                      {(hoveredMessageIndex === index || activeTranslateMsgId === message._id) && (
                        <div className="message-action-bar">
                          {!message.isDeleted ? (
                            <>
                              {/* Quick Emoji Reactions */}
                              {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  className="reaction-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReactToMessage(message, emoji);
                                  }}
                                  title={`React with ${emoji}`}
                                >
                                  {emoji}
                                </button>
                              ))}

                              <div style={{ width: "1px", height: "16px", backgroundColor: "rgba(255,255,255,0.15)", margin: "0 2px" }}></div>

                              {/* Reply Button */}
                              <button
                                type="button"
                                className="action-icon-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartReply(message);
                                }}
                                title="Reply"
                              >
                                <ReplyIcon style={{ fontSize: "16px" }} />
                              </button>

                              {/* Forward Button */}
                              <button
                                type="button"
                                className="action-icon-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setForwardModalMessage(message);
                                  setSelectedForwardRecipients([]);
                                  setForwardSearchQuery("");
                                }}
                                title="Forward message"
                              >
                                <ForwardIcon style={{ fontSize: "16px", transform: "scaleX(-1)" }} />
                              </button>

                              {/* Star Button */}
                              <button
                                type="button"
                                className="action-icon-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStarMessage(message);
                                }}
                                title={message.isStarred ? "Unstar" : "Star"}
                              >
                                {message.isStarred ? (
                                  <StarIcon style={{ color: "#f59e0b", fontSize: "16px" }} />
                                ) : (
                                  <StarBorderIcon style={{ fontSize: "16px" }} />
                                )}
                              </button>

                              {/* Translate Button */}
                              {message.message && !isGenericPreviewText(message.message) && (
                                <div style={{ position: "relative" }}>
                                  <button
                                    type="button"
                                    className="action-icon-btn translate-trigger-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveTranslateMsgId(
                                        activeTranslateMsgId === message._id ? null : message._id
                                      );
                                    }}
                                    title="Translate message"
                                    style={{
                                      color: translations[message._id]?.isVisible ? "#00a884" : "#8696a0",
                                    }}
                                  >
                                    <TranslateIcon style={{ fontSize: "16px" }} />
                                  </button>

                                  {/* Language Selector Popover with Live Search */}
                                  {activeTranslateMsgId === message._id && (() => {
                                    const filteredLanguages = LANGUAGES_LIST.filter((l) => {
                                      const q = langSearchQuery.toLowerCase().trim();
                                      if (!q) return true;
                                      return (
                                        l.name.toLowerCase().includes(q) ||
                                        (l.nativeName && l.nativeName.toLowerCase().includes(q)) ||
                                        l.code.toLowerCase().includes(q)
                                      );
                                    });

                                    return (
                                      <div
                                        className="translate-popover"
                                        style={{
                                          position: "absolute",
                                          top: index <= 2 ? "32px" : "auto",
                                          bottom: index <= 2 ? "auto" : "32px",
                                          right: "0",
                                          zIndex: 9999,
                                          backgroundColor: "#202c33",
                                          borderRadius: "10px",
                                          boxShadow: "0 8px 24px rgba(0,0,0,0.85)",
                                          border: "1px solid rgba(255,255,255,0.15)",
                                          width: "220px",
                                          display: "flex",
                                          flexDirection: "column",
                                          maxHeight: "260px",
                                          overflow: "hidden",
                                          animation: "fadeIn 0.15s ease-out",
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {/* Header & Search Bar */}
                                        <div
                                          style={{
                                            padding: "8px 10px",
                                            backgroundColor: "#111b21",
                                            borderBottom: "1px solid rgba(255,255,255,0.08)",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "6px",
                                          }}
                                        >
                                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <span style={{ fontSize: "11px", fontWeight: "700", color: "#00a884", letterSpacing: "0.5px" }}>
                                              TRANSLATE TO
                                            </span>
                                            <span style={{ fontSize: "10px", color: "#8696a0" }}>
                                              {filteredLanguages.length} languages
                                            </span>
                                          </div>

                                          <div
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              backgroundColor: "#202c33",
                                              borderRadius: "6px",
                                              padding: "4px 8px",
                                              border: "1px solid rgba(255,255,255,0.1)",
                                            }}
                                          >
                                            <span style={{ fontSize: "11px", color: "#8696a0", marginRight: "6px" }}>🔍</span>
                                            <input
                                              type="text"
                                              placeholder="Search language..."
                                              value={langSearchQuery}
                                              onChange={(e) => setLangSearchQuery(e.target.value)}
                                              autoFocus
                                              style={{
                                                background: "transparent",
                                                border: "none",
                                                outline: "none",
                                                color: "#e9edef",
                                                fontSize: "12px",
                                                width: "100%",
                                              }}
                                              onClick={(e) => e.stopPropagation()}
                                            />
                                            {langSearchQuery && (
                                              <span
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setLangSearchQuery("");
                                                }}
                                                style={{
                                                  cursor: "pointer",
                                                  color: "#8696a0",
                                                  fontSize: "11px",
                                                  marginLeft: "4px",
                                                  padding: "0 2px",
                                                }}
                                                title="Clear search"
                                              >
                                                ✕
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Scrollable Language List */}
                                        <div
                                          className="chatnex-custom-scrollbar"
                                          style={{
                                            overflowY: "auto",
                                            flex: 1,
                                            maxHeight: "190px",
                                          }}
                                        >
                                          {filteredLanguages.length > 0 ? (
                                            filteredLanguages.map((lang) => (
                                              <div
                                                key={lang.code}
                                                onClick={() => {
                                                  handleTranslateMessage(
                                                    message._id,
                                                    message.message,
                                                    lang.code,
                                                    lang.name
                                                  );
                                                  setLangSearchQuery("");
                                                }}
                                                style={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                  justifyContent: "space-between",
                                                  padding: "7px 10px",
                                                  fontSize: "12.5px",
                                                  color: "#e9edef",
                                                  cursor: "pointer",
                                                  transition: "background 0.15s",
                                                }}
                                                onMouseEnter={(e) =>
                                                  (e.currentTarget.style.backgroundColor = "#182229")
                                                }
                                                onMouseLeave={(e) =>
                                                  (e.currentTarget.style.backgroundColor = "transparent")
                                                }
                                              >
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                  <span style={{ fontSize: "14px" }}>{lang.flag}</span>
                                                  <span style={{ fontWeight: "500" }}>{lang.name}</span>
                                                </div>
                                                {lang.nativeName && lang.nativeName !== lang.name && (
                                                  <span style={{ fontSize: "11px", color: "#8696a0" }}>
                                                    {lang.nativeName}
                                                  </span>
                                                )}
                                              </div>
                                            ))
                                          ) : (
                                            <div style={{ padding: "16px 10px", textAlign: "center", color: "#8696a0", fontSize: "12px" }}>
                                              No languages found
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}

                              {/* Pin Button */}
                              <button
                                type="button"
                                className="action-icon-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePinMessage(message);
                                }}
                                title={message.isPinned ? "Unpin" : "Pin"}
                              >
                                {message.isPinned ? (
                                  <PushPinIcon style={{ color: "#00a884", fontSize: "16px" }} />
                                ) : (
                                  <PushPinOutlinedIcon style={{ fontSize: "16px" }} />
                                )}
                              </button>

                              {/* Edit Button (Own non-deleted messages) */}
                              {message.fromSelf && (
                                <button
                                  type="button"
                                  className="action-icon-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEdit(message);
                                  }}
                                  title="Edit"
                                >
                                  <EditIcon style={{ fontSize: "16px" }} />
                                </button>
                              )}
                            </>
                          ) : null}

                          {/* Delete Button */}
                          <button
                            type="button"
                            className="action-icon-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDeleteModal(message);
                            }}
                            title={message.isDeleted ? "Delete for me" : "Delete"}
                            style={{ color: "#ea868f" }}
                          >
                            <DeleteOutlineIcon style={{ fontSize: "16px" }} />
                          </button>
                        </div>
                      )}

                      <div
                        className="content"
                        style={{
                          ...(emojiOnlyInfo ? { background: "transparent", boxShadow: "none", padding: "0 4px" } : {}),
                          maxWidth: (messageFiles.some(f => f.fileType === "image" || (!f.fileType && /\.(png|jpe?g|webp|bmp|svg)$/i.test(f.url || f.filename || ""))) || message.imgpath) ? "336px" : undefined,
                          width: "fit-content",
                          wordBreak: "break-word",
                        }}
                      >
                        {/* Group sender name tag or AI Badge */}
                        {(message.isAi || message.senderName === "ChatNex AI") ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              marginBottom: "4px",
                            }}
                          >
                            <span
                              style={{
                                background: "linear-gradient(135deg, #00a884 0%, #00d2ff 100%)",
                                color: "#111b21",
                                fontSize: "10.5px",
                                fontWeight: "700",
                                padding: "2px 7px",
                                borderRadius: "10px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                letterSpacing: "0.4px",
                              }}
                            >
                              ✨ ChatNex AI
                            </span>
                          </div>
                        ) : isGroupMsg && !message.fromSelf ? (
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
                        ) : null}

                        {/* Quoted Reply Preview */}
                        {message.replyTo && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              if (message.replyTo.messageId) {
                                scrollToMessage(message.replyTo.messageId);
                              }
                            }}
                            style={{
                              backgroundColor: "rgba(0, 0, 0, 0.25)",
                              borderLeft: "3.5px solid #00a884",
                              borderRadius: "4px",
                              padding: "4px 8px",
                              marginBottom: "6px",
                              cursor: "pointer",
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                              maxWidth: "100%",
                            }}
                            title="Click to jump to quoted message"
                          >
                            <span style={{ color: "#00a884", fontSize: "11.5px", fontWeight: "600" }}>
                              {message.replyTo.senderName || "Message"}
                            </span>
                            <span
                              style={{
                                color: "rgba(255, 255, 255, 0.75)",
                                fontSize: "12px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: "260px",
                              }}
                            >
                              {message.replyTo.text || (message.replyTo.fileType ? `📎 ${message.replyTo.fileType.toUpperCase()}` : "Attachment")}
                            </span>
                          </div>
                        )}

                        {/* Message Attachments (Photos / Videos / Files / Voice Notes) */}
                        {!message.isDeleted && renderAttachmentsSection(messageFiles, message)}

                        {/* Message Text */}
                        {message.isDeleted ? (
                          <div style={{ color: "#8696a0", fontStyle: "italic", fontSize: "13.5px", display: "flex", alignItems: "center", gap: "4px" }}>
                            <span>🚫 This message was deleted</span>
                          </div>
                        ) : message.message && !isGenericPreviewText(message.message) ? (
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
                              {renderMessageContent(message)}
                            </div>
                          )
                        ) : null}

                        {/* Inline Translated Card */}
                        {translations[message._id] && (
                          <div
                            style={{
                              marginTop: "6px",
                              marginBottom: "4px",
                              backgroundColor: "rgba(0, 0, 0, 0.28)",
                              borderRadius: "6px",
                              borderLeft: "3.5px solid #00a884",
                              padding: "6px 10px",
                              animation: "fadeIn 0.2s ease-out",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: "3px",
                              }}
                            >
                              <span
                                style={{
                                  color: "#00a884",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                🌐 {translations[message._id].targetLangName || "Translated"}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleTranslation(message._id)}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "#8696a0",
                                  fontSize: "11px",
                                  cursor: "pointer",
                                  textDecoration: "underline",
                                }}
                              >
                                {translations[message._id].isVisible ? "Hide" : "Show"}
                              </button>
                            </div>

                            {translations[message._id].loading ? (
                              <div style={{ color: "#8696a0", fontSize: "12px", fontStyle: "italic" }}>
                                Translating message...
                              </div>
                            ) : (
                              translations[message._id].isVisible && (
                                <div
                                  style={{
                                    color: "#e9edef",
                                    fontSize: "13.5px",
                                    lineHeight: "1.4",
                                  }}
                                >
                                  {translations[message._id].translatedText}
                                </div>
                              )
                            )}
                          </div>
                        )}

                        {/* Message Metadata (Timestamp, Edited, Star, Pin, Read Ticks) */}
                        <div className="message-meta">
                          {message.isEdited && (
                            <span style={{ fontSize: "10.5px", color: "rgba(233, 237, 239, 0.55)", fontStyle: "italic", marginRight: "2px" }}>
                              edited
                            </span>
                          )}
                          {message.isStarred && (
                            <span title="Starred message" style={{ display: "inline-flex", alignItems: "center", color: "#f59e0b", fontSize: "11px", marginRight: "2px" }}>
                              ⭐
                            </span>
                          )}
                          {message.isPinned && (
                            <span title="Pinned message" style={{ display: "inline-flex", alignItems: "center", color: "#00a884", fontSize: "11px", marginRight: "2px" }}>
                              📌
                            </span>
                          )}
                          <span className="message-time">
                            {new Date(message.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {renderTicks(message)}
                        </div>

                        {/* Reactions Badges Row */}
                        {message.reactions && message.reactions.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "4px",
                              marginTop: "4px",
                              paddingTop: "2px",
                              borderTop: "1px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            {Object.entries(
                              message.reactions.reduce((acc, r) => {
                                const em = r.emoji;
                                if (!acc[em]) acc[em] = { count: 0, users: [], hasUser: false };
                                acc[em].count += 1;
                                acc[em].users.push(r.username || "User");
                                if ((r.userId || r.user || "").toString() === (currentUser?._id || "").toString()) {
                                  acc[em].hasUser = true;
                                }
                                return acc;
                              }, {})
                            ).map(([emoji, data]) => (
                              <div
                                key={emoji}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReactToMessage(message, emoji);
                                }}
                                title={`Reacted by: ${data.users.join(", ")}`}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  backgroundColor: data.hasUser ? "rgba(0, 168, 132, 0.25)" : "#202c33",
                                  border: data.hasUser ? "1px solid #00a884" : "1px solid rgba(255, 255, 255, 0.12)",
                                  borderRadius: "12px",
                                  padding: "2px 6px",
                                  fontSize: "12px",
                                  cursor: "pointer",
                                  userSelect: "none",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                                  transition: "transform 0.15s",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
                                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                              >
                                <span>{emoji}</span>
                                {data.count > 1 && (
                                  <span style={{ fontSize: "11px", fontWeight: "600", color: data.hasUser ? "#00a884" : "#8696a0" }}>
                                    {data.count}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}

              {/* Typing Bubble */}
              {typingUsers.size > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "4px 16px" }}>
                  <div
                    style={{
                      backgroundColor: "#202c33",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                    }}
                  >
                    <span style={{ color: "#8696a0", fontSize: "12px" }}>
                      {Array.from(typingUsers).join(", ")} is typing
                    </span>
                    <span className="typing-indicator" style={{ background: "transparent", padding: 0 }}>
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                    </span>
                  </div>
                </div>
              )}

                  <div ref={messagesEndRef} />
                </>
              )}

              {/* Floating Media Upload Indicator */}
              {isUploadingMedia && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#202c33',
                    border: '1px solid #00a884',
                    borderRadius: '20px',
                    padding: '8px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                    zIndex: 25,
                    animation: 'fadeIn 0.2s ease-out',
                  }}
                >
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(0, 168, 132, 0.2)',
                      borderTopColor: '#00a884',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  <span style={{ color: '#e9edef', fontSize: '12.5px', fontWeight: '500' }}>
                    Uploading attachment...
                  </span>
                </div>
              )}
            </div>
          );
        })()}

            {/* ChatInput or Read-Only Notice if user exited/removed or contact is blocked */}
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
            ) : isContactBlockedByMe ? (
              <div
                style={{
                  padding: '14px 20px',
                  backgroundColor: '#111b21',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '14px',
                  boxShadow: '0 -2px 10px rgba(0,0,0,0.2)',
                }}
              >
                <span style={{ color: '#8696a0', fontSize: '13.5px' }}>
                  🚫 You blocked this contact.
                </span>
                <button
                  type="button"
                  onClick={handleUnblockCurrentChat}
                  style={{
                    backgroundColor: 'rgba(0,168,132,0.15)',
                    border: '1px solid #00a884',
                    color: '#00a884',
                    borderRadius: '6px',
                    padding: '6px 16px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#00a884';
                    e.currentTarget.style.color = '#111b21';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0,168,132,0.15)';
                    e.currentTarget.style.color = '#00a884';
                  }}
                >
                  Unblock
                </button>
              </div>
            ) : isContactBlockedByThem ? (
              <div
                style={{
                  padding: '16px 20px',
                  backgroundColor: '#111b21',
                  color: '#ea868f',
                  textAlign: 'center',
                  fontSize: '13.5px',
                  fontWeight: '500',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                🚫 You cannot send messages or make calls to this contact.
              </div>
            ) : isGroup && currentChat?.permissions?.sendMessages === 'admins' && !isCurrentUserAdmin ? (
              <div
                style={{
                  padding: '16px 20px',
                  backgroundColor: '#202c33',
                  color: '#8696a0',
                  textAlign: 'center',
                  fontSize: '13.5px',
                  fontWeight: '500',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span>🔒</span> Only admins can send messages in this group.
              </div>
            ) : (
              <ChatInput
                handleSendMsg={handleSendMsg}
                replyingTo={replyingTo}
                onCancelReply={() => setReplyingTo(null)}
                editingMessage={editingMessage}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={() => setEditingMessage(null)}
                onTyping={handleEmitTyping}
                onStopTyping={handleEmitStopTyping}
              />
            )}
          </div>

          {showInfoDrawer && (
            <ChatInfoDrawer
              chat={currentChat}
              currentUser={currentUser}
              contacts={contacts}
              onlineUsers={activeOnlineUsers}
              messages={messages}
              socket={socket}
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
              onUpdateGroupDetails={onUpdateGroupDetails}
              onCreateSimilarGroup={onCreateSimilarGroup}
              onLeaveGroup={onLeaveGroup}
              onDeleteGroup={onDeleteGroup}
              onUpdateCurrentUser={onUpdateCurrentUser}
              onOpenSearch={() => {
                setShowSearchInputBar(true);
                setShowInfoDrawer(false);
              }}
              showToast={showToast}
            />
          )}

          {/* AI Chat History Drawer */}
          {showAiHistoryDrawer && isAiChat && (
            <div
              style={{
                width: '360px',
                maxWidth: '100%',
                height: '100%',
                backgroundColor: '#111b21',
                borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
                zIndex: 20,
              }}
            >
              {/* Drawer Header */}
              <div
                style={{
                  padding: '16px 18px',
                  backgroundColor: '#202c33',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAiHistoryDrawer(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#8696a0',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '50%',
                    }}
                    title="Close History"
                  >
                    <CloseIcon style={{ fontSize: '20px' }} />
                  </button>
                  <div>
                    <h3 style={{ margin: 0, color: '#e9edef', fontSize: '16px', fontWeight: '600' }}>
                      Chat History
                    </h3>
                    <span style={{ color: '#8696a0', fontSize: '11.5px' }}>
                      {aiSessions.length} {aiSessions.length === 1 ? 'conversation' : 'conversations'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNewAiChat}
                  style={{
                    background: 'linear-gradient(135deg, #00a884, #6366f1)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '16px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 8px rgba(0, 168, 132, 0.3)',
                  }}
                  title="Start a fresh AI conversation"
                >
                  <span>+</span> New Chat
                </button>
              </div>

              {/* Search Past Sessions */}
              <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#202c33',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    gap: '8px',
                  }}
                >
                  <span style={{ color: '#8696a0', fontSize: '14px' }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Search past conversations..."
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#e9edef',
                      fontSize: '12.5px',
                      outline: 'none',
                      width: '100%',
                    }}
                  />
                  {historySearchQuery && (
                    <button
                      type="button"
                      onClick={() => setHistorySearchQuery("")}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#8696a0',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Sessions List */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {loadingAiSessions ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#8696a0', fontSize: '13px' }}>
                    Loading history...
                  </div>
                ) : filteredAiSessions.length === 0 ? (
                  <div
                    style={{
                      padding: '40px 20px',
                      textAlign: 'center',
                      color: '#8696a0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <div style={{ fontSize: '32px' }}>💬</div>
                    <p style={{ margin: 0, fontSize: '14px', color: '#e9edef', fontWeight: '500' }}>
                      {historySearchQuery ? "No matching conversations found" : "No past conversations"}
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#8696a0' }}>
                      {historySearchQuery ? "Try a different search keyword" : "Start chatting or click + New Chat to create threads"}
                    </p>
                  </div>
                ) : (
                  filteredAiSessions.map((session) => {
                    const isSelected =
                      aiSessionId === session.sessionId ||
                      (!aiSessionId && session.sessionId === "default");
                    const sessionDate = new Date(session.updatedAt || session.createdAt);
                    const formattedTime = !isNaN(sessionDate.getTime())
                      ? sessionDate.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
                        ' ' +
                        sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '';

                    return (
                      <div
                        key={session.sessionId}
                        onClick={() => handleSelectAiSession(session.sessionId)}
                        style={{
                          backgroundColor: isSelected ? 'rgba(0, 168, 132, 0.14)' : '#202c33',
                          border: isSelected ? '1px solid #00a884' : '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '10px',
                          padding: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          transition: 'all 0.18s ease',
                          position: 'relative',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#2a3942';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#202c33';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <span style={{ fontSize: '14px', flexShrink: 0 }}>
                              {session.firstPrompt?.startsWith('🎨 Image:') ? '🎨' : '💬'}
                            </span>
                            <h4
                              style={{
                                margin: 0,
                                color: isSelected ? '#00a884' : '#e9edef',
                                fontSize: '13px',
                                fontWeight: '600',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={session.title}
                            >
                              {session.title}
                            </h4>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteAiSession(session.sessionId, e)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#8696a0',
                              cursor: 'pointer',
                              padding: '2px 4px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              opacity: 0.7,
                              transition: 'all 0.15s ease',
                              flexShrink: 0,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#ea868f';
                              e.currentTarget.style.opacity = '1';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#8696a0';
                              e.currentTarget.style.opacity = '0.7';
                            }}
                            title="Delete this session"
                          >
                            <DeleteOutlineIcon style={{ fontSize: '16px' }} />
                          </button>
                        </div>

                        {session.lastMessage && (
                          <p
                            style={{
                              margin: 0,
                              color: '#8696a0',
                              fontSize: '11.5px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              paddingLeft: '22px',
                            }}
                          >
                            {session.lastMessage}
                          </p>
                        )}

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingLeft: '22px',
                            marginTop: '2px',
                            fontSize: '11px',
                            color: 'rgba(233, 237, 239, 0.5)',
                          }}
                        >
                          <span>{formattedTime}</span>
                          <span
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.07)',
                              borderRadius: '8px',
                              padding: '1px 6px',
                              fontSize: '10px',
                              color: '#8696a0',
                            }}
                          >
                            {session.messageCount || 1} msgs
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Forward Message Modal Dialog */}
          {forwardModalMessage && (
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
              onClick={() => setForwardModalMessage(null)}
            >
              <div
                style={{
                  backgroundColor: '#202c33',
                  borderRadius: '12px',
                  width: '420px',
                  maxWidth: '92vw',
                  height: '520px',
                  maxHeight: '90vh',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: '0 12px 36px rgba(0, 0, 0, 0.7)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div
                  style={{
                    padding: '16px 20px',
                    backgroundColor: '#111b21',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ForwardIcon style={{ color: '#00a884', fontSize: '22px', transform: 'scaleX(-1)' }} />
                    <h3 style={{ margin: 0, color: '#e9edef', fontSize: '16px', fontWeight: '600' }}>
                      Forward message to...
                    </h3>
                  </div>
                  <CloseIcon
                    style={{ color: '#8696a0', cursor: 'pointer', fontSize: '20px' }}
                    onClick={() => setForwardModalMessage(null)}
                  />
                </div>

                {/* Message Preview Snippet */}
                <div
                  style={{
                    padding: '10px 16px',
                    backgroundColor: 'rgba(0, 168, 132, 0.1)',
                    borderBottom: '1px solid rgba(0, 168, 132, 0.2)',
                    fontSize: '12.5px',
                    color: '#e9edef',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ color: '#00a884', fontWeight: '600' }}>Preview:</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#8696a0' }}>
                    {forwardModalMessage.message || (forwardModalMessage.files?.length > 0 ? `📎 ${forwardModalMessage.files.length} attachment(s)` : 'Photo')}
                  </span>
                </div>

                {/* Search Bar */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: '#111b21',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <span style={{ fontSize: '13px', color: '#8696a0', marginRight: '8px' }}>🔍</span>
                    <input
                      type="text"
                      placeholder="Search contacts or groups..."
                      value={forwardSearchQuery}
                      onChange={(e) => setForwardSearchQuery(e.target.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: '#e9edef',
                        fontSize: '13px',
                        width: '100%',
                      }}
                      autoFocus
                    />
                  </div>
                </div>

                {/* Recipients List */}
                <div
                  className="chatnex-custom-scrollbar"
                  style={{ flex: 1, overflowY: 'auto', padding: '6px 10px' }}
                >
                  {contacts
                    .filter((c) => {
                      if (!forwardSearchQuery.trim()) return true;
                      const q = forwardSearchQuery.toLowerCase();
                      return (c.username || c.name || '').toLowerCase().includes(q);
                    })
                    .map((item) => {
                      const id = (item._id || item).toString();
                      const isSelected = selectedForwardRecipients.includes(id);
                      return (
                        <div
                          key={id}
                          onClick={() => {
                            setSelectedForwardRecipients((prev) =>
                              prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                            );
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? 'rgba(0, 168, 132, 0.15)' : 'transparent',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#182229';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img
                              src={getAvatarSrc(item.avtarImage || item.groupImage)}
                              alt={item.username || item.name}
                              style={{ width: '38px', height: '38px', borderRadius: '50%' }}
                            />
                            <div>
                              <div style={{ color: '#e9edef', fontSize: '13.5px', fontWeight: '500' }}>
                                {item.name || item.username}
                              </div>
                              <div style={{ color: '#8696a0', fontSize: '11px' }}>
                                {item.isGroup ? 'Group Chat' : 'Contact'}
                              </div>
                            </div>
                          </div>
                          <div>
                            {isSelected ? (
                              <CheckCircleIcon style={{ color: '#00a884', fontSize: '20px' }} />
                            ) : (
                              <RadioButtonUncheckedIcon style={{ color: '#8696a0', fontSize: '20px' }} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Modal Footer */}
                <div
                  style={{
                    padding: '12px 20px',
                    backgroundColor: '#111b21',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '12.5px', color: '#8696a0' }}>
                    {selectedForwardRecipients.length} selected
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setForwardModalMessage(null)}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#e9edef',
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
                      disabled={selectedForwardRecipients.length === 0 || isForwarding}
                      onClick={handleExecuteForward}
                      style={{
                        backgroundColor: selectedForwardRecipients.length > 0 ? '#00a884' : '#202c33',
                        color: selectedForwardRecipients.length > 0 ? '#fff' : '#8696a0',
                        border: 'none',
                        padding: '8px 18px',
                        borderRadius: '6px',
                        cursor: selectedForwardRecipients.length > 0 ? 'pointer' : 'not-allowed',
                        fontSize: '13px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <ForwardIcon style={{ fontSize: '16px', transform: 'scaleX(-1)' }} />
                      {isForwarding ? 'Forwarding...' : `Forward (${selectedForwardRecipients.length})`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* In-App Delete Confirmation Modal */}
          {deleteModalMessage && (
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
              onClick={() => setDeleteModalMessage(null)}
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
                    🗑️
                  </div>
                  <h3 style={{ margin: 0, color: '#e9edef', fontSize: '17px', fontWeight: '600' }}>
                    Delete message?
                  </h3>
                </div>

                <p style={{ margin: 0, color: '#8696a0', fontSize: '13.5px', lineHeight: '1.5' }}>
                  {deleteModalMessage.fromSelf && !deleteModalMessage.isDeleted
                    ? "You can delete this message for everyone in this chat or only for yourself."
                    : "Delete this message from your chat history?"}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  {deleteModalMessage.fromSelf && !deleteModalMessage.isDeleted && (
                    <button
                      type="button"
                      onClick={() => handleConfirmDelete('everyone')}
                      style={{
                        backgroundColor: '#ea868f',
                        border: 'none',
                        color: '#111b21',
                        fontWeight: '600',
                        padding: '10px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13.5px',
                        transition: 'opacity 0.2s',
                      }}
                    >
                      Delete for everyone
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleConfirmDelete('me')}
                    style={{
                      backgroundColor: '#2a3942',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#e9edef',
                      fontWeight: '600',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13.5px',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    Delete for me
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteModalMessage(null)}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#8696a0',
                      fontWeight: '500',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13.5px',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
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

