import React from 'react'
import Robot from '../images/robot.gif'
import Logout from './Logout'
export default function Welcome({currentUser}) {
  return (
  
    <div className='welcome'>
      <img src={Robot} alt='Robot'/>
      <h1>
        Welcome,
        <span>{currentUser.username}!</span></h1> 
      <h3>Ready To Interact</h3>
    </div>
  )
}
