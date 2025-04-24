const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("DB connected -_-");
  } catch (error) {
    console.log("Error connecting to DB:", error);
    process.exit(1);
  }
};

module.exports = connectDB;