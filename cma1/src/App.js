// import logo from './logo.svg';
import './App.css';
import Login from './pages/Login';
import Register from './pages/Register';
import ChatPage from './pages/ChatPage';
import Avtar from './pages/Avtar';
import {Routes,Route, BrowserRouter} from 'react-router-dom';
function App() {
  return (
    <div>
      <BrowserRouter>
    <Routes>
    <Route path='/' element={<ChatPage/>}/>
    <Route path='/login' element={<Login/>}/>
    <Route path='/register' element={<Register/>}/>
    <Route path='/avtar' element={<Avtar/>}/>
    </Routes> 
    </BrowserRouter>
    </div>
  );
}

export default App;
