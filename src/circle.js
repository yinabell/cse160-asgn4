class Circle{

    constructor(){
        this.type = 'circle';
        this.position = [0.0, 0.0, 0.0];
        this.color = [1,1,1,1];
        this.sCount = g_selectedSegments;
        this.size = 5;
        this.opacity = 100;
    }

    render() {
        var xy = this.position;
        var rgba = this.color;
        var size = this.size;
        var opacity = this.opacity/100;

        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], opacity);

        // Draw
        var d = this.size/200;
        var angleStep = 360/this.sCount;

        for(var angle = 0; angle < 360; angle += angleStep){
            let centerPt = [xy[0], xy[1]];
            let a1 = angle;
            let a2 = angle + angleStep;
            let vec1 = [Math.cos(a1*Math.PI/180)*d, Math.sin(a1*Math.PI/180)*d];
            let vec2 = [Math.cos(a2*Math.PI/180)*d, Math.sin(a2*Math.PI/180)*d];
            let pt1 = [centerPt[0]+vec1[0], centerPt[1]+vec1[1]];
            let pt2 = [centerPt[0]+vec2[0], centerPt[1]+vec2[1]];
            drawTriangle( [xy[0], xy[1], pt1[0], pt1[1], pt2[0], pt2[1]] );
        }
    }
}

function drawTriangle(vertices){
    var n = 3;
    var vertexBuffer = gl.createBuffer();

    if(!vertexBuffer){
        return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
    gl.drawArrays(gl.TRIANGLES, 0, n);
}