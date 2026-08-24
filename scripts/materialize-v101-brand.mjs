import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const dkd_root=process.cwd();
const dkd_package=JSON.parse(fs.readFileSync(path.join(dkd_root,'package.json'),'utf8'));
const dkd_version=String(dkd_package.version||'1.0.6');
const dkd_dir=path.join(dkd_root,'assets','branding','v101');
const dkd_parts=['part01.b64','part02a.b64','part02b.b64','part03.b64'];
const dkd_expected_sha256='a53b48a25effd28631cb07881f210365c9649f65a6eb2a39596abb9634c493d2';
const dkd_missing=dkd_parts.filter((dkd_name)=>!fs.existsSync(path.join(dkd_dir,dkd_name)));
if(dkd_missing.length)throw new Error(`DraBornPark v${dkd_version} branding payload missing: ${dkd_missing.join(', ')}`);
const dkd_base64=dkd_parts.map((dkd_name)=>fs.readFileSync(path.join(dkd_dir,dkd_name),'utf8').trim()).join('');
const dkd_png=Buffer.from(dkd_base64,'base64');
const dkd_signature=Buffer.from('89504e470d0a1a0a','hex');
if(!dkd_png.subarray(0,8).equals(dkd_signature))throw new Error(`DraBornPark v${dkd_version} branding payload is not a valid PNG.`);
const dkd_sha256=crypto.createHash('sha256').update(dkd_png).digest('hex');
if(dkd_sha256!==dkd_expected_sha256)throw new Error(`DraBornPark v${dkd_version} branding payload SHA-256 mismatch: ${dkd_sha256}`);

