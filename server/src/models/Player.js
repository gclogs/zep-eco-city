const mongoose = require('mongoose');

// 이동 모드 스키마
const MoveModeSchema = new mongoose.Schema({
    speed: { type: Number, required: true },
    title: { type: String, required: true },
    carbonEmission: { type: Number, required: true }
});

// 이동 모드 설정 스키마
const MoveModeConfigSchema = new mongoose.Schema({
    WALK: { type: MoveModeSchema, required: true },
    RUN: { type: MoveModeSchema, required: true },
    current: { 
        type: String, 
        enum: ['WALK', 'RUN'], 
        required: true,
        default: 'WALK'
    }
});

// 플레이어 스키마
const PlayerSchema = new mongoose.Schema({
    userId: { 
        type: String, 
        required: true, 
        unique: true,
        index: true 
    },
    userData: {
        id: { type: String, required: true },
        name: { type: String, required: true },
        money: { type: Number, default: 0 },
        kills: { type: Number, default: 0 },
        quizCorrects: { type: Number, default: 0 },
        level: { type: Number, default: 1 },
        exp: { type: Number, default: 0 },
        lastActive: { type: Date, default: Date.now },
        moveMode: { type: MoveModeConfigSchema, required: true },
        version: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    },
    metadata: {
        schemaVersion: { type: String, required: true },
        lastUpdated: { type: Date, default: Date.now }
    }
}, {
    timestamps: true,
    versionKey: false
});

// 인덱스 설정
PlayerSchema.index({ 'userData.id': 1 });
PlayerSchema.index({ 'userData.lastActive': 1 });

module.exports = mongoose.model('Player', PlayerSchema);
