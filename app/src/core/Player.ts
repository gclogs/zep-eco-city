import { Script } from "vm";
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
    
    // 플레이어 초기화
    initPlayer: function(player: ScriptPlayer) {
        if (player.name.includes("GUEST")) {
            player.sendMessage("게스트는 게임에 참여할 수 없고, 구경만 가능합니다.")
        };

        ScriptApp.httpPostJson(`http://220.87.215.3:3000/api/users/`, {},
            {
                userId: player.id,
                name: player.name
            },
            (response: any) => {
                try {
                    const userData = JSON.parse(response)
                    ScriptApp.setStorage(JSON.stringify({ [player.id]: userData }));
                } catch (error) {
                    ScriptApp.sayToStaffs(`플레이어 데이터 로드 중 오류 발생 재접속 부탁드립니다.`, _COLORS.RED);
                }
            }
        );
    },

    // 플레이어 제거
    removePlayer: function(player: ScriptPlayer) {
        ScriptApp.httpPostJson(`http://220.87.215.3:3000/api/users/delete`, 
            {},
            {
                userId: player.id
            },
            () => {
                try {
                    ScriptApp.setStorage(JSON.stringify({ [player.id]: null }));
                    ScriptApp.sayToStaffs(`[${player.id}]: ${player.name} 플레이어 데이터 제거 완료`);
                } catch (error) {
                    ScriptApp.sayToStaffs(`플레이어 데이터 삭제중 오류 발생!`, _COLORS.RED);
                }
            }
        );
    },

    // 돈 관련 함수들
    addMoney: function(player: ScriptPlayer, amount: number) {
        ScriptApp.httpPostJson(`http://220.87.215.3:3000/api/users/money/add`, 
            {},
            {
                userId: player.id,
                amount: amount
            },
            (response: any) => {
                try {
                    const userData = JSON.parse(response);
                    ScriptApp.setStorage(JSON.stringify({ [player.id]: userData }));
                    ScriptApp.sayToStaffs(`[${player.id}]: ${player.name} 플레이어 ${amount}만큼 돈 추가 완료`, _COLORS.BLUE);

                    player.sendMessage(`${player.name} 플레이어 ${amount}만큼 돈이 들어왔습니다!`, _COLORS.BLUE);
                } catch (error) {
                    ScriptApp.sayToStaffs(`돈 추가중 오류 발생!`, _COLORS.RED);
                }
            }
        );
    },

    subtractMoney: function(player: ScriptPlayer, amount: number) {
        ScriptApp.httpPostJson(`http://220.87.215.3:3000/api/users/money/subtract`, 
            {},
            {
                userId: player.id,
                amount: amount
            },
            (response: any) => {
                try {
                    const userData = JSON.parse(response);
                    ScriptApp.setStorage(JSON.stringify({ [player.id]: userData }));
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
        ScriptApp.httpGet(`http://220.87.215.3:3000/api/users/${player.id}`, {}, (response: any) => {
            const userData = JSON.parse(response);
            const currentMode = userData.moveMode.current === 'WALK' ? 'RUN' : 'WALK';
            try {
                ScriptApp.httpPostJson(`http://220.87.215.3:3000/api/users/moveMode/toggle`, 
                    {},
                    {
                        userId: player.id,
                        moveMode: {
                            current: currentMode
                        }
                    },
                    (response: any) => {
                        const userData = JSON.parse(response);
                        ScriptApp.setStorage(JSON.stringify({ [player.id]: userData }));
                        ScriptApp.sayToStaffs(`[${player.id}]: ${player.name} 플레이어 이동 모드 전환 완료`, _COLORS.DARK_GREEN);
                        
                        player.moveSpeed = userData.moveMode[currentMode].speed;
                        player.title = userData.moveMode[currentMode].title;
                        player.sendUpdated();
                    }
                );

            } catch (error) {
                ScriptApp.sayToStaffs(`이동 모드 전환중 오류 발생!`, _COLORS.RED);
            }
        });

    }
};