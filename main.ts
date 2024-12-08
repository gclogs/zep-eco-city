/**
 * Copyright (c) 2022 ZEP Co., LTD
 */

import "zep-script";

const STATE_INIT = 3000;
const STATE_READY = 3001;
const STATE_PLAYING = 3002;
const STATE_END = 3003;

let _gameState = STATE_INIT;
let _stateTimer = 0;
let transformCount = 0;
let _answerCount = 0;

// 환경 관리자
const environmentManager = {
    displays: {
        widgets: new Set()  // 모든 플레이어의 위젯을 저장
    },

    metrics: {
        airPollution: 1,
        carbonEmission: 1,
        recyclingRate: 1
    },

    updateTimer: 0, // 업데이트 타이머 추가

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

    // 환경 지표 업데이트
    updateMetrics: function(metrics) {
        // 다른 지표들 업데이트
        if (metrics.airPollution !== undefined) {
            this.metrics.airPollution = metrics.airPollution;
        }
        if (metrics.carbonEmission !== undefined) {
            this.metrics.carbonEmission = Math.round((this.metrics.carbonEmission + metrics.carbonEmission) * 10) / 10;
        }
        if (metrics.recyclingRate !== undefined) {
            this.metrics.recyclingRate = metrics.recyclingRate;
        }

        this.updateDisplays();
    },

    // 주기적인 환경 지표 업데이트
    updateEnvironmentByMovement: function(dt) {
        this.updateTimer += dt;  // 델타 타임 누적
        
        // 1초마다 업데이트
        if (this.updateTimer >= 1000) {
            this.updateTimer = 0;  // 타이머 리셋
            
            // 모든 플레이어의 현재 이동 모드에 따라 환경 지표 업데이트
            for (const playerId in playerManager.players) {
                const playerData = playerManager.players[playerId];
                if (playerData && playerData.mode) {
                    this.updateMetrics({
                        carbonEmission: playerData.mode.carbonEmission
                    });
                }
            }
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
                    recyclingRate: this.metrics.recyclingRate
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
        carbonEmission: 0.01  // 걷기 모드시 0.01톤 증가
    },
    RUNNING: {
        speed: 100,
        title: "👟 달리기 모드",
        carbonEmission: 0.05   // 달리기 모드시 0.05톤 증가
    }
};

// 플레이어 관리자
const playerManager = {
    players: {},

    // 플레이어 초기화
    initPlayer: function(player) {
        this.players[player.id] = {
            mode: MovementModes.WALKING,
            isSound: false
        };
        
        player.moveSpeed = MovementModes.WALKING.speed;
        player.title = MovementModes.WALKING.title;
        player.sendUpdated();
    },

    // 플레이어 제거
    removePlayer: function(player) {
        delete this.players[player.id];
    },

    // 이동 모드 전환
    toggleMovementMode: function(player) {
        const playerData = this.players[player.id];
        if (!playerData) return;

        const newMode = 
            playerData.mode === MovementModes.WALKING 
                ? MovementModes.RUNNING 
                : MovementModes.WALKING;
        
        playerData.mode = newMode;
        player.moveSpeed = newMode.speed;
        player.title = newMode.title;

        player.showCenterLabel(`${newMode.title}로 변경되었습니다!`);
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
    ScriptApp.sayToStaffs(`${player.name}이 맵에 입장 하었습니다.`);
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
});