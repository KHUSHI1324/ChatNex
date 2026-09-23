const jwt = require("jsonwebtoken");
require("dotenv").config();

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];

  if (!authHeader) {
    return res.status(401).json({ status: false, msg: "No token provided" });
  }

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ status: false, msg: "Invalid authorization format" });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ status: false, msg: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, username: decoded.username };
    return next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ status: false, msg: "Token expired, please log in again" });
    }
    return res.status(401).json({ status: false, msg: "Invalid token" });
  }
};

module.exports = verifyToken;
