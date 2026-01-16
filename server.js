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

// List of user agents to rotate
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

function getRandomUserAgent() {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

app.get('/transcript', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }
  
  try {
    console.log('[server] Fetching transcript from:', url.substring(0, 80) + '...');
    
    // Try with multiple user agents and retries
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const userAgent = getRandomUserAgent();
        console.log(`[server] Attempt ${attempt + 1}/3, using user agent: ${userAgent.substring(0, 50)}...`);
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': userAgent,
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'https://www.youtube.com/',
            'Origin': 'https://www.youtube.com',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'Cache-Control': 'no-cache'
          },
          timeout: 15000
        });
        
        console.log(`[server] Attempt ${attempt + 1}: Response status ${response.status}`);
        
        if (!response.ok) {
          lastError = `HTTP ${response.status}`;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
          continue;
        }
        
        const text = await response.text();
        console.log(`[server] Attempt ${attempt + 1}: Received ${text.length} bytes`);
        
        if (text && text.length > 0) {
          console.log('[server] Success! Returning transcript');
          return res.json({ data: text, length: text.length, attempt: attempt + 1 });
        }
        
        lastError = 'Empty response';
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
        
      } catch (attemptError) {
        lastError = attemptError.message;
        console.log(`[server] Attempt ${attempt + 1} error:`, lastError);
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
        }
      }
    }
    
    // All attempts failed
    console.log('[server] All attempts failed. Last error:', lastError);
    return res.status(500).json({ 
      error: 'Failed to fetch from YouTube after 3 attempts',
      lastError: lastError
    });
    
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
