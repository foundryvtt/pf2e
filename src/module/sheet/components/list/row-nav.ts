/**
 * Up and Down walk the row name buttons (`data-row-name`) across a whole list, nested rows included, as a faster
 * alternative to Tab. Put it on the list wrapper's keydown. It only acts when a row name has focus. The buttons
 * also need `data-keyboard-focus`, or core pans the canvas on every arrow press.
 */
function rowNameNav(event: KeyboardEvent & { currentTarget: HTMLElement }): void {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const target = event.target;
    if (!(target && fu.isElementInstanceOf(target, HTMLElement)) || !target.hasAttribute("data-row-name")) return;
    event.preventDefault();
    const names = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[data-row-name]"));
    names[names.indexOf(target) + (event.key === "ArrowDown" ? 1 : -1)]?.focus();
}

export { rowNameNav };
