import { ActionDefaultOptions, PF2Actions } from '../actions';

export function climb(options: ActionDefaultOptions) {
    PF2Actions.simpleRollActionCheck(
        options.actors,
        'data.data.skills.ath',
        options.glyph ?? 'A',
        'PF2E.Actions.Climb',
        'PF2E.ActionsCheck.Athletics',
        ['all', 'skill-check', 'athletics', 'action:climb'],
        ['action:climb'],
        ['move'],
        'skill-check',
        options.event,
    );
}
