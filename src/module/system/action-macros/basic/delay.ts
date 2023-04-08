import { SimpleAction } from "@actor/actions/index.ts";

const delay = new SimpleAction({
    cost: "free",
    description: "PF2E.Actions.Delay.Description",
    name: "PF2E.Actions.Delay.Title",
    slug: "delay",
});

export { delay };
