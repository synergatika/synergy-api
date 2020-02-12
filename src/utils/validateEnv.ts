import {
  cleanEnv, str, port, host, num, email, url
} from 'envalid';

export default function validateEnv() {
  cleanEnv(process.env, {
    API_URL: str(),
    APP_URL: str(),
    DB_HOST: host(),
    DB_NAME: str(),
    DB_PASSWORD: str(),
    DB_PORT: port(),
    DB_USER: str(),
    EMAIL_FROM: str({ default: 'Synergy | A Social and Solidarity Economy Toolkit' }),
    EMAIL_HOST: host(),
    EMAIL_PASS: str(),
    EMAIL_PORT: port({ default: 587}),
    EMAIL_USER: email(),
    ETH_API_ACCOUNT_PRIVKEY: str(),
    ETH_REMOTE_WS: num({ default: 8546 }),
    ETH_REMOTE_REST: num({ default: 8545 }),
    ETH_CONTRACTS_PATH: str(),
    ETH_REMOTE_API: host({ default: 'localhost' }),
    JWT_EXPIRATION: num(),
    JWT_SECRET: str(),
    PORT: port({ default: 3000 }),
    TOKEN_EXPIRATION: num({ default: 5 }),
    TOKEN_LENGTH: num({ default: 32 }),
    SENTRY_URI: str(),
  });
}
