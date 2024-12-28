import mongoose, { Document, Schema } from 'mongoose';

/**
 * 이동 모드 인터페이스
 */
interface MoveMode {
    speed: number;
    title: string;
    carbonEmission: number;
}

/**
 * 사용자 문서 인터페이스
 */
export interface IUser extends Document {
    userId: string;
    name: string;
    money: number;
    kills: number;
    moveMode: {
        WALK: MoveMode;
        RUN: MoveMode;
        current: 'WALK' | 'RUN';
    };
    level?: number;
    exp?: number;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * 이동 모드 상수
 */
export const MOVE_MODES = {
    WALK: {
        speed: 80,
        title: "🚶🏻 걷기",
        carbonEmission: 0.0001
    },
    RUN: {
        speed: 150,
        title: "🏃🏻 달리기",
        carbonEmission: 0.0007
    }
} as const;

/**
 * 사용자 스키마 정의
 */
const UserSchema = new Schema<IUser>({
    userId: { 
        type: String, 
        required: true, 
        unique: true 
    },
    name: { 
        type: String, 
        required: true 
    },
    money: { 
        type: Number, 
        default: 0 
    },
    kills: { 
        type: Number, 
        default: 0 
    },
    moveMode: {
        WALK: {
            speed: { type: Number, default: MOVE_MODES.WALK.speed },
            title: { type: String, default: MOVE_MODES.WALK.title },
            carbonEmission: { type: Number, default: MOVE_MODES.WALK.carbonEmission }
        },
        RUN: {
            speed: { type: Number, default: MOVE_MODES.RUN.speed },
            title: { type: String, default: MOVE_MODES.RUN.title },
            carbonEmission: { type: Number, default: MOVE_MODES.RUN.carbonEmission }
        },
        current: { 
            type: String, 
            enum: ['WALK', 'RUN'], 
            default: 'WALK' 
        }
    },
    level: { 
        type: Number, 
        default: 1 
    },
    exp: { 
        type: Number, 
        default: 0 
    }
}, {
    timestamps: true
});

/**
 * 사용자 모델 생성 및 내보내기
 */
export const User = mongoose.model<IUser>('User', UserSchema);