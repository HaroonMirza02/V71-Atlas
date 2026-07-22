import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function stripHtml(html?: string) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
}

const NOISE_WORDS = new Set([
  'go', 'to', 'in', 'on', 'it', 'is', 'at', 'be', 'an', 'or', 'if', 'me', 'my', 'up', 'no', 'so', 'do', 'us', 'we', 'by', 'of', 'for', 'as', 'with', 'this', 'that', 'from', 'they', 'here', 'have', 'been', 'will', 'your', 'about'
]);

export function sanitizeTechTag(tech: string): string | null {
  if (!tech || typeof tech !== 'string') return null;
  const clean = tech.trim();
  const lower = clean.toLowerCase();
  
  if (NOISE_WORDS.has(lower)) {
    return null;
  }
  if (lower === 'golang') return 'Golang';
  if (lower === 'react' || lower === 'reactjs') return 'React';
  if (lower === 'node' || lower === 'nodejs' || lower === 'node.js') return 'Node.js';
  if (lower === 'python') return 'Python';
  if (lower === 'typescript') return 'TypeScript';
  if (lower === 'javascript') return 'JavaScript';

  return clean;
}
