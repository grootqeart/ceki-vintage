import React from 'react';
import styled from 'styled-components';
import theme from '../../styles/theme';

const WatermarkTextWrapper = styled.div`
  position: fixed;
  left: 40vw;
  top: 10vh;
  z-index: -99;
  overflow-x: hidden;
`;

const WatermarkText = () => (
  <WatermarkTextWrapper>
    <svg
      width="1328"
      height="647"
      viewBox="0 0 1328 647"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '80vw', height: '80vh' }}
    >
      <text
        x="0"
        y="120"
        opacity="0.15"
        fontFamily="Playfair Display, serif"
        fontWeight="700"
        fontSize="150"
        fill={theme.colors.secondaryCta}
      >
        CEKI
      </text>
      <text
        x="0"
        y="580"
        opacity="0.15"
        fontFamily="Playfair Display, serif"
        fontWeight="700"
        fontSize="150"
        fill={theme.colors.secondaryCta}
      >
        ONLINE
      </text>
    </svg>
  </WatermarkTextWrapper>
);

export default WatermarkText;
