const express = require("express");
const router = express.Router();
const { Task } = require("../models/Task");
const { User } = require("../models/User");
const Joi = require("joi");
const crypto = require("crypto");
const algorithm = "aes-256-gcm"; // نوع التشفير

const key = crypto.scryptSync(process.env.CRYPTO_KEY, "salt", 32); // Key encryption 32 bytes


// Encrypt text
function encryptText(text) {
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);

  // Encrypt text
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
}

// Decrypt text
function decryptText(encryptedText) {
  if (!encryptedText.includes(':')) {
    return encryptedText;
  }
  
  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 3) {
      return encryptedText;
    }
    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    // Set the authentication tag
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    return encryptedText;
  }
}


router.get("/", async (req, res) => {
  try {
    const { title } = req.body;
    const rus = encryptText(title);
    const decrypt = decryptText(rus);
    return res.status(200).json({ rus, decrypt });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
})

// get all tasks user
router.get("/tasks", async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const tasks = await Task.find({ user: user.id });
    if (!tasks) {
      return res.status(404).json({ message: "Tasks not found" });
    }
    const decryptedTasks = tasks.map((task) => {
      return {
        ...task._doc,
        title: decryptText(task.title),
        body: decryptText(task.body),
      };
    })
    // Send tasks in the response
    return res.status(200).json({ tasks: decryptedTasks });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});



// create task
router.post("/create", async (req, res) => {
  const { title, body } = req.body;

  try {
    // التأكد من وجود المستخدم
    const user = req.user;
    if (!user) return res.status(404).json({ message: "User not found" });

    // التحقق من البيانات
    if (!title || !body) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // التحقق من صحة الإدخال باستخدام Joi
    const schema = Joi.object({
      title: Joi.string().max(50).trim().required(),
      body: Joi.string().max(500).trim().required(),
    });
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // البحث عن المستخدم
    const findUser = await User.findById(user.id);
    if (!findUser) return res.status(404).json({ message: "User not found" });

    // حساب عدد المهام للمستخدم
    const tasksCount = await Task.countDocuments({ user: user.id });

    // التحقق من الحد الأقصى بناءً على `mood`
    const maxTasks =
      findUser.mood === "basic" ? 5 : findUser.mood === "pro" ? 15 : 30;
    if (tasksCount >= maxTasks) {
      return res
        .status(400)
        .json({ message: `You can't create more than ${maxTasks} tasks` });
    }

    // إنشاء المهمة الجديدة
    const task = new Task({
      title : encryptText(title),
      body : encryptText(body),
      user: user.id,
    });
    await task.save();
    findUser.tasks += 1;
    await findUser.save();
    const decryptedTask = {
      ...task._doc,
      title: decryptText(task.title||""),
      body: decryptText(task.body||""),
    }
    const userSocketId = global.usersSockets.get(user.id);
    if (userSocketId) {
      io.to(userSocketId).emit("task-updated", { action: "create", task: decryptedTask });
    }
    
    return res.status(200).json({ message: "Task created successfully", task });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

// update task
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  try {
    // check if id is provided
    if (!id) return res.status(400).json({ message: "Task ID is required" });
    if (!user) return res.status(404).json({ message: "User not found" });
    const schema = Joi.object({
      title: Joi.string().max(30),
      body: Joi.string().max(150),
      status: Joi.string().valid("pending", "in-progress", "completed"),
    });
    const { error } = schema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });
    // search user
    const targetUser = await User.findById(user.id);
    if (!targetUser) return res.status(404).json({ message: "User not found" });
    // search task
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    // check if user is the owner of the task
    if (task.user.toString() !== user.id.toString())
      return res
        .status(403)
        .json({ message: "You are not authorized to update this task" });
    // check mood of user
    const maxUpdates =
      targetUser.mood === "basic" ? 1 : targetUser.mood === "pro" ? 5 : 10;
    if ((task.update || 0) >= maxUpdates) {
      return res
        .status(400)
        .json({
          message: `You can't update this task more than ${maxUpdates} times`,
        });
    }
    // update task
    const updates = {};
    if (req.body.title) updates.title  = encryptText(req.body.title);
    if (req.body.body) updates.body = encryptText(req.body.body);
    if (req.body.status) updates.status = req.body.status;
    // update task
    updates.update = (task.update || 0) + 1;
    const updatedTask = await Task.findOneAndUpdate({ _id: id }, updates, {
      new: true,
    });
    const decryptedTask = {
      ...updatedTask._doc,
      title: decryptText(updatedTask.title||""),
      body: decryptText(updatedTask.body||""),
    }
    // send task to user
    const userSocketId = global.usersSockets.get(user.id);
    if (userSocketId) {
      io.to(userSocketId).emit("task-updated", { action: "update", task: decryptedTask });
    }
    return res
      .status(200)
      .json({ message: "Task updated successfully", task: updatedTask });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

// delete task
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  try {
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!id) {
      return res.status(400).json({ message: "Task ID is required" });
    }
    const task = await Task.findOne({ _id: id });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    const findUser = await User.findById(user.id);
    if (!findUser) return res.status(404).json({ message: "User not found" });
    if (task.user.toString() !== user.id) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this task" });
    }
    await Task.deleteOne({ _id: id });
    findUser.tasks -= 1;
    await findUser.save();
    const userSocketId = global.usersSockets.get(user.id);
    if (userSocketId) {
      io.to(userSocketId).emit("task-updated", { action: "delete", taskId: id });
    }
    return res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

// Search tasks
router.get("/search", async (req, res) => {
  const { title } = req.body;
  const user = req.user;
  try {
    if (!user || !title) return res.status(400).json({ message: "All fields are required" });
    const tasks = await Task.find({ user: user.id, title: { $regex: title, $options: "i" } });
    return res.status(200).json({ tasks }); 
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
})

router.put("/status/:id", async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  try {
    if (!user || !id) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // التحقق من البيانات باستخدام Joi
    const schema = Joi.object({
      status: Joi.boolean().required(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // البحث عن المهمة
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    const findUser = await User.findById(user.id);
    if (!findUser) return res.status(404).json({ message: "User not found" });

    // التحقق من أن المستخدم هو صاحب المهمة
    if (task.user.toString() !== user.id) {
      return res.status(403).json({ message: "You are not authorized to update this task" });
    }

    // تحديث حالة المهمة
    task.status = !task.status;
    await task.save();
    findUser.tasksCompleted = task.status ? findUser.tasksCompleted + 1 : findUser.tasksCompleted - 1;
    await findUser.save();

    const userSocketId = global.usersSockets.get(user.id);
    if (userSocketId) {
      io.to(userSocketId).emit("task-updated", { action: "status", taskId: id });
    }

    return res.status(200).json({ message: "Task updated successfully", task });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
