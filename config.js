const {
  SESSION_SECRET,
  BASE_URL,
  AUTH0_CLIENT_ID,
  AUTH0_ISSUER_BASE_URL
} = process.env;

if (!SESSION_SECRET || !BASE_URL || !AUTH0_CLIENT_ID || !AUTH0_ISSUER_BASE_URL) {
  console.error('Missing required environment variables.');
  process.exit(1);
}

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: SESSION_SECRET,
  baseURL: BASE_URL,
  clientID: AUTH0_CLIENT_ID,
  issuerBaseURL: AUTH0_ISSUER_BASE_URL,
};


module.exports = config;
