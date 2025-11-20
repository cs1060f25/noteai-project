/**
 * Test for NOTEAI-150: Filter and Sort dropdown width bug
 *
 * This test ensures that the filter and sort dropdowns have sufficient width
 * to display their full text content without truncation.
 *
 * Bug: The dropdowns were too narrow (140px), causing text like "All Status"
 * and "Newest First" to be cut off, making it difficult for users to read
 * the selected filter/sort option.
 *
 * Fix: Increased width from 140px to 170px to accommodate the longest text.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LibraryPage } from '../index';

describe('NOTEAI-150: Filter and Sort Dropdown Width', () => {
  it('should have sufficient width for filter dropdown to prevent text truncation', () => {
    render(<LibraryPage />);

    // Find the filter dropdown trigger
    const filterTrigger = screen.getByRole('combobox', { name: /filter/i });

    // Check that it has the correct width class
    // The minimum width should be 170px to accommodate "All Status", "Processing", etc.
    expect(filterTrigger.className).toContain('w-[170px]');
  });

  it('should have sufficient width for sort dropdown to prevent text truncation', () => {
    render(<LibraryPage />);

    // Find the sort dropdown trigger
    const sortTrigger = screen.getByRole('combobox', { name: /sort/i });

    // Check that it has the correct width class
    // The minimum width should be 170px to accommodate "Newest First", "Oldest First", etc.
    expect(sortTrigger.className).toContain('w-[170px]');
  });

  it('should NOT use the old insufficient width of 140px', () => {
    render(<LibraryPage />);

    const filterTrigger = screen.getByRole('combobox', { name: /filter/i });
    const sortTrigger = screen.getByRole('combobox', { name: /sort/i });

    // Ensure neither dropdown uses the old, insufficient width
    expect(filterTrigger.className).not.toContain('w-[140px]');
    expect(sortTrigger.className).not.toContain('w-[140px]');
  });

  /**
   * NOTE: This is a basic CSS class test. A more comprehensive test would:
   * 1. Use visual regression testing (e.g., Percy, Chromatic) to detect text overflow
   * 2. Measure actual rendered width vs. content width using getComputedStyle
   * 3. Test across different viewport sizes
   * 4. Test with actual text content to ensure no overflow
   *
   * A sub-issue (NOTEAI-150-test-improvement) has been filed to implement
   * more robust visual regression testing for this bug.
   */
});
