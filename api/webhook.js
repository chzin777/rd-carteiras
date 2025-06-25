import fs from 'fs';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  res.status(200).json({ received: true }); // resposta imediata

  try {
    const data = req.body;
    console.log('📩 Webhook recebido:', JSON.stringify(data, null, 2));

    const clienteId = data?.contact?.id || data?.customer || data?.customer_id;
    if (!clienteId) {
      console.log('⚠️ ID do cliente não encontrado');
      return;
    }

    const clienteCarteira = JSON.parse(fs.readFileSync('./clienteCarteira.json'));
    const carteiraResponsavel = JSON.parse(fs.readFileSync('./carteiraResponsavel.json'));

    const carteira = data.wallet || clienteCarteira[clienteId];
    const operador = carteiraResponsavel[carteira];

    if (!carteira || !operador) {
      console.log(`⚠️ Carteira ou operador não encontrados para cliente ${clienteId}`);
      return;
    }

    await fetch(`${process.env.API_BASE_URL}/forward-to-customer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer: clienteId,
        employee: operador
      })
    });

    console.log(`✅ Cliente ${clienteId} redirecionado para ${operador} (carteira ${carteira})`);

  } catch (e) {
    console.error('Erro no webhook:', e);
  }
}
