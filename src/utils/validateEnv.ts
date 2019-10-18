import {
  cleanEnv, str, port
} from 'envalid';
 
export default function validateEnv() {
  cleanEnv(process.env, {
    DB_PASSWORD: str(),
    DB_NAME: str(),
    DB_USER: str(),
    DB_PORT: port(),
  });
}