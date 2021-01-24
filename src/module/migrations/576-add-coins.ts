import { MigrationBase } from './base';
import { PF2EPhysicalItem } from '../item/physical';
import { ActorDataPF2e } from '../actor/actorDataDefinitions';

export class Migration576AddCoins extends MigrationBase {
    static version = 0.576;
    requiresFlush = true;

    async addCoin(actor: ActorDataPF2e, treasureId: string, denomination: string, quantity: number) {
        if (quantity !== null && `${quantity}`.trim() !== '0') {
            console.log(`Adding ${quantity} of ${denomination} to actors ${actor.name}'s inventory`);
            const pack = game.packs.find<PF2EPhysicalItem>((p) => p.collection === 'pf2e.equipment-srd');
            const item = await pack.getEntity(treasureId);
            item.data.data.quantity.value = quantity;
            actor.items.push(item.data);
        }
    }

    async updateActor(actor: any) {
        console.log('Migrating coins');
        const coinCompendiumIds = {
            pp: 'JuNPeK5Qm1w6wpb4',
            gp: 'B6B7tBWJSqOBz5zz',
            sp: '5Ew82vBF9YfaiY9f',
            cp: 'lzJ8AVhRcbFul5fh',
        };
        const ppQuantity = actor.data?.currency?.pp?.value ?? null;
        await this.addCoin(actor, coinCompendiumIds.pp, 'pp', ppQuantity);

        const gpQuantity = actor.data?.currency?.gp?.value ?? null;
        await this.addCoin(actor, coinCompendiumIds.gp, 'gp', gpQuantity);

        const spQuantity = actor.data?.currency?.sp?.value ?? null;
        await this.addCoin(actor, coinCompendiumIds.sp, 'sp', spQuantity);

        const cpQuantity = actor.data?.currency?.cp?.value ?? null;
        await this.addCoin(actor, coinCompendiumIds.cp, 'cp', cpQuantity);
    }
}
