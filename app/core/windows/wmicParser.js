function peg$subclass(child, parent) {
  function ctor() {
    this.constructor = child;
  }
  ctor.prototype = parent.prototype;
  // @ts-ignore
  child.prototype = new ctor();
}

function peg$SyntaxError(message, expected, found, location) {
  this.message = message;
  this.expected = expected;
  this.found = found;
  this.location = location;
  this.name = 'SyntaxError';

  if (typeof Error.captureStackTrace === 'function') {
    Error.captureStackTrace(this, peg$SyntaxError);
  }
}

peg$subclass(peg$SyntaxError, Error);

peg$SyntaxError.buildMessage = function(expected, found) {
  const DESCRIBE_EXPECTATION_FNS = {
    literal: function(expectation) {
      return '"' + literalEscape(expectation.text) + '"';
    },

    class: function(expectation) {
      let escapedParts = '',
        i;

      for (i = 0; i < expectation.parts.length; i++) {
        escapedParts +=
          expectation.parts[i] instanceof Array
            ? classEscape(expectation.parts[i][0]) +
              '-' +
              classEscape(expectation.parts[i][1])
            : classEscape(expectation.parts[i]);
      }

      return '[' + (expectation.inverted ? '^' : '') + escapedParts + ']';
    },

    any: function(expectation) {
      return 'any character';
    },

    end: function(expectation) {
      return 'end of input';
    },

    other: function(expectation) {
      return expectation.description;
    },
  };

  function hex(ch) {
    return ch
      .charCodeAt(0)
      .toString(16)
      .toUpperCase();
  }

  function literalEscape(s) {
    return s
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\0/g, '\\0')
      .replace(/\t/g, '\\t')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/[\x00-\x0F]/g, function(ch) {
        return '\\x0' + hex(ch);
      })
      .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
        return '\\x' + hex(ch);
      });
  }

  function classEscape(s) {
    return s
      .replace(/\\/g, '\\\\')
      .replace(/\]/g, '\\]')
      .replace(/\^/g, '\\^')
      .replace(/-/g, '\\-')
      .replace(/\0/g, '\\0')
      .replace(/\t/g, '\\t')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/[\x00-\x0F]/g, function(ch) {
        return '\\x0' + hex(ch);
      })
      .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
        return '\\x' + hex(ch);
      });
  }

  function describeExpectation(expectation) {
    return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
  }

  function describeExpected(expected) {
    let descriptions = new Array(expected.length),
      i,
      j;

    for (i = 0; i < expected.length; i++) {
      descriptions[i] = describeExpectation(expected[i]);
    }

    descriptions.sort();

    if (descriptions.length > 0) {
      for (i = 1, j = 1; i < descriptions.length; i++) {
        if (descriptions[i - 1] !== descriptions[i]) {
          descriptions[j] = descriptions[i];
          j++;
        }
      }
      descriptions.length = j;
    }

    switch (descriptions.length) {
      case 1:
        return descriptions[0];

      case 2:
        return descriptions[0] + ' or ' + descriptions[1];

      default:
        return (
          descriptions.slice(0, -1).join(', ') +
          ', or ' +
          descriptions[descriptions.length - 1]
        );
    }
  }

  function describeFound(found) {
    return found ? '"' + literalEscape(found) + '"' : 'end of input';
  }

  return (
    'Expected ' +
    describeExpected(expected) +
    ' but ' +
    describeFound(found) +
    ' found.'
  );
};

