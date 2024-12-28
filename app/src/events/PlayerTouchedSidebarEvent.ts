import { environmentManager } from "../core/Environment";
import { ScriptPlayer } from "zep-script";

export class PlayerTouchedSidebarEvent {
    constructor(public player: ScriptPlayer) {
        ScriptApp.onSidebarTouched.Add(() => {
            const widget = player.showWidget("widget.html", "sidebar", 350, 350);
            environmentManager.setWidget(widget);
            player.tag.widget = widget;
        });
    }
}