const Status = require('../models/statusModel');
const User = require('../models/userModels');

module.exports.createStatus = async (req, res, next) => {
  try {
    const { userId, mediaUrl, mediaType, caption, backgroundColor } = req.body;

    if (!userId) {
      return res.json({ status: false, msg: 'User ID is required' });
    }

    let finalMediaUrl = mediaUrl || '';
    let finalMediaType = mediaType || 'text';

    if (req.file) {
      if (req.file.buffer) {
        finalMediaUrl = `data:${req.file.mimetype || 'image/jpeg'};base64,${req.file.buffer.toString('base64')}`;
      } else if (req.file.filename) {
        finalMediaUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      }
      const mime = req.file.mimetype || '';
      if (mime.startsWith('image/')) finalMediaType = 'image';
      else if (mime.startsWith('video/')) finalMediaType = 'video';
    }

    const newStatus = await Status.create({
      user: userId,
      mediaUrl: finalMediaUrl,
      mediaType: finalMediaType,
      caption: caption || '',
      backgroundColor: backgroundColor || '#00a884',
      viewers: [],
    });

    const populatedStatus = await Status.findById(newStatus._id)
      .populate('user', 'username avtarImage isAvtarImageSet')
      .populate('viewers.user', 'username avtarImage isAvtarImageSet');

    return res.json({ status: true, newStatus: populatedStatus });
  } catch (ex) {
    next(ex);
  }
};

module.exports.getStatuses = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const activeStatuses = await Status.find({
      createdAt: { $gte: cutoff },
    })
      .sort({ createdAt: 1 })
      .populate('user', 'username avtarImage isAvtarImageSet')
      .populate('viewers.user', 'username avtarImage isAvtarImageSet');

    // Separate My Status from Contacts Statuses
    const myStatuses = [];
    const contactsMap = {};

    activeStatuses.forEach((status) => {
      const storyUser = status.user;
      if (!storyUser) return;

      const isMe = storyUser._id.toString() === userId.toString();
      if (isMe) {
        myStatuses.push(status);
      } else {
        const contactId = storyUser._id.toString();
        if (!contactsMap[contactId]) {
          contactsMap[contactId] = {
            user: storyUser,
            stories: [],
            hasUnseen: false,
            lastUpdated: status.createdAt,
          };
        }
        contactsMap[contactId].stories.push(status);
        contactsMap[contactId].lastUpdated = status.createdAt;

        // Check if current user viewed this story
        const viewedByMe = status.viewers.some(
          (v) => v.user?._id?.toString() === userId.toString()
        );
        if (!viewedByMe) {
          contactsMap[contactId].hasUnseen = true;
        }
      }
    });

    const contactStatuses = Object.values(contactsMap).sort(
      (a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated)
    );

    return res.json({
      status: true,
      myStatuses,
      contactStatuses,
    });
  } catch (ex) {
    next(ex);
  }
};

module.exports.viewStatus = async (req, res, next) => {
  try {
    const { statusId, viewerId } = req.body;
    if (!statusId || !viewerId) {
      return res.json({ status: false, msg: 'Missing statusId or viewerId' });
    }

    const statusDoc = await Status.findById(statusId);
    if (!statusDoc) {
      return res.json({ status: false, msg: 'Status not found' });
    }

    const alreadyViewed = statusDoc.viewers.some(
      (v) => v.user?.toString() === viewerId.toString()
    );

    if (!alreadyViewed) {
      statusDoc.viewers.push({
        user: viewerId,
        viewedAt: new Date(),
      });
      await statusDoc.save();
    }

    const updated = await Status.findById(statusId)
      .populate('user', 'username avtarImage isAvtarImageSet')
      .populate('viewers.user', 'username avtarImage isAvtarImageSet');

    return res.json({ status: true, statusDoc: updated });
  } catch (ex) {
    next(ex);
  }
};

module.exports.deleteStatus = async (req, res, next) => {
  try {
    const { statusId } = req.params;
    const { userId } = req.body;

    const statusDoc = await Status.findById(statusId);
    if (!statusDoc) {
      return res.json({ status: false, msg: 'Status not found' });
    }

    if (statusDoc.user.toString() !== userId.toString()) {
      return res.json({ status: false, msg: 'Unauthorized to delete this status' });
    }

    await Status.findByIdAndDelete(statusId);
    return res.json({ status: true, msg: 'Status deleted successfully' });
  } catch (ex) {
    next(ex);
  }
};
