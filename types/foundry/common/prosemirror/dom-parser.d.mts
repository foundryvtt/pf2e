import { DOMParser as BaseDOMParser, ParseOptions } from "prosemirror-model";

export default class DOMParser extends BaseDOMParser {
    override parse(dom: Node, options?: ParseOptions): ProseMirror.Node;

    static override fromSchema(schema: ProseMirror.Schema): DOMParser;
}
