import { ActionDefaultOptions, ActionsPF2e } from '../actions';

export function shove(options: ActionDefaultOptions) {
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        'data.data.skills.ath',
        options.glyph ?? 'A',
        'PF2E.Actions.Shove',
        'PF2E.ActionsCheck.Athletics',
        options.modifiers,
        ['all', 'skill-check', 'athletics', 'action:shove'],
        ['action:shove'],
        ['attack'],
        'skill-check',
        options.event,
    );
}
