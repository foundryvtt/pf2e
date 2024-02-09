import { SimpleAction } from "@actor/actions/index.ts";

const leap = new SimpleAction({
    cost: 1,
    description: "PF2E.Actions.Leap.Description",
    name: "PF2E.Actions.Leap.Title",
    section: "basic",
    slug: "leap",
    traits: ["move"],
});

export { leap };
