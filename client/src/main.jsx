import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import App from './App';
import i18n from './lib/i18n';
import { configureNovosibirsk } from './lib/novosibirsk';

import '../../styles/common.scss';
import '../../styles/home.scss';
import '../../styles/card.scss';
import '../../styles/logo-transition.scss';

configureNovosibirsk();

const root = document.getElementById('root');

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <I18nextProvider i18n={i18n}>
        <App />
      </I18nextProvider>
    </BrowserRouter>
  </React.StrictMode>,
  root,
);
