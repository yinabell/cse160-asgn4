
// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  varying vec2 v_UV;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  void main() { 
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position; 
    v_UV = a_UV; 
  }`

// Fragment shader program
//--------------------------------------------------------------------------------
var FSHADER_SOURCE =  `
  precision mediump float; 
  varying vec2 v_UV;
  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform int u_whichTexture;
  void main() {

    //basic color
    if(u_whichTexture == -2){

        gl_FragColor = u_FragColor;

    //debug
    }else if(u_whichTexture == -1){

        gl_FragColor = vec4(v_UV,1,1);

    //texture 1
    }else if(u_whichTexture == 0){

        gl_FragColor = texture2D(u_Sampler0, v_UV);  

    //texture 2
    }else if(u_whichTexture == -3){

        gl_FragColor = texture2D(u_Sampler1, v_UV); 

    //some default color at last resort 
    }else{
        gl_FragColor = vec4(1,.2,.2,1);
    }   
    
}`
// global variables
let canvas; 
let gl; 
let a_Position; 
let a_UV;
let u_FragColor; 
let u_Size;
let u_ModelMatrix; 
let u_GlobalRotateMatrix; 
let u_ViewMatrix;
let u_ProjectionMatrix;
let u_Sampler0;
let u_Sampler1;
let u_whichTexture;
let texture0;
let texture1;

// UI global variables
let g_selectedColor = [1,1,1,1];
let g_globalX = 0;
let g_globalY = 0;
let g_fov = 50;

//camera
let g_mouseDown = false;
let g_lastX = 0;
let g_lastY = 0;
let g_camera; 

// 
var g_shapesList = []; // The array for all shapes
var g_sizes = []; // The array for all sizes
var g_points = [];  // The array for the position of a mouse press
var g_colors = [];  // The array to store the color of a point

let g_mouseControlEnabled = false;
let g_mouseSensitivity = 0.2;


function setupWebGL(){
    // Retrieve <canvas> element
  canvas = document.getElementById('webgl', {preserveDrawingBuffer: true});

  // Get the rendering context for WebGL
  gl = getWebGLContext(canvas);

  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  gl.enable(gl.DEPTH_TEST); 

  //gl.enable(gl.BLEND);
  //gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}

function connectVariablesToGLSL(){
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    } 

    // get storage location of u_ViewMatrix
    u_ViewMatrix =gl.getUniformLocation(gl.program, 'u_ViewMatrix');
    if (!u_ViewMatrix) {
        console.log('Failed to get the storage location of u_viewmatrix');
        return;
    } 

    // Get the storage location of u_ModelMatrix
    u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix'); 
    if (!u_ModelMatrix){ 
        console.log('Failed to get the storage location of u_ModelMatrix'); 
        return; 
    } 

    // get storage location of a_UV
    a_UV = gl.getAttribLocation(gl.program, 'a_UV');
    if (a_UV < 0) {
        console.log('Failed to get the storage location of a_uv');
        return;
    }
    // Get the storage location of u_FragColor
    u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    if (!u_FragColor) {
        console.log('Failed to get the storage location of u_FragColor');
        return;
    }

    // Get the storage location of a_Position
    a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return;
    }

    // get storage location of u_ProjectionMatrix
    u_ProjectionMatrix =gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
    if (!u_ProjectionMatrix) {
        console.log('Failed to get the storage location of u_projectionmatirix');
        return;
    }

    // get storage location of u_Sampler0
    u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
    if (!u_Sampler0) {
      console.log('Failed to get the storage location of u_Sampler0');
      return false;
    } 

    // Get the storage location of u_GlobalRotateMatrix
    u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix'); 
    if (!u_GlobalRotateMatrix){ 
        console.log('Failed to get the storage location of u_GlobalRotateMatrix'); 
        return; 
    }

    // get storage location of u_Sampler1
    u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
    if (!u_Sampler1) {
      console.log('Failed to get the storage location of u_Sampler1');
      return false;
    }

    // get storage location of u_whichTexture
    u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
    if (!u_whichTexture) {
      console.log('Failed to get the storage location of u_whichTexture');
      return false;
    }

    var identityM = new Matrix4(); 
    gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements); 

} 

// mouse handling 
function enablePointerLock() {
    canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
    canvas.requestPointerLock();
    
    document.addEventListener('pointerlockchange', lockChangeAlert, false);
    document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
}

function disablePointerLock() {
    document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;
    document.exitPointerLock();
    
    document.removeEventListener('pointerlockchange', lockChangeAlert, false);
    document.removeEventListener('mozpointerlockchange', lockChangeAlert, false);
}

function lockChangeAlert() {
    if (document.pointerLockElement === canvas || document.mozPointerLockElement === canvas) {
        document.addEventListener('mousemove', handleMouseMove, false);
    } else {
        document.removeEventListener('mousemove', handleMouseMove, false);
    }
}

function handleMouseMove(e) {
    if (!g_mouseControlEnabled) return;
    
    // mouse movements 
    const movementX = e.movementX || e.mozMovementX || 0;
    const movementY = e.movementY || e.mozMovementY || 0;
    
    // movement to camera 
    g_camera.handleMouseMovement(movementX, movementY);
    
    renderScene();
}


let cubeVertexBuffer, cubeUVBuffer; 

function initCubeBuffers() {
  const cubeVertices = new Float32Array([
    // front 
    0,0,0,  1,1,0,  1,0,0,
    0,0,0,  0,1,0,  1,1,0,
    // back 
    0,0,1,  1,1,1,  1,0,1,
    0,0,1,  0,1,1,  1,1,1,
    // top 
    0,1,0,  1,1,0,  1,1,1,
    0,1,1,  0,1,0,  1,1,1,
    // bottom 
    0,0,0,  0,0,1,  1,0,0,
    1,0,0,  1,0,1,  0,0,1,
    // left 
    0,0,0,  0,1,0,  0,1,1,
    0,1,1,  0,0,0,  0,0,1,
    // right 
    1,0,0,  1,1,0,  1,1,1,
    1,1,1,  1,0,0,  1,0,1,
  ]);

  const cubeUVs = new Float32Array([
    // front 
    0,0,  1,1,  1,0,
    0,0,  0,1,  1,1,
    // back 
    0,0,  1,1,  1,0,
    0,0,  0,1,  1,1,
    // Top
    0,0,  1,0,  1,1,
    0,1,  0,0,  1,1,
    // Bottom
    0,0,  0,1,  1,0,
    1,0,  1,1,  0,1,
    // Left
    0,0,  0,1,  1,1,
    1,1,  0,0,  1,0,
    // Right
    0,0,  0,1,  1,1,
    1,1,  0,0,  1,0,
  ]);

  // vertex buffers created and bound 
  cubeVertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);

  // uv buffers created and bound 
  cubeUVBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeUVBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubeUVs, gl.STATIC_DRAW);
}

//initialize textures
function initTextures() {
    var image = new Image();
    var image2 = new Image();
    if (!image) {
      console.log('Failed to create the image object');
      return false;
    }

    image.onload = function(){ loadTexture( image, "sky"); };

    image2.onload = function(){ loadTexture( image2, "dirt"); };
    
    image.src = '../resources/sky.jpg';
    image2.src = '../resources/dirt.jpg';
    return true;
}

// load textures HERE 
function loadTexture( image, type) { 

    // create texture obj 
    var texture = gl.createTexture(); 

    if (!texture) {
      console.log('Failed to create the texture object');
      return false;
    } 

    // flip y axis on image 
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); 

    if (type == "dirt") { 
        // dirt texture 
        gl.activeTexture(gl.TEXTURE1);  
        texture1 = texture;

    } else if (type == "sky") { 
        // sky texture 
        gl.activeTexture(gl.TEXTURE0);  
        texture0 = texture;
    }


    // texture to target 
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // texture parameters 
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    
    // set texture image HERE
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

    if(type == "sky"){
        gl.uniform1i(u_Sampler0, 0);
    }else if(type == "dirt"){
        gl.uniform1i(u_Sampler1, 1);
    }

    //gl.clear(gl.COLOR_BUFFER_BIT);   // Clear <canvas>

    //gl.drawArrays(gl.TRIANGLE_STRIP, 0, n); // Draw the rectangle
}

function addActionsforHtmlUI(){
    document.getElementById('angleSlide').addEventListener('mousemove', function(){
        g_globalX = this.value;
        renderScene();
    });

    document.getElementById('fov').addEventListener('mousemove', function(){
        g_fov = this.value;
        g_camera.setFOV();
        renderScene();
    });  

    // toggle camera button 
    document.getElementById('toggleMouseControl').addEventListener('click', function(){
        g_mouseControlEnabled = !g_mouseControlEnabled;
        this.textContent = g_mouseControlEnabled ? "ON" : "OFF";
        
        if (g_mouseControlEnabled) {
            enablePointerLock();
        } else {
            disablePointerLock();
        }
    });
    
    // toggle fly button 
    document.getElementById('toggleFlyMode').addEventListener('click', function(){
        const flyModeEnabled = g_camera.toggleFlyMode();
            
        if (flyModeEnabled) {
            this.textContent = "ON";
        } else {
            this.textContent = "OFF";
        }
        
        renderScene();
    });
}  


function handlePointerLockChange() {
    if (document.pointerLockElement === canvas || 
        document.mozPointerLockElement === canvas) {
        
        // mouse move listener 
        document.addEventListener('mousemove', handleMouseMove, false);
        console.log("Pointer lock enabled");
    } else {
        // if pointer unlocked, disable
        document.removeEventListener('mousemove', handleMouseMove, false);
        console.log("Pointer lock disabled");
    }
}

function handleMouseMove(e) {
    if (!g_mouseControlEnabled) return;
    
    // mouse movements 
    const movementX = e.movementX || e.mozMovementX || 0;
    const movementY = e.movementY || e.mozMovementY || 0;
    
    // call camera handler 
    g_camera.handleMouseMovement(movementX, movementY);
    
    // RENDER 
    renderScene();
}

function setupMouseControls() {

    // event listerns when change 
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('mozpointerlockchange', handlePointerLockChange);
    document.addEventListener('webkitpointerlockchange', handlePointerLockChange);
    
    // if clicked on canvas 
    canvas.addEventListener('click', function() {
        if (g_mouseControlEnabled && !document.pointerLockElement) {
            enablePointerLock();
        }
    });
}

function main() {
    
    setupWebGL(); 

    connectVariablesToGLSL();

    initCubeBuffers(); 

    g_cube = new Cube();
    g_camera = new Camera(); 

    // mouse controls 
    setupMouseControls(); 

    // ui 
    addActionsforHtmlUI(); 

    // keyboard register
    document.onkeydown = keydown;

    initTextures();

    // clear canvas color 
    gl.clearColor(0.0, 0.0, 1, 1.0);
    //renderAllShapes();

    requestAnimationFrame(tick);

} 



//block map with small maze in center 
var g_map = [
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
];

 let g_cube; 


 // spawn blocks mechanic 
 function drawMap() {
    
    g_cube.color = [0, 0, 0, 1];
    g_cube.textureNum = -3;
    
    for (let x = 0; x < 32; x++) {
        for (let y = 0; y < 32; y++) {
            let height = g_map[y][x];
            if (height > 0) {
                for (let h = 0; h < height; h++) { 
                    
                    // reset every blocks matrix 
                    g_cube.matrix.setIdentity(); 
                    g_cube.matrix.translate(x - 16, h - 0.75, y - 16); 
                    g_cube.renderfast(); 
                }
            }
        }
    }
}

// keydown moving function  
function keydown(ev) { 

    // q 
    if(ev.keyCode == 81){
        g_camera.panLeft(); 

    } 
    // e 
    else if(ev.keyCode == 69){ 
        g_camera.panRight();

    } 
    
    // w 
    else if(ev.keyCode == 87){ 
        g_camera.moveForward();

    } 
    
    // a 
    else if(ev.keyCode == 65){ 
        g_camera.moveLeft();

    } 
    
    // s
    else if(ev.keyCode == 83){
        g_camera.moveBack();

    } 
    
    // d
    else if(ev.keyCode == 68){ 
        g_camera.moveRight(); 

    } 
    
    // space 
    else if(ev.keyCode == 32){ 
        g_camera.flyUp();
        
    } 
    
    // shift 
    else if(ev.keyCode == 16){
        g_camera.flyDown();
    }

    // RENDER 
    renderScene();
}

// fps meter HERE 
var g_startTime = performance.now()/1000
var g_seconds = performance.now()/1000-g_startTime;

// tick
function tick(){

    g_seconds = performance.now()/1000-g_startTime;

    renderScene();

    requestAnimationFrame(tick);

}

// camera control vars
var g_eye=[0,0,3];
var g_at=[0,0,-100];
var g_up=[0,1,0]; 

function sendTextToHtml(text, htmlID){

    var htmlElm = document.getElementById(htmlID);

    htmlElm.innerHTML = text;

} 

function renderScene(){

    // performance start time 
    var startTime = performance.now(); 

    // view matrix
    var viewMat = g_camera.viewMat;
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMat.elements);

    // projection matrix
    var projMat = g_camera.projMat;
    gl.uniformMatrix4fv(u_ProjectionMatrix, false, projMat.elements); 

    // rotate matrix
    var globalRotMat = new Matrix4().rotate(g_globalX, 0, 1, 0).rotate(g_globalY, 1, 0, 0); 
    gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clear(gl.COLOR_BUFFER_BIT); 

    // sky
    var sky = new Cube();
    sky.color[1,0,0,1];
    sky.textureNum = 0;
    sky.matrix.scale(50,50,50);
    sky.matrix.translate(-.5,-.5,-.5);
    sky.renderfast();

    //blocks
    drawMap(); 

    // floor
    var floor = new Cube();
    floor.color = [0.8,0.8,0.8,1];
    floor.textureNum = -1;
    floor.matrix.translate(0,-.75,0);
    floor.matrix.scale(32,0,32);
    floor.matrix.translate(-.5,0,-.5);
    floor.renderfast();

    var duration = performance.now() - startTime;
    sendTextToHtml( " ms: " + Math.floor(duration) + " fps: " + Math.floor(1000/duration), "fpsDisplay");

}
