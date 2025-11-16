/**
 * Modern Button System 2025
 * Implements latest web standards, performance optimizations, and accessibility features
 */

// Feature detection with progressive enhancement
const SUPPORTS = {
    intersectionObserver: 'IntersectionObserver' in window,
    requestIdleCallback: 'requestIdleCallback' in window,
    webAnimations: 'animate' in document.createElement('div'),
    pointerEvents: 'PointerEvent' in window,
    abortController: 'AbortController' in window,
    customElements: 'customElements' in window,
    cssContainerQueries: CSS.supports('container-type', 'inline-size'),
    focusVisible: CSS.supports('selector(:focus-visible)')
};

// Modern debounce with requestAnimationFrame
function debounceRAF(func, wait = 0) {
    let rafId = null;
    let lastArgs = null;

    return function debounced(...args) {
        lastArgs = args;

        if (rafId !== null) {
            cancelAnimationFrame(rafId);
        }

        rafId = requestAnimationFrame(() => {
            if (Date.now() - (debounced.lastCall || 0) >= wait) {
                func.apply(this, lastArgs);
                debounced.lastCall = Date.now();
            }
            rafId = null;
        });
    };
}

// Throttle with requestAnimationFrame for smooth animations
function throttleRAF(func) {
    let rafId = null;
    let lastArgs = null;

    return function throttled(...args) {
        lastArgs = args;

        if (rafId === null) {
            rafId = requestAnimationFrame(() => {
                func.apply(this, lastArgs);
                rafId = null;
            });
        }
    };
}

// Modern button state management using WeakMap
const buttonStates = new WeakMap();
const buttonAbortControllers = new WeakMap();

// Button configuration with defaults
const BUTTON_CONFIG = {
    debounceDelay: 300,
    throttleDelay: 100,
    animationDuration: 200,
    rippleDuration: 600,
    minTouchTarget: 44, // WCAG 2.1 minimum
    focusVisible: true,
    hapticFeedback: false
};

/**
 * Modern Button Handler Class
 * Uses event delegation, AbortController, and modern APIs
 */
class ModernButtonSystem {
    constructor() {
        this.delegatedHandlers = new Map();
        this.intersectionObserver = null;
        this.idleCallback = null;
        this.abortController = new AbortController();
        this.visibleButtons = new WeakSet();

        this.init();
    }

    init() {
        // Use MutationObserver for dynamic content
        if ('MutationObserver' in window) {
            this.setupMutationObserver();
        }

        // Setup intersection observer for visibility-based optimizations
        if (SUPPORTS.intersectionObserver) {
            this.setupIntersectionObserver();
        }

        // Setup event delegation
        this.setupEventDelegation();

        // Setup keyboard navigation
        this.setupKeyboardNavigation();

        // Setup pointer events for better touch/mouse/pen support
        if (SUPPORTS.pointerEvents) {
            this.setupPointerEvents();
        }

        // Setup idle callback for non-critical operations
        if (SUPPORTS.requestIdleCallback) {
            this.setupIdleCallback();
        }
    }

    /**
     * Event Delegation - Single listener for all buttons
     * More efficient than individual listeners
     */
    setupEventDelegation() {
        const signal = this.abortController.signal;

        // Single click handler for all buttons
        document.addEventListener('click', (e) => {
            const button = e.target.closest('.btn, button[type="button"], button:not([type])');
            if (!button) return;

            this.handleButtonClick(button, e);
        }, { signal, passive: false });

        // Touch/pointer events for better mobile support
        if (SUPPORTS.pointerEvents) {
            document.addEventListener('pointerdown', (e) => {
                const button = e.target.closest('.btn, button[type="button"], button:not([type])');
                if (!button) return;

                this.handleButtonPress(button, e);
            }, { signal, passive: false });

            document.addEventListener('pointerup', (e) => {
                const button = e.target.closest('.btn, button[type="button"], button:not([type])');
                if (!button) return;

                this.handleButtonRelease(button, e);
            }, { signal, passive: false });
        }
    }

