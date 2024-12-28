import { Router, Request, Response } from 'express';
import { userService } from '../services/userService';

const router = Router();

/**
 * 사용자 생성 또는 조회
 * POST /api/users
 */
router.post('/', async (req: Request, res: Response): Promise<any> => {
    try {
        const { userId, name } = req.body;
        if (!userId || !name) {
            return res.status(400).json({ error: '사용자 ID와 이름이 필요합니다.' });
        }
        
        const user = await userService.findOrCreateUser(userId, name);
        res.status(201).json(user);
    } catch (error) {
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

/**
 * 사용자 정보 업데이트
 * PUT /api/users/:userId
 */
router.put('/:userId', async (req: Request, res: Response): Promise<any> => {
    try {
        const { userId } = req.params;
        const updateData = req.body;
        
        const updatedUser = await userService.updateUser(userId, updateData);
        if (!updatedUser) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }
        
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

/**
 * 돈 추가
 * POST /api/users/:userId/money/add
 */
router.post('/:userId/money/add', async (req: Request, res: Response): Promise<any> => {
    try {
        const { userId } = req.params;
        const { amount } = req.body;
        
        if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ error: '유효한 금액을 입력해주세요.' });
        }
        
        const user = await userService.addMoney(userId, amount);
        if (!user) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

/**
 * 돈 차감
 * POST /api/users/:userId/money/subtract
 */
router.post('/:userId/money/subtract', async (req: Request, res: Response): Promise<any> => {
    try {
        const { userId } = req.params;
        const { amount } = req.body;
        
        if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ error: '유효한 금액을 입력해주세요.' });
        }
        
        const user = await userService.subtractMoney(userId, amount);
        res.json(user);
    } catch (error: any) {
        if (error.message === '잔액이 부족합니다.') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

/**
 * 이동 모드 전환
 * POST /api/users/:userId/toggle-movement
 */
router.post('/:userId/toggle-movement', async (req: Request, res: Response): Promise<any> => {
    try {
        const { userId } = req.params;
        const user = await userService.toggleMovementMode(userId);
        
        if (!user) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

/**
 * 몬스터 처치 수 증가
 * POST /api/users/:userId/kills/increment
 */
router.post('/:userId/kills/increment', async (req: Request, res: Response): Promise<any> => {
    try {
        const { userId } = req.params;
        const user = await userService.incrementKills(userId);
        
        if (!user) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

/**
 * 경험치 추가
 * POST /api/users/:userId/experience
 */
router.post('/:userId/experience', async (req: Request, res: Response): Promise<any> => {
    try {
        const { userId } = req.params;
        const { exp } = req.body;
        
        if (typeof exp !== 'number' || exp <= 0) {
            return res.status(400).json({ error: '유효한 경험치 값을 입력해주세요.' });
        }
        
        const user = await userService.addExperience(userId, exp);
        if (!user) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

/**
 * 사용자 삭제
 * DELETE /api/users/:userId
 */
router.delete('/:userId', async (req: Request, res: Response): Promise<any> => {
    try {
        const { userId } = req.params;
        const deleted = await userService.deleteUser(userId);
        
        if (!deleted) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }
        
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

export default router;