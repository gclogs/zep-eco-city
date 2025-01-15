import { ScriptPlayer, ScriptWidget } from "zep-script";

export interface WidgetCollection {
    environmentWidget?: ScriptWidget;
    playerWidget?: ScriptWidget;
}

export class Widget {
    private displays: Record<string, ScriptWidget>;

    constructor() {
        this.displays = {} as Record<string, ScriptWidget>;
    }

    public addWidget(type: keyof WidgetCollection, widget: ScriptWidget) {
        this.displays[type] = widget;
        widget.onMessage.Add((player: ScriptPlayer, message: string) => {
            if (message === "close") {
                delete this.displays[type];
                widget.destroy();
            }
        });

        ScriptApp.sayToStaffs(`[${widget.id}]: ${type} 위젯 생성 완료`);
    }

    public getWidget(type: keyof WidgetCollection): ScriptWidget | undefined {
        return this.displays[type];
    }

    public updateWidget(type: keyof WidgetCollection, options: any) {
        const widget = this.getWidget(type);
        if (!widget) {
            ScriptApp.sayToStaffs(`[${type}]: 위젯을 찾을 수 없습니다.`);
            return;
        };

        widget.sendMessage({
            ...options
        });
    }

    public clearDisplays() {
        this.displays = {} as Record<string, ScriptWidget>;
    }
}