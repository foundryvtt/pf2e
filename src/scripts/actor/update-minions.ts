import { PF2EActor } from '@actor/actor';
import { FamiliarData, AnimalCompanionData } from '@actor/actor-data-definitions';

/* Update minion-type actors to trigger another prepare data cycle to update their stats of the master actor is updated. */
export function updateMinionActors(master: PF2EActor | undefined = undefined) {
    game.actors.entities
        .filter((actor): actor is PF2EActor & { data: AnimalCompanionData } =>
            ['animalcompanion'].includes(actor.data.type),
        )
        .filter((minion) => !!minion.data.data?.master?.id)
        .filter((minion) => !master || minion.data.data.master.id === master.data._id)
        .filter((minion) => minion.can(game.user, 'update'))
        .forEach((minion) => minion.update({ 'data.master.updated': new Date().toISOString() }));

    game.actors.entities
        .filter((actor): actor is PF2EActor & { data: FamiliarData } => ['familiar'].includes(actor.data.type))
        .filter((minion) => !!minion.data.data?.master?.id)
        .filter((minion) => !master || minion.data.data.master.id === master.data._id)
        .filter((minion) => minion.can(game.user, 'update'))
        .forEach((minion) => minion.update({ 'data.master.updated': new Date().toISOString() }));
}
