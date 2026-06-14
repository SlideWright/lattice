import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge conditional class lists, resolving Tailwind conflicts last-wins. */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
