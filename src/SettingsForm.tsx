// Copyright 2019 The Bytecoin developers.
// Licensed under the GNU Affero General Public License, version 3.

import React, {useContext, useEffect, useRef} from 'react';
import * as util from './lib/util';
import styles from './css/SettingsForm.module.css';

// @ts-ignore
import NoSleep from 'nosleep.js';

const dayMS = 60 * 60 * 24 * 1000;

const SettingsForm = React.memo((props: {
  viewOnly: boolean,
  topBlockHeight: number,
  topKnownBlockHeight: number,
  topBlockTime: Date,
  dismiss: () => void,
}) => {
  const syncing = props.topBlockHeight !== props.topKnownBlockHeight;
  const farBehind = (new Date()).valueOf() - props.topBlockTime.valueOf() > 2 * dayMS;
  const wantNoSleep = syncing && farBehind && util.isMobile();

  const wallet = useContext(util.WalletContext);
  const noSleep = useRef(new NoSleep());

  useEffect(() => {
    if (!wantNoSleep) {
      turnNoSleep(false);
    }
  }, [wantNoSleep]);

  const turnNoSleep = (on: boolean) => {
    console.info(`no sleep: ${on}`);

    if (on) {
      noSleep.current.enable();
    } else {
      noSleep.current.disable();
    }
  };

  const closeWallet = async () => {
    if (wallet) {
      await wallet.close();
    }
  };

  const exportMnemonic = async () => {
    if (wallet === null)  {
      alert('Wallet closed');
      return;
    }

    const w = window.open();
    if (w === null) {
      alert('Failed to open window with mnemonic text');
      return;
    }

    const [resp, err] = await util.try_(wallet.getWalletInfo({
      need_secrets: true,
    }));
    if (resp === undefined) {
      w.close();
      alert(`Failed to get wallet info: ${err}`);
      return;
    }

    w.document.write(`<code style="word-break:break-all">${resp.first_address}</code><br/><br/><code>${resp.mnemonic}</code>`);
    w.print();
    w.close();
  };

  return (
    <div className={styles.settingsForm}>
      <div className={styles.noSleepGroup}>
        <input type='checkbox' id='noSleep' onChange={(e) => turnNoSleep(e.target.checked)}/> <label htmlFor='noSleep'>Prevent device sleep during sync</label>
      </div>

      <div className={styles.exportMnemonicGroup}>
        <button className='link-like' onClick={exportMnemonic} disabled={props.viewOnly}>
          Export mnemonic
        </button> — print or save as PDF
      </div>

      <div className={styles.controls}>
        <button className={styles.closeWallet} onClick={closeWallet}>
          Close wallet
        </button>

        <button className={styles.dismiss} onClick={props.dismiss}>
          OK
        </button>
      </div>
    </div>
  )
});

export default SettingsForm;
