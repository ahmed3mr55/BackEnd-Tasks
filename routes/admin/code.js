const express = require('express');
const router = express.Router();
const { Code } = require('../../models/Code');
const { User } = require('../../models/User');
const Joi = require('joi');

async function generateCode(length = 8) {
    const charts = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += charts.charAt(Math.floor(Math.random() * charts.length));
    }
    return result;
}

router.post("/create", async (req, res) => {
    const user = req.user;
    if (!user || !user.isAdmin) return res.status(403).json({ message: "Access denied" });
    const { type, amount, usageLimit, expiresAt, mood } = req.body;
    try {
        const raw = await generateCode();
        const code = await Code.create({
            code: raw,
            type,
            amount,
            usageLimit,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            mood
        });
        return res.status(201).json({ code: code.code });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
})

module.exports = router;