import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import { batchInsertChunks, chunkText } from './utils.js';

// File extensions to watch
const WATCH_EXTENSIONS = [
  '.md', '.txt', '.markdown',
  '.js', '.ts', '.jsx', '.tsx',
  '.py', '.rb', '.go', '.rs',
];

// Directories to ignore
const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
  '**/__pycache__/**',
  '**/.DS_Store',
  '**/*.log',
];

/**
 * Process file and ingest into database
 */
async function ingestFile(filePath, project = 'personal') {
  try {
    console.log(`\n📝 Processing: ${filePath}`);

    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.trim().length === 0) {
      console.log('  ⏭ Skipped (empty file)');
      return;
    }

    // Skip large files
    if (content.length > 1000000) {
      console.log('  ⏭ Skipped (file too large)');
      return;
    }

    const fileName = path.basename(filePath);
    const relativePath = filePath.replace(process.env.HOME, '~');

    // Chunk the content
    const chunks = chunkText(content, 1500);

    const memoryChunks = chunks.map((chunk, idx) => ({
      project,
      source: 'local',
      uri: `file://${filePath}#chunk${idx}`,
      title: chunks.length > 1 ? `${fileName} (part ${idx + 1}/${chunks.length})` : fileName,
      content: `# ${fileName}\nPath: ${relativePath}\n\n${chunk}`,
    }));

    const result = await batchInsertChunks(memoryChunks);
    console.log(`  ✓ Inserted ${result.inserted} chunks (${result.tokens} tokens)`);
  } catch (error) {
    console.error(`  ✗ Error ingesting ${filePath}:`, error.message);
  }
}

/**
 * Delete file chunks from database
 */
async function removeFile(filePath) {
  try {
    console.log(`\n🗑️  Removing: ${filePath}`);
    const { pool } = await import('./utils.js');
    const result = await pool.query(
      'DELETE FROM memory_chunks WHERE uri LIKE $1',
      [`file://${filePath}%`]
    );
    console.log(`  ✓ Removed ${result.rowCount} chunks`);
  } catch (error) {
    console.error(`  ✗ Error removing ${filePath}:`, error.message);
  }
}

/**
 * Start watching directories
 */
export function startWatcher(directories, project = 'personal', options = {}) {
  const {
    verbose = true,
    debounceMs = 2000, // Wait 2 seconds after file change before ingesting
  } = options;

  const expandedDirs = directories.map(dir => dir.replace('~', process.env.HOME));

  console.log('🔍 ShainAI File Watcher');
  console.log('======================\n');
  console.log(`Watching directories:`);
  expandedDirs.forEach(dir => console.log(`  - ${dir}`));
  console.log(`\nProject: ${project}`);
  console.log(`Debounce: ${debounceMs}ms\n`);

  const watcher = chokidar.watch(expandedDirs, {
    ignored: IGNORE_PATTERNS,
    persistent: true,
    ignoreInitial: true, // Don't trigger on startup
    awaitWriteFinish: {
      stabilityThreshold: debounceMs,
      pollInterval: 100,
    },
  });

  // Debounce map to prevent multiple ingestions
  const debounceMap = new Map();

  watcher
    .on('add', filePath => {
      const ext = path.extname(filePath).toLowerCase();
      if (WATCH_EXTENSIONS.includes(ext)) {
        if (verbose) console.log(`\n➕ File added: ${filePath}`);
        ingestFile(filePath, project);
      }
    })
    .on('change', filePath => {
      const ext = path.extname(filePath).toLowerCase();
      if (WATCH_EXTENSIONS.includes(ext)) {
        if (verbose) console.log(`\n✏️  File changed: ${filePath}`);

        // Debounce rapid changes
        if (debounceMap.has(filePath)) {
          clearTimeout(debounceMap.get(filePath));
        }

        const timeoutId = setTimeout(() => {
          ingestFile(filePath, project);
          debounceMap.delete(filePath);
        }, 500);

        debounceMap.set(filePath, timeoutId);
      }
    })
    .on('unlink', filePath => {
      const ext = path.extname(filePath).toLowerCase();
      if (WATCH_EXTENSIONS.includes(ext)) {
        if (verbose) console.log(`\n➖ File deleted: ${filePath}`);
        removeFile(filePath);
      }
    })
    .on('error', error => {
      console.error('\n❌ Watcher error:', error);
    })
    .on('ready', () => {
      console.log('✅ Watcher ready. Monitoring for changes...\n');
      console.log('Press Ctrl+C to stop.\n');
    });

  return watcher;
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  const defaultDirs = [
    '~/Desktop',
    '~/Downloads',
    '~/Documents',
    '~/projects', // Add your projects directory
  ];

  const directories = args.length > 0 ? args : defaultDirs;
  const project = process.env.PROJECT || 'personal';

  const watcher = startWatcher(directories, project);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping watcher...');
    watcher.close().then(() => {
      console.log('✅ Watcher stopped');
      process.exit(0);
    });
  });
}
