import { ActionDefaultOptions, ActionsPF2e } from '../actions';

export function swim(options: ActionDefaultOptions) {
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        'data.data.skills.ath',
        options.glyph ?? 'A',
        'PF2E.Actions.Swim',
        'PF2E.ActionsCheck.Athletics',
        ['all', 'skill-check', 'athletics', 'action:swim'],
        ['action:swim'],
        ['move'],
        'skill-check',
        options.event,
    );
}
