import Refund from "../models/refundModel.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// USER: Request refund
export const requestRefund = async (req, res) => {
  try {
    const { userId, paymentIntentId, reason } = req.body;

    const refundRequest = await Refund.create({
      userId,
      paymentIntentId,
      reason,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Refund request submitted",
      data: refundRequest
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ADMIN: Approve refund
export const approveRefund = async (req, res) => {
  try {
    const { id } = req.params;

    const refundRequest = await Refund.findById(id);
    if (!refundRequest) {
      return res.status(404).json({ message: "Refund request not found" });
    }

    const refund = await stripe.refunds.create({
      payment_intent: refundRequest.paymentIntentId,
    });

    refundRequest.status = "refunded";
    refundRequest.refundId = refund.id;
    await refundRequest.save();

    res.json({
      success: true,
      message: "Refund approved and processed",
      data: refundRequest
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ADMIN: Reject refund
export const rejectRefund = async (req, res) => {
  try {
    const refundRequest = await Refund.findById(req.params.id);

    if (!refundRequest) {
      return res.status(404).json({ message: "Refund request not found" });
    }

    refundRequest.status = "rejected";
    await refundRequest.save();

    res.json({
      success: true,
      message: "Refund request rejected"
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};





// ADMIN: Get all refunds
export const getAllRefunds = async (req, res) => {
  try {
    const { status } = req.query; // optional ?status=pending

    const filter = status ? { status } : {};

    const refunds = await Refund.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: refunds.length,
      data: refunds
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
