import { PF2EActor } from '@actor/actor';
import { PF2Actions } from '../actions';

export function seek(options: { event: JQuery.Event; actor: PF2EActor }) {
    PF2Actions.simpleRollActionCheck(
        options.actor,
        options.actor.data.data.attributes.perception,
        'A',
        'PF2E.Actions.Seek',
        'PF2E.ActionsCheck.Perception',
        ['all', 'perception-check', 'action:seek'],
        ['action:seek'],
        ['concentrate', 'secret'],
        'perception-check',
        options.event,
    );
}
