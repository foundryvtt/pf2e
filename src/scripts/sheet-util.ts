import { StatisticRollParameters } from "@system/statistic";

/** Returns statistic dialog roll parameters based on held keys */
export function eventToRollParams(event: JQuery.Event): Partial<StatisticRollParameters> {
    const skipDefault = !game.user.getFlag("pf2e", "settings.showRollDialogs");
    return {
        secret: event.ctrlKey || event.metaKey,
        skipDialog: event.shiftKey ? !skipDefault : skipDefault,
    };
}
