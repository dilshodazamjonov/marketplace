import { redirectIfSignedIn, signIn } from '../core/auth.js';
import { destinationFor, redirect } from '../core/routes.js';
import { notice } from '../ui/components.js';
import { handleForm } from '../ui/forms.js';

// Messages other pages can ask for with ?reason=
const REASONS = new Map([
  ['expired', ['info', 'Your session has ended. Please sign in again.']],
  ['registered', ['success', 'Your account is ready. Sign in to continue.']],
]);

await redirectIfSignedIn();

const reason = REASONS.get(new URLSearchParams(location.search).get('reason'));
if (reason) document.getElementById('page-notice').append(notice(...reason));

handleForm(document.getElementById('login-form'), async (data) => {
  const user = await signIn({ email: data.get('email'), password: data.get('password') });
  await redirect(destinationFor(user));
});
