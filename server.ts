import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import cors from 'cors';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Lazy initialize Mercado Pago
  let mpClient: MercadoPagoConfig | null = null;
  const getMPClient = () => {
    if (!mpClient) {
      const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (!token) {
        console.warn('MERCADOPAGO_ACCESS_TOKEN missing');
        throw new Error('MERCADOPAGO_ACCESS_TOKEN environment variable is required');
      }
      mpClient = new MercadoPagoConfig({ accessToken: token });
      console.log('Mercado Pago client initialized.');
    }
    return mpClient;
  };

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.post('/api/mercadopago/create-preference', async (req, res) => {
    try {
      const { clinicId, customerEmail, title, price } = req.body;
      
      console.log('[DEBUG] MP Preference Request:', { clinicId, customerEmail, title, price });
      
      if (!price || !title) {
        return res.status(400).json({ error: 'Dados insuficientes para criar o pagamento.' });
      }

      const client = getMPClient();
      const preference = new Preference(client);
      const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;

      const result = await preference.create({
        body: {
          items: [
            {
              id: title.toLowerCase().includes('anual') ? 'plan_yearly' : 'plan_monthly',
              title: `Assinatura OralCloud - ${title}`,
              quantity: 1,
              unit_price: Number(price),
              currency_id: 'BRL'
            }
          ],
          payer: {
            email: customerEmail,
          },
          back_urls: {
            success: `${origin}/#/configuracoes?success=true`,
            failure: `${origin}/#/configuracoes?error=true`,
            pending: `${origin}/#/configuracoes?pending=true`,
          },
          auto_return: 'approved',
          metadata: {
            clinicId,
            customerEmail,
            planType: title
          }
        }
      });

      console.log('[DEBUG] Preference created:', result.id);
      res.json({ url: result.init_point }); // init_point é o link de checkout
    } catch (error: any) {
      console.error('[MERCADO PAGO SERVER ERROR]:', error);
      res.status(500).json({ error: error.message || 'Erro ao processar pagamento com Mercado Pago.' });
    }
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
