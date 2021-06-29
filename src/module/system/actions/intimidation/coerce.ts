import { ActionsPF2e, SkillActionOptions } from '../actions';

export function coerce(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'intimidation');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph,
        'PF2E.Actions.Coerce.Title',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:coerce'],
        ['action:coerce'],
        ['auditory', 'concentrate', 'emotion', 'exploration', 'linguistic', 'mental'],
        checkType,
        options.event,
        (target) => target.will,
    );
}
