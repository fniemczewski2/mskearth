import { useEffect, useRef, useState } from 'react';

import JoinUs from '../features/recruitment/joinUs.jsx';
import Donate from '../features/donate/donate.jsx';
import { useTranslations } from '../shared/i18n/useTranslations.js';

function SideButtons() {
  const { t } = useTranslations();
  const [activeSection, setActiveSection] = useState(null);
  const dialogRef = useRef(null);
  const openerRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (activeSection && !dialog.open) dialog.showModal();
    if (!activeSection && dialog.open) dialog.close();
  }, [activeSection]);

  const open = (section, e) => {
    openerRef.current = e.currentTarget;
    setActiveSection(section);
  };

  const handleClosed = () => {
    setActiveSection(null);
    // Fokus wraca do przycisku, ktory otworzyl okno (WCAG 2.4.3).
    openerRef.current?.focus();
  };

  const labels = {
    joinUs: t.buttons?.joinUs ?? 'Dołącz do nas',
    donate: t.buttons?.donate ?? 'Wesprzyj nas',
  };

  return (
    <>
      <button type="button" className="side-button" onClick={(e) => open('joinUs', e)} aria-haspopup="dialog">
        <i className="bi bi-rocket-takeoff icon" aria-hidden="true" />
        <span className="description">{labels.joinUs}</span>
      </button>
      <button type="button" className="side-button" onClick={(e) => open('donate', e)} aria-haspopup="dialog">
        <i className="bi bi-piggy-bank icon" aria-hidden="true" />
        <span className="description">{labels.donate}</span>
      </button>

      <dialog
        ref={dialogRef}
        className="overlay-dialog"
        aria-label={activeSection ? labels[activeSection] : undefined}
        onClose={handleClosed}
        onClick={(e) => {
          // Klik w tlo (poza trescia) zamyka okno.
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        <div className="overlay-content">
          <button
            type="button"
            className="close-button"
            onClick={() => dialogRef.current?.close()}
            aria-label={t.a11y?.close ?? 'Zamknij'}
          >
            <i className="bi bi-x" aria-hidden="true" />
          </button>
          {activeSection === 'joinUs' && <JoinUs />}
          {activeSection === 'donate' && <Donate />}
        </div>
      </dialog>
    </>
  );
}

export default SideButtons;
