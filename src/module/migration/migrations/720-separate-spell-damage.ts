import { MigrationBase } from "@module/migration/base";
import { ItemSourcePF2e } from "@item/data";
import { ActorSourcePF2e } from "@actor/data";
import { SpellDamage, SpellDamageType } from "@item/spell/data";
import { DamageDieSize } from "@system/damage/damage";

/** Separate spell damage into modifier, die size & dice count */
export class Migration720SeparateSpellDamage extends MigrationBase {
    static override version = 0.72;

    override async updateItem(source: ItemSourcePF2e, _actorSource?: ActorSourcePF2e): Promise<void> {
        if (source.type !== "spell") return;

        const damageValue = source.data.damage.value;
        const damageTerms = Object.values(damageValue).flatMap((damage) => this.damageTerms(damage));
        const keys = Object.keys(damageValue);

        damageTerms.forEach(function (damage, i) {
            damageValue[keys[i] ?? i.toString()] = damage;
        });
    }

    private damageTerms(damage: SpellDamage): SpellDamage[] {
        if (damage.diceNumber || damage.dieSize || damage.modifier) return [damage];
        if (!damage.value) return [{ ...damage, diceNumber: 0, dieSize: "d4", modifier: 0, value: "" }];

        const value = damage.value.replace(/\s+/g, "").replace(/#?persistent/g, "+persistent");
        return new ParseDamageValue(damage, value).result;
    }
}

class ParseDamageValue {
    private readonly base: SpellDamage;
    private value: string;
    result: SpellDamage[];

    constructor(base: SpellDamage, value: string) {
        this.base = base;
        this.value = value;
        this.result = [];

        this.parse();
    }

    private parse() {
        while (this.value) {
            const valueBefore = this.value;
            let damage: SpellDamage = { ...this.base, diceNumber: 0, dieSize: "d4", modifier: 0, value: "" };

            this.consume(/^(\d+)(d\d+)(\+|$)/, function (match) {
                damage = { ...damage, diceNumber: parseInt(match[1]), dieSize: match[2] as DamageDieSize };
            });

            this.consume(/^(\d+)(\+|$)/, function (match) {
                damage = { ...damage, modifier: parseInt(match[1]) };
            });

            this.consume(/^persistent(\+|$)/, function (_) {
                const type: SpellDamageType = { ...damage.type, subtype: "persistent" };
                damage = { ...damage, type };
            });

            if (this.value === valueBefore) {
                console.error("Couldn't parse ", this.base.value, "leftovers: ", this.value);
                return;
            }
            this.result.push(damage);
        }
    }

    private consume(regExp: RegExp, callback: (match: RegExpMatchArray) => void) {
        const match = this.value.match(regExp);
        if (!match) return;

        this.value = this.value.substring(match[0].length);
        callback(match);
    }
}
