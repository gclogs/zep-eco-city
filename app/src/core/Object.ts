import { _COLORS } from "../utils/Color";
import { ObjectEffectType, ScriptDynamicResource, ScriptPlayer, TileEffectType } from "zep-script";
import { playerManager } from "./Player";
import { environmentManager } from "./Environment";

export const objectManager = {
    objects: {} as Record<string, {
        resource: ScriptDynamicResource,
        maxCount: number,
        currentCount: number,
        positions: Array<{x: number, y: number, key: string}>,
        options?: any
    }>,

    // 오브젝트 키에서 타입 추출
    getObjectType: function(key: string): string | null {
        const parts = key.split('_');
        return parts[0] || null;
    },

    // 특정 타입의 오브젝트인지 확인
    isObjectType: function(key: string, type: string): boolean {
        return this.getObjectType(key) === type;
    },

    // 오브젝트가 존재하는지 확인
    isValidObject: function(key: string): boolean {
        const type = this.getObjectType(key);
        return type !== null && type in this.objects;
    },

    // 맵의 랜덤 위치 찾기
    findRandomPosition: function(): { x: number, y: number } | null {
        const mapWidth = ScriptMap.width;
        const mapHeight = ScriptMap.height;
        
        // 맵 크기에 따른 최적의 시도 횟수 계산
        const maxAttempts = Math.min(mapWidth * mapHeight / 4, 200);
        const halfWidth = Math.floor(mapWidth / 2);
        const halfHeight = Math.floor(mapHeight / 2);
        
        // 효율적인 위치 검색
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // 맵의 4분면을 번갈아가며 검색
            const quadrant = attempt % 4;
            let randomX: number = 0;
            let randomY: number = 0;
            
            switch(quadrant) {
                case 0: // 좌상단
                    randomX = Math.floor(Math.random() * halfWidth);
                    randomY = Math.floor(Math.random() * halfHeight);
                    break;
                case 1: // 우상단
                    randomX = halfWidth + Math.floor(Math.random() * (mapWidth - halfWidth));
                    randomY = Math.floor(Math.random() * halfHeight);
                    break;
                case 2: // 좌하단
                    randomX = Math.floor(Math.random() * halfWidth);
                    randomY = halfHeight + Math.floor(Math.random() * (mapHeight - halfHeight));
                    break;
                case 3: // 우하단
                    randomX = halfWidth + Math.floor(Math.random() * (mapWidth - halfWidth));
                    randomY = halfHeight + Math.floor(Math.random() * (mapHeight - halfHeight));
                    break;
            }
            
            if (ScriptMap.getTile(2, randomX, randomY) !== TileEffectType.IMPASSABLE) {
                return { x: randomX, y: randomY };
            }
        }
        
        return null;
    },

    // 오브젝트 위치 저장
    saveObjectPositions: function(type: string, x: number, y: number, key: string) {
        if (!this.objects[type]) return;
        
        if (!this.objects[type].positions) {
            this.objects[type].positions = [];
        }
        
        this.objects[type].positions.push({ x, y, key });
        
        // Storage에 위치 정보 저장
        ScriptApp.getStorage((storageStr: string) => {
            try {
                const storage = storageStr ? JSON.parse(storageStr) : {};
                if (!storage.objectPositions) storage.objectPositions = {};
                storage.objectPositions[type] = this.objects[type].positions;
                ScriptApp.setStorage(JSON.stringify(storage));
            } catch (error) {
                ScriptApp.sayToStaffs(`${error} 오브젝트 위치 저장 중 오류 발생 (${type}):`, _COLORS.RED);
            }
        });
    },

    // 오브젝트 위치 복원
    restoreObjectPositions: function(type: string) {
        ScriptApp.getStorage((storageStr: string) => {
            try {
                const storage = storageStr ? JSON.parse(storageStr) : {};
                const positions = storage.objectPositions?.[type] || [];
                
                if (positions.length > 0) {
                    positions.forEach((pos: { x: number, y: number, key: string }) => {
                        const object = this.objects[type];
                        if (object && object.resource) {
                            ScriptMap.putObjectWithKey(pos.x, pos.y, object.resource, {
                                key: pos.key
                            });
                            object.currentCount++;
                        }
                    });
                    
                    this.objects[type].positions = positions;
                }
            } catch (error) {
                ScriptApp.sayToStaffs(`${error} 오브젝트 위치 복원 중 오류 발생 (${type}):`, _COLORS.RED);
            }
        });
    },

    // 오브젝트 타입 등록
    registerObjectType: function(key: string, resource: ScriptDynamicResource, maxCount: number, defaultOptions: any = {}) {
        this.objects[key] = {
            resource,
            maxCount,
            currentCount: 0,
            positions: [],
            options: defaultOptions
        };
        
        // Storage에서 카운트 복원
        ScriptApp.getStorage((storageStr: string) => {
            try {
                const storage = storageStr ? JSON.parse(storageStr) : {};
                if (storage.objectCounts?.[key]) {
                    this.objects[key].currentCount = storage.objectCounts[key];
                }
                this.restoreObjectPositions(key);
            } catch (error) {
                ScriptApp.sayToStaffs(`${error} 오브젝트 카운트 복원 중 오류 발생 (${key}):`, _COLORS.RED);
            }
        });
    },

    // 오브젝트 생성
    createObject: function(type: string, specificOptions: any = {}): string | null {
        const objectType = this.objects[type];
        if (!objectType) {
            ScriptApp.sayToStaffs(`[Debug] 등록되지 않은 오브젝트 타입: ${type}`);
            return null;
        }

        if (objectType.currentCount >= objectType.maxCount) {
            ScriptApp.sayToStaffs(`[Debug] 오브젝트 생성 제한 도달: ${type} (현재: ${objectType.currentCount}, 최대: ${objectType.maxCount})`);
            return null;
        }

        const position = this.findRandomPosition();
        if (!position) {
            ScriptApp.sayToStaffs("[Debug] 적절한 위치를 찾을 수 없습니다.");
            return null;
        }
        ScriptApp.sayToStaffs(`[Debug] 오브젝트 생성 위치 찾음: (${position.x}, ${position.y})`);

        const objectKey = `${type}_${position.x}_${position.y}_${Date.now()}`;
        const mergedOptions = Object.assign(
            {},
            objectType.options,
            specificOptions,
            {
                key: objectKey
            }
        );
        
        ScriptApp.sayToStaffs(`[Debug] 오브젝트 생성 시도: ${objectKey}`);
        ScriptApp.sayToStaffs(`[Debug] 옵션: ${JSON.stringify(mergedOptions)}`);

        const object = ScriptMap.putObjectWithKey(position.x, position.y, objectType.resource, mergedOptions);
        if (object) {
            objectType.currentCount++;
            this.saveObjectCount(type);
            this.saveObjectPositions(type, position.x, position.y, objectKey);
            ScriptApp.sayToStaffs(`[Debug] 오브젝트 생성 성공: ${objectKey} (현재 개수: ${objectType.currentCount})`);
            return objectKey;
        }
        
        ScriptApp.sayToStaffs(`[Debug] 오브젝트 생성 실패: ${objectKey}`);
        return null;
    },

    // 오브젝트 제거
    removeObject: function(type: string, key: string, x: number, y: number) {
        const objectType = this.objects[type];
        if (!objectType) {
            ScriptApp.sayToStaffs(`등록되지 않은 오브젝트 타입: ${type}`);
            return;
        }

        // 위치 정보 제거
        if (objectType.positions) {
            objectType.positions = objectType.positions.filter(pos => pos.key !== key);
            
            // Storage 업데이트
            ScriptApp.getStorage((storageStr: string) => {
                try {
                    const storage = storageStr ? JSON.parse(storageStr) : {};
                    if (!storage.objectPositions) storage.objectPositions = {};
                    storage.objectPositions[type] = objectType.positions;
                    ScriptApp.setStorage(JSON.stringify(storage));
                } catch (error) {
                    ScriptApp.sayToStaffs(`${error} 오브젝트 위치 제거 중 오류 발생 (${type}):`, _COLORS.RED);
                }
            });
        }

        ScriptMap.putObjectWithKey(x, y, null, { key: key });
        if (objectType.currentCount > 0) {
            objectType.currentCount--;
            this.saveObjectCount(type);
        }
    },

    // 오브젝트 카운트 저장
    saveObjectCount: function(type: string) {
        ScriptApp.getStorage((storageStr: string) => {
            try {
                const storage = storageStr ? JSON.parse(storageStr) : {};
                if (!storage.objectCounts) storage.objectCounts = {};
                storage.objectCounts[type] = this.objects[type].currentCount;
                ScriptApp.setStorage(JSON.stringify(storage));
            } catch (error) {
                ScriptApp.sayToStaffs(`${error} 오브젝트 카운트 저장 중 오류 발생 (${type}):`, _COLORS.RED);
            }
        });
    },

    // 특정 타입의 현재 오브젝트 수 반환
    getCurrentCount: function(type: string): number {
        return this.objects[type]?.currentCount || 0;
    },

    // 특정 타입의 최대 오브젝트 수 반환
    getMaxCount: function(type: string): number {
        return this.objects[type]?.maxCount || 0;
    },

    resetObjects: function() {
        this.objects = {};
        ScriptApp.setStorage(JSON.stringify({ objectCounts: {}, objectPositions: {} }));
        ScriptApp.sayToStaffs(`[Debug] 오브젝트 리셋 완료`);
    }
}

