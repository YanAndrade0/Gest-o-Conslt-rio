import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import dotenv from "dotenv";
import admin from "firebase-admin";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const firebaseConfigPath = path.join(__dirname, "firebase-applet-config.json");
if (fs.existsSync(firebaseConfigPath)) {
  const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }
}

const firestore = admin.apps.length ? admin.firestore() : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  let stripe: Stripe | null = null;
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  // Middleware for JSON except for Webhooks
  app.use((req, res, next) => {
    if (req.originalUrl === "/api/stripe/webhook") {
      next();
    } else {
      express.json()(req, res, next);
    }
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Stripe Checkout Session
  app.post("/api/stripe/create-checkout", async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe not configured" });
    }

    const { clinicId, planId, userEmail } = req.body;

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card", "pix"],
        line_items: [
          {
            price: planId, // This should be the Stripe Price ID (e.g., price_H5ggY...)
            quantity: 1,
          },
        ],
        mode: "subscription",
        customer_email: userEmail,
        success_url: `${process.env.VITE_APP_URL}/settings?session_id={CHECKOUT_SESSION_ID}&success=true`,
        cancel_url: `${process.env.VITE_APP_URL}/settings?success=false`,
        metadata: {
          clinicId,
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Stripe Session Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Stripe Billing Portal Session
  app.post("/api/stripe/create-portal", async (req, res) => {
    if (!stripe || !firestore) {
      return res.status(500).json({ error: "Service not configured" });
    }

    const { clinicId } = req.body;

    try {
      const clinicDoc = await firestore.collection("clinics").doc(clinicId).get();
      const clinicData = clinicDoc.data();

      if (!clinicData?.stripeCustomerId) {
        return res.status(400).json({ error: "No active subscription found for this clinic." });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: clinicData.stripeCustomerId,
        return_url: `${process.env.VITE_APP_URL}/settings`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Stripe Portal Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Stripe Webhook
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    let event;

    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
      console.warn("Stripe or Webhook secret not configured");
      return res.sendStatus(200);
    }

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const clinicId = session.metadata?.clinicId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (clinicId && firestore) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          
          await firestore.collection("clinics").doc(clinicId).update({
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            subscription: {
              status: subscription.status,
              planName: "Gestão Profissional",
              currentPeriodEnd: admin.firestore.Timestamp.fromMillis((subscription as any).current_period_end * 1000)
            }
          });
          console.log(`Payment successful and DB updated for clinic: ${clinicId}`);
        }
      }

      if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
        const subscription = event.data.object as Stripe.Subscription;
        
        if (firestore) {
          const clinicsSnapshot = await firestore.collection("clinics")
            .where("stripeSubscriptionId", "==", subscription.id)
            .limit(1)
            .get();

          if (!clinicsSnapshot.empty) {
            const clinicDoc = clinicsSnapshot.docs[0];
            await clinicDoc.ref.update({
              "subscription.status": subscription.status,
              "subscription.currentPeriodEnd": admin.firestore.Timestamp.fromMillis((subscription as any).current_period_end * 1000)
            });
            console.log(`Subscription updated for clinic: ${clinicDoc.id}`);
          }
        }
      }
    } catch (dbError) {
      console.error("Database Update Error:", dbError);
    }

    res.json({ received: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
