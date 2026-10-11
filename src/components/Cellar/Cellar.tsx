import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PencilSimple, Trash } from '@phosphor-icons/react';
import { inSafariBrowser, type CellarItem } from '../../cellar';
import { Glass } from '../../icons/Glass';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { scoreColor } from '../Grimoire/classics';
import { relativeDate, savedGlass } from './cellarView';
import './Cellar.css';

export interface CellarProps {
  open: boolean;
  items: CellarItem[];
  onClose(): void;
  onLoad(item: CellarItem): void;
  onRename(id: string, name: string): void;
  onDelete(item: CellarItem): void;
  onOpenGrimoire(): void;
}

export function Cellar({ open, items, onClose, onLoad, onRename, onDelete, onOpenGrimoire }: CellarProps) {
  return (
    <Sheet open={open} onClose={onClose} labelledBy="cellar-title" size="cellar" className="cellar-sheet">
      <CellarBody items={items} onLoad={onLoad} onRename={onRename} onDelete={onDelete} onOpenGrimoire={onOpenGrimoire} />
    </Sheet>
  );
}

const SPRING = { type: 'spring', stiffness: 420, damping: 34 } as const;
const MAX_NAME = 40;

/* ---------- one saved brew ---------- */

interface RowProps {
  item: CellarItem;
  index: number;
  editing: boolean;
  onLoad(item: CellarItem): void;
  onStartRename(id: string): void;
  onEndRename(): void;
  onRename(id: string, name: string): void;
  onDelete(item: CellarItem): void;
}

const Row = memo(function Row({ item, index, editing, onLoad, onStartRename, onEndRename, onRename, onDelete }: RowProps) {
  const glass = useMemo(() => savedGlass(item.brew, item.color), [item.brew, item.color]);
  const when = relativeDate(item.savedAt);
  const renameBtn = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  // Enter and Esc hand focus back to the Rename button; a click elsewhere keeps focus where it went.
  const restoreFocus = useRef(false);
  const settled = useRef(false);
  const wasEditing = useRef(false);

  useEffect(() => {
    if (editing) {
      settled.current = false;
      input.current?.focus();
      input.current?.select();
    } else if (wasEditing.current && restoreFocus.current) {
      renameBtn.current?.focus();
    }
    restoreFocus.current = false;
    wasEditing.current = editing;
  }, [editing]);

  const finish = (commit: boolean, viaKey: boolean) => {
    if (settled.current) return;
    settled.current = true;
    restoreFocus.current = viaKey;
    const name = input.current?.value.trim() ?? '';
    if (commit && name && name !== item.name) onRename(item.id, name);
    onEndRename();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finish(true, true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation(); // cancels the rename, not the sheet
      finish(false, true);
    }
  };

  return (
    <motion.li
      layout="position"
      transition={SPRING}
      exit={{ opacity: 0, x: -16, transition: { duration: 0.2 } }}
      data-id={item.id}
      className="cellar-li"
    >
      <div className="cellar-row" style={{ '--c': glass.color, '--i': Math.min(index, 8) } as CSSProperties}>
        <div className="cellar-row__glass" aria-hidden="true">
          <Glass kind={glass.kind} color={glass.color} ice={glass.ice} garnish={glass.garnish} foam={glass.foam} fit />
        </div>

        <div className="cellar-row__body">
          {editing ? (
            <input
              ref={input}
              className="cellar-row__input serif"
              defaultValue={item.name}
              maxLength={MAX_NAME}
              aria-label={`Name for ${item.name}`}
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="done"
              onKeyDown={onKeyDown}
              onBlur={() => finish(true, false)}
            />
          ) : (
            <h3 className="cellar-row__name serif" title={item.name}>
              {item.name}
            </h3>
          )}
          <p className="cellar-row__meta">
            {item.score != null && (
              <span className="cellar-score" style={{ '--tier': scoreColor(item.score) } as CSSProperties}>
                <i aria-hidden="true" />
                <span className="ui-vh">Score </span>
                {item.score}
              </span>
            )}
            <time dateTime={item.savedAt} title={new Date(item.savedAt).toLocaleString('en-GB')}>
              {when}
            </time>
          </p>
        </div>

        <div className="cellar-row__actions">
          <Button size="sm" data-act="load" aria-label={`Load ${item.name}`} onClick={() => onLoad(item)}>
            Load
          </Button>
          <IconButton
            ref={renameBtn}
            size="sm"
            label={`Rename ${item.name}`}
            tooltip="Rename"
            icon={<PencilSimple size={18} />}
            onClick={() => onStartRename(item.id)}
          />
          <IconButton
            size="sm"
            className="cellar-del"
            data-act="delete"
            label={`Delete ${item.name}`}
            tooltip="Delete"
            icon={<Trash size={18} />}
            onClick={() => onDelete(item)}
          />
        </div>
      </div>
    </motion.li>
  );
});

/* ---------- empty state: an empty glass shelf ---------- */

const GHOST = 'rgba(190, 205, 230, 0.55)';

