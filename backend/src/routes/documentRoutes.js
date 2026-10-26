const { randomUUID } = require('node:crypto');
const multer = require('multer');
const express = require('express');

function createDocumentRouter({ controller, storageDir, maxFileSize }) {
  const router = express.Router();
  const upload = multer({
    storage: multer.diskStorage({
      destination: storageDir,
      filename: (req, file, callback) => callback(null, randomUUID()),
    }),
    limits: {
      fileSize: maxFileSize,
      files: 1,
      fields: 0,
      parts: 2,
      fieldNameSize: 100,
      headerPairs: 50,
    },
  });

  router.post('/upload', controller.requireUser, upload.single('file'), controller.upload);
  router.get('/documents', controller.requireUser, controller.list);
  router.get('/documents/:id/download', controller.requireUser, controller.download);

  return router;
}

module.exports = { createDocumentRouter };