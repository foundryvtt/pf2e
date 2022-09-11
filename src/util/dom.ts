/**  DOM helper functions that return HTMLElement(s) (or `null`) */

import { Optional } from "./misc";

function htmlQuery<K extends keyof HTMLElementTagNameMap>(
    parent: Optional<Element | EventTarget>,
    selectors: K
): HTMLElementTagNameMap[K] | null;
function htmlQuery(parent: Optional<Element | EventTarget>, selectors: string): HTMLElement | null;
function htmlQuery<E extends HTMLElement = HTMLElement>(
    parent: Optional<Element | EventTarget>,
    selectors: string
): E | null;
function htmlQuery(parent: Optional<Element | EventTarget>, selectors: string): HTMLElement | null {
    if (!(parent instanceof Element)) return null;
    return parent.querySelector<HTMLElement>(selectors);
}

function htmlQueryAll<K extends keyof HTMLElementTagNameMap>(
    parent: Optional<Element | EventTarget>,
    selectors: K
): HTMLElementTagNameMap[K][] | null;
function htmlQueryAll(parent: Optional<Element | EventTarget>, selectors: string): HTMLElement[];
function htmlQueryAll<E extends HTMLElement = HTMLElement>(
    parent: Optional<Element | EventTarget>,
    selectors: string
): E[] | null;
function htmlQueryAll(parent: Optional<Element | EventTarget>, selectors: string): HTMLElement[] {
    if (!(parent instanceof Element)) return [];
    return Array.from(parent.querySelectorAll<HTMLElement>(selectors));
}

function htmlClosest<K extends keyof HTMLElementTagNameMap>(
    parent: Element | EventTarget | null,
    selectors: K
): HTMLElementTagNameMap[K] | null;
function htmlClosest(child: Element | EventTarget | null, selectors: string): HTMLElement | null;
function htmlClosest<E extends HTMLElement = HTMLElement>(
    parent: Element | EventTarget | null,
    selectors: string
): E | null;
function htmlClosest(child: Element | EventTarget | null, selectors: string): HTMLElement | null {
    if (!(child instanceof Element)) return null;
    return child.closest<HTMLElement>(selectors);
}

export { htmlClosest, htmlQuery, htmlQueryAll };
