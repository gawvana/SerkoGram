// ============================================================
// SerkoGram — Safe Arithmetic Expression Evaluator
// Evaluates mathematical expressions using a recursive-descent parser.
// ZERO use of eval(), Function(), or dynamic code execution.
// ============================================================

export function safeEvaluateArithmetic(input: string): number {
  if (!input || typeof input !== 'string') {
    throw new Error('Empty expression');
  }

  // Tokenize
  const sanitized = input.replace(/,/g, '.');
  const tokens: (string | number)[] = [];
  let i = 0;

  while (i < sanitized.length) {
    const char = sanitized[i];

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      let numStr = '';
      while (i < sanitized.length && /[0-9.]/.test(sanitized[i])) {
        numStr += sanitized[i];
        i++;
      }
      const num = parseFloat(numStr);
      if (isNaN(num)) {
        throw new Error(`Invalid number: ${numStr}`);
      }
      tokens.push(num);
      continue;
    }

    if ('+-*/%^()'.includes(char)) {
      tokens.push(char);
      i++;
      continue;
    }

    throw new Error(`Invalid character: ${char}`);
  }

  if (tokens.length === 0) {
    throw new Error('No tokens to evaluate');
  }

  let pos = 0;

  function peek(): string | number | undefined {
    return tokens[pos];
  }

  function consume(): string | number {
    return tokens[pos++];
  }

  // Expression -> Term (('+' | '-') Term)*
  function parseExpression(): number {
    let result = parseTerm();

    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const right = parseTerm();
      if (op === '+') {
        result += right;
      } else {
        result -= right;
      }
    }

    return result;
  }

  // Term -> Power (('*' | '/' | '%') Power)*
  function parseTerm(): number {
    let result = parsePower();

    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = consume();
      const right = parsePower();
      if (op === '*') {
        result *= right;
      } else if (op === '/') {
        if (right === 0) throw new Error('Division by zero');
        result /= right;
      } else if (op === '%') {
        if (right === 0) throw new Error('Modulo by zero');
        result %= right;
      }
    }

    return result;
  }

  // Power -> Factor ('^' Factor)*
  function parsePower(): number {
    let base = parseFactor();

    while (peek() === '^') {
      consume();
      const exp = parseFactor();
      base = Math.pow(base, exp);
    }

    return base;
  }

  // Factor -> ('+' | '-')? Primary
  function parseFactor(): number {
    if (peek() === '+') {
      consume();
      return parseFactor();
    }
    if (peek() === '-') {
      consume();
      return -parseFactor();
    }
    return parsePrimary();
  }

  // Primary -> Number | '(' Expression ')'
  function parsePrimary(): number {
    const token = peek();

    if (typeof token === 'number') {
      consume();
      return token;
    }

    if (token === '(') {
      consume(); // consume '('
      const val = parseExpression();
      if (consume() !== ')') {
        throw new Error('Missing closing parenthesis');
      }
      return val;
    }

    throw new Error(`Unexpected token: ${String(token)}`);
  }

  const finalResult = parseExpression();

  if (pos < tokens.length) {
    throw new Error(`Unexpected token at end: ${String(tokens[pos])}`);
  }

  if (typeof finalResult !== 'number' || isNaN(finalResult) || !isFinite(finalResult)) {
    throw new Error('Result is not a finite number');
  }

  return Math.round(finalResult * 1e10) / 1e10; // Round to 10 decimal places to eliminate floating point artifacts
}
