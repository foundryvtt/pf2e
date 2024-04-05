/** Returns statistic dialog roll parameters based on held keys */
type ParamsFromEvent = { skipDialog: boolean; rollMode?: RollMode | "roll" };

function isRelevantEvent(
    event: Maybe<JQuery.TriggeredEvent | Event>,
): event is MouseEvent | TouchEvent | KeyboardEvent | WheelEvent | JQuery.TriggeredEvent {
    return !!event && "ctrlKey" in event && "metaKey" in event && "shiftKey" in event;
}

/** Set roll mode and dialog skipping from a user's input */
function eventToRollParams(
    event: Maybe<JQuery.TriggeredEvent | Event>,
    rollType: { type: "check" | "damage" },
): ParamsFromEvent {
    const key = rollType.type === "check" ? "showCheckDialogs" : "showDamageDialogs";
    const skipDefault = !game.user.settings[key];
    if (!isRelevantEvent(event)) return { skipDialog: skipDefault };

    const params: ParamsFromEvent = { skipDialog: event.shiftKey ? !skipDefault : skipDefault };
    if (event.ctrlKey || event.metaKey) {
        params.rollMode = game.user.isGM ? "gmroll" : "blindroll";
    }

    return params;
}

/** Set roll mode from a user's input: used for messages that are not actually rolls. */
function eventToRollMode(event: Maybe<Event>): RollMode | "roll" {
    if (!isRelevantEvent(event) || !(event.ctrlKey || event.metaKey)) return "roll";
    return game.user.isGM ? "gmroll" : "blindroll";
}

export { eventToRollMode, eventToRollParams };
