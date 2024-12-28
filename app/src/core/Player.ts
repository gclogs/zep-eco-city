import { _COLORS } from "../utils/Color";
import { ScriptPlayer } from "zep-script";

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

// 이동 모드 상수
const _MOVE_MODES = {
    WALK: {
        speed: 80,
        title: "🚶🏻 걷기",
        carbonEmission: 0.0001
    },
    RUN: {
        speed: 150,
        title: "🏃🏻 달리기",
        carbonEmission: 0.0007
    }
} as const;

// 플레이어 관리자
export const playerManager = {
    players: {} as Record<string, PlayerStats>,

    // 플레이어 초기화
    initPlayer: function(player: ScriptPlayer) {
        if (this.players[player.id]) return;
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
                        WALK: { ..._MOVE_MODES.WALK },
                        RUN: { ..._MOVE_MODES.RUN },
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
                ScriptApp.httpPostJson(`http://211.105.236.55:8080/api/players/create`, {}, storage.user, (response: string) => {
                    ScriptApp.sayToStaffs(`${response}`);
                });
            } catch (error) {
                ScriptApp.sayToStaffs(`${error} 플레이어 데이터 초기화 중 오류 발생:`, _COLORS.RED);
                this.initializeDefaultPlayer(player);
            }
        });
    },

    // 기본 플레이어 초기화 (에러 발생 시 사용)
    initializeDefaultPlayer: function(player: ScriptPlayer) {
        this.players[player.id] = {
            id: player.id,
            name: player.name,
            money: 0,
            moveMode: {
                WALK: { ..._MOVE_MODES.WALK },
                RUN: { ..._MOVE_MODES.RUN },
                current: 'WALK'
            },
            kills: 0,
            quizCorrects: 0
        };
        this.updatePlayerMoveStats(player);
    },

    // 플레이어 이동 속성 업데이트
    updatePlayerMoveStats: function(player: ScriptPlayer) {
        if (!this.players[player.id]) return;

        this.players[player.id].moveMode.WALK = { ..._MOVE_MODES.WALK };
        this.players[player.id].moveMode.RUN = { ..._MOVE_MODES.RUN };
        this.savePlayerData(player.id);

        ScriptApp.sayToStaffs(`플레이어 이동 속성 업데이트: ${player.name} (ID: ${player.id})`);
    },

    // 플레이어 제거
    removePlayer: function(player: ScriptPlayer) {
        delete this.players[player.id];
        ScriptApp.sayToStaffs(`플레이어 제거: ${player.name} (ID: ${player.id})`);
        ScriptApp.getStorage((storageStr: string) => {
            try {
                const storage: PlayerStorageData = storageStr ? JSON.parse(storageStr) : {};
                if (storage.user?.id === player.id) {
                    storage.user = undefined;
                    ScriptApp.setStorage(JSON.stringify(storage));
                    ScriptApp.sayToStaffs(`플레이어 데이터 삭제: ${player.name} (ID: ${player.id})`);
                }
            } catch (error) {
                ScriptApp.sayToStaffs(`${error} 플레이어 데이터 제거 중 오류 발생:`, _COLORS.RED);
            }
        });
    },

    // 돈 관련 함수들
    addMoney: function(player: ScriptPlayer, amount: number) {
        if (!this.players[player.id]) {
            this.initPlayer(player);
            return 0;
        }
        this.players[player.id].money = Math.round((this.players[player.id].money + amount) * 100) / 100;
        this.savePlayerData(player.id);
        return this.players[player.id].money;
    },

    subtractMoney: function(player: ScriptPlayer, amount: number) {
        if (!this.players[player.id]) {
            this.initPlayer(player);
            return 0;
        }
        this.players[player.id].money = Math.round((this.players[player.id].money - amount) * 100) / 100;
        this.savePlayerData(player.id);
        return this.players[player.id].money;
    },

    // 플레이어 데이터 저장
    savePlayerData: function(playerId: string) {
        ScriptApp.getStorage((storageStr: string) => {
            try {
                const storage: PlayerStorageData = storageStr ? JSON.parse(storageStr) : {};
                storage.user = this.players[playerId];
                ScriptApp.setStorage(JSON.stringify(storage));
            } catch (error) {
                ScriptApp.sayToStaffs(`${error} 플레이어 데이터 저장 중 오류 발생:`, _COLORS.RED);
            }
        });
    },

    // 이동 모드 전환
    toggleMovementMode: function(player: ScriptPlayer) {
        const playerData = this.players[player.id];
        if (!playerData) {
            ScriptApp.sayToStaffs(`플레이어 데이터 없음: ${player.name} (ID: ${player.id})`);
            return;
        }

        // 현재 모드 전환
        playerData.moveMode.current = playerData.moveMode.current === 'WALK' ? 'RUN' : 'WALK';
        const newMode = playerData.moveMode[playerData.moveMode.current];
        
        player.moveSpeed = newMode.speed;
        player.title = newMode.title;
        player.sendUpdated();
        
        this.savePlayerData(player.id);
    }
};