import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

/** Remove links to deleted compendium items */
export class Migration829BarbarianRework extends MigrationBase {
    static override version = 0.829;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system.description.value = this.#removeLinks(source.system.description.value);

        for (const rule of source.system.rules) {
            if (
                rule.key === "ActiveEffectLike" &&
                "path" in rule &&
                (rule.path === "system.custom.modifiers.barbarian-dedication-count" ||
                    rule.path === "flags.pf2e.rollOptions.all.barbarian-dedication")
            ) {
                rule.path = "flags.pf2e.barbarian.archetypeFeatCount";
            }

            if (
                rule.key === "FlatModifier" &&
                rule.value === "3 * @actor.system.custom.modifiers.barbarian-dedication-count"
            ) {
                rule.value = "3 * @actor.flags.pf2e.barbarian.archetypeFeatCount";
            }
        }
    }

    #removeLinks(text: string): string {
        return text
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.vlRvOQS1HZZqSyh7\]{Ape}\b/g, "Ape")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.uGY2yddm8mZx8Yo2\]{Bear}\b/g, "Bear")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.31sPXwmEbbcvgsM9\]{Bull}\b/g, "Bull")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.vCNtX2LwlemhA3tu\]{Cat}\b/g, "Cat")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.RQUJgDjJODO775qb\]{Deer}\b/g, "Deer")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.CXZwt1e6ManeBaFV\]{Frog}\b/g, "Frog")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.OJmI1L4dhQfz8vze\]{Shark}\b/g, "Shark")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.pIYWMCNnYDQfSRQh\]{Snake}\b/g, "Snake")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.xX6KnYYgHlPGoTG6\]{Wolf}\b/g, "Wolf")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.VNbDNiWjARtGQQAs\]{Black}\b/g, "Black")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.RiOww9KMu06D7wtW\]{Blue}\b/g, "Blue")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.IezPDYlweTtwCqkT\]{Green}\b/g, "Green")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.hyHgLQCDMSrR4RfE\]{Red}\b/g, "Red")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.2esqOHCn4GcZ4zYD\]{White}\b/g, "White")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.b5rvKZQCfpgBenKJ\]{Brass}\b/g, "Brass")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.kdzIxHpzeRbdRqQA\]{Bronze}\b/g, "Bronze")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.1ZugTzJHsa94AZRW\]{Copper}\b/g, "Copper")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.3lxIGMbsPZLNEXQ7\]{Gold}\b/g, "Gold")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.Z2eWkfXblU0QxFx1\]{Silver}\b/g, "Silver")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.Ape Animal Instinct\]{Ape}\b/g, "Ape")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.Bear Animal Instinct\]{Bear}\b/g, "Bear")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.Bull Animal Instinct\]{Bull}\b/g, "Bull")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.Cat Animal Instinct\]{Cat}\b/g, "Cat")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.Deer Animal Instinct\]{Deer}\b/g, "Deer")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.Frog Animal Instinct\]{Frog}\b/g, "Frog")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.Shark Animal Instinct\]{Shark}\b/g, "Shark")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.Snake Animal Instinct\]{Snake}\b/g, "Snake")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.Wolf Animal Instinct\]{Wolf}\b/g, "Wolf")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.Black Dragon Instinct\]{Black}\b/g, "Black")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.Blue Dragon Instinct\]{Blue}\b/g, "Blue")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.Green Dragon Instinct\]{Green}\b/g, "Green")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.Red Dragon Instinct\]{Red}\b/g, "Red")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.White Dragon Instinct\]{White}\b/g, "White")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.Brass Dragon Instinct\]{Brass}\b/g, "Brass")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.Bronze Dragon Instinct\]{Bronze}\b/g, "Bronze")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.Copper Dragon Instinct\]{Copper}\b/g, "Copper")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.Gold Dragon Instinct\]{Gold}\b/g, "Gold")
            .replace(/\b@UUID\[Compendium\.pf2e\.classfeatures\.Silver Dragon Instinct\]{Silver}\b/g, "Silver");
    }
}
