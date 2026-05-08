import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import cors from 'cors';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Let express know it's behind a proxy (Cloud Run)
  app.set('trust proxy', true);

  app.use(cors());
  app.use(express.json());

  // Request logger for ALL calls to debug routing
  app.use((req, res, next) => {
    if (!req.url.startsWith('/@vite') && !req.url.startsWith('/src')) {
      console.log(`[REQ ${new Date().toISOString()}] ${req.method} ${req.url}`);
    }
    next();
  });

  // Lazy initialize Mercado Pago
  let mpClient: MercadoPagoConfig | null = null;
  const getMPClient = () => {
    if (!mpClient) {
      const rawToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (!rawToken) {
        console.warn('MERCADOPAGO_ACCESS_TOKEN missing');
        throw new Error('MERCADOPAGO_ACCESS_TOKEN environment variable is required');
      }
      
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

  // Debug config (security: only check existence)
  app.get('/api/debug-config', (req, res) => {
    res.json({
      hasMpToken: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
      hasMpPublicKey: !!process.env.VITE_MERCADOPAGO_PUBLIC_KEY,
      nodeEnv: process.env.NODE_ENV,
      origin: req.headers.origin,
      timestamp: new Date().toISOString()
    });
  });

  app.post('/api/mercadopago/create-preference', async (req, res) => {
    try {
      const { clinicId, customerEmail, title, price } = req.body;
      console.log('[DEBUG] Create Preference Start:', { clinicId, title, price });
      
      const rawToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (!rawToken) {
        console.error('[ERROR] MERCADOPAGO_ACCESS_TOKEN is not defined in environment variables');
        return res.status(500).json({ 
          error: 'Credenciais do Mercado Pago ausentes.',
          details: 'MERCADOPAGO_ACCESS_TOKEN não está definido no servidor.' 
        });
      }

      const token = rawToken.trim().replace(/['"\[\]]/g, '');
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.get('host');
      const origin = req.headers.origin || `${protocol}://${host}`;

      console.log('[DEBUG] Payload for MP API prepared. Origin:', origin);
      
      const preferenceData = {
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
      };

      const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferenceData)
      });

      if (!mpResponse.ok) {
        let errorData;
        try {
          errorData = await mpResponse.json();
        } catch (e) {
          errorData = await mpResponse.text();
        }
        console.error('[MERCADO PAGO API ERROR]:', mpResponse.status, JSON.stringify(errorData));
        return res.status(mpResponse.status).json({ 
          error: 'Erro na API do Mercado Pago.',
          details: errorData 
        });
      }

      const result = await mpResponse.json();
      console.log('[DEBUG] Preference created successfully ID:', result.id);
      res.json({ url: result.init_point });
    } catch (error: any) {
      console.error('[MERCADO PAGO SERVER EXCEPTION]:', error);
      res.status(500).json({ 
        error: 'Exceção interna no servidor ao processar pagamento.',
        details: error.message || String(error)
      });
    }
  });

  // Catch-all for API routes
  app.all('/api/*', (req, res) => {
    console.warn(`[WARN] Unhandled API route requested: ${req.method} ${req.url}`);
    res.status(404).json({ 
      error: 'Endpoint da API não encontrado.',
      path: req.url 
    });
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
