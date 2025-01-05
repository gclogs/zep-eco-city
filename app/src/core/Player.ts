import { _COLORS } from "../utils/Color";
import { ScriptPlayer } from "zep-script";
import { Config } from "../utils/Config";
import { Script } from "vm";

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
        ScriptApp.httpGet(`${Config.getApiUrl('users/')}`, {}, (response: any) => {
            const userData = JSON.parse(response);
            const storage: PlayerStorage = JSON.parse(ScriptApp.storage);
            storage.users[player.id] = userData;

            ScriptApp.setStorage(JSON.stringify(storage));
            ScriptApp.sayToStaffs(`[${player.id}]: ${player.name} 플레이어 로드 완료`);
        });
    },

    initializePlayer: function(player: ScriptPlayer) {
        if (player.name.includes("GUEST")) {
            player.sendMessage("게스트는 게임에 데이터가 저장이 되지 않습니다!", _COLORS.RED);
            return;
        }

        ScriptApp.getStorage(() => {
            let storage: PlayerStorage = JSON.parse(ScriptApp.storage);
            if(storage.users === undefined) {
                storage = {
                    users: {}
                };
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
            };
    
            ScriptApp.setStorage(JSON.stringify(storage));
            player.sendMessage(`[${player.id}]: ${player.name} 플레이어 생성 완료`);
        });
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
            const storage: PlayerStorage = JSON.parse(ScriptApp.storage);
            const currentMode = storage.users[player.id].moveMode.current;

            storage.users[player.id].moveMode.current = storage.users[player.id].moveMode.current === 'WALK' ? 'RUN' : 'WALK';

            player.moveSpeed = storage.users[player.id].moveMode[currentMode].speed;
            player.title = storage.users[player.id].moveMode[currentMode].title;
            player.sendUpdated();
        });
    },

    savePlayerToDB: function(player: ScriptPlayer) {
        const storage: PlayerStorage = JSON.parse(ScriptApp.storage);
        const userData = storage.users[player.id];

        const reuquestData: PlayerStats = {
            userId: userData.userId,
            name: userData.name,
            money: userData.money,
            moveMode: userData.moveMode,
            kills: userData.kills
        }

        ScriptApp.httpPostJson(`${Config.getApiUrl('users/')}`, 
            {},
            reuquestData,
            (response: any) => {
                const userData: PlayerStats = JSON.parse(response);
                ScriptApp.sayToStaffs(userData.userId);
                ScriptApp.sayToStaffs(`${player.name} 플레이어 데이터 저장 완료`);
                
                this.removePlayer(player);
            });
    },
    
    saveAllPlayersToDB: function() {
        const BATCH_SIZE = 10;
        const INTERVAL = 150;

        ScriptApp.getStorage(() => {
            const storage: PlayerStorage = JSON.parse(ScriptApp.storage);
            const playerIdList = Object.keys(storage.users);
            let saveCount = 0;
            let errorCount = 0;

            const processBatch = (startIndex: number) => {
                const endIndex = Math.min(startIndex + BATCH_SIZE, playerIdList.length);
                const currentBatch = playerIdList.slice(startIndex, endIndex);
                
                currentBatch.forEach((playerId: string) => {
                    const userData = storage.users[playerId];

                    ScriptApp.httpPostJson(`${Config.getApiUrl('users/')}`, 
                        {},
                        userData,
                        (response: any) => { 
                            try {
                                const savedData: PlayerStats = JSON.parse(response);
                                ScriptApp.sayToStaffs(`${savedData.userId} 플레이어 데이터 저장 완료`);
                                saveCount++;
                            } catch (error) {
                                ScriptApp.sayToStaffs(`[${playerId}]: 플레이어 데이터 저장 중 오류 발생!`, _COLORS.RED);
                                errorCount++;
                            }
                        });

                        if(endIndex < playerIdList.length) {
                            setTimeout(() => {
                                processBatch(endIndex);
                            }, INTERVAL);
                        } else {
                            ScriptApp.sayToStaffs(`전체 저장 완료 (성공: ${saveCount}, 실패: ${errorCount})`);
                        }

                        processBatch(0);
                });
            }
        });
    }
};