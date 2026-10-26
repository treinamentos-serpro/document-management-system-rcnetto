const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');
const { createDocumentRouter } = require('./routes/documentRoutes');
const { createDocumentController } = require('./controllers/documentController');
const { createDocumentService } = require('./services/documentService');
const { createDocumentRepository } = require('./repositories/documentRepository');

function createApp(options = {}) {
  const storageDir = options.storageDir || process.env.STORAGE_DIR
    ? path.resolve(options.storageDir || process.env.STORAGE_DIR)
    : path.join(__dirname, '..', 'storage');
  const maxFileSize = options.maxFileSize || Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;
  const repository = createDocumentRepository();
  const service = createDocumentService({ repository, storageDir: path.resolve(storageDir) });
  const controller = createDocumentController({ service });
  const app = express();

  fs.mkdirSync(storageDir, { recursive: true });
  app.use(express.json());
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  app.use(createDocumentRouter({ controller, storageDir, maxFileSize }));
  app.use((req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Recurso não encontrado.' } });
  });
  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    if (error instanceof multer.MulterError) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'O arquivo excede o tamanho máximo permitido.'
        : 'Não foi possível processar o arquivo enviado.';
      return res.status(status).json({ error: { code: error.code, message } });
    }

    console.error(error);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Ocorreu um erro interno.' },
    });
  });

  return app;
}

const app = createApp();

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
module.exports.createApp = createApp;
