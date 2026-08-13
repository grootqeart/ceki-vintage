import styled from 'styled-components';

export const PositionedUISlot = styled.div`
  width: ${({ width }) => width || 'auto'};
  height: ${({ height }) => height || 'auto'};
  position: absolute;
  top: ${({ top }) => top};
  right: ${({ right }) => right};
  bottom: ${({ bottom }) => bottom};
  left: ${({ left }) => left};
  transform-origin: ${({ origin }) => origin || 'top left'};
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;

  /* Every transform below lives inside a media query capped at 1068px, so on
     anything wider -- i.e. an ordinary desktop monitor -- no rule matched and
     the scale prop was silently ignored: slots rendered at full size and the
     seats grew straight over the felt and the discard pile. This base rule
     makes the prop mean something at every width; the queries still override
     it as the window narrows. */
  transform: ${({ scale }) => (scale ? `scale(${scale})` : 'none')};

  @media screen and (max-width: 1068px) {
    transform: ${({ scale }) => `scale(${+scale + 0.3})` || '1'};
  }

  @media screen and (max-width: 968px) {
    transform: ${({ scale }) => `scale(${+scale + 0.25})` || '1'};
  }

  @media screen and (max-width: 868px) {
    transform: ${({ scale }) => `scale(${+scale + 0.2})` || '1'};
  }

  @media screen and (max-width: 812px) {
    transform: ${({ scale }) => `scale(${+scale + 0.15})` || '1'};
  }

  @media screen and (max-width: 668px) {
    transform: ${({ scale }) => `scale(${+scale + 0.1})` || '1'};
  }

  @media screen and (max-width: 648px) {
    transform: ${({ scale }) => `scale(${scale + 0.05})` || '1'};
  }

  @media screen and (max-width: 568px) {
    transform: ${({ scale }) => `scale(${scale})` || '1'};
  }
`;
