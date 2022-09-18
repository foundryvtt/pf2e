import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

/** Remove class AE-likes setting skill proficiencies to trained */
export class Migration789AddVersatileVialsRE extends MigrationBase {
    static override version = 0.789;

    methodologyResourceRE = {
        key: "ActiveEffectLike",
        mode: "upgrade",
        path: "system.resources.crafting.versatileVials.max",
        value: "floor((@actor.abilities.int.value - 10) / 2)",
    };

    methodologyOptionRE = {
        key: "ActiveEffectLike",
        mode: "override",
        path: "system.crafting.quickCraftingOptions.quickTincture",
        value: {
            infused: true,
            label: "PF2E.CraftingTab.ToggleQuickTincture",
            resource: "versatileVials",
        },
    };

    quickAlchemyOptionRE = {
        key: "ActiveEffectLike",
        mode: "override",
        path: "system.crafting.quickCraftingOptions.quickAlchemy",
        value: {
            infused: true,
            label: "PF2E.CraftingTab.ToggleQuickAlchemy",
            resource: "infusedReagents",
        },
    };

    discoveriesRE = {
        key: "ActiveEffectLike",
        mode: "add",
        path: "system.resources.crafting.versatileVials.max",
        priority: 41,
        value: {
            brackets: [
                {
                    end: 4,
                    start: 4,
                    value: 3,
                },
                {
                    end: 3,
                    start: 3,
                    value: 2,
                },
                {
                    end: 2,
                    start: 2,
                    value: 1,
                },
            ],
            field: "actor|system.skills.cra.rank",
        },
    };

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        switch (source.system.slug) {
            case "alchemical-sciences-methodology":
                if (
                    !source.system.rules.find(
                        (rule) => JSON.stringify(rule) === JSON.stringify(this.methodologyResourceRE)
                    )
                )
                    source.system.rules.push(this.methodologyResourceRE);
                if (
                    !source.system.rules.find(
                        (rule) => JSON.stringify(rule) === JSON.stringify(this.methodologyOptionRE)
                    )
                )
                    source.system.rules.push(this.methodologyOptionRE);
                break;
            case "alchemical-discoveries":
                if (!source.system.rules.find((rule) => JSON.stringify(rule) === JSON.stringify(this.discoveriesRE)))
                    source.system.rules.push(this.discoveriesRE);
                break;
            case "quick-alchemy":
                if (
                    !source.system.rules.find(
                        (rule) => JSON.stringify(rule) === JSON.stringify(this.quickAlchemyOptionRE)
                    ) &&
                    source.type === "feat"
                )
                    source.system.rules.push(this.quickAlchemyOptionRE);
                break;
        }
    }
}
