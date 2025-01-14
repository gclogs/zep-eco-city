import { ObjectEffectType, ScriptPlayer } from "zep-script";
import { playerManager } from "./src/core/Player";
import { environmentManager } from "./src/core/Environment";
import { blockEntity } from "./src/entity/Block";
import { Entity } from "./src/core/Entity";

const STATE_INIT = 3000;
const STATE_READY = 3001;
const STATE_PLAYING = 3002;
const STATE_END = 3003;

let _gameState = STATE_INIT;
let _stateTimer = 0;
let _transformCount = 0;
let _answerCount = 0;

ScriptApp.onInit.Add(function () {
    environmentManager.initialize();
});

ScriptApp.onDestroy.Add(function () {
    environmentManager.saveEnvironment();
    environmentManager.syncWithEnvironmentDB();
    blockEntity.resetBlock();
});

// Q키를 눌렀을 때 블록 생성
ScriptApp.addOnKeyDown(81, function (player) { 
    blockEntity.createBlock();
});

// R키를 눌렀을 때 이동 모드 전환
ScriptApp.addOnKeyDown(82, function (player) { 
    playerManager.toggleMovementMode(player); 
});

// 쓰레기를 때렸을 때 블록 제거
ScriptApp.onAppObjectAttacked.Add(function (sender: ScriptPlayer, x: number, y: number, layer: number, key: string) {
    blockEntity.attackedBlock(sender, key);
});

ScriptApp.onSidebarTouched.Add(function (player: ScriptPlayer) {
    const widget = player.showWidget("widget.html", "sidebar", 350, 350);
    environmentManager.setWidget(widget);
    player.tag.widget = widget;
});

ScriptApp.onUpdate.Add(function (dt: number) {
    environmentManager.scheduleUpdateEnvironmentByMovement(dt);
    environmentManager.scheduleSaveEnvironment(dt);
});

ScriptApp.onLeavePlayer.Add(function (player: ScriptPlayer) {
    if (player.tag.widget) {
        player.tag.widget.destroy();
        player.tag.widget = null;
    }

    playerManager.removePlayer(player);
    playerManager.syncWithPlayerDB(player);
});

ScriptApp.onJoinPlayer.Add(function (player: ScriptPlayer) {
    player.tag = {
        widget: null,
    };
    
    playerManager.loadPlayer(player);

    // 환경 지표 위젯 생성
    const widget = {
        environmentWidget: player.showWidget("widget.html", "topleft", 300, 150),
        playerWidget: player.showWidget("info.html", "topright", 300, 150),
    }
    if (widget) {
        environmentManager.setWidget(widget.environmentWidget);
        playerManager.setWidget(widget.playerWidget);
    } else {
        ScriptApp.sayToStaffs(`[오류] ${player.name}님의 위젯 생성 실패`);
    }
});

ScriptApp.onSay.Add(function (player: ScriptPlayer, message: string) {
    if(message === "scriptapp") {
        ScriptApp.sayToStaffs(ScriptApp.storage);
    }
});