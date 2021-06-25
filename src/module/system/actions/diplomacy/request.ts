import { ActionsPF2e, SkillActionOptions } from '../actions';

export function request(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'diplomacy');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph ?? 'A',
        'PF2E.Actions.Request',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:request'],
        ['action:request'],
        ['auditory', 'concentrate', 'linguistic', 'mental'],
        checkType,
        options.event,
    );
}
