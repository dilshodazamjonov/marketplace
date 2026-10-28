// The API is served from this same origin under /api (nginx strips the prefix, see nginx.conf).
export const API_BASE = '/api';

// How the browser proves who the user is:
// - 'cookie': POST /auth/login sets the JWT as an HttpOnly cookie that JavaScript can't read;
//   the browser sends it with every /api request. This is what the API does now.
// - 'bearer': POST /auth/login returns the JWT; it's kept in sessionStorage and sent as
//   "Authorization: Bearer ...". Only for an API that returns the token in the body.
export const AUTH_MODE = 'cookie';
