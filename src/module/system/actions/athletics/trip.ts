import { ActionsPF2e, SkillActionOptions } from '../actions';

export function trip(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'athletics');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph ?? 'A',
        'PF2E.Actions.Trip',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:trip'],
        ['action:trip'],
        ['attack'],
        checkType,
        options.event,
        (target) => target.reflex,
    );
}
