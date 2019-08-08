// Copyright 2019 The Bytecoin developers.
// Licensed under the GNU Affero General Public License, version 3.

import React, {useEffect, useRef, useState} from 'react';
import {SwitchTransition, CSSTransition} from 'react-transition-group';
import * as loop from './lib/loop';
import * as util from './lib/util';
import {ReactComponent as ArrowNE} from './img/Arrow_northeast.svg';
import {ReactComponent as ArrowSE} from './img/Arrow_southeast.svg';
import ReceiveForm from './ReceiveForm';
import SendForm from './SendForm';
import logo from './img/logo.svg';
import styles from './css/Header.module.css';

// @ts-ignore
import NoSleep from 'nosleep.js';

export const Status = React.memo((props: loop.IStatus & {toggleSettingsOpen: () => void}) => {
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
            <button className={`${styles.settingsButton} link-like`} onClick={props.toggleSettingsOpen}>
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

enum DrawerType {
  None,
  Receive,
  Send,
}

const dayMS = 60 * 60 * 24 * 1000;

export const Controls = React.memo((props: loop.IStatus & loop.IBalance & {settingsOpen: boolean, addresses: loop.IAddress[]}) => {
  const initializing = props.topBlockHash === '';
  const syncing = props.topBlockHeight !== props.topKnownBlockHeight;
  const farBehind = (new Date()).valueOf() - props.topBlockTime.valueOf() > 2 * dayMS;
  const showNoSleep = syncing && farBehind && util.isMobile();

  const noSleep = useRef(new NoSleep());
  const [drawerType, setDrawerType] = useState(DrawerType.None);
  const [nextDrawerType, setNextDrawerType] = useState(DrawerType.None);

  useEffect(() => {
    if (!showNoSleep) {
      turnNoSleep(false);
    }
  }, [showNoSleep]);

  const turnNoSleep = (on: boolean) => {
    console.info(`no sleep: ${on}`);

    if (on) {
      noSleep.current.enable();
    } else {
      noSleep.current.disable();
    }
  };

  const transitionDrawer = (t: DrawerType) => {
    if (drawerType === DrawerType.None) {
      setDrawerType(t);
    } else if (drawerType === t) {
      setDrawerType(DrawerType.None);
    } else {
      setDrawerType(DrawerType.None);
      setNextDrawerType(t);
    }
  };

  const transitionNextDrawer = () => {
    if (nextDrawerType !== DrawerType.None) {
      setDrawerType(nextDrawerType);
      setNextDrawerType(DrawerType.None);
    }
  };

  const controls = (
    <div className={styles.controls}>
      <CSSTransition in={showNoSleep} unmountOnExit={true} timeout={300} classNames='balance-drawer-form-up'>
        <div className={`${styles.drawer} ${styles.noSleep}`}>
          <input type='checkbox' id='noSleep' onChange={(e) => turnNoSleep(e.target.checked)}/> <label htmlFor='noSleep'>Prevent device sleep during sync</label>
        </div>
      </CSSTransition>
      <div className={styles.main}>
        <div className={styles.balance}>
          <div className={styles.balanceAvailable}>
            {util.formatBCN(props.spendable)}
          </div>
          <div className={styles.balancePending}>
            {!syncing && props.lockedOrUnconfirmed > 0 && `${util.formatBCN(props.lockedOrUnconfirmed, 3)} locked or unconfirmed`}
          </div>
        </div>
        <div className={styles.recv} hidden={initializing}>
          <button className={`link-like ${drawerType === DrawerType.Receive ? 'active' : ''}`} onClick={() => transitionDrawer(DrawerType.Receive)}>
            <ArrowSE/> Receive
          </button>
        </div>
        <div className={styles.send} hidden={initializing}>
          <button className={`link-like ${drawerType === DrawerType.Send ? 'active' : ''}`} onClick={() => transitionDrawer(DrawerType.Send)} disabled={syncing}>
            <ArrowNE/> Send
          </button>
        </div>
      </div>
      <CSSTransition in={drawerType === DrawerType.Receive} onExited={transitionNextDrawer} unmountOnExit={true} timeout={300} classNames='balance-drawer-form-down'>
        <div className={styles.drawer}>
          <ReceiveForm addresses={props.addresses} dismiss={() => setDrawerType(DrawerType.None)}/>
        </div>
      </CSSTransition>
      <CSSTransition in={drawerType === DrawerType.Send} onExited={transitionNextDrawer} unmountOnExit={true} timeout={300} classNames='balance-drawer-form-down'>
        <div className={styles.drawer}>
          <SendForm dismiss={() => setDrawerType(DrawerType.None)}/>
        </div>
      </CSSTransition>
    </div>
  );

  const settings = (
    <div className={styles.controls}>
      <div className={styles.main}>
        hello?
      </div>
    </div>
  );

  return (
    <SwitchTransition>
      <CSSTransition timeout={300} key={props.settingsOpen ? 'settings' : 'controls'} classNames='controls-or-settings'>
        <>
          {props.settingsOpen && settings}
          {!props.settingsOpen && controls}
        </>
      </CSSTransition>
    </SwitchTransition>
  );
});
