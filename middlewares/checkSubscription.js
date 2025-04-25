// middlewares/checkSubscription.js
const { User } = require('../models/User');

const TASKS_BY_PLAN = { basic: 5, pro: 15, max: 30 };
const MS_PER_MONTH = 30 * 24 * 60 * 60 * 1000;

async function checkSubscription(req, res, next) {
  const dbUser = await User.findById(req.user.id);
  if (!dbUser) return res.status(404).json({ message: "User not found" });

  const now = Date.now();
  let { subscriptionEndDate, lastTaskReset, mood, limitTasks } = dbUser;

  if (subscriptionEndDate && subscriptionEndDate.getTime() < now && mood !== 'basic') {
    dbUser.mood = 'basic';
    mood = 'basic';
  }

  const lastResetTs = lastTaskReset ? lastTaskReset.getTime() : dbUser.createdAt.getTime();
  const elapsed = now - lastResetTs;
  const monthsElapsed = Math.floor(elapsed / MS_PER_MONTH);

  if (monthsElapsed > 0) {
    const tasksToAdd = TASKS_BY_PLAN[mood] * monthsElapsed;
    dbUser.limitTasks = (limitTasks || 0) + tasksToAdd;


    const newLastReset = new Date(lastResetTs + monthsElapsed * MS_PER_MONTH);
    dbUser.lastTaskReset = newLastReset;
  }

  await dbUser.save();
  next();
}

module.exports = { checkSubscription };
