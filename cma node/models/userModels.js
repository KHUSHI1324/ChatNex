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
    isAvtarImageSet: {
        type: Boolean,
    },
    avtarImage: {
        type: String,
        default: "",
    }
});

const UserModel = mongoose.models.users || mongoose.model("users", userSchema);
try {
  if (!mongoose.models.User) {
    mongoose.model("User", userSchema);
  }
} catch (e) {}

module.exports = UserModel;