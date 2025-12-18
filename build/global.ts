import { JSDOM } from "jsdom";

const { document, HTMLElement, HTMLParagraphElement, Text } = new JSDOM().window;
globalThis.document = document;
globalThis.HTMLElement = HTMLElement;
globalThis.HTMLParagraphElement = HTMLParagraphElement;
globalThis.Text = Text;
