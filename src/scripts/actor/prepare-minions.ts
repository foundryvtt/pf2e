import { FamiliarPF2e } from "@actor/index";
import type { CreaturePF2e } from "@actor/index";

/* (Re)prepare data of familiars with masters */
export function prepareMinions(master?: CreaturePF2e) {
    const familiars = game.actors.filter(
        (actor) => actor instanceof FamiliarPF2e && (!master || actor.data.data.master?.id === master.id)
    );
    for (const familiar of familiars) {
        familiar.prepareData();
    }
}
