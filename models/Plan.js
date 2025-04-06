const mongoose = require("mongoose");

const planSchema = new mongoose.Schema({
    plan: {
        type: String,
        required: true,
        enum: ["basic", "pro", "max"],
        default: "basic",
    },
    price: {
        type: Number,
        required: true,
    },
    description: {
        type: String,
    },
});

const Plan = mongoose.model("Plan", planSchema);
module.exports = {Plan};