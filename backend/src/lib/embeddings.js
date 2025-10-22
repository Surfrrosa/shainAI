import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY not set. Embeddings will fail.');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getEmbedding(text) {
  if (!text || text.trim().length === 0) {
    throw new Error('Text is required for embedding');
  }

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8000), // Limit to ~8k chars to stay under token limit
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Embedding error:', error.message);
    throw error;
  }
}

export async function getBatchEmbeddings(texts) {
  if (!texts || texts.length === 0) {
    return [];
  }

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts.map(t => t.substring(0, 8000)),
    });

    return response.data.map(d => d.embedding);
  } catch (error) {
    console.error('Batch embedding error:', error.message);
    throw error;
  }
}
