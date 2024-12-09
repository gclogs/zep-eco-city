/**
 * Copyright (c) 2022 ZEP Co., LTD
 */

import { Script } from "vm";
import "zep-script";
import { ObjectEffectType, ScriptPlayer, TileEffectType } from "zep-script";

// 환경 지표 인터페이스 정의
interface EnvironmentMetrics {
    airPollution: number;
    carbonEmission: number;
    recyclingRate: number;
    lastCarbonThreshold: number;  // 마지막으로 체크한 탄소 배출량 임계값
    installedProjects: {
        solarPanels: number;
        trees: number;
        bikeLanes: number;
    };
}
// 저장소 데이터 인터페이스 정의
interface StorageData {
    environmentMetrics?: EnvironmentMetrics;
}

class ScriptObject {
    text: number;               // 객체의 id
    param1: string;            // 객체의 value
    type: ObjectEffectType;    // 객체의 타입
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
        widgets: new Set()  // 모든 플레이어의 위젯을 저장
    },

    metrics: {
        airPollution: 0,
        carbonEmission: 0,
        recyclingRate: 0,
        lastCarbonThreshold: 0,
        installedProjects: {
            solarPanels: 0,
            trees: 0,
            bikeLanes: 0
        }
    } as EnvironmentMetrics,

    updateTimer: 0,
    saveTimer: 0,
    SAVE_INTERVAL: 500,

    // 초기화 시 저장된 데이터 로드
    initialize: function() {
        try {
            ScriptApp.getStorage((storageStr: string) => {
                const storage: StorageData = storageStr ? JSON.parse(storageStr) : {};
                if (storage?.environmentMetrics) {
                    this.metrics = {
                        ...this.metrics,
                        ...storage.environmentMetrics
                    };
                    this.updateDisplays();
                }
            });
        } catch (error) {
            ScriptApp.sayToStaffs("환경 지표 로드 중 오류 발생:", error);
        }
    },

    // 최적화된 저장 함수
    saveMetrics: function(dt) {
        this.saveTimer += dt;
        
        if (this.saveTimer >= this.SAVE_INTERVAL) {
            this.saveTimer = 0;
            
            try {
                const metricsToSave: EnvironmentMetrics = {
                    airPollution: Math.round(this.metrics.airPollution * 100) / 100,
                    carbonEmission: Math.round(this.metrics.carbonEmission * 100) / 100,
                    recyclingRate: Math.round(this.metrics.recyclingRate * 100) / 100,
                    lastCarbonThreshold: this.metrics.lastCarbonThreshold,
                    installedProjects: this.metrics.installedProjects
                };
                
                ScriptApp.getStorage((storageStr: string) => {
                    const storage: StorageData = storageStr ? JSON.parse(storageStr) : {};
                    const updatedStorage: StorageData = {
                        ...storage,
                        environmentMetrics: metricsToSave
                    };
                    ScriptApp.setStorage(JSON.stringify(updatedStorage));
                    ScriptApp.sayToStaffs("환경 지표 저장 완료");
                });
            } catch (error) {
                ScriptApp.sayToStaffs("환경 지표 저장 중 오류 발생:", error);
            }
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
                this.updateMetrics({
                    carbonEmission: playerData.mode.carbonEmission
                });
            }
        }
    },

    // 환경 지표 업데이트
    updateMetrics: function(metrics) {
        let hasChanges = false;
        
        if (metrics.carbonEmission !== undefined) {
            const randomFactor = 0.25 + Math.random() * 1.0; // 0.25 ~ 1.25 사이의 랜덤 값
            const newValue = Math.max(
                0, 
                this.metrics.carbonEmission + (metrics.carbonEmission * randomFactor)
            );
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
                
                // ScriptApp.sayToStaffs(`Carbon emission updated to: ${newValue} (Random factor: ${randomFactor.toFixed(2)})`);
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
                    installedProjects: this.metrics.installedProjects
                }
            });
        }
    }
};

// 플레이어 관리자
const playerManager = {
    players: {},

    // 이동 모드 정의
    WALKING: {
        speed: 80,
        title: "🚶🏻 걷기 모드",
        carbonEmission: 0.001  // 걷기 모드시 0.01톤 증가
    },
    RUNNING: {
        speed: 100,
        title: "👟 달리기 모드",
        carbonEmission: 0.02   // 달리기 모드시 0.05톤 증가
    },

    // 플레이어 초기화
    initPlayer: function(player) {
        if (player.id in this.players) return;

        ScriptApp.sayToStaffs(`플레이어 초기화: ${player.name} (ID: ${player.id})`);
        this.players[player.id] = {
            id: player.id,
            name: player.name,
            money: 0,  // 초기 돈을 0으로 설정
            mode: this.WALKING
        };
        
        player.moveSpeed = this.WALKING.speed;
        player.title = this.WALKING.title;
        player.sendUpdated();
    },

    // 플레이어 제거
    removePlayer: function(player) {
        ScriptApp.sayToStaffs(`플레이어 제거: ${player.name} (ID: ${player.id})`);
        delete this.players[player.id];
    },

    addMoney: function(player, amount) {
        if (!this.players[player.id]) {
            this.initPlayer(player);
        }
        this.players[player.id].money += amount;
        return this.players[player.id].money;
    },

    subtractMoney: function(player, amount) {
        if (!this.players[player.id]) {
            this.initPlayer(player);
        }
        this.players[player.id].money -= amount;
        return this.players[player.id].money;
    },

    // 이동 모드 전환
    toggleMovementMode: function(player) {
        const playerData = this.players[player.id];
        if (!playerData) {
            ScriptApp.sayToStaffs(`플레이어 데이터 없음: ${player.name} (ID: ${player.id})`);
            return;
        }

        const newMode = 
            playerData.mode === this.WALKING 
                ? this.RUNNING 
                : this.WALKING;
        
        playerData.mode = newMode;
        player.moveSpeed = newMode.speed;
        player.title = newMode.title;

        player.showCenterLabel(`${newMode.title}로 변경되었습니다!`);
        ScriptApp.sayToStaffs(`이동 모드 변경: ${player.name} (ID: ${player.id}) -> ${newMode.title}`);
        player.sendUpdated();
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
        this.processVictory(sender, monster);
        this.giveReward(sender);
        this.removeMonster(monster, key);
    },

    processVictory: function(sender: ScriptPlayer, monster: any): void {
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
    playerManager.removePlayer(player);
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