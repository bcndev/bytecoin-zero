// Copyright 2019 The Bytecoin developers.
// Licensed under the GNU Affero General Public License, version 3.

import React from 'react';
import styles from './css/OpenForm.module.css';

const OpenForm = React.memo((props: {onOpen: (wallet: string) => void}) => {
  return (
    <div className={styles.openForm}>
      <button onClick={() => props.onOpen('TODO')}>
        Open wallet
      </button>
    </div>
  );
});

export default OpenForm;
