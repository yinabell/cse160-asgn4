
// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;

  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec4 v_VertPos;

  uniform mat4 u_ModelMatrix;
  uniform mat4 u_NormalMatrix;

  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;

  void main() { 
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position; 
    v_UV = a_UV; 
    v_Normal = a_Normal;
    v_VertPos = u_ModelMatrix * a_Position;
  }`

// Fragment shader program
//--------------------------------------------------------------------------------
var FSHADER_SOURCE = ` 
    precision mediump float;
    varying vec2 v_UV;
    varying vec3 v_Normal;
    uniform vec4 u_FragColor;
    uniform sampler2D u_Sampler0;
    uniform sampler2D u_Sampler1;
    uniform int u_whichTexture;
    uniform vec3 u_lightPos;
    uniform vec3 u_cameraPos;
    varying vec4 v_VertPos;
    uniform bool u_lightOn;
    uniform bool u_spotlightOn;
    uniform vec3 u_ambientColor;
    uniform vec3 u_spotlightPos;  
    uniform vec3 u_spotlightDir;  
    uniform float u_spotlightAngle; 

    void main() {

        if(u_whichTexture == -2){                       //color
            gl_FragColor = u_FragColor;
        }else if(u_whichTexture == -1){                 //uv debug
            gl_FragColor = vec4(v_UV,1,1);
        }else if(u_whichTexture == 0){                  //texture 1
            gl_FragColor = texture2D(u_Sampler0, v_UV);  
        }else if(u_whichTexture == -3){                 //texture 2
            gl_FragColor = texture2D(u_Sampler1, v_UV); 
        }else if(u_whichTexture == 3){                  //normals
            gl_FragColor = vec4( (v_Normal + 1.0)/2.0, 1.0);
        }else{                                          //default color
            gl_FragColor = vec4(1,.2,.2,1);
        }
        
        vec3 objectColor = vec3(gl_FragColor);

        //normalize
        vec3 N = normalize(v_Normal);
        vec3 E = normalize(u_cameraPos - vec3(v_VertPos)); // Camera direction
        //ambient
        vec3 ambient = objectColor * u_ambientColor;  
        //default light
        vec3 normalLightColor = vec3(0.0);
        if(u_lightOn){
            vec3 L = normalize(u_lightPos - vec3(v_VertPos));
            //N dot L
            float nDotL = max(dot(N, L), 0.0);
            //reflect
            vec3 R = reflect(-L, N);
            //sepcular
            float specular = pow(max(dot(E, R), 0.0), 50.0) * 0.5;
            //diffuse
            vec3 diffuse = objectColor * nDotL * 0.7;
            //ambiant
            //vec3 ambient = objectColor * u_ambientColor;
            //final color
            normalLightColor = diffuse + specular;
        }

        //spotlight
        vec3 spotlightColor = vec3(0.0);

        if(u_spotlightOn){

            //w
            vec3 w = normalize(vec3(v_VertPos) - u_spotlightPos);
            //w dot d
            float spotlightFactor = dot(w, normalize(-u_spotlightDir));
            //if w dot d  > cos theta
            if (spotlightFactor > cos(radians(u_spotlightAngle))){ 
                vec3 spotlightVector = normalize(u_spotlightPos - vec3(v_VertPos));
                float spotlightDot = max(dot(N, spotlightVector), 0.0);
                vec3 spotlightReflection = reflect(-spotlightVector, N);
                float spotlightSpecular = pow(max(dot(E, spotlightReflection), 0.0), 50.0) * 0.5;
                vec3 spotlightDiffuse = objectColor * spotlightDot * 0.5;
                //vec3 spotlightAmbient = objectColor * u_ambientColor * 0.3; 
                spotlightColor = spotlightDiffuse + spotlightSpecular;
            }
        }

        //final color
        vec3 finalColor = ambient + normalLightColor + spotlightColor;

        if (u_whichTexture == -2 || u_whichTexture == 3) {
            gl_FragColor = vec4(finalColor, 1.0);
        }else{
            gl_FragColor = vec4(finalColor, 1.0);
        }

    }`


// global variables
let canvas; 
let gl; 
let a_Position; 
let a_UV; 
let a_Normal; 
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
let u_lightPos; 
let u_cameraPos; 
let u_lightOn; 
let u_spotlightOn; 
let u_ambientColor; 
let u_spotlightPos; 
let u_spotlightDir; 
let u_spotlightAngle; 

// UI global variables
let g_selectedColor = [1,1,1,1];
let g_globalX = 0;
let g_globalY = 0;
let g_fov = 100;
let g_normalOn = false;
let g_lightPos = [0,1,2];
let g_lightOn = true;
let g_spotlightOn = true;
let g_spotlightPos = [-2,1,1.5];
let g_spotlightDir = [0, 0, 1];
let g_spotlightAngle = 30.0;
let g_ambientColor = [0.3, 0.3, 0.3];

//camera
let g_mouseDown = false;
let g_lastX = 0;
let g_lastY = 0;
let g_camera; 

// all shapes array 
var g_shapesList = []; 
// all size array 
var g_sizes = []; 
// mouse press position array 
var g_points = []; 
// point color array 
var g_colors = []; 

let g_mouseControlEnabled = false;
let g_mouseSensitivity = 0.2;

// color picker HERE 
function convert(hex){
    let bigint = parseInt(hex.substring(1), 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}

function setupWebGL(){

    // grab canvas element 
    canvas = document.getElementById('webgl', {preserveDrawingBuffer: true});

    // rendering context 
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

    // get storage location of u_ModelMatrix
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

    // get storage location of u_FragColor
    u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    if (!u_FragColor) {
        console.log('Failed to get the storage location of u_FragColor');
        return;
    }

    // get storage location of a_Position
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

    // get storage location of u_GlobalRotateMatrix
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

    // get storage location of a_Normal
    a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
    if (!a_Normal) {
      console.log('Failed to get the storage location of a_Normal');
      return false;
    }

    // position of light 
    u_lightPos = gl.getUniformLocation(gl.program, 'u_lightPos');
    if (!u_lightPos) {
      console.log('Failed to get the storage location of u_lightPos');
      return false;
    }

    // position of camera 
    u_cameraPos = gl.getUniformLocation(gl.program, 'u_cameraPos');
    if (!u_cameraPos) {
      console.log('Failed to get the storage location of u_cameraPos');
      return false;
    }
    // light ON 
    u_lightOn = gl.getUniformLocation(gl.program, 'u_lightOn');
    if (!u_lightOn) {
      console.log('Failed to get the storage location of u_cameraPos');
      return false;
    } 
    // spotlight ON 
    u_spotlightOn = gl.getUniformLocation(gl.program, 'u_spotlightOn');
    if (!u_spotlightOn) {
      console.log('Failed to get the storage location of u_spotlighton');
      return false;
    }
    // ambient light HERE 
    u_ambientColor = gl.getUniformLocation(gl.program, 'u_ambientColor');
    if (!u_ambientColor) {
      console.log('Failed to get the storage location of u_ambientcolor');
      return false;
    }

    // position of spotlight 
    u_spotlightPos = gl.getUniformLocation(gl.program, 'u_spotlightPos');
    if (!u_spotlightPos) {
      console.log('Failed to get the storage location of u_spotlightPos');
      return false;
    }

    // direction of spotlight 
    u_spotlightDir = gl.getUniformLocation(gl.program, 'u_spotlightDir');
    if (!u_spotlightDir) {
      console.log('Failed to get the storage location of u_spotlightdir');
      return false;
    }

    // angle of spotlight 
    u_spotlightAngle = gl.getUniformLocation(gl.program, 'u_spotlightAngle');
    if (!u_spotlightAngle) {
      console.log('Failed to get the storage location of u_spotlightangle');
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
        // front face (z = 0)
        0, 0, 0,  1, 0, 0,  1, 1, 0,
        0, 0, 0,  1, 1, 0,  0, 1, 0,

        // back face (z = 1)
        0, 0, 1,  1, 1, 1,  1, 0, 1,
        0, 0, 1,  0, 1, 1,  1, 1, 1,

        // top face (y = 1)
        0, 1, 0,  1, 1, 1,  1, 1, 0,
        0, 1, 0,  0, 1, 1,  1, 1, 1,

        // bottom face (y = 0)
        0, 0, 0,  1, 0, 1,  1, 0, 0,
        0, 0, 0,  0, 0, 1,  1, 0, 1,

        // left face (x = 0)
        0, 0, 0,  0, 1, 1,  0, 1, 0,
        0, 0, 0,  0, 0, 1,  0, 1, 1,

        // right face (x = 1)
        1, 0, 0,  1, 1, 0,  1, 1, 1,
        1, 0, 0,  1, 1, 1,  1, 0, 1,
    ]);

    const cubeNormals = new Float32Array([
        // front face (z = 0)
        0, 0, -1,  0, 0, -1,  0, 0, -1,
        0, 0, -1,  0, 0, -1,  0, 0, -1,

        // back face (z = 1)
        0, 0, 1,   0, 0, 1,   0, 0, 1,
        0, 0, 1,   0, 0, 1,   0, 0, 1,

        // top face (y = 1)
        0, 1, 0,   0, 1, 0,   0, 1, 0,
        0, 1, 0,   0, 1, 0,   0, 1, 0,

        // bottom face (y = 0)
        0, -1, 0,  0, -1, 0,  0, -1, 0,
        0, -1, 0,  0, -1, 0,  0, -1, 0,

        // left face (x = 0)
        -1, 0, 0,  -1, 0, 0,  -1, 0, 0,
        -1, 0, 0,  -1, 0, 0,  -1, 0, 0,

        // right face (x = 1)
        1, 0, 0,   1, 0, 0,   1, 0, 0,
        1, 0, 0,   1, 0, 0,   1, 0, 0,
    ]);

    const cubeUVs = new Float32Array([
        // front face
        0, 0,  1, 0,  1, 1,
        0, 0,  1, 1,  0, 1,

        // back face
        0, 0,  1, 1,  1, 0,
        0, 0,  0, 1,  1, 1,

        // top face
        0, 0,  1, 1,  1, 0,
        0, 0,  0, 1,  1, 1,

        // bottom face
        0, 0,  1, 1,  1, 0,
        0, 0,  0, 1,  1, 1,

        // left face
        0, 0,  1, 1,  1, 0,
        0, 0,  0, 1,  1, 1,

        // right face
        0, 0,  1, 1,  1, 0,
        0, 0,  0, 1,  1, 1,
    ]);

    // vertex buffers created and bound 
    cubeVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);

    // uv buffers created and bound 
    cubeUVBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeUVBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cubeUVs, gl.STATIC_DRAW);

    // normal buffers created and bound 
    cubeNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cubeNormals, gl.STATIC_DRAW);

}

// initialize textures HERE
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

    // normal ON button 
    document.getElementById('normalOn').onclick = function() {
        g_normalOn = true; renderScene();
    }; 

    // normal OFF button  
    document.getElementById('normalOff').onclick = function() {
        g_normalOn = false; renderScene();
    };

    // light ON button 
    document.getElementById('lightOn').onclick = function() {
        g_lightOn = true; renderScene();
    };

    // light OFF button 
    document.getElementById('lightOff').onclick = function() {
        g_lightOn = false; renderScene();
    };

    // spotlight ON button 
    document.getElementById('spotlightOn').onclick = function() {
        g_spotlightOn = true; renderScene();
    };

    // spotlight OFF button 
    document.getElementById('spotlightOff').onclick = function() {
        g_spotlightOn = false; renderScene();
    };

    // ambient oolor picker 
    document.getElementById('color').addEventListener('input', function() {
        let hexColor = this.value; 
        let rgb = convert(hexColor); 
        g_ambientColor = [rgb.r / 255, rgb.g / 255, rgb.b / 255]; 
        renderScene();
    });

    // x light slider 
    document.getElementById('lightX').addEventListener('mousemove', function(){
        g_lightPos[0] = this.value/100;
        renderScene();
    });
    // y light slider 
    document.getElementById('lightY').addEventListener('mousemove', function(){
        g_lightPos[1] = this.value/100;
        renderScene();
    });
    // z slight slider 
    document.getElementById('lightZ').addEventListener('mousemove', function(){
        g_lightPos[2] = this.value/100;
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
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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

    updateAnimationAngles();

    renderScene();

    requestAnimationFrame(tick);

}

function updateAnimationAngles(){

    g_lightPos[0] = 2.3*Math.cos(g_seconds);


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

    // clearing canvas 
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clear(gl.COLOR_BUFFER_BIT); 

    gl.uniform3f(u_lightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
    gl.uniform3f(u_cameraPos, g_camera.eye.elements[0], g_camera.eye.elements[1], g_camera.eye.elements[2]);
    gl.uniform1i(u_lightOn, g_lightOn);

    gl.uniform3f(u_spotlightPos, g_spotlightPos[0], g_spotlightPos[1], g_spotlightPos[2]);
    gl.uniform3f(u_spotlightDir, g_spotlightDir[0], g_spotlightDir[1], g_spotlightDir[2]);
    gl.uniform1f(u_spotlightAngle, g_spotlightAngle);
    gl.uniform1i(u_spotlightOn, g_spotlightOn);

    gl.uniform3f(u_ambientColor, g_ambientColor[0], g_ambientColor[1], g_ambientColor[2]);

    // CUBE HERE  
    // make cube 
    var box = new Cube();

    // color of cube HERE 
    box.color = [0.031, 0.529, 0.424, 1.0];

    if(g_normalOn) box.textureNum = 3;
    box.matrix.translate(-2, -2, .75);
    box.renderfast();

    // SPHERE HERE 
    // make sphere 
    var c = new Sphere(); 

    // sphere color
    c.color = [0.635, 0.812, 0.792, 1.0]; 
    if(g_normalOn) c.textureNum = 3;
    c.matrix.translate(1.5, -1.5, -0.5); 
    c.render();

    // moving light HERE
    var light = new Cube(); 

    // color of moving light 
    light.color = [2.0, 1.8, 0.6, 1.0]; 

    light.matrix.translate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
    light.matrix.scale(-0.2, -0.2, -0.2);
    light.matrix.translate(-0.5, 2, -0.5);
    light.renderfast();

    // spotlight
    var spotlight = new Cube();
    spotlight.color = [0.447, 0.620, 0.757, 1.0]; 
    spotlight.matrix.translate(g_spotlightPos[0], g_spotlightPos[1], g_spotlightPos[2]);
    spotlight.matrix.scale(-0.4,-0.4,-0.4);
    spotlight.matrix.translate(-0.2, -2, -0.2);
    spotlight.renderfast();

    // floor
    var floor = new Cube();
    floor.color = [0.8,0.8,0.8,1];
    floor.textureNum = -2;
    floor.matrix.translate(0,-.75,0);
    floor.matrix.scale(32,32,32);
    floor.matrix.translate(-.5,-.1,-.5);
    floor.renderfast();

    // sky
    var sky = new Cube();
    sky.color = [0.5, 0.5, 0.5, 1];
    if(g_normalOn) sky.textureNum = 3;
    sky.matrix.scale(-10,-10,-10);
    sky.matrix.translate(-.5,-.5,-.5);
    sky.renderfast();

    var duration = performance.now() - startTime;
    sendTextToHtml( " ms: " + Math.floor(duration) + " fps: " + Math.floor(1000/duration), "fpsDisplay");

}
