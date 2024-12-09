/**
 * Copyright (c) 2022 ZEP Co., LTD
 */

import { Script } from "vm";
import "zep-script";
import { ObjectEffectType, ScriptPlayer, TileEffectType } from "zep-script";

/**
 * 환경 지표의 범위를 정의하는 상수
 */
const ENV_CONSTRAINTS = {
    AIR_POLLUTION: { MIN: 0, MAX: 100 },
    CARBON_EMISSION: { MIN: 0 },
    RECYCLING_RATE: { MIN: 0, MAX: 100 }
} as const;

/**
 * 이동 모드 열거형
 */
enum MoveMode {
    WALK = "WALK",
    RUN = "RUN"
}

/**
 * 에러 타입 열거형
 */
enum ErrorType {
    LOAD_FAILED = 'LOAD_FAILED',
    SAVE_FAILED = 'SAVE_FAILED',
    INIT_PLAYER_FAILED = 'INIT_PLAYER_FAILED',
    LOAD_PLAYER_DATA_FAILED = 'LOAD_PLAYER_DATA_FAILED',
    UPDATE_FAILED = 'UPDATE_FAILED'
}

/**
 * 이벤트 타입 열거형
 */
enum EventType {
    METRICS_SAVED = 'METRICS_SAVED',
    PLAYERS_SAVED = 'PLAYERS_SAVED',
    PLAYER_UPDATED = 'PLAYER_UPDATED'
}

/**
 * 환경 지표 관리를 위한 인터페이스
 */
interface EnvironmentMetrics {
    /** 
     * 공기 오염도
     * @minimum 0
     * @maximum 100
     * @default 0
     * @unit percentage
     */
    readonly airPollution: number;

    /** 
     * 탄소 배출량
     * @minimum 0
     * @unit tons
     * @default 0
     * @precision 3
     */
    readonly carbonEmission: number;

    /** 
     * 재활용률
     * @minimum 0
     * @maximum 100
     * @default 0
     * @unit percentage
     * @precision 2
     */
    readonly recyclingRate: number;

    /** 
     * 마지막으로 체크한 탄소 배출량 임계값
     * @minimum 0
     * @default 0
     * @remarks 탄소 배출량이 특정 임계값을 넘을 때마다 공기 오염도 증가
     */
    readonly lastCarbonThreshold: number;

    /** 
     * 마지막 업데이트 시간
     * @format Unix Timestamp (milliseconds)
     */
    readonly lastUpdateTime: number;
}

/**
 * 플레이어 통계 인터페이스
 */
interface PlayerStats {
    readonly money: number;
    readonly kills: number;
    readonly quizzes: number;
}

/**
 * 플레이어 설정 인터페이스
 */
interface PlayerSettings {
    moveMode: MoveMode;
}

/**
 * 플레이어 데이터 스키마 인터페이스
 */
interface PlayerDataSchema {
    readonly version: number;
    readonly data: {
        readonly uid: string;
        stats: PlayerStats;
        settings: PlayerSettings;
        readonly timestamp: number;
    };
}

/**
 * 게임 저장소 인터페이스
 */
interface GameStorage {
    environmentMetrics: EnvironmentMetrics;
    playerData: Map<string, PlayerDataSchema>;
    version: number;
}

class ScriptObject {
    private text: number;               // 객체의 id
    private param1: string;            // 객체의 value
    private type: ObjectEffectType;    // 객체의 타입
};

const STATE_INIT = 3000;
const STATE_READY = 3001;
const STATE_PLAYING = 3002;
const STATE_END = 3003;

let _gameState = STATE_INIT;
let _stateTimer = 0;
let _transformCount = 0;
let _answerCount = 0;

const _maps = {
    UNIVERSITY: "r7LY4M",
    CLASSROOM: "Wa376G",
}

// 기본 색상들
const _colors = {
    RED:        0xff0000,     // 빨간색
    GREEN:      0x00ff00,     // 초록색
    BLUE:       0x0000ff,     // 파란색
    YELLOW:     0xffff00,     // 노란색
    CYAN:       0x00ffff,     // 청록색
    MAGENTA:    0xff00ff,     // 자홍색
    WHITE:      0xffffff,     // 흰색
    BLACK:      0x000000,     // 검정색
    
    // 파스텔 톤
    LIGHT_GREEN:0x90ee90,     // 연한 초록
    LIGHT_BLUE: 0xadd8e6,     // 연한 파랑
    LIGHT_PINK: 0xffb6c1,     // 연한 분홍

    // 어두운 톤
    DARK_GREEN: 0x006400,     // 어두운 초록
    DARK_BLUE:  0x00008b,     // 어두운 파랑
    DARK_RED:   0x8b0000,     // 어두운 빨강

    // 기타 유용한 색상들
    ORANGE:     0xffa500,     // 주황색
    PURPLE:     0x800080,     // 보라색
    BROWN:      0xa52a2a,     // 갈색
}

