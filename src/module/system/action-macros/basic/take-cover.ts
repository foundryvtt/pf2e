import { SimpleAction } from "@actor/actions/index.ts";

const takeCover = new SimpleAction({
    cost: 1,
    description: "PF2E.Actions.TakeCover.Description",
    effect: "Compendium.pf2e.other-effects.I9lfZUiCwMiGogVi", // Effect: Cover
    img: "systems/pf2e/icons/conditions-2/status_acup.webp",
    name: "PF2E.Actions.TakeCover.Title",
    slug: "take-cover",
});

export { takeCover };
