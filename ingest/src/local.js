import fs from 'fs';
import path from 'path';
import { batchInsertChunks, chunkText } from './utils.js';
import { parseFile } from './parsers.js';

// File extensions to ingest
const TEXT_EXTENSIONS = [
  '.md', '.txt', '.markdown',
  '.js', '.ts', '.jsx', '.tsx', '.json',
  '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp',
  '.html', '.css', '.scss', '.xml', '.yaml', '.yml',
  '.sh', '.bash', '.sql',
  '.env.example', '.gitignore',
];

const DOCUMENT_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.pages',
];

const IMAGE_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.svg',
];

const ARCHIVE_EXTENSIONS = [
  '.zip',
];

// Directories to skip
const SKIP_DIRS = [
  'node_modules', '.git', '.next', 'dist', 'build',
  '__pycache__', '.cache', '.vscode', '.idea',
  'Library', 'Applications', '.Trash',
  '.npm', '.yarn', '.cargo',
];

// File patterns to skip
const SKIP_PATTERNS = [
  /\.DS_Store/,
  /\.log$/,
  /\.lock$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /\.(mp4|mov|avi|mkv|webm)$/i,  // Videos
  /\.(mp3|wav|flac|aac|m4a)$/i,  // Audio
  /\.(tar|gz|rar|7z)$/i,  // Archives (except zip)
  /\.(exe|dmg|app|deb|rpm)$/i,  // Binaries
];

/**
 * Check if file should be processed
 */
function shouldProcessFile(filePath, fileName) {
  // Skip patterns
  if (SKIP_PATTERNS.some(pattern => pattern.test(fileName))) {
    return false;
  }

  const ext = path.extname(fileName).toLowerCase();

  // Check if it's a text file we care about
  if (TEXT_EXTENSIONS.includes(ext)) {
    return 'text';
  }

  // Check if it's a document
  if (DOCUMENT_EXTENSIONS.includes(ext)) {
    return 'document';
  }

  // Check if it's an image
  if (IMAGE_EXTENSIONS.includes(ext)) {
    return 'image';
  }

  // Check if it's an archive
  if (ARCHIVE_EXTENSIONS.includes(ext)) {
    return 'archive';
  }

  // .env files
  if (fileName === '.env' || fileName.endsWith('.env') || fileName.includes('.env.')) {
    return 'env';
  }

  // For files without extension, check if it's text
  if (!ext) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return content.length > 0 ? 'text' : false;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Check if directory should be processed
 */
function shouldProcessDir(dirName) {
  return !SKIP_DIRS.includes(dirName) && !dirName.startsWith('.');
}

/**
 * Recursively scan directory for files
 */
function* scanDirectory(dirPath, maxDepth = 10, currentDepth = 0) {
  if (currentDepth > maxDepth) {
    return;
  }

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (shouldProcessDir(entry.name)) {
          yield* scanDirectory(fullPath, maxDepth, currentDepth + 1);
        }
      } else if (entry.isFile()) {
        const shouldProcess = shouldProcessFile(fullPath, entry.name);
        if (shouldProcess) {
          yield { path: fullPath, type: shouldProcess === 'document' ? 'document' : 'text' };
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dirPath}:`, error.message);
  }
}

/**
 * Process a file using appropriate parser
 */
async function processFile(filePath, fileType, project) {
  try {
    const fileName = path.basename(filePath);
    const relativePath = filePath.replace(process.env.HOME, '~');

    let content;
    let metadata = {};

    // Use appropriate parser based on file type
    if (fileType === 'text') {
      content = fs.readFileSync(filePath, 'utf-8');
    } else {
      // Use specialized parser
      const parsed = await parseFile(filePath);
      if (!parsed || !parsed.content) {
        return [];
      }
      content = parsed.content;
      metadata = parsed.metadata || {};
    }

    // Skip empty content
    if (!content || content.trim().length === 0) {
      return [];
    }

    // Skip very large files (>1MB text content)
    if (content.length > 1000000) {
      console.log(`  ⏭ Skipping large file: ${filePath}`);
      return [];
    }

    // Chunk the content
    const chunks = chunkText(content, 1500);

    return chunks.map((chunk, idx) => ({
      project,
      source: 'local',
      uri: `file://${filePath}#chunk${idx}`,
      title: chunks.length > 1 ? `${fileName} (part ${idx + 1}/${chunks.length})` : fileName,
      content: `# ${fileName}\nPath: ${relativePath}\nType: ${fileType}\n${Object.entries(metadata).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${chunk}`,
    }));
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Get file stats
 */
