// 환경 지표 인터페이스 정의

import { Config } from "../../src/utils/Config";
import { _COLORS } from "../utils/Color";
import { playerManager } from "./Player";
import { ScriptPlayer, ScriptWidget } from "zep-script";

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
interface EnvironmentStorageData {
    /** 저장된 환경 지표 데이터 */
    environmentMetrics?: EnvironmentMetrics;
}

// 환경 관리자
export const environmentManager = {
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
        ScriptApp.httpGet(`${Config.getApiUrl('environment/metrics')}`, {}, (response: any) => {
            try {
                const metrics = JSON.parse(response);
                this.metrics = metrics;
                this.updateDisplays();
            } catch (error) {
                ScriptApp.sayToStaffs("환경 지표 로드 중 오류 발생:", _COLORS.RED);
            }
        });
    },

    // 최적화된 저장 함수
    saveMetrics: function(dt: number) {
        this.saveTimer += dt;
        
        if (this.saveTimer >= this.SAVE_INTERVAL) {
            this.saveTimer = 0;
            
            ScriptApp.getStorage(() => {
                    const storage: EnvironmentStorageData = {};
                    const metricsToSave: EnvironmentMetrics = {
                        airPollution: Math.round(this.metrics.airPollution * 100) / 100,
                        carbonEmission: Math.round(this.metrics.carbonEmission * 100) / 100,
                        recyclingRate: Math.round(this.metrics.recyclingRate * 100) / 100,
                        lastCarbonThreshold: this.metrics.lastCarbonThreshold
                    };
                    
                    storage.environmentMetrics = metricsToSave;
                    ScriptApp.setStorage(JSON.stringify(storage));
                    ScriptApp.sayToAll(`${JSON.stringify(storage)}`, _COLORS.BLUE);
            });
        }
    },

    // 위젯 설정
    setWidget: function(widget: ScriptWidget) {
        this.displays.widgets.add(widget);
        this.updateDisplays();
        
        // 위젯 메시지 이벤트 핸들러 설정
        widget.onMessage.Add((player: ScriptPlayer, data: any) => {
            if (data.type === "close") {
                this.displays.widgets.delete(widget);
                widget.destroy();
            }
        });
    },

    // 주기적인 환경 지표 업데이트
    updateEnvironmentByMovement: function(dt: number) {
        this.updateTimer += dt;
        
        // dt가 0.02초이므로, (0.02ms × 50 = 1s)
        if (this.updateTimer >= 1) {
            this.updateTimer = 0;

            ScriptApp.getStorage(() => {
                const storage = JSON.parse(ScriptApp.storage);
                const users = storage.users;

                for (const playerId in users) {
                    const currentMode = users[playerId].moveMode[users[playerId].moveMode.current];
                    this.updateMetrics({
                        carbonEmission: currentMode.carbonEmission
                    });
                }

                if (storage.environmentMetrics) {
                    this.updateMetrics(storage.environmentMetrics);
                }
            });
        }
    },

    // 환경 지표 업데이트
    updateMetrics: function(metrics: Partial<EnvironmentMetrics>) {
        let hasChanges = false;
        
        if (metrics.carbonEmission !== undefined) {
            // const randomFactor = 0.25 + Math.random() * 1.0; // 0.25 ~ 1.25 사이의 랜덤 값
            const newValue = Math.max(
                0, 
                this.metrics.carbonEmission + metrics.carbonEmission
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
        ScriptApp.getStorage((response: any) => {
            const storage = JSON.parse(response);
            const updateMetrics = storage.environmentMetrics;

            ScriptApp.httpPostJson(`${Config.getApiUrl('environment/metrics')}`, {}, 
                updateMetrics, (response: any) => {
                try {
                    const savedMetrics = JSON.parse(response);
                    this.metrics = savedMetrics;
                } catch (error) {
                    ScriptApp.sayToStaffs("환경 지표 저장 중 오류 발생:", _COLORS.RED);
                }
            })
        });
    }
};