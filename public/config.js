// Runtime configuration for Medica frontend
// When deployed on Vercel, set window.API_BASE_URL to your deployed Render API URL, e.g.:
// window.API_BASE_URL = 'https://medica-api.onrender.com';

(function() {
  if (typeof window !== 'undefined') {
    // Auto-detect if host is vercel.app and configure Render backend URL
    if (window.location.hostname.includes('vercel.app')) {
      // Replace with your actual Render web service URL after deploying to Render:
      window.API_BASE_URL = window.API_BASE_URL || 'https://medica-api.onrender.com';
    } else {
      window.API_BASE_URL = window.API_BASE_URL || '';
    }
  }
})();
