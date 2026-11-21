
import type { RequestHandler } from "express";
import Stripe from "stripe";
import { ObjectId } from "mongodb";
import { db } from "../config/db.js";

const bookingCollection = db.collection("bookings");

// Create Stripe Checkout Session
export const createCheckoutSession: RequestHandler = async (
  req,
  res
) => {
  try {
    const userId = req.user?.sub;
    const { bookingId } = req.body;

    if (!userId || !bookingId) {
      res.status(400).json({
        success: false,
        message: "Booking ID is required.",
      });
      return;
    }

    if (!ObjectId.isValid(bookingId)) {
      res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
      return;
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      res.status(500).json({
        success: false,
        message: "Stripe secret key is missing.",
      });
      return;
    }

    const stripe = new Stripe(secretKey);

    const booking = await bookingCollection.findOne({
      _id: new ObjectId(bookingId),
      customerId: userId,
    });

    if (!booking) {
      res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
      return;
    }

    if (booking.paymentStatus === "paid") {
      res.status(400).json({
        success: false,
        message: "Booking is already paid.",
      });
      return;
    }

    const amount = Number(booking.totalAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid booking amount.",
      });
      return;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "bdt",
            product_data: {
              name: "Equipment Rental Booking",
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingId,
        customerId: userId,
      },
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
    });

    res.status(200).json({
      success: true,
      message: "Checkout session created.",
      data: {
        checkoutUrl: session.url,
        sessionId: session.id,
      },
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create checkout session.",
    });
  }
};

// Stripe Webhook
export const stripeWebhook: RequestHandler = async (req, res) => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers["stripe-signature"];

  if (!secretKey || !webhookSecret) {
    res.status(500).send("Stripe environment variables are missing.");
    return;
  }

  if (typeof signature !== "string" || !Buffer.isBuffer(req.body)) {
    res.status(400).send("Invalid webhook request.");
    return;
  }

  try {
    const stripe = new Stripe(secretKey);

    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      webhookSecret
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.payment_status === "paid") {
        const bookingId = session.metadata?.bookingId;
        const customerId = session.metadata?.customerId;

        // Ignore test events without valid booking metadata
        if (
          !bookingId ||
          !customerId ||
          !ObjectId.isValid(bookingId)
        ) {
          console.log(
            "Ignoring event without valid booking metadata:",
            session.id
          );

          res.status(200).json({
            received: true,
            ignored: true,
            message: "No valid booking metadata found.",
          });
          return;
        }

        const bookingResult = await bookingCollection.updateOne(
          {
            _id: new ObjectId(bookingId),
            customerId,
          },
          {
            $set: {
              paymentStatus: "paid",
              stripeSessionId: session.id,
              paidAt: new Date(),
            },
          }
        );

        if (bookingResult.matchedCount === 0) {
          console.log("Booking not found:", bookingId);

          res.status(404).send("Booking not found.");
          return;
        }

        const paymentCollection = db.collection("payments");

        await paymentCollection.updateOne(
          { stripeSessionId: session.id },
          {
            $set: {
              bookingId,
              customerId,
              stripeSessionId: session.id,
              paymentIntentId:
                typeof session.payment_intent === "string"
                  ? session.payment_intent
                  : session.payment_intent?.id ?? null,
              amount: (session.amount_total ?? 0) / 100,
              currency: session.currency,
              status: "paid",
              paidAt: new Date(),
            },
            $setOnInsert: {
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );

        console.log("Payment successfully recorded:", session.id);
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing error:", error);

    res.status(400).json({
      success: false,
      message: "Webhook processing failed.",
    });
  }
};
