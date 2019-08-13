// Copyright 2019 The Bytecoin developers.
// Licensed under the GNU Affero General Public License, version 3.

import React, {useEffect, useState} from 'react';
import * as walletd from './lib/walletd';
import * as loop from './lib/loop';
import * as util from './lib/util';
import {Status, Controls} from './Header';
import History from './History';
import styles from './css/Wallet.module.css';

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

const Wallet = React.memo((props: {onClose: () => void}) => {
  const [wallet, setWallet] = useState<walletd.Walletd | null>(null);
  const [status, setStatus] = useState<loop.IStatus>(initialStatus);
  const [balance, setBalance] = useState<loop.IBalance>(initialBalance);
  const [addresses, setAddresses] = useState<loop.IAddress[]>([]);
  const [history, setHistory] = useState<loop.IDay[]>([]);

  useEffect(() => {
    loop.start(setWallet, setStatus, setBalance, setAddresses, setHistory).then(() => {
      console.info('wallet closed');
      props.onClose();
    });
  }, [props]);

  return (
    <div className={styles.wallet}>
      <util.WalletContext.Provider value={wallet}>
        <Status {...status}/>
        <Controls {...status} {...balance} addresses={addresses}/>

        <History history={history}/>
      </util.WalletContext.Provider>
    </div>
  );
});

export default Wallet;