    /**
     * Modern button click handler with state management
     */
    handleButtonClick(button, event) {
        // Prevent double-clicks and rapid firing
        const state = this.getButtonState(button);
        const now = performance.now();

        if (state.lastClick && (now - state.lastClick) < BUTTON_CONFIG.debounceDelay) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        state.lastClick = now;

        // Get button action from data attributes
        const action = button.dataset.action || button.dataset.tab || button.id;
        const handler = button.dataset.handler;

        // Create custom event for better communication
        const customEvent = new CustomEvent('button:click', {
            detail: {
                button,
                action,
                originalEvent: event,
                timestamp: now
            },
            bubbles: true,
            cancelable: true
        });

        // Dispatch custom event
        button.dispatchEvent(customEvent);

        // If event was prevented, stop here
        if (customEvent.defaultPrevented) {
            return;
        }

        // Execute handler if registered
        if (handler && this.delegatedHandlers.has(handler)) {
            const handlerFn = this.delegatedHandlers.get(handler);
            handlerFn.call(button, customEvent);
        }

        // Add ripple effect
        this.addRippleEffect(button, event);

        // Haptic feedback (if supported)
        if (BUTTON_CONFIG.hapticFeedback && 'vibrate' in navigator) {
            navigator.vibrate(10);
        }
    }

    /**
     * Pointer events for better touch support
     */
    handleButtonPress(button, event) {
        const state = this.getButtonState(button);
        state.isPressed = true;

        // Add pressed state class
        requestAnimationFrame(() => {
            button.classList.add('btn-pressed');
        });
    }

    handleButtonRelease(button, event) {
        const state = this.getButtonState(button);
        state.isPressed = false;

        // Remove pressed state class
        requestAnimationFrame(() => {
            button.classList.remove('btn-pressed');
        });
    }

