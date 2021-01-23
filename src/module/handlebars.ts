export function registerHandlebarsHelpers() {
    Handlebars.registerHelper('pad', (value, length, character) => {
        return `${value}`.padStart(length, character);
    });

    Handlebars.registerHelper('add', (a, b) => {
        return a + b;
    });

    Handlebars.registerHelper('if_all', (...args) => {
        const opts = args.pop();

        let { fn } = opts;
        for (let i = 0; i < args.length; ++i) {
            if (args[i]) continue;
            fn = opts.inverse;
            break;
        }

        return fn();
    });

    Handlebars.registerHelper('any', (...args) => {
        const opts = args.pop();
        return args.some((v) => !!v) ? opts : opts.inverse;
    });

    Handlebars.registerHelper('not', (arg) => {
        return !arg;
    });

    Handlebars.registerHelper('lower', (str) => {
        return String.prototype.toLowerCase.call(str ?? '');
    });

    Handlebars.registerHelper('multiply', (a, b) => {
        return a * b;
    });

    Handlebars.registerHelper('percentage', (value, max) => {
        return (max / 100) * value;
    });

    Handlebars.registerHelper('strip_tags', (value, options) => {
        // eslint-disable-next-line camelcase
        function strip_tags(input, allowed?) {
            const _phpCastString = (phpValue) => {
                const type = typeof phpValue;
                switch (type) {
                    case 'boolean':
                        return phpValue ? '1' : '';
                    case 'string':
                        return phpValue;
                    case 'number':
                        if (Number.isNaN(phpValue)) {
                            return 'NAN';
                        }

                        if (!Number.isFinite(phpValue)) {
                            return `${phpValue < 0 ? '-' : ''}INF`;
                        }

                        return `${phpValue}`;
                    case 'undefined':
                        return '';
                    case 'object':
                        if (Array.isArray(phpValue)) {
                            return 'Array';
                        }

                        if (phpValue !== null) {
                            return 'Object';
                        }

                        return '';
                    case 'function':
                    // fall through
                    default:
                        throw new Error('Unsupported value type');
                }
            };

            // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
            allowed = (`${allowed || ''}`.toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join('');

            const tags = /<\/?([a-z0-9]*)\b[^>]*>?/gi;
            const commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;

            let after = _phpCastString(input);
            // removes tha '<' char at the end of the string to replicate PHP's behaviour
            after = after.substring(after.length - 1) === '<' ? after.substring(0, after.length - 1) : after;

            // recursively remove tags to ensure that the returned string doesn't contain forbidden tags after previous passes (e.g. '<<bait/>switch/>')
            while (true) {
                const before = after;
                after = before
                    .replace(commentsAndPhpTags, '')
                    .replace(tags, ($0, $1) => (allowed.indexOf(`<${$1.toLowerCase()}>`) > -1 ? $0 : ''));

                // return once no more tags are removed
                if (before === after) {
                    return after;
                }
            }
        }

        return strip_tags(String(value));
    });

    Handlebars.registerHelper('enrichHTML', (html) => {
        return TextEditor.enrichHTML(html);
    });

    Handlebars.registerHelper('json', (html) => {
        return JSON.stringify(html);
    });
}
