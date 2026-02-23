import { isbot } from 'isbot'

/** @param userAgent - Raw User-Agent header string. @returns Whether the user agent indicates a known bot/crawler. */
export const detectBot = (userAgent: string): boolean => isbot(userAgent)
