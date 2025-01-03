import { Router, Request, Response } from 'express';
import { userService } from '../services/userService';

const router = Router();

// userRoutes.ts
// 1. 사용자 생성/수정 (POST)
router.post('/', async (req: Request, res: Response): Promise<any> => {
    const userData = req.body;
    const user = await userService.findOrCreateUser(userData);
    res.status(201).json(user);
});

// 2. 사용자 조회 (GET)
router.get('/:userId', async (req: Request, res: Response): Promise<any> => {
    const userId = req.params.userId;
    const user = await userService.findUser(userId);
    
    if (!user) {
        return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    
    res.status(200).json(user);
});
/**
 * 사용자 정보 조회
 * GET /api/users/list
 */
router.get('/list', async (req: Request, res: Response): Promise<any> => {
    const users = await userService.listUser();
    res.status(200).json(users);
});

/**
 * 사용자 정보 조회
 * GET /api/users/:userId
 */
router.get('/', async (req: Request, res: Response): Promise<any> => {
    const userId = req.body;
    if (!userId) {
        return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    const user = await userService.findUser(userId);
    if(userId !== user?.userId) {
        return res.status(404).json({ error: '사용자의 ID를 잘못 입력하셨습니다.' });
    }
    
    res.status(200).json(user);
});

/**
 * 돈 추가
 * POST /api/users/money/add
 */
router.post('/money/add', async (req: Request, res: Response): Promise<any> => {
    const { userId, amount } = req.body;
        
    if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: '유효한 금액을 입력해주세요.' });
    }
    
    const user = await userService.addMoney(userId, amount);
    if (!user) {
        return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    
    res.json(user);
});

/**
 * 돈 차감
 * POST /api/users/money/subtract
 */
router.post('/money/subtract', async (req: Request, res: Response): Promise<any> => {
    const { userId, amount } = req.body;
    
    if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: '유효한 금액을 입력해주세요.' });
    }
    
    const user = await userService.subtractMoney(userId, amount);
    res.json(user);
});

/**
 * 몬스터 처치 수 증가
 * POST /api/users/:userId/kills/increment
 */
router.post('/:userId/kills/increment', async (req: Request, res: Response): Promise<any> => {
    const { userId } = req.params;
    const user = await userService.incrementKills(userId);
    
    if (!user) {
        return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    
    res.json(user);
});

/**
 * 경험치 추가
 * POST /api/users/:userId/experience
 */
router.post('/:userId/experience', async (req: Request, res: Response): Promise<any> => {
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
});

/**
 * 사용자 삭제
 * DELETE /api/users/delete
 */
router.delete('/delete', async (req: Request, res: Response): Promise<any> => {
    const { userId } = req.body;
    const deleted = await userService.deleteUser(userId);
    
    if (!deleted) {
        return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    
    res.status(204).send({});
});

export default router;