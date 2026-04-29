import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import Stripe from 'stripe';
import cors from 'cors';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());

  // Lazy initialize Stripe
  let stripeClient: Stripe | null = null;
  const getStripe = () => {
    if (!stripeClient) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        console.warn('STRIPE_SECRET_KEY missing');
        throw new Error('STRIPE_SECRET_KEY environment variable is required');
      }
      stripeClient = new Stripe(key, {
        apiVersion: '2023-10-16' as any,
      });
    }
    return stripeClient;
  };

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Middleware for JSON (except for webhook)
  app.use((req, res, next) => {
    if (req.originalUrl === '/api/stripe/webhook') {
      next();
    } else {
      express.json()(req, res, next);
    }
  });

  // API Routes
  app.post('/api/stripe/create-checkout', async (req, res) => {
    console.log('Received checkout request:', req.body);
    try {
      const { clinicId, customerEmail, priceId } = req.body;
      
      if (!priceId) {
        return res.status(400).json({ error: 'Price ID is missing. Check your VITE_STRIPE_MONTHLY_PRICE_ID or VITE_STRIPE_YEARLY_PRICE_ID environment variables.' });
      }

      const stripe = getStripe();

      const session = await stripe.checkout.sessions.create({
        customer_email: customerEmail,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${req.headers.origin}/#/configuracoes?success=true`,
        cancel_url: `${req.headers.origin}/#/configuracoes?canceled=true`,
        metadata: { clinicId },
        subscription_data: {
          metadata: { clinicId }
        }
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Stripe Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/stripe/create-portal', async (req, res) => {
    try {
      const { clinicId } = req.body;
      const stripe = getStripe();

      // We should ideally fetch the stripeCustomerId from Firestore
      // For now, let's assume we don't have it and we need to search by email or clinicId
      // In a real app, you'd store this in the clinic doc.
      
      res.status(400).json({ error: 'Portal access requires registered customer ID.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      if (!sig || !webhookSecret) throw new Error('Missing signature or secret');
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    // Note: To update Firestore here, you'd need firebase-admin setup.
    // For now, we'll just log and let the user know production webhooks need admin setup.
    console.log('Webhook event received:', event.type);

    res.json({ received: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
