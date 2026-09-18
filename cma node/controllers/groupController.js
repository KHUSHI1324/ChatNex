const Group = require("../models/groupModel");
const messageModel = require("../models/messageModel");
const User = require("../models/userModels");
const mongoose = require("mongoose");

// Sleek vector group avatar encoded in base64
const DEFAULT_GROUP_SVG = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <rect width="100" height="100" rx="50" fill="#00a884"/>
    <circle cx="50" cy="38" r="15" fill="#111b21"/>
    <path d="M26 78c0-13.2 10.8-24 24-24s24 10.8 24 24z" fill="#111b21"/>
    <circle cx="75" cy="35" r="10" fill="#202c33"/>
    <path d="M60 68c2.4-7.2 8.4-12 16-12 9 0 16 6.8 16 16z" fill="#202c33"/>
  </svg>`
).toString("base64");

// Helper to check if a user is a group admin
const isGroupAdmin = (group, userId) => {
  if (!group || !userId) return false;
  const uStr = (userId._id || userId).toString();
  if (group.admin && (group.admin._id || group.admin).toString() === uStr) return true;
  if (Array.isArray(group.admins)) {
    return group.admins.some((a) => (a._id || a).toString() === uStr);
  }
  return false;
};

exports.createGroup = async (req, res, next) => {
  try {
    const { name, members = [], admin, groupImage } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ status: false, msg: "Group name is required" });
    }

    if (!admin) {
      return res.status(400).json({ status: false, msg: "Admin user ID is required" });
    }

    const adminIdStr = (admin._id || admin).toString();
    const adminUser = await User.findById(adminIdStr);
    const adminName = adminUser?.username || "Admin";

    const memberSet = new Set((Array.isArray(members) ? members : []).map((m) => (m._id || m).toString()));
    memberSet.add(adminIdStr);
    const memberIds = Array.from(memberSet).map((id) => new mongoose.Types.ObjectId(id));

    const avatar = groupImage && groupImage.trim() ? groupImage : DEFAULT_GROUP_SVG;

    const group = await Group.create({
      name: name.trim(),
      admin: new mongoose.Types.ObjectId(adminIdStr),
      admins: [new mongoose.Types.ObjectId(adminIdStr)],
      members: memberIds,
      pastMembers: [],
      groupImage: avatar,
      isGroup: true,
    });

    const populatedGroup = await Group.findById(group._id)
      .populate("members", "username email avtarImage _id")
      .populate("admin", "username email avtarImage _id")
      .populate("admins", "username email avtarImage _id");

    const creationText = `${adminName} created group "${name.trim()}"`;

    // Send an initial system message in the group
    const initialMsg = await messageModel.create({
      message: { text: creationText },
      users: memberIds.map((id) => id.toString()),
      sender: new mongoose.Types.ObjectId(adminIdStr),
      groupId: group._id,
      isGroup: true,
      isSystem: true,
      read: true,
      createdAt: new Date(),
    });

    const formattedGroup = {
      _id: populatedGroup._id,
      name: populatedGroup.name,
      username: populatedGroup.name,
      admin: populatedGroup.admin,
      admins: populatedGroup.admins && populatedGroup.admins.length > 0 ? populatedGroup.admins : [populatedGroup.admin],
      members: populatedGroup.members,
      pastMembers: populatedGroup.pastMembers || [],
      isCurrentMember: true,
      avtarImage: populatedGroup.groupImage || DEFAULT_GROUP_SVG,
      isGroup: true,
      isAvtarImageSet: true,
      latestMessage: {
        message: creationText,
        imgpath: "",
        files: [],
        timestamp: initialMsg.createdAt,
        sender: adminIdStr,
        isSystem: true,
      },
      lastMessageTimestamp: initialMsg.createdAt,
      unreadCount: 0,
    };

    return res.status(201).json({
      status: true,
      msg: "Group created successfully",
      group: formattedGroup,
      systemMessage: {
        _id: initialMsg._id,
        fromSelf: true,
        senderId: adminIdStr,
        senderName: adminName,
        message: creationText,
        isGroup: true,
        groupId: group._id,
        isSystem: true,
        timestamp: initialMsg.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating group:", error);
    next(error);
  }
};

exports.getUserGroups = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ status: false, msg: "User ID is required" });
    }

    const userIdStr = userId.toString();
    let userObjectId = null;
    try {
      userObjectId = new mongoose.Types.ObjectId(userIdStr);
    } catch (e) {
      userObjectId = null;
    }

    const queryFilters = [
      { members: userIdStr },
      { admin: userIdStr },
      { pastMembers: userIdStr },
    ];
    if (userObjectId) {
      queryFilters.push({ members: userObjectId });
      queryFilters.push({ admin: userObjectId });
      queryFilters.push({ pastMembers: userObjectId });
    }

    const groups = await Group.find({ $or: queryFilters })
      .populate("members", "username email avtarImage _id")
      .populate("admin", "username email avtarImage _id")
      .populate("admins", "username email avtarImage _id")
      .sort({ updatedAt: -1 });

    const formattedGroups = await Promise.all(
      groups.map(async (grp) => {
        const lastMsg = await messageModel
          .findOne({ groupId: grp._id })
          .sort({ createdAt: -1 })
          .populate("sender", "username");

        let preview = "";
        let imgpath = "";
        let files = [];
        let timestamp = grp.createdAt;
        let sender = null;
        let isSystem = false;

        if (lastMsg) {
          timestamp = lastMsg.createdAt;
          sender = lastMsg.sender;
          files = lastMsg.message?.files || [];
          imgpath = lastMsg.message?.imgpath || "";
          const text = lastMsg.message?.text || "";
          const senderName = lastMsg.sender?.username || "Someone";
          isSystem = Boolean(lastMsg.isSystem);

          if (isSystem) {
            preview = text;
          } else if (files.length > 0) {
            const count = files.length;
            const allImages = files.every((f) => f.fileType === "image" || (!f.fileType && /\.(png|jpe?g|webp|bmp|svg)$/i.test(f.url || f.filename || "")));
            const prefix = count > 1 ? (allImages ? `📷 ${count} photos` : `📎 ${count} files`) : (files[0].fileType === "video" ? "🎥 Video" : "📷 Photo");
            preview = text ? `${senderName}: ${prefix} ${text}` : `${senderName}: ${prefix}`;
          } else if (imgpath) {
            preview = `${senderName}: 📷 Photo`;
          } else if (text) {
            preview = `${senderName}: ${text}`;
          }
        }

        const isCurrentMember =
          grp.members.some((m) => (m._id || m).toString() === userIdStr) ||
          (grp.admin?._id || grp.admin || "").toString() === userIdStr ||
          (Array.isArray(grp.admins) && grp.admins.some((a) => (a._id || a).toString() === userIdStr));

        return {
          _id: grp._id,
          name: grp.name,
          username: grp.name,
          description: grp.description || "",
          permissions: grp.permissions || { sendMessages: "everyone", editGroupInfo: "everyone" },
          admin: grp.admin,
          admins: grp.admins && grp.admins.length > 0 ? grp.admins : (grp.admin ? [grp.admin] : []),
          members: grp.members,
          pastMembers: grp.pastMembers || [],
          isCurrentMember,
          avtarImage: grp.groupImage || DEFAULT_GROUP_SVG,
          isGroup: true,
          isAvtarImageSet: true,
          latestMessage: {
            message: preview || `${grp.members?.length || 0} members`,
            imgpath,
            files,
            timestamp,
            sender,
            isSystem,
          },
          lastMessageTimestamp: timestamp || grp.createdAt,
          unreadCount: 0,
        };
      })
    );

    return res.json(formattedGroups);
  } catch (error) {
    console.error("Error fetching user groups:", error);
    next(error);
  }
};

exports.addMembers = async (req, res, next) => {
  try {
    const { groupId, newMemberIds = [], addedBy } = req.body;
    if (!groupId) {
      return res.status(400).json({ status: false, msg: "Group ID is required" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ status: false, msg: "Group not found" });
    }

    // Check if addedBy is an admin of this group
    if (!isGroupAdmin(group, addedBy)) {
      return res.status(403).json({ status: false, msg: "Only group admins can add new members" });
    }

    const addedByUser = addedBy ? await User.findById(addedBy) : null;
    const addedByName = addedByUser?.username || "Admin";

    const newUsersDocs = await User.find({ _id: { $in: newMemberIds } });
    const newUserNames = newUsersDocs.map((u) => u.username).join(", ");

    const currentMemberSet = new Set(group.members.map((m) => m.toString()));
    newMemberIds.forEach((id) => currentMemberSet.add(id.toString()));

    const updatedMemberObjectIds = Array.from(currentMemberSet).map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    // Remove from pastMembers if re-added
    const newMemberIdStrs = new Set(newMemberIds.map((id) => id.toString()));
    group.pastMembers = (group.pastMembers || []).filter(
      (pm) => !newMemberIdStrs.has(pm.toString())
    );

    group.members = updatedMemberObjectIds;
    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate("members", "username email avtarImage _id")
      .populate("admin", "username email avtarImage _id")
      .populate("admins", "username email avtarImage _id");

    const systemText = `${addedByName} added ${newUserNames || "new member"}`;

    const systemMsg = await messageModel.create({
      message: { text: systemText },
      users: populatedGroup.members.map((m) => (m._id || m).toString()),
      sender: new mongoose.Types.ObjectId(addedBy || group.admin),
      groupId: group._id,
      isGroup: true,
      isSystem: true,
      read: true,
      createdAt: new Date(),
    });

    return res.json({
      status: true,
      msg: "Members added successfully",
      group: {
        _id: populatedGroup._id,
        name: populatedGroup.name,
        username: populatedGroup.name,
        admin: populatedGroup.admin,
        admins: populatedGroup.admins && populatedGroup.admins.length > 0 ? populatedGroup.admins : [populatedGroup.admin],
        members: populatedGroup.members,
        pastMembers: populatedGroup.pastMembers || [],
        isCurrentMember: true,
        avtarImage: populatedGroup.groupImage || DEFAULT_GROUP_SVG,
        isGroup: true,
        isAvtarImageSet: true,
      },
      systemMessage: {
        _id: systemMsg._id,
        fromSelf: false,
        senderId: addedBy,
        senderName: addedByName,
        message: systemText,
        isGroup: true,
        groupId: group._id,
        isSystem: true,
        timestamp: systemMsg.createdAt,
      },
    });
  } catch (error) {
    console.error("Error adding members to group:", error);
    next(error);
  }
};

exports.removeMember = async (req, res, next) => {
  try {
    const { groupId, memberIdToRemove, removedBy } = req.body;
    if (!groupId || !memberIdToRemove) {
      return res.status(400).json({ status: false, msg: "Group ID and Member ID to remove are required" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ status: false, msg: "Group not found" });
    }

    // Check if removedBy is an admin of this group
    if (!isGroupAdmin(group, removedBy)) {
      return res.status(403).json({ status: false, msg: "Only group admins can remove members" });
    }

    const adminUser = removedBy ? await User.findById(removedBy) : null;
    const adminName = adminUser?.username || "Admin";

    const targetUser = await User.findById(memberIdToRemove);
    const targetName = targetUser?.username || "Member";

    const memberIdStr = memberIdToRemove.toString();
    group.members = group.members.filter((m) => m.toString() !== memberIdStr);

    // Also remove from admins if they were an admin
    if (Array.isArray(group.admins)) {
      group.admins = group.admins.filter((a) => a.toString() !== memberIdStr);
      if (group.admins.length === 0 && group.members.length > 0) {
        group.admins = [group.members[0]];
        group.admin = group.members[0];
      }
    }

    const pastMemberSet = new Set((group.pastMembers || []).map((m) => m.toString()));
    pastMemberSet.add(memberIdStr);
    group.pastMembers = Array.from(pastMemberSet).map((id) => new mongoose.Types.ObjectId(id));

    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate("members", "username email avtarImage _id")
      .populate("admin", "username email avtarImage _id")
      .populate("admins", "username email avtarImage _id");

    const systemText = `${adminName} removed ${targetName}`;

    const systemMsg = await messageModel.create({
      message: { text: systemText },
      users: populatedGroup.members.map((m) => (m._id || m).toString()).concat(memberIdStr),
      sender: new mongoose.Types.ObjectId(removedBy || group.admin),
      groupId: group._id,
      isGroup: true,
      isSystem: true,
      read: true,
      createdAt: new Date(),
    });

    return res.json({
      status: true,
      msg: "Member removed successfully",
      removedMemberId: memberIdStr,
      group: {
        _id: populatedGroup._id,
        name: populatedGroup.name,
        username: populatedGroup.name,
        admin: populatedGroup.admin,
        admins: populatedGroup.admins && populatedGroup.admins.length > 0 ? populatedGroup.admins : [populatedGroup.admin],
        members: populatedGroup.members,
        pastMembers: populatedGroup.pastMembers || [],
        isCurrentMember: true,
        avtarImage: populatedGroup.groupImage || DEFAULT_GROUP_SVG,
        isGroup: true,
        isAvtarImageSet: true,
      },
      systemMessage: {
        _id: systemMsg._id,
        fromSelf: false,
        senderId: removedBy,
        senderName: adminName,
        message: systemText,
        isGroup: true,
        groupId: group._id,
        isSystem: true,
        timestamp: systemMsg.createdAt,
      },
    });
  } catch (error) {
    console.error("Error removing member from group:", error);
    next(error);
  }
};

exports.makeAdmin = async (req, res, next) => {
  try {
    const { groupId, memberIdToPromote, requestedBy } = req.body;
    if (!groupId || !memberIdToPromote || !requestedBy) {
      return res.status(400).json({ status: false, msg: "Group ID, target member ID, and admin ID are required" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ status: false, msg: "Group not found" });
    }

    // Only group admin can promote another member to admin
    if (!isGroupAdmin(group, requestedBy)) {
      return res.status(403).json({ status: false, msg: "Only group admins can make another member an admin" });
    }

    const targetIdStr = memberIdToPromote.toString();
    const isMember = group.members.some((m) => m.toString() === targetIdStr);
    if (!isMember) {
      return res.status(400).json({ status: false, msg: "Target user is not an active member of this group" });
    }

    const currentAdmins = (group.admins || [group.admin]).map((a) => (a._id || a).toString());
    const adminSet = new Set(currentAdmins);
    adminSet.add(targetIdStr);
    group.admins = Array.from(adminSet).map((id) => new mongoose.Types.ObjectId(id));

    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate("members", "username email avtarImage _id")
      .populate("admin", "username email avtarImage _id")
      .populate("admins", "username email avtarImage _id");

    const adminUser = await User.findById(requestedBy);
    const targetUser = await User.findById(memberIdToPromote);
    const adminName = adminUser?.username || "Admin";
    const targetName = targetUser?.username || "Member";

    const systemText = `${adminName} made ${targetName} a group admin`;

    const systemMsg = await messageModel.create({
      message: { text: systemText },
      users: populatedGroup.members.map((m) => (m._id || m).toString()),
      sender: new mongoose.Types.ObjectId(requestedBy),
      groupId: group._id,
      isGroup: true,
      isSystem: true,
      read: true,
      createdAt: new Date(),
    });

    return res.json({
      status: true,
      msg: `${targetName} is now a group admin`,
      group: {
        _id: populatedGroup._id,
        name: populatedGroup.name,
        username: populatedGroup.name,
        admin: populatedGroup.admin,
        admins: populatedGroup.admins && populatedGroup.admins.length > 0 ? populatedGroup.admins : [populatedGroup.admin],
        members: populatedGroup.members,
        pastMembers: populatedGroup.pastMembers || [],
        isCurrentMember: true,
        avtarImage: populatedGroup.groupImage || DEFAULT_GROUP_SVG,
        isGroup: true,
        isAvtarImageSet: true,
      },
      systemMessage: {
        _id: systemMsg._id,
        fromSelf: false,
        senderId: requestedBy,
        senderName: adminName,
        message: systemText,
        isGroup: true,
        groupId: group._id,
        isSystem: true,
        timestamp: systemMsg.createdAt,
      },
    });
  } catch (error) {
    console.error("Error making member admin:", error);
    next(error);
  }
};

exports.dismissAdmin = async (req, res, next) => {
  try {
    const { groupId, memberIdToDismiss, requestedBy } = req.body;
    if (!groupId || !memberIdToDismiss || !requestedBy) {
      return res.status(400).json({ status: false, msg: "Group ID, member ID, and admin ID are required" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ status: false, msg: "Group not found" });
    }

    // Only group admin can dismiss another admin
    if (!isGroupAdmin(group, requestedBy)) {
      return res.status(403).json({ status: false, msg: "Only group admins can dismiss other admins" });
    }

    const targetIdStr = memberIdToDismiss.toString();
    const currentAdmins = (group.admins || [group.admin]).map((a) => (a._id || a).toString());
    const remainingAdmins = currentAdmins.filter((a) => a !== targetIdStr);

    if (remainingAdmins.length === 0) {
      // Must keep at least the requester as admin
      remainingAdmins.push(requestedBy.toString());
    }

    group.admins = remainingAdmins.map((id) => new mongoose.Types.ObjectId(id));
    if (group.admin && group.admin.toString() === targetIdStr) {
      group.admin = group.admins[0];
    }

    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate("members", "username email avtarImage _id")
      .populate("admin", "username email avtarImage _id")
      .populate("admins", "username email avtarImage _id");

    const adminUser = await User.findById(requestedBy);
    const targetUser = await User.findById(memberIdToDismiss);
    const adminName = adminUser?.username || "Admin";
    const targetName = targetUser?.username || "Member";

    const systemText = `${adminName} dismissed ${targetName} as admin`;

    const systemMsg = await messageModel.create({
      message: { text: systemText },
      users: populatedGroup.members.map((m) => (m._id || m).toString()),
      sender: new mongoose.Types.ObjectId(requestedBy),
      groupId: group._id,
      isGroup: true,
      isSystem: true,
      read: true,
      createdAt: new Date(),
    });

    return res.json({
      status: true,
      msg: `${targetName} is no longer an admin`,
      group: {
        _id: populatedGroup._id,
        name: populatedGroup.name,
        username: populatedGroup.name,
        admin: populatedGroup.admin,
        admins: populatedGroup.admins && populatedGroup.admins.length > 0 ? populatedGroup.admins : [populatedGroup.admin],
        members: populatedGroup.members,
        pastMembers: populatedGroup.pastMembers || [],
        isCurrentMember: true,
        avtarImage: populatedGroup.groupImage || DEFAULT_GROUP_SVG,
        isGroup: true,
        isAvtarImageSet: true,
      },
      systemMessage: {
        _id: systemMsg._id,
        fromSelf: false,
        senderId: requestedBy,
        senderName: adminName,
        message: systemText,
        isGroup: true,
        groupId: group._id,
        isSystem: true,
        timestamp: systemMsg.createdAt,
      },
    });
  } catch (error) {
    console.error("Error dismissing admin:", error);
    next(error);
  }
};

exports.updateGroupAvatar = async (req, res, next) => {
  try {
    const { groupId, groupImage } = req.body;
    if (!groupId) {
      return res.status(400).json({ status: false, msg: "Group ID is required" });
    }
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ status: false, msg: "Group not found" });
    }

    group.groupImage = groupImage || DEFAULT_GROUP_SVG;
    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate("members", "username email avtarImage _id")
      .populate("admin", "username email avtarImage _id")
      .populate("admins", "username email avtarImage _id");

    return res.json({
      status: true,
      msg: "Group photo updated successfully",
      group: {
        _id: populatedGroup._id,
        name: populatedGroup.name,
        username: populatedGroup.name,
        admin: populatedGroup.admin,
        admins: populatedGroup.admins && populatedGroup.admins.length > 0 ? populatedGroup.admins : [populatedGroup.admin],
        members: populatedGroup.members,
        pastMembers: populatedGroup.pastMembers || [],
        avtarImage: populatedGroup.groupImage || DEFAULT_GROUP_SVG,
        description: populatedGroup.description || "",
        permissions: populatedGroup.permissions || { sendMessages: "everyone", editGroupInfo: "everyone" },
        isGroup: true,
        isAvtarImageSet: true,
      },
    });
  } catch (error) {
    console.error("Error updating group avatar:", error);
    next(error);
  }
};

exports.updateGroupDetails = async (req, res, next) => {
  try {
    const { groupId, name, description, permissions, updatedBy: updatedByField, userId } = req.body;
    const updatedBy = updatedByField || userId;
    if (!groupId) {
      return res.status(400).json({ status: false, msg: "Group ID is required" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ status: false, msg: "Group not found" });
    }

    const isAdmin = isGroupAdmin(group, updatedBy);
    const allowEditInfo = group.permissions?.editGroupInfo !== "admins" || isAdmin;
    if (!allowEditInfo) {
      return res.status(403).json({ status: false, msg: "Only admins can edit group info" });
    }

    let systemText = "";
    const updaterUser = updatedBy ? await User.findById(updatedBy) : null;
    const updaterName = updaterUser?.username || "Admin";

    if (name && name.trim() && name.trim() !== group.name) {
      systemText = `${updaterName} changed the group subject to "${name.trim()}"`;
      group.name = name.trim();
    }

    if (description !== undefined && description.trim() !== (group.description || "")) {
      group.description = description.trim();
      if (!systemText) {
        systemText = `${updaterName} updated the group description`;
      }
    }

    if (permissions && typeof permissions === "object" && isAdmin) {
      group.permissions = {
        sendMessages: permissions.sendMessages || group.permissions?.sendMessages || "everyone",
        editGroupInfo: permissions.editGroupInfo || group.permissions?.editGroupInfo || "everyone",
      };
      if (!systemText) {
        systemText = `${updaterName} updated group permissions`;
      }
    }

    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate("members", "username email avtarImage _id")
      .populate("admin", "username email avtarImage _id")
      .populate("admins", "username email avtarImage _id");

    let systemMsg = null;
    if (systemText) {
      systemMsg = await messageModel.create({
        message: { text: systemText },
        users: populatedGroup.members.map((m) => (m._id || m).toString()),
        sender: new mongoose.Types.ObjectId(updatedBy || group.admin),
        groupId: group._id,
        isGroup: true,
        isSystem: true,
        read: true,
        createdAt: new Date(),
      });
    }

    return res.json({
      status: true,
      msg: "Group details updated successfully",
      group: {
        _id: populatedGroup._id,
        name: populatedGroup.name,
        username: populatedGroup.name,
        description: populatedGroup.description || "",
        permissions: populatedGroup.permissions || { sendMessages: "everyone", editGroupInfo: "everyone" },
        admin: populatedGroup.admin,
        admins: populatedGroup.admins && populatedGroup.admins.length > 0 ? populatedGroup.admins : [populatedGroup.admin],
        members: populatedGroup.members,
        pastMembers: populatedGroup.pastMembers || [],
        isCurrentMember: true,
        avtarImage: populatedGroup.groupImage || DEFAULT_GROUP_SVG,
        isGroup: true,
        isAvtarImageSet: true,
      },
      systemMessage: systemMsg
        ? {
            _id: systemMsg._id,
            fromSelf: true,
            senderId: updatedBy,
            senderName: updaterName,
            message: systemText,
            isGroup: true,
            groupId: group._id,
            isSystem: true,
            timestamp: systemMsg.createdAt,
          }
        : null,
    });
  } catch (error) {
    console.error("Error updating group details:", error);
    next(error);
  }
};

exports.leaveGroup = async (req, res, next) => {
  try {
    const { groupId, userId } = req.body;
    if (!groupId || !userId) {
      return res.status(400).json({ status: false, msg: "Group ID and User ID are required" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ status: false, msg: "Group not found" });
    }

    const leavingUser = await User.findById(userId);
    const userName = leavingUser?.username || "A member";

    const userIdStr = userId.toString();
    const remainingMembers = group.members.filter(
      (m) => m.toString() !== userIdStr
    );

    group.members = remainingMembers;

    // Filter out from admins if they were an admin
    if (Array.isArray(group.admins)) {
      group.admins = group.admins.filter((a) => a.toString() !== userIdStr);
    }

    // Track user in pastMembers so the group is NOT deleted and chat history is retained
    const pastMemberSet = new Set((group.pastMembers || []).map((m) => m.toString()));
    pastMemberSet.add(userIdStr);
    group.pastMembers = Array.from(pastMemberSet).map((id) => new mongoose.Types.ObjectId(id));

    // If no admins left and members exist, assign first member as admin
    if ((!group.admins || group.admins.length === 0) && remainingMembers.length > 0) {
      group.admins = [remainingMembers[0]];
      group.admin = remainingMembers[0];
    } else if (group.admin && group.admin.toString() === userIdStr && remainingMembers.length > 0) {
      group.admin = group.admins && group.admins.length > 0 ? group.admins[0] : remainingMembers[0];
    }

    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate("members", "username email avtarImage _id")
      .populate("admin", "username email avtarImage _id")
      .populate("admins", "username email avtarImage _id");

    const systemText = `${userName} left`;

    const systemMsg = await messageModel.create({
      message: { text: systemText },
      users: populatedGroup.members.map((m) => (m._id || m).toString()).concat(userIdStr),
      sender: new mongoose.Types.ObjectId(userId),
      groupId: group._id,
      isGroup: true,
      isSystem: true,
      read: true,
      createdAt: new Date(),
    });

    return res.json({
      status: true,
      deleted: false,
      msg: "Left group successfully",
      groupId,
      group: {
        _id: populatedGroup._id,
        name: populatedGroup.name,
        username: populatedGroup.name,
        admin: populatedGroup.admin,
        admins: populatedGroup.admins && populatedGroup.admins.length > 0 ? populatedGroup.admins : [populatedGroup.admin],
        members: populatedGroup.members,
        pastMembers: populatedGroup.pastMembers || [],
        avtarImage: populatedGroup.groupImage || DEFAULT_GROUP_SVG,
        isGroup: true,
        isAvtarImageSet: true,
      },
      systemMessage: {
        _id: systemMsg._id,
        fromSelf: true,
        senderId: userId,
        senderName: userName,
        message: systemText,
        isGroup: true,
        groupId: group._id,
        isSystem: true,
        timestamp: systemMsg.createdAt,
      },
    });
  } catch (error) {
    console.error("Error leaving group:", error);
    next(error);
  }
};

exports.deleteGroup = async (req, res, next) => {
  try {
    const { groupId, userId } = req.body;
    if (!groupId || !userId) {
      return res.status(400).json({ status: false, msg: "Group ID and User ID are required" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ status: false, msg: "Group not found" });
    }

    const userIdStr = userId.toString();
    const isAdmin = isGroupAdmin(group, userId);
    const isCurrentMember = group.members.some((m) => m.toString() === userIdStr) || isAdmin;

    if (!isCurrentMember) {
      // User is a past member who already exited the group: remove group from their pastMembers
      group.pastMembers = (group.pastMembers || []).filter((pm) => pm.toString() !== userIdStr);
      await group.save();

      return res.json({
        status: true,
        removedForUser: true,
        msg: "Group removed from your chats",
        groupId,
      });
    }

    // Active Admin deleting group permanently
    if (!isAdmin) {
      return res.status(403).json({ status: false, msg: "Only group admins can permanently delete the group" });
    }

    await Group.findByIdAndDelete(groupId);
    await messageModel.deleteMany({ groupId: groupId });

    return res.json({
      status: true,
      removedForUser: false,
      msg: "Group permanently deleted successfully",
      groupId,
    });
  } catch (error) {
    console.error("Error deleting group:", error);
    next(error);
  }
};
