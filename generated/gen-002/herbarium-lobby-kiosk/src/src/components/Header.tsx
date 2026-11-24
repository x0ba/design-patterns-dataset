interface HeaderProps {
  onHome: () => void;
  onExhibit: () => void;
  onStartOver: () => void;
  exhibitActive: boolean;
}

export function Header({ onHome, onExhibit, onStartOver, exhibitActive }: HeaderProps) {
  return (
    <header className="topbar">
      <button type="button" className="brand" onClick={onHome} aria-label="Herbarium Kiosk, go to the welcome screen">
        <span className="brand__name">Herbarium Kiosk</span>
        <span className="brand__sub">Vascular plant collection · Lobby</span>
      </button>
      <nav className="topbar__nav" aria-label="Kiosk">
        <button type="button" className={`btn btn--ghost ${exhibitActive ? 'is-active' : ''}`} onClick={onExhibit}>
          Featured exhibit
        </button>
        <button type="button" className="btn btn--ghost" onClick={onStartOver}>
          Start over
        </button>
      </nav>
    </header>
  );
}