    /**
     * Modern ripple effect using Web Animations API
     */
    addRippleEffect(button, event) {
        if (!SUPPORTS.webAnimations) return;

        const rect = button.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const size = Math.max(rect.width, rect.height);

        const ripple = document.createElement('span');
        ripple.className = 'btn-ripple';
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.6);
            width: ${size}px;
            height: ${size}px;
            left: ${x - size / 2}px;
            top: ${y - size / 2}px;
            pointer-events: none;
            transform: scale(0);
        `;

        // Ensure button has relative positioning
        const computedStyle = window.getComputedStyle(button);
        if (computedStyle.position === 'static') {
            button.style.position = 'relative';
        }
        button.style.overflow = 'hidden';

        button.appendChild(ripple);

        // Animate using Web Animations API
        const animation = ripple.animate([
            { transform: 'scale(0)', opacity: 0.6 },
            { transform: 'scale(2)', opacity: 0 }
        ], {
            duration: BUTTON_CONFIG.rippleDuration,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
        });

        animation.onfinish = () => {
            ripple.remove();
        };
    }

    /**
     * Keyboard navigation with modern patterns
     */
    setupKeyboardNavigation() {
        const signal = this.abortController.signal;

        document.addEventListener('keydown', (e) => {
            const button = e.target.closest('.btn, button[type="button"], button:not([type])');
            if (!button) return;

            // Modern keyboard handling
            switch (e.key) {
                case 'Enter':
                case ' ':
                    if (button.disabled) {
                        e.preventDefault();
                        return;
                    }
                    // Let default behavior handle it, but add visual feedback
                    this.handleButtonPress(button, e);
                    setTimeout(() => this.handleButtonRelease(button, e), 100);
                    break;

                case 'Escape':
                    // Cancel any ongoing operations
                    this.cancelButtonOperation(button);
                    break;
            }
        }, { signal });
    }

    /**
     * Pointer events setup for better cross-device support
     */
    setupPointerEvents() {
        const signal = this.abortController.signal;

        // Track pointer type for adaptive UI
        document.addEventListener('pointerdown', (e) => {
            const button = e.target.closest('.btn, button[type="button"], button:not([type])');
            if (button) {
                button.dataset.pointerType = e.pointerType; // mouse, pen, touch
            }
        }, { signal, passive: true });
    }

    /**
     * Intersection Observer for visibility-based optimizations
     */
    setupIntersectionObserver() {
        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.visibleButtons.add(entry.target);
                    entry.target.classList.add('btn-visible');
                } else {
                    this.visibleButtons.delete(entry.target);
                    entry.target.classList.remove('btn-visible');
                }
            });
        }, {
            rootMargin: '50px',
            threshold: 0.1
        });

        // Observe all buttons
        if (SUPPORTS.requestIdleCallback) {
            requestIdleCallback(() => {
                document.querySelectorAll('.btn, button').forEach(btn => {
                    this.intersectionObserver.observe(btn);
                });
            });
        } else {
            // Fallback
            setTimeout(() => {
                document.querySelectorAll('.btn, button').forEach(btn => {
                    this.intersectionObserver.observe(btn);
                });
            }, 100);
        }
    }

    /**
     * MutationObserver for dynamically added buttons
     */
    setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        const buttons = node.matches?.('.btn, button')
                            ? [node]
                            : node.querySelectorAll?.('.btn, button');

                        if (buttons) {
                            Array.from(buttons).forEach(btn => {
                                this.enhanceButton(btn);
                                if (this.intersectionObserver) {
                                    this.intersectionObserver.observe(btn);
                                }
                            });
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Enhance button with modern features
     */
    enhanceButton(button) {
        // Ensure proper ARIA attributes
        if (!button.hasAttribute('role') && button.tagName !== 'BUTTON') {
            button.setAttribute('role', 'button');
        }

        // Add tabindex if not present
        if (!button.hasAttribute('tabindex') && !button.disabled) {
            button.setAttribute('tabindex', '0');
        }

        // Ensure minimum touch target size
        const rect = button.getBoundingClientRect();
        if (rect.width < BUTTON_CONFIG.minTouchTarget ||
            rect.height < BUTTON_CONFIG.minTouchTarget) {
            button.classList.add('btn-small-target');
        }

        // Add focus-visible support
        if (SUPPORTS.focusVisible) {
            button.classList.add('supports-focus-visible');
        }
    }

    /**
     * Setup idle callback for non-critical operations
     */
    setupIdleCallback() {
        this.idleCallback = requestIdleCallback(() => {
            // Enhance all buttons
            document.querySelectorAll('.btn, button').forEach(btn => {
                this.enhanceButton(btn);
            });
        }, { timeout: 2000 });
    }

    /**
     * Register button handler
     */
    registerHandler(name, handler) {
        this.delegatedHandlers.set(name, handler);
    }

    /**
     * Get or create button state
     */
    getButtonState(button) {
        if (!buttonStates.has(button)) {
            buttonStates.set(button, {
                lastClick: 0,
                isPressed: false,
                isLoading: false,
                abortController: null
            });
        }
        return buttonStates.get(button);
    }

    /**
     * Cancel button operation
     */
    cancelButtonOperation(button) {
        const state = this.getButtonState(button);
        if (state.abortController) {
            state.abortController.abort();
            state.abortController = null;
            state.isLoading = false;
            button.classList.remove('btn-loading');
        }
    }

    /**
     * Set button loading state
     */
    setLoading(button, isLoading) {
        const state = this.getButtonState(button);
        state.isLoading = isLoading;

        if (isLoading) {
            button.classList.add('btn-loading');
            button.disabled = true;

            // Create abort controller for cancellation
            if (SUPPORTS.abortController) {
                state.abortController = new AbortController();
            }
        } else {
            button.classList.remove('btn-loading');
            button.disabled = false;
            state.abortController = null;
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        this.abortController.abort();
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        if (this.idleCallback && 'cancelIdleCallback' in window) {
            cancelIdleCallback(this.idleCallback);
        }
    }
}

// Initialize button system
const buttonSystem = new ModernButtonSystem();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { buttonSystem, debounceRAF, throttleRAF };
}

// Make available globally
window.buttonSystem = buttonSystem;
window.debounceRAF = debounceRAF;
window.throttleRAF = throttleRAF;
