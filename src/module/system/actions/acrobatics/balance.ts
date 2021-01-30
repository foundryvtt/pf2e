import { ActionDefaultOptions, PF2Actions } from '../actions';

export function balance(options: ActionDefaultOptions) {
    PF2Actions.simpleRollActionCheck(
        options.actors,
        'data.data.skills.acr',
        options.glyph ?? 'A',
        'PF2E.Actions.Balance',
        'PF2E.ActionsCheck.Acrobatics',
        ['all', 'skill-check', 'acrobatics', 'action:balance'],
        ['action:balance'],
        ['move'],
        'skill-check',
        options.event,
    );
}
