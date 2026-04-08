/**
 * Shared API functions for Server Components
 * 
 * These functions can be used directly in Server Components without HTTP fetch,
 * avoiding ECONNREFUSED errors in Docker environments.
 */

export * from './fixtures'
export * from './live-matches'
