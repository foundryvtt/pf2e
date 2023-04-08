import {
    SimpleAction,
    SimpleActionResult,
    SimpleActionUseOptions,
    SimpleActionVariant,
    SimpleActionVariantData,
} from "@actor/actions/index.ts";

class StandActionVariant extends SimpleActionVariant {
    override async use(options: Partial<SimpleActionUseOptions> = {}): Promise<SimpleActionResult[]> {
        return super.use(options).then(async (results) => {
            for (const result of results) {
                if (result.actor.hasCondition("prone")) {
                    await result.actor.toggleCondition("prone");
                }
            }
            return results;
        });
    }
}

class StandAction extends SimpleAction {
    constructor() {
        super({
            cost: 1,
            description: "PF2E.Actions.Stand.Description",
            name: "PF2E.Actions.Stand.Title",
            slug: "stand",
            traits: ["move"],
        });
    }

    protected override toActionVariant(data?: SimpleActionVariantData): SimpleActionVariant {
        return new StandActionVariant(this, data);
    }
}

const stand = new StandAction();

export { stand };
