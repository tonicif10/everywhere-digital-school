require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/brand', express.static('brand'));

// API endpoint to get environment variables (only public keys)
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: `https://${process.env.SUPABASE_PROJECT_REF}.supabase.co`,
    supabaseKey: process.env.SUPABASE_ANON_KEY || '',
    perplexityApiKey: process.env.PERPLEXITY_API_KEY || ''
  });
});

// Proxy endpoint for Perplexity API (to avoid CORS issues)
app.post('/api/perplexity', async (req, res) => {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Perplexity API error:', error);
    res.status(500).json({ error: 'Failed to fetch from Perplexity API' });
  }
});

// Serve the login page as default
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve the main app (protected by client-side auth)
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Everywhere Digital School server running at http://localhost:${PORT}`);
});
