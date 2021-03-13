import { ActionDefaultOptions, ActionsPF2e } from '../actions';

export function tumbleThrough(options: ActionDefaultOptions) {
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        'data.data.skills.acr',
        options.glyph ?? 'A',
        'PF2E.Actions.TumbleThrough',
        'PF2E.ActionsCheck.Acrobatics',
        options.modifiers,
        ['all', 'skill-check', 'acrobatics', 'action:tumble-through'],
        ['action:tumble-through'],
        ['move'],
        'skill-check',
        options.event,
    );
}
