let activeConfirmation = null;

function qs(id) {
  return globalThis.document?.getElementById(id) || null;
}

function focusableElements(root) {
  if (!root) return [];
  return [...root.querySelectorAll(
    'button:not([disabled]):not([hidden]),[href],input:not([type="hidden"]):not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
  )].filter(element => !element.closest('[hidden]'));
}

function closeConfirmation(accepted) {
  if (!activeConfirmation) return;
  const current = activeConfirmation;
  activeConfirmation = null;
  const dialog = qs('confirm-dialog');
  if (dialog) dialog.hidden = true;
  globalThis.document?.removeEventListener('keydown', current.handleKeydown, true);
  current.resolve(Boolean(accepted));
  current.trigger?.focus?.();
}

function handleDialogKeydown(event) {
  if (!activeConfirmation) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeConfirmation(false);
    return;
  }
  if (event.key !== 'Tab') return;
  const dialog = qs('confirm-dialog');
  const focusables = focusableElements(dialog);
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey && globalThis.document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && globalThis.document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function confirmAction({
  title = 'Confirmar acción',
  message = '',
  confirmLabel = 'Aceptar',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  trigger = globalThis.document?.activeElement || null
} = {}) {
  if (activeConfirmation) closeConfirmation(false);
  const dialog = qs('confirm-dialog');
  const titleElement = qs('confirm-dialog-title');
  const messageElement = qs('confirm-dialog-message');
  const accept = qs('confirm-dialog-accept');
  const cancel = qs('confirm-dialog-cancel');
  if (!dialog || !titleElement || !messageElement || !accept || !cancel) return Promise.resolve(false);

  titleElement.textContent = title;
  messageElement.textContent = message;
  accept.textContent = confirmLabel;
  cancel.textContent = cancelLabel;
  accept.classList.toggle('danger', tone === 'danger');
  accept.classList.toggle('primary', tone !== 'danger');
  dialog.hidden = false;

  return new Promise(resolve => {
    activeConfirmation = {
      resolve,
      trigger: trigger && typeof trigger.focus === 'function' ? trigger : null,
      handleKeydown: handleDialogKeydown
    };
    accept.onclick = () => closeConfirmation(true);
    cancel.onclick = () => closeConfirmation(false);
    globalThis.document?.addEventListener('keydown', handleDialogKeydown, true);
    cancel.focus();
  });
}

export function isConfirmationOpen() {
  return Boolean(activeConfirmation);
}
