"""
GLB 贴图压缩工具（本游戏专用）
- 把过大的 PNG 贴图降分辨率 + 转 JPEG，网格数据原样保留
- 用法: python _glb_compress.py <目标边长> <jpeg质量> [--apply] <文件...>
  默认 dry-run，只报告不写盘；加 --apply 才真正写。
"""
import struct, sys, os, json, io, shutil
from PIL import Image

CHUNK_JSON = 0x4E4F534A
CHUNK_BIN = 0x004E4942


def parse_glb(b):
    if b[0:4] != b'glTF':
        raise ValueError('not glb')
    off = 12
    chunks = []
    while off + 8 <= len(b):
        clen = struct.unpack_from('<I', b, off)[0]
        ctype = struct.unpack_from('<I', b, off + 4)[0]
        chunks.append((ctype, clen, off + 8))
        off = off + 8 + clen
        if off % 4 != 0:
            off += 4 - (off % 4)
    js_chunk = next(c for c in chunks if c[0] == CHUNK_JSON)
    bin_chunk = next((c for c in chunks if c[0] == CHUNK_BIN), None)
    js = json.loads(b[js_chunk[2]:js_chunk[2] + js_chunk[1]].decode('utf-8'))
    return js, bin_chunk


def pad4(n):
    return n if n % 4 == 0 else n + (4 - n % 4)


def compress_file(path, target, quality, apply_changes, backup_dir):
    name = os.path.basename(path)
    with open(path, 'rb') as f:
        b = f.read()
    orig_size = len(b)
    js, bin_chunk = parse_glb(b)
    if bin_chunk is None:
        return f"{name}: 无 BIN chunk，跳过"

    bin_off = bin_chunk[2]
    bin_len = bin_chunk[1]
    bin_data = b[bin_off:bin_off + bin_len]
    images = js.get('images', [])
    bvs = js.get('bufferViews', [])

    # 收集：所有 bufferView 按 byteOffset 排序，图片类标记出来
    img_bv_idx = {}
    for i, im in enumerate(images):
        if 'bufferView' in im:
            img_bv_idx[im['bufferView']] = i

    order = sorted(range(len(bvs)), key=lambda i: bvs[i].get('byteOffset', 0))

    new_bin = bytearray()
    new_offsets = {}
    new_lengths = {}
    stats = []
    total_img_before = 0
    total_img_after = 0

    for i in order:
        bv = bvs[i]
        src_off = bv.get('byteOffset', 0)
        src_len = bv['byteLength']
        raw = bin_data[src_off:src_off + src_len]

        if i in img_bv_idx:
            try:
                img = Image.open(io.BytesIO(raw))
                w, h = img.size
                if w > target or h > target:
                    scale = target / max(w, h)
                    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
                    img = img.resize((nw, nh), Image.LANCZOS)
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                buf = io.BytesIO()
                img.save(buf, format='JPEG', quality=quality, optimize=True)
                out = buf.getvalue()
                mime = 'image/jpeg'
            except Exception as e:
                out = raw
                mime = bv.get('__mime', 'image/png')
                print(f"    ! {name} img{i} 处理失败({e})，保持原样")
            total_img_before += len(raw)
            total_img_after += len(out)
            images[img_bv_idx[i]]['mimeType'] = mime
            stats.append(f"    img{i}: {w}x{h} {len(raw)/1048576:.2f}MB -> {len(out)/1024:.0f}KB")
        else:
            out = raw

        # 4 字节对齐
        cur = len(new_bin)
        if cur % 4 != 0:
            new_bin.extend(b'\x00' * (4 - cur % 4))
            cur = len(new_bin)
        new_offsets[i] = cur
        new_lengths[i] = len(out)
        new_bin.extend(out)

    for i in order:
        bvs[i]['byteOffset'] = new_offsets[i]
        bvs[i]['byteLength'] = new_lengths[i]

    js['buffers'][0]['byteLength'] = len(new_bin)
    if 'uri' in js['buffers'][0]:
        del js['buffers'][0]['uri']

    # 序列化 JSON
    js_bytes = json.dumps(js, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    js_pad = b' ' * (pad4(len(js_bytes)) - len(js_bytes))
    bin_pad = b'\x00' * (pad4(len(new_bin)) - len(new_bin))
    total_len = 12 + 8 + len(js_bytes) + len(js_pad) + 8 + len(new_bin) + len(bin_pad)
    out_bytes = bytearray()
    out_bytes.extend(b'glTF')
    out_bytes.extend(struct.pack('<II', 2, total_len))
    out_bytes.extend(struct.pack('<II', len(js_bytes) + len(js_pad), CHUNK_JSON))
    out_bytes.extend(js_bytes); out_bytes.extend(js_pad)
    out_bytes.extend(struct.pack('<II', len(new_bin) + len(bin_pad), CHUNK_BIN))
    out_bytes.extend(new_bin); out_bytes.extend(bin_pad)

    new_size = len(out_bytes)
    saved = (1 - new_size / orig_size) * 100
    line = (f"{name}: {orig_size/1048576:.1f}MB -> {new_size/1048576:.2f}MB "
            f"(-{saved:.0f}%)  [贴图 {total_img_before/1048576:.1f}MB -> {total_img_after/1048576:.2f}MB]")

    if apply_changes:
        if backup_dir:
            os.makedirs(backup_dir, exist_ok=True)
            dst = os.path.join(backup_dir, path.replace('\\', '_').replace('/', '_'))
            if not os.path.exists(dst):
                shutil.copy2(path, dst)
        with open(path, 'wb') as f:
            f.write(out_bytes)
    return line + ('\n' + '\n'.join(stats) if stats else '')


def main():
    args = sys.argv[1:]
    apply_changes = '--apply' in args
    if apply_changes:
        args.remove('--apply')
    if len(args) < 3:
        print(__doc__); sys.exit(1)
    target = int(args[0])
    quality = int(args[1])
    files = args[2:]
    backup_dir = '_glb_backup'
    print(f"模式: {'写入' if apply_changes else 'DRY-RUN'}  目标边长={target}  JPEG质量={quality}")
    total_before = total_after = 0
    for p in files:
        if not os.path.exists(p):
            print(f"{p}: 不存在"); continue
        total_before += os.path.getsize(p)
        try:
            r = compress_file(p, target, quality, apply_changes, backup_dir)
            print(r)
        except Exception as e:
            print(f"{p}: 错误 {e}")
        if apply_changes:
            total_after += os.path.getsize(p)
        else:
            total_after += 0
    if apply_changes:
        print(f"\n合计: {total_before/1048576:.1f}MB -> {total_after/1048576:.1f}MB")
    else:
        print(f"\n(dry-run) 原始合计 {total_before/1048576:.1f}MB —— 加 --apply 才会写盘")


if __name__ == '__main__':
    main()
