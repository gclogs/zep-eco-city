import { ScriptDynamicResource } from "zep-script";
import { COLOR } from "../utils/Config";
interface EntityOptions {
    npcProperty: { name: string, hpColor: number, hp: number, hpMax: number },
    overlap: boolean,
    movespeed: number,
    key?: string,
    useDirAnim: boolean,
    collide?: boolean,
    offsetX: number,
    offsetY: number
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
     * 엔티티 타입(PK)에서 타입 추출
     * @type {string} type - 엔티티의 타입(PK)
     * @returns {string | null} 엔티티 타입
     */
    public getEntityType(type: string): string | null {
        const parts = type.split('_');
        return parts[0] || null;
    }

    /**
     * 특정 타입의 엔티티인지 확인
     * @type {string} t1 - 확인받을 엔티티 타입
     * @type {string} t2 - 확인하는 엔티티 타입
     */
    public isEntityType(t1: string, t2: string): boolean {
        return this.getEntityType(t1) === t2;
    }

    /**
     * 특정 타입의 엔티티 유효성 검증
     */
    public isValidEntity(key: string): boolean {
        const type = this.getEntityType(key);
        return type !== null && type in this.entities;
    }

    /**
     * 맵의 최적 위치 찾기 - 랜덤 포레스트 알고리즘 활용
     * @returns {number} x - X 좌표
     * @returns {number} y - Y 좌표
     */
    public findRandomPosition(): { x: number, y: number } {
        const mapWidth = ScriptMap.width;
        const mapHeight = ScriptMap.height;
        
        ScriptApp.sayToStaffs(`[Debug] 맵 크기: ${mapWidth}x${mapHeight}`);
        
        // 맵 크기에 따른 최적의 시도 횟수 계산
        const maxAttempts = Math.min(mapWidth * mapHeight / 4, 200);
        const halfWidth = Math.floor(mapWidth / 2);
        const halfHeight = Math.floor(mapHeight / 2);
        
        ScriptApp.sayToStaffs(`[Debug] 최대 시도 횟수: ${maxAttempts}`);
        ScriptApp.sayToStaffs(`[Debug] 맵 중앙점: (${halfWidth}, ${halfHeight})`);

        // 각 사분면별 후보 위치 저장
        const candidates: Array<{x: number, y: number, score: number}> = [];
        
        // 랜덤 포레스트 알고리즘으로 각 사분면 검색
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const quadrant = attempt % 4;
            let randomX: number = 0;
            let randomY: number = 0;
            
            switch(quadrant) {
                case 0: // 좌상단
                    randomX = Math.floor(Math.random() * halfWidth);
                    randomY = Math.floor(Math.random() * halfHeight);
                    ScriptApp.sayToStaffs(`[Debug] 좌상단 검색: (${randomX}, ${randomY})`);
                    break;
                case 1: // 우상단
                    randomX = halfWidth + Math.floor(Math.random() * (mapWidth - halfWidth));
                    randomY = Math.floor(Math.random() * halfHeight);
                    ScriptApp.sayToStaffs(`[Debug] 우상단 검색: (${randomX}, ${randomY})`);
                    break;
                case 2: // 좌하단
                    randomX = Math.floor(Math.random() * halfWidth);
                    randomY = halfHeight + Math.floor(Math.random() * (mapHeight - halfHeight));
                    ScriptApp.sayToStaffs(`[Debug] 좌하단 검색: (${randomX}, ${randomY})`);
                    break;
                case 3: // 우하단
                    randomX = halfWidth + Math.floor(Math.random() * (mapWidth - halfWidth));
                    randomY = halfHeight + Math.floor(Math.random() * (mapHeight - halfHeight));
                    ScriptApp.sayToStaffs(`[Debug] 우하단 검색: (${randomX}, ${randomY})`);
                    break;
            }
            
            // 위치 적합성 점수 계산 (예: 중앙으로부터의 거리, 다른 엔티티와의 거리 등)
            const distanceFromCenter = Math.sqrt(
                Math.pow(randomX - halfWidth, 2) + 
                Math.pow(randomY - halfHeight, 2)
            );
            
            // 정규화된 점수 계산 (0~1 사이)
            const maxPossibleDistance = Math.sqrt(Math.pow(mapWidth, 2) + Math.pow(mapHeight, 2));
            const score = 1 - (distanceFromCenter / maxPossibleDistance);
            
            candidates.push({
                x: randomX,
                y: randomY,
                score: score
            });
        }
        
        // 점수를 기준으로 정렬하고 상위 30%의 후보들 중에서 랜덤 선택
        candidates.sort((a, b) => b.score - a.score);
        const topCandidatesCount = Math.max(1, Math.floor(candidates.length * 0.3));
        const selectedIndex = Math.floor(Math.random() * topCandidatesCount);
        const selected = candidates[selectedIndex];
        
