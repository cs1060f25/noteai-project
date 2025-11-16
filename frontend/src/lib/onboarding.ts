/**
 * Utility functions for managing onboarding state
 */

const GEMINI_API_KEY_STORAGE_KEY = 'gemini_api_key';

/**
 * Check if user has completed onboarding (has API key stored)
 */
export function hasCompletedOnboarding(): boolean {
  return !!localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
}

/**
 * Get the stored Gemini API key
 */
export function getGeminiApiKey(): string | null {
  return localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
}

/**
 * Save the Gemini API key
 */
export function saveGeminiApiKey(apiKey: string): void {
  localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, apiKey);
}

/**
 * Clear the Gemini API key (for testing or logout)
 */
export function clearGeminiApiKey(): void {
  localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
}
