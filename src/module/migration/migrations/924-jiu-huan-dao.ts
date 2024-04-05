import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

/** Rename all instances of and references to "Nine-Ring Sword" to "Jiu Huan Doa". **/
export class Migration924JiuHuanDoa extends MigrationBase {
    static override version = 0.924;

    #nineRingSword = {
        slug: "nine-ring-sword",
        name: "Nine-Ring Sword",
    };

    #jiuHuanDao = {
        slug: "jiu-huan-dao",
        name: "game" in globalThis ? game.i18n.localize(CONFIG.PF2E.baseWeaponTypes["jiu-huan-dao"]) : "Jiu Huan Dao",
    };

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system.rules = source.system.rules.map((r) =>
            recursiveReplaceString(r, (s) => s.replace(/^nine-ring-sword$/, this.#jiuHuanDao.slug)),
        );
        if (source.type === "deity") {
            const system: { weapons: string[] } = source.system;
            system.weapons = system.weapons.map((w) => (w === this.#nineRingSword.slug ? this.#jiuHuanDao.slug : w));
        } else if (source.type === "weapon") {
            if (source.system.slug === this.#jiuHuanDao.slug && source.system.bulk.value === 0) {
                source.system.bulk.value = 1;
            }

            const system: { slug: string | null; baseItem: string | null } = source.system;
            if (system.baseItem !== "nine-ring-sword") return;

            system.slug = system.slug === this.#nineRingSword.slug ? this.#jiuHuanDao.slug : system.slug;
            system.baseItem = this.#jiuHuanDao.slug;
            if (source.name === "Nine-Ring Sword") {
                source.name = this.#jiuHuanDao.name;
            }
        }
    }
}
