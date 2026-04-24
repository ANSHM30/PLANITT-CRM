import jwt from "jsonwebtoken";

export function protect(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authorization token missing" });
    }

    const token = header.split(" ")[1];
    const secret = process.env.JWT_SECRET || "SECRET";
    const decoded = jwt.verify(token, secret);

    req.user = decoded;
    return next();
  } catch (_err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
