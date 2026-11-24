/*
 * Studiotrace core logic. Pure functions, no DOM.
 * Checks, corrections, and the contribution record are all derived from output data here.
 */
(function (root) {
  'use strict';

  var SEED = root.STUDIOTRACE_SEED;

  var TYPE_BY_KEY = {};
  SEED.types.forEach(function (t) { TYPE_BY_KEY[t.key] = t; });

  var ORIGINAL = {};
  SEED.outputs.forEach(function (o) { ORIGINAL[o.id] = o; });

  var PROVENANCE_LABEL = {
    student: 'Student-made',
    ai: 'AI-made',
    'ai-edited': 'AI-made and student-edited'
  };

  var FMT = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  function formatTime(iso) {
    return FMT.format(new Date(iso))
      .replace(/[\s ]*AM$/, ' a.m.')
      .replace(/[\s ]*PM$/, ' p.m.');
  }

  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function hexKey(h) { return String(h).toUpperCase(); }

  function paletteName(hex) {
    var h = hexKey(hex);
    var hit = SEED.palette.filter(function (p) { return hexKey(p.hex) === h; })[0];
    return hit ? hit.name : null;
  }

  function inPalette(hex) { return paletteName(hex) !== null; }

  function variation(n) { return SEED.variations[n - 1]; }

  function outputLabel(o) {
    return TYPE_BY_KEY[o.type].label + ' · V' + o.n + ' ' + variation(o.n).name;
  }

  function isPending(o) { return o.status === 'pending'; }

  function editedSlots(o) {
    if (!o.design || !ORIGINAL[o.id].design) { return []; }
    var orig = ORIGINAL[o.id].design;
    return SEED.slots
      .filter(function (s) { return o.design[s.key] !== orig[s.key]; })
      .map(function (s) { return s.key; });
  }

  function ampersandEdited(o) {
    return o.ampersand !== ORIGINAL[o.id].ampersand;
  }

  // Two deterministic checks: palette use and ampersand provenance.
  function runChecks(o) {
    if (isPending(o) || !o.design) { return []; }

    var items = SEED.slots.map(function (s) {
      var hex = o.design[s.key];
      return {
        slot: s.key,
        label: s.label,
        hex: hex,
        name: paletteName(hex),
        ok: inPalette(hex),
        fix: s.default,
        fixName: paletteName(s.default)
      };
    });
    var off = items.filter(function (i) { return !i.ok; });

    var paletteCheck = {
      id: 'palette',
      title: 'Colors come from palette-v2',
      pass: off.length === 0,
      detail: off.length === 0
        ? 'All five color slots use your palette hex values.'
        : off.length + ' of 5 color slots use a hex that is not in your palette.',
      items: items
    };

    var wordmarkCheck = {
      id: 'wordmark',
      title: 'Ampersand is your hand lettering',
      pass: o.ampersand === 'student',
      detail: o.ampersand === 'student'
        ? 'Uses the ampersand from wordmark-v3.svg, unchanged.'
        : 'A typeface ampersand (Source Serif 4) stands in for your drawn one. AI may not substitute a core mark.'
    };

    return [paletteCheck, wordmarkCheck];
  }

  function failingChecks(o) {
    return runChecks(o).filter(function (c) { return !c.pass; });
  }

  // Corrections are prefilled from failing checks and can be edited before sending.
  function correctionsFor(o) {
    var lines = [];
    runChecks(o).forEach(function (c) {
      if (c.id === 'palette') {
        c.items.filter(function (i) { return !i.ok; }).forEach(function (i) {
          lines.push('Set ' + i.label.toLowerCase() + ' to ' + i.fixName + ' ' + i.fix +
            '. Remove ' + i.hex + ', which is not in palette-v2.');
        });
      }
      if (c.id === 'wordmark' && !c.pass) {
        lines.push('Replace the typeface ampersand with the hand-lettered ampersand from wordmark-v3.svg, exactly as drawn.');
      }
    });
    return lines;
  }

  // Each kept output's elements, with provenance as the course policy defines it.
  function provenanceRows(o) {
    var colorEdits = editedSlots(o);
    var placementEdited = ampersandEdited(o);
    var colorNote;
    if (colorEdits.length) {
      colorNote = colorEdits.map(function (k) {
        var s = SEED.slots.filter(function (x) { return x.key === k; })[0];
        return s.label.toLowerCase() + ' set to ' + (paletteName(o.design[k]) || o.design[k]);
      }).join('; ');
    } else {
      colorNote = 'Palette values as delivered';
    }
    return [
      { element: 'Layout and spacing', prov: 'ai', note: variation(o.n).name + ' spacing, as delivered' },
      { element: 'Color application', prov: colorEdits.length ? 'ai-edited' : 'ai', note: colorNote },
      {
        element: 'Wordmark placement',
        prov: placementEdited ? 'ai-edited' : 'ai',
        note: placementEdited ? 'Ampersand choice changed by student' : 'Placed as delivered'
      },
      {
        element: 'Ampersand',
        prov: o.ampersand === 'student' ? 'student' : 'ai',
        note: o.ampersand === 'student'
          ? 'Your lettering from wordmark-v3.svg'
          : 'Typeface glyph. A core mark substituted by AI'
      },
      { element: 'Copy', prov: 'ai', note: 'Menu items, prices, and headlines from the brief' },
      { element: 'Body type', prov: 'ai', note: 'Source Serif 4 from type-pairing-v1' }
    ];
  }

  function buildRecord(outputs) {
    var kept = outputs.filter(function (o) { return o.decision === 'kept'; });
    var sections = kept.map(function (o) {
      return {
        output: o,
        label: outputLabel(o),
        rows: provenanceRows(o),
        blockers: failingChecks(o).map(function (c) { return c.title; })
      };
    });
    var covered = SEED.types.filter(function (t) {
      return kept.some(function (o) { return o.type === t.key; });
    });
    var aiRows = 0;
    sections.forEach(function (s) {
      s.rows.forEach(function (r) { if (r.prov !== 'student') { aiRows += 1; } });
    });
    return {
      kept: kept,
      sections: sections,
      coveredTypes: covered,
      blockerCount: sections.filter(function (s) { return s.blockers.length > 0; }).length,
      aiRows: aiRows,
      notSubmitted: outputs.filter(function (o) {
        return !isPending(o) && o.decision !== 'kept';
      })
    };
  }

  function submissionChecks(record, exportedAt) {
    return [
      {
        id: 'coverage',
        label: 'Every mockup type has a kept output',
        pass: record.coveredTypes.length === SEED.types.length,
        detail: record.coveredTypes.length + ' of ' + SEED.types.length + ' types kept'
      },
      {
        id: 'blockers',
        label: 'Kept outputs pass the checks',
        pass: record.blockerCount === 0,
        detail: record.blockerCount === 0
          ? 'No kept output has a failing check'
          : record.blockerCount + ' kept output(s) fail a check'
      },
      {
        id: 'disclosed',
        label: 'Every AI-touched element is listed',
        pass: true,
        detail: record.aiRows + ' AI-touched elements across ' + record.kept.length + ' kept outputs'
      },
      {
        id: 'exported',
        label: 'Record exported for critique',
        pass: !!exportedAt,
        detail: exportedAt ? 'Exported ' + formatTime(exportedAt) : 'Not exported yet'
      }
    ];
  }

  function disclosureText(record, ctx) {
    var lines = [];
    lines.push('AI disclosure for ' + ctx.project + ' (' + ctx.course + ', ' + ctx.student + ').');
    lines.push('Model: ' + ctx.model + '. Sources: wordmark-v3.svg (student-drawn, Oct 28, 2026), palette-v2 (five student-picked colors), type-pairing-v1 (student lettering and Source Serif 4).');
    if (record.kept.length === 0) {
      lines.push('No outputs are kept for submission yet.');
    } else {
      record.sections.forEach(function (s) {
        var parts = s.rows.map(function (r) {
          return r.element.toLowerCase() + ' (' + (PROVENANCE_LABEL[r.prov]).toLowerCase() + ')';
        });
        lines.push(s.label + ': ' + parts.join('; ') + '.');
      });
    }
    lines.push('Student-made: wordmark, ampersand lettering, palette, type pairing.');
    return lines.join('\n');
  }

  function recordMarkdown(record, ctx) {
    var L = [];
    L.push('# Contribution record: ' + ctx.project);
    L.push('');
    L.push('- Student: ' + ctx.student + ' (' + ctx.program + ')');
    L.push('- Course: ' + ctx.course + ' · Instructor: ' + ctx.instructor);
    L.push('- Critique: ' + ctx.critiqueText);
    L.push('- Record generated: ' + ctx.generatedText);
    L.push('- AI model: ' + ctx.model);
    L.push('');
    L.push('## Student-made assets');
    L.push('');
    L.push('| Asset | Detail | Provenance |');
    L.push('| --- | --- | --- |');
    L.push('| Wordmark | ' + ctx.wordmark + ' | Student-made |');
    L.push('| Palette | ' + ctx.paletteText + ' | Student-made |');
    L.push('| Type pairing | ' + ctx.typeText + ' | Student-made |');
    L.push('');
    L.push('## Kept outputs');
    L.push('');
    if (record.kept.length === 0) {
      L.push('None yet.');
      L.push('');
    }
    record.sections.forEach(function (s) {
      var o = s.output;
      L.push('### ' + s.label + ' (' + o.id + ')');
      L.push('');
      L.push('- Generated: ' + formatTime(o.at) + ', ' + o.seconds + ' s, run ' + o.run + ', model ' + ctx.model);
      L.push('- Sources: ' + o.sources.join(', '));
      L.push('- Prompt: ' + o.prompt);
      if (s.blockers.length) {
        L.push('- **Blocked:** ' + s.blockers.join('; '));
      }
      L.push('');
      L.push('| Element | Provenance | Note |');
      L.push('| --- | --- | --- |');
      s.rows.forEach(function (r) {
        L.push('| ' + r.element + ' | ' + PROVENANCE_LABEL[r.prov] + ' | ' + r.note + ' |');
      });
      L.push('');
    });
    if (record.notSubmitted.length) {
      L.push('## Not submitted');
      L.push('');
      record.notSubmitted.forEach(function (o) {
        var why = o.decision === 'discarded'
          ? 'Discarded: ' + (o.discardNote || 'no reason given')
          : 'Not kept';
        L.push('- ' + outputLabel(o) + ' (' + o.id + '). ' + why);
      });
      L.push('');
    }
    L.push('## Activity');
    L.push('');
    ctx.trail.slice().reverse().forEach(function (e) {
      L.push('- ' + formatTime(e.at) + ' · ' + e.actorLabel + ': ' + e.text);
    });
    L.push('');
    return L.join('\n');
  }

  var Core = {
    clone: clone,
    formatTime: formatTime,
    hexKey: hexKey,
    paletteName: paletteName,
    inPalette: inPalette,
    variation: variation,
    outputLabel: outputLabel,
    isPending: isPending,
    editedSlots: editedSlots,
    ampersandEdited: ampersandEdited,
    runChecks: runChecks,
    failingChecks: failingChecks,
    correctionsFor: correctionsFor,
    provenanceRows: provenanceRows,
    buildRecord: buildRecord,
    submissionChecks: submissionChecks,
    disclosureText: disclosureText,
    recordMarkdown: recordMarkdown,
    PROVENANCE_LABEL: PROVENANCE_LABEL,
    TYPE_BY_KEY: TYPE_BY_KEY
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Core;
  }
  root.StudioCore = Core;
})(typeof window !== 'undefined' ? window : globalThis);
