import React, { useContext } from 'react';
import Text from '../typography/Text';
import rotateGif from '../../assets/game/rotate.gif';
import styled from 'styled-components';
import contentContext from '../../context/content/contentContext';

const Wrapper = styled.div`
  display: none;
  position: fixed;
  z-index: 105;
  background-color: hsl(202, 49%, 18%);
  padding: 2rem;
  box-sizing: border-box;
  /* top/right/bottom/left:0 (rather than width/height:100%) reliably covers
     the full visual viewport on mobile browsers -- width/height:100% on a
     fixed element can fall short of the real screen edges on some mobile
     browsers (notably iOS Safari), leaving a sliver of the page's own
     background visible around the edges. */
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;

  & ${Text} {
    color: ${(props) => props.theme.colors.fontColorLight};
    word-break: break-all;
  }

  @media screen and (orientation: portrait) {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
`;

export const RotateDevicePrompt = () => {
  const { getLocalizedString } = useContext(contentContext);
  return (
    <Wrapper>
      <img
        src={rotateGif}
        width="140"
        style={{ width: '140px' }}
        alt="Rotate your device into landscape mode"
      />
      <br />
      <Text textAlign="center">
        {getLocalizedString('game_rotate-device-prompt')}
      </Text>
    </Wrapper>
  );
};
