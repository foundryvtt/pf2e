import { BaseRollContext } from "@system/rolls.ts";

/** Returns statistic dialog roll parameters based on held keys */
type ParamsFromEvent = Pick<BaseRollContext, "rollMode" | "skipDialog">;

function isRelevantEvent(
    event?: JQuery.TriggeredEvent | Event | null
): event is MouseEvent | TouchEvent | KeyboardEvent | WheelEvent | JQuery.TriggeredEvent {
    return !!event && "ctrlKey" in event && "metaKey" in event && "shiftKey" in event;
}

function eventToRollParams(event?: JQuery.TriggeredEvent | Event | null): ParamsFromEvent {
    const skipDefault = !game.user.settings.showRollDialogs;
    if (!isRelevantEvent(event)) return { skipDialog: skipDefault };

    const params: ParamsFromEvent = { skipDialog: event.shiftKey ? !skipDefault : skipDefault };
    if (event.ctrlKey || event.metaKey) {
        params.rollMode = game.user.isGM ? "gmroll" : "blindroll";
    }

    return params;
}

export { eventToRollParams };
