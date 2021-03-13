import { ActionDefaultOptions, ActionsPF2e } from '../actions';

export function balance(options: ActionDefaultOptions) {
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        'data.data.skills.acr',
        options.glyph ?? 'A',
        'PF2E.Actions.Balance',
        'PF2E.ActionsCheck.Acrobatics',
        options.modifiers,
        ['all', 'skill-check', 'acrobatics', 'action:balance'],
        ['action:balance'],
        ['move'],
        'skill-check',
        options.event,
    );
}
