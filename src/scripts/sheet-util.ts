/** Returns statistic dialog roll parameters based on held keys */
export function eventToRollParams(event: JQuery.TriggeredEvent): { secret: boolean; skipDialog: boolean } {
    const skipDefault = !game.user.settings.showRollDialogs;
    return {
        secret: !!(event.ctrlKey || event.metaKey),
        skipDialog: event.shiftKey ? !skipDefault : skipDefault,
    };
}
