import { redirectIfSignedIn } from '../core/auth.js';
import { redirect } from '../core/routes.js';

await redirectIfSignedIn();
redirect('/login/');
