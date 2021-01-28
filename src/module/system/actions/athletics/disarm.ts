import { PF2EActor } from '@actor/actor';
import { PF2Actions } from '../actions';

export function disarm(options: { event: JQuery.Event; actors: PF2EActor | PF2EActor[] }) {
    PF2Actions.simpleRollActionCheck(
        options.actors,
        'data.data.skills.ath',
        'A',
        'PF2E.Actions.Disarm',
        'PF2E.ActionsCheck.Athletics',
        ['all', 'skill-check', 'athletics', 'action:disarm'],
        ['action:disarm'],
        ['attack'],
        'skill-check',
        options.event,
    );
}
