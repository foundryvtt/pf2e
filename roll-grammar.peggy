{{
  function createNumericTerm(number, { flavor = null, truncate = false } = {}) {
    number = truncate ? Math.trunc(number) : number;
    const formula = flavor ? `${number}[${flavor}]` : number.toString();
    const obj = {
      class: "NumericTerm",
      number,
      formula,
      evaluated: false,
    };
    if (flavor) obj.options = { flavor };

    return obj;
  }
}}

Expression = head:(Pool / Term) tail:(_ ("+" / "-") _ (Pool / Term))* {
  return tail.reduce((result, elements) => {
    const operator = elements[1];
    const operands = [
      result,
      elements.find((e) => typeof e === "number" || e instanceof Object && e.class)
    ].map((e) => typeof e === "number" ? createNumericTerm(e, { truncate: true }) : e);
    return {
      class: "ArithmeticExpression",
      formula: text(),
      operator,
      operands,
      evaluated: false,
    };
  }, head);
};

Term = head:TermOperand tail:(_ ("*" / "/") _ TermOperand)* {
  return tail.reduce((result, elements) => {
    const operator = elements[1];
    const operands = [
      result,
      elements.find((e) => typeof e === "number" || e instanceof Object && e.class)
    ].map((e) => typeof e === "number" ? createNumericTerm(e) : e);

    return {
      class: "ArithmeticExpression",
      formula: text(),
      operator,
      operands,
      evaluated: false,
    };
  }, head);
};

TermOperand = DiceTerm / MathTerm / Grouping / FlavoredNumber / Number;

MathTerm = fn:Identifier "(" _ head:Expression? _ tail:(_ "," _ @Expression)* _ ")" {
  const terms = head !== null
    ? [head, ...tail].map((t) => typeof t === "number" ? t.toString() : t.formula)
    : [];
  return {
    class: "MathTerm",
    formula: text(),
    fn,
    terms,
    evaluated: false,
  };
};

DiceTerm = number:(Grouping / MathTerm / Number)? [dD] faces:(Grouping / MathTerm / Number / Identifier) modifiers:Modifiers? flavor:Flavor? {
  const obj =
    number instanceof Object || faces instanceof Object
      ? {
            class: "IntermediateDie",
            formula: text(),
            number: typeof number === "number" ? createNumericTerm(number) : number,
            faces: typeof faces === "number" ? createNumericTerm(faces) : faces,
            evaluated: false,
        }
      : {
            class: "DiceTerm",
            formula: text(),
            number: number ?? 1,
            faces,
            evaluated: false,
        };

  if (modifiers) obj.modifiers = modifiers;
  if (flavor) obj.options = { flavor };

  return obj;
};

Grouping = "(" _ expression:Expression _ ")" flavor:Flavor? {
  const obj = {
    class: "Grouping",
    formula: text(),
    term: typeof expression === "number" ? createNumericTerm(expression) : expression,
    evaluated: false,
  };
  if (flavor) obj.options = { flavor };

  return obj;
};

Pool = "{" _ head:Expression tail:("," _ @Expression)* "}" modifiers:Modifiers? flavor:Flavor? {
  const headTerm = typeof head === "number" ? createNumericTerm(head) : head;
  const tailTerms = tail.map((t) => typeof t === "number" ? createNumericTerm(t) : t);
  const terms = [headTerm.formula, ...tailTerms.map((t) => t.formula)];
  const firstRoll = {
    class: "DamageInstance",
    formula: headTerm.formula,
    terms: [headTerm],
    evaluated: false
  };
  if (headTerm.options?.flavor) {
    firstRoll.options = { flavor: headTerm.options.flavor };
  }

  const rolls = [
    firstRoll,
    ...tailTerms.map((term) => {
      const obj = {
        class: "DamageInstance",
        formula: term.formula,
        terms: [term],
        evaluated: false,
      };
      if (term.options?.flavor) {
        obj.options = { flavor: term.options.flavor };
      }

      return obj;
    }),
  ];

  const obj = {
    class: "InstancePool",
    formula: text(),
    terms,
    rolls,
    evaluated: false,
  };

  if (flavor) obj.options = { flavor };
  if (modifiers) obj.modifiers = modifiers;

  return obj;
};

Flavor = "[" string:$(FlavorString) "]" {
  return string;
};

Number = _ [-+]? [0-9]+ ("." [0-9]+)? {
  const numified = Number(text());
  return input === text() ? createNumericTerm(numified) : numified;
};

FlavoredNumber = number:Number flavor:Flavor {
  return createNumericTerm(number, { flavor });
};

Identifier = $([a-z$_]i [a-z$_0-9]i*);

Modifiers = [^ (){}\[\]+\-*/,]+ {
  return Array.from(text().matchAll(/([A-z]+)([^A-z\s()+\-*\/]+)?/g)).map((m) => m[0]);
};

FlavorString "string" = [^\[\]]+;

_ "whitespace" = [ ]*;
