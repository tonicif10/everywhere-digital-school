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

// AI Search endpoint for deep research
app.post('/api/ai-search', async (req, res) => {
  try {
    const { query, location, level, type } = req.body;

    if (!query || !location) {
      return res.status(400).json({ error: 'Query and location are required' });
    }

    const systemPrompt = `És um assistente especializado em análise de mercado e estratégia para a Lisbon Digital School (LDS),
uma escola de formação em competências digitais com sede em Lisboa, Portugal.
A LDS está a realizar uma digressão chamada "Everywhere Digital School" por várias cidades de Portugal.

O teu objectivo é fornecer informação detalhada, actualizada e accionável para ajudar a planear eventos em diferentes localidades.
Responde sempre em Português de Portugal.
Usa formatação Markdown para estruturar a resposta.
Sê específico com nomes de empresas, instituições, contactos e links quando possível.
Baseia as tuas respostas em dados reais e actualizados.`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.2,
        max_tokens: 4000,
        search_recency_filter: 'month'
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Perplexity API error:', data.error);
      return res.status(500).json({ error: data.error.message || 'AI search failed' });
    }

    const content = data.choices?.[0]?.message?.content || 'Sem resultados disponíveis';

    res.json({
      content,
      location,
      level,
      type,
      timestamp: new Date().toISOString(),
      citations: data.citations || []
    });

  } catch (error) {
    console.error('AI Search error:', error);
    res.status(500).json({ error: 'Erro ao fazer pesquisa IA: ' + error.message });
  }
});

// Serve the dashboard directly (auth temporarily disabled)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'demo.html'));
});

// Full app (may have loading issues)
app.get('/full', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

// Login page available at /login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve the main app (auth disabled)
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

// Export the app for Vercel
module.exports = app;

// Start server only if running directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Everywhere Digital School server running at http://localhost:${PORT}`);
  });
}
