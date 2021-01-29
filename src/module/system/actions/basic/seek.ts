import { PF2EActor } from '@actor/actor';
import { PF2Actions } from '../actions';

export function seek(options: { event: JQuery.Event; actors: PF2EActor | PF2EActor[] }) {
    PF2Actions.simpleRollActionCheck(
        options.actors,
        'data.data.attributes.perception',
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
