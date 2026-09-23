const User = require("../models/userModels");
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Helper to apply granular privacy rules to a user object based on viewer identity
const applyPrivacyFilter = (targetUser, viewerId) => {
    if (!targetUser) return targetUser;
    const target = targetUser.toObject ? targetUser.toObject() : { ...targetUser };
    const vStr = viewerId ? (viewerId._id || viewerId).toString() : null;
    const tStr = target._id ? (target._id._id || target._id).toString() : null;
    const isSelf = Boolean(vStr && tStr && vStr === tStr);

    if (isSelf) {
        return target;
    }

    const savedContacts = (target.savedContacts || []).map(c => (c._id || c).toString());
    const isContact = Boolean(vStr && savedContacts.includes(vStr));

    const privacy = target.privacySettings || {};
    const photoPrivacy = privacy.profilePhoto || 'everyone';
    const emailPrivacy = privacy.email || 'everyone';
    const aboutPrivacy = privacy.about || 'everyone';
    const lastSeenPrivacy = privacy.lastSeen || 'everyone';

    if (photoPrivacy === 'nobody' || (photoPrivacy === 'contacts' && !isContact)) {
        target.avtarImage = "";
        target.isAvtarImageSet = false;
    }

    if (emailPrivacy === 'nobody' || (emailPrivacy === 'contacts' && !isContact)) {
        target.email = "";
    }

    if (aboutPrivacy === 'nobody' || (aboutPrivacy === 'contacts' && !isContact)) {
        target.about = "";
    }

    if (lastSeenPrivacy === 'nobody' || (lastSeenPrivacy === 'contacts' && !isContact)) {
        target.lastSeen = null;
    }

    return target;
};

module.exports.applyPrivacyFilter = applyPrivacyFilter;

module.exports.register = async (req, res, next) => {

    try {
        const { username, email, password } = req.body;
        const usernameCheck = await User.findOne({ username });
        if (usernameCheck)
            return res.json({ msg: 'Username already used', status: false });

        const emailCheck = await User.findOne({ email });
        if (emailCheck)
            return res.json({ msg: 'Email already used', status: false });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            email, username,
            password: hashedPassword,
        });
        delete user.password;
        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRY || '7d' }
        );
        return res.json({ status: true, user, token });
    } catch (ex) {
        if (ex.code === 11000) {
            const keyPattern = ex.keyPattern || {};
            const keyValue = ex.keyValue || {};
            if (keyPattern.username || keyValue.username) {
                return res.json({ msg: 'Username already used', status: false });
            }
            if (keyPattern.email || keyValue.email) {
                return res.json({ msg: 'Email already used', status: false });
            }
            return res.json({ msg: 'Username or Email already in use', status: false });
        }
        next(ex);
    }
};

module.exports.login = async (req, res, next) => {

    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.json({ msg: 'Invalid email or password', status: false });
        }
        const user = await User.findOne({
            $or: [
                { username: username.trim() },
                { email: username.trim().toLowerCase() }
            ]
        });
        if (!user)
            return res.json({ msg: 'Invalid email or password', status: false });

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid)
            return res.json({ msg: "Invalid email or password", status: false });
        delete user.password;
        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRY || '7d' }
        );
        return res.json({ status: true, user, token });
    } catch (ex) {
        next(ex);
    }
};
module.exports.avtar = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ status: false, msg: "Authentication required" });
        }
        const avtarImage = req.body.image;
        const userData = await User.findByIdAndUpdate(userId, {
            isAvtarImageSet: true,
            avtarImage,
        }, { new: true });
        return res.json({
            isSet: userData.isAvtarImageSet,
            image: userData.avtarImage,
        });
    } catch (ex) {
        next(ex)
    }
};

module.exports.getUserById = async (req, res, next) => {
    try {
        const viewerId = req.user?.id;
        if (!viewerId) {
            return res.status(401).json({ status: false, msg: "Authentication required" });
        }
        const user = await User.findById(req.params.id).select("-password");
        if (!user) return res.json({ status: false, msg: "User not found" });
        return res.json({ status: true, user: applyPrivacyFilter(user, viewerId) });
    } catch (ex) {
        next(ex);
    }
};

