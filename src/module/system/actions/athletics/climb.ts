import { ActionDefaultOptions, ActionsPF2e } from '../actions';

export function climb(options: ActionDefaultOptions) {
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        'data.data.skills.ath',
        options.glyph ?? 'A',
        'PF2E.Actions.Climb',
        'PF2E.ActionsCheck.Athletics',
        options.modifiers,
        ['all', 'skill-check', 'athletics', 'action:climb'],
        ['action:climb'],
        ['move'],
        'skill-check',
        options.event,
    );
}
