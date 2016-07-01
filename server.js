var mapName = "war.json";

console.log("Server starting...");

var http = require("http"),
    sio  = require("socket.io"),
    fs = require("fs");

var bulletSpeed = 10;
var life = 1000;
var maxHealth = 10;
var map;
var users;
var mapFile;
var canvasSizeX;
var canvasSizeY;
var gravity;
var jumpStrength;
var leftRightMovementSpeed;
var weapons = {
	shotgun:{
		fireRate:20,
		spread:0.2
	},
	rpg:{
		fireRate:100,
		bulletsAtExplosion:40,
		bulletSpeed:5
	}
};
var particles=[];
function particle(x, y, xs, ys, type, life, color){
	this.x=x;
	this.y=y;
	this.xs=xs;
	this.ys=ys;
	this.type=type;
	this.life=life;
	this.color=color;
}
console.log("Reading users.json...");
fs.readFile("users.json", function(err, data) {
    if(err){
        return console.error(err);
    }
    console.log("users.json read successfully, parsing and creating array...");
    users = JSON.parse(data).users;
    console.log("users.json parsed and array created");
    readMapFile();
});

function readMapFile(){
    console.log("Reading map.json...");
fs.readFile(mapName, function(err, data){
    if(err){
        return console.error(err);
    }
    console.log(mapName + " read successfully");
    console.log("Creating map array...");
    mapFile = JSON.parse(data);
    if(mapFile.map==undefined){
        console.error("map.json does not contain map array");
    }else{
        map = mapFile.map;
        canvasSizeX=mapFile.xSize*20;
        canvasSizeY=mapFile.ySize*20;
	jumpStrength=mapFile.jumpStrength;
	gravity=mapFile.gravity;
	leftRightMovementSpeed=mapFile.leftRightMovementSpeed;
    }
    console.log("Map array created");
    doEverything();
});
}

