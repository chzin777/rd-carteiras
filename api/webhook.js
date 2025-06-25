import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    // Confirmação imediata
    res.status(200).json({ received: true });

    try {
        const data = req.body;
        console.log('📩 Webhook recebido:', JSON.stringify(data, null, 2));

        const clienteId = data?.contact?.id || data?.customer || data?.customer_id;
        if (!clienteId) {
            console.log('⚠️ ID do cliente não encontrado no corpo do webhook.');
            return;
        }

        // Caminhos dos arquivos JSON
        const clienteCarteiraPath = path.resolve(process.cwd(), 'api/clienteCarteira.json');
        const fluxoCarteiraPath = path.resolve(process.cwd(), 'api/fluxoCarteira.json');

        // Carregamento dos arquivos
        const clienteCarteira = JSON.parse(fs.readFileSync(clienteCarteiraPath, 'utf-8'));
        const fluxoCarteira = JSON.parse(fs.readFileSync(fluxoCarteiraPath, 'utf-8'));

        // Determina a carteira e o fluxo
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

        // Faz o redirecionamento para o fluxo via forward-to-customer
        const response = await fetch(`${process.env.API_BASE_URL}/v2/forward-to-customer`, {
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
            const errorText = await response.text();
            console.error(`❌ Erro ao direcionar cliente ${clienteId} para o fluxo:`, errorText);
        } else {
            console.log(`✅ Cliente ${clienteId} direcionado com sucesso para o fluxo da carteira ${carteira}`);
        }

    } catch (e) {
        console.error('❌ Erro no webhook:', e);
    }
}
