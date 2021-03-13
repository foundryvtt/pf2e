import { ActionDefaultOptions, ActionsPF2e } from '../actions';

export function lie(options: ActionDefaultOptions) {
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        'data.data.skills.dec',
        options.glyph,
        'PF2E.Actions.Lie',
        'PF2E.ActionsCheck.Deception',
        options.modifiers,
        ['all', 'skill-check', 'deception', 'action:lie'],
        ['action:lie'],
        ['auditory', 'concentrate', 'linguistic', 'mental', 'secret'],
        'skill-check',
        options.event,
    );
}
