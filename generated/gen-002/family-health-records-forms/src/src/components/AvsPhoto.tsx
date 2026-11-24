import { AVS } from '../lib/seed';

export type AvsKey = 'tdap' | 'ceti' | 'phys';

interface AvsPhotoProps {
  /** Which highlight is relevant to the open dialog. */
  active?: AvsKey;
  /** When provided, highlighted values become tappable and call this with their key. */
  onUse?: (key: AvsKey) => void;
}

/**
 * Stand-in for the phone photo of the after-visit summary. Highlights mark the values
 * a parent would need to copy; they are real buttons when onUse is given.
 */
export function AvsPhoto({ active, onUse }: AvsPhotoProps) {
  const hl = (key: AvsKey, text: string) => {
    const isActive = active === key;
    if (onUse) {
      return (
        <button
          type="button"
          className={`avs-hl avs-hl-btn${isActive ? ' is-active' : ''}`}
          onClick={() => onUse(key)}
        >
          {text}
        </button>
      );
    }
    return <span className="avs-hl">{text}</span>;
  };

  return (
    <figure className="avs-wrap">
      <div className="avs-paper" role="img" aria-label="Photo of the after-visit summary from Eastgate Pediatrics">
        <div className="avs-letterhead">
          <div className="avs-clinic">EASTGATE PEDIATRICS</div>
          <div className="avs-doc">After Visit Summary</div>
        </div>
        <div className="avs-meta">
          <div>
            <span>Patient</span> Imani R. Brooks
          </div>
          <div>
            <span>DOB</span> 03/08/2015
          </div>
          <div>
            <span>Visit</span> {AVS.visitLabel}
          </div>
          <div>
            <span>Provider</span> Anika Sorensen, MD
          </div>
        </div>

        <div className="avs-h">Immunizations given today</div>
        <div className="avs-line">
          Tdap (Boostrix) 0.5 mL IM, left arm. Given {hl('tdap', '04/02/2026')}
        </div>

        <div className="avs-h">Medications reviewed</div>
        <div className="avs-line">
          Cetirizine {hl('ceti', AVS.cetirizineText)} by mouth, once daily
        </div>
        <div className="avs-line">
          Epinephrine auto-injector 0.3 mg. Refill sent to pharmacy. Expiration is printed on the device.
        </div>

        <div className="avs-h">Camp physical</div>
        <div className="avs-line">
          Form completed and signed by Anika Sorensen, MD on {hl('phys', '04/02/2026')}
        </div>
        <div className="avs-line">Cleared for all camp activities.</div>

        <div className="avs-foot">Next visit: well-child check, spring 2027</div>
      </div>
      <figcaption className="avs-caption">
        {onUse ? 'Tap a highlighted value to use it.' : 'Highlighted values are the ones this form uses.'}
      </figcaption>
    </figure>
  );
}
