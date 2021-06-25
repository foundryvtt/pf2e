import { ActionsPF2e, SkillActionOptions } from '../actions';

export function shove(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'athletics');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph ?? 'A',
        'PF2E.Actions.Shove',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:shove'],
        ['action:shove'],
        ['attack'],
        checkType,
        options.event,
        (target) => target.fortitude,
    );
}
