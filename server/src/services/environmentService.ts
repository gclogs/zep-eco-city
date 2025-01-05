import { Environment, IEnvironmentMetrics } from '../models/environment';

class EnvironmentService {
    async findEnvironment(): Promise<IEnvironmentMetrics | null> {
        const environment = await Environment.findOne().exec();
        return environment;
    }
    
    async updateEnvironment(environmentMetrics: Partial<IEnvironmentMetrics>): Promise<IEnvironmentMetrics | null> {
        const environment = await Environment.findOneAndUpdate(
            {}, // 첫 번째 인자: 찾을 조건
            environmentMetrics, // 두 번째 인자: 업데이트할 데이터
            { 
                upsert: true, // 문서가 없으면 생성
                new: true,    // 업데이트된 문서를 반환
                timestamps: true // 타임스탬프 자동 업데이트
            }
        ).exec();
        return environment;
    }

    async deleteEnvironment(): Promise<IEnvironmentMetrics | null> {
        const environment = await Environment.findOneAndDelete().exec();
        return environment;
    }
}

export const environmentService = new EnvironmentService();