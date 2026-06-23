require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const axios = require('axios');
const client = require('prom-client');

const FINNHUB_KEY = process.env.FINNHUB_KEY;

// 1. CONFIGURARE PROMETHEUS (Pentru testele Grafana) pe portul 8081

const app = express();
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

const activeConnections = new client.Gauge({
    name: 'websocket_conexiuni_active',
    help: 'Numarul curent de conexiuni WebSocket deschise'
});

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
});

const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend-dashboard/build')));
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../frontend-dashboard/build', 'index.html'));
});

app.listen(8081, () => {
    console.log(`[Metrici Grafana] Expuse pe http://localhost:8081/metrics`);
});

// 2. SERVERUL WEBSOCKET (Push Gateway) pe portul 8080

const wss = new WebSocket.Server({ port: 8080 }, () => {
    console.log(`[WebSocket Gateway] Serverul ascultă pe ws://localhost:8080`);
});

async function fetchAllData() {
    try {
        const binanceSymbols = encodeURI('["BTCUSDT","ETHUSDT","SOLUSDT"]');

        const [binanceRes, frankfurterRes, coinGeckoRes, aaplRes, msftRes, nvdaRes] = await Promise.all([
            axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbols=${binanceSymbols}`).catch(() => ({ data: [] })),
            axios.get('https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY,RON,CHF').catch(() => ({ data: { error: true } })),
            axios.get('https://api.coingecko.com/api/v3/search/trending').catch(() => ({ data: { error: true } })),
            axios.get(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${FINNHUB_KEY}`).catch(() => ({ data: { error: true } })),
            axios.get(`https://finnhub.io/api/v1/quote?symbol=MSFT&token=${FINNHUB_KEY}`).catch(() => ({ data: { error: true } })),
            axios.get(`https://finnhub.io/api/v1/quote?symbol=NVDA&token=${FINNHUB_KEY}`).catch(() => ({ data: { error: true } }))
        ]);

        const cryptoData = Array.isArray(binanceRes.data) ? binanceRes.data : [];
        const formatStock = (res, sym) => (res.data.error || !res.data.c) ? null : { symbol: sym, price: parseFloat(res.data.c).toFixed(2), changePercent: parseFloat(res.data.dp).toFixed(2) };

        let trendingCoins = [], trendingNFTs = [];
        if (!coinGeckoRes.data.error) {
            if (coinGeckoRes.data.coins) trendingCoins = coinGeckoRes.data.coins.slice(0, 3).map(c => ({ name: c.item.name, symbol: c.item.symbol }));
            if (coinGeckoRes.data.nfts) trendingNFTs = coinGeckoRes.data.nfts.slice(0, 3).map(n => ({ name: n.name, symbol: n.symbol }));
        }

        return {
            timestamp: new Date().toISOString(),
            bitcoin: cryptoData.find(c => c.symbol === 'BTCUSDT') ? { price: parseFloat(cryptoData.find(c => c.symbol === 'BTCUSDT').lastPrice).toFixed(2), change: parseFloat(cryptoData.find(c => c.symbol === 'BTCUSDT').priceChangePercent).toFixed(2) } : null,
            altcoins: [
                cryptoData.find(c => c.symbol === 'ETHUSDT') ? { symbol: 'ETH', price: parseFloat(cryptoData.find(c => c.symbol === 'ETHUSDT').lastPrice).toFixed(2), change: parseFloat(cryptoData.find(c => c.symbol === 'ETHUSDT').priceChangePercent).toFixed(2) } : null,
                cryptoData.find(c => c.symbol === 'SOLUSDT') ? { symbol: 'SOL', price: parseFloat(cryptoData.find(c => c.symbol === 'SOLUSDT').lastPrice).toFixed(2), change: parseFloat(cryptoData.find(c => c.symbol === 'SOLUSDT').priceChangePercent).toFixed(2) } : null
            ].filter(a => a !== null),
            stocks: [formatStock(aaplRes, 'AAPL'), formatStock(msftRes, 'MSFT'), formatStock(nvdaRes, 'NVDA')].filter(s => s !== null),
            fiat: frankfurterRes.data.error ? null : { date: frankfurterRes.data.date, rates: frankfurterRes.data.rates },
            trending: { crypto: trendingCoins, nfts: trendingNFTs }
        };
    } catch (error) {
        return { error: "Eroare la adunarea datelor externe" };
    }
}


// 3. LOGICA DE BROADCAST (Inima sistemului WebSocket)

setInterval(async () => {
    if (wss.clients.size > 0) {
        const latestData = await fetchAllData();
        const message = JSON.stringify(latestData);
        
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
}, 10000);

wss.on('connection', async (ws) => {
    activeConnections.inc(); 
    console.log(`[Client conectat] Total activi: ${wss.clients.size}`);

    const initialData = await fetchAllData();
    ws.send(JSON.stringify(initialData));

    ws.on('close', () => {
        activeConnections.dec(); 
        console.log(`[Client deconectat] Total activi: ${wss.clients.size}`);
    });
});
