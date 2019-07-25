// Copyright 2019 The Bytecoin developers.
// Licensed under the GNU Affero General Public License, version 3.

import React, {useEffect, useState} from 'react';
import {formatDistance} from 'date-fns';
import * as locales from 'date-fns/locale';
import * as walletd from './walletd';

export function try_<T, U = Error> (promise: Promise<T>): Promise<[T | undefined, U | null]> {
  return promise
    .then<[T, null]>((data: T) => [data, null])
    .catch<[undefined, U]>((err: U) => [undefined, err])
  ;
}

export function buf2hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function hex2buf(hex: string): ArrayBuffer {
  return new Uint8Array((hex.match(/[\da-f]{2}/gi) || []).map((h) => parseInt(h, 16)));
}

export function groupBy<T, U>(items: T[], keyGetter: (item: T) => U): Map<U, T[]> {
  const m = new Map();

  items.forEach((item) => {
    const key = keyGetter(item);

    const group = m.get(key);
    if (!group) {
      m.set(key, [item]);
    } else {
      group.push(item);
    }
  });

  return m;
}

export function delay(ms: number, prev?: number): Promise<number> {
  return new Promise((resolve) => {
    const offset = prev !== undefined ? Date.now() - prev : 0;
    const timeout = Math.max(ms - offset, 1);

    setTimeout(() => resolve(Date.now()), timeout)
  });
}

export function formatDateTime(d: Date): string {
  return d.toLocaleString(navigator.language, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString(navigator.language, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString(navigator.language, {
    hour: 'numeric',
    minute: 'numeric',
  });
}

function curLocale() {
  const localeId = navigator.language.replace('-', '');
  const shortLocaleId = localeId.slice(0, 2);
  return (locales as any)[localeId] || (locales as any)[shortLocaleId] || locales.enUS;
}

export function formatTimeRelative(t: Date): string {
  return formatDistance(t, Date.now(), {
    addSuffix: true,
    locale: curLocale(),
  });
}

export function formatNumber(n: number): string {
  return n.toLocaleString(navigator.language);
}

export function formatBCN(amount: number, frac: number = 2): string {
  if (amount >= Number.MAX_SAFE_INTEGER) {
    console.warn(`amount ${amount} too big to be exactly represented in JavaScript`);
  }

  return (amount / 1e8).toLocaleString(navigator.language, {
    style: 'currency',
    currency: 'BCN',
    currencyDisplay: 'code',
    minimumFractionDigits: frac,
  });
}

export function formatBCNDelta(amount: number, frac: number = 2, showSign: boolean = false): string {
  const sign = amount > 0 ? '+' : (amount < 0 ? '−' : '');

  return ((!showSign || sign === '') ? '' : (sign + '\u202F')) + formatBCN(Math.abs(amount), frac);
}

export function useRelativeTime(t: Date, updateInterval: number = 15 * 1000) {
  const [relTime, setRelTime] = useState(formatTimeRelative(t));

  useEffect(() => {
    setRelTime(formatTimeRelative(t));

    const handle = setInterval(() => {
      setRelTime(formatTimeRelative(t));
    }, updateInterval);

    return () => {
      clearInterval(handle);
    };
  }, [t, updateInterval]);

  return relTime;
}

export function useScrollIntoView(block: ScrollLogicalPosition) {
  const element = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    if (element.current !== null) {
      element.current.scrollIntoView({
        block,
        behavior: 'smooth',
      });
    }
  }, [block]);

  return element;
}

export const WalletContext = React.createContext<walletd.Walletd | null>(null);

export async function digest(message: string): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const data = enc.encode(message);
  return window.crypto.subtle.digest('SHA-256', data);
}

export async function bioApprove(rpName: string, userName: string, userDisplayName: string): Promise<boolean> {
  const pkCred = (window as any).PublicKeyCredential;
  if (!pkCred) {
    console.log(`skipping authentication for ${userName}@${rpName} due to lacking platform support (public key credentials)`);
    return true;
  }

  const available = await pkCred.isUserVerifyingPlatformAuthenticatorAvailable();
  if (!available) {
    console.log(`skipping authentication for ${userName}@${rpName} due to lacking platform support (user verification)`);
    return true;
  }

  const storageKey = `bio-approve ${userName}@${rpName}`;
  const timeout = 30 * 1000;
  const prevPK = window.localStorage.getItem(storageKey) || '';
  const credentials = (window.navigator as any).credentials;

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  if (prevPK) {
    const opts = {
      challenge,
      timeout,
      userVerification: 'required',
      allowCredentials: [{
        type: 'public-key',
        id: hex2buf(prevPK),
      }],
    };

    const [pk, err] = await try_(credentials.get({ publicKey: opts }));
    if (err !== null) {
      console.warn(`authentication for ${userName}@${rpName} failed: ${err}`);
      return false;
    }

    console.log(`successfully authenticated ${userName}@${rpName} with ${pk.id}`);

    return true;
  } else {
    const opts = {
      rp: {
        name: rpName,
      },
      user: {
        id: await digest(`${userName}@${rpName}`),
        name: userName,
        displayName: userDisplayName,
      },
      challenge,
      timeout,
      userVerification: 'required',
      pubKeyCredParams: [{
        type: 'public-key',
        alg: -7, // ECDSA
      }],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        requireResidentKey: true,
        userVerification: 'required',
      },
    };

    const [pk, err] = await try_(credentials.create({ publicKey: opts }));
    if (err !== null) {
      console.warn(`first authentication for ${userName}@${rpName} failed: ${err}`);
      return false;
    }

    window.localStorage.setItem(storageKey, buf2hex(pk.rawId));
    console.log(`successfully authenticated ${userName}@${rpName} for the first time with ${pk.id}`);

    return true;
  }
}
