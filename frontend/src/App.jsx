import { useEffect, useRef, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import {
  downloadDocument,
  listDocuments,
  uploadDocument,
} from './services/documentService.js';
import './styles.css';

function getSavedUserId() {
  return window.localStorage.getItem('dms-user-id') || '';
}

export default function App() {
  const [draftUserId, setDraftUserId] = useState(getSavedUserId);
  const [userId, setUserId] = useState(getSavedUserId);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const activeUserId = useRef(userId);

  useEffect(() => {
    if (!userId) {
      setDocuments([]);
      return undefined;
    }

    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    listDocuments(userId, { signal: controller.signal })
      .then((result) => {
        if (!cancelled) setDocuments(result);
      })
      .catch((requestError) => {
        if (!cancelled && requestError.name !== 'AbortError') setError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [userId, refreshKey]);

  function handleUserSubmit(event) {
    event.preventDefault();
    const nextUserId = draftUserId.trim();
    if (!nextUserId) return;

    const previousUserId = activeUserId.current;
    activeUserId.current = nextUserId;
    window.localStorage.setItem('dms-user-id', nextUserId);
    setUserId(nextUserId);
    setDraftUserId(nextUserId);
    setNotice('');
    setError('');
    if (nextUserId !== previousUserId) {
      setDocuments([]);
      setDownloadingId('');
    } else {
      setRefreshKey((key) => key + 1);
    }
  }

  async function handleUpload(file) {
    const owner = activeUserId.current;
    setUploading(true);
    setError('');
    setNotice('');
    try {
      const document = await uploadDocument(owner, file);
      if (activeUserId.current !== owner) return false;
      setDocuments((current) => [document, ...current]);
      setNotice('Documento enviado.');
      return true;
    } catch (requestError) {
      if (activeUserId.current === owner) setError(requestError.message);
      return false;
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(document) {
    const owner = activeUserId.current;
    setDownloadingId(document.id);
    setError('');
    try {
      await downloadDocument(owner, document);
    } catch (requestError) {
      if (activeUserId.current === owner) setError(requestError.message);
    } finally {
      setDownloadingId((current) => (current === document.id ? '' : current));
    }
  }

  return (
    <main className="workspace">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Arquivo, início">
          <span className="brand-mark" aria-hidden="true">A</span>
          <span>Arquivo</span>
        </a>
        <form className="identity-form" onSubmit={handleUserSubmit}>
          <label htmlFor="user-id">Usuário</label>
          <input
            id="user-id"
            value={draftUserId}
            onChange={(event) => setDraftUserId(event.target.value)}
            maxLength={100}
            placeholder="Identificador"
            required
          />
          <button type="submit">Acessar</button>
        </form>
      </header>

      <section className="page-heading" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">ESPAÇO DE TRABALHO</p>
          <h1 id="page-title">Documentos</h1>
          <p className="page-description">Seus arquivos, organizados em um só lugar.</p>
        </div>
        <div className="document-count" aria-live="polite">
          <span>{documents.length.toString().padStart(2, '0')}</span>
          <span>{documents.length === 1 ? 'arquivo' : 'arquivos'}</span>
        </div>
      </section>

      {!userId ? (
        <p className="identity-prompt">Informe seu identificador para acessar seus documentos.</p>
      ) : (
        <>
          <UploadComponent onUpload={handleUpload} disabled={uploading} />

          <section className="library" aria-labelledby="library-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">BIBLIOTECA</p>
                <h2 id="library-title">Arquivos enviados</h2>
              </div>
              <button
                className="refresh-button"
                type="button"
                onClick={() => setRefreshKey((key) => key + 1)}
                disabled={loading}
                aria-label="Atualizar lista de documentos"
                title="Atualizar lista"
              >
                <span aria-hidden="true">↻</span>
              </button>
            </div>

            {error && <p className="message error-message" role="alert">{error}</p>}
            {notice && <p className="message success-message" role="status">{notice}</p>}
            {loading ? (
              <p className="list-state">Carregando documentos…</p>
            ) : (
              <DocumentList
                documents={documents}
                onDownload={handleDownload}
                downloadingId={downloadingId}
              />
            )}
          </section>
        </>
      )}
      <footer className="footer-note">ARQUIVOS ARMAZENADOS LOCALMENTE</footer>
    </main>
  );
}