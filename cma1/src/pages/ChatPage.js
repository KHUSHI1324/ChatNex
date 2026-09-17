import React, { useEffect, useState, useRef } from 'react';
import '../App.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Contacts from '../components/Contacts';
import CallsPanel from '../components/CallsPanel';
import GroupsPanel from '../components/GroupsPanel';
import CallModal from '../components/CallModal';
import CallInfoView from '../components/CallInfoView';
import ChatContainer from '../components/ChatContainer';
import {
  contactsWithLastMessageRoute,
  getUserGroupsRoute,
  addMembersGroupRoute,
  removeMemberGroupRoute,
  makeAdminGroupRoute,
  dismissAdminGroupRoute,
  updateGroupAvatarRoute,
  leaveGroupRoute,
  deleteGroupRoute,
  markReadRoute,
  getUserRoute,
  host,
} from '../utils/APIRoutes';
import Welcome from '../components/Welcome';
import { io } from 'socket.io-client';
import Profile from '../components/Profile'; 
import FitbitIcon from '@mui/icons-material/Fitbit';
import MessageIcon from '@mui/icons-material/Message';
import CallIcon from '@mui/icons-material/Call';
import GroupsIcon from '@mui/icons-material/Groups';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

function ChatPage() {
  const socket = useRef();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [currentUser, setCurrentUser] = useState(undefined);
  const [currentChat, setCurrentChat] = useState(undefined);
  const [arrivalMessage, setArrivalMessage] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'calls' | 'groups'
  const [activeCall, setActiveCall] = useState(null); // { contact, type: 'audio' | 'video' }
  const [selectedCallContact, setSelectedCallContact] = useState(null);
  const [callLogs, setCallLogs] = useState([]);
  const [toastNotification, setToastNotification] = useState(null); // { title, message }

  // Load call logs from localStorage or initialize with sample logs
  useEffect(() => {
    if (currentUser?._id) {
      const storageKey = `chatnex_call_history_${currentUser._id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setCallLogs(JSON.parse(saved));
          return;
        } catch (e) {
          console.error('Error loading call logs:', e);
        }
      }

      // Generate realistic initial call logs based on loaded contacts
      if (contacts && contacts.length > 0) {
        const individualContacts = contacts.filter((c) => !c.isGroup);
        const sampleLogs = individualContacts.slice(0, 4).map((c, i) => {
          const now = new Date();
          const pastTime = new Date(now.getTime() - (i + 1) * 3600 * 1000 * 5).toISOString();
          const isMissed = i === 1;
          const isIncoming = i === 2;

          return {
            id: `call_${Date.now()}_${i}`,
            contact: c,
            type: i % 2 === 0 ? 'video' : 'audio',
            direction: isMissed ? 'missed' : isIncoming ? 'incoming' : 'outgoing',
            status: isMissed ? 'missed' : 'attended',
            duration: isMissed ? 0 : (i + 1) * 75 + 12,
            timestamp: pastTime,
          };
        });

        setCallLogs(sampleLogs);
        localStorage.setItem(storageKey, JSON.stringify(sampleLogs));
      }
    }
  }, [currentUser, contacts]);

  const saveCallLogs = (newLogs) => {
    setCallLogs(newLogs);
    if (currentUser?._id) {
      localStorage.setItem(`chatnex_call_history_${currentUser._id}`, JSON.stringify(newLogs));
    }
  };

  const handleEndCall = (endedCallData) => {
    const newLog = {
      id: `call_${Date.now()}`,
      contact: endedCallData.contact,
      type: endedCallData.type || 'audio',
      direction: endedCallData.direction || 'outgoing',
      status: endedCallData.status || 'attended',
      duration: endedCallData.duration || 0,
      timestamp: endedCallData.timestamp || new Date().toISOString(),
    };

    saveCallLogs([newLog, ...callLogs]);
  };

  const handleClearCallLogs = () => {
    saveCallLogs([]);
  };

  const currentChatRef = useRef(currentChat);
  useEffect(() => {
    currentChatRef.current = currentChat;
  }, [currentChat]);

  useEffect(() => {
    async function fetchData() {
      const raw = localStorage.getItem('chat-app-user');
      if (!raw) {
        navigate('/login');
        return;
      }
      
      const localUser = JSON.parse(raw);
      setCurrentUser(localUser);
      setIsLoaded(true);

      // Fetch latest profile from DB to keep avatar & details fully in sync
      try {
        if (localUser?._id) {
          const res = await axios.get(`${getUserRoute}/${localUser._id}`);
          if (res.data?.status && res.data.user) {
            const freshUser = { ...localUser, ...res.data.user };
            setCurrentUser(freshUser);
            localStorage.setItem('chat-app-user', JSON.stringify(freshUser));
          }
        }
      } catch (err) {
        console.error('Error syncing profile from database:', err);
      }
    }
    fetchData();
  }, [navigate]);

  const formatPreviewMessage = (msgText, imgpath, files = []) => {
    let filesArr = files && files.length > 0 ? files : (imgpath ? [{ url: imgpath, fileType: "image" }] : []);

    if (filesArr.length > 0) {
      const count = filesArr.length;
      const allImages = filesArr.every(
        (f) => (f.fileType === "image" || (f.mimeType && f.mimeType.startsWith("image/")) || /\.(png|jpe?g|webp|bmp|svg)$/i.test(f.url || f.filename || ""))
      );
      const single = filesArr[0];
      const singleExt = (single.filename || single.url || "").split(".").pop().toLowerCase();
      let prefix = "";

      if (count > 1) {
        prefix = allImages ? `📷 ${count} photos` : `📎 ${count} files`;
      } else {
        if (single.fileType === "video" || (single.mimeType && single.mimeType.startsWith("video/")) || /\.(mp4|webm|mov|mkv|avi|ogg|m4v)$/i.test(single.url || single.filename || "")) {
          prefix = "🎥 Video";
        } else if (single.fileType === "gif" || singleExt === "gif") {
          prefix = "👾 GIF";
        } else if (single.fileType === "image" || /\.(png|jpe?g|webp|bmp|svg)$/i.test(single.url || single.filename || "")) {
          prefix = "📷 Photo";
        } else if (single.fileType === "pdf" || singleExt === "pdf" || single.fileType === "doc" || ["doc", "docx"].includes(singleExt)) {
          prefix = "📄 Document";
        } else if (single.fileType === "sheet" || ["xls", "xlsx", "csv"].includes(singleExt)) {
          prefix = "📊 Spreadsheet";
        } else {
          prefix = "📎 File";
        }
      }

      const isGeneric = (text) => {
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
          trimmed.startsWith("📷 Photo: ") ||
          trimmed.startsWith("🎥 Video: ") ||
          trimmed.startsWith("👾 GIF: ") ||
          trimmed.startsWith("📄 Document: ") ||
          trimmed.startsWith("📊 Spreadsheet: ") ||
          trimmed.startsWith("📎 File: ") ||
          /^📎 \d+ files?/i.test(trimmed) ||
          /^📷 \d+ photos?/i.test(trimmed) ||
          /\.(png|jpe?g|gif|webp|bmp|svg|mp4|webm|mov|mkv|pdf|docx?|xlsx?|csv)$/i.test(trimmed)
        );
      };

      if (msgText && msgText.trim() && !isGeneric(msgText)) {
        return `${prefix}: ${msgText.trim()}`;
      } else if (msgText && (msgText.startsWith("📷") || msgText.startsWith("🎥") || msgText.startsWith("👾") || msgText.startsWith("📄") || msgText.startsWith("📊") || msgText.startsWith("📎"))) {
        return msgText;
      }
      return prefix;
    }

    return msgText || "";
  };

  const updateContactLastMessage = (targetContactId, msgText, imgpath, senderId, timestamp = new Date().toISOString(), files = []) => {
    if (!targetContactId) return;
    const preview = formatPreviewMessage(msgText, imgpath, files);

    setContacts((prevContacts) => {
      const updatedContacts = prevContacts.map((contact) => {
        if (contact._id?.toString() === targetContactId?.toString()) {
          return {
            ...contact,
            latestMessage: {
              message: preview,
              imgpath: imgpath,
              files: files,
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

    setGroups((prevGroups) => {
      return prevGroups.map((g) => {
        if (g._id?.toString() === targetContactId?.toString()) {
          return {
            ...g,
            latestMessage: {
              message: preview,
              imgpath: imgpath,
              files: files,
              timestamp: timestamp,
              sender: senderId,
            },
            lastMessageTimestamp: timestamp,
          };
        }
        return g;
      });
    });
  };

  const handleGroupCreated = (newGroup) => {
    if (!newGroup) return;
    setGroups((prev) => [newGroup, ...prev.filter((g) => g._id !== newGroup._id)]);
    setContacts((prev) => [newGroup, ...prev.filter((c) => c._id !== newGroup._id)]);
  };

  const handleAddMembersToGroup = async (groupId, newMemberIds) => {
    try {
      const res = await axios.put(addMembersGroupRoute, {
        groupId,
        newMemberIds,
        addedBy: currentUser?._id,
      });
      const updatedGroup = res.data.group;
      const systemMessage = res.data.systemMessage;

      if (updatedGroup) {
        setGroups((prev) =>
          prev.map((g) => (g._id === groupId ? { ...g, ...updatedGroup } : g))
        );
        setContacts((prev) =>
          prev.map((c) => (c._id === groupId ? { ...c, ...updatedGroup } : c))
        );
        if (currentChat && currentChat._id === groupId) {
          setCurrentChat((prev) => ({ ...prev, ...updatedGroup }));
        }

        if (systemMessage) {
          if (currentChatRef.current && currentChatRef.current._id === groupId) {
            setArrivalMessage(systemMessage);
          }
          if (socket?.current && updatedGroup.members) {
            socket.current.emit("send-msg", {
              from: currentUser._id,
              to: groupId,
              message: systemMessage.message,
              isGroup: true,
              groupId: groupId,
              senderName: currentUser.username,
              isSystem: true,
              members: updatedGroup.members,
            });
          }
        }

        if (socket?.current) {
          socket.current.emit("group-action", {
            action: "updated",
            groupId,
            group: updatedGroup,
            targetMemberIds: updatedGroup.members.map((m) => (m._id || m).toString()),
          });
        }
        setToastNotification({
          title: "Members Added",
          message: systemMessage?.message || `Added member(s) to ${updatedGroup.name}.`,
        });
        setTimeout(() => setToastNotification(null), 3500);
      }
    } catch (err) {
      console.error("Error adding members to group:", err);
    }
  };

  const handleRemoveMemberFromGroup = async (groupId, memberIdToRemove) => {
    try {
      const res = await axios.put(removeMemberGroupRoute, {
        groupId,
        memberIdToRemove,
        removedBy: currentUser?._id,
      });
      const updatedGroup = res.data.group;
      const systemMessage = res.data.systemMessage;

      if (updatedGroup) {
        setGroups((prev) =>
          prev.map((g) => (g._id === groupId ? { ...g, ...updatedGroup } : g))
        );
        setContacts((prev) =>
          prev.map((c) => (c._id === groupId ? { ...c, ...updatedGroup } : c))
        );
        if (currentChat && currentChat._id === groupId) {
          setCurrentChat((prev) => ({ ...prev, ...updatedGroup }));
        }

        if (systemMessage) {
          if (currentChatRef.current && currentChatRef.current._id === groupId) {
            setArrivalMessage(systemMessage);
          }
          if (socket?.current && updatedGroup.members) {
            socket.current.emit("send-msg", {
              from: currentUser._id,
              to: groupId,
              message: systemMessage.message,
              isGroup: true,
              groupId: groupId,
              senderName: currentUser.username,
              isSystem: true,
              members: updatedGroup.members.concat([{ _id: memberIdToRemove }]),
            });
          }
        }

        if (socket?.current) {
          socket.current.emit("group-action", {
            action: "updated",
            groupId,
            group: updatedGroup,
            targetMemberIds: updatedGroup.members
              .map((m) => (m._id || m).toString())
              .concat([memberIdToRemove.toString()]),
          });
        }

        setToastNotification({
          title: "Member Removed",
          message: systemMessage?.message || "Member removed from group.",
        });
        setTimeout(() => setToastNotification(null), 3500);
      }
    } catch (err) {
      console.error("Error removing member from group:", err);
    }
  };

  const handleMakeAdminInGroup = async (groupId, memberIdToPromote) => {
    try {
      const res = await axios.put(makeAdminGroupRoute, {
        groupId,
        memberIdToPromote,
        requestedBy: currentUser?._id,
      });

      if (res.data?.status && res.data.group) {
        const updatedGroup = res.data.group;
        const systemMessage = res.data.systemMessage;

        setGroups((prev) =>
          prev.map((g) => (g._id === groupId ? { ...g, ...updatedGroup } : g))
        );
        setContacts((prev) =>
          prev.map((c) => (c._id === groupId ? { ...c, ...updatedGroup } : c))
        );
        if (currentChat && currentChat._id === groupId) {
          setCurrentChat((prev) => ({ ...prev, ...updatedGroup }));
        }

        if (systemMessage) {
          if (currentChatRef.current && currentChatRef.current._id === groupId) {
            setArrivalMessage(systemMessage);
          }
          if (socket?.current && updatedGroup.members) {
            socket.current.emit("send-msg", {
              from: currentUser._id,
              to: groupId,
              message: systemMessage.message,
              isGroup: true,
              groupId: groupId,
              isSystem: true,
              timestamp: systemMessage.timestamp,
              targetMemberIds: updatedGroup.members.map((m) => (m._id || m).toString()),
            });
          }
        }

        if (socket?.current && updatedGroup.members) {
          socket.current.emit("group-action", {
            action: "updated",
            groupId,
            group: updatedGroup,
            targetMemberIds: updatedGroup.members.map((m) => (m._id || m).toString()),
          });
        }

        setToastNotification({
          title: "Admin Promoted",
          message: systemMessage?.message || "Group admin assigned.",
        });
        setTimeout(() => setToastNotification(null), 3500);
      }
    } catch (err) {
      console.error("Error making admin in group:", err);
    }
  };

  const handleDismissAdminInGroup = async (groupId, memberIdToDismiss) => {
    try {
      const res = await axios.put(dismissAdminGroupRoute, {
        groupId,
        memberIdToDismiss,
        requestedBy: currentUser?._id,
      });

      if (res.data?.status && res.data.group) {
        const updatedGroup = res.data.group;
        const systemMessage = res.data.systemMessage;

        setGroups((prev) =>
          prev.map((g) => (g._id === groupId ? { ...g, ...updatedGroup } : g))
        );
        setContacts((prev) =>
          prev.map((c) => (c._id === groupId ? { ...c, ...updatedGroup } : c))
        );
        if (currentChat && currentChat._id === groupId) {
          setCurrentChat((prev) => ({ ...prev, ...updatedGroup }));
        }

        if (systemMessage) {
          if (currentChatRef.current && currentChatRef.current._id === groupId) {
            setArrivalMessage(systemMessage);
          }
          if (socket?.current && updatedGroup.members) {
            socket.current.emit("send-msg", {
              from: currentUser._id,
              to: groupId,
              message: systemMessage.message,
              isGroup: true,
              groupId: groupId,
              isSystem: true,
              timestamp: systemMessage.timestamp,
              targetMemberIds: updatedGroup.members.map((m) => (m._id || m).toString()),
            });
          }
        }

        if (socket?.current && updatedGroup.members) {
          socket.current.emit("group-action", {
            action: "updated",
            groupId,
            group: updatedGroup,
            targetMemberIds: updatedGroup.members.map((m) => (m._id || m).toString()),
          });
        }

        setToastNotification({
          title: "Admin Dismissed",
          message: systemMessage?.message || "Admin dismissed.",
        });
        setTimeout(() => setToastNotification(null), 3500);
      }
    } catch (err) {
      console.error("Error dismissing admin in group:", err);
    }
  };

  const handleUpdateGroupAvatar = async (groupId, groupImage) => {
    try {
      const res = await axios.put(updateGroupAvatarRoute, {
        groupId,
        groupImage,
      });
      const updatedGroup = res.data.group;
      if (updatedGroup) {
        setGroups((prev) =>
          prev.map((g) => (g._id === groupId ? { ...g, avtarImage: updatedGroup.avtarImage } : g))
        );
        setContacts((prev) =>
          prev.map((c) => (c._id === groupId ? { ...c, avtarImage: updatedGroup.avtarImage } : c))
        );
        if (currentChat && currentChat._id === groupId) {
          setCurrentChat((prev) => ({ ...prev, avtarImage: updatedGroup.avtarImage }));
        }
        if (socket?.current && updatedGroup.members) {
          socket.current.emit("group-action", {
            action: "updated",
            groupId,
            group: updatedGroup,
            targetMemberIds: updatedGroup.members.map((m) => (m._id || m).toString()),
          });
        }
        setToastNotification({
          title: "Group Photo Updated",
          message: "Group profile picture was successfully changed.",
        });
        setTimeout(() => setToastNotification(null), 3500);
      }
    } catch (err) {
      console.error("Error updating group avatar:", err);
    }
  };

  const handleLeaveGroup = async (groupId) => {
    try {
      const res = await axios.post(leaveGroupRoute, {
        groupId,
        userId: currentUser?._id,
      });
      if (res.data?.status && res.data.group) {
        const updatedGroup = res.data.group;
        const systemMessage = res.data.systemMessage;

        // Keep group in user's chat list marked as isCurrentMember: false
        setGroups((prev) =>
          prev.map((g) => (g._id === groupId ? { ...g, ...updatedGroup, isCurrentMember: false } : g))
        );
        setContacts((prev) =>
          prev.map((c) => (c._id === groupId ? { ...c, ...updatedGroup, isCurrentMember: false } : c))
        );
        if (currentChat && currentChat._id === groupId) {
          setCurrentChat((prev) => ({ ...prev, ...updatedGroup, isCurrentMember: false }));
        }

        if (systemMessage) {
          if (currentChatRef.current && currentChatRef.current._id === groupId) {
            setArrivalMessage(systemMessage);
          }
          if (socket?.current && updatedGroup.members) {
            socket.current.emit("send-msg", {
              from: currentUser._id,
              to: groupId,
              message: systemMessage.message,
              isGroup: true,
              groupId: groupId,
              senderName: currentUser.username,
              isSystem: true,
              members: updatedGroup.members,
            });
          }
        }

        if (socket?.current && updatedGroup.members) {
          socket.current.emit("group-action", {
            action: "left",
            groupId,
            group: updatedGroup,
            targetMemberIds: updatedGroup.members.map((m) => (m._id || m).toString()),
          });
        }
        setToastNotification({
          title: "Left Group",
          message: "You have left the group.",
        });
        setTimeout(() => setToastNotification(null), 3500);
      }
    } catch (err) {
      console.error("Error leaving group:", err);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    try {
      const existingGroup = groups.find((g) => g._id === groupId);
      const memberIds = (existingGroup?.members || []).map((m) => (m._id || m).toString());

      const res = await axios.delete(deleteGroupRoute, {
        data: {
          groupId,
          userId: currentUser?._id,
        },
      });
      if (res.data?.status) {
        setGroups((prev) => prev.filter((g) => g._id !== groupId));
        setContacts((prev) => prev.filter((c) => c._id !== groupId));
        if (currentChat && currentChat._id === groupId) {
          setCurrentChat(undefined);
        }
        if (!res.data.removedForUser && socket?.current) {
          socket.current.emit("group-action", {
            action: "deleted",
            groupId,
            targetMemberIds: memberIds,
          });
        }
        setToastNotification({
          title: "Group Deleted",
          message: res.data.msg || "The group has been deleted.",
        });
        setTimeout(() => setToastNotification(null), 3500);
      }
    } catch (err) {
      console.error("Error deleting group:", err);
    }
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

      // Group Creation Real-time listener
      socket.current.on("group-created", (data) => {
        console.log("[FRONTEND] group-created event received:", data);
        const { group, creator } = data || {};
        if (group) {
          setGroups((prev) => [group, ...prev.filter((g) => g._id !== group._id)]);
          setContacts((prev) => [group, ...prev.filter((c) => c._id !== group._id)]);
          setToastNotification({
            title: "Added to Group",
            message: `You were added to group "${group.name}" by ${creator?.username || "Admin"}.`,
          });
          setTimeout(() => setToastNotification(null), 4500);
        }
      });

      // Group Action (update/leave/delete) Real-time listener
      socket.current.on("group-action", (data) => {
        console.log("[FRONTEND] group-action event received:", data);
        const { action, groupId, group } = data || {};
        if (action === "updated" && group) {
          setGroups((prev) =>
            prev.map((g) => (g._id === groupId ? { ...g, ...group } : g))
          );
          setContacts((prev) =>
            prev.map((c) => (c._id === groupId ? { ...c, ...group } : c))
          );
          if (currentChatRef.current && currentChatRef.current._id === groupId) {
            setCurrentChat((prev) => ({ ...prev, ...group }));
          }
        } else if (action === "deleted") {
          setGroups((prev) => prev.filter((g) => g._id !== groupId));
          setContacts((prev) => prev.filter((c) => c._id !== groupId));
          if (currentChatRef.current && currentChatRef.current._id === groupId) {
            setCurrentChat(undefined);
          }
          setToastNotification({
            title: "Group Deleted",
            message: "This group was deleted by the admin.",
          });
          setTimeout(() => setToastNotification(null), 4500);
        } else if (action === "left" && group) {
          setGroups((prev) =>
            prev.map((g) => (g._id === groupId ? { ...g, members: group.members } : g))
          );
          setContacts((prev) =>
            prev.map((c) => (c._id === groupId ? { ...c, members: group.members } : c))
          );
          if (currentChatRef.current && currentChatRef.current._id === groupId) {
            setCurrentChat((prev) => ({ ...prev, members: group.members }));
          }
        }
      });


      socket.current.on("msg-recieve", (data) => {
        console.log("[FRONTEND] msg-recieve event received at ChatPage:", data);
        const senderId = typeof data === "object" ? data.from : null;
        const msgText = typeof data === "object" ? (data.message || data.msg) : data;
        const imgpath = typeof data === "object" ? data.imgpath : null;
        const files = typeof data === "object" ? (data.files || []) : [];
        const isGroup = typeof data === "object" ? Boolean(data.isGroup) : false;
        const targetChatId = isGroup ? data.groupId : senderId;
        const timestamp = new Date().toISOString();

        // Check if message is from the active open chat / group
        if (currentChatRef.current && currentChatRef.current._id === targetChatId) {
          setArrivalMessage({
            fromSelf: false,
            message: msgText,
            imgpath: imgpath,
            files: files,
            senderName: data.senderName,
            senderAvatar: data.senderAvatar,
            isGroup,
            isSystem: Boolean(data.isSystem),
            timestamp,
          });

          // Mark immediately as read in DB if currently viewing this chat
          if (currentUser && targetChatId) {
            axios
              .put(markReadRoute, {
                from: targetChatId,
                to: currentUser._id,
                isGroup,
                groupId: isGroup ? targetChatId : null,
              })
              .catch(console.error);

            if (socket?.current) {
              socket.current.emit("mark-read", {
                from: currentUser._id,
                to: targetChatId,
                isGroup,
              });
            }
          }
        } else {
          // Message is from another contact or Welcome screen is open
          if (targetChatId) {
            setUnreadMessages((prev) => ({
              ...prev,
              [targetChatId]: (prev[targetChatId] || 0) + 1,
            }));
          }
        }

        // Live update sidebar contact's latestMessage preview and re-sort list to top
        if (targetChatId) {
          const displayMsg = isGroup && data.senderName ? `${data.senderName}: ${msgText}` : msgText;
          updateContactLastMessage(targetChatId, displayMsg, imgpath, senderId, timestamp, files);
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
          try {
            const [contactsRes, groupsRes] = await Promise.all([
              axios.get(`${contactsWithLastMessageRoute}/${currentUser._id}`),
              axios.get(`${getUserGroupsRoute}/${currentUser._id}`).catch(() => ({ data: [] })),
            ]);

            const contactsList = contactsRes.data || [];
            const groupsList = groupsRes.data || [];

            setGroups(groupsList);

            // Merge individual contacts and groups for the unified Chats tab
            const merged = [...groupsList, ...contactsList].sort((a, b) => {
              const timeA = new Date(a.lastMessageTimestamp || 0).getTime();
              const timeB = new Date(b.lastMessageTimestamp || 0).getTime();
              return timeB - timeA;
            });

            setContacts(merged);
          } catch (err) {
            console.error("Error loading contacts and groups:", err);
          }
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

      // Persist read status in database and notify sender via socket
      try {
        await axios.put(markReadRoute, {
          from: chat._id,
          to: currentUser._id,
          isGroup: Boolean(chat.isGroup),
          groupId: chat.isGroup ? chat._id : null,
        });
        if (socket?.current) {
          socket.current.emit("mark-read", {
            from: currentUser._id,
            to: chat._id,
            isGroup: Boolean(chat.isGroup),
          });
        }
      } catch (err) {
        console.error("Error marking messages as read:", err);
      }
    }
  };

  const handleStartCall = (contact, type = 'audio') => {
    setActiveCall({ contact, type });
  };

  return (
    <div className='chats-app-root' style={{ height: '100vh', width: '100vw', display: 'flex', backgroundColor: '#0c1317', overflow: 'hidden', margin: 0, padding: 0, position: 'relative' }}>
      {/* Toast Notification Banner */}
      {toastNotification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 99999,
            backgroundColor: '#202c33',
            border: '1px solid #00a884',
            borderRadius: '10px',
            padding: '12px 18px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '360px',
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          <div style={{ color: '#00a884', display: 'flex', alignItems: 'center' }}>
            <NotificationsActiveIcon style={{ fontSize: '24px' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#00a884', fontSize: '13px', fontWeight: 'bold' }}>
              {toastNotification.title}
            </div>
            <div style={{ color: '#e9edef', fontSize: '12.5px', marginTop: '2px' }}>
              {toastNotification.message}
            </div>
          </div>
          <span
            onClick={() => setToastNotification(null)}
            style={{ color: '#8696a0', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}
          >
            ✕
          </span>
        </div>
      )}

      {/* Active Call Modal Overlay */}
      {activeCall && (
        <CallModal
          callData={activeCall}
          contacts={contacts}
          currentUser={currentUser}
          onClose={() => setActiveCall(null)}
          onEndCall={handleEndCall}
        />
      )}

      {/* Left Icon Navigation Strip */}
      <div
        className='nav-sidebar'
        style={{
          width: '56px',
          minWidth: '56px',
          backgroundColor: '#202c33',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 0',
          boxSizing: 'border-box',
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>
          {/* Brand Logo */}
          <div title='ChatNex' style={{ color: '#00a884', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
            <FitbitIcon style={{ fontSize: '28px' }} />
          </div>

          {/* Chats Action Tab */}
          <div
            title='Chats'
            onClick={() => setActiveTab('chats')}
            style={{
              color: activeTab === 'chats' ? '#00a884' : '#8696a0',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              backgroundColor: activeTab === 'chats' ? 'rgba(0,168,132,0.15)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            <MessageIcon style={{ fontSize: '22px' }} />
          </div>

          {/* Calls Action Tab */}
          <div
            title='Calls'
            onClick={() => setActiveTab('calls')}
            style={{
              color: activeTab === 'calls' ? '#00a884' : '#8696a0',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              backgroundColor: activeTab === 'calls' ? 'rgba(0,168,132,0.15)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            <CallIcon style={{ fontSize: '22px' }} />
          </div>

          {/* Groups Action Tab */}
          <div
            title='Groups'
            onClick={() => setActiveTab('groups')}
            style={{
              color: activeTab === 'groups' ? '#00a884' : '#8696a0',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              backgroundColor: activeTab === 'groups' ? 'rgba(0,168,132,0.15)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            <GroupsIcon style={{ fontSize: '24px' }} />
          </div>
        </div>

        {/* Profile Avatar Button at Bottom */}
        <Profile
          currentUser={currentUser}
          currentUserName={currentUser?.username}
          currentUserImage={currentUser?.avtarImage}
          email={currentUser?.email}
          onUpdateAvatar={(newImage) => {
            setCurrentUser((prev) => ({
              ...prev,
              isAvtarImageSet: true,
              avtarImage: newImage,
            }));
          }}
        />
      </div>

      {/* Main App Window (Active Sidebar Panel + Chat Window) */}
      <div style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>
        {/* Dynamic Sidebar (340px) */}
        <div style={{ width: '340px', minWidth: '280px', maxWidth: '380px', borderRight: '1px solid rgba(255, 255, 255, 0.08)', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#111b21', flexShrink: 0 }}>
          {activeTab === 'chats' && (
            <Contacts
              contacts={contacts}
              currentUser={currentUser}
              changeChat={handleChatChange}
              unreadMessages={unreadMessages}
            />
          )}

          {activeTab === 'calls' && (
            <CallsPanel
              contacts={contacts.filter((c) => !c.isGroup)}
              currentUser={currentUser}
              callLogs={callLogs}
              selectedContact={selectedCallContact}
              onStartCall={handleStartCall}
              onClearCallLogs={handleClearCallLogs}
              onSelectContact={(contact) => setSelectedCallContact(contact)}
            />
          )}

          {activeTab === 'groups' && (
            <GroupsPanel
              contacts={contacts.filter((c) => !c.isGroup)}
              groups={groups}
              currentUser={currentUser}
              socket={socket}
              onGroupCreated={handleGroupCreated}
              onSelectContact={(group) => {
                handleChatChange(group);
                setActiveTab('chats');
              }}
            />
          )}
        </div>

        {/* Active View: ChatContainer / CallInfoView / Welcome */}
        <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#0b141a', overflow: 'hidden' }}>
          {activeTab === 'calls' ? (
            <CallInfoView
              contact={selectedCallContact}
              callLogs={callLogs}
              onStartCall={handleStartCall}
              onOpenChat={(c) => {
                handleChatChange(c);
                setActiveTab('chats');
              }}
            />
          ) : isLoaded && currentChat === undefined ? (
            <Welcome currentUser={currentUser} />
          ) : (
            <ChatContainer
              currentChat={currentChat}
              currentUser={currentUser}
              contacts={contacts}
              socket={socket}
              arrivalMessage={arrivalMessage}
              onMessageSent={updateContactLastMessage}
              onStartCall={handleStartCall}
              onOpenDirectChat={(member) => {
                handleChatChange(member);
                setActiveTab('chats');
              }}
              onAddMembersToGroup={handleAddMembersToGroup}
              onRemoveMemberFromGroup={handleRemoveMemberFromGroup}
              onMakeAdminInGroup={handleMakeAdminInGroup}
              onDismissAdminInGroup={handleDismissAdminInGroup}
              onUpdateGroupAvatar={handleUpdateGroupAvatar}
              onLeaveGroup={handleLeaveGroup}
              onDeleteGroup={handleDeleteGroup}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
