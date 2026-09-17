import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import logo from '../images/cl.gif';
import { AvtarRoute } from '../utils/APIRoutes';
import { getAvatarSrc } from '../utils/avatarHelper';
import { MODERN_AVATARS, generateCustomAiAvatar } from '../utils/avatarCollection';
import styled from 'styled-components';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import CircularProgress from '@mui/material/CircularProgress';

const Avtar = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'male' | 'female' | 'ai'
  const [selectedAvatarImage, setSelectedAvatarImage] = useState(MODERN_AVATARS[0].image);
  const [isSetting, setIsSetting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // AI Generator state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGeneratedAvatar, setAiGeneratedAvatar] = useState(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [popupNotice, setPopupNotice] = useState(null); // { title, message }

  useEffect(() => {
    if (!localStorage.getItem('chat-app-user')) {
      navigate('/login');
    } else {
      setIsLoading(false);
    }
  }, [navigate]);

  const handleGenerateAi = async (e) => {
    if (e) e.preventDefault();
    if (!aiPrompt.trim()) {
      setPopupNotice({
        title: 'Prompt Required',
        message: 'Please enter a description for your AI avatar (e.g., "cool boy with sunglasses", "anime girl with purple hair").',
      });
      return;
    }

    setIsGeneratingAi(true);
    try {
      const storedUser = JSON.parse(localStorage.getItem('chat-app-user') || '{}');
      const seed = storedUser.username || storedUser._id || aiPrompt;
      const generated = await generateCustomAiAvatar(aiPrompt, '3d avatar', seed);
      setAiGeneratedAvatar(generated);
      setSelectedAvatarImage(generated);
    } catch (err) {
      console.error('Error generating AI avatar:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const setProfilePicture = async () => {
    if (!selectedAvatarImage) {
      setPopupNotice({
        title: 'Select Avatar',
        message: 'Please choose an avatar or generate one with AI before proceeding.',
      });
      return;
    }

    setIsSetting(true);
    try {
      const user = JSON.parse(localStorage.getItem('chat-app-user'));
      const { data } = await axios.post(`${AvtarRoute}/${user._id}`, {
        image: selectedAvatarImage,
      });

      if (data.isSet) {
        user.isAvtarImageSet = true;
        user.avtarImage = data.image;
        localStorage.setItem('chat-app-user', JSON.stringify(user));
        navigate('/');
      } else {
        setPopupNotice({
          title: 'Error',
          message: 'Error setting avatar. Please try again.',
        });
      }
    } catch (err) {
      console.error('Error setting avatar:', err);
      setPopupNotice({
        title: 'Network Error',
        message: 'Failed to save avatar. Please check your backend connection.',
      });
    } finally {
      setIsSetting(false);
    }
  };

  const filteredAvatars = MODERN_AVATARS.filter((av) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'male') return av.category === 'male';
    if (activeTab === 'female') return av.category === 'female';
    return true;
  });

  return (
    <Container>
      {isLoading ? (
        <div className="loader-box">
          <img src={logo} alt="logo" className="logo" />
        </div>
      ) : (
        <div className="avatar-card">
          <div className="header-box">
            <h1>Pick your Profile Avatar</h1>
            <p>Choose from curated modern vector styles or generate a custom avatar with AI</p>
          </div>

          {/* Tab Selector */}
          <div className="tab-bar">
            <button
              type="button"
              className={activeTab === 'all' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setActiveTab('all')}
            >
              All Styles
            </button>
            <button
              type="button"
              className={activeTab === 'male' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setActiveTab('male')}
            >
              Male
            </button>
            <button
              type="button"
              className={activeTab === 'female' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setActiveTab('female')}
            >
              Female
            </button>
            <button
              type="button"
              className={activeTab === 'ai' ? 'tab-btn active ai-tab' : 'tab-btn ai-tab'}
              onClick={() => setActiveTab('ai')}
            >
              <AutoAwesomeIcon style={{ fontSize: '16px' }} /> Create with AI
            </button>
          </div>

          {/* AI Generator Tab View */}
          {activeTab === 'ai' ? (
            <div className="ai-generator-panel">
              <form onSubmit={handleGenerateAi} className="ai-input-row">
                <input
                  type="text"
                  placeholder="e.g. 'cool boy with sunglasses', 'anime girl with purple hair'..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                />
                <button type="submit" disabled={isGeneratingAi} className="ai-gen-btn">
                  {isGeneratingAi ? <CircularProgress size={16} style={{ color: '#111b21' }} /> : <AutoAwesomeIcon style={{ fontSize: '18px' }} />}
                  {isGeneratingAi ? 'Creating...' : 'Generate'}
                </button>
              </form>

              {aiGeneratedAvatar ? (
                <div className="ai-preview-box">
                  <div className="preview-avatar-wrapper selected">
                    <img src={getAvatarSrc(aiGeneratedAvatar)} alt="AI Generated" />
                    <div className="badge-check">
                      <CheckCircleIcon style={{ fontSize: '20px', color: '#00a884' }} />
                    </div>
                  </div>
                  <span className="prompt-label">"{aiPrompt}"</span>
                  <button
                    type="button"
                    onClick={handleGenerateAi}
                    className="regenerate-btn"
                  >
                    <RefreshIcon style={{ fontSize: '16px' }} /> Regenerate Variation
                  </button>
                </div>
              ) : (
                <div className="ai-empty-placeholder">
                  <AutoAwesomeIcon style={{ fontSize: '40px', color: '#00a884', opacity: 0.8 }} />
                  <p>Describe your dream avatar style above and click <strong>Generate</strong></p>
                </div>
              )}
            </div>
          ) : (
            /* Curated Modern Avatars Grid */
            <div className="avatars-grid">
              {filteredAvatars.map((avatar) => {
                const isSelected = selectedAvatarImage === avatar.image;
                return (
                  <div
                    key={avatar.id}
                    className={`avatar-tile ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedAvatarImage(avatar.image)}
                  >
                    <img src={getAvatarSrc(avatar.image)} alt={avatar.name} />
                    <span className="avatar-name">{avatar.name}</span>
                    {isSelected && (
                      <div className="tile-check">
                        <CheckCircleIcon style={{ fontSize: '18px', color: '#00a884' }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Footer */}
          <div className="footer-action">
            <button
              type="button"
              className="submit-btn"
              onClick={setProfilePicture}
              disabled={isSetting || !selectedAvatarImage}
            >
              {isSetting ? <CircularProgress size={18} style={{ color: '#111b21' }} /> : null}
              {isSetting ? 'Setting DP...' : 'Set as DP & Continue'}
            </button>
          </div>
        </div>
      )}

      {/* In-App Notice Popup (Zero native alerts) */}
      {popupNotice && (
        <div className="popup-backdrop" onClick={() => setPopupNotice(null)}>
          <div className="popup-card" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <div className="popup-icon">⚠️</div>
              <h3>{popupNotice.title}</h3>
            </div>
            <p>{popupNotice.message}</p>
            <div className="popup-footer">
              <button type="button" onClick={() => setPopupNotice(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #0c1317;
  min-height: 100vh;
  width: 100vw;
  padding: 24px;
  box-sizing: border-box;

  .loader-box {
    display: flex;
    justify-content: center;
    align-items: center;
    .logo {
      height: 120px;
    }
  }

  .avatar-card {
    background-color: #111b21;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 32px 28px;
    max-width: 680px;
    width: 100%;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    box-sizing: border-box;
  }

  .header-box {
    text-align: center;
    h1 {
      color: #e9edef;
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 6px 0;
    }
    p {
      color: #8696a0;
      font-size: 13.5px;
      margin: 0;
    }
  }

  .tab-bar {
    display: flex;
    background-color: #202c33;
    padding: 4px;
    border-radius: 10px;
    gap: 6px;
    width: 100%;
    max-width: 480px;

    .tab-btn {
      flex: 1;
      padding: 8px 12px;
      border: none;
      background: transparent;
      color: #8696a0;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      transition: all 0.2s;

      &:hover {
        color: #e9edef;
      }

      &.active {
        background-color: #00a884;
        color: #111b21;
      }

      &.ai-tab.active {
        background: linear-gradient(135deg, #00a884, #00d2d3);
        color: #111b21;
      }
    }
  }

  .avatars-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    width: 100%;
    max-height: 380px;
    overflow-y: auto;
    padding: 6px;
    box-sizing: border-box;

    @media (max-width: 600px) {
      grid-template-columns: repeat(3, 1fr);
    }
    @media (max-width: 400px) {
      grid-template-columns: repeat(2, 1fr);
    }

    .avatar-tile {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 12px 8px;
      background-color: #182229;
      border: 2px solid transparent;
      border-radius: 12px;
      cursor: pointer;
      position: relative;
      transition: all 0.2s ease-in-out;

      img {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        object-fit: cover;
        transition: transform 0.2s;
      }

      .avatar-name {
        color: #e9edef;
        font-size: 12.5px;
        font-weight: 500;
      }

      &:hover {
        background-color: #202c33;
        transform: translateY(-2px);
      }

      &.selected {
        border-color: #00a884;
        background-color: rgba(0, 168, 132, 0.12);

        img {
          transform: scale(1.04);
        }
      }

      .tile-check {
        position: absolute;
        top: 6px;
        right: 6px;
      }
    }
  }

  .ai-generator-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    width: 100%;
    padding: 10px 0;

    .ai-input-row {
      display: flex;
      gap: 8px;
      width: 100%;

      input {
        flex: 1;
        background-color: #202c33;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        padding: 10px 14px;
        color: #e9edef;
        font-size: 13.5px;
        outline: none;

        &:focus {
          border-color: #00a884;
        }
      }

      .ai-gen-btn {
        background: linear-gradient(135deg, #00a884, #00d2d3);
        color: #111b21;
        border: none;
        border-radius: 8px;
        padding: 0 18px;
        font-weight: 600;
        font-size: 13.5px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: opacity 0.2s;

        &:hover {
          opacity: 0.9;
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }
    }

    .ai-preview-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 16px;
      background-color: #182229;
      border: 1px solid rgba(0, 168, 132, 0.3);
      border-radius: 12px;
      width: 100%;
      box-sizing: border-box;

      .preview-avatar-wrapper {
        position: relative;
        img {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          border: 3px solid #00a884;
          object-fit: cover;
        }
        .badge-check {
          position: absolute;
          bottom: 2px;
          right: 2px;
          background: #111b21;
          border-radius: 50%;
        }
      }

      .prompt-label {
        color: #8696a0;
        font-size: 13px;
        font-style: italic;
      }

      .regenerate-btn {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #00a884;
        border-radius: 6px;
        padding: 6px 14px;
        font-size: 12.5px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s;

        &:hover {
          background-color: rgba(0, 168, 132, 0.15);
          border-color: #00a884;
        }
      }
    }

    .ai-empty-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 36px 16px;
      text-align: center;
      color: #8696a0;
      font-size: 13.5px;

      strong {
        color: #00a884;
      }
    }
  }

  .footer-action {
    width: 100%;
    display: flex;
    justify-content: center;

    .submit-btn {
      background-color: #00a884;
      color: #111b21;
      padding: 12px 32px;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background 0.2s, transform 0.1s;

      &:hover {
        background-color: #06cf9c;
        transform: translateY(-1px);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }
  }

  /* In-App Popup Modal */
  .popup-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.75);
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease-out;
  }

  .popup-card {
    background-color: #202c33;
    border-radius: 12px;
    width: 380px;
    max-width: 90vw;
    padding: 24px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.7);
    display: flex;
    flex-direction: column;
    gap: 14px;

    .popup-header {
      display: flex;
      align-items: center;
      gap: 10px;

      .popup-icon {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background-color: rgba(234, 134, 143, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ea868f;
        font-size: 18px;
      }

      h3 {
        margin: 0;
        color: #e9edef;
        font-size: 17px;
        font-weight: 600;
      }
    }

    p {
      margin: 0;
      color: #8696a0;
      font-size: 13.5px;
      line-height: 1.5;
    }

    .popup-footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 6px;

      button {
        background-color: #00a884;
        border: none;
        color: #111b21;
        font-weight: 600;
        padding: 8px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13.5px;
        transition: background 0.2s;
      }
    }
  }
`;

export default Avtar;
