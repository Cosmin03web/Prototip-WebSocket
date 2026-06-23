import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [wsStatus, setWsStatus] = useState('Se conectează...');

  // --- Stări pentru Calculatorul Valutar ---
  const [amount, setAmount] = useState(100);
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');

  // LOGICA WEBSOCKET (Arhitectura Event-Driven / Push)

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');

    ws.onopen = () => {
      setWsStatus('Conectat (Live)');
      setError(null);
    };

    ws.onmessage = (event) => {
      const result = JSON.parse(event.data);
      if (result.error) {
        setError(result.error);
      } else {
        setData(result);
        setError(null);
      }
    };

    ws.onclose = () => {
      setWsStatus('Deconectat');
      setError('Conexiunea WebSocket s-a închis. Serverul este oprit?');
    };

    ws.onerror = (err) => {
      setError('Eroare conexiune WebSocket');
    };

    return () => {
      ws.close();
    };
  }, []); 
  
  const calculateConversion = () => {
    if (!data || !data.fiat) return '0.00';
    const rates = { USD: 1, ...data.fiat.rates };
    const rateFrom = rates[fromCurrency];
    const rateTo = rates[toCurrency];
    if (!rateFrom || !rateTo) return '0.00';
    return ((amount / rateFrom) * rateTo).toFixed(2);
  };

  const availableCurrencies = ['USD', 'EUR', 'GBP', 'CHF', 'RON', 'JPY'];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Global Markets Aggregator</h1>
        {/* Notă: Aici îți vei pune manual eticheta potrivită (REST sau WebSocket) în funcție de ce prototip rulezi */}
        <span className="architecture-label" style={{ backgroundColor: '#8e44ad' }}>
          Platformă activă (Vezi codul curent)
        </span>
      </div>

      {error && <div className="error" style={{textAlign: 'center', color: '#e74c3c', fontWeight: 'bold', padding: '20px'}}>{error}</div>}
      {!data && !error && <div className="loading">⏳ Inițializare arhitectură sistem...</div>}

      {data && (
        <>
          <div className="dashboard-grid">
            
            {/* WIDGET 1: BITCOIN MAIN */}
            <div className="card" style={{ borderTop: '5px solid #f59e0b' }}>
              <h2>🟠 Bitcoin (BTC)</h2>
              {data.bitcoin ? (
                <>
                  <div className="price-main">${data.bitcoin.price}</div>
                  <div>
                    Evoluție 24h: <span className={data.bitcoin.change >= 0 ? 'positive' : 'negative'} style={{ marginLeft: '10px' }}>
                      {data.bitcoin.change >= 0 ? '+' : ''}{data.bitcoin.change}%
                    </span>
                  </div>
                </>
              ) : <p>Indisponibil</p>}
            </div>

            {/* WIDGET 2: ALTCOIN WATCH */}
            <div className="card" style={{ borderTop: '5px solid #8b5cf6' }}>
              <h2>🟣 Altcoin Watch</h2>
              {data.altcoins && data.altcoins.length > 0 ? (
                <ul className="data-list">
                  {data.altcoins.map((coin, i) => (
                    <li key={i}>
                      <strong>{coin.symbol}</strong>
                      <div>
                        <span style={{ marginRight: '15px', fontWeight: 'bold' }}>${coin.price}</span>
                        <span className={coin.change >= 0 ? 'positive' : 'negative'}>
                          {coin.change >= 0 ? '+' : ''}{coin.change}%
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <p>Indisponibil</p>}
            </div>

            {/* WIDGET 3: TECH STOCKS (FINNHUB) */}
            <div className="card" style={{ borderTop: '5px solid #334155' }}>
              <h2>🖥️ Tech Giants (Wall St)</h2>
              {data.stocks && data.stocks.length > 0 ? (
                <ul className="data-list">
                  {data.stocks.map((stock, i) => (
                    <li key={i}>
                      <strong>{stock.symbol}</strong>
                      <div>
                        <span style={{ marginRight: '15px', fontWeight: 'bold' }}>${stock.price}</span>
                        <span className={stock.changePercent >= 0 ? 'positive' : 'negative'}>
                          {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent}%
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <p>Date indisponibile. (Verifică cheia API)</p>}
            </div>

            {/* WIDGET 4: FOREX (FRANKFURTER) */}
            <div className="card" style={{ borderTop: '5px solid #10b981' }}>
              <h2>💵 Forex: Puterea USD</h2>
              {data.fiat ? (
                <ul className="data-list">
                  <li><span className="currency-flag">🇪🇺 EUR</span> <span className="currency-val">€{data.fiat.rates.EUR}</span></li>
                  <li><span className="currency-flag">🇬🇧 GBP</span> <span className="currency-val">£{data.fiat.rates.GBP}</span></li>
                  <li><span className="currency-flag">🇨🇭 CHF</span> <span className="currency-val">₣{data.fiat.rates.CHF}</span></li>
                  <li><span className="currency-flag">🇷🇴 RON</span> <span className="currency-val">{data.fiat.rates.RON} lei</span></li>
                </ul>
              ) : <p>Indisponibil</p>}
            </div>

            {/* WIDGET 5: CALCULATOR VALUTAR */}
            <div className="card" style={{ borderTop: '5px solid #3b82f6' }}>
              <h2>💱 Schimb Valutar</h2>
              {data.fiat ? (
                <div className="calc-inputs">
                  <div className="calc-group">
                    <label>Sumă (Bază USD):</label>
                    <input type="number" className="calc-input" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div className="calc-group">
                      <label>Din:</label>
                      <select className="calc-select" value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value)}>
                        {availableCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="calc-group">
                      <label>În:</label>
                      <select className="calc-select" value={toCurrency} onChange={(e) => setToCurrency(e.target.value)}>
                        {availableCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="calc-result-box">
                    <div className="calc-result-title">Rezultat estimat</div>
                    <div className="calc-result-value">{calculateConversion()} {toCurrency}</div>
                  </div>
                </div>
              ) : <p>Indisponibil</p>}
            </div>

            {/* WIDGET 6: TRENDING CRYPTO */}
            <div className="card" style={{ borderTop: '5px solid #ef4444' }}>
              <h2>🔥 Trending Crypto (24h)</h2>
              {data.trending.crypto.length > 0 ? (
                <ul className="data-list">
                  {data.trending.crypto.map((coin, i) => (
                    <li key={i}>
                      <span><strong>{coin.name}</strong> <span style={{color: '#94a3b8'}}>({coin.symbol})</span></span>
                      <span style={{fontSize: '1.2rem'}}>📈</span>
                    </li>
                  ))}
                </ul>
              ) : <p>Indisponibil temporar (Rate Limit)</p>}
            </div>

            {/* WIDGET 7 (FULL WIDTH): TRENDING NFTS */}
            <div className="card full-width" style={{ borderTop: '5px solid #14b8a6', borderBottom: '5px solid #14b8a6' }}>
              <h2>🖼️ Colecții NFT în Căutare (Global)</h2>
              {data.trending.nfts.length > 0 ? (
                <div className="nft-horizontal-grid">
                  {data.trending.nfts.map((nft, i) => (
                    <div className="nft-item" key={i}>
                      <span className="nft-icon">🎨</span>
                      <strong style={{ fontSize: '1.1rem', display: 'block', color: '#1e293b' }}>{nft.name}</strong>
                      <span style={{ color: '#64748b', fontSize: '0.9rem' }}>{nft.symbol}</span>
                    </div>
                  ))}
                </div>
              ) : <p style={{textAlign: 'center', color: '#94a3b8'}}>Indisponibil temporar (Rate Limit)</p>}
            </div>

          </div>

          <div className="timestamp">
            🔄 Ultima actualizare a datelor: <strong>{new Date(data.timestamp).toLocaleTimeString()}</strong>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
