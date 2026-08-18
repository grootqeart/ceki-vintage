import React, { useContext, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import authContext from '../../context/auth/authContext';
import config from '../../clientConfig';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

const StyledWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.25rem;
`;

const StyledDivider = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  color: rgba(0, 0, 0, 0.45);
  font-size: 0.75rem;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(0, 0, 0, 0.15);
  }
`;

const StyledNote = styled.span`
  font-size: 0.7rem;
  color: #a33;
  text-align: center;
`;

// Loads Google's script once per page, no matter how many buttons ask for it.
let gsiPromise = null;
function loadGsi() {
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise((resolve, reject) => {
    if (window.google && window.google.accounts) return resolve();
    const el = document.createElement('script');
    el.src = GSI_SRC;
    el.async = true;
    el.defer = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('gagal memuat skrip Google'));
    document.head.appendChild(el);
    return undefined;
  });
  return gsiPromise;
}

// Renders Google's own button. Deliberately theirs rather than a lookalike:
// Google's terms require the official button, and it keeps working when they
// change the sign-in flow.
//
// Renders nothing at all when no client id is configured, so a build without
// one simply shows the ordinary email/password form instead of a dead button.
const GoogleSignInButton = ({ text = 'signin_with' }) => {
  const { loginWithGoogle } = useContext(authContext);
  const holderRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!config.googleClientId) return;
    let cancelled = false;

    loadGsi()
      .then(() => {
        if (cancelled || !holderRef.current) return;
        window.google.accounts.id.initialize({
          client_id: config.googleClientId,
          callback: ({ credential }) => loginWithGoogle(credential),
        });
        window.google.accounts.id.renderButton(holderRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text,
          width: 280,
        });
      })
      .catch(() => {
        if (!cancelled) setError('Tidak bisa memuat tombol Google.');
      });

    return () => {
      cancelled = true;
    };
  }, [loginWithGoogle, text]);

  if (!config.googleClientId) return null;

  return (
    <StyledWrap>
      <StyledDivider>atau</StyledDivider>
      <div ref={holderRef} />
      {error && <StyledNote>{error}</StyledNote>}
    </StyledWrap>
  );
};

export default GoogleSignInButton;
