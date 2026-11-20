'use client';

import { createTooltipController, Tooltip, TooltipContent, TooltipTrigger } from '@ui-sdk/react/tooltip';
import Link from 'next/link';
import { useState } from 'react';
import { fmt, siteHref, STATE_LABEL } from '@/lib/format';

interface Cell { slug: string; state: string; title: string; score: number | null }

/** One cell per site, in list order, colored and shaped by state. Each cell opens the site. */
export function SpecimenStrip({ batch, sites }: { batch: string; sites: Cell[] }) {
  const [tip] = useState(() => createTooltipController<Cell>());
  return (
    <>
      <ol className="strip" aria-label="Sites in this batch">
        {sites.map((s) => (
          <li key={s.slug}>
            <TooltipTrigger
              controller={tip}
              payload={s}
              render={<Link href={siteHref(batch, s.slug)} />}
              className="cell"
              data-state={s.state}
              aria-label={`${s.title}: ${STATE_LABEL[s.state] ?? s.state}`}
            />
          </li>
        ))}
      </ol>
      <Tooltip controller={tip} delay={120} closeDelay={60}>
        <TooltipContent className="tip" side="top" sideOffset={6}>
          {(state) => {
            const s = state.payload as Cell | undefined;
            if (!s) return null;
            return (
              <>
                <span className="tip-title">{s.title}</span>
                <span>{STATE_LABEL[s.state] ?? s.state}{s.score !== null ? `, agreement ${fmt(s.score)}` : ''}</span>
              </>
            );
          }}
        </TooltipContent>
      </Tooltip>
    </>
  );
}
