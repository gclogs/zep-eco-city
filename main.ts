/**
 * Copyright (c) 2022 ZEP Co., LTD
 */

import { Script } from "vm";
import "zep-script";
import { ObjectEffectType, ScriptPlayer, TileEffectType } from "zep-script";

// 환경 지표 인터페이스 정의
/**
 * 게임 내 환경 지표를 관리하기 위한 인터페이스
 */
interface EnvironmentMetrics {
    /** 공기 오염도 (0-100 사이의 값) */
    airPollution: number;
    /** 탄소 배출량 (단위: 톤) */
    carbonEmission: number;
    /** 재활용률 (0-100 사이의 백분율) */
    recyclingRate: number;
    /** 마지막으로 체크한 탄소 배출량 임계값 (공기 오염도 증가 트리거) */
    lastCarbonThreshold: number;  // 마지막으로 체크한 탄소 배출량 임계값
}

// 저장소 데이터 인터페이스 정의
/**
 * 환경 지표 데이터의 저장소 인터페이스
 */
interface EnvironmenStorageData {
    /** 저장된 환경 지표 데이터 */
    environmentMetrics?: EnvironmentMetrics;
}

/**
 * 플레이어의 게임 내 상태와 통계를 관리하는 인터페이스
 */
interface PlayerStats {
    /** 플레이어의 고유 식별자 */
    id: string;
    /** 플레이어의 표시 이름 */
    name: string;
    /** 보유 금액 (게임 내 화폐) */
    money: number;
    /** 처치한 몬스터 수 */
    kills: number;
    /** 맞춘 퀴즈 개수 */
    quizCorrects: number;
    /** 이동 모드 설정 및 상태 */
    moveMode: {
        /** 걷기 모드 설정 */
        WALK: {
            /** 이동 속도 (단위: 픽셀/초) */
            speed: number;
            /** 모드 표시 텍스트 */
            title: string;
            /** 탄소 배출량 (단위: 톤/초) */
            carbonEmission: number;
        };
        /** 달리기 모드 설정 */
        RUN: {
            /** 이동 속도 (단위: 픽셀/초) */
            speed: number;
            /** 모드 표시 텍스트 */
            title: string;
            /** 탄소 배출량 (단위: 톤/초) */
            carbonEmission: number;
        };
        /** 현재 선택된 이동 모드 */
        current: 'WALK' | 'RUN';
    }
    /** 플레이어 레벨 (선택적) */
    level?: number;
    /** 경험치 (선택적) */
    exp?: number;
}
/**
 * 플레이어 데이터의 저장소 인터페이스
 */
interface PlayerStorageData {
    /** 저장된 플레이어 통계 데이터 */
    user?: PlayerStats;
}

/**
 * Zep 스크립트의 게임 오브젝트를 표현하는 인터페이스
 * @remarks
 * 맵에 배치되는 모든 상호작용 가능한 오브젝트의 기본 클래스입니다.
 * 몬스터, 아이템, NPC 등의 기본이 되는 클래스입니다.
 */
interface ScriptObject {
    /** 
     * 오브젝트의 고유 식별자
     * @remarks 맵 상의 오브젝트를 구분하는 데 사용됩니다.
     */
    text: number;

    /** 
     * 오브젝트의 값 또는 상태
     * @remarks 오브젝트의 현재 상태나 설정값을 저장합니다.
     */
    param1: string;

