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
        ScriptApp.getStorage(() => {
            const storage = JSON.parse(ScriptApp.storage);
            if (storage.environmentMetrics) {
                this.metrics = storage.environmentMetrics;
            } else {
                this.metrics = {
                    airPollution: 0,
                    carbonEmission: 0,
                    recyclingRate: 0,
                    lastCarbonThreshold: 0
                };

                storage.environmentMetrics = this.metrics;
                ScriptApp.setStorage(JSON.stringify(storage));
            }
            
            ScriptApp.sayToStaffs(JSON.stringify(storage.environmentMetrics));
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
            const newValue = Number(
                Math.max(
                    0, 
                    Number((this.metrics.carbonEmission + metrics.carbonEmission).toFixed(5))
                ).toFixed(5)
            );

            if (newValue !== this.metrics.carbonEmission) {
                this.metrics.carbonEmission = newValue;
                hasChanges = true;
                
                const currentThreshold = Number((Math.floor(newValue / 0.00001) * 0.00001).toFixed(5));
                if (currentThreshold > this.metrics.lastCarbonThreshold) {
                    const airPollutionFactor = Number((0.00025 + Math.random() * 0.00175).toFixed(5)); // 0.00025 ~ 0.002 사이의 랜덤 값
                    this.metrics.airPollution += airPollutionFactor;
                    this.metrics.lastCarbonThreshold = currentThreshold;
                }
            }
        }
        
        if (metrics.airPollution !== undefined) {
            const newAirPollution = Number(metrics.airPollution.toFixed(5));
            if (newAirPollution !== this.metrics.airPollution) {
                this.metrics.airPollution = newAirPollution;
                hasChanges = true;
            }
        }

        if (metrics.recyclingRate !== undefined) {
            const newRecyclingRate = Number(metrics.recyclingRate.toFixed(5));
            if (newRecyclingRate !== this.metrics.recyclingRate) {
                this.metrics.recyclingRate = newRecyclingRate;
                hasChanges = true;
            }
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
        ScriptApp.getStorage(() => {
            const storage = JSON.parse(ScriptApp.storage);
            storage.environmentMetrics = this.metrics;
            
            ScriptApp.setStorage(JSON.stringify(storage));
        });

        ScriptApp.httpPostJson(`${Config.getApiUrl('environment/metrics')}`, {}, 
            this.metrics, 
            (response: any) => {
            try {
                const savedMetrics = JSON.parse(response);
                ScriptApp.sayToStaffs(`[${savedMetrics}]: 환경 지표 저장 완료`, _COLORS.BLUE);
            } catch (error) {
                ScriptApp.sayToStaffs("환경 지표 저장 중 오류 발생:", _COLORS.RED);
            }
        });
    }
};