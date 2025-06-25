import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const data = req.body;
    console.log('📩 Webhook recebido:', JSON.stringify(data, null, 2));

    try {
        const clienteId = data?.customer || data?.customer_id;

        if (!clienteId) {
            return res.status(400).json({ error: 'ID do cliente não encontrado' });
        }

        // Carregar os arquivos JSON
        const clienteCarteira = JSON.parse(fs.readFileSync(path.resolve('./clienteCarteira.json')));
        const carteiraResponsavel = JSON.parse(fs.readFileSync(path.resolve('./carteiraResponsavel.json')));

        const carteira = data.wallet || clienteCarteira[clienteId];
        const operador = carteiraResponsavel[carteira];

        if (!carteira || !operador) {
            console.log(`⚠️ Cliente ${clienteId} sem carteira ou operador atribuído.`);
            return res.status(200).json({ message: 'Sem ação. Carteira ou operador não definido.' });
        }

        // Redirecionar o cliente
        const response = await fetch(`${process.env.API_BASE_URL}/forward-to-customer`, {
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

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro ao redirecionar:', errorText);
            return res.status(500).json({ error: 'Falha ao redirecionar cliente' });
        }

        console.log(`✅ Cliente ${clienteId} redirecionado com sucesso para ${operador}`);
        return res.status(200).json({ message: 'Redirecionado com sucesso' });

    } catch (error) {
        console.error('❌ Erro geral no webhook:', error);
        return res.status(500).json({ error: 'Erro no processamento do webhook' });
    }
}
