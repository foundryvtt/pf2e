import { ActionDefaultOptions, PF2Actions } from '../actions';

export function maneuverInFlight(options: ActionDefaultOptions) {
    PF2Actions.simpleRollActionCheck(
        options.actors,
        'data.data.skills.acr',
        options.glyph ?? 'A',
        'PF2E.Actions.ManeuverInFlight',
        'PF2E.ActionsCheck.Acrobatics',
        ['all', 'skill-check', 'acrobatics', 'action:maneuver-in-flight'],
        ['action:maneuver-in-flight'],
        ['move'],
        'skill-check',
        options.event,
    );
}
