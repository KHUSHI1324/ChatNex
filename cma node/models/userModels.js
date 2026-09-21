const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        min: 3,
        max: 10,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        max: 50,
        unique: true,
    },
    password: {
        type: String,
        required: true,
        min: 5,
    },
    about: {
        type: String,
        default: "Hey there! I am using ChatNex.",
        max: 150,
    },
    isAvtarImageSet: {
        type: Boolean,
    },
    avtarImage: {
        type: String,
        default: "",
    },
    privacySettings: {
        lastSeen: {
            type: String,
            enum: ['everyone', 'contacts', 'nobody'],
            default: 'everyone',
        },
        readReceipts: {
            type: Boolean,
            default: true,
        },
        profilePhoto: {
            type: String,
            enum: ['everyone', 'contacts', 'nobody'],
            default: 'everyone',
        },
        email: {
            type: String,
            enum: ['everyone', 'contacts', 'nobody'],
            default: 'everyone',
        },
        about: {
            type: String,
            enum: ['everyone', 'contacts', 'nobody'],
            default: 'everyone',
        },
    },
    blockedUsers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
        }
    ],
    passcode: {
        type: String,
        default: null,
    },
    isPasscodeEnabled: {
        type: Boolean,
        default: false,
    },
    savedContacts: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
        }
    ],
});

const UserModel = mongoose.models.users || mongoose.model("users", userSchema);
try {
  if (!mongoose.models.User) {
    mongoose.model("User", userSchema);
  }
} catch (e) {}

module.exports = UserModel;