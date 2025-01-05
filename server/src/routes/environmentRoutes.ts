import { Router, Request, Response } from 'express';
import { environmentService } from '../services/environmentService';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<any> => {
    const environment = await environmentService.findEnvironment();
    res.status(200).json(environment);
});

router.post('/metrics', async (req: Request, res: Response): Promise<any> => {
    const environmentMetrics = req.body;
    console.log(req.body);
    const updatedEnvironment = await environmentService.updateEnvironment(environmentMetrics);
    res.status(200).json(updatedEnvironment);
});

router.delete('/metrics', async (req: Request, res: Response): Promise<any> => {
    const deletedEnvironment = await environmentService.deleteEnvironment();
    res.status(200).json(deletedEnvironment);
});

export default router;