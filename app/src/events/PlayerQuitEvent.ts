import { ScriptPlayer } from "zep-script";

export class PlayerQuitEvent {
    constructor(public player: ScriptPlayer) {
        ScriptApp.onLeavePlayer.Add(() => {
            if (player.tag.widget) {
                player.tag.widget.destroy();
                player.tag.widget = null;
            }
        });
    }
}