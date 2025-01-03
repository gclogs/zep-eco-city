import { environmentManager } from "../core/Environment";
import { playerManager } from "../core/Player";
import { ScriptPlayer } from "zep-script";

export class PlayerJoinEvent {
    constructor() {
        ScriptApp.onJoinPlayer.Add(function(player: ScriptPlayer) {
            player.tag = {
                widget: null,
            };
            
            playerManager.loadPlayer(player);

            // 환경 지표 위젯 생성
            const widget = player.showWidget("widget.html", "topleft", 300, 150);
            environmentManager.setWidget(widget);
        });
    }
}