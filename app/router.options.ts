/**
 * Vue Router options configuration
 * Handles scroll behavior for hash fragments
 * Since we use tab-based navigation (not hash routing), we handle missing elements gracefully
 */

import type { RouterConfig } from '@nuxt/schema';

export default <RouterConfig>{
  scrollBehavior(to, from, savedPosition) {
    // If there's a saved position (e.g., from browser back button), use it
    if (savedPosition) {
      return savedPosition;
    }

    // Since we use tab-based navigation (not hash routing), we ignore hash fragments
    // This prevents Vue Router from trying to scroll to elements that don't exist
    // and causing warnings like "Couldn't find element using selector '#remote'"
    if (to.hash) {
      // Check if element exists synchronously first
      const element = document.querySelector(to.hash);
      if (element) {
        // Element exists - scroll to it
        return {
          el: to.hash,
          behavior: 'smooth',
        };
      }
      // Element doesn't exist - don't try to scroll, just return top
      // This prevents the Vue Router warning
      return { top: 0 };
    }

    // Default: scroll to top
    return { top: 0 };
  },
};