    /** 
     * 오브젝트의 효과 타입
     * @remarks 
     * 오브젝트가 플레이어나 다른 오브젝트와 상호작용할 때
     * 어떤 효과를 발생시킬지 결정합니다.
     */
    type: ObjectEffectType;
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

// 환경 관리자
const environmentManager = {
    displays: {
        widgets: new Set()
    },

    metrics: {
        airPollution: 0,
        carbonEmission: 0,
        recyclingRate: 0,
        lastCarbonThreshold: 0
    } as EnvironmentMetrics,

    updateTimer: 0,
    saveTimer: 0,
    SAVE_INTERVAL: 500,

    // 초기화 시 저장된 데이터 로드
    initialize: function() {
        ScriptApp.getStorage((storageStr: string) => {
            try {
                const storage: EnvironmenStorageData = storageStr ? JSON.parse(storageStr) : {};
                if (storage?.environmentMetrics) {
                    this.metrics = storage.environmentMetrics;
                    this.updateDisplays();
                }
            } catch (error) {
                ScriptApp.sayToStaffs("환경 지표 로드 중 오류 발생:", error);
            }
        });
    },

    // 최적화된 저장 함수
    saveMetrics: function(dt) {
        this.saveTimer += dt;
        
        if (this.saveTimer >= this.SAVE_INTERVAL) {
            this.saveTimer = 0;
            
            ScriptApp.getStorage((storageStr: string) => {
                try {
                    const storage: EnvironmenStorageData = storageStr ? JSON.parse(storageStr) : {};
                    const metricsToSave: EnvironmentMetrics = {
                        airPollution: Math.round(this.metrics.airPollution * 100) / 100,
                        carbonEmission: Math.round(this.metrics.carbonEmission * 100) / 100,
                        recyclingRate: Math.round(this.metrics.recyclingRate * 100) / 100,
                        lastCarbonThreshold: this.metrics.lastCarbonThreshold
                    };
                    
                    storage.environmentMetrics = metricsToSave;
                    ScriptApp.setStorage(JSON.stringify(storage));
                } catch (error) {
                    ScriptApp.sayToStaffs("환경 지표 저장 중 오류 발생:", error);
                }
            });
        }
    },

    // 위젯 설정
    setWidget: function(widget) {
        this.displays.widgets.add(widget);
        this.updateDisplays();
        
        // 위젯 메시지 이벤트 핸들러 설정
        widget.onMessage.Add((player, data) => {
            if (data.type === "close") {
                this.displays.widgets.delete(widget);
                widget.destroy();
            }
        });
    },

    // 주기적인 환경 지표 업데이트
    updateEnvironmentByMovement: function(dt) {
        this.updateTimer += dt;
        
        // dt가 0.02초이므로, (0.02ms × 50 = 1s)
        if (this.updateTimer >= 1) {
            this.updateTimer = 0;
            
            // 모든 플레이어의 현재 이동 모드에 따라 환경 지표 업데이트
            for (const playerId in playerManager.players) {
                const playerData = playerManager.players[playerId];
                const currentMode = playerData.moveMode[playerData.moveMode.current];
                this.updateMetrics({
                    carbonEmission: currentMode.carbonEmission
                });
            }
        }
    },

    // 환경 지표 업데이트
    updateMetrics: function(metrics) {
        let hasChanges = false;
        
        if (metrics.carbonEmission !== undefined) {
            // const randomFactor = 0.25 + Math.random() * 1.0; // 0.25 ~ 1.25 사이의 랜덤 값
            const newValue = Math.max(
                0, 
                this.metrics.carbonEmission + metrics.carbonEmission
            );

            ScriptApp.sayToStaffs(`Carbon emission increased by factor ${metrics.carbonEmission} to ${newValue}`);
            if (newValue !== this.metrics.carbonEmission) {
                this.metrics.carbonEmission = newValue;
                hasChanges = true;
                
                // 탄소 배출량이 1 단위로 증가할 때마다 공기 오염도 증가
                const currentThreshold = Math.floor(newValue / 1) * 1;
                if (currentThreshold > this.metrics.lastCarbonThreshold) {
                    const airPollutionFactor = 0.25 + Math.random() * 1.75; // 0.25 ~ 2.0 사이의 랜덤 값
                    this.metrics.airPollution += airPollutionFactor;
                    this.metrics.lastCarbonThreshold = currentThreshold;
                    ScriptApp.sayToStaffs(`Air pollution increased by factor ${airPollutionFactor.toFixed(2)} due to carbon threshold ${currentThreshold}`);
                }
            }
        }
        
        if (metrics.airPollution !== undefined && metrics.airPollution !== this.metrics.airPollution) {
            this.metrics.airPollution = metrics.airPollution;
            hasChanges = true;
        }
        if (metrics.recyclingRate !== undefined && metrics.recyclingRate !== this.metrics.recyclingRate) {
            this.metrics.recyclingRate = metrics.recyclingRate;
            hasChanges = true;
        }

        if (hasChanges) {
            this.updateDisplays();
        }
    },

    // 디스플레이 업데이트
    updateDisplays: function() {
        // 모든 플레이어의 위젯 업데이트
        for (const widget of this.displays.widgets) {
            widget.sendMessage({
                type: "update_metrics",
                data: {
                    airPollution: this.metrics.airPollution,
                    carbonEmission: this.metrics.carbonEmission,
                    recyclingRate: this.metrics.recyclingRate,
                }
            });
        }
    }
};

// 플레이어 관리자
const playerManager = {
    players: {} as Record<string, PlayerStats>,

    // 플레이어 초기화
    initPlayer: function(player) {
        ScriptApp.sayToStaffs(`플레이어 초기화: ${player.name} (ID: ${player.id})`);
        
        ScriptApp.getStorage((storageStr: string) => {
            try {
                const storage: PlayerStorageData = storageStr ? JSON.parse(storageStr) : {};
                
                // 새로운 플레이어 데이터 초기화
                const newPlayerData: PlayerStats = {
                    id: player.id,
                    name: player.name,
                    money: 0,
                    moveMode: {
                        WALK: { speed: 80, title: "🚶🏻 걷기", carbonEmission: 0.0001 },
                        RUN: { speed: 150, title: "🏃🏻 달리기", carbonEmission: 0.0007 },
                        current: 'WALK'
                    },
                    kills: 0,
                    quizCorrects: 0
                };

                // 저장된 데이터가 있으면 복원
                if (storage?.user) {
                    this.players[player.id] = {
                        ...newPlayerData,
                        ...storage.user,
                        id: player.id,  // ID는 항상 현재 값 사용
                        name: player.name  // 이름은 항상 현재 값 사용
                    };
                } else {
                    this.players[player.id] = newPlayerData;
                }

                // Storage에 저장
                storage.user = this.players[player.id];
                ScriptApp.setStorage(JSON.stringify(storage));

                // 플레이어 이동 속성 설정
                this.updatePlayerMovement(player);
            } catch (error) {
                ScriptApp.sayToStaffs("플레이어 데이터 초기화 중 오류 발생:", error);
                this.initializeDefaultPlayer(player);
            }
        });
    },

    // 기본 플레이어 초기화 (에러 발생 시 사용)
    initializeDefaultPlayer: function(player) {
        this.players[player.id] = {
            id: player.id,
            name: player.name,
            money: 0,
            moveMode: {
                WALK: { speed: 80, title: "🚶🏻 걷기", carbonEmission: 0.0001 },
                RUN: { speed: 150, title: "🏃🏻 달리기", carbonEmission: 0.0007 },
                current: 'WALK'
            },
            kills: 0,
            quizCorrects: 0
        };
        this.updatePlayerMovement(player);
    },

    // 플레이어 이동 속성 업데이트
    updatePlayerMovement: function(player) {
        const playerData = this.players[player.id];
        if (!playerData) return;

        const currentMode = playerData.moveMode[playerData.moveMode.current];
        const scriptPlayer = ScriptApp.getPlayer(player.id);
        if (scriptPlayer) {
            scriptPlayer.moveSpeed = currentMode.speed;
            scriptPlayer.title = currentMode.title;
            scriptPlayer.sendUpdated();
        }
    },

    // 플레이어 제거
    removePlayer: function(player) {
        ScriptApp.sayToStaffs(`플레이어 제거: ${player.name} (ID: ${player.id})`);
        delete this.players[player.id];
    },

    // 돈 관련 함수들
    addMoney: function(player, amount) {
        if (!this.players[player.id]) {
            this.initPlayer(player);
            return 0;
        }
        this.players[player.id].money = Math.round((this.players[player.id].money + amount) * 100) / 100;
        this.savePlayerData(player.id);
        return this.players[player.id].money;
    },

    subtractMoney: function(player, amount) {
        if (!this.players[player.id]) {
            this.initPlayer(player);
            return 0;
        }
        this.players[player.id].money = Math.round((this.players[player.id].money - amount) * 100) / 100;
        this.savePlayerData(player.id);
        return this.players[player.id].money;
    },

    // 플레이어 데이터 저장
    savePlayerData: function(playerId) {
        ScriptApp.getStorage((storageStr: string) => {
            try {
                const storage: PlayerStorageData = storageStr ? JSON.parse(storageStr) : {};
                storage.user = this.players[playerId];
                ScriptApp.setStorage(JSON.stringify(storage));
            } catch (error) {
                ScriptApp.sayToStaffs("플레이어 데이터 저장 중 오류 발생:", error);
            }
        });
    },

    // 이동 모드 전환
    toggleMovementMode: function(player) {
        const playerData = this.players[player.id];
        if (!playerData) {
            ScriptApp.sayToStaffs(`플레이어 데이터 없음: ${player.name} (ID: ${player.id})`);
            return;
        }

        // 현재 모드 전환
        playerData.moveMode.current = playerData.moveMode.current === 'WALK' ? 'RUN' : 'WALK';
        const newMode = playerData.moveMode[playerData.moveMode.current];
        
        const scriptPlayer = ScriptApp.getPlayer(player.id);
        if (scriptPlayer) {
            scriptPlayer.moveSpeed = newMode.speed;
            scriptPlayer.title = newMode.title;
            scriptPlayer.showCenterLabel(`${newMode.title}로 변경되었습니다!`);
        }
        
        this.savePlayerData(player.id);
        this.updatePlayerMovement(player);
    }
};

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
        sender.sendMessage(`${monster.npcProperty.name}을 처치하였습니다!`, _colors.RED);
        sender.sendMessage(`탄소배출량이 ${carbonReduction.toFixed(3)}톤 만큼 감축되었습니다.`, _colors.MAGENTA);
        sender.sendMessage(`재활용률이 ${recyclingIncrease.toFixed(3)}% 만큼 증가하였습니다.`, _colors.MAGENTA);
        sender.playSound("death.wav");
    },

    giveReward: function(sender: ScriptPlayer): void {
        const moneyEarned = 0.3 + Math.random() * 0.5;
        const newBalance = playerManager.addMoney(sender, moneyEarned);
        sender.sendMessage(`$${moneyEarned.toFixed(2)}원 만큼 획득하였습니다. (현재 잔액: $${newBalance.toFixed(2)})`, _colors.DARK_GREEN);
    },

    removeMonster: function(monster: any, key: string): void {
        ScriptMap.putObjectWithKey(monster.tileX, monster.tileY, null, { key: key });
    },

}

