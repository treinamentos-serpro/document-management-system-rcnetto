import { useState } from 'react';

export default function UploadComponent({ onUpload, disabled }) {
  const [file, setFile] = useState(null);

  function handleSubmit(event) {
    event.preventDefault();
    if (file && !disabled) {
      onUpload(file);
      setFile(null);
      event.currentTarget.reset();
    }
  }

  return (
    <section className="upload-section" aria-labelledby="upload-title">
      <div className="upload-copy">
        <span className="upload-icon" aria-hidden="true">↑</span>
        <div>
          <h2 id="upload-title">Adicionar documento</h2>
          <p>Selecione um arquivo para armazená-lo neste espaço.</p>
        </div>
      </div>
      <form className="upload-form" onSubmit={handleSubmit}>
        <label className="file-picker" htmlFor="document-file">
          <span>{file?.name || 'Escolher arquivo'}</span>
          <input
            id="document-file"
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            disabled={disabled}
          />
        </label>
        <button className="primary-button" type="submit" disabled={!file || disabled}>
          {disabled ? 'Enviando…' : 'Enviar arquivo'}
        </button>
      </form>
    </section>
  );
}