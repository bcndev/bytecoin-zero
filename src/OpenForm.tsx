// Copyright 2019 The Bytecoin developers.
// Licensed under the GNU Affero General Public License, version 3.

import React, {useState, useRef, useEffect} from 'react';
import {generateMnemonic, validateMnemonic} from 'bip39';
import {checkAddressFormat, checkAuditFormat, auditPattern} from "@bcndev/bytecoin";
import englishWordlist from 'bip39/src/wordlists/english.json';
import Avatar from './Avatar';
import * as util from './lib/util';
import * as sync from './lib/sync';
import logo from './img/logo.svg';
import styles from './css/OpenForm.module.css';

const DEFAULT_MNEMONIC = 'autumn actor sleep rebel fee scissors garage try claim miss maple ribbon alarm size above kite mass gain render grow dice decrease subway calm';

interface IWalletInstanceInfo {
  readonly firstAddress: string;
  readonly filename: string;
  readonly viewOnly: boolean;
  readonly lastOpen: number;
}

const OpenForm = React.memo((props: {onOpen: (isFile: boolean, desc: string, isNew: boolean, viewOnly: boolean) => void}) => {
  const firstGen = useRef(true);
  const [description, setDescription] = useState('');
  const [genDescription, setGenDescription] = useState('');
  const [descriptionValid, setDescriptionValid] = useState(false);
  const [opening, setOpening] = useState(false);
  const [existingWallets, setExistingWallets] = useState<IWalletInstanceInfo[]>([]);

  useEffect(() => {
    const w: IWalletInstanceInfo[] = [];

    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i) || '';
      const addr = key.substring('wallet.'.length);
      if (checkAddressFormat(addr)) {
        const info: sync.IAddressWalletsInfo = JSON.parse(window.localStorage.getItem(key) || '{}');
        const wInfo: IWalletInstanceInfo[] = [];
        for (let filename in info) {
          if (info.hasOwnProperty(filename)) {
            wInfo.push({
              firstAddress: addr,
              filename,
              viewOnly: info[filename].viewOnly,
              lastOpen: info[filename].lastOpen,
            });
          }
        }
        w.push(...wInfo);
      }
    }

    w.sort((a, b) => a.lastOpen - b.lastOpen);
    setExistingWallets(w.reverse());
  }, []);

  const generate = () => {
    const desc = firstGen.current ? DEFAULT_MNEMONIC : generateMnemonic(256, undefined, englishWordlist);
    firstGen.current = false;

    setDescription(desc);
    setGenDescription(desc);
    setDescriptionValid(true);
  };

  const open = async (isFile: boolean, desc: string, isNew: boolean, viewOnly: boolean, approve: boolean) => {
    setOpening(true);
    await doOpen(isFile, desc, isNew, viewOnly, approve);
    setOpening(false);
  };

  const doOpen = async (isFile: boolean, desc: string, isNew: boolean, viewOnly: boolean, approve: boolean) => {
    if (approve) {
      const ok = await util.bioApprove('Bytecoin Zero', 'bytecoin-zero-user', 'Bytecoin Zero User');
      if (!ok) {
        return;
      }
    }

    props.onOpen(isFile, desc, isNew, viewOnly);
  };

  return (
    <div className={styles.openForm}>
      <div className={styles.logo}>
        <img src={logo} alt='Bytecoin'/>
      </div>

      <div className={styles.fromDescription}>
        <div className={styles.descGroup}>
          <textarea className={`${descriptionValid ? 'valid' : 'invalid'}`}
                    placeholder='Bytecoin BIP39 mnemonic or an audit secret'
                    rows={7}
                    autoCapitalize='none'
                    autoComplete='off'
                    spellCheck={false}
                    maxLength={512}
                    value={description}
                    onChange={(e) => {
                      const desc = e.target.value;
                      const audit = auditPattern.test(desc.trim());
                      const ok = audit ? checkAuditFormat(desc.trim()) : validateMnemonic(desc.trim().toLowerCase(), englishWordlist);
                      setDescriptionValid(ok);
                      setDescription(desc);
                    }}
          />
        </div>

        <div className={styles.controls}>
          <button className={styles.genButton} onClick={generate}>
            Generate mnemonic
          </button>

          <button className={styles.openButton} disabled={opening || !descriptionValid} onClick={async () => {
            const audit = auditPattern.test(description.trim());
            if (audit) {
              const desc = description.trim();
              await open(false, desc, false, true, false);
            } else {
              const desc = description.trim().toLowerCase();
              await open(false, desc,desc === genDescription && desc !== DEFAULT_MNEMONIC, false, true);
            }
          }}>
            Open wallet
          </button>
        </div>
      </div>

      <div className={styles.existingWallets}>
        {
          existingWallets.map(info =>
            <div key={info.filename} className={styles.walletFile} onClick={async () => {
              const desc = info.filename;
              await open(true, desc, false, info.viewOnly, true);
            }}>
              <div className={styles.avatar}>
                <Avatar message={info.firstAddress}/>
              </div>
              <div className={styles.walletDesc}>
                <div className={styles.walletDetails}>
                  <span className={styles.lastOpen}>Last opened: {util.formatDateTime(new Date(info.lastOpen))}</span> {info.viewOnly && <span className={styles.viewOnly}>View only</span>}
                </div>
                <div className={styles.firstAddress}>
                  {info.firstAddress}
                </div>
              </div>
            </div>
          )
        }
      </div>
    </div>
  );
});

export default OpenForm;
