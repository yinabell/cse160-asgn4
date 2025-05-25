
class Point{

    constructor(){
        this.type = 'point';
        this.position = [0,0,0];
        this.color = [1,1,1,1];
        this.size = 5;
        this.opacity = 100;
    }

    render(){
        var xy = this.position;
        var rgba = this.color;
        var size = this.size;
        var opacity = this.opacity/100;

        gl.disableVertexAttribArray(a_Position);
        gl.vertexAttrib3f(a_Position, xy[0], xy[1], 0.0);
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], opacity);
        gl.uniform1f(u_Size, size);

        // draw
        gl.drawArrays(gl.POINTS, 0, 1);
    }
}
 