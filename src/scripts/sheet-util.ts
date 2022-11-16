import { BaseRollContext } from "@system/rolls";

/** Returns statistic dialog roll parameters based on held keys */
type ParamsFromEvent = Pick<BaseRollContext, "rollMode" | "skipDialog">;

export function eventToRollParams(event: JQuery.TriggeredEvent | MouseEvent): ParamsFromEvent {
    const skipDefault = !game.user.settings.showRollDialogs;
    const params: ParamsFromEvent = { skipDialog: event.shiftKey ? !skipDefault : skipDefault };
    if (event.ctrlKey || event.metaKey) params.rollMode = "blindroll";

    return params;
}
