// Copyright 2019 The Bytecoin developers.
// Licensed under the GNU Affero General Public License, version 3.

import React from 'react';
import styles from './css/OpenForm.module.css';

const DEFAULT_MNEMONIC = 'autumn actor sleep rebel fee scissors garage try claim miss maple ribbon alarm size above kite mass gain render grow dice decrease subway calm';

const OpenForm = React.memo((props: {onOpen: (wallet: string) => void}) => {
  return (
    <div className={styles.openForm}>
      <button onClick={() => props.onOpen(DEFAULT_MNEMONIC)}>
        Open wallet
      </button>
    </div>
  );
});

export default OpenForm;
