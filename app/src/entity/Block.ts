import { Entity } from "../core/Entity"

export const blockEntity = {
    block: new Entity(),

    blockSheet: ScriptApp.loadSpritesheet("cat.png", 48, 48, {
        left: [0],
        right: [1],
        top: [2],
        bottom: [3]
    }, 8),
    
    blockOptions: {
        npcProperty: { name: "block" },
        overlap: true,
        movespeed: 100,
        useDirAnim: true   
    },

    createBlock() {
        this.block.registerEntityType("block", this.blockSheet, 10, this.blockOptions);
        this.block.createEntity("block", this.blockOptions);
    },

    removeBlock(key: string, x: number, y: number) {
        return this.block.removeEntityWithKey("block", key, x, y);
    }
}