function doEverything(){
    console.log("Starting server...");
// create http server
var server = http.createServer();
var port = 8081;
server.listen(Number(port));
console.log("Server listening on port " + port);
var io = sio.listen(server);

console.log("Server initiated, now accepting connections");

var players=[];
var bullets=[];
var bullet=function(x, y, xs, ys, type){
	this.y=y;
	this.x=x;
	this.xs=xs;
	this.ys=ys;
	this.type=type;
};

    //console.log(typeof players + "Fds");
/*function generateMap(){
    for(var y = 0; y < canvasSizeY/20; y++){
        var arrayToPush=[];
        for(var x = 0; x < canvasSizeX/20; x++){
            arrayToPush.push(0);
        }
        map.push(arrayToPush);
    }
}
generateMap();*/


function getIndexFromId (id){
  for(var x = 0; x < players.length; x++){
    if(players[x].id == id){
      return x;
    }
  }
}

io.sockets.on('connection', function (socket) {
    socket.on("playerName", function(data) {
        for(var x = 0; x < users.length; x++){
            if(data.name.toLowerCase()==users[x].name){
                if(data.password==users[x].password){
                    players.push({
        id:socket.id, 
        x:0, 
        y:0, 
        keys:{
            up:false,
            down:false,
            left:false,
            right:false
        },
        ySpeed:0,
        hasJumped:false,
        messages:[],
        name:data.name,
		hp:maxHealth,
		weapons:{
			shotgun:{
				timeSinceFired:0
			}
		},
		dead:false
    });
    socket.on("disconnectionRequest", function() {
        socket.emit("disconnectionConfirmed");
        socket.disconnect();
    });
                    socket.emit("nowConnected", {id:socket.id, canvasSizeX:canvasSizeX, canvasSizeY:canvasSizeY, hp:10});
                    console.log("client connected");
                    shallDisconnect=false;
                    x=users.length;
                    connected();
                }else{
                    shallDisconnect=true;
                }
            }else{
                var shallDisconnect=true;
            }
        }
        if(shallDisconnect){
            
                socket.emit("loginFailure");
                socket.disconnect();
        }
    });
    function connected(){
    
    //sconsole.log(players);
    
    var id = socket.id;
    //function keyHandler(){
    socket.on("up_press", function() {
        players[getIndexFromId(socket.id)].keys.up=true;
    });
    socket.on("down_press", function() {
        players[getIndexFromId(socket.id)].keys.down=true;
    });
    socket.on("left_press", function() {
        players[getIndexFromId(socket.id)].keys.left=true;
    });
    socket.on("right_press", function() {
        players[getIndexFromId(socket.id)].keys.right=true;
    });
    socket.on("up_release", function() {
        players[getIndexFromId(socket.id)].keys.up=false;
    });
    socket.on("down_release", function() {
        players[getIndexFromId(socket.id)].keys.down=false;
    });
    socket.on("left_release", function() {
        players[getIndexFromId(socket.id)].keys.left=false;
    });
    socket.on("right_release", function() {
        players[getIndexFromId(socket.id)].keys.right=false;
    });
    //}keyHandler();
    
    socket.on("chatMessage", function(data){
        players[getIndexFromId(socket.id)].messages.splice(0, 0, {message:data.message, expires:data.message.length*4});
        console.log(players[getIndexFromId(data.id)].name + ": " + data.message);
    });
    
    socket.on("addOrRemoveBlock", function(data) {
        var blockXPos = Math.round(data.x/20);
        var blockYPos = Math.round(data.y/20);
        var canPlaceBlock = true;
        for(var i = 0; i < players.length; i++){
            if(players[i].x == Math.floor(players[i].x/20)*20){
                var playerSnappedToGridX=true;
            }
            /*if(players[i].y == Math.floor(players[i].y/20)*20){
                var playerSnappedToGridY=true;
            }*/
            if((blockXPos==Math.floor(players[i].x/20)&&blockYPos==Math.floor(players[i].y/20))||
            
            (blockXPos==Math.floor(players[i].x/20)+1 &&
            blockYPos==Math.floor(players[i].y/20) &&
            playerSnappedToGridX==false)){
                canPlaceBlock=false;
            }
        }
        if(blockXPos>=0 && blockXPos<=map[0].length && blockYPos>=0 && blockYPos<=map.length && canPlaceBlock==true){
            if(map[blockYPos][blockXPos]==0){
                map[blockYPos][blockXPos]=1;
            }else{
                map[blockYPos][blockXPos]=0;
            }
        }
    });
	socket.on("respawn", function(){
		if(players[getIndexFromId(socket.id)].hp<=0){
			players[getIndexFromId(socket.id)].x=0;
			players[getIndexFromId(socket.id)].y=0;
			players[getIndexFromId(socket.id)].hp=maxHealth;
			players[getIndexFromId(socket.id)].dead=false;
		}
	});
    socket.on("shoot", function(data){
		var playerIndex=getIndexFromId(socket.id);
		if(players[playerIndex].hp>0){
		if(data.weapon==0){
		bullets.push(new bullet(players[playerIndex].x+10+
		(Math.cos(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x))*15), 
		players[playerIndex].y+10+
		(Math.sin(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x))*15), 
		Math.cos(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x))*bulletSpeed,
		Math.sin(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x))*bulletSpeed+players[playerIndex].ySpeed, 0));
		}else if(data.weapon==1&&players[getIndexFromId(socket.id)].weapons.shotgun.timeSinceFired<=0){
			//Bullet 1
			bullets.push(new bullet(players[playerIndex].x+10+
		(Math.cos(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x))*15), 
		players[playerIndex].y+10+
		(Math.sin(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x))*15), 
		Math.cos(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x)-weapons.shotgun.spread)*bulletSpeed,
		Math.sin(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x)-weapons.shotgun.spread)*bulletSpeed+players[playerIndex].ySpeed, 0));
			//Bullet 2
			bullets.push(new bullet(players[playerIndex].x+10+
		(Math.cos(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x))*15), 
		players[playerIndex].y+10+
		(Math.sin(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x))*15), 
		Math.cos(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x)-weapons.shotgun.spread/2)*bulletSpeed,
		Math.sin(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x)-weapons.shotgun.spread/2)*bulletSpeed+players[playerIndex].ySpeed, 0));
			//Bullet 3
			bullets.push(new bullet(players[playerIndex].x+10+
		(Math.cos(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x))*15), 
		players[playerIndex].y+10+
		(Math.sin(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x))*15), 
		Math.cos(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x))*bulletSpeed,
		Math.sin(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x))*bulletSpeed+players[playerIndex].ySpeed, 0));
			//Bullet 4
			bullets.push(new bullet(players[playerIndex].x+10+
		(Math.cos(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x))*15), 
		players[playerIndex].y+10+
		(Math.sin(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x))*15), 
		Math.cos(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x)+weapons.shotgun.spread/2)*bulletSpeed,
		Math.sin(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x)+weapons.shotgun.spread/2)*bulletSpeed+players[playerIndex].ySpeed, 0));
			//Bullet 5
			bullets.push(new bullet(players[playerIndex].x+10+
		(Math.cos(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x))*15), 
		players[playerIndex].y+10+
		(Math.sin(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x))*15), 
		Math.cos(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x)+weapons.shotgun.spread)*bulletSpeed,
		Math.sin(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x)+weapons.shotgun.spread)*bulletSpeed+players[playerIndex].ySpeed, 0));
			players[getIndexFromId(socket.id)].weapons.shotgun.timeSinceFired=weapons.shotgun.fireRate;
		}else if(data.weapon==2){
			bullets.push(new bullet(players[playerIndex].x+10+
		(Math.cos(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x))*15), 
		players[playerIndex].y+10+
		(Math.sin(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x))*15), 
		Math.cos(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x))*weapons.rpg.bulletSpeed,
		Math.sin(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x))*weapons.rpg.bulletSpeed+players[playerIndex].ySpeed, 1));
		}else if(data.weapon==3){
			particles.push(new particle(players[playerIndex].x+10, 
		players[playerIndex].y+10, 
		Math.cos(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x))*10,
		Math.sin(Math.atan2((data.y+players[playerIndex].y)-players[playerIndex].y, (data.x+players[playerIndex].x)-players[playerIndex].x))*10, 1, 500, {r:Math.round(Math.random()*255),g:Math.round(Math.random()*255),b:Math.round(Math.random()*255)}));
		}
		}
	});
    
    socket.on("disconnect", function() {
        console.log(players[getIndexFromId(id)].name + " disconnected");
        players.splice(getIndexFromId(id), 1);
        
        //clearInterval(interval);z
    });
    }
});


