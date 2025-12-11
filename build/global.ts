import { JSDOM, type DOMWindow } from "jsdom";

declare namespace globalThis {
    let document: Window["document"];
    let HTMLElement: DOMWindow["HTMLElement"];
    let HTMLParagraphElement: DOMWindow["HTMLParagraphElement"];
    let Text: DOMWindow["Text"];
    let SYSTEM_ID: SystemId;
    let SYSTEM_ROOT: `systems/${SystemId}`;
}

const { document, HTMLElement, HTMLParagraphElement, Text } = new JSDOM().window;
globalThis.document = document;
globalThis.HTMLElement = HTMLElement;
globalThis.HTMLParagraphElement = HTMLParagraphElement;
globalThis.Text = Text;
globalThis.SYSTEM_ID = "pf2e";
globalThis.SYSTEM_ROOT = "systems/pf2e";
