import React, { useEffect, useState } from 'react'
import {Link, useNavigate} from 'react-router-dom'
import { ToastContainer,toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'
import axios from 'axios';
import  {loginRoute} from '../utils/APIRoutes';
function Login() {
  const navigate=useNavigate();
  const [values,setValues]=useState({
    username:'',
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
      navigate('/login');
    }
  },[])
  const handleSubmit=async(e)=>{
    e.preventDefault();
    if(handleValidation()){
      console.log('in validation',loginRoute);
      const{password,username}=values;
      const {data}= await axios.post(loginRoute,{
        username,password,
      });
      if(data.status ===false){
        toast.error(data.msg,toastOptions);
      }
      if(data.status ===true){
        localStorage.setItem('chat-app-user',JSON.stringify(data.user));
       navigate("/");
      }
    }
  };
  
  const handleValidation=()=>{
    const{password,username}=values;
if(username.length===''){
  console.log('in validation',toast);
  toast.error("username and password is required",toastOptions);
}else if(password.length===''){
  toast.error("username and password is required",toastOptions);
  return false;
}
return true;
};

const handleChange=(e)=>{
setValues({ ...values,[e.target.name]: e.target.value });
};
  return (
    <div>
    <div className='formContainer'>
     <div className='formWrapper'>
        <form onSubmit={(e)=>handleSubmit(e)}>
        <span className='logo'>ChatNex</span>
        <span className='title'>Login</span>
       
            <input type='text' placeholder='displayName' name='username' onChange={(e)=>handleChange(e)} min='3'/>
            <input type='password' placeholder='password' name='password' onChange={(e)=>handleChange(e)}/>
            <button>Sign In</button>
        <p>Don't have an account <Link to='/register'>Register</Link></p>
       </form>
        </div>      
    </div> 
    <ToastContainer/> 
  </div>
  )
}

export default Login
