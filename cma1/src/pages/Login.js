import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import { loginRoute } from '../utils/APIRoutes';
import styled from 'styled-components';
import ChatNexLogo from '../components/ChatNexLogo';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CircularProgress from '@mui/material/CircularProgress';

function Login() {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    username: '',
    password: '',
  });

  const [errors, setErrors] = useState({
    username: '',
    password: '',
  });

  const [touched, setTouched] = useState({
    username: false,
    password: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const toastOptions = {
    position: 'top-right',
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    theme: 'dark',
  };

  useEffect(() => {
    if (localStorage.getItem('chat-app-user')) {
      navigate('/');
    }
  }, [navigate]);

  // Real-time validator that dynamically removes satisfied errors
  const validateField = (name, value) => {
    let errorMsg = '';
    const trimmed = value ? value.trim() : '';

    if (name === 'username') {
      if (!trimmed) {
        errorMsg = 'Username or email is required';
      }
    } else if (name === 'password') {
      if (!value) {
        errorMsg = 'Password is required';
      } else if (value.length < 5) {
        errorMsg = 'Password must be at least 5 characters';
      }
    }

    setErrors((prev) => ({ ...prev, [name]: errorMsg }));
    return errorMsg;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setAuthError(''); // Clear server-level auth error on typing

    // Validate in real-time: if field is touched or previously errored, validate immediately
    if (touched[name] || errors[name]) {
      validateField(name, value);
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    validateField(name, value);
  };

  const handleValidation = () => {
    const usernameError = validateField('username', values.username);
    const passwordError = validateField('password', values.password);

    setTouched({
      username: true,
      password: true,
    });

    if (usernameError || passwordError) {
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!handleValidation()) return;

    setIsLoading(true);
    setAuthError('');

    try {
      const { username, password } = values;
      const { data } = await axios.post(loginRoute, {
        username: username.trim(),
        password,
      });

      if (data.status === false) {
        // Always display generic "Invalid email or password" as requested
        const genericMsg = 'Invalid email or password';
        toast.error(genericMsg, toastOptions);
        setAuthError(genericMsg);
      } else if (data.status === true) {
        localStorage.setItem('chat-app-user', JSON.stringify(data.user));
        toast.success('Login successful! Redirecting...', toastOptions);
        setTimeout(() => {
          navigate('/');
        }, 500);
      }
    } catch (err) {
      console.error('Login error:', err);
      const genericMsg = 'Invalid email or password';
      toast.error(genericMsg, toastOptions);
      setAuthError(genericMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <div className="auth-card">
        {/* Brand Header */}
        <div className="brand-header">
          <ChatNexLogo size={48} showText={true} textSize="1.65rem" glow={true} />
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in with your username or email to continue</p>
        </div>

        {/* Generic Auth Error Alert */}
        {authError && (
          <div className="auth-alert-banner">
            <ErrorOutlineIcon style={{ fontSize: '18px' }} />
            <span>{authError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Username / Email Field */}
          <div className="form-group">
            <label htmlFor="username">Username or Email</label>
            <div className={`input-wrapper ${errors.username && touched.username ? 'has-error' : ''}`}>
              <PersonOutlineIcon className="input-icon" />
              <input
                id="username"
                type="text"
                placeholder="Enter username or email"
                name="username"
                value={values.username}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="username"
                disabled={isLoading}
              />
            </div>
            {errors.username && touched.username && (
              <span className="field-error-msg">
                <ErrorOutlineIcon style={{ fontSize: '13px' }} />
                {errors.username}
              </span>
            )}
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className={`input-wrapper ${errors.password && touched.password ? 'has-error' : ''}`}>
              <LockOutlinedIcon className="input-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                name="password"
                value={values.password}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="current-password"
                disabled={isLoading}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <VisibilityOffOutlinedIcon style={{ fontSize: '18px' }} />
                ) : (
                  <VisibilityOutlinedIcon style={{ fontSize: '18px' }} />
                )}
              </button>
            </div>
            {errors.password && touched.password && (
              <span className="field-error-msg">
                <ErrorOutlineIcon style={{ fontSize: '13px' }} />
                {errors.password}
              </span>
            )}
          </div>

          {/* Submit Button */}
          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? (
              <>
                <CircularProgress size={18} style={{ color: '#111b21' }} />
                <span>Signing In...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>

          {/* Switch to Register */}
          <div className="auth-footer">
            <p>
              Don't have an account? <Link to="/register">Create Account</Link>
            </p>
          </div>
        </form>
      </div>
      <ToastContainer {...toastOptions} />
    </Container>
  );
}

const Container = styled.div`
  min-height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #0c1317;
  background-image: 
    radial-gradient(circle at 15% 20%, rgba(0, 168, 132, 0.08) 0%, transparent 40%),
    radial-gradient(circle at 85% 80%, rgba(0, 168, 132, 0.06) 0%, transparent 40%);
  padding: 24px;
  box-sizing: border-box;

  .auth-card {
    background-color: #111b21;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    padding: 38px 34px;
    max-width: 440px;
    width: 100%;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.65);
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-sizing: border-box;
    animation: fadeIn 0.25s ease-out;

    @media (max-width: 480px) {
      padding: 28px 20px;
    }
  }

  .brand-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 6px;

    .auth-title {
      color: #e9edef;
      font-size: 22px;
      font-weight: 700;
      margin: 12px 0 2px 0;
      letter-spacing: -0.01em;
    }

    .auth-subtitle {
      color: #8696a0;
      font-size: 13.5px;
      margin: 0;
      line-height: 1.4;
    }
  }

  .auth-alert-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    background-color: rgba(234, 134, 143, 0.12);
    border: 1px solid rgba(234, 134, 143, 0.35);
    border-radius: 10px;
    padding: 10px 14px;
    color: #ea868f;
    font-size: 13px;
    font-weight: 500;
    animation: fadeIn 0.2s ease;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 16px;

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;

      label {
        color: #8696a0;
        font-size: 12.5px;
        font-weight: 500;
      }

      .input-wrapper {
        display: flex;
        align-items: center;
        background-color: #202c33;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        padding: 0 12px;
        transition: all 0.2s ease;

        &:focus-within {
          border-color: #00a884;
          box-shadow: 0 0 0 3px rgba(0, 168, 132, 0.15);
        }

        &.has-error {
          border-color: #ea868f;
          box-shadow: 0 0 0 2px rgba(234, 134, 143, 0.15);
        }

        .input-icon {
          color: #8696a0;
          font-size: 19px;
          margin-right: 8px;
          flex-shrink: 0;
        }

        input {
          flex: 1;
          background-color: transparent;
          border: none;
          color: #e9edef;
          font-size: 14px;
          padding: 12px 0;
          outline: none;

          &::placeholder {
            color: #667781;
          }

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        }

        .password-toggle-btn {
          background: transparent;
          border: none;
          color: #8696a0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 4px;
          transition: color 0.15s;

          &:hover {
            color: #e9edef;
          }
        }
      }

      .field-error-msg {
        color: #ea868f;
        font-size: 11.5px;
        display: flex;
        align-items: center;
        gap: 3px;
        margin-top: 2px;
        animation: fadeIn 0.15s ease-out;
      }
    }

    .submit-btn {
      margin-top: 6px;
      background-color: #00a884;
      color: #111b21;
      padding: 12px;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: background-color 0.2s, transform 0.1s;
      letter-spacing: 0.01em;

      &:hover:not(:disabled) {
        background-color: #06cf9c;
        transform: translateY(-1px);
      }

      &:active:not(:disabled) {
        transform: translateY(0);
      }

      &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
    }

    .auth-footer {
      text-align: center;
      margin-top: 4px;

      p {
        color: #8696a0;
        font-size: 13px;
        margin: 0;

        a {
          color: #00a884;
          text-decoration: none;
          font-weight: 600;
          margin-left: 4px;
          transition: color 0.2s;

          &:hover {
            color: #06cf9c;
            text-decoration: underline;
          }
        }
      }
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

export default Login;
