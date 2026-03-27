export const getAPIUrl = () => {
  // If NEXT_PUBLIC_API_URL is explicitly set to something OTHER than localhost, use it (e.g. Production URL)
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl;
  }
  
  // For local development on Mobile/LAN, dynamically infer the host IP address 
  // so that http://10.5.x.x:3000 connects to http://10.5.x.x:4000 instead of localhost!
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:4000/api`;
  }
  
  // Server-side default
  return "http://localhost:4000/api";
};
