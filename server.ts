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
      
      const isTest = key.startsWith('sk_test');
      console.log(`Stripe client initialized in ${isTest ? 'TEST' : 'LIVE'} mode.`);
      
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
    try {
      const { clinicId, customerEmail, priceId } = req.body;
      
      console.log('[DEBUG] Checkout Request Body:', JSON.stringify(req.body));
      console.log('[DEBUG] Secret Key Status:', !!process.env.STRIPE_SECRET_KEY ? 'Present' : 'MISSING');
      
      if (!priceId) {
        console.error('[DEBUG] Missing Price ID');
        return res.status(400).json({ error: 'ID de Preço (priceId) não recebido pelo servidor.' });
      }

      if (String(priceId).startsWith('prod_')) {
        console.error('[DEBUG] Product ID instead of Price ID:', priceId);
        return res.status(400).json({ 
          error: `O ID "${priceId}" é um ID de PRODUTO. Você deve usar o ID do PREÇO (API ID) que começa com "price_".` 
        });
      }

      const stripe = getStripe();
      console.log('[DEBUG] Initializing checkout session with price:', priceId);

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

      console.log('[DEBUG] Session created:', session.id);
      res.json({ url: session.url });
    } catch (error: any) {
      console.error('[STRIPE SERVER ERROR]:', error);
      
      let clientMessage = error.message;
      
      if (error.type === 'StripeAuthenticationError') {
        clientMessage = 'Chave de API Inválida. Verifique o campo STRIPE_SECRET_KEY no menu Settings do AI Studio. A chave deve começar com "sk_test_" ou "sk_live_".';
      } else if (error.message.includes('No such price')) {
        clientMessage = `O ID de preço "${req.body.priceId}" não existe nesta conta Stripe.`;
      }
      
      res.status(500).json({ error: clientMessage });
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
