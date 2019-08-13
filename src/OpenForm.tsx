// Copyright 2019 The Bytecoin developers.
// Licensed under the GNU Affero General Public License, version 3.

import React, {useState} from 'react';
import * as util from './lib/util';
import styles from './css/OpenForm.module.css';

const DEFAULT_MNEMONIC = 'autumn actor sleep rebel fee scissors garage try claim miss maple ribbon alarm size above kite mass gain render grow dice decrease subway calm';

const OpenForm = React.memo((props: {onOpen: (description: string) => void}) => {
  const [opening, setOpening] = useState(false);

  const open = async () => {
    setOpening(true);
    await doOpen(DEFAULT_MNEMONIC);
    setOpening(false);
  };

  const doOpen = async (description: string) => {
    const ok = await util.bioApprove('Bytecoin Zero', 'bytecoin-zero-user', 'Bytecoin Zero User');
    if (!ok) {
      return;
    }

    props.onOpen(description)
  };

  return (
    <div className={styles.openForm}>
      <button onClick={open} disabled={opening}>
        Open wallet
      </button>
    </div>
  );
});

export default OpenForm;
