const express = require("express");
require("dotenv").config();
const connectDB = require("./routes/db");
const app = express();
const cors = require("cors");
const { verifyToken } = require("./routes/verifyToken");
require("./routes/checkSubUser");
const xss = require("xss-clean");
const { checkSubscription } = require("./middlewares/checkSubscription");


// middleware
app.use(cors());
app.use(express.json());
app.use(xss());

const PORT = process.env.PORT || 5000;
connectDB();

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/task", verifyToken, checkSubscription, require("./routes/task"));
app.use("/api/pay", verifyToken, require("./routes/pay"));
app.use("/api/user", verifyToken, require("./routes/user"));
app.use("/api/admin/code", verifyToken, require("./routes/admin/code"));


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
