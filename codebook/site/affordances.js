(() => {
  const begin = (marble) => {
    const TRANSIENT = 'data-marble-transient';
    const ID = 'data-marble-id';

    const isTransient = (el) => el.hasAttribute(TRANSIENT);
    const persistentChildren = (el) => [...el.children].filter((c) => !isTransient(c));

    function nextPersistentSibling(el) {
      let sibling = el.nextElementSibling;
      while (sibling && isTransient(sibling)) sibling = sibling.nextElementSibling;
      return sibling;
    }

    // An element can hold several roles at once — a beat is both editable and a
    // sortable item — so wiring is tracked per role, not per element.
    const roles = new WeakMap();
    function claim(el, role) {
      const held = roles.get(el) ?? new Set();
      if (held.has(role)) return false;
      held.add(role);
      roles.set(el, held);
      return true;
    }

    const within = (root, selector) => [
      ...(root.matches?.(selector) ? [root] : []),
      ...root.querySelectorAll(selector),
    ];

    // Reading a style attribute back off an element hands the file the
    // browser's own serialization — respaced, reordered, semicolon appended —
    // which is the renormalization the patcher exists to avoid. Every gesture
    // that writes an inline style composes it here instead, so the bytes in the
    // page and the bytes in the file are the same bytes. A null drops a
    // declaration; everything else the element carries is kept, in its order,
    // because a position owns where a piece is and nothing else about it.
    //
    // A host that serves the vocabulary module has already made this decision
    // once, for every writer; that is the same function, preferred when it is
    // there, and this is what a document falls back to under a host that serves
    // only the carrier.
    function composeStyle(el, declarations) {
      const shared = globalThis.marbleVocabulary?.styleWith;
      if (shared) return shared(el, declarations);
      const dropped = new Set(Object.keys(declarations));
      const rest = (el.getAttribute('style') ?? '')
        .split(';')
        .map((declaration) => declaration.trim())
        .filter((declaration) => declaration && !dropped.has(declaration.slice(0, declaration.indexOf(':')).trim().toLowerCase()));
      const next = Object.entries(declarations)
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([name, value]) => `${name}:${value}`);
      return [...next, ...rest].join(';');
    }

    // Each part contributes its own styling, its own wiring pass, and the
    // selector for what it makes touchable — so removing a part removes all
    // three and nothing dangles.
    const css = [];
    const wirers = [];
    const addressable = [];
    // False during the first register pass (the document as it loaded), true
    // afterwards. A row that is wired later is a row that just arrived, and
    // its chrome should say so rather than waiting for a hover.
    let live = false;

    // A subtree that isn't in the document yet can't be addressed by path, so
    // it carries its ids with it — they are serialized into the insert op.
    function assignIdsIn(root) {
      for (const el of [root, ...root.querySelectorAll('*')]) {
        if (isTransient(el) || marble.id(el)) continue;
        if (el === root || el.matches(ADDRESSABLE)) el.setAttribute(ID, marble.newId());
      }
    }

    css.push(`
      .marble-item { position: relative; }
      .marble-item.marble-dragging {
        z-index: 40;
        filter: drop-shadow(0 10px 22px rgba(0, 0, 0, .16));
      }
      .marble-grip {
        position: absolute; left: -1.55rem; top: .05rem;
        display: flex; flex-direction: column; align-items: center; gap: 1px;
        opacity: 0; transition: opacity .14s ease;
      }
      .marble-item:hover > .marble-grip,
      .marble-item:focus-within > .marble-grip,
      .marble-item.marble-item-new > .marble-grip,
      .marble-grip:focus-within { opacity: 1; }
      /* A pointer is not the only way in. Without this the grip is invisible on
         a tablet, which means nothing in the document can be deleted or
         reordered there at all. */
      @media (hover: none) { .marble-grip { left: -2rem; opacity: .55; } }
      @media (prefers-reduced-motion: reduce) { .marble-grip { transition: none; } }
      .marble-btn {
        width: 1.25rem; height: 1.25rem; padding: 0; border: 0; border-radius: 4px;
        background: none; color: currentColor; opacity: .4;
        font: 500 12px/1.25rem ui-monospace, SFMono-Regular, Menlo, monospace;
        text-align: center; cursor: pointer;
      }
      .marble-btn:hover { opacity: 1; background: rgba(127, 127, 127, .14); }
      .marble-btn:focus-visible {
        opacity: 1; outline: 2px solid currentColor; outline-offset: 1px;
      }
      .marble-btn:active { transform: scale(.92); }
      @media (hover: none) {
        .marble-btn { width: 1.7rem; height: 1.7rem; font-size: 14px; line-height: 1.7rem; }
      }
      @media (prefers-reduced-motion: reduce) { .marble-btn:active { transform: none; } }
    `);

    function grip(item) {
      let grip = item.querySelector(':scope > .marble-grip');
      if (!grip) {
        grip = document.createElement('div');
        grip.className = 'marble-grip';
        grip.setAttribute(TRANSIENT, '');
        // The item may itself be editable, so the chrome has to be an atomic
        // island the caret can't wander into.
        grip.setAttribute('contenteditable', 'false');
        item.prepend(grip);
        item.classList.add('marble-item');
      }
      return grip;
    }

    // These live in the page and never in the file, which the carrier has no
    // way to know until it is told.
    marble.pageOnly('contenteditable', 'spellcheck');
    addressable.push('[data-marble-editable]');
    wirers.push(wireEditable);

    function wireEditable(root) {
      for (const el of within(root, '[data-marble-editable]')) {
        if (!claim(el, 'editable')) continue;

        // plaintext-only keeps the browser from injecting <div> and <br> soup
        // on Enter, so textContent stays the whole truth and setText is safe.
        el.setAttribute('contenteditable', 'plaintext-only');
        if (el.contentEditable !== 'plaintext-only') el.setAttribute('contenteditable', 'true');
        el.spellcheck = false;

        // One undo step per edit session: prior text is captured on focus, and
        // keystrokes coalesce against that same entry until blur.
        let prior = null;
        el.addEventListener('focus', () => {
          prior = marble.text(el);
        });
        el.addEventListener('input', (event) => {
          const id = marble.id(el);
          const text = marble.text(el);
          const op = { type: 'setText', id, text };
          // The browser's own undo inside the field arrives here as an input
          // like any other, and it is not a new edit. Recording it put the state
          // just undone back on the ring — and cleared the redo with it — so the
          // next Mod+Z moved the document forward instead of back. File where
          // the text ended up, and let the session start again from there.
          if (event.inputType === 'historyUndo' || event.inputType === 'historyRedo') {
            prior = text;
            marble.op(op);
            return;
          }
          if (prior !== null && text !== prior) {
            marble.record(
              { redo: [op], undo: [{ type: 'setText', id, text: prior }] },
              { coalesce: true },
            );
          }
          marble.op(op);
        });
        el.addEventListener('blur', () => {
          prior = null;
          marble.flush();
        });

        // Most editable nodes here are a heading or a single line, where Enter
        // means "done" and a newline buried in the text is a mistake you can't
        // see. Shift-Enter still breaks the line where a break is wanted.
        el.addEventListener('keydown', (event) => {
          if (event.key === 'Escape' || (event.key === 'Enter' && !event.shiftKey)) {
            event.preventDefault();
            el.blur();
          }
        });
      }
    }

    css.push(`.marble-remove:hover, .marble-remove:focus-visible { color: #b4544f; }`);
    addressable.push('[data-marble-removable]');
    wirers.push(wireRemovable);

    function wireRemovable(root) {
      for (const el of within(root, '[data-marble-removable]')) {
        if (!claim(el, 'removable')) continue;

        const button = document.createElement('button');
        button.className = 'marble-btn marble-remove';
        button.setAttribute(TRANSIENT, '');
        button.setAttribute('aria-label', 'Delete');
        button.title = 'Delete';
        button.textContent = '×';
        button.addEventListener('click', () => {
          const id = marble.id(el);
          // Both captured against the live node — after remove, they are gone.
          const inverse = marble.invert({ type: 'remove', id });
          const label = marble.text(el);
          el.remove();
          const op = { type: 'remove', id };
          if (inverse) marble.record({ redo: [op], undo: [inverse] });
          marble.op(op, { immediate: true });
          // The corner pill says "saved", which is the wrong thing to hear
          // when something has just gone. Say what left, and offer it back.
          if (typeof offerUndo === 'function' && inverse) {
            const what = label.trim();
            offerUndo(what ? `Removed “${what.slice(0, 40)}”` : 'Removed');
          }
        });
        grip(el).append(button);
      }
    }

    // Reordering is pointer-driven, not HTML5 drag-and-drop. The native API
    // gives you a detached ghost pinned at a fixed offset and reorders in hard
    // jumps, so the row you grabbed is never the row under your finger and the
    // list snaps between states. What a list actually wants is physical: the
    // row stays where you grabbed it, and its neighbours slide out of the way.
    //
    // Three rules make that work. Track 1:1 from the grab point, so the row
    // never leaps to centre itself. Animate the neighbours with FLIP — move the
    // DOM first, then play them from where they were to where they now are.
    // And start every animation from the element's *presentation* value, the
    // position the eye last saw, not its layout box; that is what lets a drag
    // be reversed halfway without a jump.

    const DRAG_EASE = 'cubic-bezier(.2, .8, .2, 1)';
    const SLIDE_MS = 220;   // a neighbour getting out of the way
    const SETTLE_MS = 260;  // the row landing in its slot
    const LIFT_PX = 4;      // a press is not yet a drag
    const EDGE_PX = 72;     // autoscroll band at the top and bottom of the view

    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const sliding = new WeakMap();  // element -> the slide currently playing on it

    css.push(`
      .marble-handle { cursor: grab; touch-action: none; }
      .marble-handle:active { cursor: grabbing; }
      .marble-dragging { position: relative; z-index: 40; will-change: transform;
        pointer-events: none; }
      [data-marble-sortable].marble-sorting { cursor: grabbing; }
      body.marble-dragging-now, body.marble-dragging-now * { user-select: none !important; }
      body.marble-dragging-now { cursor: grabbing; }
    `);
    addressable.push('[data-marble-sortable]', '[data-marble-sortable] > *');
    wirers.push(wireSortable);

    let drag = null;
    let edgeRaf = 0;

    // Items move freely between containers declaring the same group.
    const group = (el) => el?.getAttribute('data-marble-sortable') ?? null;

    const rectsOf = (els) => new Map([...els].map((el) => [el, el.getBoundingClientRect()]));

    // Play each element from where it was to where it is now. The `first` rects
    // are read live, so an element already mid-slide is measured where it looks
    // rather than where it will end up — cancel only after that reading, or the
    // new slide starts from a position the user never saw.
    function flip(first) {
      if (reduced.matches) return;
      for (const [el, from] of first) {
        sliding.get(el)?.cancel();
        const to = el.getBoundingClientRect();
        const dx = from.left - to.left, dy = from.top - to.top;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
        const anim = el.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
          { duration: SLIDE_MS, easing: DRAG_EASE },
        );
        sliding.set(el, anim);
        anim.finished.then(() => { if (sliding.get(el) === anim) sliding.delete(el); }, () => {});
      }
    }

    // Keep the row under the finger. Its layout slot moves as the list reorders
    // around it, so the offset is recomputed from where it actually sits rather
    // than accumulated — that is why reordering never nudges it.
    function follow() {
      const box = drag.item.getBoundingClientRect();
      drag.tx = drag.px - drag.grabX - (box.left - drag.tx);
      drag.ty = drag.py - drag.grabY - (box.top - drag.ty);
      drag.item.style.transform = `translate(${drag.tx}px, ${drag.ty}px)`;
    }

    // The dragged row is pointer-events:none, so this sees the list underneath.
    // Walk out of a nested sortable of a different group rather than giving up
    // on the first mismatch — a card list lives inside a column list.
    function containerUnder(x, y) {
      let node = document.elementFromPoint(x, y);
      while (node) {
        const hit = node.closest?.('[data-marble-sortable]');
        if (!hit) return null;
        if (group(hit) === drag.group) return hit;
        node = hit.parentElement;
      }
      return null;
    }

    function reorder() {
      const container = containerUnder(drag.px, drag.py) || drag.item.parentElement;
      if (group(container) !== drag.group) return;
      const before = persistentChildren(container)
        .filter((child) => child !== drag.item)
        .find((child) => {
          const r = child.getBoundingClientRect();
          return drag.py < r.top + r.height / 2;
        }) ?? null;
      if (drag.item.parentElement === container && before === nextPersistentSibling(drag.item)) return;

      const affected = new Set([
        ...persistentChildren(drag.item.parentElement),
        ...persistentChildren(container),
      ]);
      affected.delete(drag.item);
      const first = rectsOf(affected);
      container.insertBefore(drag.item, before);
      flip(first);
      follow();
    }

    // Dragging to the edge of the window scrolls it, so a long list can be
    // crossed without letting go.
    function edgeScroll() {
      edgeRaf = 0;
      if (!drag?.lifted) return;
      const over = drag.py - EDGE_PX;
      const under = innerHeight - drag.py - EDGE_PX;
      const dy = over < 0 ? Math.max(-22, (over / EDGE_PX) * 22)
        : under < 0 ? Math.min(22, (-under / EDGE_PX) * 22) : 0;
      if (dy) { scrollBy(0, dy); follow(); reorder(); }
      edgeRaf = requestAnimationFrame(edgeScroll);
    }

    function settle(d) {
      const land = () => {
        d.item.style.transform = '';
        d.item.classList.remove('marble-dragging');
        sliding.delete(d.item);
        commitMove(d);
      };
      if (reduced.matches || (!d.tx && !d.ty)) return land();
      // A throw earns a little overshoot; a placement does not.
      const thrown = Math.abs(d.vy) > 900;
      const anim = d.item.animate(
        [{ transform: `translate(${d.tx}px, ${d.ty}px)` }, { transform: 'translate(0, 0)' }],
        { duration: thrown ? 320 : SETTLE_MS, easing: thrown ? 'cubic-bezier(.2, .9, .25, 1.06)' : DRAG_EASE },
      );
      sliding.set(d.item, anim);
      anim.finished.then(land, land);
    }

    function wireSortableItem(item) {
      if (!claim(item, 'sortable-item')) return;

      const handle = document.createElement('button');
      handle.className = 'marble-btn marble-handle';
      handle.setAttribute(TRANSIENT, '');
      handle.setAttribute('aria-label', 'Reorder — drag, or focus and press the arrow keys');
      handle.title = 'Drag to reorder';
      handle.textContent = '⠿';

      const onMove = (event) => {
        if (!drag || event.pointerId !== drag.pointerId) return;
        event.preventDefault();
        drag.px = event.clientX; drag.py = event.clientY;

        if (!drag.lifted) {
          if (Math.hypot(drag.px - drag.startX, drag.py - drag.startY) < LIFT_PX) return;
          drag.lifted = true;
          item.classList.add('marble-dragging');
          drag.originParent.classList.add('marble-sorting');
          document.body.classList.add('marble-dragging-now');
          if (!edgeRaf) edgeRaf = requestAnimationFrame(edgeScroll);
        }

        const dt = event.timeStamp - drag.lastT;
        if (dt > 0) drag.vy = ((event.clientY - drag.lastY) / dt) * 1000;
        drag.lastT = event.timeStamp; drag.lastY = event.clientY;

        follow();
        reorder();
      };

      const release = (event) => {
        if (!drag || (event && event.pointerId !== drag.pointerId)) return;
        const d = drag;
        drag = null;
        if (edgeRaf) { cancelAnimationFrame(edgeRaf); edgeRaf = 0; }
        removeEventListener('pointermove', onMove);
        removeEventListener('pointerup', release);
        removeEventListener('pointercancel', release);
        d.originParent.classList.remove('marble-sorting');
        document.body.classList.remove('marble-dragging-now');
        if (d.lifted) settle(d);      // otherwise it was a click on the handle
      };

      handle.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || drag) return;
        // Grabbing a row that is still settling takes it from where it is now.
        sliding.get(item)?.cancel();
        item.style.transform = '';
        const box = item.getBoundingClientRect();
        drag = {
          item, handle, pointerId: event.pointerId,
          group: group(item.parentElement),
          originParent: item.parentElement,
          originBefore: nextPersistentSibling(item),
          grabX: event.clientX - box.left, grabY: event.clientY - box.top,
          startX: event.clientX, startY: event.clientY,
          px: event.clientX, py: event.clientY,
          tx: 0, ty: 0, vy: 0, lifted: false,
          lastT: event.timeStamp, lastY: event.clientY,
        };
        addEventListener('pointermove', onMove, { passive: false });
        addEventListener('pointerup', release);
        addEventListener('pointercancel', release);
        event.preventDefault();
      });

      // The same move without a pointer. A handle you can tab to is the only
      // way this is reorderable at all for anyone not using a mouse.
      handle.addEventListener('keydown', (event) => {
        const dir = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
        if (!dir) return;
        const parent = item.parentElement;
        const kids = persistentChildren(parent);
        const at = kids.indexOf(item);
        const swap = kids[at + dir];
        if (!swap) return;
        event.preventDefault();
        const d = { item, originParent: parent, originBefore: nextPersistentSibling(item) };
        const first = rectsOf(kids);
        parent.insertBefore(item, dir < 0 ? swap : nextPersistentSibling(swap));
        flip(first);
        commitMove(d);
        handle.focus();
      });

      grip(item).prepend(handle);
      if (live) {
        item.classList.add('marble-item-new');
        setTimeout(() => item.classList.remove('marble-item-new'), 1600);
      }
    }

    function wireSortable(root) {
      for (const container of within(root, '[data-marble-sortable]')) {
        for (const item of persistentChildren(container)) wireSortableItem(item);
        claim(container, 'sortable');
      }
      // Newly inserted items are adopted as themselves. The sortable attribute
      // lives on the parent list, so the walk above never sees them — which is
      // why a new row could be deleted (that attribute is on the row) but not
      // reordered until the next full-document wire on refresh.
      if (root.nodeType === Node.ELEMENT_NODE) {
        const container = root.parentElement?.closest('[data-marble-sortable]');
        if (container && persistentChildren(container).includes(root)) wireSortableItem(root);
      }
    }

    // Moving the element *is* the code change, not a trigger for one — so this
    // only reports where it came to rest.
    function commitMove(d) {
      const parent = d.item.parentElement;
      const before = nextPersistentSibling(d.item);
      if (parent === d.originParent && before === d.originBefore) return;

      const op = {
        type: 'move',
        id: marble.id(d.item),
        parentId: marble.id(parent),
        beforeId: marble.id(before),
      };
      const inverse = {
        type: 'move',
        id: marble.id(d.item),
        parentId: marble.id(d.originParent),
        beforeId: marble.id(d.originBefore),
      };
      marble.record({ redo: [op], undo: [inverse] });
      marble.op(op, { immediate: true });
    }

    // The carrier records an inverse for every gesture above. Until something
    // draws a way to reach it, that history is a correct, complete, unreachable
    // thing — which is what half the documents in the corpus shipped.
    //
    // This is also what a confirm dialog is for, done better. A dialog asks
    // before every delete and trains people to dismiss it; a reversal offered
    // where the loss happened costs nothing until you need it.

    css.push(`
      .marble-reversal {
        position: fixed; left: 1rem; bottom: 1rem; z-index: 9999;
        display: flex; align-items: center; gap: .6rem;
        padding: .45rem .5rem .45rem .8rem; border-radius: 8px;
        font: 500 12px/1.3 system-ui, sans-serif;
        background: rgba(20, 22, 26, .94); color: #dfe4ea;
        border: 1px solid rgba(255,255,255,.12);
        box-shadow: 0 6px 24px rgba(0,0,0,.3);
        opacity: 0; transform: translateY(4px);
        transition: opacity .18s ease, transform .18s ease;
        pointer-events: none;
      }
      .marble-reversal[data-open] { opacity: 1; transform: none; pointer-events: auto; }
      .marble-reversal button {
        border: 0; border-radius: 5px; padding: .25rem .55rem; cursor: pointer;
        font: 600 12px system-ui, sans-serif;
        background: rgba(255,255,255,.14); color: #fff;
      }
      .marble-reversal button:hover { background: rgba(255,255,255,.24); }
      .marble-reversal button:focus-visible { outline: 2px solid #8ab4f8; outline-offset: 2px; }
      @media (prefers-reduced-motion: reduce) {
        .marble-reversal { transition: opacity .18s ease; transform: none; }
      }
    `);

    const reversal = document.createElement('div');
    reversal.className = 'marble-reversal';
    reversal.setAttribute(TRANSIENT, '');
    // Announced when it appears, so the offer is not pointer-only.
    reversal.setAttribute('role', 'status');
    const reversalText = document.createElement('span');
    const reversalButton = document.createElement('button');
    reversalButton.textContent = 'Undo';
    reversal.append(reversalText, reversalButton);
    document.body.append(reversal);

    let reversalTimer = null;
    function offerUndo(label) {
      reversalText.textContent = label;
      reversal.setAttribute('data-open', '');
      clearTimeout(reversalTimer);
      reversalTimer = setTimeout(() => reversal.removeAttribute('data-open'), 7000);
    }
    reversalButton.addEventListener('click', () => {
      reversal.removeAttribute('data-open');
      if (marble.canUndo) marble.undo();
      syncHistory();
    });

    // Whether there is a way back is a live fact about the document, so it is
    // derived into a marble- class like any other — never mirrored into a
    // variable a script has to remember to update.
    function syncHistory() {
      document.body.classList.toggle('marble-can-undo', !!marble.canUndo);
      document.body.classList.toggle('marble-can-redo', !!marble.canRedo);
    }
    addEventListener('pointerup', syncHistory, true);
    addEventListener('keyup', syncHistory, true);
    wirers.push(syncHistory);

    // Undo/redo is a carrier capability; binding the keys is the app's call,
    // same as drawing a save indicator. Native inputs keep the browser's own
    // undo — marble editables preventDefault so the stacks do not fight.
    addEventListener('keydown', (event) => {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod || event.altKey) return;
      const key = event.key.toLowerCase();
      const isUndo = key === 'z' && !event.shiftKey;
      const isRedo = (key === 'z' && event.shiftKey) || key === 'y';
      if (!isUndo && !isRedo) return;

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement &&
          target.isContentEditable &&
          !target.hasAttribute('data-marble-editable') &&
          !target.closest('[data-marble-editable]'))
      ) {
        return;
      }

      // A staged proposal is not history yet — Mod+Z discards it instead.
      if (isUndo && typeof marble.discardStaged === 'function' && marble.discardStaged()) {
        event.preventDefault();
        return;
      }

      // Anything still here with a caret in it is a marble editable — the guard
      // above sent the native inputs home. Inside one, the carrier owns the
      // history whether or not there is a step left in it: letting the key
      // through at the bottom of the ring handed the document to the browser's
      // own undo, which rewrites the field without the file hearing about it.
      const editing = target instanceof HTMLElement && target.isContentEditable;

      if (isUndo && marble.canUndo) {
        event.preventDefault();
        marble.undo();
      } else if (isRedo && marble.canRedo) {
        event.preventDefault();
        marble.redo();
      } else if (editing) {
        event.preventDefault();
      }
    });

    const style = document.createElement('style');
    style.setAttribute(TRANSIENT, '');
    style.textContent = css.join('\n');
    document.head.append(style);

    // Anything a hand can act on has to be addressable in the file first.
    const ADDRESSABLE = addressable.join(', ');
    marble.address(document.querySelectorAll(ADDRESSABLE));

    // Runs now over the document as it stands, and again over anything that
    // arrives later — an insert, an accepted proposal, an edit made to the file
    // in another window.
    marble.register((root) => {
      for (const wirer of wirers) wirer(root);
      live = true;
    });
  };

  // The carrier is injected after the document has been parsed, so this waits
  // rather than the other way round. No carrier, no affordances: the document
  // is still a page you can read, it just isn't one you can change.
  if (window.marble) begin(window.marble);
  else addEventListener('marble:ready', (event) => begin(event.detail), { once: true });
})();