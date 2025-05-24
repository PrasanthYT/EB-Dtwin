const db = require("@dtwin/shared-database"); // Ensure this properly imports Sequelize models

const findById = async (userId) => {
  return await db.UserProfile.findByPk(userId);
};

const createProfile = async (profileData) => {
  return await db.UserProfile.create(profileData);
};

const updateProfile = async (userId, updateData) => {
  const profile = await db.UserProfile.findByPk(userId);
  if (!profile) return null;
  return profile.update(updateData);
};

const deleteProfile = async (userId) => {
  const profile = await db.UserProfile.findByPk(userId);
  if (!profile) return null;
  await profile.destroy();
  return profile;
};

const getHealthScore = async (userId) => {
  const profile = await db.UserProfile.findByPk(userId);
  if (!profile) return null;
  return profile.health_score;
}

module.exports = {
  findById,
  createProfile,
  updateProfile,
  deleteProfile,
  getHealthScore,
};
