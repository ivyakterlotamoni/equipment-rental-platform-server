
import type { RequestHandler } from "express";
import { ObjectId } from "mongodb";
import { db } from "../config/db.js";

const bookingCollection = db.collection("bookings");
const equipmentCollection = db.collection("equipment");

// Customer: Create Booking
export const createBooking: RequestHandler = async (req, res) => {
  try {
    const customerId = req.user?.sub;

    if (!customerId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    const {
      equipmentId,
      startDate,
      endDate,
      quantity,
      contact,
      deliveryAddress,
      notes,
    } = req.body;

    if (
      !equipmentId ||
      !startDate ||
      !endDate ||
      !quantity ||
      !contact ||
      !deliveryAddress
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide all required booking information",
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

    if (!Number.isInteger(quantity) || quantity < 1) {
      res.status(400).json({
        success: false,
        message: "Quantity must be a positive whole number",
      });
      return;
    }

    const bookingStart = new Date(startDate);
    const bookingEnd = new Date(endDate);

    if (
      Number.isNaN(bookingStart.getTime()) ||
      Number.isNaN(bookingEnd.getTime()) ||
      bookingEnd <= bookingStart
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide valid booking dates",
      });
      return;
    }

    if (bookingStart < new Date()) {
      res.status(400).json({
        success: false,
        message: "Booking start date cannot be in the past",
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

    if (equipment.ownerId === customerId) {
      res.status(400).json({
        success: false,
        message: "You cannot book your own equipment",
      });
      return;
    }

    if (equipment.availability === false) {
      res.status(400).json({
        success: false,
        message: "This equipment is currently unavailable",
      });
      return;
    }

    // Check overlapping bookings
    const overlappingBookings = await bookingCollection
      .find({
        equipmentId,
        status: { $in: ["pending", "confirmed"] },
        startDate: { $lt: bookingEnd },
        endDate: { $gt: bookingStart },
      })
      .toArray();

    const bookedQuantity = overlappingBookings.reduce(
      (total, booking) => total + Number(booking.quantity || 0),
      0
    );

    const availableQuantity =
      Number(equipment.quantity) - bookedQuantity;

    if (quantity > availableQuantity) {
      res.status(400).json({
        success: false,
        message: `Only ${Math.max(0, availableQuantity)} item(s) available for these dates`,
      });
      return;
    }

    // Calculate rental duration
    const durationInDays = Math.ceil(
      (bookingEnd.getTime() - bookingStart.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const rentalType = String(equipment.rentalType).toLowerCase();

    let rentalUnits = durationInDays;

    if (rentalType === "weekly") {
      rentalUnits = Math.ceil(durationInDays / 7);
    } else if (rentalType === "monthly") {
      rentalUnits = Math.ceil(durationInDays / 30);
    } else if (rentalType !== "daily") {
      res.status(400).json({
        success: false,
        message: "Unsupported rental type",
      });
      return;
    }

    const totalAmount =
      Number(equipment.rentalPrice) * rentalUnits * quantity;

    const booking = {
      equipmentId,
      equipmentName: equipment.name,
      equipmentImage: equipment.image,
      ownerId: equipment.ownerId,
      customerId,
      startDate: bookingStart,
      endDate: bookingEnd,
      durationInDays,
      quantity,
      rentalType,
      rentalPrice: Number(equipment.rentalPrice),
      totalAmount,
      contact,
      deliveryAddress,
      notes: notes || "",
      status: "pending",
      paymentStatus: "unpaid",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await bookingCollection.insertOne(booking);

    res.status(201).json({
      success: true,
      message: "Booking created successfully. Complete payment to confirm it.",
      data: {
        _id: result.insertedId,
        ...booking,
      },
    });
  } catch (error) {
    console.error("Create booking error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create booking",
    });
  }
};

// Customer: Get My Bookings
export const getMyBookings: RequestHandler = async (req, res) => {
  try {
    const customerId = req.user?.sub;

    const bookings = await bookingCollection
      .find({ customerId })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve your bookings",
    });
  }
};

// Owner: Get Bookings for Own Equipment
export const getOwnerBookings: RequestHandler = async (req, res) => {
  try {
    const ownerId = req.user?.sub;

    const bookings = await bookingCollection
      .find({ ownerId })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve equipment bookings",
    });
  }
};

// Owner: Approve or Reject Booking
export const updateBookingStatus: RequestHandler = async (req, res) => {
  try {
    const ownerId = req.user?.sub;
    const bookingId = String(req.params.id);
    const { status } = req.body;

    if (!ObjectId.isValid(bookingId)) {
      res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
      return;
    }

    if (!["confirmed", "rejected"].includes(status)) {
      res.status(400).json({
        success: false,
        message: "Status must be confirmed or rejected",
      });
      return;
    }

    const booking = await bookingCollection.findOne({
      _id: new ObjectId(bookingId),
      ownerId,
    });

    if (!booking) {
      res.status(404).json({
        success: false,
        message: "Booking not found",
      });
      return;
    }

    if (booking.status !== "pending") {
      res.status(400).json({
        success: false,
        message: "Only pending bookings can be updated",
      });
      return;
    }

    if (status === "confirmed" && booking.paymentStatus !== "paid") {
      res.status(400).json({
        success: false,
        message: "Booking cannot be confirmed before payment",
      });
      return;
    }

    await bookingCollection.updateOne(
      { _id: new ObjectId(bookingId), ownerId },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      }
    );

    res.status(200).json({
      success: true,
      message: `Booking ${status} successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update booking status",
    });
  }
};

// Customer: Cancel Booking
export const cancelBooking: RequestHandler = async (req, res) => {
  try {
    const customerId = req.user?.sub;
    const bookingId = String(req.params.id);

    if (!ObjectId.isValid(bookingId)) {
      res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
      return;
    }

    const booking = await bookingCollection.findOne({
      _id: new ObjectId(bookingId),
      customerId,
    });

    if (!booking) {
      res.status(404).json({
        success: false,
        message: "Booking not found",
      });
      return;
    }

    if (booking.status !== "pending") {
      res.status(400).json({
        success: false,
        message: "Only pending bookings can be cancelled",
      });
      return;
    }

    await bookingCollection.updateOne(
      { _id: new ObjectId(bookingId), customerId },
      {
        $set: {
          status: "cancelled",
          updatedAt: new Date(),
        },
      }
    );

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to cancel booking",
    });
  }
};
