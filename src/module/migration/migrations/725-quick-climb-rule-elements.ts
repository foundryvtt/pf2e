import { ItemSourcePF2e } from "@item/data";
import { RuleElementSource } from "@module/rules";
import { MigrationBase } from "../base";

/** Predicate rule elements related to crafting entries to protect against partial entry data getting created */
export class Migration725QuickClimbREs extends MigrationBase {
    static override version = 0.725;

    private quickClimb: MaybeNote[] = [
        {
            key: "BaseSpeed",
            predicate: {
                all: ["self:skill:ath:rank:4"],
            },
            selector: "climb",
            value: "@actor.attributes.speed.value",
        },
        {
            key: "Note",
            predicate: {
                all: ["action:climb"],
            },
            selector: "athletics",
            text: '<p class="compact-text"><strong>{item|name}</strong> You move 5 more feet on a success, and 10 more feet on a critical success.</p>',
        },
    ];

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "feat" && source.data.slug === "quick-climb") {
            source.data.rules = deepClone(this.quickClimb);
        }
    }
}

interface MaybeNote extends RuleElementSource {
    text?: string;
}
