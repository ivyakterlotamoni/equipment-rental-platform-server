
import type { RequestHandler } from "express";
import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
} from "jose";

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

const authBaseURL =
  process.env.BETTER_AUTH_URL || "http://localhost:5000";

const JWKS = createRemoteJWKSet(
  new URL(`${authBaseURL}/api/auth/jwks`)
);

// Verify JWT token
export const verifyToken: RequestHandler = async (
  req,
  res,
  next
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Unauthorized! Token is required.",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: authBaseURL,
      audience: authBaseURL,
    });

    if (!payload.sub) {
      res.status(401).json({
        success: false,
        message: "Invalid token!",
      });
      return;
    }

    req.user = payload;
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token!",
    });
  }
};

// Check user role
const allowRoles = (...roles: string[]): RequestHandler => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access!",
      });
      return;
    }

    if (
      typeof req.user.role !== "string" ||
      !roles.includes(req.user.role)
    ) {
      res.status(403).json({
        success: false,
        message: "Forbidden! You do not have permission.",
      });
      return;
    }

    next();
  };
};

// Customer / Renter permission
export const verifyRenter = allowRoles("customer");

// Owner permission
export const verifyOwner = allowRoles("owner");

// Admin permission
export const verifyAdmin = allowRoles("admin");
