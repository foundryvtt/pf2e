import { ActionDefaultOptions, ActionsPF2e } from '../actions';

export function squeeze(options: ActionDefaultOptions) {
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        'data.data.skills.acr',
        options.glyph,
        'PF2E.Actions.Squeeze',
        'PF2E.ActionsCheck.Acrobatics',
        ['all', 'skill-check', 'acrobatics', 'action:squeeze'],
        ['action:squeeze'],
        ['exploration', 'move'],
        'skill-check',
        options.event,
    );
}
