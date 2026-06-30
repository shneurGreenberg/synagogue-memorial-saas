import React, { useEffect, useMemo, useState } from 'react';
import { withTranslation } from 'react-i18next';
import { sanitizeRichText } from '../lib/html-sanitize';
import { getBiographyDensityClass } from '../lib/text-density';
import { PersonAvatar } from '../components/PersonAvatar';
import { useBoardNavigation } from '../context/BoardNavigationContext';
import { useBoardData } from '../context/BoardDataContext';
import { BiographyScroller } from '../components/BiographyScroller';
import { getBoardSlug } from '../lib/board-slug';

class CardPageBase extends React.Component {
  constructor(props) {
    super(props);
    this.onBackdropClick = this.onBackdropClick.bind(this);
    this.stopPropagation = this.stopPropagation.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
  }

  componentDidMount() {
    if (!this.props.exportMode) {
      document.addEventListener('keydown', this.onKeyDown);
    }
  }

  componentWillUnmount() {
    if (!this.props.exportMode) {
      document.removeEventListener('keydown', this.onKeyDown);
    }
  }

  onBackdropClick() {
    this.props.onBack();
  }

  onKeyDown(event) {
    if (event.key === 'Escape') {
      this.props.onBack();
    }
  }

  stopPropagation(event) {
    event.stopPropagation();
  }

  renderDetail(person, biographyText) {
    const displayName = person ? person.name : '';

    return (
      <main className="card-view wooden-panel">
        <div
          className="card-detail golden-panel"
          role="article"
        >
          <div className="card-detail-photo">
            <PersonAvatar person={person} size="xl" />
          </div>
          <div className="card-detail-text">
            <h1>{displayName}</h1>
            <BiographyScroller
              className={`inner-text ${getBiographyDensityClass(biographyText)}`}
              html={sanitizeRichText(biographyText)}
            />
          </div>
        </div>
      </main>
    );
  }

  renderMissing() {
    return (
      <main className="card-view wooden-panel card-view-missing">
        <div className="card-detail golden-panel">
          <h1>{this.props.t('person_not_found')}</h1>
          {!this.props.exportMode && (
            <p>
              <button type="button" className="card-back-link" onClick={this.props.onBack}>
                {this.props.t('back_to_board')}
              </button>
            </p>
          )}
        </div>
      </main>
    );
  }

  renderExport(person, biographyText) {
    return (
      <div id="cardExportRoot" className="card-export-root" aria-hidden="true">
        {person ? this.renderDetail(person, biographyText) : this.renderMissing()}
      </div>
    );
  }

  render() {
    const { person, biographyText, exportMode } = this.props;

    if (exportMode) {
      return this.renderExport(person, biographyText);
    }

    return (
      <div
        className="card-overlay"
        role="dialog"
        aria-modal="true"
        aria-label={this.props.t('back_to_board')}
      >
        <button
          type="button"
          className="card-overlay-backdrop"
          onClick={this.onBackdropClick}
          aria-label={this.props.t('back_to_board')}
        />
        <div className="card-popup" onClick={this.stopPropagation}>
          {person ? this.renderDetail(person, biographyText) : this.renderMissing()}
        </div>
      </div>
    );
  }
}

const CardPageTranslated = withTranslation()(CardPageBase);

function useCardExportReady(person, biographyText, exportMode) {
  useEffect(() => {
    if (!exportMode) {
      return undefined;
    }

    document.body.classList.add('card-export-mode');

    if (!person) {
      document.body.classList.add('card-export-ready');
      return () => {
        document.body.classList.remove('card-export-mode', 'card-export-ready');
      };
    }

    let cancelled = false;
    const markReady = () => {
      if (!cancelled) {
        document.body.classList.add('card-export-ready');
      }
    };

    const images = Array.from(document.querySelectorAll('.card-export-root img'));
    const pending = images.filter((img) => !img.complete);

    if (!pending.length) {
      window.requestAnimationFrame(() => {
        window.setTimeout(markReady, 150);
      });
    } else {
      Promise.all(pending.map((img) => new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      }))).then(() => {
        window.setTimeout(markReady, 150);
      });
    }

    return () => {
      cancelled = true;
      document.body.classList.remove('card-export-mode', 'card-export-ready');
    };
  }, [person, biographyText, exportMode]);
}

function usePersonBiography(person, personId) {
  const slug = getBoardSlug();
  const [biographyText, setBiographyText] = useState(() => person?.text || '');

  useEffect(() => {
    if (person?.text) {
      setBiographyText(person.text);
      return undefined;
    }

    if (!person || !slug || !personId) {
      setBiographyText('');
      return undefined;
    }

    let cancelled = false;

    fetch(`/s/${slug}/api/board/person/${encodeURIComponent(personId)}`, {
      headers: { Accept: 'application/json' },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled && payload?.person?.text) {
          setBiographyText(payload.person.text);
        }
      })
      .catch(() => {
        /* ignore biography fetch errors */
      });

    return () => {
      cancelled = true;
    };
  }, [person?.id, person?.text, personId, slug]);

  return biographyText;
}

export default function CardPage({ personId, exportMode = false }) {
  const { goToBoard } = useBoardNavigation();
  const { data } = useBoardData();
  const person = useMemo(
    () => (data.people || []).find((entry) => String(entry.id) === String(personId)),
    [data.people, personId],
  );
  const biographyText = usePersonBiography(person, personId);

  useCardExportReady(person, biographyText, exportMode);

  return (
    <CardPageTranslated
      key={`card-${personId}-${exportMode ? 'export' : 'view'}`}
      person={person}
      biographyText={biographyText}
      exportMode={exportMode}
      onBack={goToBoard}
    />
  );
}
