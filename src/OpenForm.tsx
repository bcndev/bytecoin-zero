// Copyright 2019 The Bytecoin developers.
// Licensed under the GNU Affero General Public License, version 3.

import React, {useState} from 'react';
import {validateMnemonic} from 'bip39';
import englishWordlist from 'bip39/src/wordlists/english.json';
import * as util from './lib/util';
import logo from './img/logo.svg';
import styles from './css/OpenForm.module.css';

const DEFAULT_MNEMONIC = 'autumn actor sleep rebel fee scissors garage try claim miss maple ribbon alarm size above kite mass gain render grow dice decrease subway calm';

const OpenForm = React.memo((props: {onOpen: (description: string) => void}) => {
  const [descValid, setDescValid] = useState(false);
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
      <div className={styles.logo}>
        <img src={logo} alt='Bytecoin'/>
      </div>

      <div className={styles.body}>
        <div className={styles.descGroup}>
          <textarea id='wallet-description'
                    placeholder='BIP39 mnemonic of Bytecoin wallet'
                    rows={7}
                    autoCapitalize='none'
                    autoComplete='off'
                    spellCheck={false}
                    maxLength={256}
                    onChange={(e) => {
                      const desc = e.target.value;
                      const ok = validateMnemonic(desc, englishWordlist);
                      setDescValid(ok);
                    }}
          />
        </div>

        <div className={styles.controls}>
          <button className={styles.openButton} onClick={open} disabled={opening || !descValid}>
            Open wallet
          </button>
        </div>
      </div>
    </div>
  );
});

export default OpenForm;
