import { ColorType, ScriptDynamicResource, ScriptPlayer, TileEffectType } from "zep-script";
interface EntityOptions {
    npcProperty: { name: string },
    overlap: boolean,
    movespeed: number,
    collide?: boolean,
    useDirAnim: boolean
}

/**
 * 엔티티 클래스
 */
export class Entity {
    private entities: Record<string, {
        resource: Array<ScriptDynamicResource>,
        maxCount: number,
        currentCount: number,
        positions: Array<{x: number, y: number, key: string}> ,
        options?: any
    }> = {};

    /**
     * 엔티티 키에서 타입 추출
     */
    public getEntityType(key: string): string | null {
        const parts = key.split('_');
        return parts[0] || null;
    }

    /**
     * 특정 타입의 엔티티인지 확인
     */
    public isEntityType(t1: string, t2: string): boolean {
        return this.getEntityType(t1) === t2;
    }

    public isValidEntity(key: string): boolean {
        const type = this.getEntityType(key);
        return type !== null && type in this.entities;
    }

    /**
     * 맵의 랜덤 위치 찾기
     */
    public findRandomPosition(): { x: number, y: number } {
        const mapWidth = ScriptMap.width;
        const mapHeight = ScriptMap.height;
        
        // 맵 크기에 따른 최적의 시도 횟수 계산
        const maxAttempts = Math.min(mapWidth * mapHeight / 4, 200);
        const halfWidth = Math.floor(mapWidth / 2);
        const halfHeight = Math.floor(mapHeight / 2);

        let x: number = 0;
        let y: number = 0;
        
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
            
            x = randomX;
            y = randomY;
            break;
        }

