import dotenv from 'dotenv';
import path from 'path';

// .env 파일 로드
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ecocity',
    corsWhitelist: (process.env.CORS_WHITELIST || '').split(',').filter(Boolean),
    isDevelopment: process.env.NODE_ENV === 'development'
};