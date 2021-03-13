import { ActionDefaultOptions, ActionsPF2e } from '../actions';

export function impersonate(options: ActionDefaultOptions) {
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        'data.data.skills.dec',
        options.glyph,
        'PF2E.Actions.Impersonate',
        'PF2E.ActionsCheck.Deception',
        options.modifiers,
        ['all', 'skill-check', 'deception', 'action:impersonate'],
        ['action:impersonate'],
        ['concentrate', 'exploration', 'manipulate', 'secret'],
        'skill-check',
        options.event,
    );
}
