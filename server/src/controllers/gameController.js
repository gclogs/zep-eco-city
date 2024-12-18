const { GameData } = require('../config/database');

exports.saveGameData = async (req, res) => {
    try {
        const { userId, gameData } = req.body;
        const newGameData = new GameData({
            userId,
            data: gameData
        });
        
        await newGameData.save();
        res.status(200).json({ message: 'Data saved successfully' });
    } catch (error) {
        console.error('Error saving game data:', error);
        res.status(500).json({ error: 'Failed to save game data' });
    }
};

exports.getGameData = async (req, res) => {
    try {
        const { userId } = req.params;
        const gameData = await GameData.findOne({ userId }).sort({ createdAt: -1 });
        
        if (!gameData) {
            return res.status(404).json({ message: 'No data found for this user' });
        }
        
        res.status(200).json({ data: gameData.data });
    } catch (error) {
        console.error('Error retrieving game data:', error);
        res.status(500).json({ error: 'Failed to retrieve game data' });
    }
};