module.exports.generateAiAvatar = async (req, res) => {
    try {
        const { prompt, style = "3d avatar", seed } = req.body || {};
        const cleanPrompt = (prompt || "stylish person avatar").trim();
        const enhancedPrompt = `${cleanPrompt}, ${style} style, clean avatar profile picture, high resolution headshot, centered, vivid colors`;
        const randomSeed = seed || Math.floor(Math.random() * 1000000);
        const aiUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=256&height=256&nologo=true&seed=${randomSeed}`;

        console.log(`[AI Avatar] Requesting Pollinations GPU for: "${cleanPrompt}" (seed: ${randomSeed})`);

        const fetchImage = async (url) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 18000);
            try {
                const response = await fetch(url, {
                    signal: controller.signal,
                    headers: { 'User-Agent': 'ChatNex-AI/2.0 (Mozilla/5.0)' }
                });
                clearTimeout(timeoutId);
                return response;
            } catch (err) {
                clearTimeout(timeoutId);
                throw err;
            }
        };

        let response = await fetchImage(aiUrl);

        // If rate limited or queue busy (429), wait 1.8s and retry with fresh seed
        if (response.status === 429) {
            console.log('[AI Avatar] Pollinations queue busy (429), retrying in 1.8s with fresh seed...');
            await new Promise(r => setTimeout(r, 1800));
            const retrySeed = Math.floor(Math.random() * 1000000);
            const retryUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=256&height=256&nologo=true&seed=${retrySeed}`;
            response = await fetchImage(retryUrl);
        }

        if (response.ok) {
            const buffer = await response.arrayBuffer();
            if (buffer && buffer.byteLength > 500) {
                const base64Image = Buffer.from(buffer).toString('base64');
                const contentType = response.headers.get('content-type') || 'image/jpeg';
                const dataUrl = `data:${contentType};base64,${base64Image}`;
                console.log(`[AI Avatar] Successfully generated real AI image (${buffer.byteLength} bytes) for: "${cleanPrompt}"`);
                return res.json({ status: true, image: dataUrl, source: 'ai' });
            }
        }
        console.warn(`[AI Avatar] Pollinations returned status ${response?.status}`);
    } catch (err) {
        console.warn(`[AI Avatar] Pollinations error/timeout: ${err?.message}`);
    }

    return res.json({ status: false, msg: "AI provider timed out" });
};

module.exports.logAvatarFallback = async (req, res) => {
    try {
        const { seed, reason, prompt } = req.body || {};
        console.log(`[Avatar Fallback] Pollinations.ai failed/timed out (${reason || 'timeout/network'}). Generated DiceBear local fallback for seed: "${seed || 'unknown'}" (Prompt: "${prompt || 'none'}").`);
        return res.json({ status: true });
    } catch (e) {
        return res.json({ status: false });
    }
};

module.exports.getAllUsers = async (req, res, next) => {
    try {
        const viewerId = req.user?.id;
        if (!viewerId) {
            return res.status(401).json({ status: false, msg: "Authentication required" });
        }
        const users = await User.find({ _id: { $ne: viewerId } }).select([
            "email",
            "username",
            "about",
            "privacySettings",
            "savedContacts",
            "avtarImage",
            "isAvtarImageSet",
            "_id",
        ]);
        const filteredUsers = users.map(u => applyPrivacyFilter(u, viewerId));
        return res.json(filteredUsers);
    } catch (ex) {
        next(ex);
    }
};