function getFileStats(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      modified: stats.mtime.toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Ingest local directory
 */
export async function ingestLocalDirectory(dirPath, project = 'personal', options = {}) {
  const {
    maxDepth = 10,
    dryRun = false,
    verbose = false,
  } = options;

  console.log(`\n📁 Scanning directory: ${dirPath}`);
  console.log(`   Project: ${project}`);
  console.log(`   Max depth: ${maxDepth}`);
  if (dryRun) {
    console.log(`   🔍 DRY RUN - no data will be inserted`);
  }

  const memoryChunks = [];
  const fileStats = {
    total: 0,
    processed: 0,
    skipped: 0,
    documents: 0,
    errors: 0,
  };

  // Scan directory
  console.log('\n🔍 Scanning files...');
  for (const file of scanDirectory(dirPath, maxDepth)) {
    fileStats.total++;

    if (verbose) {
      const icon = file.type === 'document' ? '📄' :
                   file.type === 'image' ? '🖼️' :
                   file.type === 'archive' ? '📦' :
                   file.type === 'env' ? '🔐' : '📝';
      console.log(`  ${icon} Processing: ${file.path}`);
    }

    const chunks = await processFile(file.path, file.type, project);
    if (chunks.length > 0) {
      memoryChunks.push(...chunks);
      fileStats.processed++;
    } else {
      fileStats.skipped++;
    }

    // Progress every 100 files
    if (fileStats.total % 100 === 0) {
      console.log(`  Progress: ${fileStats.total} files scanned...`);
    }
  }

  console.log(`\n📊 Scan complete:`);
  console.log(`   Total files found: ${fileStats.total}`);
  console.log(`   Processed: ${fileStats.processed}`);
  console.log(`   Skipped: ${fileStats.skipped}`);
  console.log(`   Documents (PDFs, etc): ${fileStats.documents}`);
  console.log(`   Created ${memoryChunks.length} chunks`);

  if (dryRun) {
    console.log(`\n✅ Dry run complete - no data inserted`);
    return { dryRun: true, chunks: memoryChunks.length, stats: fileStats };
  }

  if (memoryChunks.length === 0) {
    console.log('\n⚠️  No chunks to insert');
    return { inserted: 0, skipped: 0, stats: fileStats };
  }

  console.log(`\n💾 Inserting ${memoryChunks.length} chunks into database...`);
  const result = await batchInsertChunks(memoryChunks);

  console.log(`\n✅ Done!`);
  console.log(`   Inserted: ${result.inserted}`);
  console.log(`   Skipped (duplicates): ${result.skipped}`);
  console.log(`   Total tokens: ${result.tokens.toLocaleString()}`);

  return { ...result, stats: fileStats };
}

/**
 * Ingest multiple directories
 */
export async function ingestMultipleDirectories(directories, project = 'personal', options = {}) {
  console.log(`\n🗂️  Ingesting ${directories.length} directories...`);

  const results = [];

  for (const dir of directories) {
    const expandedDir = dir.replace('~', process.env.HOME);

    if (!fs.existsSync(expandedDir)) {
      console.log(`\n⚠️  Directory not found: ${dir}`);
      continue;
    }

    const result = await ingestLocalDirectory(expandedDir, project, options);
    results.push({ dir, ...result });
  }

  // Summary
  console.log(`\n\n📈 TOTAL SUMMARY:`);
  const totalInserted = results.reduce((sum, r) => sum + (r.inserted || 0), 0);
  const totalSkipped = results.reduce((sum, r) => sum + (r.skipped || 0), 0);
  const totalTokens = results.reduce((sum, r) => sum + (r.tokens || 0), 0);

  console.log(`   Total inserted: ${totalInserted}`);
  console.log(`   Total skipped: ${totalSkipped}`);
  console.log(`   Total tokens: ${totalTokens.toLocaleString()}`);

  return results;
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  // Default directories to scan
  const defaultDirs = [
    '~/Desktop',
    '~/Downloads',
    '~/Documents',
  ];

  const directories = args.length > 0 ? args : defaultDirs;
  const project = process.env.PROJECT || 'personal';

  console.log('🧠 ShainAI - Local Directory Ingestion');
  console.log('=====================================\n');

  ingestMultipleDirectories(directories, project, { verbose: false })
    .then(() => {
      console.log('\n✓ Ingestion complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Ingestion failed:', error);
      process.exit(1);
    });
}