function dkd_crc32(dkd_buffer){
  let dkd_crc=0xffffffff;
  for(const dkd_byte of dkd_buffer){dkd_crc^=dkd_byte;for(let dkd_bit=0;dkd_bit<8;dkd_bit++)dkd_crc=(dkd_crc>>>1)^((dkd_crc&1)?0xedb88320:0);}
  return (dkd_crc^0xffffffff)>>>0;
}
function dkd_chunk(dkd_type,dkd_data){
  const dkd_type_buffer=Buffer.from(dkd_type,'ascii');
  const dkd_length=Buffer.alloc(4);dkd_length.writeUInt32BE(dkd_data.length,0);
  const dkd_crc=Buffer.alloc(4);dkd_crc.writeUInt32BE(dkd_crc32(Buffer.concat([dkd_type_buffer,dkd_data])),0);
  return Buffer.concat([dkd_length,dkd_type_buffer,dkd_data,dkd_crc]);
}
function dkd_paeth(dkd_a,dkd_b,dkd_c){const dkd_p=dkd_a+dkd_b-dkd_c,dkd_pa=Math.abs(dkd_p-dkd_a),dkd_pb=Math.abs(dkd_p-dkd_b),dkd_pc=Math.abs(dkd_p-dkd_c);return dkd_pa<=dkd_pb&&dkd_pa<=dkd_pc?dkd_a:dkd_pb<=dkd_pc?dkd_b:dkd_c;}
function dkd_transparent_splash(dkd_source){
  const dkd_chunks=[];let dkd_offset=8;
  while(dkd_offset<dkd_source.length){const dkd_length=dkd_source.readUInt32BE(dkd_offset),dkd_type=dkd_source.toString('ascii',dkd_offset+4,dkd_offset+8),dkd_data=dkd_source.subarray(dkd_offset+8,dkd_offset+8+dkd_length);dkd_chunks.push({type:dkd_type,data:Buffer.from(dkd_data)});dkd_offset+=12+dkd_length;if(dkd_type==='IEND')break;}
  const dkd_ihdr=dkd_chunks.find(dkd_item=>dkd_item.type==='IHDR')?.data;
  const dkd_plte=dkd_chunks.find(dkd_item=>dkd_item.type==='PLTE')?.data;
  if(!dkd_ihdr||!dkd_plte)return dkd_source;
  const dkd_width=dkd_ihdr.readUInt32BE(0),dkd_height=dkd_ihdr.readUInt32BE(4),dkd_bit_depth=dkd_ihdr[8],dkd_color_type=dkd_ihdr[9],dkd_interlace=dkd_ihdr[12];
  if(dkd_bit_depth!==8||dkd_color_type!==3||dkd_interlace!==0)return dkd_source;
  const dkd_idat=Buffer.concat(dkd_chunks.filter(dkd_item=>dkd_item.type==='IDAT').map(dkd_item=>dkd_item.data));
  const dkd_raw=zlib.inflateSync(dkd_idat);const dkd_stride=dkd_width;const dkd_pixels=Buffer.alloc(dkd_width*dkd_height);let dkd_pos=0;
  for(let dkd_y=0;dkd_y<dkd_height;dkd_y++){
    const dkd_filter=dkd_raw[dkd_pos++];const dkd_row=Buffer.alloc(dkd_stride);const dkd_prev=dkd_y?dkd_pixels.subarray((dkd_y-1)*dkd_stride,dkd_y*dkd_stride):null;
    for(let dkd_x=0;dkd_x<dkd_stride;dkd_x++){
      const dkd_value=dkd_raw[dkd_pos++],dkd_left=dkd_x?dkd_row[dkd_x-1]:0,dkd_up=dkd_prev?dkd_prev[dkd_x]:0,dkd_up_left=dkd_prev&&dkd_x?dkd_prev[dkd_x-1]:0;
      if(dkd_filter===0)dkd_row[dkd_x]=dkd_value;
      else if(dkd_filter===1)dkd_row[dkd_x]=(dkd_value+dkd_left)&255;
      else if(dkd_filter===2)dkd_row[dkd_x]=(dkd_value+dkd_up)&255;
      else if(dkd_filter===3)dkd_row[dkd_x]=(dkd_value+Math.floor((dkd_left+dkd_up)/2))&255;
      else if(dkd_filter===4)dkd_row[dkd_x]=(dkd_value+dkd_paeth(dkd_left,dkd_up,dkd_up_left))&255;
      else throw new Error(`Unsupported PNG filter ${dkd_filter}`);
    }
    dkd_row.copy(dkd_pixels,dkd_y*dkd_stride);
  }
  const dkd_palette_count=Math.floor(dkd_plte.length/3);if(dkd_palette_count>=256)return dkd_source;
  const dkd_background_index=dkd_pixels[0];const dkd_base=dkd_background_index*3;const dkd_br=dkd_plte[dkd_base]??0,dkd_bg=dkd_plte[dkd_base+1]??0,dkd_bb=dkd_plte[dkd_base+2]??0;
  const dkd_close=dkd_index=>{const dkd_i=dkd_index*3,dkd_r=dkd_plte[dkd_i]??255,dkd_g=dkd_plte[dkd_i+1]??255,dkd_b=dkd_plte[dkd_i+2]??255,dkd_dr=dkd_r-dkd_br,dkd_dg=dkd_g-dkd_bg,dkd_db=dkd_b-dkd_bb;return dkd_dr*dkd_dr+dkd_dg*dkd_dg+dkd_db*dkd_db<=900;};
  const dkd_mark=new Uint8Array(dkd_pixels.length);const dkd_queue=new Uint32Array(dkd_pixels.length);let dkd_head=0,dkd_tail=0;
  const dkd_add=dkd_index=>{if(dkd_mark[dkd_index]||!dkd_close(dkd_pixels[dkd_index]))return;dkd_mark[dkd_index]=1;dkd_queue[dkd_tail++]=dkd_index;};
  for(let dkd_x=0;dkd_x<dkd_width;dkd_x++){dkd_add(dkd_x);dkd_add((dkd_height-1)*dkd_width+dkd_x);}for(let dkd_y=1;dkd_y<dkd_height-1;dkd_y++){dkd_add(dkd_y*dkd_width);dkd_add(dkd_y*dkd_width+dkd_width-1);}
  while(dkd_head<dkd_tail){const dkd_index=dkd_queue[dkd_head++],dkd_x=dkd_index%dkd_width,dkd_y=Math.floor(dkd_index/dkd_width);if(dkd_x)dkd_add(dkd_index-1);if(dkd_x+1<dkd_width)dkd_add(dkd_index+1);if(dkd_y)dkd_add(dkd_index-dkd_width);if(dkd_y+1<dkd_height)dkd_add(dkd_index+dkd_width);}
  const dkd_transparent_index=dkd_palette_count;for(let dkd_index=0;dkd_index<dkd_pixels.length;dkd_index++)if(dkd_mark[dkd_index])dkd_pixels[dkd_index]=dkd_transparent_index;
  const dkd_new_plte=Buffer.concat([dkd_plte,Buffer.from([dkd_br,dkd_bg,dkd_bb])]);const dkd_old_trns=dkd_chunks.find(dkd_item=>dkd_item.type==='tRNS')?.data??Buffer.alloc(0);const dkd_new_trns=Buffer.alloc(dkd_transparent_index+1,255);dkd_old_trns.copy(dkd_new_trns,0,0,Math.min(dkd_old_trns.length,dkd_transparent_index));dkd_new_trns[dkd_transparent_index]=0;
  const dkd_scan=Buffer.alloc((dkd_width+1)*dkd_height);for(let dkd_y=0;dkd_y<dkd_height;dkd_y++){const dkd_start=dkd_y*(dkd_width+1);dkd_scan[dkd_start]=0;dkd_pixels.copy(dkd_scan,dkd_start+1,dkd_y*dkd_width,(dkd_y+1)*dkd_width);}const dkd_new_idat=zlib.deflateSync(dkd_scan,{level:9});
  const dkd_out=[dkd_signature];let dkd_idat_written=false,dkd_trns_written=false;
  for(const dkd_item of dkd_chunks){
    if(dkd_item.type==='PLTE'){dkd_out.push(dkd_chunk('PLTE',dkd_new_plte));if(!dkd_chunks.some(dkd_x=>dkd_x.type==='tRNS')){dkd_out.push(dkd_chunk('tRNS',dkd_new_trns));dkd_trns_written=true;}continue;}
    if(dkd_item.type==='tRNS'){if(!dkd_trns_written){dkd_out.push(dkd_chunk('tRNS',dkd_new_trns));dkd_trns_written=true;}continue;}
    if(dkd_item.type==='IDAT'){if(!dkd_idat_written){dkd_out.push(dkd_chunk('IDAT',dkd_new_idat));dkd_idat_written=true;}continue;}
    dkd_out.push(dkd_chunk(dkd_item.type,dkd_item.data));
  }
  return Buffer.concat(dkd_out);
}

const dkd_splash=dkd_transparent_splash(dkd_png);
for(const dkd_target of ['icon.png','adaptive-icon.png']){
  const dkd_path=path.join(dkd_root,'assets','branding',dkd_target);if(!fs.existsSync(dkd_path)||!fs.readFileSync(dkd_path).equals(dkd_png))fs.writeFileSync(dkd_path,dkd_png);
}
const dkd_splash_path=path.join(dkd_root,'assets','branding','splash-icon.png');if(!fs.existsSync(dkd_splash_path)||!fs.readFileSync(dkd_splash_path).equals(dkd_splash))fs.writeFileSync(dkd_splash_path,dkd_splash);
console.log(`DraBornPark v${dkd_version} branding ready • transparent splash • ${Math.round(dkd_png.length/1024)} KB • SHA-256 ${dkd_sha256.slice(0,12)}`);
