import { UserSettingsPF2e } from "@module/user/document.ts";

/** Returns statistic dialog roll parameters based on held keys */
type ParamsFromEvent = { skipDialog: boolean; rollMode?: RollMode | "roll" };

function isRelevantEvent(
    event?: JQuery.TriggeredEvent | Event | null,
): event is MouseEvent | TouchEvent | KeyboardEvent | WheelEvent | JQuery.TriggeredEvent {
    return !!event && "ctrlKey" in event && "metaKey" in event && "shiftKey" in event;
}

function eventToRollParams(rollType: string, event?: JQuery.TriggeredEvent | Event | null): ParamsFromEvent {
    const key = `show${rollType}Dialogs`;
    const skipDefault = !game.user.settings[key as keyof UserSettingsPF2e];
    if (!isRelevantEvent(event)) return { skipDialog: skipDefault };

    const params: ParamsFromEvent = { skipDialog: event.shiftKey ? !skipDefault : skipDefault };
    if (event.ctrlKey || event.metaKey) {
        params.rollMode = game.user.isGM ? "gmroll" : "blindroll";
    }

    return params;
}

export { eventToRollParams };
