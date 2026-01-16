const express = require('express');
const fetch = require('node-fetch');
const app = express();

const PORT = process.env.PORT || 3000;

// Add CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.get('/transcript', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }
  
  try {
    console.log('[server] Fetching transcript from:', url.substring(0, 80) + '...');
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.youtube.com/'
      },
      timeout: 10000
    });
    
    if (!response.ok) {
      console.log('[server] YouTube returned status:', response.status);
      return res.status(response.status).json({ error: `YouTube returned ${response.status}` });
    }
    
    const text = await response.text();
    console.log('[server] Received', text.length, 'bytes from YouTube');
    
    if (!text || text.length === 0) {
      return res.status(200).json({ data: '', message: 'Empty response from YouTube' });
    }
    
    res.json({ data: text, length: text.length });
  } catch (error) {
    console.error('[server] Error fetching transcript:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Transcript server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Fetch transcript: http://localhost:${PORT}/transcript?url=<CAPTION_URL>`);
});