        return { x, y };
    }

    /**
     * 오브젝트 위치 저장
     */
    public saveEntityPositions(type: string, x: number, y: number, key: string) {
        if (!this.entities[type]) return;
        
        if (!this.entities[type].positions) {
            this.entities[type].positions = [];
        }
        
        this.entities[type].positions.push({ x, y, key });
        
        // Storage에 위치 정보 저장
        ScriptApp.getStorage(() => {
            try {
                const storage = JSON.parse(ScriptApp.storage);
                if (!storage.entityPositions) storage.entityPositions = {};
                storage.entityPositions[type] = this.entities[type].positions;
                ScriptApp.setStorage(JSON.stringify(storage));
            } catch (error) {
                ScriptApp.sayToStaffs(`${error} 오브젝트 위치 저장 중 오류 발생 (${type}):`, ColorType.RED);
            }
        });
    };

    /**
     * 오브젝트 위치 복원
     */
    public restoreEntityPositions(type: string) {
        ScriptApp.getStorage(() => {
            try {
                const storage = JSON.parse(ScriptApp.storage);
                const positions = storage.entityPositions?.[type] || [];
                const currentResource = this.entities[type].resource[this.entities[type].resource.length - 1];
                
                if (positions.length > 0) {
                    positions.forEach((pos: { x: number, y: number, key: string }) => {
                        const entity = this.entities[type];
                        if (entity && currentResource) {
                            ScriptMap.putObjectWithKey(pos.x, pos.y, currentResource, {
                                key: pos.key
                            });
                            entity.currentCount++;
                        }
                    });
                    
                    this.entities[type].positions = positions;
                }
            } catch (error) {
                ScriptApp.sayToStaffs(`${error} 오브젝트 위치 복원 중 오류 발생 (${type}):`, ColorType.RED);
            }
        });
    };

    /**
     * 엔티티 타입 등록
     */
    public registerEntityType(type: string, resource: ScriptDynamicResource, maxCount: number, defaultOptions: EntityOptions): void {
        if (!this.entities[type]) {
            this.entities[type] = {
                resource: [resource],
                maxCount,
                currentCount: 0,
                positions: [],
                options: defaultOptions
            };
        } else {
            // 이미 존재하는 타입이면 resource 배열에 추가
            this.entities[type].resource.push(resource);
        }

        // 저장된 카운트 복원
        try {
            const storage = ScriptApp.storage ? JSON.parse(ScriptApp.storage) : {};
            if (storage.entityCounts && storage.entityCounts[type]) {
                this.entities[type].currentCount = storage.entityCounts[type];
                ScriptApp.sayToStaffs(`[Debug] 엔티티 카운트 복원됨: ${type} = ${storage.entityCounts[type]}`);
            }
        } catch (error) {
            ScriptApp.sayToStaffs(`${error} 엔티티 카운트 복원 중 오류 발생 (${type}):`, ColorType.RED);
        }
    };

    /**
     * 엔티티 생성
     */
    public createEntity(type: string, specificOptions: any = {}): string | null {
        if (!this.entities[type]) {
            ScriptApp.sayToStaffs(`[Debug] 등록되지 않은 엔티티 타입: ${type}`);
            return null;
        }

        if (this.entities[type].currentCount >= this.entities[type].maxCount) {
            ScriptApp.sayToStaffs(`[Debug] 엔티티 생성 제한 도달: ${type} (현재: ${this.entities[type].currentCount}, 최대: ${this.entities[type].maxCount})`);
            return null;
        }

        const position = this.findRandomPosition();
        if (!position) {
            ScriptApp.sayToStaffs("[Debug] 적절한 위치를 찾을 수 없습니다.");
            return null;
        }

        ScriptApp.sayToStaffs(`[Debug] 엔티티 생성 위치 찾음: (${position.x}, ${position.y})`);

        const entityKey = `${type}_${position.x}_${position.y}_${Date.now()}`;
        const mergedOptions = Object.assign(
            {},
            specificOptions,
            this.entities[type].options
        );

        ScriptApp.sayToStaffs(`[Debug] 오브젝트 생성 시도: ${entityKey}`);
        ScriptApp.sayToStaffs(`[Debug] 옵션: ${JSON.stringify(mergedOptions)}`);

        // resource 배열에서 마지막 요소 사용 (가장 최근에 추가된 리소스)
        const currentResource = this.entities[type].resource[this.entities[type].resource.length - 1];
        const entity = ScriptMap.putObjectWithKey(position.x, position.y, currentResource, mergedOptions);
        
        if (entity) {
            this.entities[type].currentCount++;
            this.saveEntityCount(type);
            this.saveEntityPositions(type, position.x, position.y, entityKey);
            ScriptApp.sayToStaffs(`[Debug] 오브젝트 생성 성공: ${entityKey} (현재 개수: ${this.entities[type].currentCount})`);
            return entityKey;
        }
        
        ScriptApp.sayToStaffs(`[Debug] 오브젝트 생성 실패: ${entityKey}`);
        return null;
    };

    /** 엔티티 제거
     * @type {string} type - 엔티티 타입
     * @type {string} key - 엔티티의 키
     * @type {number} x - 엔티티의 X 좌표
     * @type {number} y - 엔티티의 Y 좌표
     * */
    public removeEntityWithKey(type: string, key: string, x: number, y: number) {
        const entityType = this.entities[type];
        if (!entityType) {
            ScriptApp.sayToStaffs(`등록되지 않은 오브젝트 타입: ${type}`);
            return;
        }

        // 위치 정보 제거
        if (entityType.positions) {
            entityType.positions = entityType.positions.filter(pos => pos.key !== key);
            
            // Storage 업데이트
            ScriptApp.getStorage((storageStr: string) => {
                try {
                    const storage = storageStr ? JSON.parse(storageStr) : {};
                    if (!storage.entityPositions) storage.entityPositions = {};
                    storage.entityPositions[type] = entityType.positions;
                    ScriptApp.setStorage(JSON.stringify(storage));
                } catch (error) {
                    ScriptApp.sayToStaffs(`${error} 오브젝트 위치 제거 중 오류 발생 (${type}):`, ColorType.RED);
                }
            });
        }

        ScriptMap.putObjectWithKey(x, y, null, { key: key });
        if (entityType.currentCount > 0) {
            entityType.currentCount--;
            this.saveEntityCount(type);
        }
    };

    // 엔티티 카운트(젠) 저장
    public saveEntityCount(type: string) {
        ScriptApp.getStorage(() => {
            try {
                const storage = JSON.parse(ScriptApp.storage);
                if (!storage.entityCounts) storage.entityCounts = {};
                storage.entityCounts[type] = this.entities[type].currentCount;
                ScriptApp.setStorage(JSON.stringify(storage));
            } catch (error) {
                ScriptApp.sayToStaffs(`${error} 오브젝트 카운트 저장 중 오류 발생 (${type}):`, ColorType.RED);
            }
        });
    };

    // 특정 타입의 현재 엔티티 수 반환
    getCurrentCount(type: string): number {
        return this.entities[type]?.currentCount || 0;
    };

    // 특정 타입의 최대 엔티티 수 반환
    getMaxCount(type: string): number {
        return this.entities[type]?.maxCount || 0;
    };

    // 엔티티 리셋
    resetEntities() {
        this.entities = {};
        
        ScriptApp.getStorage(() => {
            const storage = JSON.parse(ScriptApp.storage);
            if (storage.entityCounts) storage.entityCounts = {};
            if (storage.entityPositions) storage.entityPositions = {};
            ScriptApp.setStorage(JSON.stringify(storage));
        });
        
        ScriptApp.sayToStaffs(`[Debug] 엔티티 리셋 완료`);
    };
}