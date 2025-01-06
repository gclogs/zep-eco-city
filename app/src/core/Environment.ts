// 환경 지표 인터페이스 정의

import { Config } from "../../src/utils/Config";
import { playerManager } from "./Player";
import { ColorType, ScriptPlayer, ScriptWidget } from "zep-script";

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
}
/**
 * 게임 내 환경 지표의 상태를 관리하기 위한 인터페이스
 */
interface EnvironmentState {
    /** 전체 탄소 배출량 (단위: 톤) */
    totalCarbonEmission: number;
    /** 마지막으로 체크한 탄소 배출량 임계값 (공기 오염도 증가 트리거) */
    lastCarbonEmission: number;
}

// 상수 정의
const ENVIRONMENT_CONSTANTS = {
    SAVE_INTERVAL: 500,
    UPDATE_INTERVAL: 1,
    MIN_RANDOM_FACTOR: 0.00002,
    MAX_RANDOM_FACTOR: 0.00005
} as const;

// 메시지 타입 정의
interface WidgetMessage {
    type: 'close' | 'update_metrics';
    data?: {
        airPollution: number;
        carbonEmission: number;
        recyclingRate: number;
    };
}

// 환경 관리자
export const environmentManager = {
    displays: {
        widgets: new Set<ScriptWidget>()
    },

    metrics: {
        airPollution: 0,
        carbonEmission: 0,
        recyclingRate: 0,
    } as EnvironmentMetrics,
    
    state: {
        totalCarbonEmission: 0,
        lastCarbonEmission: 0
    } as EnvironmentState,

    updateTimer: 0,
    saveTimer: 0,

    // 초기화 시 저장된 데이터 로드
    initialize: function() {
        ScriptApp.httpGet(`${Config.getApiUrl('environment/')}`, {}, (response: string) => {
            try {
                const savedMetrics: EnvironmentMetrics = JSON.parse(response);
                this.metrics = savedMetrics;
                ScriptApp.sayToStaffs(`환경 지표 로드 완료: ${this.metrics}`);
            } catch (error: unknown) {
                if (error instanceof Error) {
                    ScriptApp.sayToStaffs(`환경 지표 로드 중 오류 발생: ${error.message}`, ColorType.RED);
                }
                this.loadFromAppStorage();
            }
        });  
    },

    // 스페이스(App) 스토리지에서 데이터 로드
    loadFromAppStorage: function() {
        ScriptApp.getStorage(() => {
            const storage = JSON.parse(ScriptApp.storage);
            if (storage.environmentMetrics) {
                this.metrics = storage.environmentMetrics;
            } else {
                this.metrics = {
                    airPollution: 0,
                    carbonEmission: 0,
                    recyclingRate: 0
                };
        
                if (storage) {
                    storage.environmentMetrics = this.metrics;
                    ScriptApp.setStorage(JSON.stringify(storage));
                }
            }
        });
    },

    // 주기적인 저장 스케줄링
    scheduleSaveEnvironment: function(dt: number) {
        this.saveTimer += dt;
        
        if (this.saveTimer >= ENVIRONMENT_CONSTANTS.SAVE_INTERVAL) {
            this.saveTimer = 0;
            this.saveEnvironment();
        }
    },

    // 위젯 설정
    setWidget: function(widget: ScriptWidget) {
        this.displays.widgets.add(widget);
        this.updateDisplays();
        
        // 위젯 메시지 이벤트 핸들러 설정
        widget.onMessage.Add((player: ScriptPlayer, message: WidgetMessage) => {
            if (message.type === "close") {
                this.displays.widgets.delete(widget);
                widget.destroy();
            }
        });
    },

    // 주기적인 환경 지표 업데이트
    scheduleUpdateEnvironmentByMovement: function(dt: number) {
        this.updateTimer += dt;
        
        // dt가 0.02초이므로, (0.02ms × 50 = 1s)
        if (this.updateTimer >= ENVIRONMENT_CONSTANTS.UPDATE_INTERVAL) {
            this.updateTimer = 0;

            ScriptApp.getStorage(() => {
                const storage = JSON.parse(ScriptApp.storage);
                const users = storage.users;


                for (const playerId in users) {
                    const currentMode = users[playerId].moveMode[users[playerId].moveMode.current];
                    this.state.totalCarbonEmission += currentMode.carbonEmission;
                }
            });
            
            this.processCarbonEmissionUpdate({
                carbonEmission: this.state.totalCarbonEmission
            });
        }
    },

    // 탄소 배출량 업데이트 처리
    processCarbonEmissionUpdate: function(metrics: Partial<EnvironmentMetrics>) {
        if (metrics.carbonEmission === undefined) {
            ScriptApp.sayToStaffs("탄소 배출량 데이터가 없습니다.", ColorType.RED);
            return;
        }

        const newEmission = this.calculateNewCarbonEmission(metrics.carbonEmission);
        this.processAirPollutionUpdate(this.metrics.carbonEmission);
        
        ScriptApp.sayToStaffs(`환경 지표 업데이트: 탄소배출량 ${this.metrics.carbonEmission.toFixed(5)}`);
        this.updateDisplays();
    },

    // 새로운 탄소 배출량 계산
    calculateNewCarbonEmission: function(currentEmission: number): number {
        const randomFactor = ENVIRONMENT_CONSTANTS.MIN_RANDOM_FACTOR + 
            Math.random() * (ENVIRONMENT_CONSTANTS.MAX_RANDOM_FACTOR - ENVIRONMENT_CONSTANTS.MIN_RANDOM_FACTOR);
        
        const totalEmission = Number((currentEmission + randomFactor).toFixed(6));
        
        this.metrics.carbonEmission += Number(Math.max(0, totalEmission).toFixed(6));
        return this.metrics.carbonEmission;
    },

    // 공기 오염도 업데이트 처리
    processAirPollutionUpdate: function(carbonEmission: number) {
        if (carbonEmission < 0) return;
        
        const pollutionIncrement = Math.floor(carbonEmission / 10) - Math.floor(this.state.lastCarbonEmission / 10);
        if (pollutionIncrement > 0) {
            this.metrics.airPollution += pollutionIncrement;
        }

        this.state.lastCarbonEmission = carbonEmission;
    },

    // 디스플레이 업데이트
    updateDisplays: function() {
        Array.from(this.displays.widgets).forEach((widget: any) => {
            widget.sendMessage({
                type: "update_metrics",
                data: {
                    airPollution: this.metrics.airPollution,
                    carbonEmission: this.metrics.carbonEmission,
                    recyclingRate: this.metrics.recyclingRate,
                }
            });
        });
    },

    saveEnvironment: function() {
        ScriptApp.getStorage(() => {
            const storage = JSON.parse(ScriptApp.storage);
            storage.environmentMetrics = this.metrics;
            
            ScriptApp.setStorage(JSON.stringify(storage));
        });
    },

    syncWithEnvironmentDB: function() {
        ScriptApp.httpPostJson(`${Config.getApiUrl('environment/metrics')}`, {}, 
            this.metrics,
            (response: any) => {
            try {
                const savedMetrics = JSON.parse(response);
                ScriptApp.sayToStaffs(`[${savedMetrics}]: 환경 지표 저장 완료`, ColorType.BLUE);
            } catch (error) {
                ScriptApp.sayToStaffs("환경 지표 저장 중 오류 발생:", ColorType.RED);
            }
        });
    }
};