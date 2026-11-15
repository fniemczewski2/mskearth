import { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

function ConfirmDialog({ message, confirmLabel, cancelLabel, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="overlay-dialog confirm-dialog"
      aria-labelledby="confirm-dialog-message"
      onClose={() => onClose(false)}
    >
      <div className="overlay-content">
        <p id="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog__actions">
          <button type="button" className="cms-btn" onClick={() => onClose(false)}>
            {cancelLabel}
          </button>
          <button type="button" className="cms-btn cms-btnDanger" onClick={() => onClose(true)}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

ConfirmDialog.propTypes = {
  message: PropTypes.string.isRequired,
  confirmLabel: PropTypes.string.isRequired,
  cancelLabel: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

/**
 * Zamiennik window.confirm z wlasnym oknem dialogowym.
 * const { confirm, dialog } = useConfirm(); if (await confirm('Usunąć?')) ...; {dialog} w JSX.
 */
export function useConfirm({ confirmLabel = 'Usuń', cancelLabel = 'Anuluj' } = {}) {
  const [request, setRequest] = useState(null);

  const confirm = useCallback((message) => new Promise((resolve) => setRequest({ message, resolve })), []);

  const handleClose = (result) => {
    request?.resolve(result);
    setRequest(null);
  };

  const dialog = request ? (
    <ConfirmDialog
      message={request.message}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      onClose={handleClose}
    />
  ) : null;

  return { confirm, dialog };
}
