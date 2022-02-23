/** Returns statistic dialog roll parameters based on held keys */
interface ParamsFromEvent {
    secret?: boolean;
    skipDialog: boolean;
}

export function eventToRollParams(event: JQuery.TriggeredEvent | PointerEvent): ParamsFromEvent {
    const skipDefault = !game.user.settings.showRollDialogs;
    const params: ParamsFromEvent = { skipDialog: event.shiftKey ? !skipDefault : skipDefault };
    if (event.ctrlKey || event.metaKey) params.secret = true;

    return params;
}
