import mongoose from 'mongoose';
import { config } from './dotenv';

const options = {
    autoIndex: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
};

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(config.mongoUri, options);
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        mongoose.connection.on('error', err => {
            console.error('MongoDB 연결 에러:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB 연결이 끊어졌습니다. 재연결을 시도합니다.');
            connectDB();
        });

    } catch (error) {
        console.error('MongoDB 연결 실패:', error);
        process.exit(1);
    }
};