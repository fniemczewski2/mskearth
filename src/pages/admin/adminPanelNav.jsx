
import { useCallback, useMemo, useRef, useState } from 'react';

import ArticlesCMS from '../../components/admin/articlesCMS.jsx';
import CitiesLocalCMS from '../../components/admin/citiesCMS.jsx';
import FoundationCMS from '../../components/admin/foundationCMS.jsx';
import ContactPeopleCMS from '../../components/admin/contactCMS.jsx';
import RecruitmentCMS from '../../components/admin/recruitmentCMS.jsx';

const TABS = [
  { id: 'recrutation', label: 'Rekrutacja' },
  { id: 'articles', label: 'Artykuły' },
  { id: 'map', label: 'Miasta' },
  { id: 'foundation', label: 'Fundacja' },
  { id: 'contact', label: 'Kontakt' },
];

function AdminPanelNav() {
  const [formType, setFormType] = useState('articles');
  const tabRefs = useRef(new Map());

  // Wzorzec ARIA Tabs wymaga, by fokus wedrowal razem z aktywna zakladka -
  // wczesniej zostawal na starym przycisku, ktory mial juz tabIndex={-1}.
  const activate = useCallback((id) => {
    setFormType(id);
    requestAnimationFrame(() => tabRefs.current.get(id)?.focus());
  }, []);

  const handleKeyNav = useCallback(
    (e) => {
      const idx = TABS.findIndex((t) => t.id === formType);
      if (idx === -1) return;

      const target = {
        ArrowRight: TABS[(idx + 1) % TABS.length].id,
        ArrowLeft: TABS[(idx - 1 + TABS.length) % TABS.length].id,
        Home: TABS[0].id,
        End: TABS[TABS.length - 1].id,
      }[e.key];

      if (target) {
        e.preventDefault();
        activate(target);
      }
    },
    [formType, activate]
  );

  const content = useMemo(() => {
    switch (formType) {
      case 'recrutation':
        return (
          <>
            <RecruitmentCMS/>
          </>
        );
      case 'articles':
        return (
          <>
            <ArticlesCMS />
          </>
        );
      case 'map':
        return (
          <>
            <CitiesLocalCMS/>
          </>
        );
      case 'foundation':
        return (
          <>
            <FoundationCMS/>
          </>
        );
      case 'contact':
        return (
          <>
            <ContactPeopleCMS/>
          </>
        );
      default:
        return (
          <>
            <ArticlesCMS/>
          </>
        );
    }
  }, [formType]);

  return (
    <>
      <div
        className="formMenu"
        role="tablist"
        aria-label="Wybierz sekcję danych"
        onKeyDown={handleKeyNav}
      >
        {TABS.map((tab) => {
          const selected = formType === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                if (el) tabRefs.current.set(tab.id, el);
                else tabRefs.current.delete(tab.id);
              }}
              className="formBtn"
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => activate(tab.id)}
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        id={`panel-${formType}`}
        role="tabpanel"
        aria-labelledby={`tab-${formType}`}
      >
        {content}
      </div>
    </>
  );
}


export default AdminPanelNav;
