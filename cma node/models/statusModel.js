const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true,
    },
    mediaUrl: {
      type: String,
      default: '',
    },
    mediaType: {
      type: String,
      enum: ['image', 'video', 'text'],
      default: 'text',
    },
    caption: {
      type: String,
      default: '',
    },
    backgroundColor: {
      type: String,
      default: '#00a884',
    },
    viewers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'users',
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Auto expire after 24 hours (86400 seconds)
statusSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

const Status = mongoose.models.Status || mongoose.model('Status', statusSchema);

module.exports = Status;
