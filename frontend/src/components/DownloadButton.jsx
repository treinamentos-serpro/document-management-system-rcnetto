export default function DownloadButton({ onClick, disabled }) {
  return (
    <button
      className="download-button"
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Baixar documento"
      title="Baixar documento"
    >
      <span aria-hidden="true">↓</span>
    </button>
  );
}