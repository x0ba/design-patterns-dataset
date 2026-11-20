'use client';

import { Dialog, DialogBackdrop, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@ui-sdk/react/dialog';
import { Field, FieldDescription, FieldError, FieldLabel } from '@ui-sdk/react/field';
import { SegmentedControl, SegmentedControlIndicator, SegmentedControlItem } from '@ui-sdk/react/segmented-control';
import { Textarea } from '@ui-sdk/react/textarea';
import { toast } from '@ui-sdk/react/toast';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { review } from '@/app/proposals/actions';

export function StatusFilter({ value, counts }: { value: string; counts: Record<string, number> }) {
  const router = useRouter();
  const [current, setCurrent] = useState(value);
  return (
    <SegmentedControl
      className="segmented"
      aria-label="Show proposals"
      value={current}
      onValueChange={(v) => {
        if (!v) return;
        setCurrent(v);
        router.push(v === 'open' ? '/proposals' : `/proposals?status=${v}`);
      }}
    >
      <SegmentedControlIndicator className="segmented-indicator" />
      {(['open', 'accepted', 'rejected', 'all'] as const).map((s) => (
        <SegmentedControlItem key={s} value={s} className="segmented-item">
          {s[0].toUpperCase() + s.slice(1)} <span className="num muted">{counts[s]}</span>
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}

export function ReviewButtons({ batch, id }: { batch: string; id: string }) {
  return (
    <div className="prop-actions">
      <ReviewDialog batch={batch} id={id} action="reject" />
      <ReviewDialog batch={batch} id={id} action="accept" />
    </div>
  );
}

const COPY = {
  accept: {
    trigger: 'Accept',
    title: (id: string) => `Accept ${id} Into the Codebook?`,
    description: 'This edits codebook/ and bumps its version. Rebuild dist/ before the next batch so raters see the change.',
    label: 'Note (optional)',
    hint: 'Saved with the review.',
    confirm: 'Accept Proposal',
    done: 'Accepted',
  },
  reject: {
    trigger: 'Reject',
    title: (id: string) => `Reject ${id}?`,
    description: 'The codebook stays as it is. The note is saved with the proposal.',
    label: 'Why reject it?',
    hint: 'Required. Raters read it on later batches.',
    confirm: 'Reject Proposal',
    done: 'Rejected',
  },
} as const;

function ReviewDialog({ batch, id, action }: { batch: string; id: string; action: 'accept' | 'reject' }) {
  const router = useRouter();
  const copy = COPY[action];
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    if (action === 'reject' && !note.trim()) {
      setError('Add a note before rejecting.');
      throw new Error('note required');
    }
    const r = await review(batch, id, action, note);
    if (!r.ok) {
      setError(r.error);
      throw new Error(r.error);
    }
    toast.success(`${copy.done} ${id}`, { description: r.message });
    setNote('');
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(''); }}>
      <DialogTrigger className={action === 'accept' ? 'button button-primary' : 'button'}>{copy.trigger}</DialogTrigger>
      <DialogBackdrop className="backdrop" />
      <DialogContent className="dialog">
        <DialogTitle className="dialog-title">{copy.title(id)}</DialogTitle>
        <DialogDescription className="small muted">{copy.description}</DialogDescription>
        <form
          className="dialog-form"
          onSubmit={(e) => { e.preventDefault(); (e.currentTarget.querySelector('[data-confirm]') as HTMLButtonElement | null)?.click(); }}
        >
          <Field invalid={error ? true : undefined}>
            <FieldLabel className="label">{copy.label}</FieldLabel>
            <Textarea
              className="textarea"
              value={note}
              onValueChange={(v) => { setNote(v); setError(''); }}
              autoResize
              rows={3}
              submitShortcut="mod+enter"
            />
            {error ? <FieldError match>{error}</FieldError> : <FieldDescription className="small muted">{copy.hint}</FieldDescription>}
          </Field>
          <div className="dialog-actions">
            <DialogClose className="button">Cancel</DialogClose>
            <DialogClose
              className={action === 'accept' ? 'button button-primary' : 'button button-danger'}
              data-confirm=""
              value="confirm"
              action={submit}
              data-agent-confirm={action === 'accept' ? 'Changes the codebook source files' : 'Rejects a rater’s codebook proposal'}
            >
              {copy.confirm}
            </DialogClose>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
