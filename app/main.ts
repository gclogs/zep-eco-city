import { ScriptPlayer } from "zep-script";
import { playerManager } from "./src/core/Player";
import { _COLORS } from "./src/utils/Color";
import { environmentManager } from "./src/core/Environment";

const STATE_INIT = 3000;
const STATE_READY = 3001;
const STATE_PLAYING = 3002;
const STATE_END = 3003;

let _gameState = STATE_INIT;
let _stateTimer = 0;
let _transformCount = 0;
let _answerCount = 0;

// ScriptApp.onUpdate.Add((dt: number) => {
//     environmentManager.updateEnvironmentByMovement(dt);
//     environmentManager.saveMetrics(dt);
// });


// R키를 눌렀을 때 이동 모드 전환
ScriptApp.addOnKeyDown(82, function (player) { playerManager.toggleMovementMode(player); });

ScriptApp.onSidebarTouched.Add((player: ScriptPlayer) => {
    const widget = player.showWidget("widget.html", "sidebar", 350, 350);
    environmentManager.setWidget(widget);
    player.tag.widget = widget;
});

ScriptApp.onLeavePlayer.Add((player: ScriptPlayer) => {
    ScriptApp.onLeavePlayer.Add(() => {
        if (player.tag.widget) {
            player.tag.widget.destroy();
            player.tag.widget = null;
        }

        playerManager.savePlayerToDB(player);
    });
})

ScriptApp.onJoinPlayer.Add((player: ScriptPlayer) => {
    player.tag = {
        widget: null,
    };
    
    playerManager.initializePlayer(player);

    // 환경 지표 위젯 생성
    const widget = player.showWidget("widget.html", "topleft", 300, 150);
    if (widget) {
        environmentManager.setWidget(widget);
        ScriptApp.sayToAll(`[시스템] ${player.name}님이 입장하셨습니다.`);
    } else {
        ScriptApp.sayToStaffs(`[오류] ${player.name}님의 위젯 생성 실패`);
    }
});
