
import type { RequestHandler } from "express";
import { ObjectId } from "mongodb";
import { db } from "../config/db.js";

const equipmentCollection = db.collection("equipment");

// Add Equipment (Owner)
export const addEquipment: RequestHandler = async (req, res) => {
  try {
    const ownerId = req.user?.sub;

    if (!ownerId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    const {
      name,
      description,
      category,
      location,
      rentalPrice,
      rentalType,
      quantity,
      condition,
      brand,
      model,
      image,
      terms,
    } = req.body;

    if (
      !name ||
      !description ||
      !category ||
      !location ||
      rentalPrice === undefined ||
      !rentalType ||
      quantity === undefined ||
      !condition ||
      !image
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide all required equipment information",
      });
      return;
    }

    if (
      typeof rentalPrice !== "number" ||
      rentalPrice <= 0 ||
      typeof quantity !== "number" ||
      quantity < 1
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid rental price or quantity",
      });
      return;
    }

    const equipment = {
      name,
      description,
      category,
      location,
      rentalPrice,
      rentalType,
      quantity,
      condition,
      brand: brand || "",
      model: model || "",
      image,
      terms: terms || "",
      ownerId,
      status: "pending",
      availability: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await equipmentCollection.insertOne(equipment);

    res.status(201).json({
      success: true,
      message: "Equipment submitted for admin approval",
      data: {
        _id: result.insertedId,
        ...equipment,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add equipment",
    });
  }
};

// Get all approved equipment (Public)
export const getAllEquipment: RequestHandler = async (req, res) => {
  try {
    const equipment = await equipmentCollection
      .find({ status: "approved" })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      message: "Equipment retrieved successfully",
      data: equipment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve equipment",
    });
  }
};

// Get single equipment
export const getSingleEquipment: RequestHandler = async (req, res) => {
  try {
    const id = String(req.params.id);

    if (!ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid equipment ID",
      });
      return;
    }

    const equipment = await equipmentCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!equipment) {
      res.status(404).json({
        success: false,
        message: "Equipment not found",
      });
      return;
    }

    const isOwner = req.user?.sub === equipment.ownerId;
    const isAdmin = req.user?.role === "admin";

    if (
      equipment.status !== "approved" &&
      !isOwner &&
      !isAdmin
    ) {
      res.status(403).json({
        success: false,
        message: "This equipment is not available publicly",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: equipment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve equipment",
    });
  }
};

// Get equipment belonging to logged-in owner
export const getMyEquipment: RequestHandler = async (req, res) => {
  try {
    const ownerId = req.user?.sub;

    const equipment = await equipmentCollection
      .find({ ownerId })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      data: equipment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve your equipment",
    });
  }
};

// Update equipment (Owner)
export const updateEquipment: RequestHandler = async (req, res) => {
  try {
    const ownerId = req.user?.sub;
    const id = String(req.params.id);

    if (!ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid equipment ID",
      });
      return;
    }

    const allowedFields = [
      "name",
      "description",
      "category",
      "location",
      "rentalPrice",
      "rentalType",
      "quantity",
      "condition",
      "brand",
      "model",
      "image",
      "terms",
      "availability",
    ];

    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: "No valid information provided for update",
      });
      return;
    }

    updateData.updatedAt = new Date();

    const result = await equipmentCollection.updateOne(
      {
        _id: new ObjectId(id),
        ownerId,
      },
      {
        $set: updateData,
      }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({
        success: false,
        message: "Equipment not found or you are not the owner",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Equipment updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update equipment",
    });
  }
};

// Delete equipment (Owner)
export const deleteEquipment: RequestHandler = async (req, res) => {
  try {
    const ownerId = req.user?.sub;
    const id = String(req.params.id);

    if (!ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid equipment ID",
      });
      return;
    }

    const result = await equipmentCollection.deleteOne({
      _id: new ObjectId(id),
      ownerId,
    });

    if (result.deletedCount === 0) {
      res.status(404).json({
        success: false,
        message: "Equipment not found or you are not the owner",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Equipment deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete equipment",
    });
  }
};

// Approve or reject equipment (Admin)
export const updateEquipmentStatus: RequestHandler = async (req, res) => {
  try {
    const id = String(req.params.id);
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid equipment ID",
      });
      return;
    }

    if (!["approved", "rejected"].includes(status)) {
      res.status(400).json({
        success: false,
        message: "Status must be approved or rejected",
      });
      return;
    }

    const result = await equipmentCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({
        success: false,
        message: "Equipment not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Equipment ${status} successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update equipment status",
    });
  }
};
