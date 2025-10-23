import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { batchInsertChunks, chunkText } from './utils.js';

/**
 * Ingest Mac Notes
 * Mac Notes are stored in ~/Library/Group Containers/group.com.apple.notes/
 */
export async function ingestMacNotes(project = 'personal') {
  console.log(`\n📒 Ingesting Mac Notes...`);

  const notesDir = path.join(
    process.env.HOME,
    'Library/Group Containers/group.com.apple.notes/NoteStore.sqlite'
  );

  if (!fs.existsSync(notesDir)) {
    console.error(`Mac Notes database not found at: ${notesDir}`);
    console.error('Make sure you have Mac Notes set up and have created some notes.');
    return { inserted: 0, skipped: 0, tokens: 0 };
  }

  try {
    // Open Notes database (read-only)
    const db = new Database(notesDir, { readonly: true, fileMustExist: true });

    // Query notes
    const notes = db.prepare(`
      SELECT
        ZICNOTEDATA.ZDATA as data,
        ZICCLOUDSYNCINGOBJECT.ZTITLE1 as title,
        ZICCLOUDSYNCINGOBJECT.ZMODIFICATIONDATE1 as modified,
        ZICCLOUDSYNCINGOBJECT.ZCREATIONDATE1 as created,
        ZICNOTEDATA.ZIDENTIFIER as id
      FROM ZICCLOUDSYNCINGOBJECT
      LEFT JOIN ZICNOTEDATA ON ZICCLOUDSYNCINGOBJECT.ZNOTEDATA = ZICNOTEDATA.Z_PK
      WHERE ZICCLOUDSYNCINGOBJECT.ZTITLE1 IS NOT NULL
        AND ZICNOTEDATA.ZDATA IS NOT NULL
    `).all();

    db.close();

    console.log(`Found ${notes.length} notes`);

    if (notes.length === 0) {
      console.log('No notes found');
      return { inserted: 0, skipped: 0, tokens: 0 };
    }

    // Convert notes to memory chunks
    const memoryChunks = [];

    for (const note of notes) {
      try {
        // Notes data is stored as binary plist/protobuf
        // Try to extract text (this is a simplified version)
        const buffer = note.data;
        let content = '';

        if (buffer) {
          // Try to extract text from binary data
          // This is a basic extraction - Mac Notes uses a complex format
          try {
            content = buffer.toString('utf8')
              .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ') // Remove control characters
              .replace(/\s+/g, ' ')
              .trim();

            // If content looks like binary garbage, skip
            if (content.length < 10 || content.split(' ').filter(w => w.length > 15).length > content.split(' ').length * 0.5) {
              continue;
            }
          } catch {
            continue;
          }
        }

        if (!content || content.length === 0) {
          continue;
        }

        const title = note.title || 'Untitled';
        const created = note.created
          ? new Date(note.created * 1000 + new Date('2001-01-01').getTime()).toISOString()
          : new Date().toISOString();
        const modified = note.modified
          ? new Date(note.modified * 1000 + new Date('2001-01-01').getTime()).toISOString()
          : created;

        // Chunk the note
        const chunks = chunkText(content, 1500);

        chunks.forEach((chunk, idx) => {
          memoryChunks.push({
            project,
            source: 'mac-notes',
            uri: `apple-notes://note/${note.id}#chunk${idx}`,
            title: chunks.length > 1
              ? `${title} (part ${idx + 1}/${chunks.length})`
              : title,
            content: `# ${title}\nCreated: ${created}\nModified: ${modified}\n\n${chunk}`,
          });
        });
      } catch (error) {
        console.error(`Error processing note "${note.title}":`, error.message);
      }
    }

    console.log(`Created ${memoryChunks.length} chunks from ${notes.length} notes`);
    console.log('Inserting into database...');

    const result = await batchInsertChunks(memoryChunks);

    console.log(`\n✅ Done!`);
    console.log(`   Inserted: ${result.inserted}`);
    console.log(`   Skipped: ${result.skipped}`);
    console.log(`   Total tokens: ${result.tokens.toLocaleString()}`);

    return result;
  } catch (error) {
    console.error('Error accessing Mac Notes:', error.message);
    console.error('You may need to grant Terminal access to your Notes in System Preferences > Privacy & Security');
    return { inserted: 0, skipped: 0, tokens: 0 };
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const project = process.env.PROJECT || 'personal';

  ingestMacNotes(project)
    .then(() => {
      console.log('\n✓ Mac Notes ingestion complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Mac Notes ingestion failed:', error);
      process.exit(1);
    });
}
