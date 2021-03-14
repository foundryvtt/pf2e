import { ActionsPF2e, SkillActionOptions } from '../actions';

export function gatherInformation(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'diplomacy');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph,
        'PF2E.Actions.GatherInformation',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:gather-information'],
        ['action:gather-information'],
        ['exploration', 'secret'],
        checkType,
        options.event,
    );
}
