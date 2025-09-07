import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { formatDistanceToNow } from 'date-fns';
import { FaServer, FaExclamationTriangle, FaInfoCircle, FaBug } from 'react-icons/fa';
import Sketch from 'react-p5';

// Styled Components
const AppContainer = styled.div`
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  display: flex;
  height: 100vh;
  background-color: #f0f2f5;
`;

const Sidebar = styled.div`
  width: 300px;
  background-color: #1a1e24;
  color: white;
  padding: 1rem;
  overflow-y: auto;
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Header = styled.header`
  background-color: white;
  padding: 1rem 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h1`
  margin: 0;
  color: #2c3e50;
  font-size: 1.5rem;
`;

const StatsContainer = styled.div`
  display: flex;
  gap: 1.5rem;
`;

const StatBox = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #555;
`;

const CanvasContainer = styled.div`
  flex: 1;
  background-color: #f8f9fa;
  position: relative;
  overflow: hidden;
`;

const LogEntry = styled.div`
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  background-color: ${props => {
    if (props.level === 'error') return 'rgba(231, 76, 60, 0.1)';
    if (props.level === 'warning') return 'rgba(241, 196, 15, 0.1)';
    return 'rgba(52, 152, 219, 0.1)';
  }};
  border-left: 3px solid ${
    props => {
      if (props.level === 'error') return '#e74c3c';
      if (props.level === 'warning') return '#f1c40f';
      return '#3498db';
    }
  };
`;

const LogMessage = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const LogMeta = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #7f8c8d;
  margin-top: 0.25rem;
`;

const getIconForLevel = (level) => {
  switch (level) {
    case 'error':
      return <FaExclamationTriangle color="#e74c3c" />;
    case 'warning':
      return <FaExclamationTriangle color="#f1c40f" />;
    case 'info':
      return <FaInfoCircle color="#3498db" />;
    default:
      return <FaBug color="#7f8c8d" />;
  }
};

// Sheep class for visualization
class Sheep {
  constructor(p5, x, y, logEntry) {
    this.p5 = p5;
    this.x = x;
    this.y = y;
    this.vx = p5.random(-1, 1);
    this.vy = p5.random(-1, 1);
    this.logEntry = logEntry;
    this.size = 30;
    this.wobble = 0;
  }

  update() {
    // Random movement
    this.x += this.vx;
    this.y += this.vy;
    this.wobble += 0.1;

    // Bounce off edges
    if (this.x < 0 || this.x > this.p5.width) this.vx *= -1;
    if (this.y < 0 || this.y > this.p5.height) this.vy *= -1;

    // Random direction changes
    if (Math.random() < 0.02) {
      this.vx += this.p5.random(-0.5, 0.5);
      this.vy += this.p5.random(-0.5, 0.5);
    }

    // Limit speed
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const maxSpeed = 2;
    if (speed > maxSpeed) {
      this.vx = (this.vx / speed) * maxSpeed;
      this.vy = (this.vy / speed) * maxSpeed;
    }
  }

  display() {
    const p5 = this.p5;
    p5.push();
    p5.translate(this.x, this.y + Math.sin(this.wobble) * 2);
    
    // Body
    p5.fill(this.logEntry.level === 'error' ? '#e74c3c' : 
            this.logEntry.level === 'warning' ? '#f1c40f' : '#3498db');
    p5.ellipse(0, 0, this.size, this.size * 0.7);
    
    // Head
    p5.ellipse(this.size * 0.4, -this.size * 0.2, this.size * 0.6, this.size * 0.6);
    
    // Legs
    p5.rect(-this.size * 0.3, this.size * 0.2, 5, 15);
    p5.rect(this.size * 0.1, this.size * 0.2, 5, 15);
    
    // If it's an error, make it fall down
    if (this.logEntry.level === 'error') {
      p5.rotate(p5.PI / 4);
      p5.textSize(12);
      p5.fill(0);
      p5.text('!', -5, 5);
    }
    
    p5.pop();
  }

  contains(x, y) {
    const d = Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2);
    return d < this.size / 2;
  }
}

