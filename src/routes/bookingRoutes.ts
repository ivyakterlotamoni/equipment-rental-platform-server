import { Router } from "express";

import {
  createBooking,
  getMyBookings,
  getOwnerBookings,
  updateBookingStatus,
  cancelBooking,
} from "../controllers/bookingController.js";

import {
  verifyToken,
  verifyRenter,
  verifyOwner,
} from "../middleware/authMiddleware.js";

const router = Router();

// Customer routes
router.post("/", verifyToken, verifyRenter, createBooking);

router.get("/my-bookings", verifyToken, verifyRenter, getMyBookings);

router.patch("/:id/cancel", verifyToken, verifyRenter, cancelBooking);

// Owner routes
router.get("/owner-bookings", verifyToken, verifyOwner, getOwnerBookings);

router.patch(
  "/:id/status",
  verifyToken,
  verifyOwner,
  updateBookingStatus
);

export default router;