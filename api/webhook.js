export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Retorno imediato para validar o webhook (importante!)
  res.status(200).json({ received: true });

  // A lógica do seu redirecionamento continua abaixo...
  try {
    const data = req.body;
    console.log('📩 Webhook recebido:', JSON.stringify(data, null, 2));

    const clienteId = data?.customer || data?.customer_id;
    if (!clienteId) return;

    const clienteCarteira = JSON.parse(fs.readFileSync('./clienteCarteira.json'));
    const carteiraResponsavel = JSON.parse(fs.readFileSync('./carteiraResponsavel.json'));

    const carteira = data.wallet || clienteCarteira[clienteId];
    const operador = carteiraResponsavel[carteira];

    if (!carteira || !operador) return;

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

  } catch (e) {
    console.error('Erro no webhook:', e);
  }
}
