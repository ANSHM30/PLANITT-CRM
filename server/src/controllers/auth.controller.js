import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/db.js";

const GOOGLE_AUTH_BASE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

function getGoogleLoginConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_LOGIN_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI,
    clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  };
}

function signToken(user) {
  const secret = process.env.JWT_SECRET || "SECRET";
  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
      email: user.email,
    },
    secret,
    { expiresIn: "7d" }
  );
}

function decodeJwtPayload(token) {
  if (!token) {
    return {};
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return {};
  }

  const payload = parts[1];
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const decoded = Buffer.from(padded, "base64").toString("utf8");
  return JSON.parse(decoded);
}

export async function signup(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: "EMPLOYEE" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        designation: true,
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdAt: true,
      },
    });

    const token = signToken(user);

    return res.status(201).json({ token, user });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        designation: user.designation,
        department: user.department,
        manager: user.manager,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getCurrentUser(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        designation: true,
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getGoogleLoginUrl(_req, res) {
  try {
    const config = getGoogleLoginConfig();
    if (!config.clientId || !config.redirectUri) {
      return res.status(400).json({
        error: "Google login is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_LOGIN_REDIRECT_URI.",
      });
    }

    const state = jwt.sign(
      {
        nonce: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      },
      process.env.JWT_SECRET || "SECRET",
      { expiresIn: "10m" }
    );

    const scopes = ["openid", "email", "profile"];
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      scope: scopes.join(" "),
      state,
    });

    return res.json({
      authUrl: `${GOOGLE_AUTH_BASE_URL}?${params.toString()}`,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function handleGoogleLoginCallback(req, res) {
  const config = getGoogleLoginConfig();
  const loginUrl = `${config.clientUrl}/login`;

  try {
    const { code, state, error } = req.query;
    if (error) {
      return res.redirect(`${loginUrl}?google=denied`);
    }

    if (!code || !state) {
      return res.redirect(`${loginUrl}?google=missing_code`);
    }

    jwt.verify(state, process.env.JWT_SECRET || "SECRET");

    if (!config.clientId || !config.clientSecret || !config.redirectUri) {
      return res.redirect(`${loginUrl}?google=missing_config`);
    }

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenPayload = await tokenResponse.json();
    if (!tokenResponse.ok) {
      return res.redirect(`${loginUrl}?google=token_failed`);
    }

    const idTokenPayload = decodeJwtPayload(tokenPayload.id_token);
    const email = idTokenPayload.email;
    if (!email) {
      return res.redirect(`${loginUrl}?google=email_missing`);
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return res.redirect(`${loginUrl}?google=user_not_found`);
    }

    const appToken = signToken(user);
    const encodedToken = encodeURIComponent(appToken);
    return res.redirect(`${loginUrl}#google=connected&google_token=${encodedToken}`);
  } catch (_err) {
    return res.redirect(`${loginUrl}?google=failed`);
  }
}
