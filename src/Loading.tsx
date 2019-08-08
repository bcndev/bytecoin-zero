// Copyright 2019 The Bytecoin developers.
// Licensed under the GNU Affero General Public License, version 3.

import React from 'react';
import styles from './css/Loading.module.css';

const Loading = React.memo(() => {
  return (
    <div className={styles.loading}>
      <div/>
      <div/>
      <div/>
      <div/>
    </div>
  );
});

export default Loading;
