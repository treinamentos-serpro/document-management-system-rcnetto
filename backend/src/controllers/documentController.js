function createDocumentController({ service }) {
  function requireUser(req, res, next) {
    const owner = req.get('X-User-Id')?.trim();
    if (!owner || owner.length > 100) {
      return res.status(400).json({
        error: { code: 'INVALID_USER', message: 'Informe um usuário válido no cabeçalho X-User-Id.' },
      });
    }

    req.userId = owner;
    return next();
  }

  return {
    requireUser,

    upload(req, res) {
      if (!req.file) {
        return res.status(400).json({
          error: { code: 'FILE_REQUIRED', message: 'Envie um arquivo no campo "file".' },
        });
      }

      return res.status(201).json(service.createDocument(req.file, req.userId));
    },

    list(req, res) {
      return res.json(service.listDocuments(req.userId));
    },

    download(req, res, next) {
      const document = service.getDocumentForDownload(req.params.id, req.userId);
      if (!document) {
        return res.status(404).json({
          error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' },
        });
      }

      return res.download(document.filePath, document.metadata.originalName, (error) => {
        if (error?.code === 'ENOENT' && !res.headersSent) {
          return res.status(404).json({
            error: { code: 'FILE_NOT_FOUND', message: 'O arquivo armazenado não foi encontrado.' },
          });
        }
        if (error) {
          return next(error);
        }
      });
    },
  };
}

module.exports = { createDocumentController };