import React from 'react'
import {BiPowerOff} from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';
export default function Logout() {
    const navigate=useNavigate();
    const handleClick=async()=>{
        localStorage.clear();
        navigate('/login');
    };
  return (
    <div className='Button'title='Click to logout' onClick={handleClick}>
     <BiPowerOff/> 
    </div>
  )
}
