import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import App from './App';
import i18n, { initBoardI18n } from './lib/i18n';
import { configureNovosibirsk } from './lib/novosibirsk';
import { isStaticSite } from './lib/asset-url';

import '../../styles/home.scss';
import '../../styles/card.scss';
import '../../styles/logo-transition.scss';

configureNovosibirsk();

const root = document.getElementById('root');
const Router = isStaticSite() ? HashRouter : BrowserRouter;

initBoardI18n().then(() => {
  ReactDOM.render(
    <React.StrictMode>
      <Router>
        <I18nextProvider i18n={i18n}>
          <App />
        </I18nextProvider>
      </Router>
    </React.StrictMode>,
    root,
  );
});
