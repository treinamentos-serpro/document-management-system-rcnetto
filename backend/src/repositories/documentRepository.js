function createDocumentRepository() {
  const documents = new Map();

  return {
    add(document) {
      documents.set(document.id, document);
      return document;
    },

    findById(id) {
      return documents.get(id) || null;
    },

    findByOwner(owner) {
      return [...documents.values()]
        .filter((document) => document.owner === owner)
        .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt));
    },
  };
}

module.exports = { createDocumentRepository };