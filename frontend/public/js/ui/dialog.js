import { resetForm } from './forms.js';

/**
 * Wires the page's <dialog> elements. Buttons with data-dialog-open="<id>" open one; buttons with
 * data-dialog-close and clicks on the backdrop close it; closing resets the form inside.
 * The native <dialog> already traps focus, closes on Escape and gives focus back to the opener.
 */
export function setUpDialogs() {
  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-dialog-open]');
    if (opener) document.getElementById(opener.dataset.dialogOpen)?.showModal();
    else event.target.closest('[data-dialog-close]')?.closest('dialog')?.close();
  });

  for (const dialog of document.querySelectorAll('dialog')) {
    // The content fills the dialog box, so a click on the <dialog> itself is a click on the backdrop.
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => {
      const form = dialog.querySelector('form');
      if (form) resetForm(form);
    });
  }
}
