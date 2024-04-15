import React, { useState,useEffect } from 'react'
import {Link, useNavigate} from 'react-router-dom'
import { ToastContainer,toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'
import axios from 'axios';
import  {registerRoute} from '../utils/APIRoutes';
function Register() {
  const navigate=useNavigate();
  const [values,setValues]=useState({
    username:'',
    email:'',
    password:'',
  });
  const toastOptions={
    position: 'bottom-right',
    autoClose:8000,
    pauseOnHover:true,
    draggable:true,
    theme:'dark',
  }
  useEffect(()=>{
    if(localStorage.getItem('chat-app-user')){
      navigate('/register');
    }
  },[])
  const handleSubmit=async(e)=>{
    e.preventDefault();
    if(handleValidation()){
      console.log('in validation',registerRoute);
      const{password,username,email}=values;
      const {data}= await axios.post(registerRoute,{
        username,email,password,
      });
      if(data.status ===false){
        toast.error(data.msg,toastOptions);
      }
      if(data.status ===true){
        localStorage.setItem('chat-app-user',JSON.stringify(data.user));
       navigate("/avtar");
      }
    }
  };
  const handleValidation=()=>{
    const{password,username,email}=values;
if(username.length<3){
  console.log('in validation',toast);
  toast.error("username should be greater than 3 char",toastOptions);
}else if(password.length<5){
  toast.error("password should be of eqaul or greater than 5",toastOptions);
  return false;
}else if (email === ''){
  toast.error('email is required',toastOptions);
return false;
}
return true;
};

const handleChange=(e)=>{
setValues({ ...values,[e.target.name]: e.target.value });
};
  return (
    <>
      <div className='formContainer'>
     <div className='formWrapper'>
       <form onSubmit={(e)=>handleSubmit(e)}>
       <div className='logo'>ChatNex</div>
        <div className='title'>Register</div>
        
            <input type='text' placeholder='DisplayName' name='username' onChange={(e)=>handleChange(e)}/>
            <input type='email' placeholder='Email' name='email' onChange={(e)=>handleChange(e)}/>
            <input type='password' placeholder='Password' name='password' onChange={(e)=>handleChange(e)}/>
            <button type='submit'>Sign Up</button>
             {/* <span>Something went wrong</span> */}
             {/* <button>Login</button> */}
        <p>Already have an account <Link to='/login'>Login</Link></p>
        </form>
        </div>      
    </div>
    <ToastContainer/>
</>
    )
}

export default Register