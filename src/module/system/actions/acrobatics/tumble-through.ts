import { ActionsPF2e, SkillActionOptions } from '../actions';

export function tumbleThrough(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'acrobatics');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph ?? 'A',
        'PF2E.Actions.TumbleThrough',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:tumble-through'],
        ['action:tumble-through'],
        ['move'],
        checkType,
        options.event,
        (target) => target.reflex,
    );
}
