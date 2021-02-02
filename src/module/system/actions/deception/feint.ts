import { ActionDefaultOptions, PF2Actions } from '../actions';

export function feint(options: ActionDefaultOptions) {
    PF2Actions.simpleRollActionCheck(
        options.actors,
        'data.data.skills.dec',
        options.glyph ?? 'A',
        'PF2E.Actions.Feint',
        'PF2E.ActionsCheck.Deception',
        ['all', 'skill-check', 'deception', 'action:feint'],
        ['action:feint'],
        ['mental'],
        'skill-check',
        options.event,
    );
}
