import React, { useState,useEffect } from 'react'
import { useNavigate} from 'react-router-dom'
import { ToastContainer,toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'
import axios from 'axios';
import {Buffer} from 'buffer';
import logo from '../images/cl.gif'
import  {AvtarRoute} from '../utils/APIRoutes';
import styled from 'styled-components';
import Logout from '../components/Logout';
const Avtar = () => {
    const api='https://api.multiavatar.com/45678945';
    const navigate=useNavigate();
    const [avtars,setAvtars]=useState([]);
    const [isLoading,setIsLoading]=useState(true);
    const [selectedAvtar,setSelectedAvtar]=useState(undefined);
    const toastOptions={
        position:'bottom-right',
        autoClose:8000,
        pauseOnHover:true,
        draggable:true,
        theme:'dark',
    };
    useEffect(()=>{
        if(!localStorage.getItem('chat-app-user')){
            navigate('/login');
        }
    },[]);
    const setProfilePicture=async()=>{
        if(selectedAvtar===undefined){
  toast.error('pls select an avtar',toastOptions);
        }else{
            const user=await JSON.parse(localStorage.getItem('chat-app-user'));
            const{data}=await axios.post(`${AvtarRoute}/${user._id}`,{
                image:avtars[selectedAvtar],
            });
            console.log(data);
            if(data.isSet){
                user.isAvtarImageSet=true;
                user.avtarImage=data.image;
                localStorage.setItem('chat-app-user',JSON.stringify(user));
                navigate('/');
            }else{
                toast.error("error setting avtar.pls try again", toastOptions);
            }
        }
    };
    useEffect(()=>{
        async function fetchData(){
        const data=[];
        for(let i=0;i<4;i++){
            const image=await axios.get(`${api}/${Math.round(Math.random() * 1000)}`);
            const buffer=new Buffer(image.data);
            data.push(buffer.toString('base64'));
        }
        setAvtars(data);
        setIsLoading(false);
    }fetchData();
    },[]);
  return (
  <>
  {
    isLoading?<Container>
        <img src={logo} alt='logo' className='logo'/>
    </Container>:(
   <Container>
      <div className="title-container">
        <h1>Pick an avatar for your DP</h1>
        </div>
        <div className="avtars">
            {avtars.map((avtar,index)=>{
    return(
        <div key={index} 
        className={`avtar ${selectedAvtar === index ? 'selected': ""}`}>
            <img src={`data:image/svg+xml;base64,${avtar}`} alt='avatr'
            onClick={()=>setSelectedAvtar(index)}/>
        </div>
    );
})}
        </div>
        <button className='submit-btn' onClick={setProfilePicture}>set as DP</button>
      </Container>
      )}
      <ToastContainer/>
  </>
   
  )
}
const Container=styled.div`

    display:flex;
  justify-content:center;
  align-items: center;
  flex-direction:column;
  gap: 3rem;
  background-color: black;
  height:100vh;
  width:100vw;
  .logo{
      max-inline-size:100%;
    height:60%;
    width:35%;
    //   background-color:transparent;
  }
  .title-container{
      h1{
          color: white;
      }
  }
  .avtars{
      display: flex;
      gap: 2rem;
      .avtar{
          border:0.4rem solid transparent;
          padding:0.4rem;
          border-radius:5rem;
          display:flex;
          justify-content:center;
          align-items: center;
          transition:0.5s ease-in-out;
      img{
          height:6rem;
      }}
      .selected{
          border:0.4rem solid #4e0eff;
      }
  }
  .submit-btn{
  background-color: #997af0;
  color: white;
  padding: 1rem 2rem;
  border: none;
  border-radius:0.4rem;
  font-size: 1rem;
  text-transform: uppercase;
  transition: 0.5s ease-in-out;
  &:hover{
    background-color: #4e0eff;
  }
  }
  }
`;

export default Avtar
