import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Stripe from 'stripe';
import admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}
const firestore = admin.firestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Stripe Init (Lazy)
  let stripe: Stripe | null = null;
  const getStripe = () => {
    if (!stripe) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) throw new Error('STRIPE_SECRET_KEY is missing');
      stripe = new Stripe(key);
    }
    return stripe;
  };

  // Webhook needs raw body
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const stripeClient = getStripe();
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn('STRIPE_WEBHOOK_SECRET is not set. Skipping webhook verification.');
    }

    let event;

    try {
      if (webhookSecret && sig) {
        event = stripeClient.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        event = JSON.parse(req.body);
      }
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const clinicId = session.metadata?.clinicId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        
        if (clinicId && subscriptionId) {
          const stripeClient = getStripe();
          const subscription = await stripeClient.subscriptions.retrieve(subscriptionId) as any;
          
          await firestore.collection('clinics').doc(clinicId).update({
            'subscription.status': 'active',
            'subscription.stripeCustomerId': customerId,
            'subscription.stripeSubscriptionId': subscriptionId,
            'subscription.planName': 'Plano OralCloud Ativo',
            'subscription.currentPeriodEnd': admin.firestore.Timestamp.fromMillis(subscription.current_period_end * 1000)
          });
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const clinicId = subscription.metadata?.clinicId;
        
        if (clinicId) {
          await firestore.collection('clinics').doc(clinicId).update({
            'subscription.status': subscription.status,
            'subscription.currentPeriodEnd': admin.firestore.Timestamp.fromMillis(subscription.current_period_end * 1000)
          });
        }
        break;
      }
    }

    res.json({ received: true });
  });

  app.use(express.json());

  // API Routes
  app.post("/api/stripe/create-checkout", async (req, res) => {
    try {
      const { priceId, clinicId, customerEmail } = req.body;
      
      if (!priceId) {
        return res.status(400).json({ 
          error: 'O ID do produto no Stripe não foi configurado corretamente nas variáveis de ambiente (VITE_STRIPE_MONTHLY_PRICE_ID ou VITE_STRIPE_YEARLY_PRICE_ID).' 
        });
      }

      console.log(`Iniciando Checkout Stripe: Clínica=${clinicId}, Preço=${priceId}, Email=${customerEmail}`);
      const stripeClient = getStripe();

      const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        subscription_data: {
          trial_period_days: 7,
          metadata: {
            clinicId,
          },
        },
        success_url: `${req.headers.origin}/configuracoes?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/configuracoes?canceled=true`,
        metadata: {
          clinicId,
        },
        customer_email: customerEmail,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('ERRO STRIPE CHECKOUT:', error);
      
      let message = 'Ocorreu um erro ao processar o pagamento.';
      if (error.message.includes('recurring price')) {
        message = 'Configuração incorreta no Stripe: O ID do preço enviado não é um plano de assinatura recorrente. Verifique se o produto no Stripe está configurado como "Recurring" (recorrente).';
      } else if (error.code === 'resource_missing') {
        message = 'Ocorreu um erro: O ID do plano informado não foi encontrado na sua conta Stripe.';
      }
      
      res.status(500).json({ error: message, details: error.message });
    }
  });

  app.post("/api/stripe/create-portal", async (req, res) => {
    try {
      const { clinicId, customerId: providedCustomerId } = req.body;
      const stripeClient = getStripe();

      let customerId = providedCustomerId;

      // If customerId not provided, fetch from Firestore
      if (!customerId && clinicId) {
        const clinicDoc = await firestore.collection('clinics').doc(clinicId).get();
        if (clinicDoc.exists) {
          customerId = clinicDoc.data()?.subscription?.stripeCustomerId;
        }
      }
      
      if (!customerId) {
        return res.status(400).json({ error: 'ID do cliente Stripe não encontrado para esta clínica.' });
      }

      const session = await stripeClient.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${req.headers.origin}/configuracoes`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Portal Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
