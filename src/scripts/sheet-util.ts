import { BaseRollContext } from "@system/rolls";

/** Returns statistic dialog roll parameters based on held keys */
type ParamsFromEvent = Pick<BaseRollContext, "rollMode" | "skipDialog">;

export function eventToRollParams(event?: JQuery.TriggeredEvent | MouseEvent): ParamsFromEvent {
    const skipDefault = !game.user.settings.showRollDialogs;
    if (!event) return { skipDialog: skipDefault };

    const params: ParamsFromEvent = { skipDialog: event.shiftKey ? !skipDefault : skipDefault };
    if (event.ctrlKey || event.metaKey) {
        params.rollMode = game.user.isGM ? "gmroll" : "blindroll";
    }

    return params;
}
