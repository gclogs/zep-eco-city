import { ObjectEffectType, ScriptPlayer } from "zep-script";
import { playerManager } from "./src/core/Player";
import { environmentManager } from "./src/core/Environment";
import { blockEntity } from "./src/entity/Block";
import { Entity } from "./src/core/Entity";
import { Widget } from "./src/core/Widget";

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
    
    const widget = new Widget();
    widget.clearDisplays();
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

ScriptApp.onUpdate.Add(function (dt: number) {
    environmentManager.scheduleUpdateEnvironmentByMovement(dt);
    environmentManager.scheduleSaveEnvironment(dt);
});

ScriptApp.onLeavePlayer.Add(function (player: ScriptPlayer) {
    if (player.tag.widgets) {
        player.tag.widgets.onMessage.Add(function (player: ScriptPlayer, data: any) {
            if (data.type == "close") {
                player.showCenterLabel("위젯이 닫혔습니다.");
                player.tag.widgets.destroy();
                player.tag.widgets = null;  
            }
        });

        player.sendUpdated();
    }
    playerManager.syncWithPlayerDB(player);
});

ScriptApp.onJoinPlayer.Add(function (player: ScriptPlayer) {
    player.tag = {
        widgets: new Widget()
    };
    
    playerManager.loadPlayer(player);

    // 환경 지표 위젯 생성
    const environmentWidget = player.showWidget("widget.html", "topleft", 300, 150);
    const playerWidget = player.showWidget("info.html", "bottomright", 300, 150);

    if (environmentWidget && playerWidget) {
        player.tag.widgets.addWidget("environmentWidget", environmentWidget);
        player.tag.widgets.addWidget("playerWidget", playerWidget);
    } else {
        ScriptApp.sayToStaffs(`[오류] ${player.name}님의 위젯 생성 실패`);
    }
});

ScriptApp.onSay.Add(function (player: ScriptPlayer, message: string) {
    if(message === "scriptapp") {
        ScriptApp.sayToStaffs(ScriptApp.storage);
    }
});