import { ActionsPF2e, SkillActionOptions } from '../actions';

export function disarm(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'athletics');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph ?? 'A',
        'PF2E.Actions.Disarm',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:disarm'],
        ['action:disarm'],
        ['attack'],
        checkType,
        options.event,
        (target) => target.reflex,
    );
}
