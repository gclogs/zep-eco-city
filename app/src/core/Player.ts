import { _COLORS } from "../utils/Color";
import { ScriptPlayer } from "zep-script";
import { Config } from "../../src/utils/Config";

// 이동 모드 설정 인터페이스
interface MoveMode {
    speed: number;
    title: string;
    carbonEmission: number;
}

// 이동 모드 타입 정의
type MoveModeType = 'WALK' | 'RUN';

// 플레이어 이동 상태 인터페이스
interface PlayerMoveState {
    WALK: MoveMode;
    RUN: MoveMode;
    current: MoveModeType;
}

// 플레이어 기본 정보 인터페이스
interface PlayerStats {
    id: string;
    name: string;
    money: number;
    moveMode: PlayerMoveState;
    kills: number;
}

// 스토리지 타입 정의
interface PlayerStorage {
    users: {
        [playerId: string]: PlayerStats;
    }
}

// 이동 모드 상수
const MOVE_MODES = {
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
    
    // 플레이어 초기화
    loadPlayer: function(player: ScriptPlayer) {
        ScriptApp.sayToAll(ScriptApp.storage, _COLORS.BLUE);
        ScriptApp.getStorage(() => {
            const storage = JSON.parse(ScriptApp.storage) || { users: {} };
            ScriptApp.sayToAll(ScriptApp.storage, _COLORS.RED);

            if (!storage.users) {
                storage.users = {};
            }

            if (!storage.users[player.id]) {
                this.initializePlayer(player);
            }
        });

    },

    initializePlayer: function(player: ScriptPlayer) {
        if (player.name.includes("GUEST")) {
            player.sendMessage("게스트는 게임에 데이터가 저장이 되지 않습니다!", _COLORS.RED);
            return;
        };

        const storage: PlayerStorage = JSON.parse(ScriptApp.storage);
        storage.users[player.id] = {
            id: player.id,
            name: player.name,
            money: 0,
            moveMode: {
                WALK: {
                    ...MOVE_MODES.WALK
                },
                RUN: {
                    ...MOVE_MODES.RUN
                },
                current: 'WALK'
            },
            kills: 0
        };

        ScriptApp.setStorage(JSON.stringify(storage));
        ScriptApp.sayToStaffs(`[${player.id}]: ${player.name} 플레이어 생성 완료`);
    },

    // 플레이어 제거
    removePlayer: function(player: ScriptPlayer) {
        const storage: PlayerStorage = JSON.parse(ScriptApp.storage);
        delete storage.users[player.id];

        ScriptApp.setStorage(JSON.stringify(storage));
        ScriptApp.sayToStaffs(`[${player.id}]: ${player.name} 플레이어 데이터 제거 완료`);
    },

    // 돈 관련 함수들
    addMoney: function(player: ScriptPlayer, amount: number) {
        ScriptApp.httpPostJson(`${Config.getApiUrl('users/money/add')}`, 
            {},
            {
                userId: player.id,
                amount: amount
            },
            (response: any) => {
                try {
                    const userData = JSON.parse(response);
                    const storage = JSON.parse(ScriptApp.storage);
                    storage[player.id] = userData;

                    ScriptApp.setStorage(JSON.stringify(storage));
                    ScriptApp.sayToStaffs(`[${player.id}]: ${player.name} 플레이어 ${amount}만큼 돈 추가 완료`, _COLORS.BLUE);

                    player.sendMessage(`${player.name} 플레이어 ${amount}만큼 돈이 들어왔습니다!`, _COLORS.BLUE);
                } catch (error) {
                    ScriptApp.sayToStaffs(`돈 추가중 오류 발생!`, _COLORS.RED);
                }
            }
        );
    },

    subtractMoney: function(player: ScriptPlayer, amount: number) {
        ScriptApp.httpPostJson(`${Config.getApiUrl('users/money/subtract')}`, 
            {},
            {
                userId: player.id,
                amount: amount
            },
            (response: any) => {
                try {
                    const userData = JSON.parse(response);
                    const storage = JSON.parse(ScriptApp.storage);
                    storage[player.id] = userData;

                    ScriptApp.setStorage(JSON.stringify(storage));
                    ScriptApp.sayToStaffs(`[${player.id}]: ${player.name} 플레이어 ${amount}만큼 돈 차감 완료`, _COLORS.BLUE);

                    player.sendMessage(`${player.name} 플레이어 ${amount}만큼 돈이 차감되었습니다!`, _COLORS.BLUE);
                } catch (error) {
                    ScriptApp.sayToStaffs(`돈 차감중 오류 발생!`, _COLORS.RED);
                }
            }
        );
    },

    // 이동 모드 전환
    toggleMovementMode: function(player: ScriptPlayer) {
        ScriptApp.getStorage(() => {
            const storage = JSON.parse(ScriptApp.storage);
            const userData = storage[player.id];
            const currentMode = userData.moveMode.current;

            storage[player.id] = userData;
            userData.moveMode.current = userData.moveMode.current === 'WALK' ? 'RUN' : 'WALK';
            ScriptApp.setStorage(JSON.stringify(storage));
            ScriptApp.sayToStaffs(`[${player.id}]: ${player.name} 플레이어 이동 모드 전환 완료`, _COLORS.DARK_GREEN);
            
            player.moveSpeed = userData.moveMode[currentMode].speed;
            player.title = userData.moveMode[currentMode].title;
            player.sendUpdated();

        });
    },

    savePlayerToDB: function(player: ScriptPlayer) {
        const storage: PlayerStorage = JSON.parse(ScriptApp.storage);

        ScriptApp.httpPostJson(`${Config.getApiUrl('users/')}`, 
            {},
            {
                storage
            },
            (response: any) => {
                this.removePlayer(player);
                ScriptApp.sayToStaffs(`${player.name} 플레이어 데이터 저장 완료`);
            });
    }

};