import { ObjectEffectType, ScriptPlayer } from "zep-script";
import { playerManager } from "./src/core/Player";
import { environmentManager } from "./src/core/Environment";
import { blockEntity } from "./src/entity/Block";
import { widgetManager } from "./src/core/Widget";

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
    widgetManager.clearDisplays();
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
    playerManager.scheduleUpdatePlayerWidget(dt);
});

ScriptApp.onSidebarTouched.Add(function (player: ScriptPlayer) {
    player.tag.widget.environmentWidget.onMessage.Add(function (player: ScriptPlayer, data: any) {
        if (data.type == "close") {
            player.showCenterLabel("위젯이 닫혔습니다.");
            player.tag.widget.environmentWidget.destroy();
            player.tag.widget.environmentWidget = null;  
        }
    });

    player.tag.widget.playerWidget.onMessage.Add(function (player: ScriptPlayer, data: any) {
        if (data.type == "close") {
            player.showCenterLabel("위젯이 닫혔습니다.");
            player.tag.widget.playerWidget.destroy();
            player.tag.widget.playerWidget = null;  
        }
    });

    player.sendUpdated();
});

ScriptApp.onLeavePlayer.Add(function (player: ScriptPlayer) {
    playerManager.removePlayer(player);
});

ScriptApp.onJoinPlayer.Add(function (player: ScriptPlayer) {
    player.tag = {
        widget: null
    };
    
    playerManager.loadPlayer(player);

    const environmentWidget = player.showWidget("widget.html", "topleft", 300, 150);
    const playerWidget = player.showWidget("info.html", "bottomright", 300, 150);

    player.tag.widget = {
        environmentWidget: environmentWidget,
        playerWidget: playerWidget
    };

    widgetManager.addWidget("environmentWidget", environmentWidget);
    widgetManager.addWidget("playerWidget", playerWidget);
});

ScriptApp.onSay.Add(function (player: ScriptPlayer, message: string) {
    if(message === "scriptapp") {
        ScriptApp.sayToStaffs(ScriptApp.storage);
    } else if (message === "test") {
        ScriptApp.sayToStaffs(JSON.stringify(player.tag.widget));
    }
});