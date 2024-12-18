const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');

// Game data routes
router.post('/save-data', gameController.saveGameData);
router.get('/get-data/:userId', gameController.getGameData);

module.exports = router;
