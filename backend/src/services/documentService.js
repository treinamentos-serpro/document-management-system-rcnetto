const path = require('node:path');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');

function createDocumentService({ repository, storageDir, maxStorageBytes, initialStorageBytes }) {
  let storedBytes = initialStorageBytes;

  function toPublicDocument(document) {
    const { storageName, ...metadata } = document;
    return metadata;
  }

  return {
    async createDocument(file, owner) {
      if (storedBytes + file.size > maxStorageBytes) {
        await fs.unlink(file.path);
        return null;
      }

      const document = repository.add({
        id: randomUUID(),
        originalName: file.originalname,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        owner,
        storageName: file.filename,
      });
      storedBytes += file.size;
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