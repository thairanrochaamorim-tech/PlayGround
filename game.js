(() => {
  const canvas = document.querySelector('#game'), ctx = canvas.getContext('2d');
  const overlay = document.querySelector('#overlay'), result = document.querySelector('#result');
  const startBtn = document.querySelector('#startBtn'), againBtn = document.querySelector('#againBtn');
  const bossBar = document.querySelector('#bossHealth'), heartsEl = document.querySelector('#hearts'), meterEl = document.querySelector('#superMeter'), scoreEl = document.querySelector('#score'), toast = document.querySelector('#toast');
  const W = 960, H = 540, ground = 445;
  let dpr = 1, scaleX = 1, scaleY = 1, soundOn = true, audio, last = 0, time = 0;
  const keys = new Set(), touch = {left:false,right:false,jump:false,shoot:false,dash:false};
  let mode = 'title', player, boss, bullets, enemyShots, particles, score, toastTime = 0, bgTime = 0;
  function resize(){
    const r=canvas.getBoundingClientRect(); dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(r.width*dpr); canvas.height=Math.round(r.height*dpr);
    scaleX=canvas.width/W; scaleY=canvas.height/H;
  }
  addEventListener('resize',resize); resize();
  function tone(freq=440,duration=.06,type='sine',volume=.035){
    if(!soundOn)return; try{audio ||= new (window.AudioContext||window.webkitAudioContext)(); if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration)}catch(e){}
  }
  function begin(){
    mode='play'; time=0; score=0; bullets=[]; enemyShots=[]; particles=[];
    player={x:170,y:ground-68,vx:0,vy:0,w:40,h:68,face:1,hp:3,inv:0,fire:0,dash:0,dashTime:0,jumpHeld:false,super:0,anim:0};
    boss={x:755,y:ground-108,hp:100,max:100,attack:1.2,hurt:0,phase:0,anim:0};
    overlay.classList.add('hidden');result.classList.add('hidden');toast.textContent='';updateHud();tone(520,.12,'triangle');
  }
  startBtn.addEventListener('click',begin);againBtn.addEventListener('click',begin);
  document.querySelector('#soundBtn').addEventListener('click',e=>{soundOn=!soundOn;e.currentTarget.innerHTML=`♫ <span>${soundOn?'ON':'OFF'}</span>`;if(soundOn)tone(580,.08)});
  const keyMap={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'jump',ArrowUp:'jump',KeyW:'jump',KeyZ:'shoot',KeyJ:'shoot',KeyX:'dash',KeyK:'dash'};
  addEventListener('keydown',e=>{const c=keyMap[e.code];if(c){e.preventDefault();keys.add(c);if(mode!=='play'&&(e.code==='Enter'||e.code==='Space'))begin()}});
  addEventListener('keyup',e=>{const c=keyMap[e.code];if(c)keys.delete(c)});
  document.querySelectorAll('[data-control]').forEach(btn=>{
    const c=btn.dataset.control; const down=e=>{e.preventDefault();touch[c]=true;btn.classList.add('pressed');try{btn.setPointerCapture(e.pointerId)}catch(_){}};
    const up=e=>{e.preventDefault();touch[c]=false;btn.classList.remove('pressed')};
    btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);btn.addEventListener('pointercancel',up);btn.addEventListener('lostpointercapture',up);
  });
  function held(c){return keys.has(c)||touch[c]}
  function updateHud(){heartsEl.textContent='♥ '.repeat(Math.max(0,player.hp)).trim()||'♡';bossBar.style.width=Math.max(0,boss.hp/boss.max*100)+'%';meterEl.style.width=player.super+'%';scoreEl.textContent=String(score).padStart(4,'0')}
  function announce(s){toast.textContent=s;toast.classList.add('show');toastTime=1.1}
  function end(win){mode=win?'won':'lost';result.classList.remove('hidden');document.querySelector('#resultEyebrow').textContent=win?'THE DEVIL CAN WAIT':'THE SHOW IS OVER';document.querySelector('#resultTitle').textContent=win?'CURTAIN CALL!':'DOWN FOR THE COUNT';document.querySelector('#resultText').textContent=win?'The Ringleader has been put in his place. Your soul stays yours.':'The Ringleader takes the final bow. Ready for another round?';tone(win?760:150,.45,win?'triangle':'sawtooth',.05)}
  function addParticle(x,y,color,n=5){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*190,vy:(Math.random()-.7)*180,life:.25+Math.random()*.45,color,size:2+Math.random()*4})}
  function shoot(){if(player.fire>0)return;player.fire=.19;const dir=player.face;bullets.push({x:player.x+dir*27,y:player.y-40,vx:dir*590,life:1.4});tone(500+Math.random()*100,.04,'square',.012)}
  function bossAttack(){
    boss.attack= boss.hp<50 ? .82 : 1.12;
    const kind=Math.random();
    if(kind<.55){const pink=Math.random()<.30;enemyShots.push({x:boss.x-42,y:boss.y-45,vx:-245,vy:pink?-20:-75,rad:pink?12:15,life:3,pink,spin:0});if(pink)announce('PARRY THE PINK!')}
    else if(kind<.83){for(let i=0;i<3;i++)enemyShots.push({x:boss.x-30,y:boss.y-52,vx:-225,vy:-130+i*125,rad:10,life:3,pink:false,spin:0})}
    else {enemyShots.push({x:boss.x-50,y:ground-12,vx:-290,vy:0,rad:17,life:3,pink:false,spin:0,low:true})}
    tone(180,.13,'triangle',.025);
  }
  function update(dt){
    bgTime+=dt;if(mode!=='play')return;time+=dt;player.anim+=dt*10;boss.anim+=dt*4;
    if(toastTime>0){toastTime-=dt;if(toastTime<=0)toast.classList.remove('show')}
    const dir=(held('right')?1:0)-(held('left')?1:0);
    if(player.dashTime>0){player.dashTime-=dt;player.vx=player.face*650}else{player.vx=dir*245;if(dir)player.face=dir}
    if(held('dash')&&player.dash<=0){player.dash=.85;player.dashTime=.17;player.inv=Math.max(player.inv,.23);tone(300,.09,'sawtooth',.03)}
    player.dash=Math.max(0,player.dash-dt);player.fire=Math.max(0,player.fire-dt);player.inv=Math.max(0,player.inv-dt);
    if(held('jump')&&!player.jumpHeld&&player.y>=ground-player.h-1){player.vy=-520;player.jumpHeld=true;tone(340,.08,'triangle',.02)}
    if(!held('jump'))player.jumpHeld=false;
    if(held('shoot'))shoot();
    player.x=Math.max(45,Math.min(915,player.x+player.vx*dt));player.vy+=1450*dt;player.y+=player.vy*dt;
    if(player.y>ground-player.h){player.y=ground-player.h;player.vy=0}
    boss.attack-=dt;boss.hurt=Math.max(0,boss.hurt-dt);boss.phase=boss.hp<50?1:0;
    if(boss.attack<=0)bossAttack();
    for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];b.x+=b.vx*dt;b.life-=dt;if(Math.abs(b.x-boss.x)<55&&Math.abs(b.y-(boss.y-50))<66){boss.hp=Math.max(0,boss.hp-1.6);boss.hurt=.08;score+=10;addParticle(b.x,b.y,'#f9d879',2);bullets.splice(i,1);if(boss.hp<=0){updateHud();end(true);return}}else if(b.life<=0||b.x<0||b.x>W)bullets.splice(i,1)}
    for(let i=enemyShots.length-1;i>=0;i--){const b=enemyShots[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.spin+=dt*6;b.life-=dt;if(b.low&&b.y<ground-18)b.y=ground-18;
      const px=player.x,py=player.y+player.h/2,dist=Math.hypot(b.x-px,b.y-py);
      if(b.pink&&dist<b.rad+25&&player.vy<100&&held('jump')){enemyShots.splice(i,1);player.super=Math.min(100,player.super+25);score+=100;addParticle(b.x,b.y,'#ffb3cf',12);announce('PARRY! +100');tone(750,.16,'triangle',.04);continue}
      if(dist<b.rad+19&&player.inv<=0){enemyShots.splice(i,1);player.hp--;player.inv=1.2;player.vy=-240;addParticle(px,py,'#f17867',10);tone(100,.22,'sawtooth',.05);if(player.hp<=0){updateHud();end(false);return}else announce('OUCH!');continue}
      if(b.life<=0||b.x<-30||b.y>H+30)enemyShots.splice(i,1)
    }
    if(player.super>=100&&held('dash')){player.super=0;boss.hp=Math.max(0,boss.hp-18);addParticle(boss.x,boss.y-50,'#ffe6a1',26);announce('SUPER BLAST!');tone(900,.3,'triangle',.06);if(boss.hp<=0){updateHud();end(true);return}}
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=300*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1)}
    updateHud();
  }
  function path(points,fill,stroke='#17151b',lw=3){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.lineWidth=lw;ctx.strokeStyle=stroke;ctx.stroke()}
  function ellipse(x,y,rx,ry,fill,stroke='#17151b',lw=3){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();ctx.lineWidth=lw;ctx.strokeStyle=stroke;ctx.stroke()}
  function background(){
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#1a2636');sky.addColorStop(.58,'#573341');sky.addColorStop(1,'#241b28');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    // Painted night sky and distant rooftops
    for(let i=0;i<34;i++){let x=(i*173+31)%W,y=(i*67+27)%245;ctx.fillStyle=i%3?'#e7d09a77':'#f29a7a88';ctx.fillRect(x,y,2,2)}
    ellipse(780,106,38,38,'#d7ad7866','transparent',0);ellipse(780,106,29,29,'#e7c89a','transparent',0);
    path([[0,256],[75,204],[150,247],[222,188],[320,254],[415,208],[510,250],[602,198],[694,248],[770,205],[870,250],[960,192],[960,392],[0,392]],'#342637','#342637',0);
    // Art deco theater proscenium
    ctx.fillStyle='#9a544a';ctx.fillRect(0,0,960,26);ctx.fillStyle='#d5ad72';ctx.fillRect(0,24,960,5);
    ctx.strokeStyle='#d4a96755';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(98,35);ctx.bezierCurveTo(105,220,140,365,243,409);ctx.moveTo(862,35);ctx.bezierCurveTo(855,220,820,365,717,409);ctx.stroke();
    // velvet side curtains
    path([[0,0],[150,0],[129,92],[155,167],[121,242],[146,328],[107,399],[0,420]],'#733b48','#3c2631',4);
    path([[960,0],[810,0],[831,92],[805,167],[839,242],[814,328],[853,399],[960,420]],'#733b48','#3c2631',4);
    for(let i=0;i<5;i++){ctx.strokeStyle='#bd6f5a66';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(20+i*24,0);ctx.bezierCurveTo(31+i*22,120,23+i*22,274,8+i*20,397);ctx.stroke();ctx.beginPath();ctx.moveTo(940-i*24,0);ctx.bezierCurveTo(929-i*22,120,937-i*22,274,952-i*20,397);ctx.stroke()}
    // marquee trim
    ctx.strokeStyle='#d9b36c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,392);ctx.quadraticCurveTo(480,354,960,392);ctx.stroke();
    for(let i=0;i<19;i++){const x=18+i*52;ellipse(x,388+Math.sin(i/18*Math.PI)*-30,3,3,i%2?'#f8d78e':'#f18a63','transparent',0)}
    // stage light cones
    ctx.save();ctx.globalAlpha=.12;ctx.fillStyle='#ffdc9b';ctx.beginPath();ctx.moveTo(300,94);ctx.lineTo(115,443);ctx.lineTo(488,443);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(662,94);ctx.lineTo(478,443);ctx.lineTo(850,443);ctx.closePath();ctx.fill();ctx.restore();
    // stage boards
    const floor=ctx.createLinearGradient(0,410,0,H);floor.addColorStop(0,'#835543');floor.addColorStop(1,'#3c2b2d');ctx.fillStyle=floor;ctx.fillRect(0,405,W,135);
    ctx.strokeStyle='#d2a16a66';ctx.lineWidth=2;for(let y=420;y<540;y+=25){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
    for(let x=-30;x<1000;x+=130){ctx.beginPath();ctx.moveTo(x,405);ctx.lineTo(x-90,540);ctx.stroke()}
    ctx.fillStyle='#201a24';ctx.fillRect(0,ground,960,95);ctx.strokeStyle='#d5ad72';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,ground);ctx.lineTo(960,ground);ctx.stroke();
    // audience silhouettes
    for(let i=0;i<22;i++){const x=i*47+((i%3)*7);const y=403+(i%3)*6;ellipse(x,y,15,17,'#171820','#171820',0);ctx.fillStyle='#171820';ctx.fillRect(x-19,y+8,38,32)}
    // stage front gold studs
    for(let x=14;x<960;x+=42)ellipse(x,ground+7,2,2,'#e2bc73','#e2bc73',0);
  }
  function drawPlayer(){
    if(player.inv>0&&Math.floor(time*15)%2===0)return;
    const x=player.x,y=player.y,run=Math.sin(player.anim)*6,air=y<ground-player.h-2;
    ctx.save();ctx.translate(x,y);
    ellipse(0,67,22,5,'#14151c88','transparent',0);
    // shoes and legs
    ctx.strokeStyle='#16171d';ctx.lineWidth=8;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-7,48);ctx.lineTo(-8+run,59);ctx.moveTo(7,48);ctx.lineTo(8-run,59);ctx.stroke();
    ellipse(-12+run,61,10,5,'#9b3c3d');ellipse(12-run,61,10,5,'#9b3c3d');
    // little coat body
    path([[-15,25],[14,25],[19,49],[11,53],[-12,53],[-19,48]],'#31516a','#17171d',3);
    ctx.fillStyle='#e7d7b8';ctx.beginPath();ctx.moveTo(-5,28);ctx.lineTo(0,40);ctx.lineTo(6,28);ctx.lineTo(2,46);ctx.lineTo(-2,46);ctx.fill();
    // arms / shooting glove
    ctx.strokeStyle='#17171d';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-13,31);ctx.lineTo(-20,41+run*.2);ctx.moveTo(13,31);ctx.lineTo(20,32);ctx.stroke();
    ellipse(20,32,5,5,'#f3e7d0');
    // cup head and handle
    ctx.fillStyle='#f0e2c6';ctx.lineWidth=3;ctx.strokeStyle='#17171d';ctx.beginPath();ctx.moveTo(-17,5);ctx.lineTo(-14,28);ctx.quadraticCurveTo(0,37,14,28);ctx.lineTo(17,5);ctx.quadraticCurveTo(0,0,-17,5);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.ellipse(20,17,7,9,0,-Math.PI/2,Math.PI/2);ctx.lineWidth=4;ctx.stroke();
    // coffee surface and straw
    ctx.strokeStyle='#674444';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-13,8);ctx.quadraticCurveTo(0,5,13,8);ctx.stroke();
    ctx.strokeStyle='#f5ecd9';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-4,6);ctx.lineTo(-10,-13);ctx.lineTo(-14,-16);ctx.stroke();ctx.strokeStyle='#d94e4a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-8,-9);ctx.lineTo(-13,-6);ctx.stroke();
    // face
    ellipse(-6,16,2.4,4,'#17171d','#17171d',0);ellipse(6,16,2.4,4,'#17171d','#17171d',0);
    ctx.strokeStyle='#17171d';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-3,24);ctx.quadraticCurveTo(0,27,4,23);ctx.stroke();
    // cheek freckles
    ellipse(-11,21,1,1,'#cf7763','transparent',0);ellipse(11,21,1,1,'#cf7763','transparent',0);
    ctx.restore();
  }
  function drawBoss(){
    const b=boss,x=b.x,y=b.y+(Math.sin(b.anim)*2),hurt=b.hurt>0;
    ctx.save();ctx.translate(x,y);if(hurt)ctx.globalAlpha=.55;
    ellipse(0,108,48,8,'#12141b88','transparent',0);
    // cape / tailcoat
    path([[-39,44],[38,43],[49,100],[18,96],[0,106],[-20,95],[-49,101]],'#342b43','#16151b',4);
    path([[-18,52],[-5,61],[-21,91],[-35,97]],'#c24c4c','#16151b',3);path([[18,52],[5,61],[21,91],[35,97]],'#c24c4c','#16151b',3);
    // legs, striped trousers
    ctx.strokeStyle='#17151b';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(-15,91);ctx.lineTo(-17,106);ctx.moveTo(15,91);ctx.lineTo(17,106);ctx.stroke();
    ellipse(-23,107,13,6,'#ddc294');ellipse(23,107,13,6,'#ddc294');
    // bowtie and lapels
    path([[-16,48],[0,54],[-5,65],[-18,58]],'#e3b65f','#17151b',2);path([[16,48],[0,54],[5,65],[18,58]],'#e3b65f','#17151b',2);
    // head
    ellipse(0,28,30,34,'#d2a967');
    // hair side curls
    ellipse(-28,22,9,16,'#40303b');ellipse(28,22,9,16,'#40303b');
    // curled mustache
    ctx.strokeStyle='#44313a';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,37);ctx.quadraticCurveTo(-12,31,-22,38);ctx.quadraticCurveTo(-15,48,-5,42);ctx.moveTo(0,37);ctx.quadraticCurveTo(12,31,22,38);ctx.quadraticCurveTo(15,48,5,42);ctx.stroke();
    // eyes + brows
    ellipse(-10,22,3,5,'#211b25','#211b25',0);ellipse(10,22,3,5,'#211b25','#211b25',0);
    ctx.strokeStyle='#48323a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-17,14);ctx.lineTo(-5,16);ctx.moveTo(5,16);ctx.lineTo(17,14);ctx.stroke();
    // nose and toothy grin
    ellipse(0,30,4,4,'#b67a5e','#6b453d',1);ctx.fillStyle='#f4e3bf';ctx.beginPath();ctx.moveTo(-10,44);ctx.quadraticCurveTo(0,52,10,44);ctx.lineTo(7,48);ctx.lineTo(-7,48);ctx.fill();ctx.strokeStyle='#34252d';ctx.lineWidth=1;ctx.stroke();
    // tall top hat
    ctx.fillStyle='#282630';ctx.strokeStyle='#17151b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-23,2);ctx.lineTo(-18,-31);ctx.quadraticCurveTo(0,-38,18,-31);ctx.lineTo(23,2);ctx.closePath();ctx.fill();ctx.stroke();
    path([[-27,1],[27,1],[31,8],[-31,8]],'#38313d','#17151b',3);ctx.fillStyle='#c94f4d';ctx.fillRect(-18,-14,36,6);ctx.strokeStyle='#17151b';ctx.lineWidth=1;ctx.strokeRect(-18,-14,36,6);
    // cane and glove
    ctx.strokeStyle='#17151b';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(39,53);ctx.lineTo(48,108);ctx.stroke();ctx.strokeStyle='#e0bc79';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(40,54);ctx.lineTo(49,109);ctx.stroke();ellipse(38,51,6,6,'#f0dfc0');
    ctx.restore();
  }
  function drawShots(){
    for(const b of bullets){ellipse(b.x,b.y,8,4,'#ffe9a7','#a74948',1);ctx.fillStyle='#fff7d8';ctx.fillRect(b.x-2,b.y-1,4,2)}
    for(const b of enemyShots){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.spin);if(b.low){path([[-b.rad,0],[0,-b.rad],[b.rad,0],[0,b.rad]],'#e8584e','#361e2b',3);ellipse(0,0,4,4,'#ffb778','#361e2b',1)}else if(b.pink){path([[0,-b.rad],[b.rad*.55,-b.rad*.35],[b.rad,0],[b.rad*.55,b.rad*.35],[0,b.rad],[-b.rad*.55,b.rad*.35],[-b.rad,0],[-b.rad*.55,-b.rad*.35]],'#ff8db6','#6a3157',2);ellipse(0,0,3,3,'#fff0cf','transparent',0)}else{ellipse(0,0,b.rad,b.rad,'#bd5949','#422630',3);ellipse(-4,-5,4,3,'#f3b07b','transparent',0)}ctx.restore()}
    for(const p of particles){ctx.globalAlpha=Math.max(0,p.life*2);ellipse(p.x,p.y,p.size,p.size,p.color,'transparent',0)}ctx.globalAlpha=1;
  }
  function draw(){
    ctx.setTransform(scaleX,0,0,scaleY,0,0);ctx.clearRect(0,0,W,H);background();
    if(mode==='title'){boss={x:755,y:ground-108,hp:100,max:100,attack:1,hurt:0,phase:0,anim:bgTime*2};player={x:215,y:ground-68,inv:0,anim:bgTime*4};drawBoss();drawPlayer();}
    else{drawBoss();drawPlayer();drawShots()}
    // animated musical notes / stars as set dressing
    if(mode==='title'){ctx.fillStyle='#f2d89b';ctx.font='20px serif';ctx.fillText('♪',320+Math.sin(bgTime)*5,220);ctx.fillText('♫',635,195+Math.sin(bgTime*1.3)*6)}
  }
  function frame(now){const dt=Math.min(.033,(now-last)/1000||0);last=now;update(dt);draw();requestAnimationFrame(frame)}
  requestAnimationFrame(frame);
})();
