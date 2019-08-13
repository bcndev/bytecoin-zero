// Copyright 2019 The Bytecoin developers.
// Licensed under the GNU Affero General Public License, version 3.

import React, {useState} from 'react';
import {SwitchTransition, CSSTransition} from 'react-transition-group';
import styles from './css/App.module.css';
import OpenForm from './OpenForm';
import Wallet from './Wallet';

const App = React.memo(() => {
  const [walletDescription, setWalletDescription] = useState('');

  return (
    <div className={`${styles.app} container`}>
      <SwitchTransition>
        <CSSTransition timeout={300} key={walletDescription} mountOnEnter={true} unmountOnExit={true} classNames='app-main'>
          <>
            {!walletDescription &&
              <OpenForm onOpen={(desc) => setWalletDescription(desc)}/>
            }
            {walletDescription &&
              <Wallet description={walletDescription} onClose={() => setWalletDescription('')}/>
            }
          </>
        </CSSTransition>
      </SwitchTransition>

      <div className={styles.footer}>
        © 2019 The Bytecoin developers · <a href='https://github.com/bcndev/bytecoin-zero/blob/master/doc/index.md' target='_blank' rel='noreferrer noopener'>Documentation</a>
      </div>
      <div className={styles.warning}>
        Unstable development version. For testing only.
      </div>
    </div>
  );
});

export default App;
