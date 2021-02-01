import { ActionGlyph } from '../system/actions/actions';

const template = document.createElement('template');
template.innerHTML = `<slot></slot>`;

export class PF2ActionElement extends HTMLElement {
    action?: Function;
    glyph?: ActionGlyph;
    variant?: string;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get tagName(): string {
        return 'pf2-action';
    }

    onClick(event: Event) {
        if (this.action) {
            this.action({
                event,
                glyph: this.glyph,
                variant: this.variant,
            });
        }
    }

    ///////////////////////////////////////////////////////////////////////////
    // Web Component methods
    ///////////////////////////////////////////////////////////////////////////

    static get observedAttributes(): string[] {
        return ['action', 'glyph', 'variant'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'action':
                this.action = game.pf2e.actions[newValue];
                break;
            case 'glyph':
                this.glyph = newValue;
                break;
            case 'variant':
                this.variant = newValue;
                break;
        }
    }

    connectedCallback() {
        // wrapped in a null check to please the linter
        if (this.shadowRoot) {
            this.shadowRoot.appendChild(template.content.cloneNode(true));
            this.shadowRoot.addEventListener('click', this.onClick.bind(this));
        }
    }

    disconnectedCallback() {
        // wrapped in a null check to please the linter
        if (this.shadowRoot) {
            this.shadowRoot.removeEventListener('click', this.onClick.bind(this));
        }
    }
}

window.customElements.define(PF2ActionElement.tagName, PF2ActionElement);
