
import type { RequestHandler } from "express";
import { db } from "../config/db.js";

const userCollection = db.collection("user");
const equipmentCollection = db.collection("equipment");
const bookingCollection = db.collection("bookings");
const paymentCollection = db.collection("payments");

// Admin Dashboard Overview
export const getAdminOverview: RequestHandler = async (
  req,
  res
) => {
  try {
    const [
      totalUsers,
      totalEquipment,
      pendingEquipment,
      approvedEquipment,
      totalBookings,
      pendingBookings,
      totalPayments,
      paidPayments,
    ] = await Promise.all([
      userCollection.countDocuments(),
      equipmentCollection.countDocuments(),
      equipmentCollection.countDocuments({ status: "pending" }),
      equipmentCollection.countDocuments({ status: "approved" }),
      bookingCollection.countDocuments(),
      bookingCollection.countDocuments({ status: "pending" }),
      paymentCollection.countDocuments(),
      paymentCollection.countDocuments({ status: "paid" }),
    ]);

    const revenueResult = await paymentCollection
      .aggregate([
        { $match: { status: "paid" } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$amount" },
          },
        },
      ])
      .toArray();

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalEquipment,
        pendingEquipment,
        approvedEquipment,
        totalBookings,
        pendingBookings,
        totalPayments,
        paidPayments,
        totalRevenue: revenueResult[0]?.totalRevenue || 0,
      },
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve admin overview",
    });
  }
};

// Admin: Get All Equipment
export const getAdminEquipment: RequestHandler = async (
  req,
  res
) => {
  try {
    const equipment = await equipmentCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

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

// Admin: Get All Bookings
export const getAdminBookings: RequestHandler = async (
  req,
  res
) => {
  try {
    const bookings = await bookingCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve bookings",
    });
  }
};

// Admin: Get All Payments
export const getAdminPayments: RequestHandler = async (
  req,
  res
) => {
  try {
    const payments = await paymentCollection
      .find({})
      .sort({ paidAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve payments",
    });
  }
};
