{{
  function createNumericTerm(number, flavor = null) {
    const obj = {
      class: "NumericTerm",
      number,
      formula: number.toString(),
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
      ...elements.filter((e) => typeof e === "number" || e instanceof Object && e.class)
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

Term = head:TermOperand tail:(_ ("*" / "/") _ TermOperand)* {
  return tail.reduce((result, elements) => {
    const operator = elements[1];
    const operands = [
      result,
      ...elements.filter((e) => typeof e === "number" || e instanceof Object && e.class)
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

MathTerm = fn:Identifier "(" _ head:FunctionArg? _ tail:(_ "," _ @FunctionArg)* _ ")" {
  return {
    class: "MathTerm",
    formula: text(),
    fn,
    terms: head ? [head, ...tail].map((t) => t.formula) : [],
    evaluated: false,
  };
};

FunctionArg = DiceTerm / Grouping / Number / MathTerm;

DiceTerm = number:(Grouping / Number) [dD] faces:(Grouping / Number / Identifier) flavor:Flavor? {
  const obj = {
    class: "DiceTerm",
    formula: text(),
    number,
    faces,
    evaluated: false,
  };
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

Pool = "{" _ head:Expression tail:("," _ @Expression)* "}" modifiers:ModifiersString* flavor:Flavor? {
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
    class: "PoolTerm",
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
  const numified = Math.trunc(Number(text()));
  return input === text() ? createNumericTerm(numified) : numified;
};

FlavoredNumber = number:Number flavor:Flavor {
  return createNumericTerm(number, flavor);
};

Identifier = $([a-z$_]i [a-z$_0-9]i*);

ModifiersString "modifiers" = [^ (){}\[\]+\-*/]+ {
  return Array.from(text().matchAll(/([A-z]+)([^A-z\s()+\-*\/]+)?/g)).map((m) => m[0]);
};

FlavorString "string" = [^\[\]]+;

_ "whitespace" = [ ]*;
