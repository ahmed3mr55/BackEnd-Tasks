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
    if (!mood || !["basic", "pro", "max"].includes(mood)) {
      return res.status(400).json({ message: "Invalid mood" });
    }
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const userToUpdate = await User.findOne({ _id: user.id });
    if (!userToUpdate) {
      return res.status(404).json({ message: "User not found" });
    }
    if (userToUpdate.mood == mood) {
      return res.status(400).json({ message: "You can already use this mood" });
    }
    if (mood == "pro") amount = 650;
    if (mood == "max") amount = 750;

    const { cardNumber, cvv, expiryDate, otp } = req.body;
    if (!amount || !cardNumber || !cvv || !expiryDate || !otp) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // payment process via api with axios
    const response = await axios.post(
      "https://back-money.vercel.app/api/pay/visa/pay",
      { amount, cardNumber, cvv, expiryDate, otp, username }
    );

    userToUpdate.mood = mood;
    userToUpdate.subscriptionEndDate = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    );
    await userToUpdate.save();
    const token = jwt.sign(
      { id: userToUpdate._id, mood: userToUpdate.mood },
      process.env.SECRET_KEY,
      { expiresIn: "30d" }
    );
    // response data
    return res.status(200).json({
      message: "Payment processed successfully",
      data: response.data,
      token,
    });
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
