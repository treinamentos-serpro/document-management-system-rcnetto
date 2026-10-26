const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../src/app');

test('a API gerencia documentos no escopo do usuário', async (t) => {
  const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-test-'));
  const app = createApp({ storageDir });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const userHeaders = { 'X-User-Id': 'usuario-1' };

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await fs.rm(storageDir, { recursive: true, force: true });
  });

  const formData = new FormData();
  formData.append('file', new Blob(['conteudo do documento']), 'relatorio.txt');
  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: userHeaders,
    body: formData,
  });

  assert.equal(uploadResponse.status, 201);
  const document = await uploadResponse.json();
  assert.equal(document.originalName, 'relatorio.txt');
  assert.equal(document.size, 21);
  assert.equal(document.owner, 'usuario-1');
  assert.ok(document.id);
  assert.ok(document.uploadedAt);

  const storedFiles = await fs.readdir(storageDir);
  assert.equal(storedFiles.length, 1);
  assert.equal(await fs.readFile(path.join(storageDir, storedFiles[0]), 'utf8'), 'conteudo do documento');

  const listResponse = await fetch(`${baseUrl}/documents`, { headers: userHeaders });
  assert.deepEqual(await listResponse.json(), [document]);

  const otherUserHeaders = { 'X-User-Id': 'usuario-2' };
  const otherUserList = await fetch(`${baseUrl}/documents`, { headers: otherUserHeaders });
  assert.deepEqual(await otherUserList.json(), []);

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: userHeaders,
  });
  assert.equal(downloadResponse.status, 200);
  assert.equal(await downloadResponse.text(), 'conteudo do documento');
  assert.match(downloadResponse.headers.get('content-disposition'), /relatorio\.txt/);

  const forbiddenDownload = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: otherUserHeaders,
  });
  assert.equal(forbiddenDownload.status, 404);
});

test('a API valida usuário, arquivo e identificador', async (t) => {
  const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-test-'));
  const app = createApp({ storageDir });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await fs.rm(storageDir, { recursive: true, force: true });
  });

  const missingUser = await fetch(`${baseUrl}/documents`);
  assert.equal(missingUser.status, 400);

  const missingFile = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'usuario-1' },
  });
  assert.equal(missingFile.status, 400);

  const missingDocument = await fetch(`${baseUrl}/documents/inexistente/download`, {
    headers: { 'X-User-Id': 'usuario-1' },
  });
  assert.equal(missingDocument.status, 404);
});
