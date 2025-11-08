import React, { useState } from 'react';
import './App.css';
import Classroom from './components/Classroom';
import Home from './components/Home';

function App() {
  const [inClass, setInClass] = useState(false);
  const [classInfo, setClassInfo] = useState(null);

  const joinClass = (info) => {
    setClassInfo(info);
    setInClass(true);
  };

  const leaveClass = () => {
    setInClass(false);
    setClassInfo(null);
  };

  return (
    <div className="App">
      {!inClass ? (
        <Home onJoinClass={joinClass} />
      ) : (
        <Classroom classInfo={classInfo} onLeave={leaveClass} />
      )}
    </div>
  );
}

export default App;