function peg$parse(input, options) {
  options = options !== void 0 ? options : {};

  let peg$FAILED = {},
    peg$startRuleFunctions = { Start: peg$parseStart },
    peg$startRuleFunction = peg$parseStart,
    peg$c0 = peg$anyExpectation(),
    peg$c1 = function(headers, GPUS) {
      // Hack for length of last header: last header is not long enough
      headers[headers.length - 1] += ' '.repeat(1000);

      const output = [];
      for (const gpuIndex in GPUS) {
        output[gpuIndex] = {};
        let offset = 0;
        for (const key of headers) {
          output[gpuIndex][key.trim()] = GPUS[gpuIndex]
            .substr(offset, key.length)
            .trim();
          offset += key.length;
        }
      }
      return output;
    },
    peg$c2 = function(l) {
      return l;
    },
    peg$c3 = function(w) {
      return w.join('');
    },
    peg$c4 = function(fs, w, ls) {
      return fs.join('') + w.join('') + ls.join('');
    },
    peg$c5 = /^[^ \r\n\t]/,
    peg$c6 = peg$classExpectation([' ', '\r', '\n', '\t'], true, false),
    peg$c7 = function(c) {
      return c;
    },
    peg$c8 = /^[\n\r\u2028\u2029]/,
    peg$c9 = peg$classExpectation(
      ['\n', '\r', '\u2028', '\u2029'],
      false,
      false
    ),
    peg$c10 = peg$otherExpectation('whitespace'),
    peg$c11 = '\t',
    peg$c12 = peg$literalExpectation('\t', false),
    peg$c13 = '\x0B',
    peg$c14 = peg$literalExpectation('\x0B', false),
    peg$c15 = '\f',
    peg$c16 = peg$literalExpectation('\f', false),
    peg$c17 = ' ',
    peg$c18 = peg$literalExpectation(' ', false),
    peg$c19 = '\xA0',
    peg$c20 = peg$literalExpectation('\xA0', false),
    peg$c21 = '\uFEFF',
    peg$c22 = peg$literalExpectation('\uFEFF', false),
    peg$c23 = /^[ \xA0\u1680\u2000-\u200A\u202F\u205F\u3000]/,
    peg$c24 = peg$classExpectation(
      [
        ' ',
        '\xA0',
        '\u1680',
        ['\u2000', '\u200A'],
        '\u202F',
        '\u205F',
        '\u3000',
      ],
      false,
      false
    ),
    peg$currPos = 0,
    peg$savedPos = 0,
    peg$posDetailsCache = [{ line: 1, column: 1 }],
    peg$maxFailPos = 0,
    peg$maxFailExpected = [],
    peg$silentFails = 0,
    peg$result;

  if ('startRule' in options) {
    if (!(options.startRule in peg$startRuleFunctions)) {
      throw new Error(
        'Can\'t start parsing from rule "' + options.startRule + '".'
      );
    }

    peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
  }

  function text() {
    return input.substring(peg$savedPos, peg$currPos);
  }

  function location() {
    return peg$computeLocation(peg$savedPos, peg$currPos);
  }

  function expected(description, location) {
    location =
      location !== void 0
        ? location
        : peg$computeLocation(peg$savedPos, peg$currPos);

    throw peg$buildStructuredError(
      [peg$otherExpectation(description)],
      input.substring(peg$savedPos, peg$currPos),
      location
    );
  }

  function error(message, location) {
    location =
      location !== void 0
        ? location
        : peg$computeLocation(peg$savedPos, peg$currPos);

    throw peg$buildSimpleError(message, location);
  }

  function peg$literalExpectation(text, ignoreCase) {
    return { type: 'literal', text: text, ignoreCase: ignoreCase };
  }

  function peg$classExpectation(parts, inverted, ignoreCase) {
    return {
      type: 'class',
      parts: parts,
      inverted: inverted,
      ignoreCase: ignoreCase,
    };
  }

  function peg$anyExpectation() {
    return { type: 'any' };
  }

  function peg$endExpectation() {
    return { type: 'end' };
  }

  function peg$otherExpectation(description) {
    return { type: 'other', description: description };
  }

  function peg$computePosDetails(pos) {
    let details = peg$posDetailsCache[pos],
      p;

    if (details) {
      return details;
    } else {
      p = pos - 1;
      while (!peg$posDetailsCache[p]) {
        p--;
      }

      details = peg$posDetailsCache[p];
      details = {
        line: details.line,
        column: details.column,
      };

      while (p < pos) {
        if (input.charCodeAt(p) === 10) {
          details.line++;
          details.column = 1;
        } else {
          details.column++;
        }

        p++;
      }

      peg$posDetailsCache[pos] = details;
      return details;
    }
  }

  function peg$computeLocation(startPos, endPos) {
    let startPosDetails = peg$computePosDetails(startPos),
      endPosDetails = peg$computePosDetails(endPos);

    return {
      start: {
        offset: startPos,
        line: startPosDetails.line,
        column: startPosDetails.column,
      },
      end: {
        offset: endPos,
        line: endPosDetails.line,
        column: endPosDetails.column,
      },
    };
  }

  function peg$fail(expected) {
    if (peg$currPos < peg$maxFailPos) {
      return;
    }

    if (peg$currPos > peg$maxFailPos) {
      peg$maxFailPos = peg$currPos;
      peg$maxFailExpected = [];
    }

    peg$maxFailExpected.push(expected);
  }

  function peg$buildSimpleError(message, location) {
    return new peg$SyntaxError(message, null, null, location);
  }

  function peg$buildStructuredError(expected, found, location) {
    return new peg$SyntaxError(
      peg$SyntaxError.buildMessage(expected, found),
      expected,
      found,
      location
    );
  }

  function peg$parseStart() {
    let s0;

    s0 = peg$parseProgram();

    return s0;
  }

  function peg$parseProgram() {
    let s0, s1, s2, s3, s4;

    s0 = peg$currPos;
    s1 = peg$parseHeaders();
    if (s1 !== peg$FAILED) {
      s2 = peg$parseGPUS();
      if (s2 !== peg$FAILED) {
        s3 = [];
        if (input.length > peg$currPos) {
          s4 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$c0);
          }
        }
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          if (input.length > peg$currPos) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$c0);
            }
          }
        }
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c1(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseHeaders() {
    let s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parseLine();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$parseLineTerminator();
      if (s3 !== peg$FAILED) {
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parseLineTerminator();
        }
      } else {
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c2(s1);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseGPUS() {
    let s0, s1, s2;

    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parseMergedLine();
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parseMergedLine();
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c2(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parseLine() {
    let s0, s1;

    s0 = [];
    s1 = peg$parseUntrimmedWord();
    if (s1 !== peg$FAILED) {
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        s1 = peg$parseUntrimmedWord();
      }
    } else {
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseMergedLine() {
    let s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parseUntrimmedWord();
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parseUntrimmedWord();
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$parseLineTerminator();
      if (s3 !== peg$FAILED) {
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parseLineTerminator();
        }
      } else {
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c3(s1);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseUntrimmedWord() {
    let s0, s1, s2, s3, s4;

    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parseWhiteSpace();
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      s2 = peg$parseWhiteSpace();
    }
    if (s1 === peg$FAILED) {
      s1 = null;
    }
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$parseChar();
      if (s3 !== peg$FAILED) {
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parseChar();
        }
      } else {
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        s3 = [];
        s4 = peg$parseWhiteSpace();
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          s4 = peg$parseWhiteSpace();
        }
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c4(s1, s2, s3);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseChar() {
    let s0, s1;

    s0 = peg$currPos;
    if (peg$c5.test(input.charAt(peg$currPos))) {
      s1 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$c6);
      }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c7(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parseLineTerminator() {
    let s0;

    if (peg$c8.test(input.charAt(peg$currPos))) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$c9);
      }
    }

    return s0;
  }

  function peg$parseWhiteSpace() {
    let s0, s1;

    peg$silentFails++;
    if (input.charCodeAt(peg$currPos) === 9) {
      s0 = peg$c11;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$c12);
      }
    }
    if (s0 === peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 11) {
        s0 = peg$c13;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c14);
        }
      }
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 12) {
          s0 = peg$c15;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$c16);
          }
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 32) {
            s0 = peg$c17;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$c18);
            }
          }
          if (s0 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 160) {
              s0 = peg$c19;
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$c20);
              }
            }
            if (s0 === peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 65279) {
                s0 = peg$c21;
                peg$currPos++;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$c22);
                }
              }
              if (s0 === peg$FAILED) {
                s0 = peg$parseZs();
              }
            }
          }
        }
      }
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$c10);
      }
    }

    return s0;
  }

  function peg$parseZs() {
    let s0;

    if (peg$c23.test(input.charAt(peg$currPos))) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$c24);
      }
    }

    return s0;
  }

  peg$result = peg$startRuleFunction();

  if (peg$result !== peg$FAILED && peg$currPos === input.length) {
    return peg$result;
  } else {
    if (peg$result !== peg$FAILED && peg$currPos < input.length) {
      peg$fail(peg$endExpectation());
    }

    throw peg$buildStructuredError(
      peg$maxFailExpected,
      peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
      peg$maxFailPos < input.length
        ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
        : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
    );
  }
}

export { peg$parse as parseWmicOutput, peg$SyntaxError as SyntaxError };
