import React, { useContext } from 'react';
import LogoWithText from '../logo/LogoWithText';
import Logo from '../logo/LogoIcon';
import Container from '../layout/Container';
import styled from 'styled-components';
import { Link, withRouter } from 'react-router-dom';
import Hider from '../layout/Hider';
import Button from '../buttons/Button';
import HamburgerButton from '../buttons/HamburgerButton';
import Spacer from '../layout/Spacer';
import contentContext from '../../context/content/contentContext';

const StyledNav = styled.nav`
  padding: 1rem 0;
  position: absolute;
  z-index: 99;
  width: 100%;
  background-color: ${(props) => props.theme.colors.lightestBg};
`;

const Navbar = ({ loggedIn, location, openNavMenu, className }) => {
  const { getLocalizedString } = useContext(contentContext);

  if (!loggedIn)
    return (
      <StyledNav className={className}>
        <Container contentCenteredMobile>
          <Link to="/">
            <LogoWithText />
          </Link>

          <Hider hideOnMobile>
            <Spacer>
              {location.pathname !== '/register' && (
                <Button as={Link} to="/register" primary small>
                  {getLocalizedString('navbar-register_btn')}
                </Button>
              )}
              {location.pathname !== '/login' && (
                <Button as={Link} to="/login" secondary small>
                  {getLocalizedString('navbar-login_btn')}
                </Button>
              )}
            </Spacer>
          </Hider>
        </Container>
      </StyledNav>
    );
  else
    return (
      <StyledNav className={className}>
        <Container>
          <Link to="/">
            <Hider hideOnMobile>
              <LogoWithText />
            </Hider>
            <Hider hideOnDesktop>
              <Logo />
            </Hider>
          </Link>
          <Spacer>
            <HamburgerButton clickHandler={openNavMenu} />
          </Spacer>
        </Container>
      </StyledNav>
    );
};

export default withRouter(Navbar);
