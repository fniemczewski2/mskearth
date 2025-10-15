
import { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

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

function AdminPanelNav({ currentUserName }) {
  const [formType, setFormType] = useState('articles');

  const handleKeyNav = useCallback(
    (e) => {
      const idx = TABS.findIndex((t) => t.id === formType);
      if (idx === -1) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = TABS[(idx + 1) % TABS.length].id;
        setFormType(next);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = TABS[(idx - 1 + TABS.length) % TABS.length].id;
        setFormType(prev);
      }
    },
    [formType]
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
  }, [formType, currentUserName]);

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
              className="formBtn"
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setFormType(tab.id)}
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

AdminPanelNav.propTypes = {
  currentUserName: PropTypes.string, 
};

export default AdminPanelNav;
