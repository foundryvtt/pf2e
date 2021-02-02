import { ActionDefaultOptions, PF2Actions } from '../actions';

export function tumbleThrough(options: ActionDefaultOptions) {
    PF2Actions.simpleRollActionCheck(
        options.actors,
        'data.data.skills.acr',
        options.glyph ?? 'A',
        'PF2E.Actions.TumbleThrough',
        'PF2E.ActionsCheck.Acrobatics',
        ['all', 'skill-check', 'acrobatics', 'action:tumble-through'],
        ['action:tumble-through'],
        ['move'],
        'skill-check',
        options.event,
    );
}
