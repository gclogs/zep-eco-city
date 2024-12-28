import { environmentManager } from "../core/Environment";
import { catManager, monsterManager } from "../core/Object";
import { Space } from "../utils/Space";

export class Scheduler {
    private static instance: Scheduler | null = null;
    private constructor() {}

    public static getInstance(): Scheduler {
        if (!Scheduler.instance) {
            Scheduler.instance = new Scheduler();
            Scheduler.instance.initialize();
        }
        return Scheduler.instance;
    }

    private initialize() {
        ScriptApp.onUpdate.Add((dt: number) => {
            this.update(dt);
        });
    }

    private update(dt: number) {
        environmentManager.updateEnvironmentByMovement(dt);
        environmentManager.saveMetrics(dt);
    
        if(ScriptApp.mapHashID == Space.university) {
            catManager.respawnCat(dt);
        }
        
        if(ScriptApp.mapHashID == Space.classroom) {
            monsterManager.respawnMonster(dt);
        }
    };
}

