import { DOMParser as BaseDOMParser, ParseOptions, Node as ProseMirrorNode, Schema } from "prosemirror-model";

export default class DOMParser extends BaseDOMParser {
    override parse(dom: Node, options?: ParseOptions): ProseMirrorNode;

    static override fromSchema(schema: Schema): DOMParser;
}
