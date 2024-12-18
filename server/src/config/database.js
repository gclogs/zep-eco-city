const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Atlas 연결 설정
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Atlas Connected...'))
    .catch(err => console.log('MongoDB connection error:', err));

// 스키마 정의
const gameDataSchema = new mongoose.Schema({
    userId: String,
    data: mongoose.Schema.Types.Mixed,  // JSON 데이터를 위한 유연한 타입
    createdAt: { type: Date, default: Date.now }
});

// 모델 생성
const GameData = mongoose.model('GameData', gameDataSchema);

module.exports = {
    GameData,
    mongoose
};
