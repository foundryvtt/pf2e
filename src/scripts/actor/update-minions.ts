import { ActorPF2e } from '@actor/base';
import { AnimalCompanionData, FamiliarData } from '@actor/data-definitions';

/* Update minion-type actors to trigger another prepare data cycle to update their stats of the master actor is updated. */
export function updateMinionActors(master: ActorPF2e | undefined = undefined) {
    game.actors.contents
        .filter((actor): actor is ActorPF2e & { data: FamiliarData | AnimalCompanionData } =>
            ['familiar', 'animalCompanion'].includes(actor.data.type),
        )
        .filter((minion) => !!minion.data.data?.master?.id)
        .filter((minion) => !master || minion.data.data.master.id === master.data._id)
        .filter((minion) => minion.can(game.user, 'update'))
        .forEach((minion) => minion.update({ 'data.master.updated': new Date().toISOString() }));
}
