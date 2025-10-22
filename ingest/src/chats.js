import 'dotenv/config';
import fs from 'fs/promises';
import { chunkText, batchInsertChunks } from './utils.js';

async function ingestChatExport(filePath, project) {
  console.log(`\nIngesting chat export: ${filePath}`);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    let chats;

    // Try to parse as JSON
    try {
      chats = JSON.parse(content);
    } catch {
      // If not JSON, treat as plain text
      console.log('  Not JSON, treating as plain text...');
      const chunks = [{
        project,
        source: 'chat',
        uri: `chat://${filePath}`,
        title: `Chat export: ${filePath}`,
        content: content,
      }];

      const stats = await batchInsertChunks(chunks);
      console.log(`\n✅ Done! Inserted: ${stats.inserted}, Skipped: ${stats.skipped}`);
      return;
    }

    // Parse structured chat export (Claude, ChatGPT, etc.)
    const chunks = [];

    if (Array.isArray(chats)) {
      // Array of chat messages
      for (const chat of chats) {
        const messages = chat.messages || [chat];
        const chatId = chat.id || chat.conversation_id || Math.random().toString(36);
        const chatTitle = chat.title || `Chat ${chatId.substring(0, 8)}`;

        // Combine messages into a single chunk per conversation
        const conversationText = messages.map(m => {
          const role = m.role || m.author?.role || 'unknown';
          const text = m.content || m.text || '';
          return `[${role}]: ${text}`;
        }).join('\n\n');

        chunks.push({
          project,
          source: 'chat',
          uri: `chat://${chatId}`,
          title: chatTitle,
          content: conversationText,
        });
      }
    } else if (chats.messages) {
      // Single chat object
      const messages = chats.messages;
      const chatId = chats.id || chats.conversation_id || Math.random().toString(36);
      const chatTitle = chats.title || `Chat ${chatId.substring(0, 8)}`;

      const conversationText = messages.map(m => {
        const role = m.role || m.author?.role || 'unknown';
        const text = m.content || m.text || '';
        return `[${role}]: ${text}`;
      }).join('\n\n');

      chunks.push({
        project,
        source: 'chat',
        uri: `chat://${chatId}`,
        title: chatTitle,
        content: conversationText,
      });
    }

    console.log(`\n📦 Inserting ${chunks.length} chat chunks...`);
    const stats = await batchInsertChunks(chunks);

    console.log(`\n✅ Done!`);
    console.log(`  Inserted: ${stats.inserted}`);
    console.log(`  Skipped: ${stats.skipped}`);
    console.log(`  Total tokens: ${stats.tokens}`);

  } catch (error) {
    console.error('Error ingesting chat export:', error.message);
  }
}

// Example usage
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node chats.js <path> <project>');
  console.log('Example: node chats.js ~/Downloads/claude-chats.json pomodoroflow');
  process.exit(1);
}

const [filePath, project] = args;
await ingestChatExport(filePath, project);
process.exit(0);
