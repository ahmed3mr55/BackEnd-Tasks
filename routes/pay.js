const express = require("express");
const router = express.Router();
const { User } = require("../models/User");
const axios = require("axios");
const jwt = require("jsonwebtoken");

router.post("/mood", async (req, res) => {
  try {
    const user = req.user;
    const { mood } = req.body;
    const username = "ahmed";
    let amount = 0;
    if (!mood || !["basic", "pro", "max", "small", "medium", "large"].includes(mood)) {
      return res.status(400).json({ message: "Invalid mood" });
    }
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const userToUpdate = await User.findOne({ _id: user.id });
    if (!userToUpdate) {
      return res.status(404).json({ message: "User not found" });
    }
    if (["pro", "max", "basic"].includes(mood)) {
      if (userToUpdate.mood === mood) {
        return res.status(400).json({ message: "You can already use this mood" });
      }
    }
    if (mood == "pro") amount = 650;
    if (mood == "max") amount = 750;
    if (mood == "small") amount = 15;
    if (mood == "medium") amount = 25;
    if (mood == "large") amount = 50;

    const { cardNumber, cvv, expiryDate, otp } = req.body;
    if (!amount || !cardNumber || !cvv || !expiryDate || !otp) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // payment process via api with axios
    const response = await axios.post(
      "https://back-money.vercel.app/api/pay/visa/pay",
      { amount, cardNumber, cvv, expiryDate, otp, username }
    );

    const limitTasks = {
      basic: 5,
      pro: 15,
      max: 30,
      small: 5,
      medium: 10,
      large: 15,
    }

    if (["small", "medium", "large"].includes(mood)) {
      userToUpdate.limitTasks += limitTasks[mood];
      userToUpdate.payTasksPlan = mood;
      userToUpdate.save();
      return res.status(200).json({
        message: "Payment processed successfully",
        data: response.data,
      });
    } else {
      userToUpdate.mood = mood;
      userToUpdate.subscriptionEndDate = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      );
      userToUpdate.limitTasks += limitTasks[mood];
      await userToUpdate.save();
      return res.status(200).json({
        message: "Payment processed successfully",
        data: response.data,
      });
    }
  } catch (error) {
    console.error(error);
    // error response
    if (error.response) {
      return res.status(error.response.status).json({
        message: error.response.data.message || "Error processing payment",
      });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
});

// get mood plan
router.get("/mood", async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const findUser = await User.findById(user.id);
    if (!findUser) return res.status(404).json({ message: "User not found" });
    return res.status(200).json({ mood: findUser.mood });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});


router.post("/mood/basic", async (req, res) => {
  const user = req.user;
  if (!user) return res.status(404).json({ message: "User not found" });
  try {
    const findUser = await User.findById(user.id);
    if (!findUser) return res.status(404).json({ message: "User not found" });
    findUser.mood = "basic";
    findUser.subscriptionEndDate = null;
    await findUser.save();
    return res.status(200).json({ mood: findUser.mood });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
})

module.exports = router;
