import {
    SimpleAction,
    SimpleActionResult,
    SimpleActionUseOptions,
    SimpleActionVariant,
    SimpleActionVariantData,
} from "@actor/actions/index.ts";

class DropProneActionVariant extends SimpleActionVariant {
    override async use(options: Partial<SimpleActionUseOptions> = {}): Promise<SimpleActionResult[]> {
        return super.use(options).then(async (results) => {
            for (const result of results) {
                if (!result.actor.hasCondition("prone")) {
                    await result.actor.toggleCondition("prone");
                }
            }
            return results;
        });
    }
}

class DropProneAction extends SimpleAction {
    constructor() {
        super({
            cost: 1,
            description: "PF2E.Actions.DropProne.Description",
            name: "PF2E.Actions.DropProne.Title",
            slug: "drop-prone",
            traits: ["move"],
        });
    }

    protected override toActionVariant(data?: SimpleActionVariantData): SimpleActionVariant {
        return new DropProneActionVariant(this, data);
    }
}

const dropProne = new DropProneAction();

export { dropProne };
