import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

/** Migrate Change Shape ChoiceSet label keys to use PF2E.ChangeShape.Form.* */
export class Migration959ChangeShapeLocalizationKeys extends MigrationBase {
    static override version = 0.959;

    #replaceStrings<T extends object | string>(data: T): T {
        return recursiveReplaceString(data, (s) =>
            s
                .replace(
                    /^PF2E\.NPCAbility\.ChangeShape\.Humanoid$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Humanoid.Humanoid",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.HumanoidSmall$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Humanoid.Small",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.HumanoidMedium$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Humanoid.Medium",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.HumanoidLarge$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Humanoid.Large",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.WingedHumanoid$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Humanoid.Winged",
                )

                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Animal$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Animal",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.AnimalAerial$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Aerial",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.AnimalAquatic$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Aquatic",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.AnimalMedium$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Medium",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.AnimalSmall$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Small",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.AnimalTiny$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Tiny",
                )

                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Ape$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Specific.Ape",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Bat$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Specific.Bat",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.BatGiant$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Specific.BatGiant",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Boar$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Specific.Boar",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Cobra$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Specific.Cobra",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Coyote$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Specific.Coyote",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Dog$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Specific.Dog",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Dove$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Specific.Dove",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Fish$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Specific.Fish",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Fox$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Specific.Fox",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Lizard$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Specific.Lizard",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Mantis$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Specific.Mantis",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Moose$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Specific.Moose",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Octopus$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Specific.Octopus",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.PorcupineGiant$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Specific.PorcupineGiant",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.RacoonDog$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Specific.RacoonDog",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Rat$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Specific.Rat",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Raven$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Specific.Raven",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Scorpion$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Specific.Scorpion",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Shark$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Specific.Shark",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Spider$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Specific.Spider",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Tiger$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Specific.Tiger",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Wolf$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Specific.Wolf",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.WolfDire$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Specific.WolfDire",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Wasp$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Specific.Wasp",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.WormCave$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Animal.Specific.WormCave",
                )

                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Human$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Ancestry.Human",
                )

                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Orc$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Ancestry.Orc",
                )

                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Cassisian$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Angel.Cassisian",
                )

                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Gancanagh$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Azata.Gancanagh",
                )

                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Cacodaemon$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Daemon.Cacodaemon",
                )

                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Miastrilek$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Demon.Miastrilek",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Succubus$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Demon.Succubus",
                )

                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Gylou$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Devil.Gylou",
                )
                .replaceAll(/^PF2E\.NPCAbility\.ChangeShape\.Form\.Imp$/g, "PF2E.NPCAbility.ChangeShape.Form.Devil.Imp")

                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Faydhaan$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Genie.Faydhaan",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Ifrit$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Genie.Ifrit",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Jaathoom$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Genie.Jaathoom",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Jabali$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Genie.Jabali",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Jann$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Genie.Jann",
                )

                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.DryadQueen$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Nymph.DryadQueen",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.HesperidQueen$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Nymph.HesperidQueen",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.LampadQueen$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Nymph.LampadQueen",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.NaiadQueen$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Nymph.NaiadQueen",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Nymph$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Nymph.Nymph",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Queen$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Nymph.Queen",
                )

                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Object\.InanimateTiny$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Object.Tiny",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.ObjectTiny$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Object.Tiny",
                )

                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Fungus$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Plant.Fungus",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Gourd$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Plant.Gourd",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Leshy$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Plant.Leshy",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.LeshyMob$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Plant.LeshyMob",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Mushroom$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Plant.Mushroom",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Plant$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Plant.Plant",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.SnappingFlytrap$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Plant.SnappingFlytrap",
                )

                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Azuretzi$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Protean.Azuretzi",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Keketar$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Protean.Keketar",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Voidworm$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Protean.Voidworm",
                )

                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Morrigna$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Psychopomp.Morrigna",
                )

                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.RajaKrodha$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Rakshasa.RajaKrodha",
                )
                .replaceAll(
                    /^PF2E\.NPCAbility\.ChangeShape\.Form\.Raktavarna$/g,
                    "PF2E.NPCAbility.ChangeShape.Form.Rakshasa.Raktavarna",
                ),
        );
    }

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        source.system = this.#replaceStrings(source.system);
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system = this.#replaceStrings(source.system);
    }
}
