// Copyright 2019 The Bytecoin developers.
// Licensed under the GNU Affero General Public License, version 3.

import React, {useContext, useState} from 'react';
import {checkAddressFormat} from '@bcndev/bytecoin';
import * as util from './lib/util';
import * as sync from './lib/sync';
import Avatar from './Avatar';
import styles from './css/SendForm.module.css';

// TODO: messages
// TODO: multiple recipients
// TODO: custom fee
const SendForm = React.memo((props: {dismiss: () => void}) => {
  const wallet = useContext(util.WalletContext);

  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState(0);
  const [addressValid, setAddressValid] = useState(false);
  const [amountValid, setAmountValid] = useState(false);
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (sending) {
      return;
    }

    setSending(true);
    await doSend();
    setSending(false);
  };

  const doSend = async () => {
    const approve = window.confirm(`Send ${util.formatBCN(amount)} to ${address}?`);
    if (!approve) {
      return;
    }

    // TODO derive username from wallet
    const ok = await util.bioApprove('Bytecoin Zero', 'bytecoin-zero-user', 'Bytecoin Zero User');
    if (!ok || !wallet) {
      return;
    }

    const [txResp, errCreate] = await util.try_(wallet.createTransaction({
      transaction: {
        transfers: [{
          address,
          amount,
        }],
      },
      any_spend_address: true,
      change_address: '',
      confirmed_height_or_depth: sync.CONFIRMED_DEPTH,
    }));
    if (txResp === undefined) {
      alert(`Failed to create transaction: ${errCreate}`);
      return;
    }

    const [sendResp, errSend] = await util.try_(wallet.sendTransaction({
      binary_transaction: txResp.binary_transaction,
    }));
    if (sendResp === undefined) {
      alert(`Failed to send transaction: ${errSend}`);
      return;
    }

    props.dismiss();
  };

  return (
    <div className={styles.sendForm}>
      <div className={styles.transfer}>
        {addressValid && <div className={styles.addressViz}>
            <Avatar message={address}/>
        </div>}
        <div className={styles.transferBody}>
          <div className={styles.addressGroup}>
            <input className={`${addressValid ? 'valid' : 'invalid'}`}
                   type='text'
                   placeholder='Bytecoin address: bcnZ… or 2…'
                   onChange={(e) => {
                     const addr = e.target.value;
                     const ok = checkAddressFormat(addr);
                     setAddressValid(ok);
                     if (ok) {
                       setAddress(addr);
                     }
                   }}
            />
          </div>
          <div className={styles.amountGroup}>
            <input className={`${amountValid ? 'valid' : 'invalid'}`}
                   type='number'
                   placeholder={util.formatBCN(0)}
                   min='0.01'
                   step='0.01'
                   onChange={(e) => {
                     const am = Math.round(parseFloat(e.target.value) * 1e8); // TODO: exact calculation
                     const ok = am > 0; // TODO: check upper bound
                     setAmountValid(ok);
                     if (ok) {
                       setAmount(am);
                     }
                   }}
            />
          </div>
        </div>
      </div>
      <div className={styles.controls}>
        <button className={styles.sendButton} onClick={send} disabled={sending || !addressValid || !amountValid}>
          Send
        </button>

        <button className={styles.cancelButton} onClick={props.dismiss}>
          Cancel
        </button>
      </div>
    </div>
  );
});

export default SendForm;
