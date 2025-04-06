const express = require("express");
const router = express.Router();
const { Plan } = require("../../models/plan");
const { User } = require("../../models/User");

async function isAdmin(req, res, next) {
    const user = req.user;
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    const findUser = await User.findOne({ _id: user.id });
    if (!findUser) return res.status(404).json({ message: "User not found" });
    if (findUser.isAdmin !== true) return res.status(403).json({ message: "You are not authorized to access this route" });
    next();
}

router.get("/plans", isAdmin, async (req, res) => {
    const user = req.user;
    if (!user) return res.status(404).json({ message: "User not found" });
    try {
        const plans = await Plan.find();
        if (!plans) return res.status(404).json({ message: "Plans not found" });
        return res.status(200).json({ plans });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
})

router.post("/create", isAdmin, async (req, res) => {
    const user = req.user;
    if (!user) return res.status(404).json({ message: "User not found" });
    try {
        const { plan, price, description } = req.body;
        if (!plan || !price ) return res.status(400).json({ message: "All fields are required" });
        const newPlan = new Plan({
            plan,
            price,
            description,
        })
        await newPlan.save();
        return res.status(200).json({ message: "Plan created successfully" });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
})

module.exports = router