function EmptyShelf({ onOpenGrimoire }: { onOpenGrimoire(): void }) {
  return (
    <div className="cellar-empty">
      <div className="cellar-shelf" aria-hidden="true">
        <div className="cellar-shelf__glasses">
          <Glass kind="rocks" color={GHOST} fill={0} className="cellar-shelf__g cellar-shelf__g--rocks" />
          <Glass kind="coupe" color={GHOST} fill={0} className="cellar-shelf__g cellar-shelf__g--coupe" />
          <Glass kind="highball" color={GHOST} fill={0} className="cellar-shelf__g cellar-shelf__g--highball" />
          <Glass kind="martini" color={GHOST} fill={0} className="cellar-shelf__g cellar-shelf__g--martini" />
        </div>
        <div className="cellar-shelf__slab" />
      </div>
      <p className="cellar-empty__text">Nothing saved yet. Serve a brew to keep it here.</p>
      <Button variant="secondary" size="md" data-autofocus onClick={onOpenGrimoire}>
        Open the Grimoire
      </Button>
    </div>
  );
}

/* ---------- the sheet's content ---------- */

interface BodyProps {
  items: CellarItem[];
  onLoad(item: CellarItem): void;
  onRename(id: string, name: string): void;
  onDelete(item: CellarItem): void;
  onOpenGrimoire(): void;
}

function CellarBody({ items, onLoad, onRename, onDelete, onOpenGrimoire }: BodyProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const prevIds = useRef<Set<string> | null>(null);
  // Where focus goes once a deleted row has left: the Delete button of the row that took its place
  // (the next one, else the previous one), else the heading. undefined means focus was not in the row.
  const focusAfterDelete = useRef<string | null | undefined>(undefined);
  // Ids this sheet deleted while focus was on them, so an Undo can hand focus back to the restored row.
  const deletedWithFocus = useRef(new Set<string>());

  const handleDelete = useCallback(
    (item: CellarItem) => {
      const i = items.findIndex((x) => x.id === item.id);
      const active = document.activeElement;
      // Only a row that holds focus (or a page that holds none) has focus to carry over. A pointer
      // delete in an engine that does not focus clicked buttons leaves focus where it was.
      const held = !active || active === document.body || !!active.closest(`[data-id="${CSS.escape(item.id)}"]`);
      if (held) {
        focusAfterDelete.current = items[i + 1]?.id ?? items[i - 1]?.id ?? null;
        deletedWithFocus.current.add(item.id);
      }
      setEditingId((cur) => (cur === item.id ? null : cur));
      onDelete(item);
    },
    [items, onDelete],
  );

  useEffect(() => {
    const control = (id: string) =>
      listRef.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"] [data-act="delete"]`) ?? null;

    // After a delete: the row that took its place, else the heading. Never the body.
    const target = focusAfterDelete.current;
    if (target !== undefined) {
      focusAfterDelete.current = undefined;
      ((target ? control(target) : null) ?? headingRef.current)?.focus();
    }

    // After an Undo: the restored row, when focus is still in the dialog. A click on the toast's Undo
    // leaves focus on that button as it fades out, which counts as the dialog too: it is about to be nothing.
    const before = prevIds.current;
    prevIds.current = new Set(items.map((x) => x.id));
    if (!before) return;
    const restored = items.find((x) => !before.has(x.id) && deletedWithFocus.current.has(x.id));
    if (!restored) return;
    deletedWithFocus.current.delete(restored.id);
    const active = document.activeElement;
    const adrift =
      !active || active === document.body || !!active.closest('[role="dialog"], .ui-toaster');
    if (adrift) control(restored.id)?.focus();
  }, [items]);

  const startRename = useCallback((id: string) => setEditingId(id), []);
  const endRename = useCallback(() => setEditingId(null), []);

  const n = items.length;
  // WebKit clears a site's storage after 7 days of Safari use without a visit, unless it runs as a Home Screen or Dock app
  const safari = useMemo(() => inSafariBrowser(), []);
  return (
    <div className="cellar">
      <header className="cellar__head">
        <h2 id="cellar-title" ref={headingRef} className="serif" tabIndex={-1} data-autofocus={n ? '' : undefined}>
          The Cellar
        </h2>
        {n > 0 && (
          <p aria-live="polite">
            {n} saved {n === 1 ? 'brew' : 'brews'}
          </p>
        )}
      </header>

      {n === 0 ? (
        <EmptyShelf onOpenGrimoire={onOpenGrimoire} />
      ) : (
        <>
          <div className="cellar__scroll">
            <ul ref={listRef} className="cellar__list">
              <AnimatePresence mode="popLayout" initial={false}>
                {items.map((item, i) => (
                  <Row
                    key={item.id}
                    item={item}
                    index={i}
                    editing={editingId === item.id}
                    onLoad={onLoad}
                    onStartRename={startRename}
                    onEndRename={endRename}
                    onRename={onRename}
                    onDelete={handleDelete}
                  />
                ))}
              </AnimatePresence>
            </ul>
          </div>
          <p className="cellar__foot">
            Saved on this device only.
            {safari && (
              <span className="cellar__foot-note">
                Safari clears saved brews after 7 days without a visit. Add Stewy to your Home Screen or Dock to keep them.
              </span>
            )}
          </p>
        </>
      )}
    </div>
  );
}
