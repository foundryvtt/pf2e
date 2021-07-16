import { ActionsPF2e, SkillActionOptions } from '../actions';

export function makeAnImpression(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'diplomacy');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph,
        'PF2E.Actions.MakeAnImpression.Title',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:make-an-impression'],
        ['action:make-an-impression'],
        ['auditory', 'concentrate', 'exploration', 'linguistic', 'mental'],
        checkType,
        options.event,
        (target) => target.will,
        (selector: string) => [
            ActionsPF2e.note(selector, 'PF2E.Actions.MakeAnImpression', 'success'),
            ActionsPF2e.note(selector, 'PF2E.Actions.MakeAnImpression', 'failure'),
            ActionsPF2e.note(selector, 'PF2E.Actions.MakeAnImpression', 'criticalFailure'),
        ],
    );
}
