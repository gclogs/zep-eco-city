import { ColorType, ObjectEffectType, ScriptPlayer } from "zep-script";
import { Entity } from "../core/Entity"
import { playerManager } from "../core/Player";
import { COLOR } from "../utils/Config";

type BlockObject = {
    npcProperty: {
        name: string;
        hp: number; 
        hpMax: number; 
        hpColor: number
    };
    tileX: number;
    tileY: number;
    key: string;
    moveSpeed: number;
    useDirAnim: boolean;
    sendUpdated: () => void;
}

export const blockEntity = {
    block: new Entity(),

    blockSheet: ScriptApp.loadSpritesheet("blueman.png", 48, 64, {
        left: [5, 6, 7, 8, 9],
        up: [15, 16, 17, 18, 19],
        down: [0, 1, 2, 3, 4],
        right: [10, 11, 12, 13, 14],
        dance: [20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37],
        down_jump: [38],
        left_jump: [39],
        right_jump: [40],
        up_jump: [41],
    }, 8),
    
    blockOptions: {
        npcProperty: { name: "block", hpColor: 0x03ff03, hp: 100, hpMax: 100 },
        overlap: true,
        collide: true,
        movespeed: 100,
        useDirAnim: true,
        offsetX: -8,
        offsetY: -32,
    },

    createBlock() {
        this.block.registerEntityType("block", this.blockSheet, 10, this.blockOptions);
        this.block.createEntity("block", this.blockOptions);
    },

    removeBlockWithKey(key: string, x: number, y: number) {
        this.block.removeEntityWithKey("block", key, x, y);
    },

    attackedBlock(sender: ScriptPlayer, key: string) {
        const blockObject = ScriptMap.getObjectWithKey(key) as unknown as BlockObject;
        
        const validEntity = this.block.isValidEntity(key);
        if (validEntity && blockObject.npcProperty.hp > 0) {
            blockObject.npcProperty.hp -= 10;
            blockObject.sendUpdated();

            sender.playSound("hit.wav", false, true, "hit", 0.5);
        } else {
            sender.playSound("banana.mp3", false, true, "death", 0.5);
            sender.sendMessage("쓰레기를 주웠다!", COLOR.GREEN);
            playerManager.addMoney(sender, 10);

            this.removeBlockWithKey(key, blockObject.tileX, blockObject.tileY);
        }
    },

    resetBlock() {
        this.block.resetEntitiesType("block");
        ScriptApp.sayToStaffs(`[Debug] 엔티티 리셋 완료`);
    },
}