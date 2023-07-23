import { SpellPF2e } from "@item";
import { ItemSourcePF2e, SpellSource } from "@item/data/index.ts";
import { sluggify } from "@util";
import { UUIDUtils } from "@util/uuid.ts";
import { MigrationBase } from "../base.ts";

/** Handle spells gaining fixed level heightening */
export class Migration747FixedHeightening extends MigrationBase {
    static override version = 0.747;

    override async updateItem(item: ItemSourcePF2e): Promise<void> {
        if (item.type !== "spell") return;

        const isAcidSplash = (item.system.slug ?? sluggify(item.name)) === "acid-splash";
        if (item.system.heightening?.type === "fixed" && !isAcidSplash) return;

        const sourceId = item.flags.core?.sourceId;
        if (sourceId && this.fixedHeightenSpells.has(sourceId)) {
            const spells = await this.loadSpells();
            const spell = spells[sourceId];
            if (spell && spell.system.heightening?.type === "fixed") {
                item.system.heightening = spell.system.heightening;
                this.overwriteDamage(item, spell);
            }
        }
    }

    protected overwriteDamage(spell: SpellSource, newSpell: SpellPF2e): void {
        const newDamage = newSpell.system.damage;
        const newKeys = new Set(Object.keys(newDamage.value));
        const diff = Object.keys(spell.system.damage.value).filter((key) => !newKeys.has(key));
        const damage: { value: Record<string, unknown> } = spell.system.damage;
        damage.value = newDamage.value;
        for (const deleteKey of diff) {
            damage.value[`-=${deleteKey}`] = null;
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
        "Compendium.pf2e.spells-srd.0fKHBh5goe2eiFYL",
        "Compendium.pf2e.spells-srd.10VcmSYNBrvBphu1",
        "Compendium.pf2e.spells-srd.2gQYrCPwBmwau26O",
        "Compendium.pf2e.spells-srd.2iQKhCQBijhj5Rf3",
        "Compendium.pf2e.spells-srd.4koZzrnMXhhosn0D",
        "Compendium.pf2e.spells-srd.5WM3WjshXgrkVCg6",
        "Compendium.pf2e.spells-srd.7CUgqHunmHfW2lC5",
        "Compendium.pf2e.spells-srd.7OFKYR1VY6EXDuiR",
        "Compendium.pf2e.spells-srd.9s5tqqXNzcoKamWx",
        "Compendium.pf2e.spells-srd.BCuHKrDeJ4eq53M6",
        "Compendium.pf2e.spells-srd.CxpFy4HJHf4ACbxF",
        "Compendium.pf2e.spells-srd.D2nPKbIS67m9199U",
        "Compendium.pf2e.spells-srd.DCQHaLrYXMI37dvW",
        "Compendium.pf2e.spells-srd.DgcSiOCR1uDXGaEA",
        "Compendium.pf2e.spells-srd.EfFMLVbmkBWmzoLF",
        "Compendium.pf2e.spells-srd.Et8RSCLx8w7uOLvo",
        "Compendium.pf2e.spells-srd.F23T5tHPo3WsFiHW",
        "Compendium.pf2e.spells-srd.FhOaQDTSnsY7tiam",
        "Compendium.pf2e.spells-srd.Fr58LDSrbndgld9n",
        "Compendium.pf2e.spells-srd.GaRQlC9Yw1BGKHfN",
        "Compendium.pf2e.spells-srd.HGmBY8KjgLV97nUp",
        "Compendium.pf2e.spells-srd.HHGUBGle4OjoxvNR",
        "Compendium.pf2e.spells-srd.HTou8cG05yuSkesj",
        "Compendium.pf2e.spells-srd.HWrNMQENi9WSGbnF",
        "Compendium.pf2e.spells-srd.HcIAQZjNXHemoXSU",
        "Compendium.pf2e.spells-srd.Ifc2b6bNVdjKV7Si",
        "Compendium.pf2e.spells-srd.JHntYF0SbaWKq7wR",
        "Compendium.pf2e.spells-srd.LQzlKbYjZSMFQawP",
        "Compendium.pf2e.spells-srd.LiGbewa9pO0yjbsY",
        "Compendium.pf2e.spells-srd.Llx0xKvtu8S4z6TI",
        "Compendium.pf2e.spells-srd.Mkbq9xlAUxHUHyR2",
        "Compendium.pf2e.spells-srd.OAt2ZEns1gIOCgrn",
        "Compendium.pf2e.spells-srd.OhD2Z6rIGGD5ocZA",
        "Compendium.pf2e.spells-srd.PRrZ7anETWPm90YY",
        "Compendium.pf2e.spells-srd.PjhUmyKnq6K5uDby",
        "Compendium.pf2e.spells-srd.Popa5umI3H33levx",
        "Compendium.pf2e.spells-srd.Pwq6T7xpfAJXV5aj",
        "Compendium.pf2e.spells-srd.Q7QQ91vQtyi1Ux36",
        "Compendium.pf2e.spells-srd.Seaah9amXg70RKw2",
        "Compendium.pf2e.spells-srd.U58aQWJ47VrI36yP",
        "Compendium.pf2e.spells-srd.UmXhuKrYZR3W16mQ",
        "Compendium.pf2e.spells-srd.VTb0yI6P1bLkzuRr",
        "Compendium.pf2e.spells-srd.VlNcjmYyu95vOUe8",
        "Compendium.pf2e.spells-srd.W02bHXylIpoXbO4e",
        "Compendium.pf2e.spells-srd.WsUwpfmhKrKwoIe3",
        "Compendium.pf2e.spells-srd.Wt94cw03L77sbud7",
        "Compendium.pf2e.spells-srd.XhgMx9WC6NfXd9RP",
        "Compendium.pf2e.spells-srd.ZAX0OOcKtYMQlquR",
        "Compendium.pf2e.spells-srd.ZqmP9gijBmK7y8Xy",
        "Compendium.pf2e.spells-srd.aIHY2DArKFweIrpf",
        "Compendium.pf2e.spells-srd.atlgGNI1E1Ox3O3a",
        "Compendium.pf2e.spells-srd.bay4AfSu2iIozNNW",
        "Compendium.pf2e.spells-srd.czO0wbT1i320gcu9",
        "Compendium.pf2e.spells-srd.dINQzhqGmIsqGMUY",
        "Compendium.pf2e.spells-srd.drmvQJETA3WZzXyw",
        "Compendium.pf2e.spells-srd.e36Z2t6tLdW3RUzZ",
        "Compendium.pf2e.spells-srd.fprqWKUc0jnMIyGU",
        "Compendium.pf2e.spells-srd.gISYsBFby1TiXfBt",
        "Compendium.pf2e.spells-srd.ivKnEtI1z4UqEKIA",
        "Compendium.pf2e.spells-srd.kuoYff1csM5eAcAP",
        "Compendium.pf2e.spells-srd.lbrWMnS2pecKaSVB",
        "Compendium.pf2e.spells-srd.lsR3RLEdBG4rcSzd",
        "Compendium.pf2e.spells-srd.nXmC2Xx9WmS5NsAo",
        "Compendium.pf2e.spells-srd.o6YCGx4lycsYpww4",
        "Compendium.pf2e.spells-srd.pZTqGY1MLRjgKasV",
        "Compendium.pf2e.spells-srd.pt3gEnzA159uHcJC",
        "Compendium.pf2e.spells-srd.pwzdSlJgYqN7bs2w",
        "Compendium.pf2e.spells-srd.q5qmNn144ZJGxnvJ",
        "Compendium.pf2e.spells-srd.qTr2oCgIXl703Whb",
        "Compendium.pf2e.spells-srd.qwlh6aDgi86U3Q7H",
        "Compendium.pf2e.spells-srd.r4HLQcYwB62bTayl",
        "Compendium.pf2e.spells-srd.sFwoKj0TsacsmoWj",
        "Compendium.pf2e.spells-srd.vLA0q0WOK2YPuJs6",
        "Compendium.pf2e.spells-srd.vLzFcIaSXs7YTIqJ",
        "Compendium.pf2e.spells-srd.vTQvfYu2llKQedmY",
        "Compendium.pf2e.spells-srd.vctIUOOgSmxAF0KG",
        "Compendium.pf2e.spells-srd.wzctak6BxOW8xvFV",
        "Compendium.pf2e.spells-srd.x5rGOmhDRDVQPrnW",
        "Compendium.pf2e.spells-srd.x7SPrsRxGb2Vy2nu",
        "Compendium.pf2e.spells-srd.x9RIFhquazom4p02",
        "Compendium.pf2e.spells-srd.xRgU9rrhmGAgG4Rc",
        "Compendium.pf2e.spells-srd.yH13KXUK2x093NUv",
        "Compendium.pf2e.spells-srd.yM3KTTSAIHhyuP14",
        "Compendium.pf2e.spells-srd.zlnXpME1T2uvn8Lr",
        "Compendium.pf2e.spells-srd.zul5cBTfr7NXHBZf",
    ]);
}
