const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const EXPORT_DIR = path.join(__dirname, '..', 'exports');

function ensureExportDir() {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

function createZipFromFolder(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    ensureExportDir();
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function exportChapterImages({ slug, chapter }) {
  const sourceDir = path.join(__dirname, '..', 'data', 'cache', slug, chapter);
  if (!fs.existsSync(sourceDir)) {
    fs.mkdirSync(sourceDir, { recursive: true });
    const placeholder = path.join(sourceDir, 'readme.txt');
    fs.writeFileSync(placeholder, 'ENT export placeholder for offline viewing.');
  }

  const outputPath = path.join(EXPORT_DIR, `${slug}-${chapter}.zip`);
  await createZipFromFolder(sourceDir, outputPath);

  return {
    filename: path.basename(outputPath),
    downloadUrl: `/api/download/${path.basename(outputPath)}`
  };
}

module.exports = {
  exportChapterImages
};