module.exports.getContactsWithLastMessage = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ status: false, msg: "Authentication required" });
        }
        const currentUserId = new mongoose.Types.ObjectId(userId);
        const currentUserIdStr = userId.toString();

        const currentUserDoc = await User.findById(currentUserId).select("savedContacts");
        const savedContactIds = (currentUserDoc?.savedContacts || []).map(id => new mongoose.Types.ObjectId(id));

        const contacts = await User.aggregate([
            {
                $match: {
                    _id: { $ne: currentUserId }
                }
            },
            {
                $lookup: {
                    from: "messages",
                    let: { contactIdStr: { $toString: "$_id" } },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $in: [currentUserIdStr, "$users"] },
                                        { $in: ["$$contactIdStr", "$users"] },
                                        { $ne: ["$isGroup", true] },
                                        { $eq: [{ $ifNull: ["$groupId", null] }, null] }
                                    ]
                                }
                            }
                        },
                        { $sort: { createdAt: -1 } },
                        { $limit: 1 }
                    ],
                    as: "lastMessageData"
                }
            },
            {
                $lookup: {
                    from: "messages",
                    let: { contactIdStr: { $toString: "$_id" }, contactObjId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $in: [currentUserIdStr, "$users"] },
                                        { $in: ["$$contactIdStr", "$users"] },
                                        { $eq: ["$sender", "$$contactObjId"] },
                                        { $eq: ["$read", false] },
                                        { $ne: ["$isGroup", true] },
                                        { $eq: [{ $ifNull: ["$groupId", null] }, null] }
                                    ]
                                }
                            }
                        },
                        { $count: "count" }
                    ],
                    as: "unreadData"
                }
            },
            {
                $addFields: {
                    lastMessageDoc: { $arrayElemAt: ["$lastMessageData", 0] },
                    unreadCountVal: { $ifNull: [{ $arrayElemAt: ["$unreadData.count", 0] }, 0] }
                }
            },
            {
                $match: {
                    $or: [
                        { lastMessageDoc: { $exists: true, $ne: null } },
                        { _id: { $in: savedContactIds } }
                    ]
                }
            },
            {
                $project: {
                    _id: 1,
                    username: 1,
                    email: 1,
                    about: 1,
                    privacySettings: 1,
                    savedContacts: 1,
                    avtarImage: 1,
                    isAvtarImageSet: 1,
                    lastMessageDoc: 1,
                    unreadCount: "$unreadCountVal"
                }
            },
            {
                $sort: {
                    "lastMessageDoc.createdAt": -1,
                    username: 1
                }
            }
        ]);

        const formattedContacts = contacts.map(contact => {
            const lastMsg = contact.lastMessageDoc;
            let preview = "";
            let imgpath = "";
            let files = [];
            let timestamp = null;
            let sender = null;

            if (lastMsg) {
                timestamp = lastMsg.createdAt;
                sender = lastMsg.sender;
                files = lastMsg.message?.files || [];
                imgpath = lastMsg.message?.imgpath || "";
                const text = lastMsg.message?.text || "";

                if (files.length > 0) {
                    const count = files.length;
                    const allImages = files.every(f => f.fileType === "image" || (!f.fileType && /\.(png|jpe?g|webp|bmp|svg)$/i.test(f.url || f.filename || "")));
                    const single = files[0];
                    const singleExt = (single.filename || single.url || "").split(".").pop().toLowerCase();
                    let prefix = "";
                    if (count > 1) {
                        prefix = allImages ? `📷 ${count} photos` : `📎 ${count} files`;
                    } else {
                        if (single.fileType === "video" || /\.(mp4|webm|mov|mkv|avi|ogg)$/i.test(single.url || single.filename || "")) prefix = "🎥 Video";
                        else if (single.fileType === "gif" || singleExt === "gif") prefix = "👾 GIF";
                        else if (single.fileType === "image") prefix = "📷 Photo";
                        else if (single.fileType === "pdf" || single.fileType === "doc" || ["pdf", "doc", "docx"].includes(singleExt)) prefix = "📄 Document";
                        else if (single.fileType === "sheet" || ["xls", "xlsx", "csv"].includes(singleExt)) prefix = "📊 Spreadsheet";
                        else prefix = "📎 File";
                    }

                    if (text && text.trim() && !text.startsWith("📷") && !text.startsWith("🎥") && !text.startsWith("👾") && !text.startsWith("📄") && !text.startsWith("📊") && !text.startsWith("📎") && !/\.(png|jpe?g|gif|webp|bmp|svg|mp4|webm|mov|pdf|docx?|xlsx?|csv)$/i.test(text.trim())) {
                        preview = `${prefix}: ${text.trim()}`;
                    } else if (text && (text.startsWith("📷") || text.startsWith("🎥") || text.startsWith("👾") || text.startsWith("📄") || text.startsWith("📊") || text.startsWith("📎"))) {
                        preview = text;
                    } else {
                        preview = prefix;
                    }
                } else if (imgpath) {
                    const ext = (imgpath.split(".").pop() || "").toLowerCase();
                    let prefix = "📷 Photo";
                    if (["mp4", "webm", "mov", "mkv", "avi"].includes(ext)) prefix = "🎥 Video";
                    else if (ext === "gif") prefix = "👾 GIF";
                    else if (["pdf", "doc", "docx"].includes(ext)) prefix = "📄 Document";
                    else if (["xls", "xlsx", "csv"].includes(ext)) prefix = "📊 Spreadsheet";

                    if (text && text.trim() && !text.startsWith("📷") && !text.startsWith("🎥") && !text.startsWith("👾") && !text.startsWith("📄") && !text.startsWith("📊") && !text.startsWith("📎") && !/\.(png|jpe?g|gif|webp|bmp|svg|mp4|webm|mov|pdf|docx?|xlsx?|csv)$/i.test(text.trim())) {
                        preview = `${prefix}: ${text.trim()}`;
                    } else if (text && (text.startsWith("📷") || text.startsWith("🎥") || text.startsWith("👾") || text.startsWith("📄") || text.startsWith("📊") || text.startsWith("📎"))) {
                        preview = text;
                    } else {
                        preview = prefix;
                    }
                } else {
                    preview = text || "";
                }
            }

            const filtered = applyPrivacyFilter(contact, currentUserIdStr);

            return {
                _id: contact._id,
                username: contact.username,
                email: filtered.email,
                about: filtered.about !== undefined ? filtered.about : (contact.about || "Hey there! I am using ChatNex."),
                privacySettings: {
                    lastSeen: contact.privacySettings?.lastSeen || 'everyone',
                    readReceipts: contact.privacySettings?.readReceipts !== false,
                    profilePhoto: contact.privacySettings?.profilePhoto || 'everyone',
                    email: contact.privacySettings?.email || 'everyone',
                    about: contact.privacySettings?.about || 'everyone'
                },
                savedContacts: contact.savedContacts || [],
                avtarImage: filtered.avtarImage,
                isAvtarImageSet: filtered.isAvtarImageSet,
                latestMessage: {
                    message: preview,
                    imgpath: imgpath,
                    files: files,
                    timestamp: timestamp,
                    sender: sender
                },
                lastMessageTimestamp: timestamp || new Date(0),
                unreadCount: contact.unreadCount
            };
        });

        return res.json(formattedContacts);
    } catch (ex) {
        next(ex);
    }
};

