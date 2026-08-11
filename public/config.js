// Runtime configuration for Medica frontend
(function() {
  if (typeof window !== 'undefined') {
    if (window.location.hostname.includes('vercel.app')) {
      window.API_BASE_URL = window.API_BASE_URL || 'https://medica-xhri.onrender.com';
    } else {
      window.API_BASE_URL = window.API_BASE_URL || '';
    }
  }
})();
