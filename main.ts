/**
 * Copyright (c) 2022 ZEP Co., LTD
 */

import "zep-script";

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

const STATE_INIT = 3000;
const STATE_READY = 3001;
const STATE_PLAYING = 3002;
const STATE_END = 3003;

let _gameState = STATE_INIT;
let _stateTimer = 0;
let transformCount = 0;
let _answerCount = 0;

// 친환경 프로젝트 정의
const EcoProjects = {
    SOLAR_PANEL: {
        name: "태양광 패널",
        carbonReduction: 0.05,    // 설치당 탄소 배출량 감소
        cost: 1000
    },
    TREE_PLANTING: {
        name: "나무 심기",
        carbonReduction: 0.02,    // 나무당 탄소 흡수량
        cost: 500
    },
    BIKE_LANE: {
        name: "자전거 도로",
        carbonReduction: 0.03,    // 도로당 탄소 감소량
        cost: 800
    }
};

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
            const projectReduction = 
                (this.metrics.installedProjects.solarPanels * EcoProjects.SOLAR_PANEL.carbonReduction) +
                (this.metrics.installedProjects.trees * EcoProjects.TREE_PLANTING.carbonReduction) +
                (this.metrics.installedProjects.bikeLanes * EcoProjects.BIKE_LANE.carbonReduction);
            
            const newValue = Math.max(
                0, 
                this.metrics.carbonEmission + (metrics.carbonEmission * randomFactor) - projectReduction
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
                
                ScriptApp.sayToStaffs(`Carbon emission updated to: ${newValue} (Random factor: ${randomFactor.toFixed(2)})`);
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

    // 친환경 프로젝트 설치
    installEcoProject: function(projectType: keyof typeof EcoProjects) {
        const project = EcoProjects[projectType];
        this.metrics.installedProjects[projectType.toLowerCase()]++;
        
        // 탄소 배출량 감소 적용
        this.metrics.carbonEmission = Math.max(
            0, 
            this.metrics.carbonEmission - project.carbonReduction
        );
        
        ScriptApp.sayToStaffs(
            `${project.name} 설치 완료! 탄소 배출량 ${project.carbonReduction} 감소`
        );
        
        this.updateDisplays();
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

// 이동 모드 정의
const MovementModes = {
    WALKING: {
        speed: 80,
        title: "🚶🏻 걷기 모드",
        carbonEmission: 0.001  // 걷기 모드시 0.01톤 증가
    },
    RUNNING: {
        speed: 100,
        title: "👟 달리기 모드",
        carbonEmission: 0.02   // 달리기 모드시 0.05톤 증가
    }
};

// 플레이어 관리자
const playerManager = {
    players: {},

    // 플레이어 초기화
    initPlayer: function(player) {
        ScriptApp.sayToStaffs(`플레이어 초기화: ${player.name} (ID: ${player.id})`);
        this.players[player.id] = {
            id: player.id,
            name: player.name,
            mode: MovementModes.WALKING
        };
        
        player.moveSpeed = MovementModes.WALKING.speed;
        player.title = MovementModes.WALKING.title;
        player.sendUpdated();
    },

    // 플레이어 제거
    removePlayer: function(player) {
        ScriptApp.sayToStaffs(`플레이어 제거: ${player.name} (ID: ${player.id})`);
        delete this.players[player.id];
    },

    // 이동 모드 전환
    toggleMovementMode: function(player) {
        const playerData = this.players[player.id];
        if (!playerData) {
            ScriptApp.sayToStaffs(`플레이어 데이터 없음: ${player.name} (ID: ${player.id})`);
            return;
        }

        const newMode = 
            playerData.mode === MovementModes.WALKING 
                ? MovementModes.RUNNING 
                : MovementModes.WALKING;
        
        playerData.mode = newMode;
        player.moveSpeed = newMode.speed;
        player.title = newMode.title;

        player.showCenterLabel(`${newMode.title}로 변경되었습니다!`);
        ScriptApp.sayToStaffs(`이동 모드 변경: ${player.name} (ID: ${player.id}) -> ${newMode.title}`);
        player.sendUpdated();
    }
};

// 사이드바 앱이 터치(클릭)되었을 때 동작하는 함수
ScriptApp.onSidebarTouched.Add(function (p) {
    const widget = p.showWidget("widget.html", "sidebar", 350, 350);
    environmentManager.setWidget(widget);
    p.tag.widget = widget;
});

// 플레이어가 퇴장 할 때 동작하는 함수
ScriptApp.onLeavePlayer.Add(function (p) {
    if (p.tag.widget) {
        p.tag.widget.destroy();
        p.tag.widget = null;
    }
    playerManager.removePlayer(p);
});

// 플레이어 입장시 동작하는 함수
ScriptApp.onJoinPlayer.Add(function(player) {
    ScriptApp.sayToStaffs(`플레이어 참가: ${player.name} (ID: ${player.id})`);
    player.tag = {
        widget: null,
    };
    playerManager.initPlayer(player);
    
    // 환경 지표 위젯 생성
    const widget = player.showWidget("widget.html", "top", 300, 200);
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
});

// 초기화
ScriptApp.onInit.Add(function() {
    environmentManager.initialize();
});