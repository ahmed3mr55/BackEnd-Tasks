const express = require("express");
const router = express.Router();
const { User } = require("../models/User");
const bcrypt = require("bcrypt");
const Joi = require("joi");

router.get("/me", async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const findUser = await User.findOne({ _id: user.id }).select("-password");
    if (!findUser) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ user: findUser });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.put("/update", async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const schema = Joi.object({
      firstName: Joi.string().max(15).trim(),
      lastName: Joi.string().max(15).trim(),
      email: Joi.string().email().min(6).max(50).trim(),
      password: Joi.string().min(6).max(1024).trim(),
    });
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    const findUser = await User.findOne({ _id: user.id });
    if (!findUser) {
      return res.status(404).json({ message: "User not found" });
    }
    const updates = {};
    if (req.body.firstName?.trim()) updates.firstName = req.body.firstName;
    if (req.body.lastName?.trim()) updates.lastName = req.body.lastName;
    if (req.body.email.trim()) updates.email = req.body.email;
    if (req.body.password?.trim()) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(req.body.password, salt);
    }
    const existingUser = await User.findOne({
      $or: [{ email: updates.email },],
      _id: { $ne: user.id },
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Email already exists" });
    }
    const updatedUser = await User.findOneAndUpdate({ _id: user.id }, updates, {
      new: true,
    });
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    return res
      .status(200)
      .json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

module.exports = router;