function App() {
  const [logs, setLogs] = useState([]);
  const [sheepList, setSheepList] = useState([]);
  const [selectedSheep, setSelectedSheep] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    errors: 0,
    warnings: 0,
    lastUpdated: null
  });

  // WebSocket connection
  useEffect(() => {
    const ws = new WebSocket(process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws/logs');
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'log') {
          const logEntry = data.data;
          
          // Update logs
          setLogs(prevLogs => {
            const newLogs = [logEntry, ...prevLogs].slice(0, 100);
            return newLogs;
          });
          
          // Update stats
          setStats(prevStats => ({
            total: prevStats.total + 1,
            errors: logEntry.level === 'error' ? prevStats.errors + 1 : prevStats.errors,
            warnings: logEntry.level === 'warning' ? prevStats.warnings + 1 : prevStats.warnings,
            lastUpdated: new Date().toISOString()
          }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    return () => {
      ws.close();
    };
  }, []);

  // p5.js setup
  const setup = (p5, canvasParentRef) => {
    p5.createCanvas(p5.windowWidth, p5.windowHeight).parent(canvasParentRef);
  };

  const draw = (p5) => {
    p5.background(240);
    
    // Draw grass
    p5.fill(46, 204, 113);
    p5.rect(0, p5.height - 50, p5.width, 50);
    
    // Draw logs as sheep
    sheepList.forEach(sheep => {
      sheep.update();
      sheep.display();
    });
  };

  const windowResized = (p5) => {
    p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
  };

  const mousePressed = (p5) => {
    // Check if a sheep was clicked
    for (let i = sheepList.length - 1; i >= 0; i--) {
      if (sheepList[i].contains(p5.mouseX, p5.mouseY)) {
        setSelectedSheep(sheepList[i].logEntry);
        break;
      }
    }
  };

  // Add new sheep when logs are updated
  useEffect(() => {
    if (logs.length > 0) {
      const latestLog = logs[0];
      
      setSheepList(prevSheep => {
        const newSheep = new Sheep(
          window.p5,
          Math.random() * window.innerWidth * 0.8 + window.innerWidth * 0.1,
          Math.random() * window.innerHeight * 0.5 + 50,
          latestLog
        );
        
        // Keep only the 20 most recent sheep
        return [newSheep, ...prevSheep].slice(0, 20);
      });
    }
  }, [logs]);

  return (
    <AppContainer>
      <Sidebar>
        <h2>Recent Logs</h2>
        {logs.map((log, index) => (
          <LogEntry key={index} level={log.level}>
            <LogMessage>{log.message}</LogMessage>
            <LogMeta>
              <span>{log.level.toUpperCase()}</span>
              <span>{formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}</span>
            </LogMeta>
          </LogEntry>
        ))}
      </Sidebar>
      
      <MainContent>
        <Header>
          <Title>Server Shepherd 🐑</Title>
          <StatsContainer>
            <StatBox>
              <FaServer />
              <span>{stats.total} Total</span>
            </StatBox>
            <StatBox>
              <FaExclamationTriangle color="#f1c40f" />
              <span>{stats.warnings} Warnings</span>
            </StatBox>
            <StatBox>
              <FaExclamationTriangle color="#e74c3c" />
              <span>{stats.errors} Errors</span>
            </StatBox>
          </StatsContainer>
        </Header>
        
        <CanvasContainer>
          <Sketch 
            setup={setup} 
            draw={draw} 
            windowResized={windowResized}
            mousePressed={mousePressed}
            style={{ width: '100%', height: '100%' }}
          />
          
          {selectedSheep && (
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'white',
              padding: '1rem',
              borderRadius: '8px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              maxWidth: '300px',
              zIndex: 1000
            }}>
              <h3>Log Details</h3>
              <p><strong>Message:</strong> {selectedSheep.message}</p>
              <p><strong>Level:</strong> {selectedSheep.level}</p>
              <p><strong>Source:</strong> {selectedSheep.source}</p>
              <p><strong>Time:</strong> {new Date(selectedSheep.timestamp).toLocaleString()}</p>
              <button onClick={() => setSelectedSheep(null)}>Close</button>
            </div>
          )}
        </CanvasContainer>
      </MainContent>
    </AppContainer>
  );
}

export default App;
