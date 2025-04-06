const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User",
    },
    plan: {
        type: String,
        required: true,
        enum: ["basic", "pro", "max"],
        default: "basic",
    },
    status: {
        type: String,
        required: true,
        enum: ["active", "cancelled"],
        default: "active",
    },
    startDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    amount: {
        type: Number,
        required: true,
        default: 0
    },
})

const Subscription = mongoose.model("Subscription", subscriptionSchema);
module.exports = Subscription;