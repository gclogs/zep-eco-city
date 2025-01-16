import { ScriptPlayer, ScriptWidget } from "zep-script";

export interface WidgetCollection {
    environmentWidget?: ScriptWidget;
    playerWidget?: ScriptWidget;
}

export const widgetManager = {
    displays: {} as Record<string, ScriptWidget>,

    addWidget(type: keyof WidgetCollection, widget: ScriptWidget) {
        this.displays[type] = widget;
        ScriptApp.sayToStaffs(`[${widget.id}]: ${type} 위젯 생성 완료`);
    },

    getWidget(type: keyof WidgetCollection): ScriptWidget | undefined {
        return this.displays[type];
    },

    updateWidget(type: keyof WidgetCollection, options: any) {
        const widget = this.getWidget(type);
        if (!widget) {
            ScriptApp.sayToStaffs(`[${type}]: 위젯을 찾을 수 없습니다.`);
            return;
        };

        widget.sendMessage({
            ...options
        });
    },

    clearDisplays() {
        this.displays = {} as Record<string, ScriptWidget>;
    }
}