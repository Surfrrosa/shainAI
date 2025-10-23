import fs from 'fs';
import path from 'path';
// import pdfParse from 'pdf-parse'; // Temporarily disabled due to library bug
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';
import AdmZip from 'adm-zip';

/**
 * Parse PDF file
 */
export async function parsePDF(filePath) {
  // Temporarily disabled due to pdf-parse library bug
  console.log(`⏭ PDF parsing temporarily disabled: ${filePath}`);
  return null;

  // try {
  //   const dataBuffer = fs.readFileSync(filePath);
  //   const data = await pdfParse(dataBuffer);
  //   return {
  //     content: data.text,
  //     metadata: {
  //       pages: data.numpages,
  //       info: data.info,
  //     },
  //   };
  // } catch (error) {
  //   console.error(`Error parsing PDF ${filePath}:`, error.message);
  //   return null;
  // }
}

/**
 * Parse Word document (.docx)
 */
export async function parseWordDoc(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return {
      content: result.value,
      metadata: {
        messages: result.messages,
      },
    };
  } catch (error) {
    console.error(`Error parsing Word doc ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Parse Pages document (convert to text)
 * Pages files are actually zip files containing XML
 */
export async function parsePages(filePath) {
  try {
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();

    // Look for index.xml or preview.pdf
    const indexEntry = entries.find(e => e.entryName === 'index.xml');
    const previewEntry = entries.find(e => e.entryName === 'QuickLook/Preview.pdf');

    if (previewEntry) {
      // Extract and parse preview PDF
      const pdfBuffer = previewEntry.getData();
      const data = await pdfParse(pdfBuffer);
      return {
        content: data.text,
        metadata: { source: 'preview.pdf' },
      };
    } else if (indexEntry) {
      // Parse XML (basic text extraction)
      const xmlContent = indexEntry.getData().toString('utf8');
      // Very basic text extraction from XML
      const textContent = xmlContent
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return {
        content: textContent,
        metadata: { source: 'index.xml' },
      };
    }

    return null;
  } catch (error) {
    console.error(`Error parsing Pages doc ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Parse image with OCR
 */
export async function parseImage(filePath) {
  try {
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng', {
      logger: () => {}, // Suppress logs
    });

    if (!text || text.trim().length === 0) {
      return null;
    }

    return {
      content: text,
      metadata: {
        ocr: true,
      },
    };
  } catch (error) {
    console.error(`Error parsing image ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Parse .env file
 */
export function parseEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Parse env variables
    const lines = content.split('\n');
    const variables = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        variables[key] = value;
      }
    }

    // Create searchable content
    const searchableContent = Object.entries(variables)
      .map(([key, value]) => {
        // Mask sensitive values but keep searchable
        const maskedValue = value.length > 20
          ? `${value.substring(0, 10)}...${value.substring(value.length - 5)}`
          : '***';
        return `${key}=${maskedValue}`;
      })
      .join('\n');

    return {
      content: `Environment Variables:\n\n${searchableContent}\n\nFull content:\n${content}`,
      metadata: {
        variableCount: Object.keys(variables).length,
        keys: Object.keys(variables),
      },
    };
  } catch (error) {
    console.error(`Error parsing .env file ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Extract and parse zip file
 */
export async function parseZip(filePath) {
  try {
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();

    const contents = [];

    for (const entry of entries) {
      if (entry.isDirectory) continue;

      const ext = path.extname(entry.entryName).toLowerCase();

      // Only extract text files
      if (['.txt', '.md', '.json', '.xml', '.csv'].includes(ext)) {
        try {
          const content = entry.getData().toString('utf8');
          contents.push({
            file: entry.entryName,
            content: content.substring(0, 5000), // Limit per file
          });
        } catch {
          // Skip binary or unreadable files
        }
      }
    }

    if (contents.length === 0) {
      return null;
    }

    const fullContent = contents
      .map(c => `=== ${c.file} ===\n${c.content}`)
      .join('\n\n');

    return {
      content: fullContent,
      metadata: {
        fileCount: entries.length,
        extractedFiles: contents.length,
        files: contents.map(c => c.file),
      },
    };
  } catch (error) {
    console.error(`Error parsing zip ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Detect file type and parse accordingly
 */
export async function parseFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);

  // PDF
  if (ext === '.pdf') {
    return await parsePDF(filePath);
  }

  // Word docs
  if (ext === '.docx' || ext === '.doc') {
    return await parseWordDoc(filePath);
  }

  // Pages
  if (ext === '.pages') {
    return await parsePages(filePath);
  }

  // Images
  if (['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff'].includes(ext)) {
    return await parseImage(filePath);
  }

  // SVG (treat as text/xml)
  if (ext === '.svg') {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { content, metadata: { type: 'svg' } };
  }

  // .env files
  if (fileName === '.env' || fileName.endsWith('.env') || fileName.includes('.env.')) {
    return parseEnvFile(filePath);
  }

  // Zip files
  if (ext === '.zip') {
    return await parseZip(filePath);
  }

  // Default: try to read as text
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { content, metadata: { type: 'text' } };
  } catch {
    return null;
  }
}