// 환경 관리자 클래스
class EnvironmentManager {
    private static instance: EnvironmentManager;
    private displays: Set<any> = new Set();
    private metrics: EnvironmentMetrics;
    private updateTimer: number = 0;
    private saveTimer: number = 0;
    private readonly SAVE_INTERVAL: number = 500;
    private readonly UPDATE_INTERVAL: number = 1000;

    private constructor() {
        this.metrics = {
            airPollution: 0,
            carbonEmission: 0,
            recyclingRate: 0,
            lastCarbonThreshold: 0,
            lastUpdateTime: Date.now()
        };
        this.loadMetrics();
    }

    public static getInstance(): EnvironmentManager {
        if (!EnvironmentManager.instance) {
            EnvironmentManager.instance = new EnvironmentManager();
        }
        return EnvironmentManager.instance;
    }

    public loadMetrics(): void {
        try {
            ScriptApp.getStorage((storageStr: string) => {
                const storage: GameStorage = storageStr ? JSON.parse(storageStr) : {};
                if (storage.environmentMetrics) {
                    this.metrics = {
                        ...storage.environmentMetrics,
                        lastUpdateTime: Date.now()
                    };
                }
                this.updateDisplays();
            });
        } catch (error) {
            ScriptApp.sayToStaffs(`[ERROR:${ErrorType.LOAD_FAILED}] ${error.message || JSON.stringify(error)}`);
        }
    }

    public saveMetrics(dt: number): void {
        this.saveTimer += dt;
        if (this.saveTimer < this.SAVE_INTERVAL) return;

        try {
            ScriptApp.getStorage((storageStr: string) => {
                const storage: GameStorage = storageStr ? JSON.parse(storageStr) : {};
                const newStorage: GameStorage = {
                    environmentMetrics: { ...this.metrics },
                    playerData: storage.playerData || new Map(),
                    version: storage.version || 1
                };
                ScriptApp.setStorage(JSON.stringify(newStorage));
                ScriptApp.sayToStaffs(`[${EventType.METRICS_SAVED}] ${JSON.stringify(this.metrics)}`);
            });
        } catch (error) {
            ScriptApp.sayToStaffs(`[ERROR:${ErrorType.SAVE_FAILED}] ${error.message || JSON.stringify(error)}`);
        } finally {
            this.saveTimer = 0;
        }
    }

    public setWidget(widget: any): void {
        if (!widget) return;
        this.displays.add(widget);
        this.updateDisplays();
    }

    public updateEnvironmentByMovement(dt: number): void {
        this.updateTimer += dt;
        if (this.updateTimer < this.UPDATE_INTERVAL) return;

        const carbonIncrease = this.calculateCarbonIncrease();
        this.updateMetrics({
            ...this.metrics,
            carbonEmission: this.metrics.carbonEmission + carbonIncrease,
            lastUpdateTime: Date.now()
        });

        this.updateTimer = 0;
    }

    private calculateCarbonIncrease(): number {
        // 탄소 증가량 계산 로직
        return 0.1; // 임시 값
    }

    public updateMetrics(newMetrics: Partial<EnvironmentMetrics>): void {
        this.metrics = {
            ...this.metrics,
            ...newMetrics,
            airPollution: Math.max(ENV_CONSTRAINTS.AIR_POLLUTION.MIN,
                Math.min(ENV_CONSTRAINTS.AIR_POLLUTION.MAX, newMetrics.airPollution ?? this.metrics.airPollution)),
            carbonEmission: Math.max(ENV_CONSTRAINTS.CARBON_EMISSION.MIN, 
                newMetrics.carbonEmission ?? this.metrics.carbonEmission),
            recyclingRate: Math.max(ENV_CONSTRAINTS.RECYCLING_RATE.MIN,
                Math.min(ENV_CONSTRAINTS.RECYCLING_RATE.MAX, newMetrics.recyclingRate ?? this.metrics.recyclingRate))
        };
        this.updateDisplays();
    }

    public getMetrics(): Readonly<EnvironmentMetrics> {
        return { ...this.metrics };
    }

