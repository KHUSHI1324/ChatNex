export const host = process.env.REACT_APP_API_URL || 'http://localhost:1000';
console.log(host);
export const registerRoute = `${host}/api/auth/register`;
export const loginRoute = `${host}/api/auth/login`;
export const getUserRoute = `${host}/api/auth/user`;
export const generateAiAvatarRoute = `${host}/api/auth/generate-ai-avatar`;
export const AvtarRoute = `${host}/api/auth/avtar`;
export const logAvatarFallbackRoute = `${host}/api/auth/log-avatar-fallback`;
export const allUsersRoute = `${host}/api/auth/allusers`;
export const searchUsersRoute = `${host}/api/auth/search-users`;
export const updateProfileRoute = `${host}/api/auth/update-profile`;
export const addContactRoute = `${host}/api/auth/add-contact`;
export const removeContactRoute = `${host}/api/auth/remove-contact`;
export const contactsWithLastMessageRoute = `${host}/api/auth/contacts-with-last-message`;
console.log(allUsersRoute);
export const sendMessageRoute = `${host}/api/messages/addmsg`;
export const getAllMessagesRoute = `${host}/api/messages/getmsg`;
export const markReadRoute = `${host}/api/messages/mark-read`;
export const reactMessageRoute = `${host}/api/messages/react`;
export const editMessageRoute = `${host}/api/messages/edit`;
export const deleteMessageRoute = `${host}/api/messages/delete`;
export const pinMessageRoute = `${host}/api/messages/pin`;
export const starMessageRoute = `${host}/api/messages/star`;
export const imageapi = `${host}/api/messages/upload`;
export const createGroupRoute = `${host}/api/groups/create`;
export const getUserGroupsRoute = `${host}/api/groups/user-groups`;
export const addMembersGroupRoute = `${host}/api/groups/add-members`;
export const removeMemberGroupRoute = `${host}/api/groups/remove-member`;
export const makeAdminGroupRoute = `${host}/api/groups/make-admin`;
export const dismissAdminGroupRoute = `${host}/api/groups/dismiss-admin`;
export const updateGroupAvatarRoute = `${host}/api/groups/update-avatar`;
export const updateGroupDetailsRoute = `${host}/api/groups/update-details`;
export const leaveGroupRoute = `${host}/api/groups/leave`;
export const deleteGroupRoute = `${host}/api/groups/delete`;

// AI Superpower Routes
export const aiChatRoute = `${host}/api/ai/chat`;
export const aiTranslateRoute = `${host}/api/ai/translate`;
export const aiImagineRoute = `${host}/api/ai/imagine`;
export const aiTranscribeRoute = `${host}/api/ai/transcribe`;
export const aiRewriteRoute = `${host}/api/ai/rewrite`;
export const getAISessionsRoute = `${host}/api/messages/getaisessions`;
export const deleteAISessionRoute = `${host}/api/messages/deleteaisession`;

// Privacy & Security Routes
export const updatePrivacySettingsRoute = `${host}/api/auth/privacy-settings`;
export const blockUserRoute = `${host}/api/auth/block-user`;
export const unblockUserRoute = `${host}/api/auth/unblock-user`;
export const getBlockedUsersRoute = `${host}/api/auth/blocked-users`;
export const setPasscodeRoute = `${host}/api/auth/set-passcode`;
export const verifyPasscodeRoute = `${host}/api/auth/verify-passcode`;

// Stories / Status Routes
export const createStatusRoute = `${host}/api/status/create`;
export const getStatusRoute = `${host}/api/status/get`;
export const viewStatusRoute = `${host}/api/status/view`;
export const deleteStatusRoute = `${host}/api/status/delete`;

// Call History Database Routes
export const logCallRoute = `${host}/api/calls/log`;
export const getCallLogsRoute = `${host}/api/calls/user`;
export const clearCallLogsRoute = `${host}/api/calls/clear`;