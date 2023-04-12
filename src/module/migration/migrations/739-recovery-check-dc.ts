import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

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
            path: "system.attributes.dying.recoveryDC",
            value: 9,
        },
    ];

    private defyDeath = [
        {
            key: "ActiveEffectLike",
            mode: "downgrade",
            predicate: { not: ["feat:toughness"] },
            path: "system.attributes.dying.recoveryDC",
            value: 9,
        },
        {
            key: "ActiveEffectLike",
            mode: "downgrade",
            predicate: { all: ["feat:toughness"] },
            path: "system.attributes.dying.recoveryDC",
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
            path: "system.attributes.dying.recoveryDC",
            value: 9,
        },
        {
            key: "ActiveEffectLike",
            mode: "downgrade",
            predicate: { all: ["feat:toughness"] },
            path: "system.attributes.dying.recoveryDC",
            value: 6,
        },
    ];

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "feat") return;

        if (source.system.slug === "toughness") {
            source.system.rules = this.toughness;
            return;
        } else if (source.system.slug === "defy-death") {
            source.system.rules = this.defyDeath;
            return;
        } else if (source.system.slug === "mountains-stoutness") {
            source.system.rules = this.mountainsStoutness;
            return;
        }

        const { rules } = source.system;
        for (const rule of [...rules]) {
            if (rule.key === "RecoveryCheckDC") {
                source.system.rules.splice(rules.indexOf(rule), 1);
            }
        }
    }
}