export const monsterManager = {
    respawnTimer: 0,
    monster: 
        ScriptApp.loadSpritesheet('monster.png', 96, 96, {
            // defined base anim
            left: [8, 9, 10, 11],
            up: [12, 13, 14, 15],
            down: [4, 5, 6, 7],
            right: [16, 17, 18, 19],
        }, 8),

    init: function() {
        ScriptApp.sayToStaffs("[Debug] monsterManager 초기화 시작");
        // 몬스터 타입 등록
        objectManager.registerObjectType('monster', this.monster, 20, {
            overlap: true,
            collide: true,
            movespeed: 100,
            useDirAnim: true
        });
        ScriptApp.sayToStaffs("[Debug] 몬스터 타입 등록 완료");
    },

    // 몬스터 오브젝트인지 확인
    isMonster: function(key: string): boolean {
        return objectManager.isObjectType(key, 'monster');
    },

    respawnMonster: function(dt: number) {
        this.respawnTimer += dt;
        
        // dt가 0.02초이므로, (0.02ms × 1500 = 30s)
        if (this.respawnTimer >= 30) { // 30초마다 빌런 생성
            this.respawnTimer = 0;
            ScriptApp.sayToStaffs("[Debug] 몬스터 리스폰 시도");
            this.createMonster();
        }
    },

    createMonster: function(minHp: number = 100, maxHp: number = 100) {
        ScriptApp.sayToStaffs("[Debug] 몬스터 생성 시작");
        const monsterKey = objectManager.createObject('monster', {
            npcProperty: { 
                name: `쓰레기 빌런 ${Math.floor(Math.random() * 100) + 1}`, 
                hpColor: 0x03ff03, 
                hp: minHp, 
                hpMax: maxHp
            }
        });
        
        if (monsterKey) {
            ScriptApp.sayToStaffs(`[Debug] 몬스터 생성 완료: ${monsterKey}`);
            ScriptMap.playObjectAnimationWithKey(monsterKey, "down", -1);
        } else {
            ScriptApp.sayToStaffs("[Debug] 몬스터 생성 실패");
        }
    },

    handleObjectAttack:function(sender: ScriptPlayer, key: string) {
        ScriptApp.sayToStaffs(`[Debug] 오브젝트 공격 처리: ${key}`);
        
        // 몬스터 오브젝트인지 먼저 확인
        if (!this.isMonster(key)) {
            ScriptApp.sayToStaffs(`[Debug] 몬스터가 아닌 오브젝트: ${key}`);
            return;
        }

        const targetObject = ScriptMap.getObjectWithKey(key) as unknown as { 
            npcProperty: { 
                name: string;
                hp: number; 
                hpMax: number; 
                hpColor: number
            };
            tileX: ScriptPlayer["tileX"];
            tileY: ScriptPlayer["tileY"];
            sendUpdated: () => ScriptPlayer["sendUpdated"];
        };
    
        if (!targetObject || !('npcProperty' in targetObject)) {
            ScriptApp.sayToStaffs(`Invalid object or missing npcProperty for key: ${key}`);
            return;
        }
    
        this.applyDamage(targetObject, 15);

        if (targetObject.npcProperty.hp > 0) {
            this.updateMonsterStatus(targetObject);
        } else {
            this.handleMonsterDefeat(sender, targetObject, key);
        }
    },

    applyDamage: function(monster: any, damage: number): void {
        monster.npcProperty.hp -= damage;
    },

    updateMonsterStatus: function(monster: any): void {
        const hpPercentage = monster.npcProperty.hp / monster.npcProperty.hpMax;
        
        if (hpPercentage < 0.3) {
            monster.npcProperty.hpColor = _COLORS.RED;
        } else if (hpPercentage < 0.7) {
            monster.npcProperty.hpColor = _COLORS.ORANGE;
        }
        monster.sendUpdated();
    },

    handleMonsterDefeat: function(sender: ScriptPlayer, monster: any, key: string): void {
        this.killedSuccess(sender, monster);
        this.giveReward(sender);
        this.removeMonster(monster, key);
    },

    killedSuccess: function(sender: ScriptPlayer, monster: any): void {
        const carbonReduction = 0.05 + Math.random() * 0.1;
        const recyclingIncrease = 0.001 + Math.random() * 0.01;

        // 탄소 배출량 감축 및 재활용률 증가
        environmentManager.metrics.carbonEmission -= carbonReduction;
        environmentManager.metrics.recyclingRate += recyclingIncrease;

        // 결과 메시지 전송
        sender.sendMessage(`${monster.npcProperty.name}을 처치하였습니다!`, _COLORS.RED);
        sender.sendMessage(`탄소배출량이 ${carbonReduction.toFixed(3)}톤 만큼 감축되었습니다.`, _COLORS.MAGENTA);
        sender.sendMessage(`재활용률이 ${recyclingIncrease.toFixed(3)}% 만큼 증가하였습니다.`, _COLORS.MAGENTA);
        sender.playSound("death.wav");
    },

    giveReward: function(sender: ScriptPlayer): void {
        const moneyEarned = 0.3 + Math.random() * 0.5;
        const newBalance = playerManager.addMoney(sender, moneyEarned);
        sender.sendMessage(`$${moneyEarned.toFixed(2)}원 만큼 획득하였습니다. (현재 잔액: $${newBalance.toFixed(2)})`, _COLORS.DARK_GREEN);
    },

    removeMonster: function(monster: any, key: string): void {
        ScriptMap.putObjectWithKey(monster.tileX, monster.tileY, null, { key: key });
    },
}

