import React, { useState, useEffect, useRef } from 'react';
import Sketch from 'react-p5';
import './index.css';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    totalLogs: 0,
    errorCount: 0,
    successCount: 0,
    errorRate: 0
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [sheep, setSheep] = useState([]);
  const wsRef = useRef(null);
  const animationRef = useRef(null);

  // WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket('ws://localhost:8000/ws');
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
      };
      
      ws.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        try {
          const logData = JSON.parse(event.data);
          console.log('Parsed log data:', logData);
          setLogs(prevLogs => {
            const newLogs = [...prevLogs, logData];
            // Keep only last 100 logs for performance
            return newLogs.slice(-100);
          });
          
          // Create a sheep for this log entry
          console.log('Creating sheep for log:', logData);
          createSheep(logData);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        // Try to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
      
      wsRef.current = ws;
    };
    
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Fetch stats periodically
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('http://localhost:8000/stats');
        const data = await response.json();
        // Map backend snake_case to frontend camelCase
        const mapped = {
          totalLogs: data.total_logs ?? 0,
          errorCount: data.error_count ?? 0,
          successCount: data.success_count ?? 0,
          errorRate: data.error_rate ?? 0,
        };
        setStats(mapped);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Create sheep for log entries
  const createSheep = (logData) => {
    console.log('createSheep called with:', logData);
    const parsedData = logData.parsed_data || {};
    const isError = parsedData.status_code >= 400;
    
    const newSheep = {
      id: logData.id || Date.now(),
      x: Math.random() * 800 + 100,
      y: Math.random() * 400 + 100,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      size: isError ? 30 : 20,
      color: isError ? '#f44336' : '#4CAF50',
      isError: isError,
      isAcknowledged: false,
      logData: logData,
      age: 0,
      maxAge: 30000, // 30 seconds
      wobble: 0
    };
    
    console.log('Created sheep:', newSheep);
    setSheep(prevSheep => {
      const newSheepList = [...prevSheep, newSheep];
      console.log('Updated sheep list, total sheep:', newSheepList.length);
      return newSheepList;
    });
  };

  // Animation loop
  const animateSheep = () => {
    setSheep(prevSheep => {
      return prevSheep.map(sheep => {
        // Update position
        sheep.x += sheep.vx;
        sheep.y += sheep.vy;
        
        // Bounce off edges
        if (sheep.x <= sheep.size || sheep.x >= 1000 - sheep.size) {
          sheep.vx *= -1;
        }
        if (sheep.y <= sheep.size || sheep.y >= 600 - sheep.size) {
          sheep.vy *= -1;
        }
        
        // Keep within bounds
        sheep.x = Math.max(sheep.size, Math.min(1000 - sheep.size, sheep.x));
        sheep.y = Math.max(sheep.size, Math.min(600 - sheep.size, sheep.y));
        
        // Update age and wobble
        sheep.age += 16; // Assuming 60fps
        sheep.wobble = Math.sin(sheep.age * 0.01) * 2;
        
        // Remove old sheep
        if (sheep.age > sheep.maxAge) {
          return null;
        }
        
        return sheep;
      }).filter(sheep => sheep !== null);
    });
    
    animationRef.current = requestAnimationFrame(animateSheep);
  };

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animateSheep);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // p5.js setup
  const setup = (p5, canvasParentRef) => {
    p5.createCanvas(1000, 600).parent(canvasParentRef);
    p5.background(135, 206, 235); // Sky blue
  };

  // p5.js draw
  const draw = (p5) => {
    // Draw grass background
    p5.background(135, 206, 235);
    
    // Draw grass
    p5.fill(34, 139, 34);
    p5.noStroke();
    for (let i = 0; i < 1000; i += 20) {
      p5.rect(i, 500, 20, 100);
    }
    
    // Draw sheep
    sheep.forEach(sheep => {
      p5.push();
      p5.translate(sheep.x, sheep.y + sheep.wobble);
      
      if (sheep.isError && !sheep.isAcknowledged) {
        // Draw fallen sheep (error)
        p5.fill(sheep.color);
        p5.ellipse(0, 0, sheep.size, sheep.size * 0.6);
        p5.fill(255);
        p5.ellipse(-sheep.size * 0.3, -sheep.size * 0.2, sheep.size * 0.3, sheep.size * 0.3);
        p5.ellipse(sheep.size * 0.3, -sheep.size * 0.2, sheep.size * 0.3, sheep.size * 0.3);
      } else {
        // Draw normal sheep
        p5.fill(sheep.color);
        p5.ellipse(0, 0, sheep.size, sheep.size);
        p5.fill(255);
        p5.ellipse(-sheep.size * 0.3, -sheep.size * 0.2, sheep.size * 0.3, sheep.size * 0.3);
        p5.ellipse(sheep.size * 0.3, -sheep.size * 0.2, sheep.size * 0.3, sheep.size * 0.3);
        
        // Draw legs
        p5.stroke(sheep.color);
        p5.strokeWeight(3);
        p5.line(-sheep.size * 0.2, sheep.size * 0.3, -sheep.size * 0.2, sheep.size * 0.6);
        p5.line(sheep.size * 0.2, sheep.size * 0.3, sheep.size * 0.2, sheep.size * 0.6);
      }
      
      p5.pop();
    });
  };

  // Handle mouse clicks on sheep
  const mousePressed = (p5) => {
    sheep.forEach(sheep => {
      const distance = p5.dist(p5.mouseX, p5.mouseY, sheep.x, sheep.y);
      if (distance < sheep.size && sheep.isError && !sheep.isAcknowledged) {
        setSelectedLog(sheep.logData);
      }
    });
  };

  // Acknowledge error
  const acknowledgeError = async (logId) => {
    try {
      await fetch('http://localhost:8000/acknowledge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          log_id: logId,
          timestamp: Date.now()
        })
      });
      
      // Mark sheep as acknowledged
      setSheep(prevSheep => 
        prevSheep.map(sheep => 
          sheep.id === logId ? { ...sheep, isAcknowledged: true, color: '#4CAF50' } : sheep
        )
      );
      
      setSelectedLog(null);
    } catch (error) {
      console.error('Error acknowledging error:', error);
    }
  };

  // Clear all sheep
  const clearSheep = () => {
    setSheep([]);
  };

  return (
    <div className="dashboard">
      <div className="sidebar">
        <h1>🐑 Server Shepherd</h1>
        
        <div className="connection-status">
          <div className={`status-indicator ${isConnected ? 'connected' : ''}`}></div>
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
        
        <div className="stats">
          <h3>📊 Statistics</h3>
          <div className="stat-item">
            <span>Total Logs:</span>
            <span className="stat-value">{stats.totalLogs}</span>
          </div>
          <div className="stat-item">
            <span>Success:</span>
            <span className="stat-value">{stats.successCount}</span>
          </div>
          <div className="stat-item">
            <span>Errors:</span>
            <span className="stat-value error">{stats.errorCount}</span>
          </div>
          <div className="stat-item">
            <span>Error Rate:</span>
            <span className="stat-value error">{(stats.errorRate * 100).toFixed(1)}%</span>
          </div>
        </div>
        
        <div className="controls">
          <h3>🎮 Controls</h3>
          <button 
            className="control-button" 
            onClick={clearSheep}
            disabled={sheep.length === 0}
          >
            Clear All Sheep ({sheep.length})
          </button>
          <button 
            className="control-button" 
            onClick={() => setSelectedLog(null)}
            disabled={!selectedLog}
          >
            Close Details
          </button>
        </div>
      </div>
      
      <div className="canvas-container">
        <Sketch setup={setup} draw={draw} mousePressed={mousePressed} />
        
        <div className="legend">
          <h4>Legend</h4>
          <div className="legend-item">
            <div className="legend-color" style={{backgroundColor: '#4CAF50'}}></div>
            <span>Success (200-399)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{backgroundColor: '#f44336'}}></div>
            <span>Error (400+)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{backgroundColor: '#FFA500'}}></div>
            <span>Healed</span>
          </div>
        </div>
        
        {selectedLog && (
          <div className="log-details show">
            <button 
              className="close-details" 
              onClick={() => setSelectedLog(null)}
            >
              ×
            </button>
            <h4>Log Details</h4>
            <pre>{JSON.stringify(selectedLog, null, 2)}</pre>
            {selectedLog.parsed_data && selectedLog.parsed_data.status_code >= 400 && (
              <button 
                className="control-button" 
                onClick={() => acknowledgeError(selectedLog.id)}
                style={{marginTop: '10px'}}
              >
                Acknowledge Error
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
