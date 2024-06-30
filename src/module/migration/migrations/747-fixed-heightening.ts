import type { SpellPF2e } from "@item";
import { ItemSourcePF2e, SpellSource } from "@item/base/data/index.ts";
import { sluggify } from "@util";
import { UUIDUtils } from "@util/uuid.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Handle spells gaining fixed level heightening */
export class Migration747FixedHeightening extends MigrationBase {
    static override version = 0.747;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "spell") return;

        const isAcidSplash = (source.system.slug ?? sluggify(source.name)) === "acid-splash";
        if (source.system.heightening?.type === "fixed" && !isAcidSplash) return;

        const sourceId = source.flags.core?.sourceId;
        if (sourceId && this.fixedHeightenSpells.has(sourceId)) {
            const spells = await this.loadSpells();
            const spell = spells[sourceId];
            if (spell && spell.system.heightening?.type === "fixed") {
                source.system.heightening = spell.system.heightening;
                this.overwriteDamage(source, spell);
            }
        }
    }

    protected overwriteDamage(spell: SpellSource, newSpell: SpellPF2e): void {
        const newDamage = newSpell.system.damage;
        const newKeys = new Set(Object.keys(newDamage.value));
        const diff = Object.keys(spell.system.damage.value).filter((key) => !newKeys.has(key));
        const damage: Record<string, unknown> | { value: Record<string, unknown> } = spell.system.damage;
        damage.value = newDamage.value;
        for (const deleteKey of diff) {
            if (R.isPlainObject(damage.value)) {
                damage.value[`-=${deleteKey}`] = null;
            }
        }
    }

    #loadedSpells?: Record<string, SpellPF2e | undefined>;

    // Ensure compendium is only hit if the migration runs, and only once
    protected async loadSpells(): Promise<Record<string, SpellPF2e | undefined>> {
        if (this.#loadedSpells) {
            return this.#loadedSpells;
        }

        const spells = await UUIDUtils.fromUUIDs([...this.fixedHeightenSpells]);
        this.#loadedSpells = spells.reduce((record, spell) => ({ ...record, [spell.uuid]: spell }), {});
        return this.#loadedSpells;
    }

    fixedHeightenSpells = new Set<DocumentUUID>([
        "Compendium.pf2e.spells-srd.Item.0fKHBh5goe2eiFYL",
        "Compendium.pf2e.spells-srd.Item.10VcmSYNBrvBphu1",
        "Compendium.pf2e.spells-srd.Item.2gQYrCPwBmwau26O",
        "Compendium.pf2e.spells-srd.Item.2iQKhCQBijhj5Rf3",
        "Compendium.pf2e.spells-srd.Item.4koZzrnMXhhosn0D",
        "Compendium.pf2e.spells-srd.Item.5WM3WjshXgrkVCg6",
        "Compendium.pf2e.spells-srd.Item.7CUgqHunmHfW2lC5",
        "Compendium.pf2e.spells-srd.Item.7OFKYR1VY6EXDuiR",
        "Compendium.pf2e.spells-srd.Item.9s5tqqXNzcoKamWx",
        "Compendium.pf2e.spells-srd.Item.BCuHKrDeJ4eq53M6",
        "Compendium.pf2e.spells-srd.Item.CxpFy4HJHf4ACbxF",
        "Compendium.pf2e.spells-srd.Item.D2nPKbIS67m9199U",
        "Compendium.pf2e.spells-srd.Item.DCQHaLrYXMI37dvW",
        "Compendium.pf2e.spells-srd.Item.DgcSiOCR1uDXGaEA",
        "Compendium.pf2e.spells-srd.Item.EfFMLVbmkBWmzoLF",
        "Compendium.pf2e.spells-srd.Item.Et8RSCLx8w7uOLvo",
        "Compendium.pf2e.spells-srd.Item.F23T5tHPo3WsFiHW",
        "Compendium.pf2e.spells-srd.Item.FhOaQDTSnsY7tiam",
        "Compendium.pf2e.spells-srd.Item.Fr58LDSrbndgld9n",
        "Compendium.pf2e.spells-srd.Item.GaRQlC9Yw1BGKHfN",
        "Compendium.pf2e.spells-srd.Item.HGmBY8KjgLV97nUp",
        "Compendium.pf2e.spells-srd.Item.HHGUBGle4OjoxvNR",
        "Compendium.pf2e.spells-srd.Item.HTou8cG05yuSkesj",
        "Compendium.pf2e.spells-srd.Item.HWrNMQENi9WSGbnF",
        "Compendium.pf2e.spells-srd.Item.HcIAQZjNXHemoXSU",
        "Compendium.pf2e.spells-srd.Item.Ifc2b6bNVdjKV7Si",
        "Compendium.pf2e.spells-srd.Item.JHntYF0SbaWKq7wR",
        "Compendium.pf2e.spells-srd.Item.LQzlKbYjZSMFQawP",
        "Compendium.pf2e.spells-srd.Item.LiGbewa9pO0yjbsY",
        "Compendium.pf2e.spells-srd.Item.Llx0xKvtu8S4z6TI",
        "Compendium.pf2e.spells-srd.Item.Mkbq9xlAUxHUHyR2",
        "Compendium.pf2e.spells-srd.Item.OAt2ZEns1gIOCgrn",
        "Compendium.pf2e.spells-srd.Item.OhD2Z6rIGGD5ocZA",
        "Compendium.pf2e.spells-srd.Item.PRrZ7anETWPm90YY",
        "Compendium.pf2e.spells-srd.Item.PjhUmyKnq6K5uDby",
        "Compendium.pf2e.spells-srd.Item.Popa5umI3H33levx",
        "Compendium.pf2e.spells-srd.Item.Pwq6T7xpfAJXV5aj",
        "Compendium.pf2e.spells-srd.Item.Q7QQ91vQtyi1Ux36",
        "Compendium.pf2e.spells-srd.Item.Seaah9amXg70RKw2",
        "Compendium.pf2e.spells-srd.Item.U58aQWJ47VrI36yP",
        "Compendium.pf2e.spells-srd.Item.UmXhuKrYZR3W16mQ",
        "Compendium.pf2e.spells-srd.Item.VTb0yI6P1bLkzuRr",
        "Compendium.pf2e.spells-srd.Item.VlNcjmYyu95vOUe8",
        "Compendium.pf2e.spells-srd.Item.W02bHXylIpoXbO4e",
        "Compendium.pf2e.spells-srd.Item.WsUwpfmhKrKwoIe3",
        "Compendium.pf2e.spells-srd.Item.Wt94cw03L77sbud7",
        "Compendium.pf2e.spells-srd.Item.XhgMx9WC6NfXd9RP",
        "Compendium.pf2e.spells-srd.Item.ZAX0OOcKtYMQlquR",
        "Compendium.pf2e.spells-srd.Item.ZqmP9gijBmK7y8Xy",
        "Compendium.pf2e.spells-srd.Item.aIHY2DArKFweIrpf",
        "Compendium.pf2e.spells-srd.Item.atlgGNI1E1Ox3O3a",
        "Compendium.pf2e.spells-srd.Item.bay4AfSu2iIozNNW",
        "Compendium.pf2e.spells-srd.Item.czO0wbT1i320gcu9",
        "Compendium.pf2e.spells-srd.Item.dINQzhqGmIsqGMUY",
        "Compendium.pf2e.spells-srd.Item.drmvQJETA3WZzXyw",
        "Compendium.pf2e.spells-srd.Item.e36Z2t6tLdW3RUzZ",
        "Compendium.pf2e.spells-srd.Item.fprqWKUc0jnMIyGU",
        "Compendium.pf2e.spells-srd.Item.gISYsBFby1TiXfBt",
        "Compendium.pf2e.spells-srd.Item.ivKnEtI1z4UqEKIA",
        "Compendium.pf2e.spells-srd.Item.kuoYff1csM5eAcAP",
        "Compendium.pf2e.spells-srd.Item.lbrWMnS2pecKaSVB",
        "Compendium.pf2e.spells-srd.Item.lsR3RLEdBG4rcSzd",
        "Compendium.pf2e.spells-srd.Item.nXmC2Xx9WmS5NsAo",
        "Compendium.pf2e.spells-srd.Item.o6YCGx4lycsYpww4",
        "Compendium.pf2e.spells-srd.Item.pZTqGY1MLRjgKasV",
        "Compendium.pf2e.spells-srd.Item.pt3gEnzA159uHcJC",
        "Compendium.pf2e.spells-srd.Item.pwzdSlJgYqN7bs2w",
        "Compendium.pf2e.spells-srd.Item.q5qmNn144ZJGxnvJ",
        "Compendium.pf2e.spells-srd.Item.qTr2oCgIXl703Whb",
        "Compendium.pf2e.spells-srd.Item.qwlh6aDgi86U3Q7H",
        "Compendium.pf2e.spells-srd.Item.r4HLQcYwB62bTayl",
        "Compendium.pf2e.spells-srd.Item.sFwoKj0TsacsmoWj",
        "Compendium.pf2e.spells-srd.Item.vLA0q0WOK2YPuJs6",
        "Compendium.pf2e.spells-srd.Item.vLzFcIaSXs7YTIqJ",
        "Compendium.pf2e.spells-srd.Item.vTQvfYu2llKQedmY",
        "Compendium.pf2e.spells-srd.Item.vctIUOOgSmxAF0KG",
        "Compendium.pf2e.spells-srd.Item.wzctak6BxOW8xvFV",
        "Compendium.pf2e.spells-srd.Item.x5rGOmhDRDVQPrnW",
        "Compendium.pf2e.spells-srd.Item.x7SPrsRxGb2Vy2nu",
        "Compendium.pf2e.spells-srd.Item.x9RIFhquazom4p02",
        "Compendium.pf2e.spells-srd.Item.xRgU9rrhmGAgG4Rc",
        "Compendium.pf2e.spells-srd.Item.yH13KXUK2x093NUv",
        "Compendium.pf2e.spells-srd.Item.yM3KTTSAIHhyuP14",
        "Compendium.pf2e.spells-srd.Item.zlnXpME1T2uvn8Lr",
        "Compendium.pf2e.spells-srd.Item.zul5cBTfr7NXHBZf",
    ]);
}
