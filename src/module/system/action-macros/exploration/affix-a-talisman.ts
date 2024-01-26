import { SimpleAction } from "@actor/actions/index.ts";

const affixATalisman = new SimpleAction({
    description: "PF2E.Actions.AffixATalisman.Description",
    name: "PF2E.Actions.AffixATalisman.Title",
    slug: "affix-a-talisman",
    traits: ["exploration", "manipulate"],
});

export { affixATalisman };
