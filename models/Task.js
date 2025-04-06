const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    body: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    status: {
        type: Boolean,
        required: true,
        default: "false"
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User",
    },
    update: {
        type: Number,
        required: true,
        default: 0
    },
})

const Task = mongoose.model("Task", taskSchema);

module.exports = { Task };