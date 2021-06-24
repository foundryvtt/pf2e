import { ActionsPF2e, SkillActionOptions } from '../actions';

export function grapple(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'athletics');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph ?? 'A',
        'PF2E.Actions.Grapple',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:grapple'],
        ['action:grapple'],
        ['attack'],
        checkType,
        options.event,
        (target) => target.fortitude,
    );
}
