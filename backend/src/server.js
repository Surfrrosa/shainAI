import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool } from './lib/db.js';
import { searchMemory } from './tools/search_memory.js';
import { getFacts } from './tools/get_facts.js';
import { writeMemory } from './tools/write_memory.js';
import { ask } from './lib/orchestrator.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Tool endpoints
app.post('/tools/search_memory', async (req, res) => {
  try {
    const { query, project, top_k = 10, since } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const results = await searchMemory({ query, project, top_k, since });
    res.json(results);
  } catch (error) {
    console.error('search_memory error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/tools/get_facts', async (req, res) => {
  try {
    const { project, kind, keys } = req.body;

    const results = await getFacts({ project, kind, keys });
    res.json(results);
  } catch (error) {
    console.error('get_facts error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/tools/write_memory', async (req, res) => {
  try {
    const { project, type, payload } = req.body;

    if (!project || !type || !payload) {
      return res.status(400).json({ error: 'project, type, and payload are required' });
    }

    const result = await writeMemory({ project, type, payload });
    res.json(result);
  } catch (error) {
    console.error('write_memory error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Orchestration endpoint (for chat)
app.post('/api/ask', async (req, res) => {
  try {
    const { message, project, model } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const result = await ask({ message, project, model });
    res.json(result);
  } catch (error) {
    console.error('ask error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ingest conversation into memory
app.post('/api/ingest-conversation', async (req, res) => {
  try {
    const { messages, project = 'personal' } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // Create a conversation summary
    const timestamp = new Date().toISOString();
    const conversationId = `conv_${Date.now()}`;

    // Build conversation text
    let conversationText = '';
    messages.forEach((msg, idx) => {
      const speaker = msg.role === 'user' ? 'User' : 'ShainAI';
      conversationText += `${speaker}: ${msg.content}\n\n`;

      // Add citations if present
      if (msg.citations && msg.citations.length > 0) {
        conversationText += `Sources referenced:\n`;
        msg.citations.forEach(c => {
          conversationText += `- ${c.title} (${c.uri})\n`;
        });
        conversationText += '\n';
      }
    });

    // Extract first user message as title
    const firstUserMsg = messages.find(m => m.role === 'user');
    const title = firstUserMsg
      ? firstUserMsg.content.substring(0, 80) + (firstUserMsg.content.length > 80 ? '...' : '')
      : 'ShainAI Conversation';

    // Create URI
    const uri = `shainai://conversation/${conversationId}`;

    // Write to memory
    const result = await writeMemory({
      project,
      type: 'chunk',
      payload: {
        source: 'shainai',
        uri,
        title: `ShainAI Chat: ${title}`,
        content: `# ShainAI Conversation\nDate: ${timestamp}\n\n${conversationText}`,
        tokens: Math.ceil(conversationText.length / 4), // Rough token estimate
      }
    });

    console.log(`💾 Saved conversation to memory: ${uri}`);
    res.json({ success: true, uri, ...result });
  } catch (error) {
    console.error('ingest-conversation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ ShainAI backend running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await pool.end();
  process.exit(0);
});
