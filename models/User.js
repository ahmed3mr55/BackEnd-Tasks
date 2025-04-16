const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    mood: {
        type: String,
        required: true,
        trim: true,
        enum: ["basic", "pro", "max"],
        default: "basic",
    },
    isAdmin: {
        type: Boolean,
        required: true,
        default: false
    },
    subscriptionEndDate: {
        type: Date,
    },
    tasks: {
        type: Number,
        required: true,
        default: 0
    },
    limitTasks: {
        type: Number,
        required: true,
        default: 5
    },
    offerTasks: {
        type: Number,
        required: true,
        default: 5
    },
    tasksCompleted: {
        type: Number,
        required: true,
        default: 0
    },
})

const User = mongoose.model("User", userSchema);

module.exports = { User };