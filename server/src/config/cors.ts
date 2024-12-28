import cors from 'cors';
import { config } from './dotenv';

/**
 * CORS 옵션 설정
 * 개발 환경: 모든 도메인 허용
 * 운영 환경: 화이트리스트에 등록된 도메인만 허용
 */
const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        // 개발 환경이거나 origin이 없는 경우 (같은 도메인)
        if (config.isDevelopment || !origin) {
            callback(null, true);
            return;
        }

        // 화이트리스트 체크
        if (config.corsWhitelist.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,  // 쿠키 허용
    maxAge: 86400,     // 프리플라이트 요청 캐시 시간 (24시간)
    optionsSuccessStatus: 200
};

export const corsMiddleware = cors(corsOptions);