export const catManager = {
    respawnTimer: 0,
    monster: 
        ScriptApp.loadSpritesheet('cat.png', 32, 32, {
            // 고양이 캐릭터의 방향별 애니메이션 프레임
            down: [0, 1, 2],      // 아래쪽 보기
            left: [12, 13, 14],   // 왼쪽 보기
            right: [24, 25, 26],  // 오른쪽 보기
            up: [36, 37, 38],     // 위쪽 보기
            idle: [1]             // 정지 상태
        }, 8),

    init: function() {
        ScriptApp.sayToStaffs("[Debug] catManager 초기화 시작");
        // 몬스터 타입 등록
        objectManager.registerObjectType('cat', this.monster, 20, {
            type: ObjectEffectType.INTERACTION_WITH_ZEPSCRIPTS,
            overlap: true,
            collide: true,
            movespeed: 100,
            useDirAnim: true
        });
        ScriptApp.sayToStaffs("[Debug] cat 타입 등록 완료");
    },

    // 고양이 오브젝트인지 확인
    isCat: function(key: string): boolean {
        return objectManager.isObjectType(key, 'cat');
    },

    respawnCat: function(dt: number) {
        this.respawnTimer += dt;
        
        // dt가 0.02초이므로, (0.02ms × 1500 = 30s)
        if (this.respawnTimer >= 30) { // 30초마다 빌런 생성
            this.respawnTimer = 0;
            ScriptApp.sayToStaffs("[Debug] 고양이 리스폰 시도");
            this.createCat();
        }
    },

    createCat: function(minHp: number = 100, maxHp: number = 100) {
        ScriptApp.sayToStaffs("[Debug] 고양이 생성 시작");
        const monsterKey = objectManager.createObject('cat', {
            npcProperty: { 
                name: `박스 안에 고양이 ${Math.floor(Math.random() * 100) + 1}`, 
                hpColor: 0x03ff03, 
                hp: minHp, 
                hpMax: maxHp
            }
        });
        
        if (monsterKey) {
            ScriptApp.sayToStaffs(`[Debug] 고양이 생성 완료: ${monsterKey}`);
            ScriptMap.playObjectAnimationWithKey(monsterKey, "down", -1);
        } else {
            ScriptApp.sayToStaffs("[Debug] 고양이 생성 실패");
        }
    },

    handleObjectTouch:function(sender: ScriptPlayer, key: string) {
        ScriptApp.sayToStaffs(`[Debug] 오브젝트 공격 처리: ${key}`);
        
        // 고양이 오브젝트인지 먼저 확인
        if (!this.isCat(key)) {
            ScriptApp.sayToStaffs(`[Debug] 고양이가 아닌 오브젝트: ${key}`);
            return;
        }

        const catObject = ScriptMap.getObjectWithKey(key) as unknown as { 
            npcProperty: { 
                name: string;
                hp: number; 
                hpMax: number; 
                hpColor: number
            };
            tileX: ScriptPlayer["tileX"];
            tileY: ScriptPlayer["tileY"];
            sendUpdated: () => ScriptPlayer["sendUpdated"];
        };
    
        if (!catObject || !('npcProperty' in catObject)) {
            ScriptApp.sayToStaffs(`Invalid object or missing npcProperty for key: ${key}`);
            return;
        }
        this.handleCatDefeat(sender, catObject, key);
    },

    handleCatDefeat: function(sender: ScriptPlayer, cat: any, key: string): void {
        this.killedSuccess(sender, cat);
        this.giveReward(sender);
        this.removeCat(cat, key);
    },

    killedSuccess: function(sender: ScriptPlayer, cat: any): void {
        const carbonReduction = 0.05 + Math.random() * 0.1;
        const recyclingIncrease = 0.001 + Math.random() * 0.01;

        // 탄소 배출량 감축 및 재활용률 증가
        environmentManager.metrics.carbonEmission -= carbonReduction;
        environmentManager.metrics.recyclingRate += recyclingIncrease;

        // 결과 메시지 전송
        sender.sendMessage(`${cat.npcProperty.name}을 처치하였습니다!`, _COLORS.RED);
        sender.sendMessage(`탄소배출량이 ${carbonReduction.toFixed(3)}톤 만큼 감축되었습니다.`, _COLORS.MAGENTA);
        sender.sendMessage(`재활용률이 ${recyclingIncrease.toFixed(3)}% 만큼 증가하였습니다.`, _COLORS.MAGENTA);
        sender.playSound("death.wav");
    },

    giveReward: function(sender: ScriptPlayer): void {
        const moneyEarned = 0.3 + Math.random() * 0.5;
        const newBalance = playerManager.addMoney(sender, moneyEarned);
        sender.sendMessage(`$${moneyEarned.toFixed(2)}원 만큼 획득하였습니다. (현재 잔액: $${newBalance.toFixed(2)})`, _COLORS.DARK_GREEN);
    },

    removeCat: function(cat: any, key: string): void {
        objectManager.removeObject('cat', key, cat.tileX, cat.tileY);
        ScriptMap.putObjectWithKey(cat.tileX, cat.tileY, null, { key: key });
    },
}