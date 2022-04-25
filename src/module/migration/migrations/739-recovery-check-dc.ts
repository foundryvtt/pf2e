import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

export class Migration739RecoveryCheckDC extends MigrationBase {
    static override version = 0.739;

    private toughness = [
        {
            key: "FlatModifier",
            selector: "hp",
            value: "@actor.level",
        },
        {
            key: "ActiveEffectLike",
            mode: "downgrade",
            path: "data.attributes.dying.recoveryDC",
            value: 9,
        },
    ];

    private defyDeath = [
        {
            key: "ActiveEffectLike",
            mode: "downgrade",
            predicate: { not: ["feat:toughness"] },
            path: "data.attributes.dying.recoveryDC",
            value: 9,
        },
        {
            key: "ActiveEffectLike",
            mode: "downgrade",
            predicate: { all: ["feat:toughness"] },
            path: "data.attributes.dying.recoveryDC",
            value: 8,
        },
    ];

    private mountainsStoutness = [
        {
            key: "FlatModifier",
            selector: "hp",
            type: "untyped",
            value: "@actor.level",
        },
        {
            key: "ActiveEffectLike",
            mode: "downgrade",
            predicate: { not: ["feat:toughness"] },
            path: "data.attributes.dying.recoveryDC",
            value: 9,
        },
        {
            key: "ActiveEffectLike",
            mode: "downgrade",
            predicate: { all: ["feat:toughness"] },
            path: "data.attributes.dying.recoveryDC",
            value: 6,
        },
    ];

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "feat") return;

        if (source.data.slug === "toughness") {
            source.data.rules = this.toughness;
            return;
        } else if (source.data.slug === "defy-death") {
            source.data.rules = this.defyDeath;
            return;
        } else if (source.data.slug === "mountains-stoutness") {
            source.data.rules = this.mountainsStoutness;
            return;
        }

        const { rules } = source.data;
        for (const rule of [...rules]) {
            if (rule.key === "RecoveryCheckDC") {
                source.data.rules.splice(rules.indexOf(rule), 1);
            }
        }
    }
}