module.exports.updateProfile = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ status: false, msg: "Authentication required" });
        }
        const { username, about } = req.body;
        const updateData = {};
        if (about !== undefined) updateData.about = about;
        if (username !== undefined && username.trim()) {
            const existing = await User.findOne({ username: username.trim(), _id: { $ne: userId } });
            if (existing) {
                return res.json({ status: false, msg: "Username already in use" });
            }
            updateData.username = username.trim();
        }
        const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).select("-password -passcode");
        if (!user) return res.json({ status: false, msg: "User not found" });
        return res.json({ status: true, user });
    } catch (ex) {
        next(ex);
    }
};

module.exports.updatePrivacySettings = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ status: false, msg: "Authentication required" });
        }
        const { privacySettings } = req.body;
        const user = await User.findByIdAndUpdate(
            userId,
            { privacySettings },
            { new: true }
        ).select("-password -passcode");
        if (!user) return res.json({ status: false, msg: "User not found" });
        return res.json({ status: true, user, privacySettings: user.privacySettings });
    } catch (ex) {
        next(ex);
    }
};

module.exports.blockUser = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ status: false, msg: "Authentication required" });
        }
        const { targetUserId } = req.body;
        const user = await User.findByIdAndUpdate(
            userId,
            { $addToSet: { blockedUsers: targetUserId } },
            { new: true }
        ).populate("blockedUsers", "username email avtarImage isAvtarImageSet");
        return res.json({ status: true, blockedUsers: user.blockedUsers || [] });
    } catch (ex) {
        next(ex);
    }
};

module.exports.unblockUser = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ status: false, msg: "Authentication required" });
        }
        const { targetUserId } = req.body;
        const user = await User.findByIdAndUpdate(
            userId,
            { $pull: { blockedUsers: targetUserId } },
            { new: true }
        ).populate("blockedUsers", "username email avtarImage isAvtarImageSet");
        return res.json({ status: true, blockedUsers: user.blockedUsers || [] });
    } catch (ex) {
        next(ex);
    }
};

module.exports.getBlockedUsers = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ status: false, msg: "Authentication required" });
        }
        const user = await User.findById(userId).populate("blockedUsers", "username email avtarImage isAvtarImageSet");
        if (!user) return res.json({ status: false, msg: "User not found" });
        return res.json({ status: true, blockedUsers: user.blockedUsers || [] });
    } catch (ex) {
        next(ex);
    }
};

module.exports.setPasscode = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ status: false, msg: "Authentication required" });
        }
        const { passcode, isPasscodeEnabled } = req.body;
        const updateData = { isPasscodeEnabled: !!isPasscodeEnabled };
        if (passcode) {
            updateData.passcode = await bcrypt.hash(passcode.toString(), 10);
        }
        if (isPasscodeEnabled === false) {
            updateData.passcode = null;
        }
        const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).select("-password -passcode");
        return res.json({ status: true, isPasscodeEnabled: user.isPasscodeEnabled });
    } catch (ex) {
        next(ex);
    }
};

