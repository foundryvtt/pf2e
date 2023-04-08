import { SimpleAction } from "@actor/actions";

const stand = new SimpleAction({
    cost: 1,
    description: "PF2E.Actions.Stand.Description",
    name: "PF2E.Actions.Stand.Title",
    slug: "stand",
    traits: ["move"],
});

export { stand };
