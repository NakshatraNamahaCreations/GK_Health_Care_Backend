const Notification = require('./notification.model');
const User = require('../users/user.model');
const ApiError = require('../../utils/ApiError');

async function listMine(userId, q) {
  const filter = { userId };
  if (typeof q.isRead === 'boolean') filter.isRead = q.isRead;
  if (q.type) filter.type = q.type;

  const skip = (q.page - 1) * q.limit;
  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId, isRead: false }),
  ]);

  return {
    items,
    meta: {
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.ceil(total / q.limit) || 1,
      unreadCount: unread,
    },
  };
}

async function markRead(id, userId) {
  const n = await Notification.findOne({ _id: id, userId });
  if (!n) throw ApiError.notFound('Notification not found');
  if (!n.isRead) {
    n.isRead = true;
    n.readAt = new Date();
    await n.save();
  }
  return n;
}

async function markAllRead(userId) {
  const res = await Notification.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
  return { updated: res.modifiedCount || 0 };
}

async function saveFcmToken(userId, token) {
  // De-duplicate via $addToSet; tokens are device-scoped so a user can have multiple.
  await User.updateOne({ _id: userId }, { $addToSet: { fcmTokens: token } });
  return { saved: true };
}

module.exports = { listMine, markRead, markAllRead, saveFcmToken };
