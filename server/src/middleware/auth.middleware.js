import jwt from "jsonwebtoken";

export function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const secret = process.env.JWT_SECRET || "SECRET";
    const decoded = jwt.verify(token, secret);

    req.user = decoded;
    return next();
  } catch (_err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export const protect = authMiddleware;

export function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return next();
  };
}
