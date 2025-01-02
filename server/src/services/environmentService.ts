import { Environment, IEnvironmentMetrics } from '../models/environment';

class EnvironmentService {
    async findEnvironment(): Promise<IEnvironmentMetrics | null> {
        const environment = await Environment.findOne({}).exec();
        return environment;
    }

    async updateEnvironment(environmentMetrics: IEnvironmentMetrics): Promise<IEnvironmentMetrics | null> {
        const environment = await Environment.findOneAndUpdate({}, environmentMetrics, { upsert: true, new: true }).exec();
        return environment;
    }

    async deleteEnvironment(): Promise<IEnvironmentMetrics | null> {
        const environment = await Environment.findOneAndDelete({}).exec();
        return environment;
    }
}

export const environmentService = new EnvironmentService();