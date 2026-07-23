export const getApiBaseUrl = (): string => {
  // Use relative /api endpoint in browser to leverage Next.js proxy rewrites
  if (typeof window !== 'undefined') {
    return '/api';
  }

  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  return 'http://127.0.0.1:5001/api';
};
