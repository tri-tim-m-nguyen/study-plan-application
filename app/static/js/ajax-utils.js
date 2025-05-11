// ajax-utils.js - Centralized AJAX handling with CSRF protection

// Get CSRF token from meta tag
const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

// Create a wrapped fetch function that automatically includes CSRF token
function safeFetch(url, options = {}) {
    // Ensure headers object exists
    if (!options.headers) {
        options.headers = {};
    }
    
    // Add CSRF token to headers
    options.headers['X-CSRFToken'] = csrfToken;
    
    // Include credentials by default
    if (options.credentials === undefined) {
        options.credentials = 'include';
    }
    
    // Return the fetch promise
    return fetch(url, options)
        .then(response => {
            // Handle CSRF errors specifically
            if (response.status === 403) {
                return response.json().then(data => {
                    if (data.error && data.error.includes('CSRF')) {
                        console.error('CSRF validation failed. The page may need to be refreshed.');
                        // Could redirect to login or show a specific message to the user
                    }
                    throw new Error(data.error || 'CSRF validation failed');
                }).catch(err => {
                    throw new Error('CSRF validation failed or permission denied');
                });
            }
            return response;
        });
}

// Export the function for use in other modules
window.safeFetch = safeFetch;