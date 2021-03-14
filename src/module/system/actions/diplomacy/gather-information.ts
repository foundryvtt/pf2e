import { ActionDefaultOptions, ActionsPF2e } from '../actions';

export function gatherInformation(options: ActionDefaultOptions) {
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        'data.data.skills.dip',
        options.glyph,
        'PF2E.Actions.GatherInformation',
        'PF2E.ActionsCheck.Diplomacy',
        options.modifiers,
        ['all', 'skill-check', 'diplomacy', 'action:gather-information'],
        ['action:gather-information'],
        ['exploration', 'secret'],
        'skill-check',
        options.event,
    );
}
