#!/usr/bin/env python3
"""
直接调用混元 3D 生成 API，同步等待完成，下载结果。
"""
import requests, json, time, os, sys

TOKEN = "tk_5OlLyQQEHui7yi5pOMl9pVhECMC5EHj0"
MODEL_DIR = r"c:/Users/lamb/WorkBuddy/20260412222433/assets/models"
OS.Makedirs(MODEL_DIR, exist_ok=True)

PROMPTS = [
    ("earth_moon",    "地球和月球3D模型，蓝绿色地球带白色云带，小型灰色月球，PBR材质，Three.js适用", 200000),
    ("lunar_base",    "月球表面3D模型，灰色陨石坑表面，小型月球基地建筑模块，PBR材质", 200000),
    ("mars_canyon",   "火星3D模型，红橙色表面，深邃峡谷地形，PBR材质", 200000),
    ("jupiter_ice",   "木星3D模型，橙棕色条纹，冰晶环，PBR材质", 200000),
    ("uranus_polar",   "天王星3D模型，淡蓝绿色，极光效果，PBR材质", 200000),
    ("neptune_abyss",  "海王星3D模型，深蓝色，暗漩涡风暴，PBR材质", 200000),
    ("pluto_dark",    "冥王星3D模型，灰暗表面带冰原，PBR材质", 150000),
    ("blackhole",       "黑洞3D模型，发光吸积盘，黑暗中心，科幻风格", 150000),
    ("singularity",     "奇点彼岸3D抽象模型，空间扭曲光线，科幻风格", 150000),
]

API_EP = "https://hunyuan.tencentcloudapi.com"
HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {TOKEN}",
}

def submit(prompt, face_count, enable_pbr=True):
    payload = {
        "Prompt": prompt,
        "GenerateType": "Normal",
        "FaceCount": face_count,
        "EnablePBR": enable_pbr,
    }
    r = requests.post(f"{API_EP}/v3d/submit", headers=HEADERS, json=payload, timeout=30)
    r.raise_for_status()
    data = r.json()
    job_id = data.get("JobId") or data.get("job_id") or data.get("Response", {}).get("JobId")
    print(f"  提交成功: {job_id}")
    return job_id

def poll(job_id, timeout=600):
    deadline = time.time() + timeout
    while time.time() < deadline:
        r = requests.get(f"{API_EP}/v3d/query?JobId={job_id}", headers=HEADERS, timeout=15)
        r.raise_for_status()
        data = r.json()
        status = data.get("Status") or data.get("status") or data.get("Response", {}).get("Status", "")
        print(f"  状态: {status}")
        if status in ("DONE", "SUCCESS", "FAILED", "FAIL"):
            return data
        time.sleep(8)
    raise TimeoutError(f"任务 {job_id} 超时")

# 只跑第一个做测试
name, prompt, faces = PROMPTS[0]
print(f"=== 生成: {name} ===")
print(f"Prompt: {prompt[:60]}...")
try:
    jid = submit(prompt, faces)
    result = poll(jid)
    print(f"结果: {json.dumps(result, ensure_ascii=False)[:300]}")
except Exception as e:
    print(f"错误: {e}")
    import traceback; traceback.print_exc()
