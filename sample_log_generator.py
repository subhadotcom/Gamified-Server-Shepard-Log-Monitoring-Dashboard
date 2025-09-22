#!/usr/bin/env python3
"""
Sample Log Generator
Generates sample NGINX access logs for testing the Server Shepherd system.
"""

import random
import time
import sys
from datetime import datetime

def generate_nginx_log_line():
    """Generate a random NGINX access log line."""
    
    # Sample data
    ips = [
        "192.168.1.100", "192.168.1.101", "192.168.1.102", "10.0.0.50",
        "203.0.113.1", "198.51.100.42", "172.16.0.10", "192.0.2.1"
    ]
    
    methods = ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"]
    
    paths = [
        "/", "/index.html", "/api/users", "/api/posts", "/static/style.css",
        "/images/logo.png", "/api/auth/login", "/api/data", "/admin",
        "/api/health", "/docs", "/favicon.ico", "/api/metrics"
    ]
    
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        "curl/7.68.0",
        "PostmanRuntime/7.28.4"
    ]
    
    referers = [
        "-", "https://google.com", "https://example.com", "https://github.com"
    ]
    
    # Generate random data
    ip = random.choice(ips)
    method = random.choice(methods)
    path = random.choice(paths)
    user_agent = random.choice(user_agents)
    referer = random.choice(referers)
    
    # Generate status code (mostly 200s, some 400s and 500s)
    status_weights = [0.85, 0.05, 0.05, 0.03, 0.02]  # 200, 404, 500, 403, 301
    status_codes = [200, 404, 500, 403, 301]
    status_code = random.choices(status_codes, weights=status_weights)[0]
    
    # Generate response size
    if status_code == 200:
        size = random.randint(100, 10000)
    else:
        size = random.randint(50, 500)
    
    # Generate timestamp
    now = datetime.now()
    timestamp = now.strftime("%d/%b/%Y:%H:%M:%S %z")
    
    # Format the log line
    log_line = f'{ip} - - [{timestamp}] "{method} {path} HTTP/1.1" {status_code} {size} "{referer}" "{user_agent}"'
    
    return log_line

def main():
    """Generate sample logs continuously."""
    if len(sys.argv) < 2:
        print("Usage: python sample_log_generator.py <output_file> [interval_seconds]")
        print("Example: python sample_log_generator.py sample.log 1")
        sys.exit(1)
    
    output_file = sys.argv[1]
    interval = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
    
    print(f"Generating sample logs to: {output_file}")
    print(f"Interval: {interval} seconds")
    print("Press Ctrl+C to stop")
    
    try:
        with open(output_file, 'w') as f:
            f.write("")  # Clear the file
        
        while True:
            log_line = generate_nginx_log_line()
            
            with open(output_file, 'a') as f:
                f.write(log_line + '\n')
                f.flush()  # Ensure immediate write
            
            print(f"Generated: {log_line[:80]}...")
            time.sleep(interval)
            
    except KeyboardInterrupt:
        print("\nStopping log generator...")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
