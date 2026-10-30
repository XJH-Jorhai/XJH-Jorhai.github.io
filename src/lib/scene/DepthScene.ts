import * as T from 'three';
import {sceneConfig as config} from './config';
export interface ProxyData { camera:{fov:number;near:number;far:number;distance:number}; layers:{name:string;distance:number;polygon:[number,number][]}[];features:{name:string;uv:[number,number];layer:number}[] }
export class DepthScene {
  scene=new T.Scene(); meshes:T.Mesh<T.BufferGeometry,T.MeshBasicMaterial>[]=[];
  flat=false;
  constructor(public data:ProxyData,public texture:T.Texture,public aspect:number,public environment:T.Texture){this.build(false);}
  point(uv:[number,number],distance:number){const t=Math.tan(T.MathUtils.degToRad(this.data.camera.fov/2));return new T.Vector3((2*uv[0]-1)*this.aspect*t*distance,(1-2*uv[1])*t*distance,-distance);}
  build(flat:boolean){
    this.disposeMeshes(); this.flat=flat;
    const layers=flat?[this.data.layers[0]!]:this.data.layers;
    layers.forEach((layer,i)=>{
      const shape=new T.Shape(layer.polygon.map(([u,v])=>new T.Vector2(u,1-v)));
      const geometry=new T.ShapeGeometry(shape);const pos=geometry.attributes.position!;const uv=geometry.attributes.uv!;
      for(let j=0;j<pos.count;j++){const u=pos.getX(j),v=1-pos.getY(j);uv.setXY(j,u,1-v);const p=this.point([u,v],flat?6:layer.distance);const scale=flat||i===0?1:i===2?config.lidScale:config.subjectScale;pos.setXYZ(j,p.x*scale,p.y*scale,p.z);}
      geometry.computeVertexNormals(); geometry.computeBoundingSphere();
      const material=new T.MeshBasicMaterial({map:i===0&&!flat?this.environment:this.texture,side:T.DoubleSide});
      const mesh=new T.Mesh(geometry,material);mesh.name=layer.name; this.meshes.push(mesh);this.scene.add(mesh);
    });
  }

  feature(index:number){const f=this.data.features[index]!;const p=this.point(f.uv,this.flat?6:this.data.layers[f.layer]!.distance);const scale=this.flat||f.layer===0?1:f.layer===2?config.lidScale:config.subjectScale;p.x*=scale;p.y*=scale;return p;}
  disposeMeshes(){for(const m of this.meshes){this.scene.remove(m);m.geometry.dispose();m.material.dispose();}this.meshes=[];}
  dispose(){this.disposeMeshes();this.texture.dispose();this.environment.dispose();}
}
