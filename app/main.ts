import { ScriptPlayer } from "zep-script";
import { PlayerJoinEvent } from "./src/events/PlayerJoinEvent";
import { PlayerQuitEvent } from "./src/events/PlayerQuitEvent";
import { playerManager } from "./src/core/Player";
import { _COLORS } from "./src/utils/Color";
import { PlayerTouchedSidebarEvent } from "./src/events/PlayerTouchedSidebarEvent";
import { Command } from "./src/events/Command";
import { environmentManager } from "./src/core/Environment";

const STATE_INIT = 3000;
const STATE_READY = 3001;
const STATE_PLAYING = 3002;
const STATE_END = 3003;

let _gameState = STATE_INIT;
let _stateTimer = 0;
let _transformCount = 0;
let _answerCount = 0;

// 사이드바 앱이 터치(클릭)되었을 때 동작하는 함수
ScriptApp.onSidebarTouched.Add((player: ScriptPlayer) => {new PlayerTouchedSidebarEvent(player);});
ScriptApp.onSay.Add((player: ScriptPlayer, text: string) => {new Command(player, text);});

ScriptApp.onUpdate.Add((dt: number) => {
    environmentManager.updateEnvironmentByMovement(dt);
    environmentManager.saveMetrics(dt);
});

// R키를 눌렀을 때 이동 모드 전환
ScriptApp.addOnKeyDown(82, function (player) { playerManager.toggleMovementMode(player); });

ScriptApp.onLeavePlayer.Add((player: ScriptPlayer) => {new PlayerQuitEvent(player);})
ScriptApp.onJoinPlayer.Add((player: ScriptPlayer) => {
    new PlayerJoinEvent();
});
