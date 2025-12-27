/** Shared types and utilities for attribute/ability builders */

import type { AttributeString } from "@actor/types.ts";
import type { KingdomAbility } from "@actor/party/kingdom/types.ts";

type BuilderAttribute = AttributeString | KingdomAbility;

interface BuilderButton {
    selected?: boolean;
    locked?: boolean;
    disabled?: boolean;
    partial?: boolean;
}

interface BoostFlawState {
    flaw?: BuilderButton;
    boost?: BuilderButton;
}

/** Creates a record of button states keyed by attribute */
function createButtonRecord<TAttr extends BuilderAttribute, TState extends BoostFlawState>(
    attributes: readonly TAttr[],
    builder: (attr: TAttr) => TState,
): Record<TAttr, TState> {
    return Object.fromEntries(attributes.map((attr) => [attr, builder(attr)])) as Record<TAttr, TState>;
}

export { createButtonRecord };
export type { BoostFlawState, BuilderAttribute, BuilderButton };
