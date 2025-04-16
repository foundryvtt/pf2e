export interface RollOptions {
    [key: string]: unknown;
    flavor?: string | null;
}

export interface DiceTermResult {
    /** The numeric result */
    result: number;
    /** Is this result active, contributing to the total? */
    active?: boolean;
    /** A value that the result counts as, otherwise the result is not used directly as */
    count?: number;
    /** Does this result denote a success? */
    success?: boolean;
    /** Does this result denote a failure? */
    failure?: boolean;
    /** Was this result discarded? */
    discarded?: boolean;
    /** Was this result rerolled? */
    rerolled?: boolean;
    /** Was this result exploded? */
    exploded?: boolean;
}

/* -------------------------------------------- */
/*  Roll Parsing Types                          */
/* -------------------------------------------- */

export interface RollParseNode {
    /** The class name for this node. */
    class: string;
    /** The original matched text for this node. */
    formula: string;
}

export interface RollParseTreeNode extends RollParseNode {
    /** The binary operator */
    operator: string;
    /** The two operands. */
    operands: [RollParseNode, RollParseNode];
}

export interface FlavorRollParseNode extends RollParseNode {
    options: {
        /** Flavor text associated with the node. */
        flavor: string;
    };
}

export interface ModifiersRollParseNode extends FlavorRollParseNode {
    /** The matched modifiers string. */
    modifiers: string;
}

export interface NumericRollParseNode extends FlavorRollParseNode {
    /** The number. */
    number: number;
}

export interface FunctionRollParseNode {
    /** The function name. */
    fn: string;
    /** The arguments to the function. */
    terms: RollParseNode[];
}

export interface PoolRollParseNode extends ModifiersRollParseNode {
    /** The pool terms. */
    terms: RollParseNode[];
}

export interface ParentheticalRollParseNode extends FlavorRollParseNode {
    /** The inner parenthetical term. */
    term: string;
}

export interface StringParseNode extends FlavorRollParseNode {
    /** The unclassified string term. */
    term: string;
}

export interface DiceRollParseNode extends ModifiersRollParseNode {
    /** The number of dice. */
    number: number | ParentheticalRollParseNode;
    /** The number of faces or a string denomination like "c" or "f". */
    faces: string | number | ParentheticalRollParseNode;
}

export type RollParseArg = null | number | string | RollParseNode | RollParseArg[];
