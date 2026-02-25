import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merges Tailwind classes with clsx and tailwind-merge. Handles conditional classes and deduplicates conflicting utilities. @param inputs - Class names or objects to merge. @returns Merged class string. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
