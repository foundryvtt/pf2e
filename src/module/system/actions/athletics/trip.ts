import { ActionDefaultOptions, PF2Actions } from '../actions';

export function trip(options: ActionDefaultOptions) {
    PF2Actions.simpleRollActionCheck(
        options.actors,
        'data.data.skills.ath',
        options.glyph ?? 'A',
        'PF2E.Actions.Trip',
        'PF2E.ActionsCheck.Athletics',
        ['all', 'skill-check', 'athletics', 'action:trip'],
        ['action:trip'],
        ['attack'],
        'skill-check',
        options.event,
    );
}
