import { ScriptPlayer } from "zep-script";
import { COLOR, CONFIG } from "../utils/Config";
import { Script } from "vm";
import { Widget } from "./Widget";

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
    userId: string;
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

// 플레이어 상수
const PLAYER_CONSTANTS = {
    UPDATE_INTERVAL: 1,
    SAVE_INTERVAL: 5,
    WALK_CARBON_EMISSION_FACTOR: 0.0001,
    RUN_CARBON_EMISSION_FACTOR: 0.0007
};

// 이동 모드 상수
const MOVE_MODES = {
    WALK: {
        speed: 80,
        title: "🚶🏻 걷기",
        carbonEmission: PLAYER_CONSTANTS.WALK_CARBON_EMISSION_FACTOR
    },
    RUN: {
        speed: 150,
        title: "🏃🏻 달리기",
        carbonEmission: PLAYER_CONSTANTS.RUN_CARBON_EMISSION_FACTOR
    }
} as const;

// 플레이어 관리자
export const playerManager = {

    updateTimer: 0,
    
    loadPlayer: function(player: ScriptPlayer) {
        ScriptApp.httpGet(`${CONFIG.apiURL('users/')}${player.id}`, {}, (response: any) => {
            const userData = JSON.parse(response);
            if(!userData) {
                this.initializePlayer(player);
                return;
            }

            ScriptApp.getStorage(() => {
                let storage: PlayerStorage = JSON.parse(ScriptApp.storage);
                if(storage.users == undefined) {
                    storage.users = {};
                }

                storage.users[player.id] = userData;

                ScriptApp.setStorage(JSON.stringify(storage));
                ScriptApp.sayToStaffs(`[${player.id}]: ${player.name} 플레이어 로드 완료`);
            });
        });
    },

    scheduleUpdatePlayerWidget: function(dt: number, player: ScriptPlayer) {
        this.updateTimer += dt;
        
        if (this.updateTimer >= PLAYER_CONSTANTS.UPDATE_INTERVAL) {
            this.updateTimer = 0;
            this.updatePlayerWidget(player);
        }
        
        this.updatePlayerWidget(player);
    },

    // 플레이어 Widget 업데이트
    updatePlayerWidget: function(player: ScriptPlayer) {
        ScriptApp.getStorage(() => {
            const storage = JSON.parse(ScriptApp.storage);
            const users = storage.users;
            if(!users) return;

            const metricsOptions = {
                type: "update_player",
                data: {
                    name: users[player.id].name,
                    money: users[player.id].money,
                    kills: users[player.id].kills
                }
            };
            
            const widget = new Widget();
            widget.updateWidget("playerWidget", metricsOptions);
        });
    },

    initializePlayer: function(player: ScriptPlayer) {
        if (player.name.includes("GUEST")) {
            player.sendMessage("게스트는 게임에 데이터가 저장이 되지 않습니다!", COLOR.RED);
            return;
        }

        ScriptApp.getStorage(() => {
            let storage: PlayerStorage = JSON.parse(ScriptApp.storage);
            if(storage.users == undefined) {
                storage.users = {};
            }

            for (const playerId in storage.users) {
                if (storage.users[playerId].userId === player.id) return;
            }

            storage.users[player.id] = {
                userId: player.id,
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
            }
    
            ScriptApp.setStorage(JSON.stringify(storage));
            ScriptApp.sayToStaffs(`[${player.id}]: ${player.name} 플레이어 생성 완료`);
        });
    },

    // 플레이어 제거
    removePlayer: function(player: ScriptPlayer) {
        ScriptApp.getStorage(() => {
            const storage: PlayerStorage = JSON.parse(ScriptApp.storage);
            if(storage.users[player.id] === undefined) return;
            
            delete storage.users[player.id];
    
            ScriptApp.setStorage(JSON.stringify(storage));
            ScriptApp.sayToStaffs(JSON.stringify(storage));
            ScriptApp.sayToStaffs(`[${player.id}]: ${player.name} 플레이어 데이터 제거 완료`);
        });
    },

    // 돈 관련 함수들
    addMoney: function(player: ScriptPlayer, amount: number) {
        ScriptApp.httpPostJson(`${CONFIG.apiURL('users/money/add')}`, 
            {},
            {
                userId: player.id,
                amount: amount
            },
            /**
             * 플레이어의 돈을 추가할 때 실행되는 콜백 함수
             * @param {any} response - 서버에서 응답한 데이터
             */
            (response: any) => {
                try {
                    const userData = JSON.parse(response);
                    const storage = JSON.parse(ScriptApp.storage);
                    storage[player.id] = userData;

                    ScriptApp.setStorage(JSON.stringify(storage));
                    ScriptApp.sayToStaffs(`[${player.id}]: ${player.name} 플레이어 ${amount}만큼 돈 추가 완료`, COLOR.BLUE);

                    player.sendMessage(`${player.name} 플레이어 ${amount}만큼 돈이 들어왔습니다!`, COLOR.BLUE);
                } catch (error) {
                    ScriptApp.sayToStaffs(`돈 추가중 오류 발생!`, COLOR.RED);
                }
            }
        );
    },

    subtractMoney: function(player: ScriptPlayer, amount: number) {
        ScriptApp.httpPostJson(`${CONFIG.apiURL('users/money/subtract')}`, 
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
                    ScriptApp.sayToStaffs(`[${player.id}]: ${player.name} 플레이어 ${amount}만큼 돈 차감 완료`, COLOR.BLUE);

                    player.sendMessage(`${player.name} 플레이어 ${amount}만큼 돈이 차감되었습니다!`, COLOR.BLUE);
                } catch (error) {
                    ScriptApp.sayToStaffs(`돈 차감중 오류 발생!`, COLOR.RED);
                }
            }
        );
    },

    // 이동 모드 전환
    toggleMovementMode: function(player: ScriptPlayer) {
        ScriptApp.getStorage(() => {
            const storage: PlayerStorage = JSON.parse(ScriptApp.storage);
            
            const newMode = storage.users[player.id].moveMode.current === 'WALK' ? 'RUN' : 'WALK';
            
            storage.users[player.id].moveMode.current = newMode;
            ScriptApp.setStorage(JSON.stringify(storage));

            player.moveSpeed = storage.users[player.id].moveMode[newMode].speed;
            player.title = storage.users[player.id].moveMode[newMode].title;
            player.sendUpdated();
        });
    },

    syncWithPlayerDB: function(player: ScriptPlayer) {
        ScriptApp.getStorage(() => {
            const storage: PlayerStorage = JSON.parse(ScriptApp.storage);
            const userData = storage.users[player.id];

            const reuquestData: PlayerStats = {
                userId: userData.userId,
                name: userData.name,
                money: userData.money,
                moveMode: userData.moveMode,
                kills: userData.kills
            }

            ScriptApp.httpPostJson(`${CONFIG.apiURL('users/')}`, 
                {},
                reuquestData,
                (response: any) => {
                    ScriptApp.sayToStaffs(`${player.name} 플레이어 데이터 저장 완료`);
                    this.removePlayer(player);
                });
        });

    }
};