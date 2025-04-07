const express = require("express");
require("dotenv").config();
const connectDB = require("./routes/db");
const app = express();
const cors = require("cors");
const { verifyToken } = require("./routes/verifyToken");
require("./routes/checkSubUser");
const http = require("http");
const socketIo = require("socket.io");
const xss = require("xss-clean");

// middleware
app.use(cors());
app.use(xss());
app.use(express.json());
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "https://front-end-tasks-peach.vercel.app",
        methods: ["GET", "POST", "PUT", "DELETE"],
    },
});
global.io = io;
const usersSockets = new Map();
global.usersSockets = usersSockets;

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
  
    // استقبال معرف المستخدم وربطه بالسوكيت
    socket.on("register-user", (userId) => {
      usersSockets.set(userId, socket.id);
    });
  
    // عند فصل المستخدم، نحذفه من القائمة
    socket.on("disconnect", () => {
      for (const [userId, socketId] of usersSockets.entries()) {
        if (socketId === socket.id) {
          usersSockets.delete(userId);
          break;
        }
      }
      console.log("User disconnected:", socket.id);
    });
  });

const PORT = process.env.PORT || 5000;
connectDB();

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/task", verifyToken, require("./routes/task"));
app.use("/api/pay", verifyToken, require("./routes/pay"));
app.use("/api/user", verifyToken, require("./routes/user"));


server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
