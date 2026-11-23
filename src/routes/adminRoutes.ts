
import { Router } from "express";

import {
  getAdminOverview,
  getAdminEquipment,
  getAdminBookings,
  getAdminPayments,
} from "../controllers/adminController.js";

import {
  verifyToken,
  verifyAdmin,
} from "../middleware/authMiddleware.js";

const router = Router();

// All routes are Admin only
router.use(verifyToken, verifyAdmin);

// Dashboard Overview
router.get("/overview", getAdminOverview);

// Manage Equipment
router.get("/equipment", getAdminEquipment);

// Manage Bookings
router.get("/bookings", getAdminBookings);

// Payment History
router.get("/payments", getAdminPayments);

export default router;
