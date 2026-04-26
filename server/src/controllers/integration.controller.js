import jwt from "jsonwebtoken";
import prisma from "../config/db.js";

const GOOGLE_AUTH_BASE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

const SERVICE_SCOPE_MAP = {
  meet: "https://www.googleapis.com/auth/calendar.events",
  sheets: "https://www.googleapis.com/auth/spreadsheets",
  drive: "https://www.googleapis.com/auth/drive.file",
};

const DEFAULT_SERVICES = ["meet", "sheets", "drive"];
const BASE_SCOPES = ["openid", "email", "profile"];

function getEnvConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  };
}

function parseRequestedServices(rawServices) {
  if (!rawServices) {
    return DEFAULT_SERVICES;
  }

  return rawServices
    .split(",")
    .map((service) => service.trim().toLowerCase())
    .filter((service) => service in SERVICE_SCOPE_MAP);
}

function buildScopes(services) {
  const dynamicScopes = services.map((service) => SERVICE_SCOPE_MAP[service]);
  return Array.from(new Set([...BASE_SCOPES, ...dynamicScopes]));
}

function signState(payload) {
  const secret = process.env.JWT_SECRET || "SECRET";
  return jwt.sign(payload, secret, { expiresIn: "10m" });
}

function verifyState(token) {
  const secret = process.env.JWT_SECRET || "SECRET";
  return jwt.verify(token, secret);
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

function buildWorkspaceRecommendations() {
  return [
    {
      id: "meeting-velocity",
      title: "Meeting velocity",
      description: "Track number of customer or internal project meetings by department and week.",
      source: "Google Calendar + Meet links",
      crmUseCase: "Helps leadership compare planning cadence with delivery speed.",
    },
    {
      id: "sheet-activity",
      title: "Pipeline sheet activity",
      description: "Monitor frequently updated shared Sheets related to leads, projects, and revenue.",
      source: "Google Sheets revision history",
      crmUseCase: "Highlights active versus stale planning pipelines.",
    },
    {
      id: "drive-collaboration",
      title: "Drive collaboration depth",
      description: "Measure shared file count and active collaborators per account, project, or department.",
      source: "Google Drive files + permissions",
      crmUseCase: "Shows collaboration intensity around key deals and projects.",
    },
    {
      id: "response-time",
      title: "Follow-up response time",
      description: "Calculate average time between CRM task creation and first Google Workspace artifact update.",
      source: "CRM events + Sheets/Drive timestamps",
      crmUseCase: "Improves operational responsiveness tracking.",
    },
  ];
}

async function getCRMWorkspaceSignals() {
  const [totalTasks, openTasks, totalProjects, totalDepartments] = await Promise.all([
    prisma.task.count(),
    prisma.task.count({
      where: {
        status: { in: ["TODO", "IN_PROGRESS"] },
      },
    }),
    prisma.project.count(),
    prisma.department.count(),
  ]);

  return {
    totalTasks,
    openTasks,
    totalProjects,
    totalDepartments,
  };
}

export async function getGoogleWorkspaceStatus(req, res) {
  try {
    const [connection, crmSignals] = await Promise.all([
      prisma.googleWorkspaceConnection.findUnique({
        where: { userId: req.user.userId },
        select: {
          workspaceEmail: true,
          grantedScopes: true,
          connectedMeet: true,
          connectedSheets: true,
          connectedDrive: true,
          updatedAt: true,
        },
      }),
      getCRMWorkspaceSignals(),
    ]);

    return res.json({
      connected: Boolean(connection),
      workspaceEmail: connection?.workspaceEmail ?? null,
      services: {
        meet: connection?.connectedMeet ?? false,
        sheets: connection?.connectedSheets ?? false,
        drive: connection?.connectedDrive ?? false,
      },
      grantedScopes: connection?.grantedScopes ?? [],
      lastSyncedAt: connection?.updatedAt ?? null,
      crmSignals,
      recommendations: buildWorkspaceRecommendations(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getGoogleAuthUrl(req, res) {
  try {
    const config = getEnvConfig();
    if (!config.clientId || !config.redirectUri) {
      return res.status(400).json({
        error: "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI.",
      });
    }

    const requestedServices = parseRequestedServices(req.query.services);
    const scopes = buildScopes(requestedServices);
    const state = signState({
      userId: req.user.userId,
      role: req.user.role,
      services: requestedServices,
      nonce: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });

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
      services: requestedServices,
      scopes,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function handleGoogleCallback(req, res) {
  const config = getEnvConfig();
  const dashboardUrl = `${config.clientUrl}/dashboard?tab=workspace`;

  try {
    const { code, state, error } = req.query;
    if (error) {
      return res.redirect(`${dashboardUrl}&google=denied`);
    }

    if (!code || !state) {
      return res.redirect(`${dashboardUrl}&google=missing_code`);
    }

    if (!config.clientId || !config.clientSecret || !config.redirectUri) {
      return res.redirect(`${dashboardUrl}&google=missing_config`);
    }

    const parsedState = verifyState(state);
    const targetUserId = parsedState.userId;
    const services = Array.isArray(parsedState.services) ? parsedState.services : DEFAULT_SERVICES;

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
      return res.redirect(`${dashboardUrl}&google=token_failed`);
    }

    const idTokenPayload = decodeJwtPayload(tokenPayload.id_token);
    const grantedScopes = (tokenPayload.scope || "")
      .split(" ")
      .map((scope) => scope.trim())
      .filter(Boolean);

    await prisma.googleWorkspaceConnection.upsert({
      where: {
        userId: targetUserId,
      },
      update: {
        workspaceEmail: idTokenPayload.email || null,
        accessToken: tokenPayload.access_token || null,
        refreshToken: tokenPayload.refresh_token || undefined,
        expiryDate: tokenPayload.expires_in
          ? new Date(Date.now() + Number(tokenPayload.expires_in) * 1000)
          : null,
        grantedScopes,
        connectedMeet: services.includes("meet"),
        connectedSheets: services.includes("sheets"),
        connectedDrive: services.includes("drive"),
      },
      create: {
        userId: targetUserId,
        workspaceEmail: idTokenPayload.email || null,
        accessToken: tokenPayload.access_token || null,
        refreshToken: tokenPayload.refresh_token || null,
        expiryDate: tokenPayload.expires_in
          ? new Date(Date.now() + Number(tokenPayload.expires_in) * 1000)
          : null,
        grantedScopes,
        connectedMeet: services.includes("meet"),
        connectedSheets: services.includes("sheets"),
        connectedDrive: services.includes("drive"),
      },
    });

    return res.redirect(`${dashboardUrl}&google=connected`);
  } catch (_err) {
    return res.redirect(`${dashboardUrl}&google=failed`);
  }
}

export async function disconnectGoogleWorkspace(req, res) {
  try {
    await prisma.googleWorkspaceConnection.deleteMany({
      where: { userId: req.user.userId },
    });
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
