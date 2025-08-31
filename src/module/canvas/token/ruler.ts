import { TokenPF2e } from "./index.ts";

export class TokenRulerPF2e extends fc.placeables.tokens.TokenRuler<TokenPF2e> {
    static override WAYPOINT_LABEL_TEMPLATE = "systems/pf2e/templates/scene/token/waypoint-label.hbs";
}