        ScriptApp.sayToStaffs(`[Debug] 최종 선택된 위치: (${selected.x}, ${selected.y}), 점수: ${selected.score.toFixed(3)}`);
        return { x: selected.x, y: selected.y };
    }

    /**
     * 엔티티 위치 저장
     * @type {string} type - 엔티티 타입(PK)
     * @type {number} x - 엔티티의 X 좌표
     * @type {number} y - 엔티티의 Y 좌표
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
                ScriptApp.sayToStaffs(`${error} 오브젝트 위치 저장 중 오류 발생 (${type}):`, COLOR.RED);
            }
        });
    };

    /**
     * 엔티티 위치 복원
     * @type {string} type - 엔티티 타입(PK)
     * @returns {void}
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
                ScriptApp.sayToStaffs(`${error} 오브젝트 위치 복원 중 오류 발생 (${type}):`, COLOR.RED);
            }
        });
    };

    /**
     * 엔티티 타입 등록
     * @type {string} type - 엔티티 타입(PK)
     * @type {ScriptDynamicResource} resource - 엔티티 리소스(이미지)
     * @type {number} maxCount - 엔티티 최대 개수
     * @type {EntityOptions} defaultOptions - 엔티티 기본 특성
     * @returns {void}
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
            ScriptApp.sayToStaffs(`${error} 엔티티 카운트 복원 중 오류 발생 (${type}):`, COLOR.RED);
        }
    };

    /**
     * 엔티티 생성
     * @type {string} type - 엔티티 타입(PK)
     * @type {any} specificOptions - 엔티티에 부여될 특성
     * @returns {string | null} 엔티티의 키
     */
    public createEntity(type: string, specificOptions: EntityOptions): string | null {
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

        const entityKey = `${type}_${position.x}_${position.y}`;
        const mergedOptions: EntityOptions = {
            ...specificOptions,
            key: entityKey
        };

        ScriptApp.sayToStaffs(`[Debug] 오브젝트 생성 시도: ${entityKey}`);
        ScriptApp.sayToStaffs(`[Debug] 옵션: ${JSON.stringify(mergedOptions)}`);

        // resource 배열에서 마지막 요소 사용 (가장 최근에 추가된 리소스)
        const currentResource = this.entities[type].resource[this.entities[type].resource.length - 1];
        const entity = ScriptMap.putObjectWithKey(position.x, position.y, currentResource, mergedOptions);
        
        if (entity) {
            this.entities[type].currentCount++;
            this.saveEntityCount(type);
            this.saveEntityPositions(type, position.x, position.y, entityKey);
            ScriptMap.playObjectAnimationWithKey(entityKey, "down", -1);
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
            ScriptApp.getStorage(() => {
                try {
                    const storage = JSON.parse(ScriptApp.storage);
                    if (!storage.entityPositions) storage.entityPositions = {};
                    storage.entityPositions[type] = entityType.positions;
                    ScriptApp.setStorage(JSON.stringify(storage));
                } catch (error) {
                    ScriptApp.sayToStaffs(`${error} 오브젝트 위치 제거 중 오류 발생 (${type}):`, COLOR.RED);
                }
            });
        }

        ScriptMap.putObjectWithKey(x, y, null, { key: key });
        if (entityType.currentCount > 0) {
            entityType.currentCount--;
            this.saveEntityCount(type);
        }
    };

    /**
     * 엔티티 카운트(젠) 저장
     * @type {string} type - 엔티티의 타입(PK)
     */
    public saveEntityCount(type: string) {
        ScriptApp.getStorage(() => {
            try {
                const storage = JSON.parse(ScriptApp.storage);
                if (!storage.entityCounts) storage.entityCounts = {};
                storage.entityCounts[type] = this.entities[type].currentCount;
                ScriptApp.setStorage(JSON.stringify(storage));
            } catch (error) {
                ScriptApp.sayToStaffs(`${error} 오브젝트 카운트 저장 중 오류 발생 (${type}):`, COLOR.RED);
            }
        });
    };

    /**
     * 특정 타입의 엔티티 수 반환
     * @type {string} type - 엔티티 타입(PK)
     * @returns {number} 엔티티 수
     */
    getCurrentCount(type: string): number {
        return this.entities[type]?.currentCount || 0;
    };

    /**
     * 특정 타입의 최대 엔티티 수 반환
     * @type {string} type - 엔티티 타입(PK)
     * @returns {number} 최대 엔티티 수
     */
    getMaxCount(type: string): number {
        return this.entities[type]?.maxCount || 0;
    };

    /**
     * 특정 타입의 엔티티 리셋
     */
    resetEntitiesType(type: string) {
        this.entities[type] = {
            resource: [],
            maxCount: 0,
            currentCount: 0,
            positions: []
        };
        
        ScriptApp.getStorage(() => {
            const storage = JSON.parse(ScriptApp.storage);
            if (storage.entityCounts) storage.entityCounts = {};
            if (storage.entityPositions) storage.entityPositions = {};
            ScriptApp.setStorage(JSON.stringify(storage));
        });
        
        ScriptApp.sayToStaffs(`[Debug] 엔티티 리셋 완료`);
    };
}