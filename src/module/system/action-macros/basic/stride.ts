import { SimpleAction } from "@actor/actions";

const stride = new SimpleAction({
    cost: 1,
    description: "PF2E.Actions.Stride.Description",
    name: "PF2E.Actions.Stride.Title",
    slug: "stride",
    traits: ["move"],
});

export { stride };