// In-memory attempt tracking per userId for passcode verification
const passcodeAttempts = new Map();
const MAX_PASSCODE_ATTEMPTS = 5;
const PASSCODE_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

module.exports.verifyPasscode = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ status: false, msg: "Authentication required" });
        }
        const { passcode } = req.body || {};

        const now = Date.now();
        const userIdStr = userId.toString();
        const attemptRecord = passcodeAttempts.get(userIdStr) || { count: 0, lockUntil: null };

        if (attemptRecord.lockUntil && attemptRecord.lockUntil > now) {
            const remainingMinutes = Math.ceil((attemptRecord.lockUntil - now) / 60000);
            return res.status(429).json({
                status: false,
                msg: `Too many attempts. Try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`,
            });
        }

        if (attemptRecord.lockUntil && attemptRecord.lockUntil <= now) {
            attemptRecord.count = 0;
            attemptRecord.lockUntil = null;
        }

        const user = await User.findById(userId);
        if (!user || !user.passcode) {
            return res.json({ status: false, msg: "No passcode set" });
        }

        const isValid = await bcrypt.compare(passcode ? passcode.toString() : "", user.passcode);
        if (!isValid) {
            attemptRecord.count += 1;
            if (attemptRecord.count >= MAX_PASSCODE_ATTEMPTS) {
                attemptRecord.lockUntil = now + PASSCODE_COOLDOWN_MS;
                passcodeAttempts.set(userIdStr, attemptRecord);
                const remainingMinutes = Math.ceil(PASSCODE_COOLDOWN_MS / 60000);
                return res.status(429).json({
                    status: false,
                    msg: `Too many attempts. Try again in ${remainingMinutes} minutes.`,
                });
            }
            passcodeAttempts.set(userIdStr, attemptRecord);
            return res.json({ status: false, msg: "Incorrect passcode PIN" });
        }

        // Reset attempt counter on success
        passcodeAttempts.delete(userIdStr);
        return res.json({ status: true, msg: "Passcode verified" });
    } catch (ex) {
        next(ex);
    }
};

module.exports._resetPasscodeAttempts = () => passcodeAttempts.clear();

module.exports.searchUsers = async (req, res, next) => {
    try {
        const viewerId = req.user?.id;
        if (!viewerId) {
            return res.status(401).json({ status: false, msg: "Authentication required" });
        }
        const { q } = req.query;
        if (!q || q.trim() === '') {
            return res.json([]);
        }
        const cleanQuery = q.trim();
        const regex = new RegExp(cleanQuery, 'i');

        let filter = {
            username: regex
        };

        if (viewerId && mongoose.Types.ObjectId.isValid(viewerId)) {
            filter._id = { $ne: new mongoose.Types.ObjectId(viewerId) };
        }

        const users = await User.find(filter)
            .select("username avtarImage isAvtarImageSet about privacySettings savedContacts _id")
            .limit(20);

        const filteredUsers = users.map(u => applyPrivacyFilter(u, viewerId));
        return res.json(filteredUsers);
    } catch (ex) {
        next(ex);
    }
};

module.exports.addContact = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ status: false, msg: "Authentication required" });
        }
        const { contactId } = req.body;
        if (!contactId) {
            return res.json({ status: false, message: "Contact ID is required" });
        }
        await User.findByIdAndUpdate(
            userId,
            { $addToSet: { savedContacts: new mongoose.Types.ObjectId(contactId) } }
        );
        const addedContact = await User.findById(contactId).select(["_id", "username", "email", "about", "privacySettings", "savedContacts", "avtarImage", "isAvtarImageSet"]);
        const filteredContact = applyPrivacyFilter(addedContact, userId);
        return res.json({ status: true, contact: filteredContact, message: "Contact added successfully" });
    } catch (ex) {
        next(ex);
    }
};

module.exports.removeContact = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ status: false, msg: "Authentication required" });
        }
        const { contactId } = req.body;
        if (!contactId) {
            return res.json({ status: false, message: "Contact ID is required" });
        }
        await User.findByIdAndUpdate(
            userId,
            { $pull: { savedContacts: new mongoose.Types.ObjectId(contactId) } }
        );
        return res.json({ status: true, message: "Contact removed successfully" });
    } catch (ex) {
        next(ex);
    }
};