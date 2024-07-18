const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  auth0Id: { type: String, required: true, unique: true },
  name: String,
  isInitialSetupComplete: { type: Boolean, default: false },
  subscriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subreddit' }]
});

module.exports = mongoose.model('User', UserSchema);