// 스태프 명령어 처리
ScriptApp.onSay.Add(function (player: ScriptPlayer, text: string) {
    // !가 포함되어 있지 않으면 무시
    if (!text.includes('!')) return;

    const args = text.split(' ');
    const command = args[0].toLowerCase().replace('!', '');  // ! 제거

    switch (command) {
        case 'resetmove':
            // 모든 플레이어의 moveMode 초기화
            Object.values(playerManager.players).forEach(playerData => {
                playerData.moveMode = {
                    WALK: { speed: 80, title: "🚶🏻 걷기", carbonEmission: 0.0001 },
                    RUN: { speed: 150, title: "🏃🏻 달리기", carbonEmission: 0.0007 },
                    current: 'WALK'
                };
                const scriptPlayer = ScriptApp.getPlayer(playerData.id);
                if (scriptPlayer) {
                    playerManager.updatePlayerMovement(scriptPlayer);
                }
                playerManager.savePlayerData(playerData.id);
            });
            ScriptApp.sayToAll("🔄 모든 플레이어의 이동 모드가 초기화되었습니다.");
            break;

        case 'showmove':
            // 모든 플레이어의 moveMode 상태 표시
            Object.values(playerManager.players).forEach(playerData => {
                ScriptApp.sayToStaffs(`👤 ${playerData.name}:
                - 현재 모드: ${playerData.moveMode.current}
                - WALK: ${playerData.moveMode.WALK.carbonEmission}
                - RUN: ${playerData.moveMode.RUN.carbonEmission}`);
            });
            break;
    }
});

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
ScriptApp.addOnKeyDown(82, function (player) {
    playerManager.toggleMovementMode(player);
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
    environmentManager.initialize();
});