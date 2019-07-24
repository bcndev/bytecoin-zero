// Copyright 2019 The Bytecoin developers.
// Licensed under the GNU Affero General Public License, version 3.

import React, {useEffect, useState} from 'react';
import * as walletd from './lib/walletd';
import * as loop from './lib/loop';
import * as util from './lib/util';
import {Status, BalanceControls} from './Header';
import History from './History';
import styles from './css/App.module.css';

const initialStatus: loop.IStatus = {
  topBlockHeight: 0,
  topBlockTime: new Date(0), // TODO use date just before wallet creation timestamp
  topBlockHash: '',
  topKnownBlockHeight: 0,
  lowerLevelError: '',
};

const initialBalance: loop.IBalance = {
  spendable: 0,
  lockedOrUnconfirmed: 0,
};

const App = React.memo(() => {
  const [wallet, setWallet] = useState<walletd.Walletd | null>(null);
  const [status, setStatus] = useState<loop.IStatus>(initialStatus);
  const [balance, setBalance] = useState<loop.IBalance>(initialBalance);
  const [, setAddresses] = useState<loop.IAddress[]>([]); // TODO
  const [history, setHistory] = useState<loop.IDay[]>([]);

  useEffect(() => {
    loop.start(setWallet, setStatus, setBalance, setAddresses, setHistory).then(() => {console.error('THE END')});
  }, []);

  return (
    <div className={styles.app}>
      <util.WalletContext.Provider value={wallet}>
        <Status {...status}/>
        <BalanceControls {...balance} {...status}/>

        <History history={history}/>

        <div className={styles.footer}>
          © 2019 The Bytecoin developers · <a href='https://github.com/bcndev/bytecoin-zero/blob/master/doc/index.md' target='_blank' rel='noreferrer noopener'>Documentation</a>
        </div>
        <div className={styles.warning}>
          Unstable development version. For testing only.
        </div>
      </util.WalletContext.Provider>
    </div>
  );
});

export default App;
