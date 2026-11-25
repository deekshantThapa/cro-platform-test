const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res
            .status(StatusCodes.UNAUTHORIZED)
            .json({ msg: "Authorization header with Bearer token is required" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res
            .status(StatusCodes.UNAUTHORIZED)
            .json({ msg: "Token is missing" });
    }

    if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is not set");
        return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json({ msg: "Server authentication is not configured" });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload;
        next();
    } catch (err) {
        const msg =
            err.name === "TokenExpiredError" ? "Token has expired" : "Invalid token";
        return res.status(StatusCodes.UNAUTHORIZED).json({ msg });
    }
};

module.exports = authMiddleware;