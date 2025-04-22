import React from 'react';
import { Image } from 'antd';

const Logo = ({ width = 150, height = 50 }) => {
  return (
    <Image
      src="public/images/logo.png/"
      alt="Website Logo"
      width={width}
      height={height}
      preview={false}
      fallback="/images/logo-placeholder.png"
    />
  );
};

export default Logo; 