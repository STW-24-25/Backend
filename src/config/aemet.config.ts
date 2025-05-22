// Initialize AEMET client with API key from .env
if (!process.env.AEMET_API_KEY) {
  throw new Error('No AEMET API key found');
}
