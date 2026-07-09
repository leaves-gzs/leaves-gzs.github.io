import requests
import json
import os
import time

# ========== 从环境变量读取 Cookie ==========
CLIENT_ID = os.environ.get('LUOGU_CLIENT_ID')
UID = os.environ.get('LUOGU_UID')

if not CLIENT_ID or not UID:
    raise Exception("❌ 环境变量 LUOGU_CLIENT_ID 或 LUOGU_UID 未设置！")

cookies = {
    '__client_id': CLIENT_ID,
    '_uid': UID
}

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://www.luogu.com.cn/'
}

# ========== 读取用户列表 ==========
with open('users.json', 'r', encoding='utf-8') as f:
    users = json.load(f)

print(f"🚀 开始抓取 {len(users)} 位学生的洛谷数据...")

all_data = []

for user in users:
    name = user['name']
    uid = user['uid']
    print(f"📡 正在获取 {name} (UID: {uid}) ...")

    try:
        url = f"https://www.luogu.com.cn/record/list?user={uid}&page=1"
        resp = requests.get(url, cookies=cookies, headers=headers, timeout=15)
        
        if resp.status_code != 200:
            print(f"❌ 请求失败，状态码：{resp.status_code}")
            continue

        data = resp.json()
        # 洛谷返回格式可能是 { code: 200, data: { records: [...] } }
        if data.get('code') != 200:
            print(f"❌ API 错误码：{data.get('code')}，信息：{data.get('message', '未知')}")
            continue

        records = data.get('data', {}).get('records', [])
        if not records:
            print(f"⚠️ 未找到 {name} 的提交记录")

        ac_set = set()
        for rec in records:
            status = rec.get('status')
            if status == 12 or str(status) == '12' or rec.get('statusText') == 'Accepted':
                problem = rec.get('problem', {})
                pid = problem.get('pid')
                if pid:
                    ac_set.add(pid)

        ac_list = list(ac_set)
        total_ac = len(ac_list)

        # ---- 简易难度分布（示例） ----
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
        base = max(1, total_ac // 7)
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

        print(f"✅ {name} AC 数：{total_ac}")

    except Exception as e:
        print(f"❌ 处理 {name} 时异常：{type(e).__name__}: {e}")

    time.sleep(0.5)

# ========== 排序并保存 ==========
all_data.sort(key=lambda x: x['totalAC'], reverse=True)

output_path = '../oi-dashboard/assets/app-data.js'
js_content = f"// 自动生成于 {time.strftime('%Y-%m-%d %H:%M:%S')}\nconst APP_DATA = {json.dumps(all_data, ensure_ascii=False, indent=2)};\n"

with open(output_path, 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"\n🎉 完成！共 {len(all_data)} 位用户，数据已保存至 {output_path}")
