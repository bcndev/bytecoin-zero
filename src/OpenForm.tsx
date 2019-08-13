// Copyright 2019 The Bytecoin developers.
// Licensed under the GNU Affero General Public License, version 3.

import React, {useState} from 'react';
import {validateMnemonic} from 'bip39';
import englishWordlist from 'bip39/src/wordlists/english.json';
import * as util from './lib/util';
import logo from './img/logo.svg';
import styles from './css/OpenForm.module.css';

const DEFAULT_MNEMONIC = 'autumn actor sleep rebel fee scissors garage try claim miss maple ribbon alarm size above kite mass gain render grow dice decrease subway calm';

const OpenForm = React.memo((props: {onOpen: (desc: string) => void}) => {
  const [description, setDescription] = useState('');
  const [descriptionValid, setDescriptionValid] = useState(false);
  const [opening, setOpening] = useState(false);

  const generate = () => {
    setDescription(DEFAULT_MNEMONIC);
    setDescriptionValid(true);
  };

  const open = async () => {
    setOpening(true);
    await doOpen();
    setOpening(false);
  };

  const doOpen = async () => {
    const ok = await util.bioApprove('Bytecoin Zero', 'bytecoin-zero-user', 'Bytecoin Zero User');
    if (!ok) {
      return;
    }

    props.onOpen(description);
  };

  return (
    <div className={styles.openForm}>
      <div className={styles.logo}>
        <img src={logo} alt='Bytecoin'/>
      </div>

      <div className={styles.body}>
        <div className={styles.descGroup}>
          <textarea className={`${descriptionValid ? 'valid' : 'invalid'}`}
                    placeholder='BIP39 mnemonic of Bytecoin wallet'
                    rows={7}
                    autoCapitalize='none'
                    autoComplete='off'
                    spellCheck={false}
                    maxLength={256}
                    value={description}
                    onChange={(e) => {
                      const desc = e.target.value;
                      const ok = validateMnemonic(desc, englishWordlist);
                      setDescriptionValid(ok);
                      setDescription(desc);
                    }}
          />
        </div>

        <div className={styles.controls}>
          <button className={styles.genButton} onClick={generate}>
            Generate mnemonic
          </button>

          <button className={styles.openButton} onClick={open} disabled={opening || !descriptionValid}>
            Open wallet
          </button>
        </div>
      </div>
    </div>
  );
});

export default OpenForm;
