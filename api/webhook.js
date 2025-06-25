import fs from 'fs';
import fetch from 'node-fetch';

const clienteCarteira = JSON.parse(fs.readFileSync('./clienteCarteira.json', 'utf8'));
const carteiraResponsavel = JSON.parse(fs.readFileSync('./carteiraResponsavel.json', 'utf8'));

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const msg = req.body;
  const clienteId = msg.customer || msg.customer_id;
  const carteira = msg.wallet || clienteCarteira[clienteId];
  const operador = carteiraResponsavel[carteira];

  if (!clienteId || !operador) {
    console.log('⚠️ Cliente ou operador ausente:', { clienteId, carteira });
    return res.status(200).send('Ignorado');
  }

  const response = await fetch(`${process.env.API_BASE_URL}/forward-to-customer`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ customer: clienteId, employee: operador }),
  });

  const result = await response.text();
  console.log(`🔁 Redirecionando ${clienteId} para ${operador} =>`, result);

  res.status(200).send('OK');
}