import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Confirmação imediata do recebimento do webhook
  res.status(200).json({ received: true });

  try {
    const data = req.body;
    console.log('📩 Webhook recebido:', JSON.stringify(data, null, 2));

    // Tenta identificar o ID do cliente de forma flexível
    const clienteId = data?.contact?.id || data?.customer || data?.customer_id;
    if (!clienteId) {
      console.log('⚠️ ID do cliente não encontrado no corpo do webhook.');
      return;
    }

    // Caminhos absolutos para os arquivos JSON
    const clienteCarteiraPath = path.resolve(process.cwd(), 'api/clienteCarteira.json');
    const carteiraResponsavelPath = path.resolve(process.cwd(), 'api/carteiraResponsavel.json');

    const clienteCarteira = JSON.parse(fs.readFileSync(clienteCarteiraPath, 'utf-8'));
    const carteiraResponsavel = JSON.parse(fs.readFileSync(carteiraResponsavelPath, 'utf-8'));

    // Determina carteira e operador
    const carteira = data.wallet || clienteCarteira[clienteId];
    const operador = carteiraResponsavel[carteira];

    if (!carteira || !operador) {
      console.log(`⚠️ Carteira ou operador não encontrados para cliente ${clienteId}`);
      return;
    }

    // Realiza redirecionamento via API
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

    if (!forwardResponse.ok) {
      const errorBody = await forwardResponse.text();
      console.error(`❌ Falha ao redirecionar cliente ${clienteId}:`, errorBody);
    } else {
      console.log(`✅ Cliente ${clienteId} redirecionado com sucesso para ${operador} (carteira ${carteira})`);
    }

  } catch (e) {
    console.error('❌ Erro no webhook:', e);
  }
}
