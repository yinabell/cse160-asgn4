  class Triangle{

    constructor(){
        this.type = 'triangle';
        this.position = [0.0, 0.0, 0.0];
        this.color = [1,1,1,1];
        this.size = 5;
        this.opacity = 100;
    }

    render(){
        var xy = this.position;
        var rgba = this.color;
        var size = this.size;
        var opacity = this.opacity/100;

        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], opacity);
        gl.uniform1f(u_Size, size);

        // draw here 
        var d = this.size/200;
        drawTriangle([xy[0]-d/2, xy[1]-d/2, xy[0]+d/2, xy[1]-d/2, xy[0], xy[1]+d/2]);
    }
}

function drawTriangle(vertices){
    var n = 3;
    var vertexBuffer = gl.createBuffer();

    if(!vertexBuffer){
        console.log("Unable to make vertex buffer");
        return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
    gl.drawArrays(gl.TRIANGLES, 0, n);
}

// draw 3D triangles 
function drawTriangle3D(vertices){
    var n = 3;
    var vertexBuffer = gl.createBuffer();

    if(!vertexBuffer){
        console.log("Unable to make vertex buffer");
        return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
    gl.drawArrays(gl.TRIANGLES, 0, n);
}

// draw triangle 
function drawTriangle3DUV(vertices, uv){

    var n = vertices.length/3;

    var vertexBuffer = gl.createBuffer();
    if(!vertexBuffer){
        return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    var uvBuffer = gl.createBuffer();
    if(!uvBuffer){
        return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);

    gl.drawArrays(gl.TRIANGLES, 0, n);
}
