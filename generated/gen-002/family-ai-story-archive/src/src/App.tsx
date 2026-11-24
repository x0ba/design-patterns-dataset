import { useEffect, useRef, useState } from 'react';
import { Archive } from './components/Archive';
import { Compare } from './components/Compare';
import { NewStory } from './components/NewStory';
import { Orders } from './components/Orders';
import { Print } from './components/Print';
import { StoryDetail } from './components/StoryDetail';
import { Lantern, IconBox, IconPlus, IconGrid } from './icons';
import { href, useRoute } from './router';
import { StoreProvider, useStore } from './store';

function Header({ onNew, section }: { onNew: () => void; section: string }) {
  const { stories, orders } = useStore();
  return (
    <header className="topbar">
      <a className="brand" href={href('')} aria-label="Lanternloft home"><Lantern size={30} /><span>Lanternloft</span></a>
      <nav aria-label="Main">
        <a href={href('')} className={section === 'archive' ? 'on' : ''}><IconGrid size={17} /> Family archive <small>{stories.length}</small></a>
        <a href={href('orders')} className={section === 'orders' ? 'on' : ''}><IconBox size={17} /> Printed books <small>{orders.length}</small></a>
      </nav>
      <div className="spacer" />
      <button className="btn amber" onClick={onNew}><IconPlus size={17} /> New story</button>
      <div className="who" title="Signed in as Jonah · Reyes family"><span className="av">J</span><span><b>Jonah</b><small>Reyes family</small></span></div>
    </header>
  );
}

function Shell() {
  const route = useRoute();
  const [newOpen, setNewOpen] = useState(false);
  const saved = useRef(0);
  const prevSection = useRef('archive');
  const [head, id] = route.path;
  const section = head === 'orders' ? 'orders' : head === 'story' || head === 'compare' || head === 'print' ? head : 'archive';

  const ignoreUntil = useRef(0);
  useEffect(() => {
    if (section === 'archive') {
      if (prevSection.current !== 'archive') {
        ignoreUntil.current = performance.now() + 400;
        requestAnimationFrame(() => window.scrollTo(0, saved.current));
      }
    } else {
      window.scrollTo(0, 0);
    }
    prevSection.current = section;
  }, [section, id]);
  // remember archive scroll position continuously, so Back lands where Jonah was
  useEffect(() => {
    const on = () => { if (section === 'archive' && performance.now() > ignoreUntil.current) saved.current = window.scrollY; };
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [section]);

  let page;
  if (head === 'story' && id) page = <StoryDetail key={id} id={id} />;
  else if (head === 'compare') page = <Compare ids={(id || '').split(',').filter(Boolean)} />;
  else if (head === 'print' && id) page = <Print key={id + (route.query.get('v') ?? '')} id={id} versionParam={route.query.get('v')} />;
  else if (head === 'orders') page = <Orders />;
  else page = null;

  return (
    <>
      <a className="skip" href="#main">Skip to results</a>
      <Header onNew={() => setNewOpen(true)} section={section === 'orders' ? 'orders' : section === 'archive' ? 'archive' : ''} />
      {/* The archive stays mounted so filters, scroll and selection survive a trip into a story. */}
      <div style={{ display: section === 'archive' ? 'block' : 'none' }}><Archive /></div>
      {page}
      {newOpen && <NewStory onClose={() => setNewOpen(false)} />}
    </>
  );
}

export default function App() {
  return <StoreProvider><Shell /></StoreProvider>;
}
