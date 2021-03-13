import { ActionDefaultOptions, ActionsPF2e } from '../actions';

export function forceOpen(options: ActionDefaultOptions) {
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        'data.data.skills.ath',
        options.glyph ?? 'A',
        'PF2E.Actions.ForceOpen',
        'PF2E.ActionsCheck.Athletics',
        options.modifiers,
        ['all', 'skill-check', 'athletics', 'action:force-open'],
        ['action:force-open'],
        ['attack'],
        'skill-check',
        options.event,
    );
}
