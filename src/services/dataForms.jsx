// src/services/dataForms.jsx
import { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import CityForm from './addCity.jsx';
import ArticleForm from './addArticle.jsx';
import ListArticles from './listArticles.jsx';
import LocalContactPersonForm from './addLocalContactPerson.jsx';
import { AddRecrutationData, AddRecrutationCallData } from './addRecrutationData.jsx';
import FinancialReportForm from './addFinancialReport.jsx';
import FoundationBoardForm from './addFoundationBoard.jsx';
import ListCities from './listCities.jsx';
import ListCalls from './listCalls.jsx';
import ListLocalContactPeople from './listLocalContactPeople.jsx';
import ListFoundationBoardMembers from './listFoundationBoardMembers.jsx';
import ContactPersonForm from './addContactPerson.jsx';
import ListContactPeople from './listContactPeople.jsx';

const TABS = [
  { id: 'recrutation', label: 'Rekrutacja' },
  { id: 'articles', label: 'Artykuły' },
  { id: 'map', label: 'Miasta' },
  { id: 'foundation', label: 'Fundacja' },
  { id: 'contact', label: 'Kontakt' },
];

function DataForms({ currentUserName }) {
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
            <div className="formsContainer">
              <AddRecrutationData />
              <AddRecrutationCallData />
            </div>
            <ListCalls />
          </>
        );
      case 'articles':
        return (
          <>
            <ArticleForm currentUserName={currentUserName} />
            <ListArticles currentUserName={currentUserName} />
          </>
        );
      case 'map':
        return (
          <>
            <div className="formsContainer">
              <CityForm />
              <LocalContactPersonForm />
            </div>
            <ListCities />
            <ListLocalContactPeople />
          </>
        );
      case 'foundation':
        return (
          <>
            <div className="formsContainer">
              <FinancialReportForm currentUserName={currentUserName} />
              <FoundationBoardForm />
            </div>
            <ListFoundationBoardMembers />
          </>
        );
      case 'contact':
        return (
          <>
            <ContactPersonForm />
            <ListContactPeople />
          </>
        );
      default:
        return (
          <>
            <ArticleForm currentUserName={currentUserName} />
            <ListArticles currentUserName={currentUserName} />
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

DataForms.propTypes = {
  currentUserName: PropTypes.string, // pass if you need author attribution
};

export default DataForms;
