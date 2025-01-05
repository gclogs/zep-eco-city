import mongoose, { Document, Schema } from 'mongoose';

export interface IEnvironmentMetrics extends Document {
    /** 공기 오염도 (0-100 사이의 값) */
    airPollution: number;
    /** 탄소 배출량 (단위: 톤) */
    carbonEmission: number;
    /** 재활용률 (0-100 사이의 백분율) */
    recyclingRate: number;
    /** 마지막으로 체크한 탄소 배출량 임계값 (공기 오염도 증가 트리거) */
    lastCarbonThreshold: number;
    updatedAt: Date;
}

const EnvironmentSchema = new Schema<IEnvironmentMetrics>({
    airPollution: { type: Number, required: true, default: 0 },
    carbonEmission: { type: Number, required: true, default: 0 },
    recyclingRate: { type: Number, required: true, default: 0 },
    lastCarbonThreshold: { type: Number, required: true, default: 0 }
}, {
    timestamps: true
});

export const Environment = mongoose.model<IEnvironmentMetrics>('Environment', EnvironmentSchema);