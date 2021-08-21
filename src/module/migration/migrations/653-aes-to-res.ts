import { AbilityString, ActorSourcePF2e } from "@actor/data";
import { ClassSource, ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";
import { RuleElementSource } from "@module/rules/rules-data-definitions";
import { CharacterProficiencyData } from "@actor/character/data";

/** Remove `ActiveEffect`s from classes, convert AE changes on several item types to AE-likes */
export class Migration653AEstoREs extends MigrationBase {
    static override version = 0.653;

    /** Remove the AE if the originating item is a class and is modifying any of the below property paths */
    private pathsToRemove = new Set([
        ...["unarmored", "light", "medium", "heavy"].map((category) => `data.martial.${category}.rank`),
        ...["unarmed", "simple", "martial", "advanced"].map((category) => `data.martial.${category}.rank`),
        ...["fortitude", "reflex", "will"].map((save) => `data.saves.${save}.rank`),
        "data.details.keyability.value",
        "data.attributes.perception.rank",
        "data.attributes.classDC.rank",
    ]);

    private isRemovableAE(effect: foundry.data.ActiveEffectSource): boolean {
        return effect.changes.every(this.isRemoveableChange);
    }

    private isRemoveableChange(change: foundry.data.EffectChangeSource) {
        return (
            (change.mode !== 0 && Number.isInteger(Number(change.value))) ||
            (change.mode === 5 && !change.value.startsWith("{"))
        );
    }

    private fixClassKeyAbilities(classSource: ClassSource): void {
        type MaybeOldKeyAbility = { value: AbilityString[] | { value: AbilityString }[] };
        const keyAbility: MaybeOldKeyAbility = classSource.data.keyAbility;
        keyAbility.value = keyAbility.value.map((value) => (typeof value === "string" ? value : value.value));
    }

    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        if (actorSource.type !== "character") return;
        const systemData: { martial: Record<string, CharacterProficiencyData> } = actorSource.data;
        systemData.martial = {}; // Only remove on compendium JSON

        // Remove transferred ActiveEffects, some of which will be converted to RuleElements
        actorSource.effects = actorSource.effects.filter((effect) => {
            const origin = effect.origin ?? "";
            const itemId = /(?<=Item\.)[a-z0-9]{16}$/i.exec(origin)?.[0];
            const itemSource = actorSource.items.find((maybeSource) => maybeSource._id === itemId);
            return itemSource && !(["class", "effect", "feat"].includes(itemSource.type) && this.isRemovableAE(effect));
        });
    }

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (!(itemSource.type === "class" || itemSource.type === "effect" || itemSource.type === "feat")) return;

        if (itemSource.type === "class") this.fixClassKeyAbilities(itemSource);

        // Collect changes from item and recreate some as rule elements
        const modes = { 1: "multiply", 2: "add", 3: "downgrade", 4: "upgrade", 5: "override" };

        for (const effect of [...itemSource.effects]) {
            // Remove any handled by class data
            if (itemSource.type === "class") {
                effect.changes = effect.changes.filter((change) => !this.pathsToRemove.has(change.key));
            }

            // Turn what remains into AE-Like rule elements
            const toAELikes = effect.changes.filter(this.isRemoveableChange);
            const rules: Array<RuleElementSource & { [key: string]: unknown }> = itemSource.data.rules;
            for (const change of toAELikes) {
                if (change.mode === 0) continue;
                rules.push({
                    key: "ActiveEffectLike",
                    path: change.key,
                    mode: modes[change.mode],
                    value: Number.isNaN(Number(change.value)) ? change.value : Number(change.value),
                    priority: change.priority,
                });
            }

            // Remove the ActiveEffect unless complex changes are present
            effect.changes = effect.changes.filter((change) => !this.isRemoveableChange(change));
        }
        itemSource.effects = itemSource.effects.filter((effect) => !this.isRemovableAE(effect));
    }
}
