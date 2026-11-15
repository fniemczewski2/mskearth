import { useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import ArticlesCMS from './cms/articlesCMS.jsx';
import CitiesLocalCMS from './cms/citiesCMS.jsx';
import FoundationCMS from './cms/foundationCMS.jsx';
import ContactPeopleCMS from './cms/contactCMS.jsx';
import RecruitmentCMS from './cms/recruitmentCMS.jsx';
import SurveysCMS from './cms/surveysCMS.jsx';
import FinancePanel from './financePanel.jsx';

const TABS = [
  { id: 'recruitment', label: 'Rekrutacja' },
  { id: 'articles', label: 'Artykuły' },
  { id: 'map', label: 'Miasta' },
  { id: 'foundation', label: 'Fundacja' },
  { id: 'contact', label: 'Kontakt' },
  { id: 'surveys', label: 'Ankiety' },
  { id: 'finance', label: 'Finanse', path: '/admin/finanse' },
];

const DEFAULT_TAB = 'articles';
const pathOf = (tab) => tab.path ?? `/admin/${tab.id === DEFAULT_TAB ? '' : tab.id}`.replace(/\/$/, '');

const PANELS = {
  recruitment: RecruitmentCMS,
  articles: ArticlesCMS,
  map: CitiesLocalCMS,
  foundation: FoundationCMS,
  contact: ContactPeopleCMS,
  surveys: SurveysCMS,
  finance: FinancePanel,
};

function AdminPanelNav() {
  // Aktywna zakladka wynika z adresu (np. /admin/finanse), wiec mozna do niej linkowac.
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const current = pathname.replace(/\/$/, '');
  const formType = TABS.find((tab) => pathOf(tab) === current)?.id ?? DEFAULT_TAB;
  const tabRefs = useRef(new Map());

  const activate = useCallback(
    (id) => {
      navigate(pathOf(TABS.find((tab) => tab.id === id)));
      requestAnimationFrame(() => tabRefs.current.get(id)?.focus());
    },
    [navigate]
  );

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

  const Panel = PANELS[formType] ?? ArticlesCMS;

  return (
    <>
      <div className="formMenu" role="tablist" aria-label="Wybierz sekcję danych" onKeyDown={handleKeyNav}>
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
              aria-controls={selected ? `panel-${tab.id}` : undefined}
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

      <div id={`panel-${formType}`} role="tabpanel" aria-labelledby={`tab-${formType}`}>
        <Panel />
      </div>
    </>
  );
}

export default AdminPanelNav;
