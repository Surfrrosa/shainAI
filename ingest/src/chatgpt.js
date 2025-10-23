import fs from 'fs';
import { batchInsertChunks } from './utils.js';

/**
 * Extract messages from conversation mapping tree
 */
function extractMessages(mapping) {
  const messages = [];

  // Traverse the mapping tree
  const traverseNode = (nodeId, node) => {
    if (node.message && node.message.content && node.message.content.parts) {
      const role = node.message.author?.role;
      const content = node.message.content.parts.join('\n').trim();
      const createTime = node.message.create_time;

      // Only include user and assistant messages with actual content
      if ((role === 'user' || role === 'assistant') && content && content.length > 0) {
        messages.push({
          role,
          content,
          createTime,
        });
      }
    }

    // Traverse children
    if (node.children && node.children.length > 0) {
      node.children.forEach((childId) => {
        if (mapping[childId]) {
          traverseNode(childId, mapping[childId]);
        }
      });
    }
  };

  // Start from root
  if (mapping['client-created-root']) {
    traverseNode('client-created-root', mapping['client-created-root']);
  }

  return messages;
}

/**
 * Chunk a conversation into semantic exchanges
 */
function chunkConversation(conversation) {
  const chunks = [];
  const messages = extractMessages(conversation.mapping);

  if (messages.length === 0) {
    return chunks;
  }

  // Strategy: Create chunks from user-assistant exchanges
  // Group consecutive user + assistant messages together
  let currentChunk = [];
  let currentLength = 0;
  const MAX_CHUNK_LENGTH = 2000; // characters

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const msgText = `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`;

    // If adding this message would exceed max length, save current chunk and start new one
    if (currentLength + msgText.length > MAX_CHUNK_LENGTH && currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n\n'));
      currentChunk = [];
      currentLength = 0;
    }

    currentChunk.push(msgText);
    currentLength += msgText.length;
  }

  // Add remaining chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n\n'));
  }

  return chunks;
}

/**
 * Ingest ChatGPT conversation export
 */
export async function ingestChatGPT(filePath, project = 'personal') {
  console.log(`\nIngesting ChatGPT export: ${filePath} → project: ${project}`);

  // Read conversations.json
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`Found ${data.length} conversations`);

  const memoryChunks = [];

  for (const conversation of data) {
    const title = conversation.title || 'Untitled';
    const conversationId = conversation.id || conversation.create_time;
    const createTime = conversation.create_time
      ? new Date(conversation.create_time * 1000).toISOString()
      : new Date().toISOString();

    // Chunk the conversation
    const chunks = chunkConversation(conversation);

    if (chunks.length === 0) {
      continue;
    }

    // Create memory chunks
    chunks.forEach((chunkContent, idx) => {
      memoryChunks.push({
        project,
        source: 'chatgpt',
        uri: `chatgpt://conversation/${conversationId}#${idx}`,
        title: chunks.length > 1 ? `${title} (part ${idx + 1}/${chunks.length})` : title,
        content: `# ${title}\nDate: ${createTime}\n\n${chunkContent}`,
      });
    });
  }

  console.log(`\nCreated ${memoryChunks.length} chunks from ${data.length} conversations`);
  console.log('Inserting into database...');

  const stats = await batchInsertChunks(memoryChunks);

  console.log(`✅ Done!`);
  console.log(`   Inserted: ${stats.inserted}`);
  console.log(`   Skipped: ${stats.skipped}`);
  console.log(`   Total tokens: ${stats.tokens.toLocaleString()}`);

  return stats;
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const filePath = process.argv[2] || '/Users/surfrrosa/Downloads/chatgpt_export/conversations.json';
  const project = process.argv[3] || 'personal';

  ingestChatGPT(filePath, project)
    .then(() => {
      console.log('\n✓ ChatGPT ingestion complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ ChatGPT ingestion failed:', error);
      process.exit(1);
    });
}
