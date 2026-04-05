export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Railway Auth — Email + Password
 * No more Manus OAuth portal. Login is handled by our own /login page.
 */
export const getLoginUrl = (returnPath?: string) => {
  const path = returnPath || window.location.pathname;
  return `/login?returnPath=${encodeURIComponent(path)}`;
};
