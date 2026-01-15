import { useEffect } from 'react';

/**
 * Hook to scroll input into view when focused on mobile devices
 * This helps with keyboard covering input fields
 */
export const useMobileKeyboardScroll = () => {
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if it's an input, textarea, or select
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        // Wait for keyboard to appear
        setTimeout(() => {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }, 300);
      }
    };

    // Only add listener on mobile devices
    if (window.innerWidth <= 768) {
      document.addEventListener('focusin', handleFocus, { passive: true });
    }

    return () => {
      document.removeEventListener('focusin', handleFocus);
    };
  }, []);
};

export default useMobileKeyboardScroll;
