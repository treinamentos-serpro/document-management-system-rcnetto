const path = require('node:path');
const { randomUUID } = require('node:crypto');

function createDocumentService({ repository, storageDir }) {
  function toPublicDocument(document) {
    const { storageName, ...metadata } = document;
    return metadata;
  }

  return {
    createDocument(file, owner) {
      const document = repository.add({
        id: randomUUID(),
        originalName: file.originalname,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        owner,
        storageName: file.filename,
      });
      return toPublicDocument(document);
    },

    listDocuments(owner) {
      return repository.findByOwner(owner).map(toPublicDocument);
    },

    getDocumentForDownload(id, owner) {
      const document = repository.findById(id);
      if (!document || document.owner !== owner) {
        return null;
      }

      return {
        metadata: toPublicDocument(document),
        filePath: path.join(storageDir, document.storageName),
      };
    },
  };
}

module.exports = { createDocumentService };