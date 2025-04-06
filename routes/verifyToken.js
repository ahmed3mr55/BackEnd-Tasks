const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY;

function verifyToken(req, res, next) {
  const bearerHeader = req.headers.authorization;
  if (!bearerHeader) {
    return res.status(401).json({ message: "Authorization header is missing" });
  }

  const bearer = bearerHeader.split(" ");
  if (bearer[0] !== "Bearer" || !bearer[1]) {
    return res.status(403).json({ message: "Invalid token format" });
  }

  const token = bearer[1];
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      // تسجيل المحاولة الفاشلة
      console.error(`Token verification failed: ${err.message}`);
      return res.status(403).json({ message: "Access denied." });
    }

    // التحقق من صحة البيانات المفككة
    if (!decoded || !decoded.id) {
      return res.status(403).json({ message: "Invalid token payload" });
    }

    req.user = decoded;
    next();
  });
}

module.exports = { verifyToken };