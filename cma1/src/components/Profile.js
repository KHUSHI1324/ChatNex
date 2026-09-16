import React ,{useState} from 'react';
import styled from 'styled-components';
import profile from '../images/p.png';
import Logout from './Logout';

export default function Profile({ currentUserName, currentUserImage, email }) {
  const [showProfile, setShowProfile] = useState(false);

  const handleClick = () => {
    setShowProfile(prevState => !prevState); // Toggle the state
  };

  return (
    <div className='Msg'>
      <div className='last' title=' View your profile' onClick={handleClick}>
      
        <img src={profile} alt='profile' />
      </div>
      {showProfile && (
        <ProfileContainer>
          <div className='profile-info'>
            {/* <div className='h2'>Profile</div><hr></hr> */}
            <img src={`data:image/svg+xml;base64,${currentUserImage}`} alt='profile' />
            <h2>{currentUserName}</h2>
            <h4>Email</h4>
            <p>{email}</p>
          </div>
          <Logout />
        </ProfileContainer>
      )}
    </div>
  );
}

const ProfileContainer = styled.div`
  position: fixed;
  top: 36%;
  left: 3.5%;
  width: 20%;
  height: 55%;
  background-color: rgb(33,44,50);
  z-index: 999;
  border: 1.5px solid  white;
  border-radius: 0.5rem 0.5rem 0.5rem 0rem;
 
  padding: 20px;
  // z-index: 999;

  .profile-info {
   
    h2 {
      margin-top: 4px;
      color:white;
    }
    h4 {
      margin-top: 90px;
      color:white;
      margin-left: 20px;
    }
    img {
      height: 80px;
      border-radius: 50%;
      margin-bottom: 10px;
     
    }
    p {
      margin-top: 40px;
      color: #777;
    }
  }
`;
