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
      const rawToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (!rawToken) {
        console.warn('MERCADOPAGO_ACCESS_TOKEN missing');
        throw new Error('MERCADOPAGO_ACCESS_TOKEN environment variable is required');
      }
      
      // Clean token from accidental quotes, spaces or brackets
      const token = rawToken.trim().replace(/['"\[\]]/g, '');
      
      mpClient = new MercadoPagoConfig({ accessToken: token });
      console.log(`Mercado Pago client initialized. Token ends with: ...${token.slice(-4)}`);
    }
    return mpClient;
  };

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.get('/api/debug-config', (req, res) => {
    res.json({
      hasMpToken: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
      hasMpPublicKey: !!process.env.VITE_MERCADOPAGO_PUBLIC_KEY,
      nodeEnv: process.env.NODE_ENV,
      origin: req.headers.origin
    });
  });

  app.post('/api/mercadopago/create-preference', async (req, res) => {
    console.log('[DEBUG] POST /api/mercadopago/create-preference hit');
    try {
      const { clinicId, customerEmail, title, price } = req.body;
      
      console.log('[DEBUG] MP Preference Request Incoming:', { clinicId, customerEmail, title, price });
      
      if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
        console.error('[ERROR] MERCADOPAGO_ACCESS_TOKEN missing');
        return res.status(500).json({ 
          error: 'Credenciais do Mercado Pago não configuradas no servidor. Verifique o menu Settings no AI Studio.' 
        });
      }

      const rawToken = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
      const token = rawToken.trim().replace(/['"\[\]]/g, '');
      const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;

      console.log('[DEBUG] Calling Mercado Pago API directly with token length:', token.length);
      const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
        })
      });

      if (!mpResponse.ok) {
        const errorText = await mpResponse.text();
        console.error('[MERCADO PAGO API ERROR]:', mpResponse.status, errorText);
        throw new Error(`MP API Error ${mpResponse.status}: ${errorText}`);
      }

      const result = await mpResponse.json();
      console.log('[DEBUG] Preference created successfully:', result.id);
      res.json({ url: result.init_point });
    } catch (error: any) {
      console.error('[MERCADO PAGO SERVER EXCEPTION]:', error);
      
      const details = error.message || 'Unknown error';
      res.status(500).json({ 
        error: 'Erro ao processar pagamento com Mercado Pago.',
        details: details
      });
    }
  });

  // Catch-all for undefined API routes to prevent falling through to Vite (which returns HTML)
  app.all('/api/*', (req, res) => {
    console.warn(`[WARN] Unhandled API route: ${req.method} ${req.url}`);
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
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
