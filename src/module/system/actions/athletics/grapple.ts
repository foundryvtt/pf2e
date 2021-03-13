import { ActionDefaultOptions, ActionsPF2e } from '../actions';

export function grapple(options: ActionDefaultOptions) {
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        'data.data.skills.ath',
        options.glyph ?? 'A',
        'PF2E.Actions.Grapple',
        'PF2E.ActionsCheck.Athletics',
        options.modifiers,
        ['all', 'skill-check', 'athletics', 'action:grapple'],
        ['action:grapple'],
        ['attack'],
        'skill-check',
        options.event,
    );
}
