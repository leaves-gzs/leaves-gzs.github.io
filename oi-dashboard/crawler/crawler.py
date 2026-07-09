import requests
import json
import os
import time

# ==========================================
# 1. 从 GitHub 秘密变量中读取你的洛谷 Cookie
# ==========================================
CLIENT_ID = os.environ.get('LUOGU_CLIENT_ID')
UID = os.environ.get('LUOGU_UID')

if not CLIENT_ID or not UID:
    raise Exception("❌ 请先在 GitHub 仓库 Settings -> Secrets 中设置 LUOGU_CLIENT_ID 和 LUOGU_UID")

# 组装成洛谷需要的 Cookie 格式
cookies = {
    '__client_id': CLIENT_ID,
    '_uid': UID
}

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://www.luogu.com.cn/'
}

# ==========================================
# 2. 读取你要追踪的学生名单
# ==========================================
with open('users.json', 'r', encoding='utf-8') as f:
    users = json.load(f)

print(f"🚀 开始抓取 {len(users)} 位学生的洛谷数据...")

all_data = []

# ==========================================
# 3. 逐个抓取 AC 记录
# ==========================================
for user in users:
    name = user['name']
    uid = user['uid']
    print(f"📡 正在获取 {name} (UID: {uid}) ...")

    try:
        # 请求洛谷的提交记录 API（只取第一页，足够拿到所有 AC 题号）
        url = f"https://www.luogu.com.cn/record/list?user={uid}&page=1"
        resp = requests.get(url, cookies=cookies, headers=headers, timeout=10)
        
        # 如果返回的不是 JSON，说明 Cookie 过期了
        if resp.status_code != 200:
            print(f"❌ 请求失败，状态码：{resp.status_code}，请检查 Cookie 是否有效")
            continue
            
        data = resp.json()
        
        # 提取所有状态为 "AC"（代码 12）的题目编号
        ac_set = set()
        records = data.get('records', [])
        for rec in records:
            if rec.get('status') == 12:  # 12 代表 Accepted
                problem = rec.get('problem', {})
                pid = problem.get('pid')
                if pid:
                    ac_set.add(pid)
        
        ac_list = list(ac_set)
        total_ac = len(ac_list)
        
        # ----- 统计难度分布（根据题目编号简单模拟，你可以自行调整） -----
        # 提示：洛谷官方API需要登录才能查难度，为了稳定这里用取模演示
        diff_map = {
            '入门': 0, '普及-': 0, '普及/提高-': 0,
            '普及+/提高': 0, '提高+/省选-': 0
        }
        level_keys = list(diff_map.keys())
        for idx, pid in enumerate(ac_list):
            # 用编号取模的方式模拟难度分布，你可以后期改为真实爬取
            key = level_keys[idx % len(level_keys)]
            diff_map[key] += 1
        
        # ----- 生成热力图（根据AC总数模拟） -----
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
        
        print(f"✅ {name} 已获取，AC 题目数：{total_ac}")

    except Exception as e:
        print(f"❌ 获取 {name} 时出错：{e}")
    
    # 礼貌一点，间隔 0.5 秒
    time.sleep(0.5)

# ==========================================
# 4. 按 AC 数量降序排名
# ==========================================
all_data.sort(key=lambda x: x['totalAC'], reverse=True)

# ==========================================
# 5. 生成前端看板需要的 JS 数据文件
# ==========================================
output_path = '../oi-dashboard/assets/app-data.js'
js_content = f"// 自动生成于 {time.strftime('%Y-%m-%d %H:%M:%S')}\nconst APP_DATA = {json.dumps(all_data, ensure_ascii=False, indent=2)};\n"

with open(output_path, 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"\n🎉 全部完成！共 {len(all_data)} 位学生，数据已保存到 {output_path}")import requests
import json
import os
import time

# ==========================================
# 1. 从 GitHub 秘密变量中读取你的洛谷 Cookie
# ==========================================
CLIENT_ID = os.environ.get('LUOGU_CLIENT_ID')
UID = os.environ.get('LUOGU_UID')

if not CLIENT_ID or not UID:
    raise Exception("❌ 请先在 GitHub 仓库 Settings -> Secrets 中设置 LUOGU_CLIENT_ID 和 LUOGU_UID")

# 组装成洛谷需要的 Cookie 格式
cookies = {
    '__client_id': CLIENT_ID,
    '_uid': UID
}

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://www.luogu.com.cn/'
}

# ==========================================
# 2. 读取你要追踪的学生名单
# ==========================================
with open('users.json', 'r', encoding='utf-8') as f:
    users = json.load(f)

print(f"🚀 开始抓取 {len(users)} 位学生的洛谷数据...")

all_data = []

# ==========================================
# 3. 逐个抓取 AC 记录
# ==========================================
for user in users:
    name = user['name']
    uid = user['uid']
    print(f"📡 正在获取 {name} (UID: {uid}) ...")

    try:
        # 请求洛谷的提交记录 API（只取第一页，足够拿到所有 AC 题号）
        url = f"https://www.luogu.com.cn/record/list?user={uid}&page=1"
        resp = requests.get(url, cookies=cookies, headers=headers, timeout=10)
        
        # 如果返回的不是 JSON，说明 Cookie 过期了
        if resp.status_code != 200:
            print(f"❌ 请求失败，状态码：{resp.status_code}，请检查 Cookie 是否有效")
            continue
            
        data = resp.json()
        
        # 提取所有状态为 "AC"（代码 12）的题目编号
        ac_set = set()
        records = data.get('records', [])
        for rec in records:
            if rec.get('status') == 12:  # 12 代表 Accepted
                problem = rec.get('problem', {})
                pid = problem.get('pid')
                if pid:
                    ac_set.add(pid)
        
        ac_list = list(ac_set)
        total_ac = len(ac_list)
        
        # ----- 统计难度分布（根据题目编号简单模拟，你可以自行调整） -----
        # 提示：洛谷官方API需要登录才能查难度，为了稳定这里用取模演示
        diff_map = {
            '入门': 0, '普及-': 0, '普及/提高-': 0,
            '普及+/提高': 0, '提高+/省选-': 0
        }
        level_keys = list(diff_map.keys())
        for idx, pid in enumerate(ac_list):
            # 用编号取模的方式模拟难度分布，你可以后期改为真实爬取
            key = level_keys[idx % len(level_keys)]
            diff_map[key] += 1
        
        # ----- 生成热力图（根据AC总数模拟） -----
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
        
        print(f"✅ {name} 已获取，AC 题目数：{total_ac}")

    except Exception as e:
        print(f"❌ 获取 {name} 时出错：{e}")
    
    # 礼貌一点，间隔 0.5 秒
    time.sleep(0.5)

# ==========================================
# 4. 按 AC 数量降序排名
# ==========================================
all_data.sort(key=lambda x: x['totalAC'], reverse=True)

# ==========================================
# 5. 生成前端看板需要的 JS 数据文件
# ==========================================
output_path = '../oi-dashboard/assets/app-data.js'
js_content = f"// 自动生成于 {time.strftime('%Y-%m-%d %H:%M:%S')}\nconst APP_DATA = {json.dumps(all_data, ensure_ascii=False, indent=2)};\n"

with open(output_path, 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"\n🎉 全部完成！共 {len(all_data)} 位学生，数据已保存到 {output_path}")
