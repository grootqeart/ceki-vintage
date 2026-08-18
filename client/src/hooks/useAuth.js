import { useEffect, useState, useContext } from 'react';
import Axios from 'axios';
import setAuthToken from '../helpers/setAuthToken';
import globalContext from '../context/global/globalContext';

// The server explains exactly what went wrong -- "Email ini sudah terdaftar",
// "Password minimal 6 karakter" -- but axios only ever stringifies to
// "Request failed with status code 400", which is what players were being
// shown. Dig the real message out, and keep the generic one only as a last
// resort.
function serverMessage(error, fallback) {
  const data = error && error.response && error.response.data;
  if (data && Array.isArray(data.errors) && data.errors.length) {
    return data.errors.map((e) => e.msg).join('\n');
  }
  if (data && data.msg) return data.msg;
  return fallback;
}

const useAuth = () => {
  localStorage.token && setAuthToken(localStorage.token);

  const {
    setId,
    setIsLoading,
    setUserName,
    setEmail,
    setChipsAmount,
  } = useContext(globalContext);

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoading(true);

    const token = localStorage.token;
    (token ? loadUser(token) : Promise.resolve()).finally(() => {
      setIsLoading(false);
    });
    // eslint-disable-next-line
  }, []);

  const register = async (name, email, password) => {
    setIsLoading(true);
    try {
      const res = await Axios.post('/api/users', {
        name,
        email,
        password,
      });

      const token = res.data.token;

      if (token) {
        localStorage.setItem('token', token);
        setAuthToken(token);
        await loadUser(token);
      }
    } catch (error) {
      alert(serverMessage(error, 'Pendaftaran gagal. Coba lagi.'));
    }
    setIsLoading(false);
  };

  const login = async (emailAddress, password) => {
    setIsLoading(true);
    try {
      const res = await Axios.post('/api/auth', {
        email: emailAddress,
        password,
      });

      const token = res.data.token;

      if (token) {
        localStorage.setItem('token', token);
        setAuthToken(token);
        await loadUser(token);
      }
    } catch (error) {
      alert(serverMessage(error, 'Email atau password salah.'));
    }
    setIsLoading(false);
  };

  // `credential` is the ID token Google's button hands back. The server
  // verifies it and returns our own JWT, so from here on this is
  // indistinguishable from a password login.
  const loginWithGoogle = async (credential) => {
    setIsLoading(true);
    try {
      const res = await Axios.post('/api/auth/google', { credential });

      const token = res.data.token;

      if (token) {
        localStorage.setItem('token', token);
        setAuthToken(token);
        await loadUser(token);
      }
    } catch (error) {
      alert(serverMessage(error, 'Login Google gagal'));
    }
    setIsLoading(false);
  };

  const loadUser = async (token) => {
    try {
      const res = await Axios.get('/api/auth', {
        headers: {
          'x-auth-token': token,
        },
      });

      const { _id, name, email, chipsAmount } = res.data;

      setIsLoggedIn(true);
      setId(_id);
      setUserName(name);
      setEmail(email);
      setChipsAmount(chipsAmount);
    } catch (error) {
      // Was removeItem(token) -- passing the token's *value* as the key, so
      // the bad token was never actually cleared and every reload retried it.
      localStorage.removeItem('token');
      setAuthToken(null);
      alert(serverMessage(error, 'Sesi berakhir, silakan masuk lagi.'));
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setId(null);
    setUserName(null);
    setEmail(null);
    setChipsAmount(null);
  };

  return [isLoggedIn, login, logout, register, loadUser, loginWithGoogle];
};

export default useAuth;
