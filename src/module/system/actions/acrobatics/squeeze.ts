import { ActionsPF2e, SkillActionOptions } from '../actions';

export function squeeze(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'acrobatics');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph,
        'PF2E.Actions.Squeeze',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:squeeze'],
        ['action:squeeze'],
        ['exploration', 'move'],
        checkType,
        options.event,
    );
}
