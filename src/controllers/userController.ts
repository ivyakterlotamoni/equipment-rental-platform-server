import type { RequestHandler } from "express";
import { ObjectId } from "mongodb";
import { db } from "../config/db.js";

const userCollection = db.collection("user");

// Get all users (Admin)
export const getAllUsers: RequestHandler = async (
  req,
  res
) => {
  try {
    const users = await userCollection
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve users",
    });
  }
};

// Get logged-in user's profile
export const getMyProfile: RequestHandler = async (
  req,
  res
) => {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const user = await userCollection.findOne(
      { id: userId },
      { projection: { _id: 0 } }
    );

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve profile",
    });
  }
};

// Update logged-in user's profile
export const updateMyProfile: RequestHandler = async (
  req,
  res
) => {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const { name, image } = req.body;

    if (
      name === undefined &&
      image === undefined
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide name or image",
      });
      return;
    }

    const updateData: {
      name?: string;
      image?: string;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        res.status(400).json({
          success: false,
          message: "Name must be a valid string",
        });
        return;
      }

      updateData.name = name.trim();
    }

    if (image !== undefined) {
      if (typeof image !== "string") {
        res.status(400).json({
          success: false,
          message: "Image must be a valid URL string",
        });
        return;
      }

      updateData.image = image;
    }

    const result = await userCollection.updateOne(
      { id: userId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const updatedUser = await userCollection.findOne(
      { id: userId },
      { projection: { _id: 0 } }
    );

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};

// Update user role (Admin only)
export const updateUserRole: RequestHandler = async (
  req,
  res
) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const allowedRoles = ["customer", "owner", "admin"];

    if (!allowedRoles.includes(role)) {
      res.status(400).json({
        success: false,
        message: "Invalid user role",
      });
      return;
    }

    if (req.user?.sub === userId) {
      res.status(400).json({
        success: false,
        message: "You cannot change your own role",
      });
      return;
    }

    const result = await userCollection.updateOne(
      { id: userId },
      {
        $set: {
          role,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User role updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update user role",
    });
  }
};

const favoritesCollection = db.collection("favorites");
const equipmentCollection = db.collection("equipment");

// Get Customer Favorites
export const getMyFavorites: RequestHandler = async (req, res) => {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const favorites = await favoritesCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    const equipmentIds = favorites
      .map((item) => item.equipmentId)
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    const equipment = await equipmentCollection
      .find({ _id: { $in: equipmentIds } })
      .toArray();

    res.status(200).json({
      success: true,
      message: "Favorites retrieved successfully",
      data: equipment,
    });
  } catch (error) {
    console.error("Get favorites error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve favorites",
    });
  }
};

// Add Equipment to Favorites
export const addToFavorites: RequestHandler = async (req, res) => {
  try {
    const userId = req.user?.sub;
    const { equipmentId } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    if (!equipmentId || !ObjectId.isValid(equipmentId)) {
      res.status(400).json({
        success: false,
        message: "Valid equipment ID is required",
      });
      return;
    }

    const equipment = await equipmentCollection.findOne({
      _id: new ObjectId(equipmentId),
      status: "approved",
    });

    if (!equipment) {
      res.status(404).json({
        success: false,
        message: "Approved equipment not found",
      });
      return;
    }

    const existingFavorite = await favoritesCollection.findOne({
      userId,
      equipmentId,
    });

    if (existingFavorite) {
      res.status(200).json({
        success: true,
        message: "Equipment is already in favorites",
      });
      return;
    }

    await favoritesCollection.insertOne({
      userId,
      equipmentId,
      createdAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Equipment added to favorites",
    });
  } catch (error) {
    console.error("Add favorite error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add favorite",
    });
  }
};

// Remove Equipment from Favorites
export const removeFromFavorites: RequestHandler = async (req, res) => {
  try {
    const userId = req.user?.sub;
    const equipmentId = Array.isArray(req.params.equipmentId)
  ? req.params.equipmentId[0]
  : req.params.equipmentId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    if (!ObjectId.isValid(equipmentId)) {
      res.status(400).json({
        success: false,
        message: "Invalid equipment ID",
      });
      return;
    }

    const result = await favoritesCollection.deleteOne({
      userId,
      equipmentId,
    });

    if (result.deletedCount === 0) {
      res.status(404).json({
        success: false,
        message: "Favorite not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Favorite removed successfully",
    });
  } catch (error) {
    console.error("Remove favorite error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove favorite",
    });
  }
};

