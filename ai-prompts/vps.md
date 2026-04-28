Goal: Run Bookinder on your VPS, hidden from pm2 list, behind Caddy as a     
  reverse proxy with auto-HTTPS.                                               
                                                                               
  ---                                                                          
  Step 1 — Clean up the old PM2 mess
                                                                               
  SSH into your VPS, then:                                  
                                                                               
  pm2 delete bookinder
  pm2 save                                                                     
  pkill -f "next start" || true                             
  pm2 list                                                                     
   
  You should no longer see any bookinder rows.                                 
                                                            
  ---                                                                          
  Step 2 — Put the project in /build                        

  sudo mkdir -p /build
  sudo chown $USER:$USER /build                                                
  cd /build
  git clone <your-repo-url> bookinder                                          
  cd bookinder                                              

  ---                                                                          
  Step 3 — Install dependencies and build
                                                                               
  npm ci                                                    
  npm run build

  If you don't have a start script yet, open package.json and make sure it has:
   
  "scripts": {                                                                 
    "start": "next start -p 3000"                           
  }

  ---
  Step 4 — Add your environment variables
                                                                               
  nano /build/bookinder/.env.local
                                                                               
  Paste:                                                    

  BRAVE_API_KEY=your_key_here
  NODE_ENV=production                                                          
                                                                               
  Save and exit (Ctrl+O, Enter, Ctrl+X).                                       
                                                                               
  ---                                                       
  Step 5 — Quick local test
                                                                               
  npm start
                                                                               
  In another terminal:                                      

  curl -I http://127.0.0.1:3000

  You should see HTTP/1.1 200 OK. Stop the test with Ctrl+C in the first       
  terminal.
                                                                               
  ---                                                       
  Step 6 — Find your Node path

  which node
                                                                               
  Note the output (e.g. /usr/bin/node). You'll need it in the next step.       
                                                                               
  ---                                                                          
  Step 7 — Create the systemd service                       

  sudo nano /etc/systemd/system/bookinder.service

  Paste this (replace /usr/bin/node if Step 6 gave a different path, and       
  replace youruser with the output of whoami):
                                                                               
  [Unit]                                                    
  Description=Bookinder Next.js app
  After=network.target

  [Service]                                                                    
  Type=simple
  User=youruser                                                                
  WorkingDirectory=/build/bookinder                         
  ExecStart=/root/.nvm/versions/node/v20.20.2/bin/node node_modules/next/dist/bin/next start -p 3000
  Restart=on-failure                                                           
  RestartSec=5
  EnvironmentFile=/build/bookinder/.env.local                                  
  StandardOutput=journal                                    
  StandardError=journal

  [Install]                                                                    
  WantedBy=multi-user.target
                                                                               
  Save and exit.                                            

  ---
  Step 8 — Start the service

  sudo systemctl daemon-reload
  sudo systemctl enable --now bookinder                                        
  sudo systemctl status bookinder
                                                                               
  You should see active (running) in green. Press q to exit.                   
   
  Confirm it's responding:                                                     
                                                            
  curl -I http://127.0.0.1:3000                                                
                                                            
  ---
  Step 9 — Confirm PM2 is clean
                               
  pm2 list
                                                                               
  Bookinder should not appear.
                                                                               
  ---                                                       
  Step 10 — Configure Caddy

  sudo nano /etc/caddy/Caddyfile
                                                                               
  Add this block (don't delete blocks for your other apps):     

sudo gpg --no-default-keyring --keyring /usr/share/keyrings/caddy-stable-archive-keyring.gpg --keyserver hkps://keyserver.ubuntu.com --recv-keys ABA1F9B8875A6661

  bookinder.revenuelyft.com {                                                             
      encode zstd gzip                                      
                                                                               
      @static path /_next/static/*                                             
      header @static Cache-Control "public, max-age=31536000, immutable"       
                                                                               
      reverse_proxy 127.0.0.1:3000                                             
  }
                                                                               
  Replace yourdomain.com with your actual domain (must already point to your   
  VPS via DNS A record).
                                                                               
  Save and exit.                                            

  ---
  Step 11 — Reload Caddy

  sudo systemctl reload caddy
  sudo systemctl status caddy
                                                                               
  Caddy will automatically request a Let's Encrypt cert on the first HTTPS     
  request — no extra commands needed.                                          
                                                                               
  ---                                                       
  Step 12 — Open the firewall (if not already)
                                                                               
  sudo ufw allow 80,443/tcp
  sudo ufw status                                                              
                                                                               
  ---
  Step 13 — Test in a browser                                                  
                                                            
  Open https://yourdomain.com — Bookinder should load with HTTPS.
                                                                               
  ---
  Daily operations cheat sheet                                                 
                                                                               
  Logs:
  sudo journalctl -u bookinder -f                                              
  sudo journalctl -u caddy -f                               

  Restart after config or code changes:                                        
  sudo systemctl restart bookinder
  sudo systemctl reload caddy                                                  
                                                            
  Deploy an update:
  cd /build/bookinder                                                          
  git pull           
  npm ci                                                                       
  npm run build                                             
  sudo systemctl restart bookinder

  Check health:                                                                
  sudo systemctl status bookinder
  sudo systemctl status caddy                                                  
  pm2 list