function movePlayer(){
	//Update Bullets
	var particlesToSplice=[];
	for(var i = 0; i < particles.length; i++){
		particles[i].ys+=gravity;
		if(particles[i].x <=0 || particles[i].x>=map[0].length*20 || particles[i].y <=0 || particles[i].y>=map.length*20||map[Math.floor(particles[i].y/20)][Math.floor(particles[i].x/20)]==1){
			particles[i].xs=0;
			particles[i].ys=0;
			//spliceAt=i;
		}
		particles[i].life--;
		particles[i].x+=particles[i].xs;
		particles[i].y+=particles[i].ys;
		if(particles[i].life<=0){
			particlesToSplice.push(i);
		}
		
	}
	for(var n = 0; n < particlesToSplice.length; n++){
		particles.splice(particlesToSplice[n]-n, 1);
	}
	var bulletsToSplice = [];
	//var spliceAt = null;
	var bulletsLength = bullets.length;
	for(var i = 0; i < bulletsLength; i++){
		bullets[i].x+=bullets[i].xs;
		bullets[i].y+=bullets[i].ys;
		if(bullets[i].x <=0 || bullets[i].x>=map[0].length*20 || bullets[i].y <=0 || bullets[i].y>=map.length*20 || map[Math.floor(bullets[i].y/20)][Math.floor(bullets[i].x/20)]==1){
			if(bullets[i].type==0){
				bulletsToSplice.push(i);
			}else if(bullets[i].type==1){
				for(var x = 0; x < weapons.rpg.bulletsAtExplosion; x++){
					var angle=(Math.PI*2)*Math.random();
					bullets.push(new bullet(bullets[i].x-bullets[i].xs, bullets[i].y-bullets[i].ys, Math.cos(angle)*bulletSpeed, Math.sin(angle)*bulletSpeed, 0));
				}
				bulletsToSplice.push(i);
			}
		}
	}
	/*if(spliceAt!=null){
		bullets.splice(spliceAt, 1); 
	}*/
	for(var n = 0; n < bulletsToSplice.length; n++){
		bullets.splice(bulletsToSplice[n]-n, 1);
	}

	//Player stuff
    for(var i = 0; i < players.length; i++){
	if(players[i].dead==false&&players[i].hp<=0){
		players[i].dead=true;
		var magnitude = 20;
		var particleNumber = 50;
		var spread = 1;
		for(var y = 0; y < particleNumber; y++){
			var angle = (Math.PI*2)*Math.random();
			particles.push(new particle(players[i].x+10, players[i].y+10, Math.cos(/*(Math.PI)+*/angle)*magnitude+Math.random(), Math.sin(/*(Math.PI)+*/angle)*magnitude+Math.random(), 0, life));
		}
		for(var y = 0; y < 1; y++){
			var angle = (Math.PI*2)*Math.random();
			particles.push(new particle(players[i].x+10, players[i].y+10, Math.cos(angle)+Math.random(), Math.sin(angle)+Math.random(), 0, life));
		}
	}
	if(players[i].hp>0){
        var currentPlayer = players[i];
        var playerSnappedToGridX = false;
        var checkLeftRightMovement=true;
        if(players[i].x == Math.floor(players[i].x/20)*20){
            playerSnappedToGridX=true;
        }
	bulletsToSplice =[];
	//spliceAt=null;
	for(var z = 0; z < bullets.length; z++){
		if(bullets[z].type==0){
			if(bullets[z].x>=currentPlayer.x&&bullets[z].x<=currentPlayer.x+20&&bullets[z].y>=currentPlayer.y&&bullets[z].y<=currentPlayer.y+20){
				players[i].hp--;
				var angle = Math.atan2(bullets[z].ys, bullets[z].xs)+((Math.random()-0.5)/0.5);
				var magnitude = Math.sqrt(bullets[z].xs*bullets[z].xs+bullets[z].ys*bullets[z].ys);
				//particles.push(new particle(bullets[z].x, bullets[z].y, Math.cos(angle)*magnitude, Math.sin(angle)*magnitude, 0, life));
				particles.push(new particle(bullets[z].x, bullets[z].y, Math.cos(angle+0.5)*magnitude, Math.sin(angle+0.5)*magnitude, 0, life));
				particles.push(new particle(bullets[z].x, bullets[z].y, Math.cos(angle+1)*magnitude, Math.sin(angle+1)*magnitude, 0, life));
				//particles.push(new particle(bullets[z].x, bullets[z].y, Math.cos(angle-0.5)*magnitude, Math.sin(angle-0.5)*magnitude, 0, life));
				//particles.push(new particle(bullets[z].x, bullets[z].y, Math.cos(angle-1)*magnitude, Math.sin(angle-1)*magnitude, 0, life));
				bulletsToSplice.push(z);
			}
		}
	}
	for(var n = 0; n < bulletsToSplice.length; n++){
		bullets.splice(bulletsToSplice[n]-n, 1);
	}
	/*n = 0;
	while(bulletsToSplice.length>0){
		bullets.splice(bulletsToSplice[0]-n, 1);
		n++;
	}*/
        if(map[Math.floor(players[i].y/20)-1]!=undefined){
                /*if(map[Math.floor(players[i].y/20)-1][Math.floor(players[i].x/20)]==1&&Math.floor(players[i].y)==players[i].y){
                    players[i].y=Math.floor(players[i].y/20)*20;
                    players[i].ySpeed=0;
                }*/
                if(map[Math.floor(players[i].y/20)][Math.floor(players[i].x/20)]==1 && players[i].y-Math.floor(players[i].y)<=15){
                    players[i].y=Math.floor(players[i].y/20+1)*20;
                    players[i].ySpeed=0;
                    checkLeftRightMovement=false;
                }else
                
                /*if(map[Math.floor(players[i].y/20)-1][Math.floor(players[i].x/20)+1]==1&&playerSnappedToGridX==false){
                    players[i].y=Math.floor(players[i].y/20)*20;
                    players[i].ySpeed=0;
                    //players[i].hasJumped=false;
                }*/
                if(map[Math.floor(players[i].y/20)][Math.floor(players[i].x/20)+1]==1&&players[i].y-Math.floor(players[i].y)<=15&&playerSnappedToGridX==false){
                    players[i].y=Math.floor(players[i].y/20+1)*20;
                    players[i].ySpeed=0;
                    checkLeftRightMovement=false;
                }
            
        }
        players[i].ySpeed+=gravity;
        players[i].y+=players[i].ySpeed;
        
        if(currentPlayer.keys.down){
            //currentPlayer.y+=5;
        }
        var checkBelow=true;
        //Check for collision below
        if(map[Math.floor(players[i].y/20)+1]!=undefined){
            if(map[Math.floor(players[i].y/20)+1][Math.floor(players[i].x/20)]==1){
                players[i].y=Math.floor(players[i].y/20)*20;
                players[i].ySpeed=0;
                players[i].hasJumped=false;
                checkBelow=false;
            }
            if(map[Math.floor(players[i].y/20)+1][Math.floor(players[i].x/20)+1]==1&&playerSnappedToGridX==false){
                players[i].y=Math.floor(players[i].y/20)*20;
                players[i].ySpeed=0;
                players[i].hasJumped=false;
                checkBelow=false;
            }
        }
        
        //Collisions left
        if(checkLeftRightMovement){
            if(currentPlayer.keys.left){
            var canMoveLeft = true;
            if(playerSnappedToGridX){
                if(map[Math.floor(players[i].y/20)]!=undefined){
                    if(map[Math.floor(players[i].y/20)][Math.floor(players[i].x/20)-1]==1){
                        canMoveLeft=false;
                    }
                }
                if(map[Math.floor(players[i].y/20)+1]!=undefined && checkBelow){
                    if(map[Math.floor(players[i].y/20)+1][Math.floor(players[i].x/20)-1]==1){
                        canMoveLeft=false;
                    }
                }
            }
            
            if(canMoveLeft){
                currentPlayer.x-=leftRightMovementSpeed;
            }else{
                players[i].x=Math.floor(players[i].x/20)*20;
            }
        }
            if(currentPlayer.keys.right){
            var canMoveRight=true;
            if(map[Math.floor(players[i].y/20)]!=undefined){
                if(map[Math.floor(players[i].y/20)][Math.floor(players[i].x/20)+1]==1){
                    canMoveRight=false;
                }
            }
            if(map[Math.floor(players[i].y/20)+1]!=undefined && checkBelow){
                if(map[Math.floor(players[i].y/20)+1][Math.floor(players[i].x/20)+1]==1){
                    canMoveRight=false;
                }
            }
            if(canMoveRight){
                currentPlayer.x+=leftRightMovementSpeed;
            }else{
                players[i].x=Math.floor(players[i].x/20)*20;
            }
        }
        }
        
        
        
        
        if(currentPlayer.x < 0){
            players[i].x=0;
        }
        if(currentPlayer.y < 0){
            players[i].y=0;
	    players[i].ySpeed=0;
        }
        if(currentPlayer.x > canvasSizeX-20){
            players[i].x=canvasSizeX-20;
        }
        if(currentPlayer.y > canvasSizeY-20){
            players[i].y=canvasSizeY-20;
            players[i].ySpeed=0;
            players[i].hasJumped=false;
        }
        //Crash detection left
        //Crash detection right
        if(currentPlayer.keys.up&&players[i].hasJumped==false){
            players[i].ySpeed=-jumpStrength;
            players[i].hasJumped=true;
        }
        
        //console.log(map[Math.floor(players[i].y/20)+1]);
        //console.log(map[Math.floor(players[i].y/20+1)]);
        var spliceAt = null;
        for(var z = 0; z < players[i].messages.length; z++){
            players[i].messages[z].expires--;
            if(players[i].messages[z].expires<=0){
                spliceAt=z;
            }
        }
        if(spliceAt!=null){
            players[i].messages.splice(spliceAt, 1);
        }
		if(players[i].weapons.shotgun.timeSinceFired>0){
			players[i].weapons.shotgun.timeSinceFired--;
		}
	}
    }
    io.sockets.emit("playerArray", {players:players, map:map, bullets:bullets, particles:particles});
}
setInterval(movePlayer, 50);

function saveMap(){
    mapFile.map=map;
    fs.writeFile(mapName, JSON.stringify(mapFile));
}
setInterval(saveMap, 5000);

setInterval(function(){
    fs.readFile("users.json", function(err, data) {
        if(err){
            return console.error(err);
        }
        users = JSON.parse(data).users;
        console.log("users.json reloaded");
    });
}, 60000);
}
