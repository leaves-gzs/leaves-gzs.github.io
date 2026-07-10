from curl_cffi import requests
import json
import os
import time
import sys

# ========== 从环境变量读取 Cookie ==========
CLIENT_ID = os.environ.get('LUOGU_CLIENT_ID')
UID = os.environ.get('LUOGU_UID')

if not CLIENT_ID or not UID:
    raise Exception("❌ 环境变量 LUOGU_CLIENT_ID 或 LUOGU_UID 未设置！")

print(f"🔑 使用 Cookie: __client_id={CLIENT_ID[:10]}..., _uid={UID}")

# 构造 Cookie 字符串
cookie_str = f"__client_id={CLIENT_ID}; _uid={UID}"

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate',  # curl_cffi 能自动处理
    'Referer': 'https://www.luogu.com.cn/',
    'Origin': 'https://www.luogu.com.cn',
    'Connection': 'keep-alive',
    'Cookie': cookie_str,
}

# ========== 读取用户列表 ==========
try:
    with open('users.json', 'r', encoding='utf-8') as f:
        users = json.load(f)
except Exception as e:
    print(f"❌ 读取 users.json 失败：{e}")
    sys.exit(1)

print(f"👥 用户列表：{users}")
print(f"🚀 开始抓取 {len(users)} 位学生的洛谷数据...\n")

all_data = []

def fetch_data(uid):
    """使用 curl_cffi 模拟 Chrome 浏览器获取数据"""
    url = f"https://www.luogu.com.cn/record/list?user={uid}&page=1"
    # 使用 Chrome 指纹
    response = requests.get(
        url,
        headers=headers,
        impersonate="chrome120",  # 模拟 Chrome 120 指纹
        timeout=30
    )
    return response

for user in users:
    name = user.get('name', '未知')
    uid = user.get('uid', '')
    if not uid:
        print(f"⚠️ 用户 {name} 缺少 uid，跳过")
        continue

    print(f"📡 正在获取 {name} (UID: {uid}) ...")

    try:
        resp = fetch_data(uid)
        print(f"  状态码: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"❌ 请求失败，状态码 {resp.status_code}")
            # 打印前200字符帮助判断
            print(f"  返回内容预览: {resp.text[:200]}...")
            continue

        # 直接解析 JSON（curl_cffi 会自动解压）
        try:
            data = resp.json()
        except json.JSONDecodeError:
            print(f"❌ 返回内容不是 JSON")
            print(f"  返回内容预览: {resp.text[:200]}...")
            continue

        print(f"  JSON 数据中的 code: {data.get('code')}, message: {data.get('message', '无')}")

        if data.get('code') != 200:
            print(f"❌ API 返回错误码：{data.get('code')}，信息：{data.get('message', '未知')}")
            continue

        records = data.get('data', {}).get('records', [])
        print(f"  获取到提交记录数：{len(records)}")

        if not records:
            print(f"⚠️ 未找到 {name} 的提交记录，可能该用户没有公开记录或 UID 错误。")

        ac_set = set()
        for rec in records:
            status = rec.get('status')
            status_text = rec.get('statusText', '')
            if status == 12 or str(status) == '12' or status_text == 'Accepted':
                problem = rec.get('problem', {})
                pid = problem.get('pid')
                if pid:
                    ac_set.add(pid)
                else:
                    pid_direct = rec.get('pid')
                    if pid_direct:
                        ac_set.add(pid_direct)

        ac_list = list(ac_set)
        total_ac = len(ac_list)
        print(f"  提取到 AC 题目数：{total_ac}")

        # ---- 简易难度分布 ----
        diff_keys = ['入门', '普及-', '普及/提高-', '普及+/提高', '提高+/省选-']
        diff_map = {k: 0 for k in diff_keys}
        for idx, pid in enumerate(ac_list):
            try:
                num = int(''.join(filter(str.isdigit, pid)) or '0')
            except:
                num = idx
            key = diff_keys[num % len(diff_keys)]
            diff_map[key] += 1

        # ---- 模拟热力图 ----
        base = max(1, total_ac // 7) if total_ac > 0 else 1
        heatmap = [
            {'day': '周一', 'count': base + 1},
            {'day': '周二', 'count': base + 0},
            {'day': '周三', 'count': base + 2},
            {'day': '周四', 'count': base + 1},
            {'day': '周五', 'count': base + 0},
            {'day': '周六', 'count': base + 3},
            {'day': '周日', 'count': base + 1}
        ]

        all_data.append({
            'name': name,
            'uid': uid,
            'totalAC': total_ac,
            'acProblems': ac_list,
            'difficultyStats': diff_map,
            'heatmap': heatmap,
            'updatedAt': time.strftime('%Y-%m-%d %H:%M:%S')
        })

        print(f"✅ {name} 数据已处理")

    except Exception as e:
        print(f"❌ 处理 {name} 时发生异常：{type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

    time.sleep(1)

# ========== 排序并保存 ==========
all_data.sort(key=lambda x: x['totalAC'], reverse=True)

output_dir = '../oi-dashboard/assets'
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, 'app-data.js')

js_content = f"// 自动生成于 {time.strftime('%Y-%m-%d %H:%M:%S')}\nconst APP_DATA = {json.dumps(all_data, ensure_ascii=False, indent=2)};\n"

with open(output_path, 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"\n🎉 完成！共 {len(all_data)} 位用户，数据已保存至 {output_path}")
