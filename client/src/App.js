import React, { useEffect, useState } from 'react'
import './App.css'
import axios from 'axios';
import io from 'socket.io-client'

const ENDPOINT = 'http://localhost:5000';
var socket;

const App = () => {
  const [output, setOutput] = useState([]);

  useEffect(()=>{
    socket = io(ENDPOINT);
    fetchData();
  }, []);

  useEffect(()=>{ socket.on('fileUpdate', (data)=>{
    console.log(data);

    setOutput(prevOutput => {
      // If the array has at least ten elements, remove the first one
      const updatedOutput = prevOutput.length === 10 ? prevOutput.slice(1) : prevOutput;
      // Append the new line to the array
      console.log([...updatedOutput, data]);
      
      return [...updatedOutput, data.replace(/^\r\n/, '')];
  });
  })}, []);

  const fetchData = async ()=>{
    try {
      const res = await axios.get('/log');       
      // const lines = res.data.split('\n');
      console.log(res.data);
      
      setOutput(res.data);
      // console.log(output);
    } catch (error) {
      console.error(error);
    }

  }

  return (
    <>
    <h1 className='title'>Logstream Live</h1>
    <div className='display-window'>
      {output.map((line, index)=>{ return <p key={index}>{line}</p>})}
    </div>
    </>
  )
}

export default App
