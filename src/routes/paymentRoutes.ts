
import { Router } from "express";

import {
  createCheckoutSession,
} from "../controllers/paymentController.js";

import {
  verifyToken,
  verifyRenter,
} from "../middleware/authMiddleware.js";

const router = Router();

// Create Stripe Checkout Session
router.post(
  "/create-checkout-session",
  verifyToken,
  verifyRenter,
  createCheckoutSession
);

export default router;
