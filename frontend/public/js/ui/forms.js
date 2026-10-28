import { ApiError } from '../api/client.js';
import { notice } from './components.js';

/**
 * Wires up a form:
 * - the browser's validation messages are shown inline, under each field;
 * - the submit button shows a spinner and is disabled while `onSubmit(formData)` runs;
 * - API errors land on the field they belong to (FastAPI 422), anything else in the form's alert;
 * - password fields get their show/hide button.
 * The submit button ships disabled in the HTML so nothing can submit before this has run.
 */
export function handleForm(form, onSubmit) {
  const submit = form.querySelector('[type="submit"]');

  form.noValidate = true;
  setUpPasswordToggles(form);
  form.addEventListener('input', (event) => clearFieldError(event.target));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(form);
    if (!checkFields(form)) return;

    const label = submit.textContent;
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    submit.textContent = submit.dataset.busyLabel ?? label;
    try {
      await onSubmit(new FormData(form));
    } catch (error) {
      showErrors(form, error);
    } finally {
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
      submit.textContent = label;
    }
  });

  submit.disabled = false;
}

/** Empties the form and clears its error messages, e.g. when the dialog around it closes. */
export function resetForm(form) {
  form.reset();
  clearErrors(form);
}

function setUpPasswordToggles(form) {
  for (const toggle of form.querySelectorAll('[data-password-toggle]')) {
    const input = document.getElementById(toggle.getAttribute('aria-controls'));
    toggle.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      toggle.setAttribute('aria-pressed', String(show));
      toggle.querySelector('use').setAttribute('href', `/assets/icons.svg#${show ? 'eye-off' : 'eye'}`);
    });
  }
}

function checkFields(form) {
  let first = null;
  for (const field of form.elements) {
    if (!field.willValidate || field.checkValidity()) continue;
    setFieldError(field, field.validationMessage);
    first ??= field;
  }
  first?.focus();
  return first === null;
}

function showErrors(form, error) {
  if (!(error instanceof ApiError)) console.error(error);
  const { message, fields } =
    error instanceof ApiError ? error : new ApiError('Something went wrong. Please try again.');

  let first = null;
  const unplaced = [];
  for (const [name, text] of Object.entries(fields)) {
    const item = form.elements.namedItem(name);
    const field = item instanceof RadioNodeList ? item[0] : item;
    if (field && setFieldError(field, text)) first ??= field;
    else unplaced.push(`${name}: ${text}`);
  }

  // Field errors speak for themselves; the alert is for everything else.
  const messages = first ? unplaced : [message, ...unplaced];
  if (messages.length) {
    const alert = form.querySelector('[data-form-alert]');
    alert.replaceChildren(notice('error', messages.join(' ')));
    alert.hidden = false;
  }
  first?.focus();
}

function errorSlot(field) {
  return field.closest('.field')?.querySelector('.field__error') ?? null;
}

function setFieldError(field, text) {
  const slot = errorSlot(field);
  if (!slot) return false;
  slot.textContent = text;
  slot.hidden = false;
  field.setAttribute('aria-invalid', 'true');
  return true;
}

function clearFieldError(field) {
  const slot = errorSlot(field);
  if (!slot) return;
  slot.textContent = '';
  slot.hidden = true;
  field.removeAttribute('aria-invalid');
}

function clearErrors(form) {
  const alert = form.querySelector('[data-form-alert]');
  alert.hidden = true;
  alert.replaceChildren();
  for (const field of form.elements) clearFieldError(field);
}
