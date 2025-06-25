import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Evita interrupção prematura no Vercel
  res.writeHead(200).end();

  try {
    const data = req.body;
    console.log('📩 Webhook recebido:', JSON.stringify(data, null, 2));

    const clienteId = data?.contact?.id || data?.customer || data?.customer_id;
    if (!clienteId) {
      console.log('⚠️ ID do cliente não encontrado no corpo do webhook.');
      return;
    }

    const clienteCarteiraPath = path.resolve(process.cwd(), 'api/clienteCarteira.json');
    const carteiraResponsavelPath = path.resolve(process.cwd(), 'api/carteiraResponsavel.json');

    const clienteCarteira = JSON.parse(fs.readFileSync(clienteCarteiraPath, 'utf-8'));
    const carteiraResponsavel = JSON.parse(fs.readFileSync(carteiraResponsavelPath, 'utf-8'));

    const carteira = data.wallet || clienteCarteira[clienteId];
    const operador = carteiraResponsavel[carteira];

    if (!carteira || !operador) {
      console.log(`⚠️ Carteira ou operador não encontrados para cliente ${clienteId}`);
      return;
    }

    const forwardResponse = await fetch(`${process.env.API_BASE_URL}/forward-to-customer`, {
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

    const responseText = await forwardResponse.text();

    if (!forwardResponse.ok) {
      console.error(`❌ Falha ao redirecionar cliente ${clienteId}:`, responseText);
    } else {
      console.log(`✅ Cliente ${clienteId} redirecionado com sucesso para ${operador} (carteira ${carteira})`);
      console.log(`🔄 Resposta da API:`, responseText);
    }

  } catch (e) {
    console.error('❌ Erro no webhook:', e);
  }
}
