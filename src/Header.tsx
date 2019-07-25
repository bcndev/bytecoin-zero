// Copyright 2019 The Bytecoin developers.
// Licensed under the GNU Affero General Public License, version 3.

import React, {useState} from 'react';
import {CSSTransition} from 'react-transition-group';
import * as loop from './lib/loop';
import * as util from './lib/util';
import {ReactComponent as ArrowNE} from './img/Arrow_northeast.svg';
import {ReactComponent as ArrowSE} from './img/Arrow_southeast.svg';
import SendForm from './SendForm';
import logo from './img/logo.svg';
import styles from './css/Header.module.css';

export const Status = React.memo((props: loop.IStatus) => {
  const initializing = props.topBlockHash === '';
  const syncing = props.topBlockHeight !== props.topKnownBlockHeight;

  const relTime = util.useRelativeTime(props.topBlockTime);

  return (
    <div className={styles.status}>
      <div className={styles.statusIcon}>
        <img src={logo} alt='Bytecoin'/>
      </div>
      <div className={styles.syncStatusSummary}>
        <div className={styles.syncStatus}>
          {initializing ? 'Initializing wallet…' :
            <button className={`${styles.settings} link-like`}>
              {syncing ? <span className={styles.ellipsis}>Syncing</span> : 'Synced'}
            </button>
          }
        </div>
        {props.lowerLevelError ?
          <div className={styles.syncStatusError}>
            <code>
              {props.lowerLevelError} {/*TODO localize*/}
            </code>
          </div>
          :
          <div className={styles.syncStatusBlock} hidden={props.topBlockHeight === 0}>
            <a href={`https://explorer.bytecoin.org/block?hash=${props.topBlockHash}`} target='_blank' rel='noreferrer noopener'>
              {util.formatNumber(props.topBlockHeight)}
            </a> <span className={styles.syncStatusTimestamp}>
              {relTime}
            </span>
          </div>
        }
      </div>
    </div>
  );
});

export const BalanceControls = React.memo((props: loop.IStatus & loop.IBalance) => {
  const syncing = props.topBlockHeight !== props.topKnownBlockHeight;
  const initializing = props.topBlockHash === '';

  const [sending, setSending] = useState(false);
  const [, setReceiving] = useState(false);

  return (
    <div className={styles.balanceControls}>
      <div className={styles.main}>
        <div className={styles.balance}>
          <div className={styles.balanceAvailable}>
            {util.formatBCN(props.spendable)}
          </div>
          <div className={styles.balancePending}>
            {!syncing && props.lockedOrUnconfirmed > 0 && `${util.formatBCN(props.lockedOrUnconfirmed)} pending`}
          </div>
        </div>
        <div className={styles.recv} hidden={initializing}>
          <button className='link-like' onClick={() => setReceiving(true)} disabled>
            <ArrowSE/> Receive
          </button>
        </div>
        <div className={styles.send} hidden={initializing}>
          <button className='link-like' onClick={() => setSending(true)} disabled={sending}>
            <ArrowNE/> Send
          </button>
        </div>
      </div>
      <CSSTransition in={sending} unmountOnExit={true} timeout={300} classNames='balance-send-form'>
        <div className={styles.drawer}>
          <SendForm cancel={() => setSending(false)}/>
        </div>
      </CSSTransition>
    </div>
  );
});
