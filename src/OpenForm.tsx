// Copyright 2019 The Bytecoin developers.
// Licensed under the GNU Affero General Public License, version 3.

import React, {useState, useRef} from 'react';
import {generateMnemonic, validateMnemonic} from 'bip39';
import englishWordlist from 'bip39/src/wordlists/english.json';
import * as util from './lib/util';
import logo from './img/logo.svg';
import styles from './css/OpenForm.module.css';

const DEFAULT_MNEMONIC = 'autumn actor sleep rebel fee scissors garage try claim miss maple ribbon alarm size above kite mass gain render grow dice decrease subway calm';

const OpenForm = React.memo((props: {onOpen: (desc: string, isNew: boolean) => void}) => {
  const firstGen = useRef(true);
  const [description, setDescription] = useState('');
  const [genDescription, setGenDescription] = useState('');
  const [descriptionValid, setDescriptionValid] = useState(false);
  const [opening, setOpening] = useState(false);

  const generate = () => {
    const desc = firstGen.current ? DEFAULT_MNEMONIC : generateMnemonic(256, undefined, englishWordlist);
    firstGen.current = false;

    setDescription(desc);
    setGenDescription(desc);
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

    const desc = description.trim().toLowerCase();
    props.onOpen(desc, desc === genDescription && desc !== DEFAULT_MNEMONIC);
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
                      const ok = validateMnemonic(desc.trim().toLowerCase(), englishWordlist);
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
