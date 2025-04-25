const express = require("express");
const router = express.Router();
const { User } = require("../models/User");
const axios = require("axios");
const { Code } = require("../models/Code");

router.post("/mood", async (req, res) => {
  try {
    const user = req.user;
    const { mood } = req.body;
    const username = "ahmed";
    let amount = 0;
    if (
      !mood ||
      !["basic", "pro", "max", "small", "medium", "large"].includes(mood)
    ) {
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
        return res
          .status(400)
          .json({ message: "You can already use this mood" });
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
    };

    if (["small", "medium", "large"].includes(mood)) {
      userToUpdate.limitTasks += limitTasks[mood];
      userToUpdate.payTasksPlan = mood;
      await userToUpdate.save();
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
});

router.get("/code/:code", async (req, res) => {
  const user = req.user;
  const { code: codeString } = req.params;
  if (!user || !codeString)
    return res.status(400).json({ message: "User and code are required" });
  try {
    const giftCode = await Code.findOne({ code: codeString });
    if (!giftCode) return res.status(404).json({ message: "Invalid code" });
    if (giftCode.expiresAt && giftCode.expiresAt < new Date()) {
      return res.status(400).json({ message: "Code expired" });
    }
    if (giftCode.usageLimit && giftCode.usedCount >= giftCode.usageLimit) {
      return res.status(400).json({ message: "Code usage limit reached" });
    }
    return res.status(200).json({ code: giftCode });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.post("/redeem", async (req, res) => {
  const user = req.user;
  if (!user) return res.status(404).json({ message: "User not found" });
  const { code: codeString } = req.body;
  if (!codeString) return res.status(400).json({ message: "Code is required" });
  try {
    const giftCode = await Code.findOne({ code: codeString });
    if (!giftCode) return res.status(404).json({ message: "Invalid code" });
    if (giftCode.expiresAt && giftCode.expiresAt < new Date()) {
      return res.status(400).json({ message: "Code expired" });
    }
    if (giftCode.usageLimit && giftCode.usedCount >= giftCode.usageLimit) {
      return res.status(400).json({ message: "Code usage limit reached" });
    }
    if (giftCode.users.includes(user.id)) {
      return res.status(400).json({ message: "Code already used" });
    }
    const dbUser = await User.findById(user.id);
    if (!dbUser) return res.status(404).json({ message: "User not found" });
    if (giftCode.type === "tasks") {
      dbUser.limitTasks += giftCode.amount;
    } else if (giftCode.type === "subscription") {
      dbUser.mood = giftCode.mood;

      if (giftCode.mood === "pro") dbUser.limitTasks += 15;
      if (giftCode.mood === "max") dbUser.limitTasks += 30;

      const now = new Date();
      const newExpiry = new Date(now);
      newExpiry.setMonth(newExpiry.getMonth() + giftCode.amount);
      dbUser.subscriptionEndDate = newExpiry;
    }
    giftCode.usedCount += 1;
    giftCode.users.push(user.id);
    await giftCode.save();
    await dbUser.save();
    return res.status(200).json({ message: "Code redeemed successfully" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

module.exports = router;
