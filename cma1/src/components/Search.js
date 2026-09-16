import React, { useState } from 'react';
import FindInPageIcon from '@mui/icons-material/FindInPage';
export default function Search({ contacts, changeChat }) {
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSearch = () => {
    const results = contacts.filter((contact) =>
      contact.username.toLowerCase().includes(searchInput.toLowerCase())
    );

    if (results.length > 0) {
      setSearchResults(results);
      setErrorMessage('');
    } else {
      setSearchResults([]);
      setErrorMessage('Unable to find user.');
    }
  };

  const handleClick = (contact) => {
    changeChat(contact);
    setSearchInput('');
    setSearchResults([]);
    setErrorMessage('');
  };

  return (
    <div className='search'>
      <div className='searchForm'>
        <input
          type='text'
          placeholder='Find a user'
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <div className='button' onClick={handleSearch}><div className='div'>
        <FindInPageIcon/>
          </div> 
          </div>
        <hr />
      </div>

      {errorMessage && <p>{errorMessage}</p>}

      <div className='userChat'>
        {searchResults.map((contact) => (
          <div className='userChatInfo' key={contact._id} onClick={() => handleClick(contact)}>
            <img src={`data:image/svg+xml;base64,${contact.avtarImage}`} alt='avtar' />
            <h3>{contact.username}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}
