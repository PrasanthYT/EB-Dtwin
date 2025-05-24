const db = require("@dtwin/shared-database"); // Ensure this properly imports Sequelize models

const findById = async (userId) => {
  return await db.User.findByPk(userId);
};

const findByMobile = async (mobile_number) => {
  return await db.User.findOne({ where: { mobile_number } });
};

const createUser = async (userData) => {
  return await db.User.create(userData);
};

const updateUser = async (userId, updateData) => {
  const user = await db.User.findByPk(userId);
  if (!user) return null;
  return await user.update(updateData);
};

const deleteUser = async (userId) => {
  const user = await db.User.findByPk(userId);
  if (!user) return null;
  await user.destroy();
  return user;
};

const findByEmail = async (email) => {
  return await db.User.findOne({ where: { email } });
};

module.exports = {
  findById,
  findByMobile,
  findByEmail,
  createUser,
  updateUser,
  deleteUser,
};