
import { Router } from "express";

import {
  getAllUsers,
  getMyProfile,
  updateMyProfile,
  updateUserRole,
} from "../controllers/userController.js";

import {
  verifyToken,
  verifyAdmin,
} from "../middleware/authMiddleware.js";

const router = Router();

// Get all users (Admin only)
router.get("/", verifyToken, verifyAdmin, getAllUsers);

// Get logged-in user's profile
router.get("/me", verifyToken, getMyProfile);

// Update logged-in user's profile
router.patch("/me", verifyToken, updateMyProfile);

// Update user role (Admin only)
router.patch("/:userId/role", verifyToken, verifyAdmin, updateUserRole);

export default router;
