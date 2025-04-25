const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../models/User");
const Joi = require("joi");


// login route
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }
        const schema = Joi.object({
            email: Joi.string().email().min(6).max(50).trim().required(),
            password: Joi.string().min(6).max(1024).trim().required(),
        })
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid password" });
        }
        // Generate JWT token
        const token = jwt.sign({ id: user._id, mood: user.mood, isAdmin: user.isAdmin }, process.env.SECRET_KEY, { expiresIn: "30d" });

        return res.status(200).json({ message: "Login successful", token, userId: user._id });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
})

// register route
router.post("/register", async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    try {
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const schema = Joi.object({
            firstName: Joi.string().max(15).trim().required(),
            lastName: Joi.string().max(15).trim().required(),
            email: Joi.string().email().min(6).max(50).trim().required(),
            password: Joi.string().min(6).max(1024).trim().required(),
        })
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword,
        })
        await user.save();
        // Generate JWT token
        const token = jwt.sign({ id: user._id, mood: user.mood, isAdmin: user.isAdmin }, process.env.SECRET_KEY, { expiresIn: "30d" });
        // Send token in the response
        return res.status(200).json({ message: "Registration successful", token, userId: user._id });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
})

module.exports = router;