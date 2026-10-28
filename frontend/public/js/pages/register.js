import { register } from '../api/auth.js';
import { redirectIfSignedIn, signIn } from '../core/auth.js';
import { ROLES, redirect } from '../core/routes.js';
import { todayISO } from '../ui/format.js';
import { handleForm } from '../ui/forms.js';

await redirectIfSignedIn();

const form = document.getElementById('register-form');
form.elements.date_of_birth.max = todayISO();

handleForm(form, async (data) => {
  const email = data.get('email');
  const password = data.get('password');
  await register({
    username: data.get('username').trim(),
    email,
    date_of_birth: data.get('date_of_birth'),
    user_type: data.get('user_type'),
    password,
  });

  // Registration doesn't return a token, so sign in with the same details.
  const user = await signIn({ email, password }).catch(() => null);
  await redirect(user ? ROLES[user.user_type].home : '/login/?reason=registered');
});
