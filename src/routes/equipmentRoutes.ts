
import { Router } from "express";

import {
  addEquipment,
  getAllEquipment,
  getSingleEquipment,
  getMyEquipment,
  updateEquipment,
  deleteEquipment,
  updateEquipmentStatus,
} from "../controllers/equipmentController.js";

import {
  verifyToken,
  verifyOwner,
  verifyAdmin,
} from "../middleware/authMiddleware.js";

const router = Router();

// Public: Get all approved equipment
router.get("/", getAllEquipment);

// Owner: Get own equipment
router.get("/my-equipment", verifyToken, verifyOwner, getMyEquipment);

// Owner: Add equipment
router.post("/", verifyToken, verifyOwner, addEquipment);

// Admin: Approve or reject equipment
router.patch(
  "/:id/status",
  verifyToken,
  verifyAdmin,
  updateEquipmentStatus
);

// Get single equipment
router.get("/:id", getSingleEquipment);

// Owner: Update equipment
router.patch("/:id", verifyToken, verifyOwner, updateEquipment);

// Owner: Delete equipment
router.delete("/:id", verifyToken, verifyOwner, deleteEquipment);

export default router;
