async function readError(response) {
  const body = await response.json().catch(() => ({}));
  return body.error?.message || 'Não foi possível concluir a operação.';
}

async function request(url, userId, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'X-User-Id': userId,
    },
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return response;
}

export async function listDocuments(userId) {
  const response = await request('/api/documents', userId);
  return response.json();
}

export async function uploadDocument(userId, file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await request('/api/upload', userId, {
    method: 'POST',
    body: formData,
  });
  return response.json();
}

export async function downloadDocument(userId, document) {
  const response = await request(
    `/api/documents/${encodeURIComponent(document.id)}/download`,
    userId,
  );
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = window.document.createElement('a');
  link.href = objectUrl;
  link.download = document.originalName;
  window.document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}