    private updateDisplays(): void {
        const displayData = {
            airPollution: Math.round(this.metrics.airPollution),
            carbonEmission: this.metrics.carbonEmission.toFixed(3),
            recyclingRate: this.metrics.recyclingRate.toFixed(2)
        };

        this.displays.forEach(widget => {
            widget.sendMessage("updateEnvironment", displayData);
        });
    }

    private logEvent(type: string, data: any): void {
        ScriptApp.sayToStaffs(`[${type}] ${JSON.stringify(data)}`);
    }

    private logError(type: string, error: any): void {
        ScriptApp.sayToStaffs(`[ERROR:${type}] ${error.message || JSON.stringify(error)}`);
    }
}

// 환경 관리자 인스턴스 생성
const environmentManager = EnvironmentManager.getInstance();

// 플레이어 관리자 클래스
class PlayerManager {
    private static instance: PlayerManager;
    private readonly VERSION: number = 1;
    private players: Map<string, PlayerDataSchema> = new Map();
    private saveTimer: number = 0;
    private readonly saveInterval: number = 5000;

    public readonly moveTypes = {
        [MoveMode.WALK]: { speed: 80, title: "🚶🏻 걷기 모드", emission: 0.001 },
        [MoveMode.RUN]: { speed: 150, title: "🏃🏻 달리기 모드", emission: 0.003 }
    } as const;

    private cache = {
        ttl: 50, // 5분
        items: new Map<string, PlayerDataSchema>()
    };

    private constructor() {}

    public static getInstance(): PlayerManager {
        if (!PlayerManager.instance) {
            PlayerManager.instance = new PlayerManager();
        }
        return PlayerManager.instance;
    }

    private createDefaultData(playerId: string): PlayerDataSchema {
        return {
            version: this.VERSION,
            data: {
                uid: playerId,
                stats: {
                    money: 0,
                    kills: 0,
                    quizzes: 0
                },
                settings: {
                    moveMode: MoveMode.WALK
                },
                timestamp: Date.now()
            }
        };
    }

    public async initPlayer(player: ScriptPlayer): Promise<void> {
        if (this.players.has(player.id)) return;

        try {
            const existingData = await this.loadPlayerData(player.id);
            if (existingData) {
                this.players.set(player.id, existingData);
                this.applyPlayerData(player, existingData);
            } else {
                const defaultData = this.createDefaultData(player.id);
                this.players.set(player.id, defaultData);
                this.applyPlayerData(player, defaultData);
            }
        } catch (error) {
            ScriptApp.sayToStaffs(`[ERROR:${ErrorType.INIT_PLAYER_FAILED}] ${error.message || JSON.stringify(error)}`);
            const fallbackData = this.createDefaultData(player.id);
            this.players.set(player.id, fallbackData);
            this.applyPlayerData(player, fallbackData);
        }
    }

    private async loadPlayerData(playerId: string): Promise<PlayerDataSchema | null> {
        return new Promise((resolve) => {
            ScriptApp.getStorage((storageStr: string) => {
                try {
                    const storage: GameStorage = storageStr ? JSON.parse(storageStr) : {};
                    resolve(storage.playerData?.get(playerId) || null);
                } catch (error) {
                    ScriptApp.sayToStaffs(`[ERROR:${ErrorType.LOAD_PLAYER_DATA_FAILED}] ${error.message || JSON.stringify(error)}`);
                    resolve(null);
                }
            });
        });
    }

    private validateAndMigrateData(data: any): PlayerDataSchema {
        if (!data || data.version !== this.VERSION) {
            return this.migrateData(data);
        }
        return data;
    }

    private migrateData(oldData: any): PlayerDataSchema {
        const newData = this.createDefaultData(oldData?.data?.uid || 'unknown');
        if (oldData?.data) {
            newData.data.stats = {
                ...newData.data.stats,
                ...oldData.data.stats
            };
            newData.data.settings = {
                ...newData.data.settings,
                ...oldData.data.settings
            };
        }
        return newData;
    }

    private applyPlayerData(player: ScriptPlayer, data: PlayerDataSchema): void {
        const moveConfig = this.moveTypes[data.data.settings.moveMode];
        player.moveSpeed = moveConfig.speed;
        player.sendMessage(`${moveConfig.title} 적용됨`, _colors.GREEN);
        player.sendUpdated();
    }

    public savePlayerData(dt: number): void {
        this.saveTimer += dt;
        if (this.saveTimer < this.saveInterval) return;

        this.saveTimer = 0;
        this.performSave();
    }

