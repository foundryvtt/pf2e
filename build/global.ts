import { JSDOM } from "jsdom";

const { window } = new JSDOM();
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.HTMLParagraphElement = window.HTMLParagraphElement;
globalThis.Text = window.Text;
(globalThis as { SYSTEM_ROOT?: string }).SYSTEM_ROOT = "systems/pf2e";
