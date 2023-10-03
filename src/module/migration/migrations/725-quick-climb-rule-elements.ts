import { ItemSourcePF2e } from "@item/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { MigrationBase } from "../base.ts";

/** Predicate rule elements related to crafting entries to protect against partial entry data getting created */
export class Migration725QuickClimbREs extends MigrationBase {
    static override version = 0.725;

    private quickClimb: NoteOrBaseSpeed[] = [
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
        if (source.type === "feat" && source.system.slug === "quick-climb") {
            source.system.rules = deepClone(this.quickClimb);
        }
    }
}

interface NoteOrBaseSpeed extends RuleElementSource {
    selector?: string;
    text?: string;
}
