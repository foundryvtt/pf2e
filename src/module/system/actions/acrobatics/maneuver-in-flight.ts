import { ActionsPF2e, SkillActionOptions } from '../actions';

export function maneuverInFlight(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'acrobatics');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph ?? 'A',
        'PF2E.Actions.ManeuverInFlight',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:maneuver-in-flight'],
        ['action:maneuver-in-flight'],
        ['move'],
        checkType,
        options.event,
    );
}
