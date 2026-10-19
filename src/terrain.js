import {SCALE,colourAt,heightFor} from './model.js';

// A separate surface per provider. No shared field, summation or interpolation
// between providers; overlap only affects visibility through the depth buffer.
export function hillGeometry(THREE,salary,x=0,y=0){
  const height=heightFor(salary);if(height===null)return null;
  const positions=[],colours=[],indices=[],radial=32,levels=22;
  for(let j=0;j<=levels;j++){
    const t=j/levels,z=height*t,r=SCALE.radius*Math.sqrt(1-t),colour=new THREE.Color(colourAt(salary*t));
    for(let i=0;i<=radial;i++){
      const angle=i/radial*Math.PI*2;positions.push(x+r*Math.cos(angle),-y+r*Math.sin(angle),z+.008);colours.push(colour.r,colour.g,colour.b);
    }
  }
  for(let j=0;j<levels;j++)for(let i=0;i<radial;i++){
    const a=j*(radial+1)+i,b=a+radial+1;indices.push(a,a+1,b,b,a+1,b+1);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
