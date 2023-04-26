import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Remove links to deleted compendium items */
export class Migration830BarbarianRework extends MigrationBase {
    static override version = 0.83;

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
            .replace("@UUID[Compendium.pf2e.classfeatures.vlRvOQS1HZZqSyh7]{Ape}", "Ape")
            .replace("@UUID[Compendium.pf2e.classfeatures.uGY2yddm8mZx8Yo2]{Bear}", "Bear")
            .replace("@UUID[Compendium.pf2e.classfeatures.31sPXwmEbbcvgsM9]{Bull}", "Bull")
            .replace("@UUID[Compendium.pf2e.classfeatures.vCNtX2LwlemhA3tu]{Cat}", "Cat")
            .replace("@UUID[Compendium.pf2e.classfeatures.RQUJgDjJODO775qb]{Deer}", "Deer")
            .replace("@UUID[Compendium.pf2e.classfeatures.CXZwt1e6ManeBaFV]{Frog}", "Frog")
            .replace("@UUID[Compendium.pf2e.classfeatures.OJmI1L4dhQfz8vze]{Shark}", "Shark")
            .replace("@UUID[Compendium.pf2e.classfeatures.pIYWMCNnYDQfSRQh]{Snake}", "Snake")
            .replace("@UUID[Compendium.pf2e.classfeatures.xX6KnYYgHlPGoTG6]{Wolf}", "Wolf")
            .replace("@UUID[Compendium.pf2e.classfeatures.VNbDNiWjARtGQQAs]{Black}", "Black")
            .replace("@UUID[Compendium.pf2e.classfeatures.RiOww9KMu06D7wtW]{Blue}", "Blue")
            .replace("@UUID[Compendium.pf2e.classfeatures.IezPDYlweTtwCqkT]{Green}", "Green")
            .replace("@UUID[Compendium.pf2e.classfeatures.hyHgLQCDMSrR4RfE]{Red}", "Red")
            .replace("@UUID[Compendium.pf2e.classfeatures.2esqOHCn4GcZ4zYD]{White}", "White")
            .replace("@UUID[Compendium.pf2e.classfeatures.b5rvKZQCfpgBenKJ]{Brass}", "Brass")
            .replace("@UUID[Compendium.pf2e.classfeatures.kdzIxHpzeRbdRqQA]{Bronze}", "Bronze")
            .replace("@UUID[Compendium.pf2e.classfeatures.1ZugTzJHsa94AZRW]{Copper}", "Copper")
            .replace("@UUID[Compendium.pf2e.classfeatures.3lxIGMbsPZLNEXQ7]{Gold}", "Gold")
            .replace("@UUID[Compendium.pf2e.classfeatures.Z2eWkfXblU0QxFx1]{Silver}", "Silver")
            .replace("@UUID[Compendium.pf2e.classfeatures.Ape Animal Instinct]{Ape}", "Ape")
            .replace("@UUID[Compendium.pf2e.classfeatures.Bear Animal Instinct]{Bear}", "Bear")
            .replace("@UUID[Compendium.pf2e.classfeatures.Bull Animal Instinct]{Bull}", "Bull")
            .replace("@UUID[Compendium.pf2e.classfeatures.Cat Animal Instinct]{Cat}", "Cat")
            .replace("@UUID[Compendium.pf2e.classfeatures.Deer Animal Instinct]{Deer}", "Deer")
            .replace("@UUID[Compendium.pf2e.classfeatures.Frog Animal Instinct]{Frog}", "Frog")
            .replace("@UUID[Compendium.pf2e.classfeatures.Shark Animal Instinct]{Shark}", "Shark")
            .replace("@UUID[Compendium.pf2e.classfeatures.Snake Animal Instinct]{Snake}", "Snake")
            .replace("@UUID[Compendium.pf2e.classfeatures.Wolf Animal Instinct]{Wolf}", "Wolf")
            .replace("@UUID[Compendium.pf2e.classfeatures.Black Dragon Instinct]{Black}", "Black")
            .replace("@UUID[Compendium.pf2e.classfeatures.Blue Dragon Instinct]{Blue}", "Blue")
            .replace("@UUID[Compendium.pf2e.classfeatures.Green Dragon Instinct]{Green}", "Green")
            .replace("@UUID[Compendium.pf2e.classfeatures.Red Dragon Instinct]{Red}", "Red")
            .replace("@UUID[Compendium.pf2e.classfeatures.White Dragon Instinct]{White}", "White")
            .replace("@UUID[Compendium.pf2e.classfeatures.Brass Dragon Instinct]{Brass}", "Brass")
            .replace("@UUID[Compendium.pf2e.classfeatures.Bronze Dragon Instinct]{Bronze}", "Bronze")
            .replace("@UUID[Compendium.pf2e.classfeatures.Copper Dragon Instinct]{Copper}", "Copper")
            .replace("@UUID[Compendium.pf2e.classfeatures.Gold Dragon Instinct]{Gold}", "Gold")
            .replace("@UUID[Compendium.pf2e.classfeatures.Silver Dragon Instinct]{Silver}", "Silver");
    }
}