    private async performSave(): Promise<void> {
        if (this.players.size === 0) return;

        try {
            const playersData = new Map(
                Array.from(this.players.entries()).map(([id, data]) => [
                    id,
                    {
                        ...data,
                        data: {
                            ...data.data,
                            timestamp: Date.now()
                        }
                    }
                ])
            );

            ScriptApp.getStorage((storageStr: string) => {
                const storage: GameStorage = storageStr ? JSON.parse(storageStr) : {};
                storage.playerData = playersData;
                storage.version = this.VERSION;
                ScriptApp.setStorage(JSON.stringify(storage));
                ScriptApp.sayToStaffs(`[${EventType.PLAYERS_SAVED}] ${JSON.stringify({ count: playersData.size })}`);
            });
        } catch (error) {
            ScriptApp.sayToStaffs(`[ERROR:${ErrorType.SAVE_FAILED}] ${error.message || JSON.stringify(error)}`);
        }
    }

    public async toggleMovementMode(player: ScriptPlayer): Promise<void> {
        try {
            const playerData = this.players.get(player.id);
            if (!playerData) {
                ScriptApp.sayToStaffs(`[ERROR:${ErrorType.UPDATE_FAILED}] Player data not found for ID: ${player.id}`);
                return;
            }

            const currentMode = playerData.data.settings.moveMode;
            const newMode = currentMode === MoveMode.WALK ? MoveMode.RUN : MoveMode.WALK;

            // 데이터 업데이트
            playerData.data.settings.moveMode = newMode;
            this.players.set(player.id, playerData);

            // 플레이어 상태 업데이트
            await new Promise<void>((resolve) => {
                player.moveSpeed = this.moveTypes[newMode].speed;
                player.sendMessage(`${this.moveTypes[newMode].title}로 전환되었습니다.`, _colors.CYAN);
                resolve();
            });

            // 변경사항 저장
            await this.performSave();
        } catch (error) {
            ScriptApp.sayToStaffs(`[ERROR:${ErrorType.UPDATE_FAILED}] Failed to toggle movement mode: ${error.message}`);
        }
    }
}

// 플레이어 관리자 인스턴스 생성
const playerManager = PlayerManager.getInstance();

const monsterManager = {
    respawnTimer: 0,
    monster: 
        ScriptApp.loadSpritesheet('monster.png', 96, 96, {
            // defined base anim
            left: [8, 9, 10, 11],
            up: [12, 13, 14, 15],
            down: [4, 5, 6, 7],
            right: [16, 17, 18, 19],
        }, 8),


    createMonster: function(minHp: number = 100, maxHp: number = 100) {
        const mapWidth = ScriptMap.width;
        const mapHeight = ScriptMap.height;
        
        // 맵 크기에 따른 최적의 시도 횟수 계산
        const maxAttempts = Math.min(mapWidth * mapHeight / 4, 200);
        let randomX: number;
        let randomY: number;
        
        // 효율적인 위치 검색
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // 맵의 4분면을 번갈아가며 검색
            const quadrant = attempt % 4;
            const halfWidth = Math.floor(mapWidth / 2);
            const halfHeight = Math.floor(mapHeight / 2);
            
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
                const objectKey = `Monster_${randomX}_${randomY}`;
                
                const monsterObject = ScriptMap.putObjectWithKey(randomX, randomY, this.monster, {
                    npcProperty: { 
                        name: `쓰레기 빌런 ${Math.floor(Math.random() * 100) + 1}`, 
                        hpColor: 0x03ff03, 
                        hp: minHp, 
                        hpMax: maxHp
                    },
                    overlap: true,
                    collide: true,
                    movespeed: 100, 
                    key: objectKey,
                    useDirAnim: true
                });

                ScriptApp.sayToStaffs(`몬스터 생성: ${objectKey} (위치: ${randomX}, ${randomY})`);
                ScriptMap.playObjectAnimationWithKey(objectKey, "down", -1);
                return;
            }
        }
        
        ScriptApp.sayToStaffs("적절한 위치를 찾을 수 없습니다.");
    },

    respawnMonster: function(dt: number) {
        this.respawnTimer += dt;
        
        // dt가 0.02초이므로, (0.02ms × 1500 = 30s)
        if (this.respawnTimer >= 30) { // 30초마다 빌런 생성
            this.respawnTimer = 0;
            this.createMonster();
        }
    },

    handleObjectAttack:function(sender: ScriptPlayer, key: string) {
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
            monster.npcProperty.hpColor = _colors.RED;
        } else if (hpPercentage < 0.7) {
            monster.npcProperty.hpColor = _colors.ORANGE;
        }
        monster.sendUpdated();
    },

    handleMonsterDefeat: function(sender: ScriptPlayer, monster: any, key: string): void {
        this.processVictory(sender, monster);
        this.giveReward(sender);
        this.removeMonster(monster, key);
    },

    processVictory: function(sender: ScriptPlayer, monster: any): void {
        const carbonReduction = 0.05 + Math.random() * 0.1;
        const recyclingIncrease = 0.001 + Math.random() * 0.01;

        // 탄소 배출량 감축 및 재활용률 증가
        environmentManager.updateMetrics({
            carbonEmission: environmentManager.getMetrics().carbonEmission - carbonReduction,
            recyclingRate: environmentManager.getMetrics().recyclingRate + recyclingIncrease
        });

        // 결과 메시지 전송
        sender.sendMessage(`${monster.npcProperty.name}을 처치하였습니다!`, _colors.RED);
        sender.sendMessage(`탄소배출량이 ${carbonReduction.toFixed(3)}톤 만큼 감축되었습니다.`, _colors.MAGENTA);
        sender.sendMessage(`재활용률이 ${recyclingIncrease.toFixed(3)}% 만큼 증가하였습니다.`, _colors.MAGENTA);
        sender.playSound("death.wav");
    },

    giveReward: function(sender: ScriptPlayer): void {
        const moneyEarned = 0.3 + Math.random() * 0.5;
        // const newBalance = playerManager.addMoney(sender, moneyEarned);
        // sender.sendMessage(`$${moneyEarned.toFixed(2)}원 만큼 획득하였습니다. (현재 잔액: $${newBalance.toFixed(2)})`, _colors.DARK_GREEN);
    },

    removeMonster: function(monster: any, key: string): void {
        ScriptMap.putObjectWithKey(monster.tileX, monster.tileY, null, { key: key });
    },
}

