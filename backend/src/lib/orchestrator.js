import Anthropic from '@anthropic-ai/sdk';
import { searchMemory } from '../tools/search_memory.js';
import { getFacts } from '../tools/get_facts.js';
import { SYSTEM_PROMPT, CITATION_PROMPT } from './prompts.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Orchestrate a full RAG query
 * @param {Object} params
 * @param {string} params.message - User's question
 * @param {string} [params.project] - Optional project filter
 * @returns {Promise<Object>} Answer with citations and suggestions
 */
export async function ask({ message, project }) {
  try {
    // Step 1: Retrieve relevant memories
    console.log('🔍 Searching memory...');
    const memories = await searchMemory({
      query: message,
      project: project || undefined,
      top_k: 5,
    });

    // Step 2: Get relevant facts
    console.log('📋 Fetching facts...');
    const facts = await getFacts({
      project: project || undefined,
    });

    // Step 3: Build context
    const contextParts = [];

    if (memories.length > 0) {
      contextParts.push('## Memory Chunks\n');
      memories.forEach((mem, i) => {
        contextParts.push(`[${i + 1}] ${mem.title} (similarity: ${mem.similarity})`);
        contextParts.push(`URI: ${mem.uri}`);
        contextParts.push(`Content: ${mem.content.substring(0, 500)}...\n`);
      });
    }

    if (facts.length > 0) {
      contextParts.push('\n## Facts\n');
      facts.forEach(fact => {
        contextParts.push(`• ${fact.kind}: ${fact.key} = ${fact.value}`);
      });
    }

    const context = contextParts.join('\n');

    // Step 4: Generate answer with Claude
    console.log('🤖 Generating answer...');
    const prompt = CITATION_PROMPT
      .replace('{context}', context)
      .replace('{question}', message);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const answerText = response.content[0].text;

    // Step 5: Parse citations and suggestions
    const citations = memories.map(mem => ({
      id: mem.id,
      title: mem.title,
      uri: mem.uri,
      similarity: mem.similarity,
      source: mem.source,
    }));

    // Extract suggested writes (basic parsing)
    const suggestions = [];
    const suggestedWritesMatch = answerText.match(/💡 Suggested writes?:(.*?)(\n\n|$)/s);
    if (suggestedWritesMatch) {
      const suggestedText = suggestedWritesMatch[1];

      // Parse fact suggestions
      const factMatches = suggestedText.matchAll(/Fact:\s*([^=]+?)\s*=\s*"([^"]+)"/g);
      for (const match of factMatches) {
        suggestions.push({
          type: 'fact',
          kind: 'decision', // default kind
          key: match[1].trim(),
          value: match[2].trim(),
        });
      }

      // Parse journal suggestions
      const journalMatches = suggestedText.matchAll(/Journal:\s*(.+)/g);
      for (const match of journalMatches) {
        suggestions.push({
          type: 'journal',
          summary: match[1].trim(),
        });
      }
    }

    return {
      answer: answerText,
      citations,
      suggestions,
      metadata: {
        memories_retrieved: memories.length,
        facts_retrieved: facts.length,
        model: 'claude-sonnet-4-5-20250929',
      },
    };

  } catch (error) {
    console.error('Orchestration error:', error);
    throw error;
  }
}
