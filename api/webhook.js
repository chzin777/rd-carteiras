import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    res.status(200).json({ received: true });

    try {
        const data = req.body;
        console.log('📩 Webhook recebido:', JSON.stringify(data, null, 2));

        const clienteId = data?.contact?.id || data?.customer || data?.customer_id;
        if (!clienteId) {
            console.log('⚠️ ID do cliente não encontrado no corpo do webhook.');
            return;
        }

        const clienteCarteiraPath = path.resolve(process.cwd(), 'api/clienteCarteira.json');
        const fluxoCarteiraPath = path.resolve(process.cwd(), 'api/fluxoCarteira.json');

        const clienteCarteira = JSON.parse(fs.readFileSync(clienteCarteiraPath, 'utf-8'));
        const fluxoCarteira = JSON.parse(fs.readFileSync(fluxoCarteiraPath, 'utf-8'));

        const carteira = data.wallet || clienteCarteira[clienteId];
        if (!carteira) {
            console.log(`⚠️ Carteira não encontrada para cliente ${clienteId}`);
            return;
        }

        const fluxoId = fluxoCarteira[carteira.toUpperCase()];
        if (!fluxoId) {
            console.log(`⚠️ Fluxo não encontrado para carteira ${carteira}`);
            return;
        }

        const response = await fetch(`${process.env.API_BASE_URL}/start-flow`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                customer: clienteId,
                flow: fluxoId
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error(`❌ Erro ao iniciar fluxo para cliente ${clienteId}:`, error);
        } else {
            console.log(`✅ Cliente ${clienteId} direcionado para o fluxo da carteira ${carteira}`);
        }

    } catch (e) {
        console.error('❌ Erro no webhook:', e);
    }
}
