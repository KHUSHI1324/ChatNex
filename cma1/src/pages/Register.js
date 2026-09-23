import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import { registerRoute } from '../utils/APIRoutes';
import styled from 'styled-components';
import ChatNexLogo from '../components/ChatNexLogo';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CircularProgress from '@mui/material/CircularProgress';

function Register() {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [touched, setTouched] = useState({
    username: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Real-time validator that dynamically removes satisfied errors
  const validateField = (name, value, allValues = values) => {
    let errorMsg = '';
    const trimmed = value ? value.trim() : '';

    if (name === 'username') {
      if (!trimmed) {
        errorMsg = 'Username is required';
      } else if (trimmed.length < 3) {
        errorMsg = 'Username must be at least 3 characters';
      }
    } else if (name === 'email') {
      if (!trimmed) {
        errorMsg = 'Email is required';
      } else if (!emailRegex.test(trimmed)) {
        errorMsg = 'Please enter a valid email address';
      }
    } else if (name === 'password') {
      if (!value) {
        errorMsg = 'Password is required';
      } else if (value.length < 5) {
        errorMsg = 'Password must be at least 5 characters';
      }
    } else if (name === 'confirmPassword') {
      if (!value) {
        errorMsg = 'Please confirm your password';
      } else if (value !== allValues.password) {
        errorMsg = 'Passwords do not match';
      }
    }

    setErrors((prev) => ({ ...prev, [name]: errorMsg }));
    return errorMsg;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedValues = { ...values, [name]: value };
    setValues(updatedValues);

    // Validate current field in real-time
    if (touched[name] || errors[name]) {
      validateField(name, value, updatedValues);
    }

    // If password changed, re-validate confirmPassword if already touched
    if (name === 'password' && (touched.confirmPassword || errors.confirmPassword)) {
      validateField('confirmPassword', values.confirmPassword, updatedValues);
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    validateField(name, value, values);
  };

  const handleValidation = () => {
    const usernameError = validateField('username', values.username, values);
    const emailError = validateField('email', values.email, values);
    const passwordError = validateField('password', values.password, values);
    const confirmPasswordError = validateField('confirmPassword', values.confirmPassword, values);

    setTouched({
      username: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (usernameError || emailError || passwordError || confirmPasswordError) {
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!handleValidation()) return;

    setIsLoading(true);

    try {
      const { password, username, email } = values;
      const { data } = await axios.post(registerRoute, {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (data.status === false) {
        toast.error(data.msg || 'Registration failed', toastOptions);
      } else if (data.status === true) {
        if (data.token) {
          localStorage.setItem('chat-app-token', data.token);
        }
        const userToSave = { ...data.user, token: data.token };
        localStorage.setItem('chat-app-user', JSON.stringify(userToSave));
        toast.success('Account created successfully! Choose your avatar...', toastOptions);
        setTimeout(() => {
          navigate('/avtar');
        }, 500);
      }
    } catch (err) {
      console.error('Registration error:', err);
      toast.error('Registration failed. Please check your connection.', toastOptions);
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
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join ChatNex to start messaging with friends</p>
        </div>

        {/* Register Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Display Name / Username */}
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <div className={`input-wrapper ${errors.username && touched.username ? 'has-error' : ''}`}>
              <PersonOutlineIcon className="input-icon" />
              <input
                id="username"
                type="text"
                placeholder="Choose a username"
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

          {/* Email Field */}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className={`input-wrapper ${errors.email && touched.email ? 'has-error' : ''}`}>
              <MailOutlineIcon className="input-icon" />
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                name="email"
                value={values.email}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="email"
                disabled={isLoading}
              />
            </div>
            {errors.email && touched.email && (
              <span className="field-error-msg">
                <ErrorOutlineIcon style={{ fontSize: '13px' }} />
                {errors.email}
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
                placeholder="Create password (min 5 chars)"
                name="password"
                value={values.password}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="new-password"
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

          {/* Confirm Password Field */}
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className={`input-wrapper ${errors.confirmPassword && touched.confirmPassword ? 'has-error' : ''}`}>
              <LockOutlinedIcon className="input-icon" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Re-enter password"
                name="confirmPassword"
                value={values.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="new-password"
                disabled={isLoading}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <VisibilityOffOutlinedIcon style={{ fontSize: '18px' }} />
                ) : (
                  <VisibilityOutlinedIcon style={{ fontSize: '18px' }} />
                )}
              </button>
            </div>
            {errors.confirmPassword && touched.confirmPassword && (
              <span className="field-error-msg">
                <ErrorOutlineIcon style={{ fontSize: '13px' }} />
                {errors.confirmPassword}
              </span>
            )}
          </div>

          {/* Submit Button */}
          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? (
              <>
                <CircularProgress size={18} style={{ color: '#111b21' }} />
                <span>Creating Account...</span>
              </>
            ) : (
              'Sign Up'
            )}
          </button>

          {/* Switch to Login */}
          <div className="auth-footer">
            <p>
              Already have an account? <Link to="/login">Sign In</Link>
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
    padding: 34px 32px;
    max-width: 440px;
    width: 100%;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.65);
    display: flex;
    flex-direction: column;
    gap: 18px;
    box-sizing: border-box;
    animation: fadeIn 0.25s ease-out;

    @media (max-width: 480px) {
      padding: 26px 18px;
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
      margin: 10px 0 2px 0;
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
    gap: 14px;

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 5px;

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
          padding: 11px 0;
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

export default Register;