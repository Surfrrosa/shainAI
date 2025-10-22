import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';
import { chunkText, batchInsertChunks } from './utils.js';

async function ingestFile(filePath, project) {
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);

  console.log(`\nIngesting file: ${filePath}`);

  let content = '';

  try {
    if (ext === '.pdf') {
      const buffer = await fs.readFile(filePath);
      const data = await pdfParse(buffer);
      content = data.text;
    } else if (ext === '.md' || ext === '.txt') {
      content = await fs.readFile(filePath, 'utf-8');
    } else {
      console.log(`Unsupported file type: ${ext}`);
      return;
    }

    // Chunk large files
    const textChunks = chunkText(content, 1000);
    const chunks = textChunks.map((chunk, index) => ({
      project,
      source: 'file',
      uri: `file://${filePath}#chunk${index}`,
      title: `${fileName}${textChunks.length > 1 ? ` (part ${index + 1}/${textChunks.length})` : ''}`,
      content: chunk,
    }));

    console.log(`\n📦 Inserting ${chunks.length} chunks...`);
    const stats = await batchInsertChunks(chunks);

    console.log(`\n✅ Done!`);
    console.log(`  Inserted: ${stats.inserted}`);
    console.log(`  Skipped: ${stats.skipped}`);
    console.log(`  Total tokens: ${stats.tokens}`);

  } catch (error) {
    console.error('Error ingesting file:', error.message);
  }
}

async function ingestDirectory(dirPath, project) {
  console.log(`\nIngesting directory: ${dirPath}`);

  try {
    const files = await fs.readdir(dirPath);
    const allChunks = [];

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = await fs.stat(filePath);

      if (stat.isDirectory()) {
        continue; // Skip subdirectories for now
      }

      const ext = path.extname(file).toLowerCase();
      if (!['.pdf', '.md', '.txt'].includes(ext)) {
        continue;
      }

      console.log(`\nProcessing: ${file}`);

      let content = '';
      if (ext === '.pdf') {
        const buffer = await fs.readFile(filePath);
        const data = await pdfParse(buffer);
        content = data.text;
      } else {
        content = await fs.readFile(filePath, 'utf-8');
      }

      const textChunks = chunkText(content, 1000);
      const chunks = textChunks.map((chunk, index) => ({
        project,
        source: 'file',
        uri: `file://${filePath}#chunk${index}`,
        title: `${file}${textChunks.length > 1 ? ` (part ${index + 1}/${textChunks.length})` : ''}`,
        content: chunk,
      }));

      allChunks.push(...chunks);
    }

    console.log(`\n📦 Inserting ${allChunks.length} chunks from ${files.length} files...`);
    const stats = await batchInsertChunks(allChunks);

    console.log(`\n✅ Done!`);
    console.log(`  Inserted: ${stats.inserted}`);
    console.log(`  Skipped: ${stats.skipped}`);
    console.log(`  Total tokens: ${stats.tokens}`);

  } catch (error) {
    console.error('Error ingesting directory:', error.message);
  }
}

// Example usage
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node files.js <path> <project> [--dir]');
  console.log('Example: node files.js ~/Documents/notes.pdf pomodoroflow');
  console.log('Example: node files.js ~/Documents/notes pomodoroflow --dir');
  process.exit(1);
}

const [filePath, project, flag] = args;
if (flag === '--dir') {
  await ingestDirectory(filePath, project);
} else {
  await ingestFile(filePath, project);
}

process.exit(0);
