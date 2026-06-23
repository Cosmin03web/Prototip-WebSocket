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

  // =========================================================
  // LOGICA WEBSOCKET (Arhitectura Event-Driven / Push)
  // =========================================================
  useEffect(() => {
    // Deschidem o singură conexiune persistentă
    const ws = new WebSocket('ws://localhost:8080');

    ws.onopen = () => {
      setWsStatus('Conectat (Live)');
      setError(null);
    };

    // React doar "ascultă". Când serverul împinge date, React redesenează ecranul.
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

    // Curățăm conexiunea dacă utilizatorul închide pagina
    return () => {
      ws.close();
    };
  }, []); // Array gol = se rulează o singură dată la deschiderea paginii

  // --- Logica Matematică a Calculatorului ---
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
        <h1>Financial Market Aggregator</h1>
        <span className="architecture-label" style={{ backgroundColor: '#8e44ad' }}>
          Arhitectură: WebSocket Gateway (Push Events) - Stare: {wsStatus}
        </span>
      </div>

      {error && <div className="error" style={{textAlign: 'center', color: 'red'}}>{error}</div>}
      {!data && !error && <div className="loading">⏳ Se așteaptă date pe canalul WebSocket...</div>}

      {data && (
        <>
          <div className="dashboard-grid">
            
            <div className="card" style={{ borderTop: '5px solid #f39c12' }}>
              <h2>Bitcoin (BTC)</h2>
              {data.bitcoin ? (
                <>
                  <div className="price-main">${data.bitcoin.price}</div>
                  <div>24h: <span className={data.bitcoin.change >= 0 ? 'positive' : 'negative'}>{data.bitcoin.change >= 0 ? '+' : ''}{data.bitcoin.change}%</span></div>
                </>
              ) : <p>Indisponibil</p>}
            </div>

            <div className="card" style={{ borderTop: '5px solid #8e44ad' }}>
              <h2>Altcoin Watch</h2>
              {data.altcoins && data.altcoins.length > 0 ? (
                <ul className="data-list">
                  {data.altcoins.map((coin, i) => (
                    <li key={i}><strong>{coin.symbol}</strong><div><span style={{ marginRight: '15px' }}>${coin.price}</span><span className={coin.change >= 0 ? 'positive' : 'negative'}>{coin.change >= 0 ? '+' : ''}{coin.change}%</span></div></li>
                  ))}
                </ul>
              ) : <p>Indisponibil</p>}
            </div>

            <div className="card" style={{ borderTop: '5px solid #34495e' }}>
              <h2>Tech Giants (Wall St)</h2>
              {data.stocks && data.stocks.length > 0 ? (
                <ul className="data-list">
                  {data.stocks.map((stock, i) => (
                    <li key={i}><strong>{stock.symbol}</strong><div><span style={{ marginRight: '15px' }}>${stock.price}</span><span className={stock.changePercent >= 0 ? 'positive' : 'negative'}>{stock.changePercent >= 0 ? '+' : ''}{stock.changePercent}%</span></div></li>
                  ))}
                </ul>
              ) : <p>Setează FINNHUB_KEY în .env</p>}
            </div>

            <div className="card" style={{ borderTop: '5px solid #2ecc71' }}>
              <h2>Forex: Puterea USD</h2>
              {data.fiat ? (
                <ul className="data-list" style={{ marginTop: '10px' }}>
                  <li><span className="currency-flag">🇪🇺 EUR</span> <span className="currency-val">€{data.fiat.rates.EUR}</span></li>
                  <li><span className="currency-flag">🇬🇧 GBP</span> <span className="currency-val">£{data.fiat.rates.GBP}</span></li>
                  <li><span className="currency-flag">🇨🇭 CHF</span> <span className="currency-val">₣{data.fiat.rates.CHF}</span></li>
                  <li><span className="currency-flag">🇷🇴 RON</span> <span className="currency-val">{data.fiat.rates.RON} lei</span></li>
                </ul>
              ) : <p>Indisponibil</p>}
            </div>

            <div className="card" style={{ borderTop: '5px solid #27ae60' }}>
              <h2>Schimb Valutar</h2>
              {data.fiat ? (
                <div className="calc-inputs">
                  <div className="calc-group">
                    <label>Sumă:</label>
                    <input type="number" className="calc-input" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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

            <div className="card" style={{ borderTop: '5px solid #e74c3c' }}>
              <h2>Trending Crypto</h2>
              {data.trending.crypto.length > 0 ? (
                <ul className="data-list">
                  {data.trending.crypto.map((coin, i) => (
                    <li key={i}><strong>{coin.name}</strong> ({coin.symbol}) <span style={{color: '#f1c40f'}}>🔥</span></li>
                  ))}
                </ul>
              ) : <p>Indisponibil</p>}
            </div>

            <div className="card" style={{ borderTop: '5px solid #1abc9c' }}>
              <h2>Trending NFTs</h2>
              {data.trending.nfts.length > 0 ? (
                <ul className="data-list">
                  {data.trending.nfts.map((nft, i) => (
                    <li key={i}><strong>{nft.name}</strong> ({nft.symbol}) <span style={{color: '#3498db'}}>🖼️</span></li>
                  ))}
                </ul>
              ) : <p>Indisponibil</p>}
            </div>

          </div>

          <div className="timestamp">
            🔄 Ultima actualizare împinsă de server la: <strong>{new Date(data.timestamp).toLocaleTimeString()}</strong>
          </div>
        </>
      )}
    </div>
  );
}

export default App;