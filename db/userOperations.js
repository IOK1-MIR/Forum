const User = require('../models/user'); 

async function createUserIfNotExists(auth0Id) {
  const user = await User.findOneAndUpdate(
    { auth0Id },
    { $setOnInsert: { auth0Id, isInitialSetupComplete: false } },
    { new: true, upsert: true }
  );
  return user;
}

async function updateUserDetails(auth0Id, name) {
  await User.findOneAndUpdate(
    { auth0Id }, 
    { name, isInitialSetupComplete: true });
}

module.exports = { createUserIfNotExists, updateUserDetails };
