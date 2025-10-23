import fs from 'fs';
import path from 'path';
import tar from 'tar-stream';
import { batchInsertChunks, chunkText } from './utils.js';

/**
 * Parse Joplin export file (.jex)
 * Joplin exports are tar archives containing markdown files and metadata
 */
export async function ingestJoplinExport(jexFilePath, project = 'personal') {
  console.log(`\n📓 Ingesting Joplin export: ${jexFilePath}`);

  return new Promise((resolve, reject) => {
    const extract = tar.extract();
    const notes = [];
    let notebookMap = {};
    let resourceMap = {};

    extract.on('entry', (header, stream, next) => {
      const chunks = [];

      stream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      stream.on('end', () => {
        const content = Buffer.concat(chunks).toString('utf8');

        try {
          // Joplin exports contain .md files (markdown notes)
          if (header.name.endsWith('.md')) {
            // Extract metadata from markdown header
            const lines = content.split('\n');
            let title = 'Untitled';
            let id = path.basename(header.name, '.md');
            let body = content;
            let createdTime = new Date().toISOString();
            let updatedTime = createdTime;
            let parentId = null;

            // Check if first line is a title (# Title format)
            if (lines[0] && lines[0].startsWith('# ')) {
              title = lines[0].substring(2).trim();
              body = lines.slice(1).join('\n').trim();
            }

            // Extract id from markdown if it contains "id: xxxx" pattern
            const idMatch = content.match(/id:\s*([a-f0-9]+)/i);
            if (idMatch) {
              id = idMatch[1];
            }

            // Extract parent_id
            const parentMatch = content.match(/parent_id:\s*([a-f0-9]+)/i);
            if (parentMatch) {
              parentId = parentMatch[1];
            }

            // Extract dates if present
            const createdMatch = content.match(/created_time:\s*(\d+)/);
            if (createdMatch) {
              createdTime = new Date(parseInt(createdMatch[1])).toISOString();
            }

            const updatedMatch = content.match(/updated_time:\s*(\d+)/);
            if (updatedMatch) {
              updatedTime = new Date(parseInt(updatedMatch[1])).toISOString();
            }

            notes.push({
              id,
              title,
              body,
              createdTime,
              updatedTime,
              parentId,
              tags: [],
            });
          }
        } catch (error) {
          // Skip malformed entries
          console.error(`Error parsing ${header.name}:`, error.message);
        }

        next();
      });

      stream.resume();
    });

    extract.on('finish', async () => {
      console.log(`Found ${notes.length} notes`);

      if (notes.length === 0) {
        console.log('No notes found in export');
        resolve({ inserted: 0, skipped: 0, tokens: 0 });
        return;
      }

      // Convert notes to memory chunks
      const memoryChunks = [];

      for (const note of notes) {
        if (!note.body || note.body.trim().length === 0) {
          continue;
        }

        // Get notebook name
        const notebookName = note.parentId && notebookMap[note.parentId]
          ? notebookMap[note.parentId]
          : 'Uncategorized';

        // Chunk the note body
        const chunks = chunkText(note.body, 1500);

        chunks.forEach((chunk, idx) => {
          memoryChunks.push({
            project,
            source: 'joplin',
            uri: `joplin://note/${note.id}#chunk${idx}`,
            title: chunks.length > 1
              ? `${note.title} (part ${idx + 1}/${chunks.length})`
              : note.title,
            content: `# ${note.title}\nNotebook: ${notebookName}\nCreated: ${note.createdTime}\nUpdated: ${note.updatedTime}\n\n${chunk}`,
          });
        });
      }

      console.log(`Created ${memoryChunks.length} chunks from ${notes.length} notes`);
      console.log('Inserting into database...');

      try {
        const result = await batchInsertChunks(memoryChunks);

        console.log(`\n✅ Done!`);
        console.log(`   Inserted: ${result.inserted}`);
        console.log(`   Skipped: ${result.skipped}`);
        console.log(`   Total tokens: ${result.tokens.toLocaleString()}`);

        resolve(result);
      } catch (error) {
        reject(error);
      }
    });

    extract.on('error', reject);

    // Read the .jex file and pipe it to the extractor
    const readStream = fs.createReadStream(jexFilePath);
    readStream.pipe(extract);
  });
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const jexFile = process.argv[2];

  if (!jexFile) {
    console.error('Usage: node joplin.js <path-to-jex-file>');
    process.exit(1);
  }

  if (!fs.existsSync(jexFile)) {
    console.error(`File not found: ${jexFile}`);
    process.exit(1);
  }

  const project = process.env.PROJECT || 'personal';

  ingestJoplinExport(jexFile, project)
    .then(() => {
      console.log('\n✓ Joplin ingestion complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Joplin ingestion failed:', error);
      process.exit(1);
    });
}