// 사이드바 앱이 터치(클릭)되었을 때 동작하는 함수
ScriptApp.onSidebarTouched.Add(function (player: ScriptPlayer) {
    const widget = player.showWidget("widget.html", "sidebar", 350, 350);
    environmentManager.setWidget(widget);
    player.tag.widget = widget;
});

// 플레이어가 퇴장할 때 동작하는 함수
ScriptApp.onLeavePlayer.Add(function (player: ScriptPlayer) {
    if (player.tag.widget) {
        player.tag.widget.destroy();
        player.tag.widget = null;
    }
});

// 플레이어 입장시 동작하는 함수
ScriptApp.onJoinPlayer.Add(function(player: ScriptPlayer) {
    ScriptApp.sayToStaffs(`플레이어 참가: ${player.name} (ID: ${player.id})`);
    player.tag = {
        widget: null,
    };
    playerManager.initPlayer(player);
    ScriptApp.sayToStaffs(`현재 맵 HashID: ${ScriptApp.mapHashID}`);
    ScriptApp.sayToStaffs(`현재 맵 너비/높이: ${ScriptMap.width}x${ScriptMap.height}`);
    
    // 환경 지표 위젯 생성
    const widget = player.showWidget("widget.html", "topleft", 300, 150);
    environmentManager.setWidget(widget);
});

ScriptApp.onDestroy.Add(function () {
  ScriptMap.clearAllObjects();
  ScriptApp.sayToAll("블록이 파괴 되어 게임이 종료 되었습니다.")
});

// R키를 눌렀을 때 이동 모드 전환
ScriptApp.addOnKeyDown(82, async function (player) {
    await playerManager.toggleMovementMode(player);
});

// 매 프레임마다 환경 업데이트
ScriptApp.onUpdate.Add(function(dt) {
    environmentManager.updateEnvironmentByMovement(dt);
    environmentManager.saveMetrics(dt); // 저장 로직 추가

    if(ScriptApp.mapHashID == _maps.CLASSROOM) { // 교실에서만 몬스터 생성
        monsterManager.respawnMonster(dt);
    }
});

// 쓰레기 몬스터 처치 이벤트
ScriptApp.onAppObjectAttacked.Add(function (sender: ScriptPlayer, x: number, y: number, layer: number, key: string) {
    monsterManager.handleObjectAttack(sender, key);
});

// 쓰레기 분리수거 이벤트
ScriptApp.onObjectTouched.Add(function (sender: ScriptPlayer, x: number, y: number, tileID: number, obj: ScriptObject) {
    if(ScriptApp.mapHashID == _maps.UNIVERSITY) { // 캠퍼스에서만 쓰레기 생성
        ScriptApp.sayToStaffs("캠퍼스입니다.");
    }
});

// 초기화
ScriptApp.onInit.Add(function() {
    const environmentManager = EnvironmentManager.getInstance();
    environmentManager.loadMetrics();
});