import { ActionDefaultOptions, ActionsPF2e } from '../actions';

export function seek(options: ActionDefaultOptions) {
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        'data.data.attributes.perception',
        options.glyph ?? 'A',
        'PF2E.Actions.Seek',
        'PF2E.ActionsCheck.Perception',
        options.modifiers,
        ['all', 'perception-check', 'action:seek'],
        ['action:seek'],
        ['concentrate', 'secret'],
        'perception-check',
        options.event,
    );
}
