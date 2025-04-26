// middlewares/checkSubscription.js
const { User } = require("../models/User");

const TASKS_BY_PLAN = { basic: 5, pro: 15, max: 30 };
const MS_PER_MONTH = 30 * 24 * 60 * 60 * 1000;

async function checkSubscription(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });

  const dbUser = await User.findById(req.user.id);
  if (!dbUser) return res.status(404).json({ message: "User not found" });

  const now = Date.now();

  if (dbUser.subscriptionEndDate?.getTime() < now && dbUser.mood !== "basic") {
    dbUser.mood = "basic";
  }

  const lastResetTs =
    dbUser.lastTaskReset?.getTime() ?? dbUser.createdAt?.getTime() ?? now;
  const monthsElapsed = Math.floor((now - lastResetTs) / MS_PER_MONTH);

  if (monthsElapsed > 0) {
    const planTasks = TASKS_BY_PLAN[dbUser.mood] ?? TASKS_BY_PLAN.basic;
    dbUser.limitTasks = (dbUser.limitTasks || 0) + planTasks * monthsElapsed;

    dbUser.lastTaskReset = new Date(lastResetTs + monthsElapsed * MS_PER_MONTH);
  }

  await dbUser.save();
  next();
}

module.exports = { checkSubscription };
