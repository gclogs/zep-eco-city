import express, { NextFunction, Request, Response } from 'express';
import morgan from 'morgan';
import { config } from './config/dotenv';
import { corsMiddleware } from './config/cors';
import userRoutes from './routes/userRoutes';
import environmentRoutes from './routes/environmentRoutes';
import { connectDB } from './config/database';

const app = express();

// 미들웨어 설정
app.use(corsMiddleware);  // CORS 미들웨어 적용
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 라우터 등록
app.use('/api/users', userRoutes);
app.use('/api/environment', environmentRoutes);

// 기본 라우트
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the API' });
});

// 404 에러 핸들러
app.use((req, res) => {
    res.status(404).json({ error: '요청하신 리소스를 찾을 수 없습니다.' });
});

// 글로벌 에러 핸들러
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

const PORT = config.port;

connectDB();

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} in ${config.nodeEnv} mode`);
});

export default app;